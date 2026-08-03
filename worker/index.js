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
import { aggregateCommunity } from '../shared/community.js';
import { makeTranslator } from '../shared/translate.js';
import { makeSummarizer } from '../shared/summarize.js';
import { placeholderSVG } from '../shared/placeholder.js';
import { escapeXml } from '../shared/escape.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_SECONDS = 300; // 边缘缓存 5 分钟

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

  // 缓冲成字符串后再构造 Response：规避 edge 运行时 new Response(string).clone()
  // 在「返回客户端」与「写入缓存」并发读取同一流时偶发写入空体的竞态（导致 Vercel
  // 把空 200 缓存最多 5 分钟）。用同一份字符串构造两份 Response 可彻底消除该竞态。
  const bodyText = JSON.stringify(data);
  const newsHeaders = {
    ...JSON_HEADERS,
    'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
  };
  const response = new Response(bodyText, { headers: newsHeaders });

  // 用同一缓冲字符串另构造一份用于缓存，避免 clone() 共享流导致的空体。
  ctx?.waitUntil?.(cache.put(cacheKey, new Response(bodyText, { headers: newsHeaders })));
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

/* ------------------------------ 社区热点 ------------------------------ */

/** 社区源聚合（知乎 / 虎扑 / 贴吧 / Reddit），含 Top 条目全文提取。
 *  归一化后的条目形状与 /api/news 一致，前端可复用同一套渲染。 */
async function handleCommunity(url, env, ctx) {
  const fresh = url.searchParams.get('fresh') === '1';
  const data = await aggregateCommunity({ fresh });

  const bodyText = JSON.stringify(data);
  const headers = {
    ...JSON_HEADERS,
    'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
  };
  // 直接从字符串构造 Response：本模块内部已写缓存，这里不再 clone()，避免空体竞态。
  return new Response(bodyText, { headers });
}

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

      case '/api/feeds':
        return handleCommunity(url, env, ctx);

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
