/**
 * Pulsedeck · Vercel Edge / Node 函数入口
 * -------------------------------------------------------------
 * 复用与 Worker 完全相同的 shared/ 聚合逻辑，仅做传输层适配：
 *   - Vercel 的 `fetch` 不支持 Cloudflare 的 `cf` 选项，由 fetchWithTimeout 自行判断
 *   - 入参从 Vercel 的 (req, res) 适配成 Web 标准 Request
 *
 * 路由：
 *   /api/news        聚合新闻（?demo=1 用演示数据，?community=1 切换社区）
 *   /api/feeds       源配置
 *   /api/config      前端配置（分类 + 源概览）
 *   /api/translate   翻译代理（body: { text, to }）
 *   /api/img         占位图（?w=&h=&t=）
 *   /api/health      健康检查
 */

import { FEEDS, CATEGORIES } from '../shared/feeds.js';
import { aggregate } from '../shared/aggregate.js';
import { aggregateCommunity } from '../shared/community.js';
import { makeTranslator } from '../shared/translate.js';
import { makeSummarizer } from '../shared/summarize.js';
import { buildSampleData } from '../shared/sample-data.js';
import { placeholderSVG } from '../shared/placeholder.js';
import { escapeXml } from '../shared/escape.js';

// Vercel 上无 Workers AI 绑定；注入即时空操作假 env.AI，让翻译/摘要走 no-op 分支，
// 避免服务端向 MyMemory 发 ~60 次慢请求（Edge 25s 硬上限必超时 → FUNCTION_INVOCATION_TIMEOUT）。
// 真正的「英译中」由前端在浏览器侧用 MyMemory 完成（见 public/app.js 的 translateVisible）。
const ENV = { AI: { async run() { return {}; } } };
const TRANSLATOR = makeTranslator(ENV);
const SUMMARIZER = makeSummarizer(ENV, TRANSLATOR);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

function svgResponse(svg) {
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=86400' },
  });
}

const server = {
  async handleNews(params) {
    const demo = params.get('demo') === '1' || params.get('demo') === 'true';
    const community = params.get('community') === '1' || params.get('community') === 'true';
    if (community) {
      const data = await aggregateCommunity({ demo, fresh: params.get('fresh') === '1' });
      return json(data);
    }
    if (demo) {
      const data = buildSampleData();
      return json(data);
    }
    const data = await aggregate(FEEDS);
    return json(data);
  },

  async handleFeeds() {
    return json({
      feeds: FEEDS,
      categories: CATEGORIES,
      count: FEEDS.length,
    });
  },

  async handleConfig() {
    return json({
      categories: CATEGORIES,
      // 前端 renderSources 全程读 state.config.feeds（含 enabled 决定默认勾选），
      // 字段名必须与前端预期一致，不能写成 sources。
      feeds: FEEDS.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        url: f.url,
        weight: f.weight,
        enabled: true,
        community: !!f.community,
      })),
      count: FEEDS.length,
    });
  },

  async handleTranslate(req) {
    try {
      const body = await req.json().catch(() => ({}));
      const text = String(body.text || '').slice(0, 5000);
      const from = String(body.from || 'en').slice(0, 8);
      const to = String(body.to || 'zh-CN').slice(0, 8);
      const pair = `${from}|${to === 'zh' ? 'zh-CN' : to}`;
      if (!text) return json({ ok: false, error: 'empty text' }, 400);
      // 同源代理：浏览器只与 Vercel 通信（国内可达），由海外函数实例调 MyMemory，
      // 绕过「浏览器直连 api.mymemory.translated.net 在国内被墙/CORS」的问题。
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=${encodeURIComponent(pair)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
      if (!r.ok) return json({ ok: false, error: 'translate upstream ' + r.status }, 502);
      const j = await r.json();
      const t = j?.responseData?.translatedText || '';
      if (/MYMEMORY WARNING/i.test(t)) return json({ ok: true, text: '' });
      return json({ ok: true, text: String(t).trim() });
    } catch (e) {
      // 翻译失败不应阻断阅读，回退原文（前端会显示原始标题）
      return json({ ok: true, text: '' });
    }
  },

  async handleImg(params) {
    const w = Math.min(Math.max(Number(params.get('w')) || 600, 50), 2000);
    const h = Math.min(Math.max(Number(params.get('h')) || 400, 50), 2000);
    const t = (params.get('t') || 'Pulsedeck').slice(0, 40);
    return svgResponse(placeholderSVG({ w, h, text: t }));
  },

  handleHealth() {
    return json({ ok: true, time: new Date().toISOString(), feeds: FEEDS.length, live: true });
  },
};

