/**
 * Pulsedeck · Telegram 科技与快讯聚合
 * -------------------------------------------------------------
 * 通过 RSSHub 的 /telegram/channel/<username> 路由批量订阅精选 Telegram 资讯频道，
 * 经「AI 智能审验 + 自动总结 + 多源标签化」后，按时间倒序输出给前端。
 *
 * 设计要点：
 *   1. 并发抓取：各频道独立 try/catch，单个 RSSHub 源挂掉不影响整体（sources[].ok=false）。
 *   2. AI 审验：调用 DeepSeek / OpenAI 兼容接口，要求模型以 JSON 输出
 *      { is_safe, summary, tags }；is_safe=false 的条目在后端静默丢弃。
 *      合规原则：只过滤高危违规红线（涉黄涉暴、未经证实涉政谣言等），
 *      普通科技/数码/开源/商业/一般性社会趋势新闻一律保留；存在争议时在 tags 加「需甄别」。
 *   3. 优雅降级：未配置 DEEPSEEK_API_KEY 时跳过 LLM，直接用原文截断作为摘要，界面照常可用。
 *   4. 缓存：模块级内存缓存 10 分钟；Vercel Cron 每小时预热一次，避免每次实时打 LLM。
 *   5. 健壮性：LLM 调用带 8s 超时与并发上限（4），单条失败不影响其他条目。
 */

import { decodeEntities, cleanText, tagText, linkOf } from './xml.js';

/* =========================== 频道配置 =========================== */

export const TG_CHANNELS = [
  { username: 'tnews365', name: '竹新社', tag: '竹新社 / 综合快讯', category: '综合快讯' },
  { username: 'xhqcankao', name: '风向旗', tag: '风向旗 / 深度参考', category: '深度参考' },
  { username: 'ithome_chat', name: 'IT之家快讯', tag: 'IT之家 / 数码科技', category: '数码科技' },
  { username: 'sspai', name: '少数派', tag: '少数派 / 效率工具', category: '效率工具' },
  { username: 'AIBase', name: 'AI 科技前沿', tag: 'AI前沿 / 大模型', category: '大模型' },
  { username: 'GithubTrending', name: 'GitHub 趋势', tag: '开源 / 开发者', category: '开发者' },
];

/* =========================== 缓存 =========================== */

const CACHE = new Map();
const CACHE_KEY = 'tg-aggregate';
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

/* =========================== 工具 =========================== */

function getEnv(name, fallback = '') {
  if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
  return fallback;
}

function pickText(itemXml, tag) {
  const raw = tagText(itemXml, tag);
  return cleanText(raw);
}

/** 把 RSSHub 的 t.me/s/xxx 链接规整为可唤起 App 的 t.me/xxx */
function normalizeTme(link = '') {
  try {
    const u = new URL(decodeEntities(link));
    return u.toString().replace(/^https?:\/\/t\.me\/s\//i, 'https://t.me/');
  } catch {
    return link;
  }
}

function detectLang(text = '') {
  return /[一-鿿]/.test(text) ? 'zh' : 'en';
}

function hashId(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/* =========================== RSSHub 抓取 + 解析 =========================== */

async function fetchChannelXml(channel, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/telegram/channel/${channel.username}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : ctrl.signal,
      headers: { 'User-Agent': 'Pulsedeck/2.0 (+https://insights.hizhihao.me)' },
    });
    if (!res.ok) throw new Error('RSSHub ' + res.status);
    const xml = await res.text();
    return xml;
  } finally {
    clearTimeout(to);
  }
}

/** 从一个频道的 RSS XML 中取出最新 N 条原始条目 */
function parseItems(xml, channel, limit = 8) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const description = pickText(block, 'description');
    if (!description) continue;
    const titleRaw = pickText(block, 'title');
    const pubDate = pickText(block, 'pubDate');
    const link = normalizeTme(linkOf(block) || '');
    const guid = pickText(block, 'guid') || link || `${channel.username}-${items.length}`;
    const ts = pubDate ? Date.parse(pubDate) : Date.now();

    // 标题：优先用非空 title；若 title 与 description 重复，则从 description 首行派生短标题
    let title = titleRaw && titleRaw !== description ? titleRaw : description.split('\n')[0].slice(0, 60);

    items.push({
      _channel: channel.username,
      id: `${channel.username}-${hashId(guid)}`,
      title: title.slice(0, 80),
      description, // 原始全文
      link,
      timestamp: Number.isNaN(ts) ? Date.now() : ts,
      category: channel.username, // 用于前端来源筛选（唯一键）
      source: channel.name,
      tag: channel.tag,
      channelCategory: channel.category,
      lang: detectLang(description),
      _rawTags: [],
    });

    if (items.length >= limit) break;
  }
  return items;
}

