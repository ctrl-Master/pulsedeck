/**
 * Pulsedeck · XML / 文本清洗工具（统一单例）
 * -------------------------------------------------------------
 * 原 aggregate.js 与 community.js 各自抄了一份 decodeEntities / cleanText /
 * extractTag，实现还不一致（社区版漏了大部分 HTML 实体映射）。
 * 这里收口成唯一实现，两个模块都从这里 import，避免「改一处忘一处」。
 */

/* HTML 命名实体 → 字符（覆盖 RSS/Atom 常见实体，含中文标点） */
export const ENTITIES = {
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
  '&middot;': '·',
  '&bull;': '•',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&deg;': '°',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&sect;': '§',
  '&para;': '¶',
  '&alpha;': 'α',
  '&beta;': 'β',
  '&gamma;': 'γ',
  '&delta;': 'δ',
  '&pi;': 'π',
  '&sigma;': 'σ',
  '&omega;': 'ω',
  '&lambda;': 'λ',
  '&mu;': 'μ',
  '&infin;': '∞',
  '&ne;': '≠',
  '&le;': '≤',
  '&ge;': '≥',
  '&larr;': '←',
  '&rarr;': '→',
  '&uarr;': '↑',
  '&darr;': '↓',
  '&harr;': '↔',
};

function safeCodePoint(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** 解码 XML/HTML 实体：十六进制、十进制、命名实体 */
export function decodeEntities(str = '') {
  return String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** 剥离 CDATA 包裹 */
export function stripCdata(str = '') {
  return String(str).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/** 去掉 script/style 与所有标签 */
export function stripTags(str = '') {
  return String(str)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/**
 * 清洗文本：先解 CDATA，再反复「解码实体 → 去标签」交替，直至稳定。
 * Atom 源的 HTML 内容常把标签实体转义成 &lt;p&gt;，必须交替处理才能清空。
 */
export function cleanText(str = '') {
  let s = stripCdata(String(str || ''));
  for (let i = 0; i < 4; i++) {
    const decoded = decodeEntities(s);
    const stripped = stripTags(decoded);
    if (stripped === s) break;
    s = stripped;
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** 取第一个匹配标签的 inner 文本（支持命名空间：content:encoded / dc:creator） */
export function tagText(xml = '', tag = '') {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? stripCdata(m[1]).trim() : '';
}

/** 取某标签的某个属性值，例如 attrOf(xml, 'media:thumbnail', 'url') */
export function attrOf(xml = '', tag = '', attr = '') {
  const re = new RegExp(`<${tag}(\\s[^>]*?)\\/?>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  const am = m[1].match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return am ? decodeEntities(am[1]) : '';
}

/** 兼容 RSS 的 <link>text</link> 与 Atom 的 <link rel href/> */
export function linkOf(xml = '') {
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

/** 取标签内全部 inner 文本（支持命名空间，取所有匹配，而非仅第一个） */
export function allTagText(xml = '', tag = '') {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  return [...xml.matchAll(re)].map((m) => cleanText(m[1])).filter(Boolean);
}

/** 取标签所有属性值（用于多 link / 多 category 取值） */
export function attrOfAll(xml = '', tag = '', attr = '') {
  const re = new RegExp(`<${tag}(\\s[^>]*?)\\/?>`, 'gi');
  const out = [];
  for (const m of xml.matchAll(re)) {
    const am = m[1].match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (am) out.push(decodeEntities(am[1]));
  }
  return out;
}
