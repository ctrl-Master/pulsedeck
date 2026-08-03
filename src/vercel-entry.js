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
      const data = await aggregateCommunity({ demo });
      return json(data);
    }
    if (demo) {
      const data = buildSampleData();
      return json(data);
    }
    const data = await aggregate({});
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
      sources: FEEDS.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        url: f.url,
        weight: f.weight,
        community: !!f.community,
      })),
      count: FEEDS.length,
    });
  },

  async handleTranslate(req) {
    try {
      const body = await req.json().catch(() => ({}));
      const text = String(body.text || '').slice(0, 5000);
      const to = String(body.to || 'zh').slice(0, 3);
      if (!text) return json({ ok: false, error: 'empty text' }, 400);
      const out = await TRANSLATOR.translate(text, to);
      return json({ ok: true, text: out, to });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 500);
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

export default async function handler(req) {
  const url = new URL(req.url);
  const { pathname, searchParams } = url;
  const route = pathname.replace(/^\/api\//, '').split('/')[0];

  try {
    switch (route) {
      case 'news':
        return await server.handleNews(searchParams);
      case 'feeds':
        return await server.handleFeeds();
      case 'config':
        return await server.handleConfig();
      case 'translate':
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
        return await server.handleTranslate(req);
      case 'img':
        return await server.handleImg(searchParams);
      case 'health':
        return server.handleHealth();
      default:
        return json({ ok: false, error: `unknown route: ${pathname}` }, 404);
    }
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}

// 用 Node.js 运行时：Vercel 的 Node 18+/20 运行时原生提供 fetch / Request /
// Response / URL / AbortSignal 等 Web 标准全局，本函数零 Node 专用 API，
// 因此在 Node 运行时下最稳定（已用本地 Node 22 实测全路由 200）。
// 服务端翻译仍走「假 env.AI」no-op，真正的英译中由前端浏览器侧 MyMemory 完成。
export const runtime = 'nodejs';
export const maxDuration = 60;
