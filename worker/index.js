/**
 * Pulsedeck · Cloudflare Worker 入口
 * -------------------------------------------------------------
 * 一个 Worker 同时负责：
 *   1. /api/*      聚合 API（带边缘缓存）
 *   2. 静态资源     由 wrangler.toml 的 [assets] 提供
 *   3. Cron 预热    定时刷新缓存，用户永远命中热缓存
 */

import { FEEDS, CATEGORIES, resolveFeeds, publicFeeds } from '../shared/feeds.js';
import { aggregate } from '../shared/aggregate.js';
import { makeTranslator } from '../shared/translate.js';
import { makeSummarizer } from '../shared/summarize.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_SECONDS = 300; // 边缘缓存 5 分钟

/* ------------------------------ 工具 ------------------------------ */

function json(data, { status = 200, maxAge = 0 } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 生成一张渐变占位图，用于没有配图的条目 */
export function placeholderSVG(params = {}) {
  const index = Number(params.i) || 0;
  const title = String(params.t || '').slice(0, 60);
  const source = String(params.s || '').slice(0, 24);

  const palettes = [
    ['#6366f1', '#8b5cf6'],
    ['#0ea5e9', '#22d3ee'],
    ['#f97316', '#f43f5e'],
    ['#10b981', '#34d399'],
    ['#eab308', '#f97316'],
    ['#ec4899', '#8b5cf6'],
    ['#14b8a6', '#0ea5e9'],
    ['#f43f5e', '#f59e0b'],
  ];
  const [c1, c2] = palettes[Math.abs(index) % palettes.length];

  const lines = [];
  let buf = '';
  for (const ch of title) {
    buf += ch;
    const width = [...buf].reduce((n, c) => n + (/[\u4e00-\u9fa5]/.test(c) ? 2 : 1), 0);
    if (width >= 26) {
      lines.push(buf);
      buf = '';
    }
    if (lines.length >= 3) break;
  }
  if (buf && lines.length < 3) lines.push(buf);

  const text = lines
    .map((line, i) => `<text x="40" y="${150 + i * 42}" font-size="30" font-weight="600" fill="rgba(255,255,255,.94)">${escapeXml(line)}</text>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="420" fill="url(#g)"/>
  <circle cx="700" cy="60" r="170" fill="rgba(255,255,255,.10)"/>
  <circle cx="120" cy="380" r="130" fill="rgba(0,0,0,.08)"/>
  <text x="40" y="72" font-size="17" letter-spacing="3" fill="rgba(255,255,255,.75)">${escapeXml(source.toUpperCase())}</text>
  ${text}
</svg>`;

  return svg;
}

/* ------------------------------ API ------------------------------ */

async function handleNews(url, env, ctx) {
  const sources = url.searchParams.get('sources');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 400);

  const cacheKey = new Request(`https://pulsedeck.cache/news?s=${encodeURIComponent(sources || 'default')}&l=${limit}`);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached && url.searchParams.get('fresh') !== '1') return cached;

  const feeds = resolveFeeds(sources);
  const translator = makeTranslator(env); // 有 AI 绑定走 Workers AI，否则降级
  const summarizer = makeSummarizer(env, translator); // 同上：部署后走 Workers AI 中文摘要
  let data;
  try {
    data = await aggregate(feeds, {
      limit,
      timeout: 8000,
      cacheTtl: CACHE_SECONDS,
      translator,
      translateTo: 'zh',
      summarizer,
      summarizeTo: 'zh',
    });
  } catch (err) {
    return json({ error: String(err.message || err), items: [], sources: [] }, { status: 502 });
  }

  data.categories = CATEGORIES;

  const response = new Response(JSON.stringify(data), {
    headers: {
      ...JSON_HEADERS,
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  });

  ctx?.waitUntil?.(cache.put(cacheKey, response.clone()));
  return response;
}

/** 把聚合结果再输出成一份 RSS，方便导入其它阅读器 */
async function handleRss(url, env, ctx) {
  const feeds = resolveFeeds(url.searchParams.get('sources'));
  const data = await aggregate(feeds, { limit: 60, timeout: 8000 });
  const site = `${url.protocol}//${url.host}`;

  const items = data.items
    .map(
      (it) => `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.link)}</link>
      <guid isPermaLink="true">${escapeXml(it.link)}</guid>
      <source>${escapeXml(it.source)}</source>
      <pubDate>${it.published ? new Date(it.published).toUTCString() : new Date().toUTCString()}</pubDate>
      <description>${escapeXml(it.summary)}</description>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Pulsedeck 热点聚合</title>
    <link>${escapeXml(site)}</link>
    <description>科技 / AI / 创投 每日热点聚合</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** 图片边缘代理：避免国内直连图床失败 / 混合内容告警 */
async function handleImage(url) {
  const target = url.searchParams.get('u');
  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response('bad url', { status: 400 });
  }
  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pulsedeck/1.0)' },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!upstream.ok) return new Response('upstream error', { status: 502 });
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('fetch failed', { status: 502 });
  }
}

/* ------------------------------ 入口 ------------------------------ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    switch (url.pathname) {
      case '/api/config':
        return json(
          {
            categories: CATEGORIES,
            feeds: publicFeeds(),
            total: FEEDS.length,
          },
          { maxAge: 3600 }
        );

      case '/api/news':
        return handleNews(url, env, ctx);

      case '/api/rss':
        return handleRss(url, env, ctx);

      case '/api/placeholder':
        return new Response(placeholderSVG(Object.fromEntries(url.searchParams)), {
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=604800',
          },
        });

      case '/api/img':
        return handleImage(url);

      case '/api/health':
        return json({ ok: true, time: new Date().toISOString(), feeds: FEEDS.length });
      default:
        break;
    }

    // 其余交给静态资源（wrangler.toml 的 [assets]）
    if (env?.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not Found', { status: 404 });
  },

  /** Cron 预热：定时刷新默认源缓存 */
  async scheduled(event, env, ctx) {
    const url = new URL('https://pulsedeck.internal/api/news?fresh=1');
    ctx.waitUntil(handleNews(url, env, ctx));
  },
};