/* =========================== AI 审验与提炼 =========================== */

const SYS_PROMPT = [
  '你是一个资深科技编辑，负责审核并提炼 Telegram 资讯频道的内容。',
  '合规原则：只过滤严重违法违规、涉黄涉暴、未经证实的涉政谣言等高危内容；',
  '普通科技、数码、开源、商业、一般性社会趋势新闻一律保留，不要一刀切。',
  '若内容存在轻微争议或不确定性，请在 tags 中加入「需甄别」。',
  '必须以 JSON 格式输出：{"is_safe": true, "summary": "...", "tags": ["...", "..."]}。',
  '若 is_safe 为 false（命中高危违规红线），summary 填空字符串、tags 为空数组。',
].join('\n');

function extractJson(text = '') {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {
    /* 解析失败回退 null */
  }
  return null;
}

async function summarizeWithLLM(text, apiKey, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: getEnv('DEEPSEEK_MODEL', 'deepseek-chat'),
    messages: [
      { role: 'system', content: SYS_PROMPT },
      {
        role: 'user',
        content: `请审核并提炼下面这条快讯（1-2 句中文总结 + 3 个关键词）：\n\n${text.slice(0, 1500)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 400,
    response_format: { type: 'json_object' },
  };

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('LLM ' + res.status);
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);
    if (!parsed) return null;
    return {
      is_safe: parsed.is_safe !== false,
      summary: String(parsed.summary || '').trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).filter(Boolean).slice(0, 5) : [],
    };
  } catch {
    return null; // 任一失败都降级：保留原文
  } finally {
    clearTimeout(to);
  }
}

/** 简单的并发限制执行器 */
async function mapLimit(arr, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < arr.length) {
      const idx = i++;
      try {
        out[idx] = await fn(arr[idx], idx);
      } catch {
        out[idx] = null;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, arr.length) }, worker);
  await Promise.all(workers);
  return out;
}

/* =========================== 聚合主流程 =========================== */

export async function aggregateTelegram({ fresh = false } = {}) {
  const cached = CACHE.get(CACHE_KEY);
  if (!fresh && cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const baseUrl = getEnv('RSSHUB_BASE_URL', 'https://rsshub.app');
  const apiKey = getEnv('DEEPSEEK_API_KEY', '');
  const llmBase = getEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
  const useLLM = !!apiKey;

  // 1) 并发抓各频道（彼此隔离）
  const channelResults = await Promise.all(
    TG_CHANNELS.map(async (ch) => {
      try {
        const xml = await fetchChannelXml(ch, baseUrl);
        const items = parseItems(xml, ch, 8);
        return { channel: ch, items, ok: true, error: '' };
      } catch (e) {
        return { channel: ch, items: [], ok: false, error: String((e && e.message) || e) };
      }
    })
  );

  // 2) 合并 + AI 审验（带并发上限）
  let merged = [];
  const sources = [];
  for (const r of channelResults) {
    sources.push({ id: r.channel.username, name: r.channel.name, ok: r.ok, error: r.error });
    if (!r.items.length) continue;
    if (useLLM) {
      const summarized = await mapLimit(r.items, 4, async (it) => {
        const res = await summarizeWithLLM(it.description, apiKey, llmBase);
        if (!res) {
          // LLM 失败：保留原文摘要（截断），不丢弃
          return { ...it, summary: it.description.slice(0, 140), tags: [it.channelCategory], digest: it.description.slice(0, 140) };
        }
        if (!res.is_safe) return null; // 高危红线：静默丢弃
        const tags = Array.from(new Set([it.channelCategory, ...res.tags])).slice(0, 6);
        return { ...it, summary: res.summary, digest: res.summary, tags };
      });
      for (const it of summarized) if (it) merged.push(it);
    } else {
      // 无 LLM：原文截断即摘要
      for (const it of r.items) {
        merged.push({ ...it, summary: it.description.slice(0, 140), digest: it.description.slice(0, 140), tags: [it.channelCategory] });
      }
    }
  }

  // 3) 按时间倒序
  merged.sort((a, b) => b.timestamp - a.timestamp);

  // 4) 标注来源健康概览
  const data = {
    updated: new Date().toISOString(),
    count: merged.length,
    sources,
    items: merged,
    demo: false,
    note:
      merged.length === 0
        ? '本次未抓取到任何 Telegram 内容，可能是 RSSHub 实例不可用或所有频道临时不可达，请稍后重试或检查 RSSHUB_BASE_URL。'
        : useLLM
        ? ''
        : '未配置 DEEPSEEK_API_KEY，已使用原文摘要（未启用 AI 审验/总结）。',
  };

  CACHE.set(CACHE_KEY, { ts: Date.now(), data });
  return data;
}
