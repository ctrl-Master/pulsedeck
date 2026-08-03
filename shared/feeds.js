/**
 * Pulsedeck · 新闻源配置
 * -------------------------------------------------------------
 * 只用纯数据，Worker 与本地服务共用。
 * 增删源：直接改 FEEDS 数组即可，前端会自动出现对应开关。
 *
 * 字段说明：
 *   id        唯一标识（也用于 localStorage 记住开关状态）
 *   name      显示名
 *   category  归属分类，必须是 CATEGORIES 里的 id
 *   url       RSS / Atom 地址
 *   home      站点主页（用于取 favicon）
 *   lang      'en' | 'zh'，前端会给英文源标记
 *   enabled   默认是否开启
 *   weight    权重，影响「重点优先」排序（0-10，越大越靠前）
 */

export const CATEGORIES = [
  { id: 'all', name: 'All', short: 'All' },
  { id: 'tech', name: 'Tech', short: 'Tech' },
  { id: 'ai', name: 'AI', short: 'AI' },
  { id: 'dev', name: 'Developer', short: 'Dev' },
  { id: 'business', name: 'Business', short: 'Biz' },
  { id: 'cn', name: 'Chinese', short: '中文' },
];

export const FEEDS = [
  /* ---------------- 综合科技 ---------------- */
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    category: 'tech',
    url: 'https://techcrunch.com/feed/',
    home: 'https://techcrunch.com',
    lang: 'en',
    enabled: true,
    weight: 9,
  },
  {
    id: 'arstechnica',
    name: 'Ars Technica',
    category: 'tech',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    home: 'https://arstechnica.com',
    lang: 'en',
    enabled: true,
    weight: 8,
  },
  {
    id: 'theverge',
    name: 'The Verge',
    category: 'tech',
    url: 'https://www.theverge.com/rss/index.xml',
    home: 'https://www.theverge.com',
    lang: 'en',
    enabled: true,
    weight: 8,
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    category: 'tech',
    url: 'https://hnrss.org/frontpage?points=100',
    home: 'https://news.ycombinator.com',
    lang: 'en',
    enabled: true,
    weight: 10,
  },
  {
    id: 'wired',
    name: 'Wired',
    category: 'tech',
    url: 'https://www.wired.com/feed/rss',
    home: 'https://www.wired.com',
    lang: 'en',
    enabled: true,
    weight: 8,
  },
  {
    id: 'bbc-tech',
    name: 'BBC Technology',
    category: 'tech',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    home: 'https://www.bbc.com/technology',
    lang: 'en',
    enabled: true,
    weight: 7,
  },
  {
    id: 'engadget',
    name: 'Engadget',
    category: 'tech',
    url: 'https://www.engadget.com/rss.xml',
    home: 'https://www.engadget.com',
    lang: 'en',
    enabled: false,
    weight: 5,
  },

  /* ---------------- AI 前沿 ---------------- */
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    url: 'https://openai.com/news/rss.xml',
    home: 'https://openai.com',
    lang: 'en',
    enabled: true,
    weight: 10,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    category: 'ai',
    url: 'https://huggingface.co/blog/feed.xml',
    home: 'https://huggingface.co',
    lang: 'en',
    enabled: true,
    weight: 7,
  },
  {
    id: 'googleai',
    name: 'Google AI',
    category: 'ai',
    url: 'https://blog.google/technology/ai/rss/',
    home: 'https://blog.google',
    lang: 'en',
    enabled: true,
    weight: 8,
  },
  {
    id: 'mittr',
    name: 'MIT Tech Review',
    category: 'ai',
    url: 'https://www.technologyreview.com/feed/',
    home: 'https://www.technologyreview.com',
    lang: 'en',
    enabled: true,
    weight: 7,
  },
  {
    id: 'arxiv-ai',
    name: 'arXiv cs.AI',
    category: 'ai',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    home: 'https://arxiv.org',
    lang: 'en',
    enabled: false,
    weight: 4,
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    category: 'ai',
    url: 'https://deepmind.google/blog/rss.xml',
    home: 'https://deepmind.google',
    lang: 'en',
    enabled: false,
    weight: 7,
  },
  {
    id: 'nvidia-blog',
    name: 'NVIDIA Blog',
    category: 'ai',
    url: 'https://blogs.nvidia.com/feed/',
    home: 'https://blogs.nvidia.com',
    lang: 'en',
    enabled: false,
    weight: 7,
  },
  {
    id: 'the-decoder',
    name: 'The Decoder',
    category: 'ai',
    url: 'https://the-decoder.com/feed/',
    home: 'https://the-decoder.com',
    lang: 'en',
    enabled: false,
    weight: 6,
  },

  /* ---------------- 开发者 ---------------- */
  {
    id: 'simonwillison',
    name: "Simon Willison",
    category: 'dev',
    url: 'https://simonwillison.net/atom/everything/',
    home: 'https://simonwillison.net',
    lang: 'en',
    enabled: true,
    weight: 8,
  },
  {
    id: 'bytebytego',
    name: 'ByteByteGo',
    category: 'dev',
    url: 'https://blog.bytebytego.com/feed',
    home: 'https://blog.bytebytego.com',
    lang: 'en',
    enabled: true,
    weight: 6,
  },
  {
    id: 'github-blog',
    name: 'GitHub Blog',
    category: 'dev',
    url: 'https://github.blog/feed/',
    home: 'https://github.blog',
    lang: 'en',
    enabled: true,
    weight: 6,
  },
  {
    id: 'cloudflare-blog',
    name: 'Cloudflare Blog',
    category: 'dev',
    url: 'https://blog.cloudflare.com/rss/',
    home: 'https://blog.cloudflare.com',
    lang: 'en',
    enabled: false,
    weight: 6,
  },
  {
    id: 'aws-blog',
    name: 'AWS Blog',
    category: 'dev',
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    home: 'https://aws.amazon.com/blogs/aws/',
    lang: 'en',
    enabled: false,
    weight: 6,
  },
  {
    id: 'kubernetes-blog',
    name: 'Kubernetes Blog',
    category: 'dev',
    url: 'https://kubernetes.io/feed.xml',
    home: 'https://kubernetes.io/blog/',
    lang: 'en',
    enabled: false,
    weight: 6,
  },

  /* ---------------- 创投商业 ---------------- */
  {
    id: 'venturebeat',
    name: 'VentureBeat',
    category: 'business',
    url: 'https://feeds.feedburner.com/venturebeat/SZYF',
    home: 'https://venturebeat.com',
    lang: 'en',
    enabled: true,
    weight: 6,
  },
  {
    id: 'stratechery',
    name: 'Stratechery',
    category: 'business',
    url: 'https://stratechery.com/feed/',
    home: 'https://stratechery.com',
    lang: 'en',
    enabled: true,
    weight: 8,
  },
  {
    id: 'benevans',
    name: 'Benedict Evans',
    category: 'business',
    url: 'https://www.ben-evans.com/benedictevans?format=rss',
    home: 'https://www.ben-evans.com',
    lang: 'en',
    enabled: false,
    weight: 6,
  },
  {
    id: 'yc-blog',
    name: 'Y Combinator',
    category: 'business',
    url: 'https://www.ycombinator.com/blog/rss.xml',
    home: 'https://www.ycombinator.com/blog',
    lang: 'en',
    enabled: false,
    weight: 7,
  },

  /* ---------------- 中文源 ---------------- */
  {
    id: 'sspai',
    name: '少数派',
    category: 'cn',
    url: 'https://sspai.com/feed',
    home: 'https://sspai.com',
    lang: 'zh',
    enabled: true,
    weight: 7,
  },
  {
    id: 'ifanr',
    name: '爱范儿',
    category: 'cn',
    url: 'https://www.ifanr.com/feed',
    home: 'https://www.ifanr.com',
    lang: 'zh',
    enabled: true,
    weight: 6,
  },
  {
    id: 'jiqizhixin',
    name: '机器之心',
    category: 'cn',
    url: 'https://www.jiqizhixin.com/rss',
    home: 'https://www.jiqizhixin.com',
    lang: 'zh',
    enabled: true,
    weight: 8,
  },
  {
    id: 'ruanyifeng',
    name: '阮一峰的网络日志',
    category: 'cn',
    url: 'https://www.ruanyifeng.com/blog/atom.xml',
    home: 'https://www.ruanyifeng.com/blog/',
    lang: 'zh',
    enabled: true,
    weight: 7,
  },
  {
    id: 'infoq-cn',
    name: 'InfoQ 中文',
    category: 'cn',
    url: 'https://www.infoq.cn/feed',
    home: 'https://www.infoq.cn',
    lang: 'zh',
    enabled: false,
    weight: 5,
  },
  {
    id: 'huxiu',
    name: '虎嗅',
    category: 'cn',
    url: 'https://www.huxiu.com/rss/0.xml',
    home: 'https://www.huxiu.com',
    lang: 'zh',
    enabled: false,
    weight: 5,
  },
  {
    id: '36kr',
    name: '36氪',
    category: 'cn',
    url: 'https://36kr.com/feed',
    home: 'https://36kr.com',
    lang: 'zh',
    enabled: false,
    weight: 6,
  },
  {
    id: 'qbitai',
    name: '量子位',
    category: 'cn',
    url: 'https://www.qbitai.com/feed',
    home: 'https://www.qbitai.com',
    lang: 'zh',
    enabled: false,
    weight: 7,
  },
];

/** 默认开启的源 */
export const DEFAULT_FEEDS = FEEDS.filter((f) => f.enabled);

/**
 * 把 ?sources=a,b,c 解析成真正要抓的源列表
 *   - 空 / 未传   → 默认开启的源
 *   - '*'         → 全部源
 *   - 'a,b'       → 指定 id
 */
export function resolveFeeds(sourcesParam) {
  if (!sourcesParam) return DEFAULT_FEEDS;
  const raw = String(sourcesParam).trim();
  if (raw === '*' || raw === 'all') return FEEDS;
  const wanted = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const picked = FEEDS.filter((f) => wanted.has(f.id));
  return picked.length ? picked : DEFAULT_FEEDS;
}

/** 供前端使用的精简源信息 */
export function publicFeeds() {
  return FEEDS.map(({ id, name, category, lang, enabled, home, weight }) => ({
    id,
    name,
    category,
    lang,
    enabled,
    home,
    weight,
  }));
}
