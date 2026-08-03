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

const TRANSLATOR = makeTranslator({});
const SUMMARIZER = makeSummarizer({}, TRANSLATOR);

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

// Vercel 现行标准写法：顶层 `runtime` / `maxDuration` 导出，
// 路由到新一代 Fluid Node 运行时（对 ESM 的 api/ 函数支持良好）。
// 注意：旧的 `export const config = { runtime: 'nodejs' }` 写法会把函数
// 路由到老的 @vercel/node 构建器，对 "type":"module" + 相对 ESM 导入的
// api/ 函数处理有兼容问题，导致模块加载即崩溃（FUNCTION_INVOCATION_FAILED）。
export const runtime = 'nodejs';
export const maxDuration = 60;
