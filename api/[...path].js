/* Pulsedeck Vercel deploy bundle (self-contained). Source: src/vercel-entry.js + shared/*. Regenerate: node scripts/bundle-vercel.mjs */

// shared/feeds.js
var CATEGORIES = [
  { id: "all", name: "All", short: "All" },
  { id: "tech", name: "Tech", short: "Tech" },
  { id: "ai", name: "AI", short: "AI" },
  { id: "dev", name: "Developer", short: "Dev" },
  { id: "business", name: "Business", short: "Biz" },
  { id: "cn", name: "Chinese", short: "\u4E2D\u6587" }
];
var FEEDS = [
  /* ---------------- 综合科技 ---------------- */
  { id: "techcrunch", name: "TechCrunch", category: "tech", url: "https://techcrunch.com/feed/", home: "https://techcrunch.com", lang: "en", enabled: true, weight: 9 },
  { id: "arstechnica", name: "Ars Technica", category: "tech", url: "https://feeds.arstechnica.com/arstechnica/index", home: "https://arstechnica.com", lang: "en", enabled: true, weight: 8 },
  { id: "theverge", name: "The Verge", category: "tech", url: "https://www.theverge.com/rss/index.xml", home: "https://www.theverge.com", lang: "en", enabled: true, weight: 8 },
  { id: "hackernews", name: "Hacker News", category: "tech", url: "https://hnrss.org/frontpage?points=100", home: "https://news.ycombinator.com", lang: "en", enabled: true, weight: 10 },
  { id: "wired", name: "Wired", category: "tech", url: "https://www.wired.com/feed/rss", home: "https://www.wired.com", lang: "en", enabled: true, weight: 8 },
  { id: "bbc-tech", name: "BBC Technology", category: "tech", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", home: "https://www.bbc.com/technology", lang: "en", enabled: true, weight: 7 },
  { id: "engadget", name: "Engadget", category: "tech", url: "https://www.engadget.com/rss.xml", home: "https://www.engadget.com", lang: "en", enabled: false, weight: 5 },
  /* ---------------- AI 前沿 ---------------- */
  { id: "openai", name: "OpenAI", category: "ai", url: "https://openai.com/news/rss.xml", home: "https://openai.com", lang: "en", enabled: true, weight: 10 },
  { id: "huggingface", name: "Hugging Face", category: "ai", url: "https://huggingface.co/blog/feed.xml", home: "https://huggingface.co", lang: "en", enabled: true, weight: 7 },
  { id: "googleai", name: "Google AI", category: "ai", url: "https://blog.google/technology/ai/rss/", home: "https://blog.google", lang: "en", enabled: true, weight: 8 },
  { id: "mittr", name: "MIT Tech Review", category: "ai", url: "https://www.technologyreview.com/feed/", home: "https://www.technologyreview.com", lang: "en", enabled: true, weight: 7 },
  { id: "arxiv-ai", name: "arXiv cs.AI", category: "ai", url: "https://rss.arxiv.org/rss/cs.AI", home: "https://arxiv.org", lang: "en", enabled: false, weight: 4 },
  { id: "deepmind", name: "Google DeepMind", category: "ai", url: "https://deepmind.google/blog/rss.xml", home: "https://deepmind.google", lang: "en", enabled: false, weight: 7 },
  { id: "nvidia-blog", name: "NVIDIA Blog", category: "ai", url: "https://blogs.nvidia.com/feed/", home: "https://blogs.nvidia.com", lang: "en", enabled: false, weight: 7 },
  { id: "the-decoder", name: "The Decoder", category: "ai", url: "https://the-decoder.com/feed/", home: "https://the-decoder.com", lang: "en", enabled: false, weight: 6 },
  /* ---------------- 开发者 ---------------- */
  { id: "simonwillison", name: "Simon Willison", category: "dev", url: "https://simonwillison.net/atom/everything/", home: "https://simonwillison.net", lang: "en", enabled: true, weight: 8 },
  { id: "bytebytego", name: "ByteByteGo", category: "dev", url: "https://blog.bytebytego.com/feed", home: "https://blog.bytebytego.com", lang: "en", enabled: true, weight: 6 },
  { id: "github-blog", name: "GitHub Blog", category: "dev", url: "https://github.blog/feed/", home: "https://github.blog", lang: "en", enabled: true, weight: 6 },
  { id: "cloudflare-blog", name: "Cloudflare Blog", category: "dev", url: "https://blog.cloudflare.com/rss/", home: "https://blog.cloudflare.com", lang: "en", enabled: false, weight: 6 },
  { id: "aws-blog", name: "AWS Blog", category: "dev", url: "https://aws.amazon.com/blogs/aws/feed/", home: "https://aws.amazon.com/blogs/aws/", lang: "en", enabled: false, weight: 6 },
  { id: "kubernetes-blog", name: "Kubernetes Blog", category: "dev", url: "https://kubernetes.io/feed.xml", home: "https://kubernetes.io/blog/", lang: "en", enabled: false, weight: 6 },
  /* ---------------- 创投商业 ---------------- */
  { id: "venturebeat", name: "VentureBeat", category: "business", url: "https://feeds.feedburner.com/venturebeat/SZYF", home: "https://venturebeat.com", lang: "en", enabled: true, weight: 6 },
  { id: "stratechery", name: "Stratechery", category: "business", url: "https://stratechery.com/feed/", home: "https://stratechery.com", lang: "en", enabled: true, weight: 8 },
  { id: "benevans", name: "Benedict Evans", category: "business", url: "https://www.ben-evans.com/benedictevans?format=rss", home: "https://www.ben-evans.com", lang: "en", enabled: false, weight: 6 },
  { id: "yc-blog", name: "Y Combinator", category: "business", url: "https://www.ycombinator.com/blog/rss.xml", home: "https://www.ycombinator.com/blog", lang: "en", enabled: false, weight: 7 },
  /* ---------------- 中文源 ---------------- */
  { id: "sspai", name: "\u5C11\u6570\u6D3E", category: "cn", url: "https://sspai.com/feed", home: "https://sspai.com", lang: "zh", enabled: true, weight: 7 },
  { id: "ifanr", name: "\u7231\u8303\u513F", category: "cn", url: "https://www.ifanr.com/feed", home: "https://www.ifanr.com", lang: "zh", enabled: true, weight: 6 },
  { id: "jiqizhixin", name: "\u673A\u5668\u4E4B\u5FC3", category: "cn", url: "https://www.jiqizhixin.com/rss", home: "https://www.jiqizhixin.com", lang: "zh", enabled: true, weight: 8 },
  { id: "ruanyifeng", name: "\u962E\u4E00\u5CF0\u7684\u7F51\u7EDC\u65E5\u5FD7", category: "cn", url: "https://www.ruanyifeng.com/blog/atom.xml", home: "https://www.ruanyifeng.com/blog/", lang: "zh", enabled: true, weight: 7 },
  { id: "infoq-cn", name: "InfoQ \u4E2D\u6587", category: "cn", url: "https://www.infoq.cn/feed", home: "https://www.infoq.cn", lang: "zh", enabled: false, weight: 5 },
  { id: "huxiu", name: "\u864E\u55C5", category: "cn", url: "https://www.huxiu.com/rss/0.xml", home: "https://www.huxiu.com", lang: "zh", enabled: false, weight: 5 },
  { id: "36kr", name: "36\u6C2A", category: "cn", url: "https://36kr.com/feed", home: "https://36kr.com", lang: "zh", enabled: false, weight: 6 },
  { id: "qbitai", name: "\u91CF\u5B50\u4F4D", category: "cn", url: "https://www.qbitai.com/feed", home: "https://www.qbitai.com", lang: "zh", enabled: false, weight: 7 }
];
var DEFAULT_FEEDS = FEEDS.filter((f) => f.enabled);

// shared/xml.js
var ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
  "&laquo;": "\xAB",
  "&raquo;": "\xBB",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
  "&middot;": "\xB7",
  "&bull;": "\u2022",
  "&copy;": "\xA9",
  "&reg;": "\xAE",
  "&trade;": "\u2122",
  "&deg;": "\xB0",
  "&plusmn;": "\xB1",
  "&times;": "\xD7",
  "&divide;": "\xF7",
  "&euro;": "\u20AC",
  "&pound;": "\xA3",
  "&yen;": "\xA5",
  "&sect;": "\xA7",
  "&para;": "\xB6",
  "&alpha;": "\u03B1",
  "&beta;": "\u03B2",
  "&gamma;": "\u03B3",
  "&delta;": "\u03B4",
  "&pi;": "\u03C0",
  "&sigma;": "\u03C3",
  "&omega;": "\u03C9",
  "&lambda;": "\u03BB",
  "&mu;": "\u03BC",
  "&infin;": "\u221E",
  "&ne;": "\u2260",
  "&le;": "\u2264",
  "&ge;": "\u2265",
  "&larr;": "\u2190",
  "&rarr;": "\u2192",
  "&uarr;": "\u2191",
  "&darr;": "\u2193",
  "&harr;": "\u2194"
};
function safeCodePoint(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
function decodeEntities(str = "") {
  return String(str).replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10))).replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}
