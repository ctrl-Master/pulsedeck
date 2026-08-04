/**
 * Pulsedeck · Telegram 科技与快讯聚合
 * -------------------------------------------------------------
 * 直接解析 Telegram 公开的免登录 Web 预览页 https://t.me/s/<username>（选项 A）：
 *   - 该页面绝对公开、不封锁普通请求，100% 稳定，绝不会像 RSSHub 公共实例那样对
 *     telegram 路由返回 403。
 *   - 用 fetch 抓取 HTML，再用轻量正则提取每条消息的：
 *       · 外层 <div data-post="username/msgid">                       → 唯一消息 id + 源定位
 *       · <a class="tgme_widget_message_date" href>...<time datetime> → 原文链接 + 发布时间
 *       · <div class="tgme_widget_message_text js-message_text">      → 正文（注意排除
 *         js-message_reply_text 这种「引用原消息」的节点，它也会带 tgme_widget_message_text 类）
 *
 * 设计要点：
 *   1. 并发抓取：各频道独立 try/catch，单个源挂掉不影响整体（sources[].ok=false）。
 *   2. AI 审验：调用 DeepSeek / OpenAI 兼容接口，要求模型以 JSON 输出
 *      { is_safe, summary, tags }；is_safe=false 的条目在后端静默丢弃。
 *      合规原则：只过滤高危违规红线（涉黄涉暴、未经证实涉政谣言等），
 *      普通科技/数码/开源/商业/一般性社会趋势新闻一律保留；存在争议时在 tags 加「需甄别」。
 *   3. 优雅降级：未配置 DEEPSEEK_API_KEY 时跳过 LLM，直接用原文截断作为摘要，界面照常可用。
 *   4. 缓存：模块级内存缓存 10 分钟；Vercel Cron 每小时预热一次，避免每次实时抓取。
 *   5. 健壮性：抓取带 12s 超时与并发上限（4），单条失败不影响其他条目。
 *
 * 环境变量：
 *   TG_WEB_BASE_URL   预览页基址，默认 https://t.me/s（可指向自建镜像）
 *   DEEPSEEK_API_KEY  留空则跳过 AI 审验，走原文摘要降级
 */

import { decodeEntities } from './xml.js';

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

function detectLang(text = '') {
  return /[一-鿿]/.test(text) ? 'zh' : 'en';
}

function hashId(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * 把 t.me/s 的消息正文 HTML 清洗成纯文本：
 *   - <br> / 块级闭合标签转换行，尽量保留原消息的段落结构；
 *   - 先去真实标签，再解 HTML 实体（交替几次，兼容 CDATA / 双重转义）；
 *   - 压缩多余空白但不并吞换行。
 */
function cleanHtmlText(html) {
  let s = String(html || '');
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|blockquote)>/gi, '\n');
  for (let i = 0; i < 3; i++) {
    s = s.replace(/<[^>]+>/g, ' ');
    s = decodeEntities(s);
  }
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* =========================== t.me/s 抓取 + 解析 =========================== */

/** 竞速超时：无论底层连接是否响应，到时即 reject，避免函数被挂死的源拖到上限 */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout:' + label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchChannelPage(channel, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/${channel.username}`;
  try {
    const res = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      }),
      12000,
      channel.username
    );
    if (!res.ok) throw new Error('t.me ' + res.status);
    const html = await res.text();
    return html;
  } catch (e) {
    throw e; // 上层按频道隔离
  }
}

/**
 * 从单个频道的 t.me/s 预览页 HTML 中解析最新 N 条原始消息。
 * 以 <div data-post="username/msgid"> 作为每条消息的边界，内部再取：
 *   · 正文：class 含 js-message_text 的 .tgme_widget_message_text（排除 js-message_reply_text）
 *   · 时间 + 原文链接：a.tgme_widget_message_date 内的 <time datetime> 与 href
 */
export function parseHtmlPage(html, channel, limit = 8) {
  const items = [];
  // 按 data-post 切分消息块，前瞻在遇到下一个 data-post / bot_id 哨兵 / </body> / 文末时收尾
  const blockRe =
    /<div\b[^>]*\bdata-post="([^"]+)"[^>]*>([\s\S]*?)(?=<div\b[^>]*\bdata-post=|<!--\s*bot_id\s*-->|\s*<\/body>|$)/gi;

  for (const m of html.matchAll(blockRe)) {
    const postId = m[1]; // 形如 tnews365/35452
    const inner = m[2];

    // 正文：必须是 js-message_text（真实消息），而非 js-message_reply_text（引用原消息）
    const textM = inner.match(
      /<div\b[^>]*\bclass="[^"]*\bjs-message_text\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (!textM) continue;
    const description = cleanHtmlText(textM[1]);
    if (!description) continue;

    // 原文链接 + 发布时间：定位 a.tgme_widget_message_date
    const dateM = inner.match(
      /<a\b[^>]*\bclass="[^"]*tgme_widget_message_date[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    const link = dateM ? decodeEntities(dateM[1]).replace(/\/s\//, '/') : `https://t.me/${postId}`;
    let ts = Date.now();
    const timeSrc = dateM ? dateM[2] : inner;
    const timeM = timeSrc.match(/<time\b[^>]*\bdatetime="([^"]+)"/i);
    if (timeM) {
      const p = Date.parse(timeM[1]);
      if (!Number.isNaN(p)) ts = p;
    }

    const msgid = postId.split('/')[1] || postId;
    const title = description.split('\n')[0].slice(0, 60);

    items.push({
      _channel: channel.username,
      id: `${channel.username}-${msgid}`,
      title: title.slice(0, 80),
      description, // 原始全文
      link,
      timestamp: ts,
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

  const baseUrl = getEnv('TG_WEB_BASE_URL', 'https://t.me/s');
  const apiKey = getEnv('DEEPSEEK_API_KEY', '');
  const llmBase = getEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
  const useLLM = !!apiKey;

  // 1) 并发抓各频道（彼此隔离），直接解析 t.me/s 预览页
  const channelResults = await Promise.all(
    TG_CHANNELS.map(async (ch) => {
      try {
        const html = await fetchChannelPage(ch, baseUrl);
        const items = parseHtmlPage(html, ch, 8);
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
        ? '本次未抓取到任何 Telegram 内容，可能是 t.me/s 预览页临时不可达或频道被限制，请稍后重试（可检查 TG_WEB_BASE_URL）。'
        : useLLM
        ? ''
        : '未配置 DEEPSEEK_API_KEY，已使用原文摘要（未启用 AI 审验/总结）。',
  };

  CACHE.set(CACHE_KEY, { ts: Date.now(), data });
  return data;
}
