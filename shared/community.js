/**
 * Pulsedeck · 社区热点聚合（中文社区 + Reddit）
 * -------------------------------------------------------------
 * 独立的 /api/feeds 端点：抓取知乎 / 虎扑 / 百度贴吧 / Reddit 等社区源，
 * 并对 Top 条目做「正文全文提取」（full-text extraction）。
 *
 * 与 worker/index.js 解耦：本模块只导出 aggregateCommunity()，由 worker
 * 与 Vercel 适配层共用，避免在 worker 里再塞一份大逻辑。
 *
 * 关键约束（Vercel 免费版 Edge Function 25s 硬上限）：
 *   - 每个 feed 抓取带 7s 超时，Promise.allSettled 并发，单源失败不拖垮整体。
 *   - 全文提取只取按时间排序后的 Top 8 条，并发 4，单条 5s 超时 → 至多 2 波 ≈ 10s。
 *   - RSSHub 公共实例对数据中心 IP 常返回 403，故多镜像 Promise.any 取首个可用。
 *   - 全程缓冲成字符串再构造 Response，规避 edge 上 response.clone() 写入空体竞态。
 */

/* RSSHub 公共镜像（按需增删；任一 403/超时即被 Promise.any 跳过）。
   注意：公共实例可用性会变化，可自行补充已知可用的镜像。 */
const RSSHUB_HOSTS = [
  'https://rsshub.app',
  'https://rsshub.rssforever.com',
];

/* 社区源定义。
   - rsshub：RSSHub 路径（走多镜像竞速）
   - rss：直连地址（Reddit 等原生 RSS/Atom）
   - cat/lang：用于前端分类与翻译方向 */
export const COMMUNITY_FEEDS = [
  { id: 'zhihu-hot', name: '知乎热榜', cat: 'zhihu', lang: 'zh', rsshub: '/zhihu/hot' },
  { id: 'zhihu-daily', name: '知乎日报', cat: 'zhihu', lang: 'zh', rsshub: '/zhihu/daily' },
  { id: 'hupu-bbs', name: '虎扑步行街', cat: 'hupu', lang: 'zh', rsshub: '/hupu/all/topic-daily' },
  { id: 'tieba-liyi', name: '李毅吧', cat: 'tieba', lang: 'zh', rsshub: '/tieba/forum/李毅' },
  { id: 'tieba-sun', name: '孙笑川吧', cat: 'tieba', lang: 'zh', rsshub: '/tieba/forum/孙笑川' },
  { id: 'tieba-football', name: '足球吧', cat: 'tieba', lang: 'zh', rsshub: '/tieba/forum/足球' },
  { id: 'tieba-nba', name: 'NBA吧', cat: 'tieba', lang: 'zh', rsshub: '/tieba/forum/nba' },
  { id: 'reddit-china-irl', name: 'r/China_irl', cat: 'reddit', lang: 'en', rss: 'https://www.reddit.com/r/China_irl/.rss' },
  { id: 'reddit-china', name: 'r/China', cat: 'reddit', lang: 'en', rss: 'https://www.reddit.com/r/China/.rss' },
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const FEED_TIMEOUT = 7000;
const FULLTEXT_TOP = 8; // 全文提取条数上限（Vercel 25s 约束）
const FULLTEXT_CONCURRENCY = 4;
const FULLTEXT_TIMEOUT = 5000;
const MAX_FULLTEXT_LENGTH = 1600;
const CANDIDATE_TOP = 60; // 先按时间取前 60 条作为候选，再对其中的 top 8 做全文
const COMMUNITY_CACHE_SECONDS = 300;

/* ------------------------------ 网络 ------------------------------ */

async function fetchRaw(url, timeout) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(to);
  }
}

async function fetchFeed(feed, timeout) {
  let res = null;
  if (feed.rss) {
    res = await fetchRaw(feed.rss, timeout);
  } else {
    // 多镜像竞速：首个返回 ok 的胜出；全部失败则 res=null
    const tries = RSSHUB_HOSTS.map(async (h) => {
      const r = await fetchRaw(h + feed.rsshub, timeout);
      if (!r.ok) throw new Error('status ' + r.status);
      return r;
    });
    res = await Promise.any(tries).catch(() => null);
  }
  if (!res || !res.ok) return { ok: false, status: res ? res.status : 0, xml: '', count: 0 };
  const xml = await res.text();
  return { ok: true, status: res.status, xml, count: 0 };
}

/* ------------------------------ 解析 ------------------------------ */