function stripCdata(str = "") {
  return String(str).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function stripTags(str = "") {
  return String(str).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
}
function cleanText(str = "") {
  let s = stripCdata(String(str || ""));
  for (let i = 0; i < 4; i++) {
    const decoded = decodeEntities(s);
    const stripped = stripTags(decoded);
    if (stripped === s) break;
    s = stripped;
  }
  return s.replace(/\s+/g, " ").trim();
}
function tagText(xml = "", tag = "") {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? stripCdata(m[1]).trim() : "";
}
function attrOf(xml = "", tag = "", attr = "") {
  const re = new RegExp(`<${tag}(\\s[^>]*?)\\/?>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  const am = m[1].match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
  return am ? decodeEntities(am[1]) : "";
}
function linkOf(xml = "") {
  const alt = xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (alt) return decodeEntities(alt[1]);
  const plain = tagText(xml, "link");
  if (plain && /^https?:/i.test(plain)) return decodeEntities(plain);
  const href = attrOf(xml, "link", "href");
  if (href) return href;
  const guid = tagText(xml, "guid");
  if (guid && /^https?:/i.test(guid)) return decodeEntities(guid);
  const id = tagText(xml, "id");
  return id && /^https?:/i.test(id) ? decodeEntities(id) : "";
}

// shared/aggregate.js
var BAD_IMAGE = /(spacer|pixel|blank|1x1|feedburner|gravatar|badge|button|icon|tracking|beacon|ad\/|doubleclick)/i;
function pickImage(itemXml, html) {
  const mediaThumb = attrOf(itemXml, "media:thumbnail", "url");
  if (mediaThumb && !BAD_IMAGE.test(mediaThumb)) return mediaThumb;
  const mediaContent = attrOf(itemXml, "media:content", "url");
  if (mediaContent && /\.(jpe?g|png|webp|avif|gif|svg)/i.test(mediaContent) && !BAD_IMAGE.test(mediaContent)) {
    return mediaContent;
  }
  const enclosure = attrOf(itemXml, "enclosure", "url");
  if (enclosure && /\.(jpe?g|png|webp|avif|gif)/i.test(enclosure) && !BAD_IMAGE.test(enclosure)) {
    return enclosure;
  }
  const itunes = attrOf(itemXml, "itunes:image", "href");
  if (itunes && !BAD_IMAGE.test(itunes)) return itunes;
  const body = String(html || itemXml);
  const ogImg = body.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || body.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImg && !BAD_IMAGE.test(ogImg[1]) && /^https?:/i.test(ogImg[1])) return decodeEntities(ogImg[1]);
  const imgs = [...body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  for (const m of imgs) {
    const src = decodeEntities(m[1]);
    const tag = m[0];
    const inFigure = /<figure[\s>]/i.test(tag.slice(-100));
    const looksBig = /\b(width|height)\s*=\s*["']?\d{3,}/i.test(tag);
    if (!BAD_IMAGE.test(src) && /^https?:/i.test(src) && (inFigure || looksBig || /\.(jpe?g|png|webp|avif|gif)/i.test(src))) {
      return src;
    }
  }
  for (const m of imgs) {
    const src = decodeEntities(m[1]);
    if (!BAD_IMAGE.test(src) && /^https?:/i.test(src)) return src;
  }
  return "";
}
function pickTags(itemXml) {
  const tags = /* @__PURE__ */ new Set();
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
function pickMetrics(text = "") {
  const points = text.match(/Points?:\s*(\d+)/i);
  const comments = text.match(/#\s*Comments?:\s*(\d+)/i) || text.match(/Comments?:\s*(\d+)/i);
  return {
    points: points ? Number(points[1]) : 0,
    comments: comments ? Number(comments[1]) : 0
  };
}
function estimateReadMinutes(text = "") {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = cjk / 400 + words / 220;
  return Math.max(1, Math.round(minutes));
}
function normalizeLink(link = "") {
  try {
    const u = new URL(link);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref|source|from|spm|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
    }
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return String(link).trim().toLowerCase();
  }
}
function normalizeTitle(title = "") {
  try {
    return title.toLowerCase().replace(/[\s\p{P}]+/gu, "").slice(0, 60);
  } catch {
    return title.toLowerCase().replace(/[\s!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]+/g, "").slice(0, 60);
  }
}
function parseFeed(xml, feed = {}) {
  if (!xml || typeof xml !== "string") return [];
  const blocks = [
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)
  ];
  const items = [];
  for (const block of blocks) {
    const raw = block[1];
    const title = cleanText(tagText(raw, "title"));
    const link = linkOf(raw);
    if (!title || !link) continue;
    const publishedRaw = tagText(raw, "published") || tagText(raw, "pubDate") || tagText(raw, "updated") || tagText(raw, "dc:date") || tagText(raw, "date");
    const ts = publishedRaw ? Date.parse(publishedRaw.trim()) : NaN;
    const htmlBody = tagText(raw, "content:encoded") || tagText(raw, "content") || tagText(raw, "description") || tagText(raw, "summary") || "";
    const summarySource = tagText(raw, "description") || tagText(raw, "summary") || tagText(raw, "content:encoded") || tagText(raw, "content") || "";
    const plain = cleanText(summarySource);
    const fullPlain = cleanText(htmlBody);
    const author = cleanText(tagText(raw, "dc:creator")) || cleanText(tagText(tagText(raw, "author"), "name")) || cleanText(tagText(raw, "author")) || feed.name || "";
    const { points, comments } = pickMetrics(plain);
    const image = pickImage(raw, htmlBody);
    items.push({
      id: `${feed.id || "feed"}:${normalizeLink(link)}`,
      title,
      link,
      source: feed.name || "",
      sourceId: feed.id || "",
      sourceHome: feed.home || "",
      category: feed.category || "tech",
      lang: feed.lang || "en",
      author: author.slice(0, 48),
      published: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
      timestamp: Number.isFinite(ts) ? ts : 0,
      image,
      tags: pickTags(raw),
      points,
      comments,
      weight: feed.weight ?? 5,
      // 权重随条目携带，排序阶段直接用
      readMinutes: estimateReadMinutes(fullPlain || plain),
      summary: plain.slice(0, 220),
      description: plain.slice(0, 600)
    });
  }
  return items;
}
async function translateItems(items, translator, to) {
  const targets = items.filter((it) => it.lang === "en" && !it.titleZh);
  if (!targets.length) return;
  const isLocal = translator && translator.name === "mymemory";
  const CONCURRENCY = isLocal ? 3 : 6;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (it) => {
        const [titleZh, summaryZh] = await Promise.all([
          translator.translate(it.title, "en", to),
          it.summary ? translator.translate(it.summary, "en", to) : Promise.resolve("")
        ]);
        if (titleZh) it.titleZh = titleZh;
        if (summaryZh) it.summaryZh = summaryZh;
      })
    );
  }
}
async function summarizeItems(items, summarizer, to) {
  if (!summarizer) {
    for (const it of items) {
      it.digest = it.lang === "zh" ? it.summary || it.title : it.summaryZh || it.summary || it.title;
    }
    return;
  }
  const isLocal = summarizer && summarizer.name === "local";
  const CONCURRENCY = isLocal ? 3 : 5;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((it) => summarizer.summarizeItem(it, to)));
  }
}
async function fetchWithTimeout(url, { timeout = 8e3, ...init } = {}) {
  const isWorkers = typeof caches !== "undefined";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const options = { ...init, signal: ctrl.signal };
    if (isWorkers) options.cf = { cacheTtl: init.cacheTtl || 600, cacheEverything: true };
    return await fetch(url, options);
  } finally {
    clearTimeout(timer);
  }
}
async function aggregate(feeds, opts = {}) {
  const {
    limit = 200,
    timeout = 8e3,
    cacheTtl = 600,
    perFeed = 30,
    translator = null,
    translateTo = "zh",
    summarizer = null,
    summarizeTo = "zh"
  } = opts;
  const settled = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetchWithTimeout(feed.url, {
        timeout,
        cacheTtl,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Pulsedeck/1.0; +https://github.com/)",
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseFeed(text, feed).slice(0, perFeed);
      if (!parsed.length) throw new Error("\u89E3\u6790\u7ED3\u679C\u4E3A\u7A7A");
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
      home: feed.home
    };
    if (result.status === "fulfilled") {
      const { items: items2 } = result.value;
      sources.push({ ...base, ok: true, count: items2.length });
      for (const it of items2) all.push({ ...it, weight: feed.weight ?? 5 });
    } else {
      sources.push({
        ...base,
        ok: false,
        count: 0,
        error: String(result.reason?.message || result.reason || "failed").slice(0, 120)
      });
    }
  });
  const byKey = /* @__PURE__ */ new Map();
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
  const items = [...new Set(byKey.values())].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  let translateName = null;
  if (translator && translateTo) {
    await translateItems(items, translator, translateTo);
    translateName = translator.name || "auto";
  }
  let summarizeName = null;
  if (summarizer && summarizeTo) {
    await summarizeItems(items, summarizer, summarizeTo);
    summarizeName = summarizer.name || "auto";
  } else if (translator) {
    for (const it of items) {
      it.digest = it.lang === "zh" ? it.summary || it.title : it.summaryZh || it.summary || it.title;
    }
  }
  return {
    updated: (/* @__PURE__ */ new Date()).toISOString(),
    count: items.length,
    demo: false,
    translate: translateName,
    summarize: summarizeName,
    sources,
    items
  };
}

// shared/community.js
var RSSHUB_HOSTS = [
  "https://rsshub.app",
  "https://rsshub.rssforever.com"
];
var COMMUNITY_FEEDS = [
  { id: "zhihu-hot", name: "\u77E5\u4E4E\u70ED\u699C", cat: "zhihu", lang: "zh", rsshub: "/zhihu/hot" },
  { id: "zhihu-daily", name: "\u77E5\u4E4E\u65E5\u62A5", cat: "zhihu", lang: "zh", rsshub: "/zhihu/daily" },
  { id: "hupu-bbs", name: "\u864E\u6251\u6B65\u884C\u8857", cat: "hupu", lang: "zh", rsshub: "/hupu/all/topic-daily" },
  { id: "tieba-liyi", name: "\u674E\u6BC5\u5427", cat: "tieba", lang: "zh", rsshub: "/tieba/forum/\u674E\u6BC5" },
  { id: "tieba-sun", name: "\u5B59\u7B11\u5DDD\u5427", cat: "tieba", lang: "zh", rsshub: "/tieba/forum/\u5B59\u7B11\u5DDD" },
  { id: "tieba-football", name: "\u8DB3\u7403\u5427", cat: "tieba", lang: "zh", rsshub: "/tieba/forum/\u8DB3\u7403" },
  { id: "tieba-nba", name: "NBA\u5427", cat: "tieba", lang: "zh", rsshub: "/tieba/forum/nba" },
  { id: "reddit-china-irl", name: "r/China_irl", cat: "reddit", lang: "en", rss: "https://www.reddit.com/r/China_irl/.rss" },
  { id: "reddit-china", name: "r/China", cat: "reddit", lang: "en", rss: "https://www.reddit.com/r/China/.rss" }
];
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var FEED_TIMEOUT = 7e3;
var FULLTEXT_TOP = 8;
var FULLTEXT_CONCURRENCY = 4;
var FULLTEXT_TIMEOUT = 5e3;
var MAX_FULLTEXT_LENGTH = 1600;
var CANDIDATE_TOP = 60;
var COMMUNITY_CACHE_SECONDS = 300;
async function fetchRaw(url, timeout) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      },
      signal: ctrl.signal
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
    const tries = RSSHUB_HOSTS.map(async (h) => {
      const r = await fetchRaw(h + feed.rsshub, timeout);
      if (!r.ok) throw new Error("status " + r.status);
      return r;
    });
    res = await Promise.any(tries).catch(() => null);
  }
  if (!res || !res.ok) return { ok: false, status: res ? res.status : 0, xml: "", count: 0 };
  const xml = await res.text();
  return { ok: true, status: res.status, xml, count: 0 };
}
function splitEntries(xml) {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  if (items.length) return items;
  return [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
}
function parseFeed2(xml, feed) {
  const blocks = splitEntries(xml);
  const out = [];
  for (const b of blocks) {
    const title = cleanText(tagText(b, "title"));
    const link = linkOf(b);
    if (!title || !link) continue;
    const pub = tagText(b, "pubDate") || tagText(b, "published") || tagText(b, "updated") || tagText(b, "dc:date");
    const descRaw = tagText(b, "description") || tagText(b, "summary") || tagText(b, "content");
    const author = cleanText(tagText(b, "author") || tagText(b, "dc:creator"));
    const points = Number(tagText(b, "score")) || 0;
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
      comments: 0
    });
  }
  return out;
}
function extractMainContent(html = "") {
  let image = "";
  const og = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (og) image = og[1];
  const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  const art = stripped.match(/<article[\s\S]*?<\/article>/i);
  const scope = art ? art[0] : stripped;
  const paras = [...scope.matchAll(/<p[\s\S]*?>([\s\S]*?)<\/p>/gi)].map((m) => cleanText(m[1])).filter((t) => t.length > 30);
  let body = paras.join("\n\n");
  if (!body) body = cleanText(scope).slice(0, MAX_FULLTEXT_LENGTH);
  if (body.length > MAX_FULLTEXT_LENGTH) body = body.slice(0, MAX_FULLTEXT_LENGTH) + " \u2026";
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
          headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
          signal: ctrl.signal,
          redirect: "follow"
        });
        clearTimeout(to);
        if (r.ok) {
          const html = await r.text();
          const { image, text } = extractMainContent(html);
          it.fullText = text;
          if (image && !it.image) it.image = image;
        }
      } catch {
      }
    }
  }
  const pool = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
  await Promise.all(pool);
  return items;
}
function hashStr(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
  return (h >>> 0).toString(36);
}
function normalize(it) {
  const ts = Date.parse(it.pubDate) || Date.now();
  const full = it.fullText || "";
  const summary = it.description || (full ? full.slice(0, 200) : "") || "";
  const digest = full ? full.slice(0, 360) : "";
  const words = full ? full.length : summary.length;
  const readMinutes = Math.max(1, Math.round(words / 350));
  return {
    id: "cm-" + hashStr(it.link),
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
    author: it.author || "",
    tags: [],
    points: it.points || 0,
    comments: it.comments || 0,
    weight: 6,
    titleZh: "",
    summaryZh: ""
  };
}
async function aggregateCommunity({ fresh = false } = {}) {
  const cacheKey = new Request("https://pulsedeck.cache/community");
  const cache = caches.default;
  if (!fresh) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      if (body) {
        try {
          return JSON.parse(body);
        } catch {
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
    if (r.status === "fulfilled" && r.value.ok) {
      const parsed = parseFeed2(r.value.xml, feed);
      sources.push({ id: feed.id, name: feed.name, ok: true, count: parsed.length });
      items.push(...parsed);
    } else {
      const st = r.status === "fulfilled" ? r.value.status || "network error" : r.reason && r.reason.message || "network error";
      sources.push({ id: feed.id, name: feed.name, ok: false, count: 0, error: String(st) });
    }
  });
  items.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
  const top = items.slice(0, CANDIDATE_TOP);
  await enrichWithFullText(top, {
    topN: FULLTEXT_TOP,
    concurrency: FULLTEXT_CONCURRENCY,
    timeout: FULLTEXT_TIMEOUT
  });
  const out = {
    updated: (/* @__PURE__ */ new Date()).toISOString(),
    count: top.length,
    sources,
    items: top.map(normalize)
  };
  const bodyText = JSON.stringify(out);
  try {
    await cache.put(
      cacheKey,
      new Response(bodyText, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${COMMUNITY_CACHE_SECONDS}`
        }
      })
    );
  } catch {
  }
  return out;
}

