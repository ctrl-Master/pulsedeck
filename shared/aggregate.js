/**
 * Pulsedeck · 聚合核心
 * -------------------------------------------------------------
 * 只依赖 fetch / URL / AbortController 等 Web 标准，
 * 因此同一份代码可以同时跑在 Cloudflare Worker 和 Node 18+ 本地服务上。
 *
 * 对外主要导出：
 *   parseFeed(xml, feed)  把一段 RSS/Atom/RDF 文本解析成新闻条目
 *   aggregate(feeds, opt) 并行抓取多个源并归并、去重、排序
 */

/* =========================== XML 小工具 =========================== */

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&laquo;': '«',
  '&raquo;': '»',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

export function decodeEntities(str = '') {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function safeCodePoint(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function stripCdata(str = '') {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

export function stripTags(str = '') {
  return str
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function cleanText(str = '') {
  // 关键：Atom 源的 HTML 内容常把标签实体转义成 &lt;p&gt;。
  // 必须先解码再用 stripTags，且反复交替直到稳定，才能彻底清空标签。
  let s = stripCdata(String(str || ''));
  for (let i = 0; i < 4; i++) {
    const decoded = decodeEntities(s);
    const stripped = stripTags(decoded);
    if (stripped === s) break;
    s = stripped;
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** 取标签内文本，支持命名空间（如 content:encoded、dc:creator） */
function tagText(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? stripCdata(m[1]).trim() : '';
}

/** 取某标签的属性值，例如 attrOf(xml, 'media:thumbnail', 'url') */
function attrOf(xml, tag, attr) {
  const re = new RegExp(`<${tag}(\\s[^>]*?)\\/?>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  const am = m[1].match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return am ? decodeEntities(am[1]) : '';
}

/** 兼容 RSS 的 <link>text</link> 与 Atom 的 <link rel href/> */
function linkOf(xml) {
  const alt = xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (alt) return decodeEntities(alt[1]);

  const plain = tagText(xml, 'link');
  if (plain && /^https?:/i.test(plain)) return decodeEntities(plain);

  const href = attrOf(xml, 'link', 'href');
  if (href) return href;

  const guid = tagText(xml, 'guid');
  if (guid && /^https?:/i.test(guid)) return decodeEntities(guid);

  const id = tagText(xml, 'id');
  return id && /^https?:/i.test(id) ? decodeEntities(id) : '';
}

/* =========================== 字段提取 =========================== */

const BAD_IMAGE = /(spacer|pixel|blank|1x1|feedburner|gravatar|badge|button|icon|tracking|beacon|ad\/|doubleclick)/i;

function pickImage(itemXml, html) {
  // 1) media:thumbnail / media:content（RSS 最标准的图片字段）
  const mediaThumb = attrOf(itemXml, 'media:thumbnail', 'url');
  if (mediaThumb && !BAD_IMAGE.test(mediaThumb)) return mediaThumb;

  const mediaContent = attrOf(itemXml, 'media:content', 'url');
  if (mediaContent && /\.(jpe?g|png|webp|avif|gif|svg)/i.test(mediaContent) && !BAD_IMAGE.test(mediaContent)) {
    return mediaContent;
  }

  // 2) enclosure（很多播客/视频源用这个）
  const enclosure = attrOf(itemXml, 'enclosure', 'url');
  if (enclosure && /\.(jpe?g|png|webp|avif|gif)/i.test(enclosure) && !BAD_IMAGE.test(enclosure)) {
    return enclosure;
  }

  // 3) itunes:image
  const itunes = attrOf(itemXml, 'itunes:image', 'href');
  if (itunes && !BAD_IMAGE.test(itunes)) return itunes;

  // 4) 从 HTML 正文提取：优先 og:image / twitter:image 元标签
  const body = String(html || itemXml);
  const ogImg = body.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            || body.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImg && !BAD_IMAGE.test(ogImg[1]) && /^https?:/i.test(ogImg[1])) return decodeEntities(ogImg[1]);

  // 5) 正文里的 <figure><img> 或第一张大图（排除小图标）
  const imgs = [...body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  for (const m of imgs) {
    const src = decodeEntities(m[1]);
    const tag = m[0];
    /* 优先取在 <figure> 里的、或尺寸看起来像内容图的 */
    const inFigure = /<figure[\s>]/i.test(tag.slice(-100));
    const looksBig = /\b(width|height)\s*=\s*["']?\d{3,}/i.test(tag);
    if (!BAD_IMAGE.test(src) && /^https?:/i.test(src) && (inFigure || looksBig || /\.(jpe?g|png|webp|avif|gif)/i.test(src))) {
      return src;
    }
  }
  // 6) 兜底：任何 https 图片（最后手段）
  for (const m of imgs) {
    const src = decodeEntities(m[1]);
    if (!BAD_IMAGE.test(src) && /^https?:/i.test(src)) return src;
  }
  return '';
}

/** 提取 <category> 标签，作为文章 tag */
function pickTags(itemXml) {
  const tags = new Set();
  for (const m of itemXml.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)) {
    const t = cleanText(m[1]);
    if (t && t.length <= 24) tags.add(t);
  }
  for (const m of itemXml.matchAll(/<category[^>]*term=["']([^"']+)["'][^>]*\/?>/gi)) {
    const t = cleanText(m[1]);
    if (t && t.length <= 24) tags.add(t);
  }
  return [...tags].slice(0, 4);
}

/** Hacker News 之类的源会在描述里带 Points / Comments */
function pickMetrics(text = '') {
  const points = text.match(/Points?:\s*(\d+)/i);
  const comments = text.match(/#\s*Comments?:\s*(\d+)/i) || text.match(/Comments?:\s*(\d+)/i);
  return {
    points: points ? Number(points[1]) : 0,
    comments: comments ? Number(comments[1]) : 0,
  };
}

/** 粗略估算阅读时长：中文按字数，英文按词数 */
export function estimateReadMinutes(text = '') {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = text.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = cjk / 400 + words / 220;
  return Math.max(1, Math.round(minutes));
}

/** 归一化链接，用于跨源去重 */
export function normalizeLink(link = '') {
  try {
    const u = new URL(link);
    u.hash = '';
    // 去掉常见的追踪参数
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref|source|from|spm|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
    }
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return String(link).trim().toLowerCase();
  }
}

function normalizeTitle(title = '') {
  return title
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, '')
    .slice(0, 60);
}

/* =========================== 解析单个源 =========================== */

/**
 * 把一段 RSS / Atom / RDF 文本解析成 Pulsedeck 新闻条目数组
 * @param {string} xml
 * @param {object} feed  来自 shared/feeds.js 的源定义
 */
export function parseFeed(xml, feed = {}) {
  if (!xml || typeof xml !== 'string') return [];

  const blocks = [
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
  ];

  const items = [];

  for (const block of blocks) {
    const raw = block[1];

    const title = cleanText(tagText(raw, 'title'));
    const link = linkOf(raw);
    if (!title || !link) continue;

    const publishedRaw =
      tagText(raw, 'published') ||
      tagText(raw, 'pubDate') ||
      tagText(raw, 'updated') ||
      tagText(raw, 'dc:date') ||
      tagText(raw, 'date');
    const ts = publishedRaw ? Date.parse(publishedRaw.trim()) : NaN;

    const htmlBody =
      tagText(raw, 'content:encoded') ||
      tagText(raw, 'content') ||
      tagText(raw, 'description') ||
      tagText(raw, 'summary') ||
      '';

    const summarySource =
      tagText(raw, 'description') ||
      tagText(raw, 'summary') ||
      tagText(raw, 'content:encoded') ||
      tagText(raw, 'content') ||
      '';

    const plain = cleanText(summarySource);
    const fullPlain = cleanText(htmlBody);

    const author =
      cleanText(tagText(raw, 'dc:creator')) ||
      cleanText(tagText(tagText(raw, 'author'), 'name')) ||
      cleanText(tagText(raw, 'author')) ||
      feed.name ||
      '';

    const { points, comments } = pickMetrics(plain);
    const image = pickImage(raw, htmlBody);

    items.push({
      id: `${feed.id || 'feed'}:${normalizeLink(link)}`,
      title,
      link,
      source: feed.name || '',
      sourceId: feed.id || '',
      sourceHome: feed.home || '',
      category: feed.category || 'tech',
      lang: feed.lang || 'en',
      author: author.slice(0, 48),
      published: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
      timestamp: Number.isFinite(ts) ? ts : 0,
      image,
      tags: pickTags(raw),
      points,
      comments,
      readMinutes: estimateReadMinutes(fullPlain || plain),
      summary: plain.slice(0, 220),
      description: plain.slice(0, 600),
    });
  }

  return items;
}

/* =========================== 排序与打分 =========================== */

/**
 * 「重点优先」分数：新鲜度 + 源权重 + HN 热度
 * 用于前端 sort=hot
 */
export function hotScore(item, now = Date.now()) {
  const ageHours = item.timestamp ? (now - item.timestamp) / 36e5 : 999;
  const freshness = Math.max(0, 48 - ageHours) / 48; // 48 小时内线性衰减
  const weight = (item.weight ?? 5) / 10;
  const buzz = Math.log10(1 + (item.points || 0) + (item.comments || 0) * 2) / 3;
  return freshness * 0.55 + weight * 0.3 + Math.min(buzz, 1) * 0.15;
}

/* =========================== 并行聚合 =========================== */

/**
 * 对英文条目批量翻译（标题 + 摘要），结果写回 item.titleZh / item.summaryZh
 * 采用分批并发，限制同时请求数，避免把翻译后端打爆。
 */
async function translateItems(items, translator, to) {
  const targets = items.filter((it) => it.lang === 'en' && !it.titleZh);
  if (!targets.length) return;

  // 本地 MyMemory 免费接口并发限制严格，降并发避免被限流
  const isLocal = translator && translator.name === 'mymemory';
  const CONCURRENCY = isLocal ? 3 : 6;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (it) => {
        const [titleZh, summaryZh] = await Promise.all([
          translator.translate(it.title, 'en', to),
          it.summary ? translator.translate(it.summary, 'en', to) : Promise.resolve(''),
        ]);
        if (titleZh) it.titleZh = titleZh;
        if (summaryZh) it.summaryZh = summaryZh;
      })
    );
  }
}

/**
 * 生成「中文汇总」digest：卡片上直接可看的几十~几百字摘要，无需点进原文。
 * - 部署（summarizer 用 Workers AI）：真正凝练的中文摘要
 * - 本地降级（summarizer 为 null 或用 local 实现）：英文源用已有译文 summaryZh，
 *   没有译文时回退清洗后的原文；中文源直接用原文摘要
 */
async function summarizeItems(items, summarizer, to) {
  if (!summarizer) {
    for (const it of items) {
      it.digest = it.lang === 'zh' ? it.summary || it.title : it.summaryZh || it.summary || it.title;
    }
    return;
  }
  const isLocal = summarizer && summarizer.name === 'local';
  const CONCURRENCY = isLocal ? 3 : 5;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((it) => summarizer.summarizeItem(it, to)));
  }
}

async function fetchWithTimeout(url, { timeout = 8000, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 并行聚合多个源
 * @param {Array}  feeds 源列表
 * @param {Object} opts  { limit, timeout, cacheTtl, perFeed, translator, translateTo }
 *   - translator: 来自 makeTranslator() 的翻译器；提供后会对英文条目自动附中文译文
 *   - translateTo: 目标语言（默认 'zh'）
 * @returns {Promise<{updated, count, demo, sources, items}>}
 */
export async function aggregate(feeds, opts = {}) {
  const {
    limit = 200,
    timeout = 8000,
    cacheTtl = 600,
    perFeed = 30,
    translator = null,
    translateTo = 'zh',
    summarizer = null,
    summarizeTo = 'zh',
  } = opts;

  const settled = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetchWithTimeout(feed.url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Pulsedeck/1.0; +https://github.com/)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        cf: { cacheTtl, cacheEverything: true },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseFeed(text, feed).slice(0, perFeed);
      if (!parsed.length) throw new Error('解析结果为空');
      return { feed, items: parsed };
    })
  );

  const sources = [];
  const all = [];

  settled.forEach((result, i) => {
    const feed = feeds[i];
    const base = {
      id: feed.id,
      name: feed.name,
      category: feed.category,
      lang: feed.lang,
      home: feed.home,
    };
    if (result.status === 'fulfilled') {
      const { items } = result.value;
      sources.push({ ...base, ok: true, count: items.length });
      for (const it of items) all.push({ ...it, weight: feed.weight ?? 5 });
    } else {
      sources.push({
        ...base,
        ok: false,
        count: 0,
        error: String(result.reason?.message || result.reason || 'failed').slice(0, 120),
      });
    }
  });

  // 去重：同链接、同标题只留一条（保留权重高的那个源）
  const byKey = new Map();
  for (const it of all) {
    const keys = [normalizeLink(it.link), `t:${normalizeTitle(it.title)}`];
    const existingKey = keys.find((k) => byKey.has(k));
    if (existingKey) {
      const prev = byKey.get(existingKey);
      if ((it.weight ?? 5) > (prev.weight ?? 5)) {
        for (const k of keys) byKey.set(k, it);
      }
      continue;
    }
    for (const k of keys) byKey.set(k, it);
  }

  const items = [...new Set(byKey.values())]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  // 自动双语：对英文条目翻译标题与摘要（中文源跳过）
  let translateName = null;
  if (translator && translateTo) {
    await translateItems(items, translator, translateTo);
    translateName = translator.name || 'auto';
  }

  // 中文汇总 digest：卡片上直接可看的摘要，无需点进原文
  let summarizeName = null;
  if (summarizer && summarizeTo) {
    await summarizeItems(items, summarizer, summarizeTo);
    summarizeName = summarizer.name || 'auto';
  } else if (translator) {
    // 没给专门的 summarizer，但有翻译器：用译文兜底生成 digest
    for (const it of items) {
      it.digest = it.lang === 'zh' ? it.summary || it.title : it.summaryZh || it.summary || it.title;
    }
  }

  return {
    updated: new Date().toISOString(),
    count: items.length,
    demo: false,
    translate: translateName,
    summarize: summarizeName,
    sources,
    items,
  };
}