function decodeEntities(s = '') {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function cleanText(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  let c = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeEntities(c).trim();
}

function extractLink(block) {
  // RSS：<link>url</link>
  const direct = extractTag(block, 'link');
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  // Atom：<link rel="alternate" href="..."/> 或任意 <link href>
  const links = [...block.matchAll(/<link\b([^>]*)>/gi)];
  let fallback = '';
  for (const lm of links) {
    const attrs = lm[1];
    const rel = (attrs.match(/rel\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    const href = (attrs.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (/alternate/i.test(rel) && href) return href;
    if (href && !fallback) fallback = href;
  }
  return fallback;
}

function splitEntries(xml) {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  if (items.length) return items;
  // Atom
  return [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
}

function parseFeed(xml, feed) {
  const blocks = splitEntries(xml);
  const out = [];
  for (const b of blocks) {
    const title = cleanText(extractTag(b, 'title'));
    const link = extractLink(b);
    if (!title || !link) continue;
    const pub =
      extractTag(b, 'pubDate') ||
      extractTag(b, 'published') ||
      extractTag(b, 'updated') ||
      extractTag(b, 'dc:date');
    const descRaw =
      extractTag(b, 'description') || extractTag(b, 'summary') || extractTag(b, 'content');
    const author = cleanText(extractTag(b, 'author') || extractTag(b, 'dc:creator'));
    const points = Number(extractTag(b, 'score')) || 0;
    out.push({
      source: feed.name,
      sourceId: feed.id,
      category: feed.cat,
      lang: feed.lang,
      title,
      link,
      pubDate: pub,
      description: cleanText(descRaw).slice(0, 400),
      author,
      points,
      comments: 0,
    });
  }
  return out;
}

/* ------------------ 正文全文提取（full-text） ------------------ */

function extractMainContent(html = '') {
  let image = '';
  const og =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (og) image = og[1];

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  const art = stripped.match(/<article[\s\S]*?<\/article>/i);
  const scope = art ? art[0] : stripped;

  const paras = [...scope.matchAll(/<p[\s\S]*?>([\s\S]*?)<\/p>/gi)]
    .map((m) => cleanText(m[1]))
    .filter((t) => t.length > 30);

  let body = paras.join('\n\n');
  if (!body) body = cleanText(scope).slice(0, MAX_FULLTEXT_LENGTH);
  if (body.length > MAX_FULLTEXT_LENGTH) body = body.slice(0, MAX_FULLTEXT_LENGTH) + ' …';
  return { image, text: body };
}

async function enrichWithFullText(items, { topN, concurrency, timeout }) {
  const targets = items.slice(0, topN);
  let idx = 0;
  async function worker() {
    while (idx < targets.length) {
      const i = idx++;
      const it = targets[i];
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), timeout);
        const r = await fetch(it.link, {
          headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*' },
          signal: ctrl.signal,
          redirect: 'follow',
        });
        clearTimeout(to);
        if (r.ok) {
          const html = await r.text();
          const { image, text } = extractMainContent(html);
          it.fullText = text;
          if (image && !it.image) it.image = image;
        }
      } catch {
        /* 单条失败：保留 RSS 摘要即可 */
      }
    }
  }
  const pool = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
  await Promise.all(pool);
  return items;
}

/* ------------------------------ 归一化 ------------------------------ */

function hashStr(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function normalize(it) {
  const ts = Date.parse(it.pubDate) || Date.now();
  const full = it.fullText || '';
  const summary = it.description || (full ? full.slice(0, 200) : '') || '';
  const digest = full ? full.slice(0, 360) : '';
  const words = full ? full.length : summary.length;
  const readMinutes = Math.max(1, Math.round(words / 350));
  return {
    id: 'cm-' + hashStr(it.link),
    title: it.title,
    link: it.link,
    source: it.source,
    sourceId: it.sourceId,
    category: it.category,
    lang: it.lang,
    timestamp: ts,
    published: it.pubDate,
    summary,
    digest,
    description: full || summary,
    image: it.image || null,
    author: it.author || '',
    tags: [],
    points: it.points || 0,
    comments: it.comments || 0,
    weight: 6,
    titleZh: '',
    summaryZh: '',
  };
}

/* ------------------------------ 聚合入口 ------------------------------ */

export async function aggregateCommunity({ fresh = false } = {}) {
  const cacheKey = new Request('https://pulsedeck.cache/community');
  const cache = caches.default;

  if (!fresh) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      if (body) {
        try {
          return JSON.parse(body);
        } catch {
          /* 损坏则忽略，重新聚合 */
        }
      }
    }
  }

  const results = await Promise.allSettled(
    COMMUNITY_FEEDS.map((f) => fetchFeed(f, FEED_TIMEOUT))
  );

  const sources = [];
  let items = [];
  results.forEach((r, i) => {
    const feed = COMMUNITY_FEEDS[i];
    if (r.status === 'fulfilled' && r.value.ok) {
      const parsed = parseFeed(r.value.xml, feed);
      sources.push({ id: feed.id, name: feed.name, ok: true, count: parsed.length });
      items.push(...parsed);
    } else {
      const st =
        r.status === 'fulfilled'
          ? r.value.status || 'network error'
          : (r.reason && r.reason.message) || 'network error';
      sources.push({ id: feed.id, name: feed.name, ok: false, count: 0, error: String(st) });
    }
  });

  // 按时间倒序，取前 CANDIDATE_TOP 作候选
  items.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
  const top = items.slice(0, CANDIDATE_TOP);

  // 仅对 Top FULLTEXT_TOP 做全文提取，控制总耗时
  await enrichWithFullText(top, {
    topN: FULLTEXT_TOP,
    concurrency: FULLTEXT_CONCURRENCY,
    timeout: FULLTEXT_TIMEOUT,
  });

  const out = {
    updated: new Date().toISOString(),
    count: top.length,
    sources,
    items: top.map(normalize),
  };

  // 缓冲成字符串再写缓存：规避 edge 上 clone() 共享流写入空体的竞态
  const bodyText = JSON.stringify(out);
  try {
    await cache.put(
      cacheKey,
      new Response(bodyText, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${COMMUNITY_CACHE_SECONDS}`,
        },
      })
    );
  } catch {
    /* 缓存失败不致命 */
  }
  return out;
}