// shared/translate.js
var M2M = "@cf/meta/m2m100-1.2b";
var M2M_MAX = 1400;
var MYMEMORY_MAX = 480;
function makeTranslator(env = {}) {
  if (env && typeof env.AI === "object" && env.AI !== null) {
    return {
      name: "workers-ai",
      async translate(text, from = "en", to = "zh") {
        const src = String(text || "").trim();
        if (!src) return "";
        try {
          const result = await env.AI.run(M2M, {
            text: src.slice(0, M2M_MAX),
            source_lang: from,
            target_lang: to
          });
          const out = result?.translated_text || result?.text || "";
          return String(out).trim();
        } catch (err) {
          console.warn("[pulsedeck] AI \u7FFB\u8BD1\u5931\u8D25:", err?.message || err);
          return "";
        }
      }
    };
  }
  const memKey = typeof process !== "undefined" && process.env && process.env.MYMEMORY_KEY || "";
  return {
    name: "mymemory",
    async translate(text, from = "en", to = "zh") {
      const src = String(text || "").trim();
      if (!src) return "";
      const pair = `${from}|${to === "zh" ? "zh-CN" : to}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        src.slice(0, MYMEMORY_MAX)
      )}&langpair=${pair}${memKey ? `&key=${encodeURIComponent(memKey)}` : ""}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(6e3) : void 0
          });
          if (!res.ok) continue;
          const j = await res.json();
          const t = j?.responseData?.translatedText || "";
          if (/MYMEMORY WARNING/i.test(t)) return "";
          if (t) return String(t).trim();
        } catch {
        }
      }
      return "";
    }
  };
}

// shared/summarize.js
var SUMMARY_MODEL = "@cf/meta/llama-3.1-8b-instruct";
var SRC_MAX = 1600;
function localClean(str = "") {
  return String(str || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/&#\d+;/g, " ").replace(/\s+/g, " ").trim();
}
function makeSummarizer(env = {}, translator = null) {
  if (env && typeof env.AI === "object" && env.AI !== null) {
    return {
      name: "workers-ai",
      async summarizeItem(it, to = "zh") {
        const langName = to === "zh" ? "\u4E2D\u6587" : to;
        if (it.lang === "zh") {
          it.digest = it.summary || it.title;
          return;
        }
        const src = `${it.title}
${it.summary || ""}`.slice(0, SRC_MAX).trim();
        if (!src) {
          it.digest = it.title;
          return;
        }
        try {
          const out = await env.AI.run(SUMMARY_MODEL, {
            messages: [
              {
                role: "system",
                content: `\u4F60\u662F\u4E00\u4E2A\u8D44\u6DF1\u65B0\u95FB\u7F16\u8F91\u3002\u8BF7\u7528${langName}\u628A\u4E0B\u9762\u8FD9\u6761\u65B0\u95FB\u51DD\u7EC3\u6210\u4E00\u6BB5\u8FDE\u8D2F\u7684\u6458\u8981\uFF0C\u957F\u5EA6 60-180 \u5B57\uFF0C\u4FDD\u7559\u5173\u952E\u4E8B\u5B9E\uFF08\u8C01\u3001\u505A\u4E86\u4EC0\u4E48\u3001\u4E3A\u4F55\u91CD\u8981\uFF09\uFF0C\u4E0D\u8981\u5217\u8868\u3001\u4E0D\u8981\u8BC4\u8BBA\u3001\u4E0D\u8981\u91CD\u590D\u6807\u9898\uFF0C\u53EA\u8F93\u51FA\u6458\u8981\u672C\u8EAB\u3002`
              },
              { role: "user", content: src }
            ],
            max_tokens: 240,
            temperature: 0.3
          });
          const t = out?.text || out?.response || out?.result || "";
          it.digest = String(t || "").trim() || it.summaryZh || it.summary || it.title;
        } catch (err) {
          console.warn("[pulsedeck] AI \u6458\u8981\u5931\u8D25:", err?.message || err);
          it.digest = it.summaryZh || it.summary || it.title;
        }
      }
    };
  }
  return {
    name: "local",
    async summarizeItem(it, to = "zh") {
      if (it.lang === "zh") {
        it.digest = localClean(it.summary) || it.title;
        return;
      }
      if (it.summaryZh) {
        it.digest = it.summaryZh;
        return;
      }
      if (translator && it.summary) {
        try {
          const zh = await translator.translate(localClean(it.summary).slice(0, 480), "en", to);
          if (zh) {
            it.digest = zh;
            return;
          }
        } catch {
        }
      }
      it.digest = localClean(it.summary) || it.title;
    }
  };
}

// shared/escape.js
function escapeXml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// shared/placeholder.js
function placeholderSVG(params = {}) {
  const index = Number(params.i) || 0;
  const title = String(params.t || "").slice(0, 60);
  const source = String(params.s || "").slice(0, 24);
  const palettes = [
    ["#6366f1", "#8b5cf6"],
    ["#0ea5e9", "#22d3ee"],
    ["#f97316", "#f43f5e"],
    ["#10b981", "#34d399"],
    ["#eab308", "#f97316"],
    ["#ec4899", "#8b5cf6"],
    ["#14b8a6", "#0ea5e9"],
    ["#f43f5e", "#f59e0b"]
  ];
  const [c1, c2] = palettes[Math.abs(index) % palettes.length];
  const lines = [];
  let buf = "";
  for (const ch of title) {
    buf += ch;
    const width = [...buf].reduce((n, c) => n + (/[\u4e00-\u9fa5]/.test(c) ? 2 : 1), 0);
    if (width >= 26) {
      lines.push(buf);
      buf = "";
    }
    if (lines.length >= 3) break;
  }
  if (buf && lines.length < 3) lines.push(buf);
  const text = lines.map((line, i) => `<text x="40" y="${150 + i * 42}" font-size="30" font-weight="600" fill="rgba(255,255,255,.94)">${escapeXml(line)}</text>`).join("");
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

// shared/sample-data.js
var MIN = 60 * 1e3;
var HOUR = 60 * MIN;
var RAW = [
  [
    "hackernews",
    "Show HN: \u6211\u7528 200 \u884C\u4EE3\u7801\u5199\u4E86\u4E00\u4E2A\u80FD\u8DD1\u5728\u8FB9\u7F18\u8282\u70B9\u7684\u5168\u6587\u68C0\u7D22\u5F15\u64CE",
    "\u5012\u6392\u7D22\u5F15\u5168\u90E8\u585E\u8FDB KV\uFF0C\u51B7\u542F\u52A8 8ms\uFF0C\u5355\u5B9E\u4F8B\u625B\u4F4F\u4E86\u6BCF\u5929 30 \u4E07\u6B21\u67E5\u8BE2\u3002\u4F5C\u8005\u8BE6\u7EC6\u8BB2\u4E86\u5206\u7247\u7B56\u7565\u548C\u4E3A\u4EC0\u4E48\u653E\u5F03\u4E86 SQLite FTS5\u3002",
    22,
    "ycombinator",
    ["Show HN", "Search"],
    false,
    412,
    186
  ],
  [
    "openai",
    "\u6211\u4EEC\u6B63\u5728\u628A\u63A8\u7406\u6A21\u578B\u7684\u4E0A\u4E0B\u6587\u7A97\u53E3\u6269\u5C55\u5230\u767E\u4E07\u7EA7 token",
    "\u65B0\u7684\u7A00\u758F\u6CE8\u610F\u529B\u5B9E\u73B0\u8BA9\u957F\u6587\u6863\u5904\u7406\u6210\u672C\u4E0B\u964D\u4E86\u7EA6 60%\uFF0C\u540C\u65F6\u5728 needle-in-haystack \u6D4B\u8BD5\u4E2D\u4FDD\u6301 99.2% \u7684\u53EC\u56DE\u7387\u3002\u5F00\u53D1\u8005\u53EF\u4EE5\u5728 API \u4E2D\u901A\u8FC7\u65B0\u53C2\u6570\u542F\u7528\u3002",
    48,
    "OpenAI",
    ["Research", "API"],
    true
  ],
  [
    "techcrunch",
    "AI \u82AF\u7247\u521D\u521B\u516C\u53F8\u5B8C\u6210 12 \u4EBF\u7F8E\u5143 C \u8F6E\u878D\u8D44\uFF0C\u4F30\u503C\u8FBE\u5230 85 \u4EBF\u7F8E\u5143",
    "\u672C\u8F6E\u7531\u4E3B\u6743\u57FA\u91D1\u9886\u6295\uFF0C\u8D44\u91D1\u5C06\u7528\u4E8E\u5EFA\u8BBE\u4E13\u7528\u63A8\u7406\u96C6\u7FA4\u3002\u516C\u53F8\u79F0\u5176\u82AF\u7247\u5728\u540C\u7B49\u529F\u8017\u4E0B\u63A8\u7406\u541E\u5410\u91CF\u662F\u4E3B\u6D41 GPU \u7684 3.4 \u500D\u3002",
    65,
    "TechCrunch",
    ["Funding", "Hardware"],
    true
  ],
  [
    "theverge",
    "\u8FD9\u5BB6\u516C\u53F8\u60F3\u7528\u4E00\u526F\u773C\u955C\u53D6\u4EE3\u4F60\u7684\u624B\u673A\uFF0C\u4F46\u5148\u5F97\u89E3\u51B3\u7EED\u822A\u95EE\u9898",
    "\u5B9E\u6D4B\u8FDE\u7EED\u4F7F\u7528 2 \u5C0F\u65F6 40 \u5206\u949F\u540E\u7535\u91CF\u8017\u5C3D\u3002\u663E\u793A\u6548\u679C\u786E\u5B9E\u60CA\u8273\uFF0C\u4EA4\u4E92\u903B\u8F91\u5374\u4ECD\u7136\u4F9D\u8D56\u624B\u673A\u7AEF\u914D\u5BF9\uFF0C\u72EC\u7ACB\u6027\u8FDC\u6CA1\u6709\u5BA3\u4F20\u4E2D\u90A3\u4E48\u5F3A\u3002",
    88,
    "The Verge",
    ["Wearables"],
    true
  ],
  [
    "jiqizhixin",
    "\u56FD\u4EA7\u5F00\u6E90\u5927\u6A21\u578B\u53D1\u5E03 720 \u4EBF\u53C2\u6570\u7248\u672C\uFF0C\u591A\u9879\u4E2D\u6587\u57FA\u51C6\u8D85\u8FC7\u95ED\u6E90\u5BF9\u624B",
    "\u6A21\u578B\u6743\u91CD\u3001\u8BAD\u7EC3\u4EE3\u7801\u4E0E\u90E8\u5206\u6570\u636E\u914D\u6BD4\u5168\u90E8\u5F00\u6E90\uFF0C\u91C7\u7528 Apache 2.0 \u534F\u8BAE\u3002\u56E2\u961F\u540C\u65F6\u653E\u51FA\u4E86 4bit \u91CF\u5316\u7248\uFF0C\u5355\u5F20 24G \u663E\u5361\u5373\u53EF\u672C\u5730\u63A8\u7406\u3002",
    95,
    "\u673A\u5668\u4E4B\u5FC3",
    ["\u5F00\u6E90", "\u5927\u6A21\u578B"],
    true
  ],
  [
    "arstechnica",
    "\u4E00\u4E2A\u5B58\u5728\u4E86 14 \u5E74\u7684 Linux \u5185\u6838\u7ADE\u6001\u6761\u4EF6\u7EC8\u4E8E\u88AB\u4FEE\u590D",
    "\u6F0F\u6D1E\u5141\u8BB8\u672C\u5730\u7528\u6237\u5728\u7279\u5B9A\u6587\u4EF6\u7CFB\u7EDF\u914D\u7F6E\u4E0B\u63D0\u6743\u3002\u8865\u4E01\u5DF2\u7ECF\u5408\u5E76\u8FDB\u4E3B\u7EBF\uFF0C\u5404\u5927\u53D1\u884C\u7248\u6B63\u5728\u56DE\u79FB\uFF0C\u5EFA\u8BAE\u5C3D\u5FEB\u66F4\u65B0\u3002",
    130,
    "Ars Technica",
    ["Security", "Linux"],
    false
  ],
  [
    "simonwillison",
    "\u7528 LLM \u505A\u4EE3\u7801\u5BA1\u67E5\uFF1A\u4E09\u4E2A\u6708\u5B9E\u8DF5\u540E\u6211\u6539\u6389\u7684\u4E94\u4E2A\u63D0\u793A\u8BCD\u4E60\u60EF",
    "\u6700\u5927\u7684\u6559\u8BAD\u662F\u4E0D\u8981\u8BA9\u6A21\u578B\u300C\u627E bug\u300D\uFF0C\u800C\u8981\u8BA9\u5B83\u300C\u89E3\u91CA\u8FD9\u6BB5\u4EE3\u7801\u5728\u4EC0\u4E48\u8F93\u5165\u4E0B\u4F1A\u51FA\u9519\u300D\u3002\u524D\u8005\u8F93\u51FA\u4E00\u5806\u566A\u97F3\uFF0C\u540E\u8005\u80FD\u547D\u4E2D\u771F\u95EE\u9898\u3002",
    145,
    "Simon Willison",
    ["LLM", "Engineering"],
    false
  ],
  [
    "googleai",
    "\u65B0\u4E00\u4EE3\u591A\u6A21\u6001\u6A21\u578B\u5728\u89C6\u9891\u7406\u89E3\u4E0A\u7684\u5173\u952E\u6539\u8FDB",
    "\u901A\u8FC7\u65F6\u5E8F\u538B\u7F29\u628A 1 \u5C0F\u65F6\u89C6\u9891\u538B\u5230 3 \u4E07 token\uFF0C\u957F\u89C6\u9891\u95EE\u7B54\u51C6\u786E\u7387\u63D0\u5347 18 \u4E2A\u767E\u5206\u70B9\u3002\u8BBA\u6587\u4E0E\u6A21\u578B\u5361\u5DF2\u540C\u6B65\u53D1\u5E03\u3002",
    165,
    "Google AI",
    ["Multimodal"],
    true
  ],
  [
    "sspai",
    "\u628A iPad \u771F\u6B63\u7528\u8D77\u6765\uFF1A\u6211\u7684\u4E00\u5957\u5B8C\u6574\u751F\u4EA7\u529B\u5DE5\u4F5C\u6D41",
    "\u4ECE\u5206\u5C4F\u3001\u5FEB\u6377\u6307\u4EE4\u5230\u5916\u63A5\u663E\u793A\u5668\u7684\u5B9E\u9645\u53D6\u820D\uFF0C\u4F5C\u8005\u7528\u4E86\u4E09\u4E2A\u6708\u66FF\u6362\u6389\u7B14\u8BB0\u672C\uFF0C\u4E5F\u5766\u767D\u8BF4\u4E86\u54EA\u4E9B\u573A\u666F\u4ECD\u7136\u5FC5\u987B\u56DE\u5230\u684C\u9762\u7AEF\u3002",
    190,
    "\u5C11\u6570\u6D3E",
    ["\u6548\u7387", "iPad"],
    true
  ],
  [
    "stratechery",
    "\u5E73\u53F0\u3001\u805A\u5408\u5668\u4E0E\u65B0\u4E00\u8F6E AI \u5206\u53D1\u4E4B\u6218",
    "\u5F53\u6A21\u578B\u80FD\u529B\u8D8B\u540C\uFF0C\u7ADE\u4E89\u7684\u5173\u952E\u5C31\u56DE\u5230\u4E86\u5206\u53D1\u5165\u53E3\u3002\u8C01\u638C\u63E1\u4E86\u9ED8\u8BA4\u5165\u53E3\uFF0C\u8C01\u5C31\u638C\u63E1\u4E86\u5B9A\u4EF7\u6743\u2014\u2014\u8FD9\u548C\u641C\u7D22\u65F6\u4EE3\u7684\u5267\u672C\u9AD8\u5EA6\u76F8\u4F3C\u3002",
    210,
    "Ben Thompson",
    ["Strategy"],
    false
  ],
  [
    "huggingface",
    "\u5982\u4F55\u5728\u6D88\u8D39\u7EA7\u663E\u5361\u4E0A\u5FAE\u8C03 70B \u6A21\u578B\uFF1AQLoRA \u5B9E\u6218\u6307\u5357",
    "\u5B8C\u6574\u811A\u672C + \u663E\u5B58\u5360\u7528\u5B9E\u6D4B\u8868\uFF0C24GB \u663E\u5B58\u53EF\u8DD1\uFF0C\u8BAD\u7EC3 3 \u5C0F\u65F6\u5373\u53EF\u8BA9\u6A21\u578B\u5B66\u4F1A\u7279\u5B9A\u9886\u57DF\u7684\u8F93\u51FA\u683C\u5F0F\u3002",
    240,
    "Hugging Face",
    ["Fine-tuning"],
    true
  ],
  [
    "techcrunch",
    "\u6B27\u76DF\u901A\u8FC7\u65B0\u89C4\uFF0C\u8981\u6C42\u5927\u578B\u5E73\u53F0\u516C\u5F00\u63A8\u8350\u7B97\u6CD5\u7684\u6838\u5FC3\u53C2\u6570",
    "\u65B0\u89C4\u5C06\u4E8E\u660E\u5E74\u4E00\u5B63\u5EA6\u751F\u6548\uFF0C\u8FDD\u89C4\u6700\u9AD8\u53EF\u5904\u5168\u7403\u8425\u6536 6% \u7684\u7F5A\u6B3E\u3002\u591A\u5BB6\u5E73\u53F0\u5DF2\u8868\u793A\u5C06\u5728\u6B27\u76DF\u5883\u5185\u63D0\u4F9B\u300C\u65F6\u95F4\u7EBF\u6392\u5E8F\u300D\u9009\u9879\u3002",
    265,
    "TechCrunch",
    ["Policy", "EU"],
    false
  ],
  [
    "bytebytego",
    "\u4E00\u5F20\u56FE\u8BB2\u6E05\u695A\uFF1A\u5206\u5E03\u5F0F\u7CFB\u7EDF\u91CC\u7684\u5E42\u7B49\u6027\u5230\u5E95\u8BE5\u600E\u4E48\u505A",
    "\u4ECE\u552F\u4E00\u8BF7\u6C42 ID\u3001\u72B6\u6001\u673A\u7EA6\u675F\u5230\u6570\u636E\u5E93\u552F\u4E00\u7D22\u5F15\u515C\u5E95\uFF0C\u4E09\u5C42\u9632\u7EBF\u5404\u81EA\u89E3\u51B3\u4EC0\u4E48\u95EE\u9898\uFF0C\u4EE5\u53CA\u4E3A\u4EC0\u4E48\u53EA\u505A\u5176\u4E2D\u4E00\u5C42\u5F80\u5F80\u4E0D\u591F\u3002",
    300,
    "ByteByteGo",
    ["System Design"],
    true
  ],
  [
    "mittr",
    "\u6570\u636E\u4E2D\u5FC3\u7684\u7535\u529B\u8D26\u5355\u6B63\u5728\u91CD\u5851\u7535\u7F51\u89C4\u5212",
    "\u51E0\u4E2A\u5DDE\u7684\u7535\u529B\u516C\u53F8\u5DF2\u7ECF\u5F00\u59CB\u4E3A AI \u6570\u636E\u4E2D\u5FC3\u5355\u72EC\u89C4\u5212\u8F93\u7535\u7EBF\u8DEF\uFF0C\u5C45\u6C11\u7535\u4EF7\u4E0A\u6DA8\u7684\u4E89\u8BAE\u968F\u4E4B\u800C\u6765\u3002",
    330,
    "MIT Tech Review",
    ["Energy"],
    true
  ],
  [
    "ruanyifeng",
    "\u79D1\u6280\u7231\u597D\u8005\u5468\u520A\uFF1A\u672C\u5468\u503C\u5F97\u5173\u6CE8\u7684 12 \u4E2A\u5DE5\u5177\u4E0E 5 \u7BC7\u957F\u6587",
    "\u5305\u62EC\u4E00\u4E2A\u628A\u547D\u4EE4\u884C\u8F93\u51FA\u8F6C\u6210 SVG \u52A8\u56FE\u7684\u5DE5\u5177\u3001\u4E00\u4EFD\u5173\u4E8E\u65F6\u533A\u5904\u7406\u7684\u8E29\u5751\u6E05\u5355\uFF0C\u4EE5\u53CA\u5173\u4E8E\u8FDC\u7A0B\u529E\u516C\u4E09\u5E74\u540E\u7684\u4E00\u4EFD\u957F\u671F\u89C2\u5BDF\u3002",
    360,
    "\u962E\u4E00\u5CF0",
    ["\u5468\u520A"],
    false
  ],
  [
    "github-blog",
    "Actions \u7F13\u5B58\u673A\u5236\u5347\u7EA7\uFF0C\u5927\u578B\u4ED3\u5E93\u6784\u5EFA\u65F6\u95F4\u5E73\u5747\u4E0B\u964D 40%",
    "\u65B0\u7684\u5206\u5C42\u7F13\u5B58\u652F\u6301\u8DE8\u5206\u652F\u590D\u7528\uFF0C\u5E76\u63D0\u4F9B\u4E86\u66F4\u7EC6\u7C92\u5EA6\u7684\u5931\u6548\u63A7\u5236\u3002\u8FC1\u79FB\u53EA\u9700\u8981\u6539\u52A8\u4E00\u884C\u914D\u7F6E\u3002",
    400,
    "GitHub",
    ["CI/CD"],
    false
  ],
  [
    "venturebeat",
    "\u4F01\u4E1A\u7EA7 AI \u843D\u5730\u8C03\u7814\uFF1A73% \u7684\u8BD5\u70B9\u9879\u76EE\u6CA1\u80FD\u8FDB\u5165\u751F\u4EA7",
    "\u53D7\u8BBF\u7684 400 \u5BB6\u4F01\u4E1A\u4E2D\uFF0C\u5361\u70B9\u4E3B\u8981\u5728\u6570\u636E\u6CBB\u7406\u548C\u8BC4\u4F30\u4F53\u7CFB\u7F3A\u5931\uFF0C\u800C\u4E0D\u662F\u6A21\u578B\u80FD\u529B\u672C\u8EAB\u3002",
    430,
    "VentureBeat",
    ["Enterprise"],
    true
  ],
  [
    "ifanr",
    "\u8FD9\u6B3E\u6298\u53E0\u5C4F\u628A\u539A\u5EA6\u505A\u5230\u4E86 8.9 \u6BEB\u7C73\uFF0C\u4EE3\u4EF7\u662F\u4EC0\u4E48",
    "\u4E3A\u4E86\u538B\u7F29\u94F0\u94FE\u7A7A\u95F4\uFF0C\u7535\u6C60\u5BB9\u91CF\u6BD4\u4E0A\u4EE3\u5C11\u4E86 400mAh\u3002\u5B9E\u9645\u4F53\u9A8C\u4E2D\u91CD\u5EA6\u4F7F\u7528\u4E00\u5929\u9700\u8981\u8865\u4E00\u6B21\u7535\u3002",
    470,
    "\u7231\u8303\u513F",
    ["\u786C\u4EF6"],
    true
  ],
  [
    "theverge",
    "\u6D41\u5A92\u4F53\u5E73\u53F0\u518D\u6B21\u6DA8\u4EF7\uFF0C\u8FD9\u6B21\u8FDE\u5E26\u5E74\u4ED8\u65B9\u6848\u4E00\u8D77",
    "\u6DA8\u5E45\u5728 12% \u5230 18% \u4E4B\u95F4\uFF0C\u5E7F\u544A\u7248\u4EF7\u683C\u4FDD\u6301\u4E0D\u53D8\u2014\u2014\u5E73\u53F0\u663E\u7136\u5E0C\u671B\u628A\u66F4\u591A\u7528\u6237\u63A8\u5411\u5E7F\u544A\u7248\u3002",
    520,
    "The Verge",
    ["Streaming"],
    false
  ],
  [
    "hackernews",
    "PostgreSQL 18 \u7684\u65B0\u7279\u6027\u91CC\uFF0C\u6700\u88AB\u4F4E\u4F30\u7684\u662F\u8FD9\u4E00\u4E2A",
    "\u5F02\u6B65 IO \u5E26\u6765\u7684\u987A\u5E8F\u626B\u63CF\u63D0\u901F\u5728\u5927\u8868\u5206\u6790\u573A\u666F\u4E0B\u975E\u5E38\u660E\u663E\uFF0C\u4F5C\u8005\u7ED9\u4E86\u4E00\u7EC4\u4ECE 4 \u5206\u949F\u964D\u5230 90 \u79D2\u7684\u5B9E\u6D4B\u6570\u636E\u3002",
    560,
    "ycombinator",
    ["Database"],
    false,
    288,
    94
  ],
  [
    "arstechnica",
    "\u5929\u6587\u5B66\u5BB6\u53D1\u73B0\u4E00\u9897\u8F68\u9053\u6781\u5176\u53CD\u5E38\u7684\u7CFB\u5916\u884C\u661F",
    "\u5B83\u7684\u516C\u8F6C\u8F68\u9053\u51E0\u4E4E\u4E0E\u6052\u661F\u81EA\u8F6C\u8F74\u5782\u76F4\uFF0C\u73B0\u6709\u7684\u884C\u661F\u5F62\u6210\u7406\u8BBA\u5F88\u96BE\u89E3\u91CA\u8FD9\u79CD\u6784\u578B\u3002",
    610,
    "Ars Technica",
    ["Science"],
    true
  ],
  [
    "openai",
    "\u5F00\u53D1\u8005\u5E73\u53F0\u66F4\u65B0\uFF1A\u66F4\u4FBF\u5B9C\u7684\u6279\u5904\u7406\u63A5\u53E3\u4E0E\u66F4\u7EC6\u7684\u7528\u91CF\u770B\u677F",
    "\u6279\u5904\u7406\u4EF7\u683C\u4E0B\u8C03 50%\uFF0C24 \u5C0F\u65F6\u5185\u8FD4\u56DE\u7ED3\u679C\u3002\u65B0\u7684\u7528\u91CF\u770B\u677F\u652F\u6301\u6309 API key \u7EF4\u5EA6\u62C6\u5206\u6210\u672C\u3002",
    680,
    "OpenAI",
    ["Platform"],
    false
  ],
  [
    "jiqizhixin",
    "\u5177\u8EAB\u667A\u80FD\u516C\u53F8\u53D1\u5E03\u5BB6\u5EAD\u573A\u666F\u6570\u636E\u96C6\uFF0C\u5305\u542B 12 \u4E07\u6761\u771F\u5B9E\u64CD\u4F5C\u8F68\u8FF9",
    "\u6570\u636E\u91C7\u96C6\u81EA 300 \u4E2A\u771F\u5B9E\u5BB6\u5EAD\uFF0C\u8986\u76D6\u6293\u53D6\u3001\u5F00\u5173\u3001\u6574\u7406\u7B49 48 \u7C7B\u4EFB\u52A1\uFF0C\u5DF2\u5F00\u653E\u5B66\u672F\u7533\u8BF7\u3002",
    720,
    "\u673A\u5668\u4E4B\u5FC3",
    ["\u5177\u8EAB\u667A\u80FD", "\u6570\u636E\u96C6"],
    true
  ],
  [
    "sspai",
    "\u4E00\u4EFD\u88AB\u4F4E\u4F30\u7684\u5907\u4EFD\u65B9\u6848\uFF1A3-2-1 \u539F\u5219\u5728\u4E2A\u4EBA\u573A\u666F\u4E0B\u7684\u6700\u7701\u94B1\u5B9E\u73B0",
    "\u672C\u5730 NAS + \u51B7\u5907\u786C\u76D8 + \u5BF9\u8C61\u5B58\u50A8\uFF0C\u5E74\u6210\u672C\u63A7\u5236\u5728 300 \u5143\u4EE5\u5185\uFF0C\u4F5C\u8005\u9644\u4E0A\u4E86\u5B8C\u6574\u7684\u81EA\u52A8\u5316\u811A\u672C\u3002",
    790,
    "\u5C11\u6570\u6D3E",
    ["\u5907\u4EFD"],
    false
  ],
  [
    "mittr",
    "\u57FA\u56E0\u7F16\u8F91\u7597\u6CD5\u83B7\u6279\u7528\u4E8E\u7B2C\u4E8C\u79CD\u9057\u4F20\u75C5",
    "\u5355\u6B21\u6CBB\u7597\u5B9A\u4EF7\u4ECD\u5728 200 \u4E07\u7F8E\u5143\u4EE5\u4E0A\uFF0C\u652F\u4ED8\u65B9\u5F0F\u7684\u521B\u65B0\u53EF\u80FD\u6BD4\u6280\u672F\u672C\u8EAB\u66F4\u51B3\u5B9A\u666E\u53CA\u901F\u5EA6\u3002",
    860,
    "MIT Tech Review",
    ["Biotech"],
    true
  ],
  [
    "techcrunch",
    "\u4E00\u5BB6\u505A AI \u5BA2\u670D\u7684\u516C\u53F8\u88AB\u6536\u8D2D\uFF0C\u4EF7\u683C\u662F\u5E74\u6536\u5165\u7684 11 \u500D",
    "\u6536\u8D2D\u65B9\u770B\u4E2D\u7684\u662F\u5176\u5728\u4FDD\u9669\u884C\u4E1A\u7684\u6DF1\u5EA6\u96C6\u6210\uFF0C\u800C\u975E\u6A21\u578B\u672C\u8EAB\u3002\u8FD9\u7B14\u4EA4\u6613\u53EF\u80FD\u6210\u4E3A\u5782\u76F4 AI \u5E94\u7528\u7684\u4F30\u503C\u951A\u70B9\u3002",
    930,
    "TechCrunch",
    ["M&A"],
    false
  ],
  [
    "simonwillison",
    "\u6211\u7ED9\u81EA\u5DF1\u7684\u535A\u5BA2\u52A0\u4E86\u4E00\u4E2A\u672C\u5730\u8FD0\u884C\u7684\u8BED\u4E49\u641C\u7D22\uFF0C\u5168\u8FC7\u7A0B\u8BB0\u5F55",
    "\u5D4C\u5165\u5411\u91CF\u5B58\u5728 SQLite \u91CC\uFF0C\u524D\u7AEF\u7528 WASM \u8DD1\u76F8\u4F3C\u5EA6\u8BA1\u7B97\uFF0C\u6574\u7AD9\u96F6\u540E\u7AEF\u4F9D\u8D56\uFF0C\u7D22\u5F15\u6587\u4EF6\u53EA\u6709 4MB\u3002",
    1010,
    "Simon Willison",
    ["SQLite", "Search"],
    false
  ],
  [
    "bytebytego",
    "\u4E3A\u4EC0\u4E48\u4F60\u7684\u9650\u6D41\u5668\u5728\u591A\u5B9E\u4F8B\u90E8\u7F72\u4E0B\u603B\u662F\u4E0D\u51C6",
    "\u672C\u5730\u8BA1\u6570\u5668\u5728 8 \u4E2A\u5B9E\u4F8B\u4E0B\u7684\u5B9E\u9645\u653E\u884C\u91CF\u53EF\u80FD\u662F\u914D\u7F6E\u503C\u7684 8 \u500D\uFF0C\u6587\u7AE0\u7ED9\u4E86\u4E09\u79CD\u4E00\u81F4\u6027\u65B9\u6848\u7684\u53D6\u820D\u5BF9\u6BD4\u3002",
    1120,
    "ByteByteGo",
    ["System Design"],
    true
  ],
  [
    "googleai",
    "\u5C0F\u6A21\u578B\u4E5F\u80FD\u505A\u597D\u5DE5\u5177\u8C03\u7528\uFF1A\u4E00\u4EFD\u84B8\u998F\u914D\u65B9",
    "\u7528 7B \u6A21\u578B\u8FBE\u5230\u63A5\u8FD1 70B \u7684\u5DE5\u5177\u8C03\u7528\u51C6\u786E\u7387\uFF0C\u5173\u952E\u5728\u4E8E\u5408\u6210\u6570\u636E\u91CC\u4FDD\u7559\u5931\u8D25\u6837\u4F8B\u3002",
    1250,
    "Google AI",
    ["Small Models"],
    false
  ],
  [
    "stratechery",
    "\u8BA2\u9605\u75B2\u52B3\u662F\u771F\u5B9E\u5B58\u5728\u7684\uFF0C\u4F46\u5B83\u4E0D\u4F1A\u6740\u6B7B\u8BA2\u9605\u5236",
    "\u771F\u6B63\u88AB\u6DD8\u6C70\u7684\u662F\u90A3\u4E9B\u65E0\u6CD5\u8BC1\u660E\u6301\u7EED\u4EF7\u503C\u7684\u4E2D\u95F4\u5C42\u4EA7\u54C1\uFF0C\u800C\u4E0D\u662F\u8BA2\u9605\u8FD9\u79CD\u5546\u4E1A\u6A21\u5F0F\u672C\u8EAB\u3002",
    1400,
    "Ben Thompson",
    ["Business"],
    false
  ]
];
var FEED_MAP = new Map(FEEDS.map((f) => [f.id, f]));
function placeholderImage(title, source, index) {
  const params = new URLSearchParams({
    i: String(index),
    t: title.slice(0, 40),
    s: source
  });
  return `/api/placeholder?${params.toString()}`;
}
function buildSampleItems(now = Date.now()) {
  return RAW.map((row, index) => {
    const [sourceId, title, summary, minutesAgo, author, tags, withImage, points = 0, comments = 0] = row;
    const feed = FEED_MAP.get(sourceId) || { id: sourceId, name: sourceId, category: "tech", lang: "zh", weight: 5 };
    const ts = now - minutesAgo * MIN;
    const link = `https://example.com/${feed.id}/${encodeURIComponent(title.slice(0, 24))}`;
    return {
      id: `${feed.id}:${normalizeLink(link)}`,
      title,
      link,
      source: feed.name,
      sourceId: feed.id,
      sourceHome: feed.home || "",
      category: feed.category,
      lang: feed.lang,
      author,
      published: new Date(ts).toISOString(),
      timestamp: ts,
      image: withImage ? placeholderImage(title, feed.name, index) : "",
      tags,
      points,
      comments,
      readMinutes: estimateReadMinutes(summary),
      // 修复：原先 summary + title.repeat(6) 导致估算偏长
      summary: summary.slice(0, 220),
      description: summary,
      weight: feed.weight ?? 5
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
}
function buildSampleData(now = Date.now()) {
  const items = buildSampleItems(now);
  const counts = /* @__PURE__ */ new Map();
  for (const it of items) counts.set(it.sourceId, (counts.get(it.sourceId) || 0) + 1);
  const sources = FEEDS.filter((f) => f.enabled).map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    lang: f.lang,
    home: f.home,
    ok: counts.has(f.id),
    count: counts.get(f.id) || 0,
    error: counts.has(f.id) ? void 0 : "\u6F14\u793A\u6570\u636E\u4E2D\u65E0\u6B64\u6E90"
  }));
  return {
    updated: new Date(now).toISOString(),
    count: items.length,
    demo: true,
    categories: CATEGORIES,
    sources,
    items
  };
}

