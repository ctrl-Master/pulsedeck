/**
 * Pulsedeck · 本地开发服务器
 * -------------------------------------------------------------
 * 复用 shared/ 里与 Worker 完全相同的聚合逻辑，
 * 区别只在于：这里用 node:http 提供静态文件 + 内存缓存 + 自动降级。
 *
 *   npm run dev                      默认：先试真实源，失败降级演示数据
 *   PULSEDECK_LIVE=0 npm run dev     直接用演示数据（离线秒开）
 *   PORT=8080 npm run dev            换端口
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FEEDS, CATEGORIES, resolveFeeds, publicFeeds } from '../shared/feeds.js';
import { aggregate } from '../shared/aggregate.js';
import { makeTranslator } from '../shared/translate.js';
import { makeSummarizer } from '../shared/summarize.js';
import { buildSampleData } from '../shared/sample-data.js';
import { placeholderSVG } from '../shared/placeholder.js';
import { escapeXml } from '../shared/escape.js';

const TRANSLATOR = makeTranslator({}); // 本地：MyMemory 免费接口降级
const SUMMARIZER = makeSummarizer({}, TRANSLATOR); // 本地：用译文/原文降级生成 digest

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ARGV = process.argv.slice(2);
const argPort = ARGV.find((a) => a.startsWith('--port='));
const PORT = Number(argPort?.split('=')[1]) || Number(process.env.PORT) || 5174;
const LIVE_DEFAULT = !ARGV.includes('--demo') && process.env.PULSEDECK_LIVE !== '0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const cache = new Map(); // key -> { at, ttl, data }

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

async function getNews(url) {
  const sources = url.searchParams.get('sources');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 400);
  const forceDemo = url.searchParams.get('demo') === '1' || !LIVE_DEFAULT;
  const forceLive = url.searchParams.get('live') === '1';
  const fresh = url.searchParams.get('fresh') === '1';

  const key = `${sources || 'default'}|${limit}|${forceDemo && !forceLive ? 'demo' : 'live'}`;
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < hit.ttl) return hit.data;

  if (forceDemo && !forceLive) {
    const data = {
      ...buildSampleData(),
      note: '当前是本地演示数据（去掉 PULSEDECK_LIVE=0 或加 ?live=1 可拉真实源）',
    };
    cache.set(key, { at: Date.now(), ttl: 30_000, data });
    return data;
  }

  const feeds = resolveFeeds(sources);
  const started = Date.now();
  let data = null;
  try {
    data = await aggregate(feeds, {
      limit,
      timeout: 7000,
      translator: TRANSLATOR,
      translateTo: 'zh',
      summarizer: SUMMARIZER,
      summarizeTo: 'zh',
    });
  } catch (err) {
    console.warn('[pulsedeck] aggregate error:', err.message);
  }

  const okCount = data?.sources?.filter((s) => s.ok).length || 0;
  console.log(
    `[pulsedeck] 抓取 ${feeds.length} 源 → 成功 ${okCount}，条目 ${data?.items?.length || 0}，耗时 ${Date.now() - started}ms`
  );

  if (!data || !data.items.length) {
    const failed = (data?.sources || []).filter((s) => !s.ok).map((s) => s.name);
    const sample = buildSampleData();
    data = {
      ...sample,
      note: `真实源当前不可达（${failed.slice(0, 3).join('、') || '网络受限'}${failed.length > 3 ? ' 等' : ''}），已自动降级为演示数据。部署到 Cloudflare 后由边缘节点抓取即可正常。`,
      sources: data?.sources?.length ? data.sources : sample.sources,
    };
    cache.set(key, { at: Date.now(), ttl: 60_000, data });
    return data;
  }

  data.categories = CATEGORIES;
  cache.set(key, { at: Date.now(), ttl: 5 * 60_000, data });
  return data;
}

/** 把聚合结果再输出成一份 RSS，方便导入其它阅读器（与 Worker 行为一致） */
function buildRss(data, site) {
  const items = data.items
    .slice(0, 60)
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Pulsedeck 热点聚合</title>
    <link>${escapeXml(site)}</link>
    <description>科技 / AI / 创投 每日热点聚合</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const buf = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  } catch {
    try {
      const buf = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(buf);
    } catch {
      res.writeHead(404).end('Not Found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api/config') {
      return sendJSON(res, { categories: CATEGORIES, feeds: publicFeeds(), total: FEEDS.length });
    }

    if (url.pathname === '/api/news') {
      return sendJSON(res, await getNews(url));
    }

    if (url.pathname === '/api/rss') {
      const data = await getNews(url);
      res.writeHead(200, {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      return res.end(buildRss(data, `http://localhost:${PORT}`));
    }

    if (url.pathname === '/api/health') {
      return sendJSON(res, { ok: true, time: new Date().toISOString(), feeds: FEEDS.length, live: LIVE_DEFAULT });
    }

    if (url.pathname === '/api/placeholder') {
      const svg = placeholderSVG(Object.fromEntries(url.searchParams));
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
      return res.end(svg);
    }

    if (url.pathname === '/api/img') {
      const target = url.searchParams.get('u');
      if (!target || !/^https?:\/\//i.test(target)) return res.writeHead(400).end('bad url');
      try {
        const upstream = await fetch(target, { signal: AbortSignal.timeout(6000) });
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.writeHead(upstream.status, {
          'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        });
        return res.end(buf);
      } catch {
        return res.writeHead(502).end('upstream failed');
      }
    }

    return serveStatic(res, url.pathname);
  } catch (err) {
    console.error('[pulsedeck] server error:', err);
    sendJSON(res, { error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ▚▚  Pulsedeck dev server');
  console.log(`  ➜  本地地址:  http://localhost:${PORT}`);
  console.log(`  ➜  接口:      http://localhost:${PORT}/api/news`);
  console.log(`  ➜  真实源:    ${LIVE_DEFAULT ? '开启（失败自动降级演示数据）' : '关闭（纯演示数据）'}`);
  console.log('');
});