// Vercel `api/` 目录的 Node.js 函数签名是 (req: IncomingMessage, res: ServerResponse)，
// 必须自己写 res；直接 return Web Response 在 Node 运行时不会被消费，会一直挂到超时。
// 这里同时兼容 Edge（只收到 Web Request、无 res）与 Node（收到 res）两种调用方式。
function safeUrl(req) {
  const raw = (req && (req.url || (req.request && req.request.url))) || '/';
  try {
    return raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
  } catch {
    return new URL('/', 'http://localhost');
  }
}

// Node IncomingMessage 读取请求体（Edge 用 req.text()）
function readNodeBody(req) {
  if (!req || req.method === 'GET' || req.method === 'HEAD') return Promise.resolve('');
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

export default async function handler(req, res) {
  const isNode = !!(res && typeof res.end === 'function');

  let pathname, searchParams, method, bodyText = '';
  if (isNode) {
    const u = new URL(req.url || '/', 'http://localhost');
    pathname = u.pathname;
    searchParams = u.searchParams;
    method = req.method || 'GET';
  } else {
    // Edge / Web 标准：req 是 Request
    const u = safeUrl(req);
    pathname = u.pathname;
    searchParams = u.searchParams;
    method = req.method || 'GET';
  }

  const route = pathname.replace(/^\/api\//, '').split('/')[0];
  let result;
  let cacheNews = false;
  try {
    switch (route) {
      case 'news':
        result = await server.handleNews(searchParams);
        // 边缘缓存：非强制刷新时让 Vercel CDN 缓存 5 分钟，二次/多人访问秒回，
        // 大幅缓解「每次实时抓 33 个 RSS 源」带来的首屏慢。
        cacheNews = searchParams.get('fresh') !== '1';
        // Edge(Web Response) 直接写在 response 头上；Node 模式在下方对 res 直接 setHeader 才可靠
        if (cacheNews) result.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        break;
      case 'feeds':
        result = await server.handleFeeds();
        break;
      case 'config':
        result = await server.handleConfig();
        break;
      case 'translate':
        if (method === 'OPTIONS') {
          result = new Response(null, { status: 204, headers: CORS });
          break;
        }
        if (isNode) bodyText = await readNodeBody(req);
        else bodyText = await req.text().catch(() => '');
        result = await server.handleTranslate({ json: async () => JSON.parse(bodyText || '{}'), method });
        break;
      case 'img':
        result = await server.handleImg(searchParams);
        break;
      case 'health':
        result = server.handleHealth();
        break;
      default:
        result = json({ ok: false, error: `unknown route: ${pathname}` }, 404);
    }
  } catch (e) {
    result = json(
      { ok: false, error: String((e && e.message) || e), stack: String((e && e.stack) || '').slice(0, 600) },
      500
    );
  }

  if (isNode) {
    const body = await result.text();
    res.statusCode = result.status;
    result.headers.forEach((value, key) => res.setHeader(key, value));
    // Node 模式必须直接对 res 设置，result.headers.set 不会透传
    if (cacheNews) res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.end(Buffer.from(body));
  } else {
    return result;
  }
}

// Node.js 运行时：Vercel 的 api/ 目录 Node 函数以 (req, res) 调用，最稳定。
// 服务端翻译仍走「假 env.AI」no-op，真正的英译中由前端浏览器侧 MyMemory 完成。
// 用 export const 形式声明，确保 Vercel 静态分析能识别运行时与超时配置。
export const runtime = 'nodejs';
export const maxDuration = 60;