// src/vercel-entry.js
var ENV = { AI: { async run() {
  return {};
} } };
var TRANSLATOR = makeTranslator(ENV);
var SUMMARIZER = makeSummarizer(ENV, TRANSLATOR);
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
  });
}
function svgResponse(svg) {
  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", ...CORS, "Cache-Control": "public, max-age=86400" }
  });
}
var server = {
  async handleNews(params) {
    const demo = params.get("demo") === "1" || params.get("demo") === "true";
    const community = params.get("community") === "1" || params.get("community") === "true";
    if (community) {
      const data2 = await aggregateCommunity({ demo });
      return json(data2);
    }
    if (demo) {
      const data2 = buildSampleData();
      return json(data2);
    }
    const data = await aggregate({});
    return json(data);
  },
  async handleFeeds() {
    return json({
      feeds: FEEDS,
      categories: CATEGORIES,
      count: FEEDS.length
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
        community: !!f.community
      })),
      count: FEEDS.length
    });
  },
  async handleTranslate(req) {
    try {
      const body = await req.json().catch(() => ({}));
      const text = String(body.text || "").slice(0, 5e3);
      const to = String(body.to || "zh").slice(0, 3);
      if (!text) return json({ ok: false, error: "empty text" }, 400);
      const out = await TRANSLATOR.translate(text, to);
      return json({ ok: true, text: out, to });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 500);
    }
  },
  async handleImg(params) {
    const w = Math.min(Math.max(Number(params.get("w")) || 600, 50), 2e3);
    const h = Math.min(Math.max(Number(params.get("h")) || 400, 50), 2e3);
    const t = (params.get("t") || "Pulsedeck").slice(0, 40);
    return svgResponse(placeholderSVG({ w, h, text: t }));
  },
  handleHealth() {
    return json({ ok: true, time: (/* @__PURE__ */ new Date()).toISOString(), feeds: FEEDS.length, live: true });
  }
};
function safeUrl(req) {
  const raw = req && (req.url || req.request && req.request.url) || "/";
  try {
    return raw.startsWith("http") ? new URL(raw) : new URL(raw, "http://localhost");
  } catch {
    return new URL("/", "http://localhost");
  }
}
function readNodeBody(req) {
  if (!req || req.method === "GET" || req.method === "HEAD") return Promise.resolve("");
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
async function handler(req, res) {
  const isNode = !!(res && typeof res.end === "function");
  let pathname, searchParams, method, bodyText = "";
  if (isNode) {
    const u = new URL(req.url || "/", "http://localhost");
    pathname = u.pathname;
    searchParams = u.searchParams;
    method = req.method || "GET";
  } else {
    const u = safeUrl(req);
    pathname = u.pathname;
    searchParams = u.searchParams;
    method = req.method || "GET";
  }
  const route = pathname.replace(/^\/api\//, "").split("/")[0];
  let result;
  try {
    switch (route) {
      case "news":
        result = await server.handleNews(searchParams);
        break;
      case "feeds":
        result = await server.handleFeeds();
        break;
      case "config":
        result = await server.handleConfig();
        break;
      case "translate":
        if (method === "OPTIONS") {
          result = new Response(null, { status: 204, headers: CORS });
          break;
        }
        if (isNode) bodyText = await readNodeBody(req);
        else bodyText = await req.text().catch(() => "");
        result = await server.handleTranslate({ json: async () => JSON.parse(bodyText || "{}"), method });
        break;
      case "img":
        result = await server.handleImg(searchParams);
        break;
      case "health":
        result = server.handleHealth();
        break;
      default:
        result = json({ ok: false, error: `unknown route: ${pathname}` }, 404);
    }
  } catch (e) {
    result = json(
      { ok: false, error: String(e && e.message || e), stack: String(e && e.stack || "").slice(0, 600) },
      500
    );
  }
  if (isNode) {
    const body = await result.text();
    res.statusCode = result.status;
    result.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(body));
  } else {
    return result;
  }
}
export const runtime = "nodejs";
export const maxDuration = 60;
export { handler as default };
