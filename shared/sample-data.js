/**
 * Pulsedeck · 离线演示数据
 * -------------------------------------------------------------
 * 国内直连 techcrunch / openai 等源经常失败，
 * 本地开发时自动降级到这份数据，保证界面永远有内容可看、可调样式。
 * 部署到 Cloudflare 后由边缘节点抓取真实源，不会用到这里。
 */

import { FEEDS, CATEGORIES } from './feeds.js';
import { estimateReadMinutes, normalizeLink } from './aggregate.js';
import { placeholderSVG } from './placeholder.js';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** [源id, 标题, 摘要, 距今分钟数, 作者, 标签, 是否配图, points, comments] */
const RAW = [
  ['hackernews', 'Show HN: 我用 200 行代码写了一个能跑在边缘节点的全文检索引擎',
    '倒排索引全部塞进 KV，冷启动 8ms，单实例扛住了每天 30 万次查询。作者详细讲了分片策略和为什么放弃了 SQLite FTS5。', 22,
    'ycombinator', ['Show HN', 'Search'], false, 412, 186],
  ['openai', '我们正在把推理模型的上下文窗口扩展到百万级 token',
    '新的稀疏注意力实现让长文档处理成本下降了约 60%，同时在 needle-in-haystack 测试中保持 99.2% 的召回率。开发者可以在 API 中通过新参数启用。', 48,
    'OpenAI', ['Research', 'API'], true],
  ['techcrunch', 'AI 芯片初创公司完成 12 亿美元 C 轮融资，估值达到 85 亿美元',
    '本轮由主权基金领投，资金将用于建设专用推理集群。公司称其芯片在同等功耗下推理吞吐量是主流 GPU 的 3.4 倍。', 65,
    'TechCrunch', ['Funding', 'Hardware'], true],
  ['theverge', '这家公司想用一副眼镜取代你的手机，但先得解决续航问题',
    '实测连续使用 2 小时 40 分钟后电量耗尽。显示效果确实惊艳，交互逻辑却仍然依赖手机端配对，独立性远没有宣传中那么强。', 88,
    'The Verge', ['Wearables'], true],
  ['jiqizhixin', '国产开源大模型发布 720 亿参数版本，多项中文基准超过闭源对手',
    '模型权重、训练代码与部分数据配比全部开源，采用 Apache 2.0 协议。团队同时放出了 4bit 量化版，单张 24G 显卡即可本地推理。', 95,
    '机器之心', ['开源', '大模型'], true],
  ['arstechnica', '一个存在了 14 年的 Linux 内核竞态条件终于被修复',
    '漏洞允许本地用户在特定文件系统配置下提权。补丁已经合并进主线，各大发行版正在回移，建议尽快更新。', 130,
    'Ars Technica', ['Security', 'Linux'], false],
  ['simonwillison', '用 LLM 做代码审查：三个月实践后我改掉的五个提示词习惯',
    '最大的教训是不要让模型「找 bug」，而要让它「解释这段代码在什么输入下会出错」。前者输出一堆噪音，后者能命中真问题。', 145,
    'Simon Willison', ['LLM', 'Engineering'], false],
  ['googleai', '新一代多模态模型在视频理解上的关键改进',
    '通过时序压缩把 1 小时视频压到 3 万 token，长视频问答准确率提升 18 个百分点。论文与模型卡已同步发布。', 165,
    'Google AI', ['Multimodal'], true],
  ['sspai', '把 iPad 真正用起来：我的一套完整生产力工作流',
    '从分屏、快捷指令到外接显示器的实际取舍，作者用了三个月替换掉笔记本，也坦白说了哪些场景仍然必须回到桌面端。', 190,
    '少数派', ['效率', 'iPad'], true],
  ['stratechery', '平台、聚合器与新一轮 AI 分发之战',
    '当模型能力趋同，竞争的关键就回到了分发入口。谁掌握了默认入口，谁就掌握了定价权——这和搜索时代的剧本高度相似。', 210,
    'Ben Thompson', ['Strategy'], false],
  ['huggingface', '如何在消费级显卡上微调 70B 模型：QLoRA 实战指南',
    '完整脚本 + 显存占用实测表，24GB 显存可跑，训练 3 小时即可让模型学会特定领域的输出格式。', 240,
    'Hugging Face', ['Fine-tuning'], true],
  ['techcrunch', '欧盟通过新规，要求大型平台公开推荐算法的核心参数',
    '新规将于明年一季度生效，违规最高可处全球营收 6% 的罚款。多家平台已表示将在欧盟境内提供「时间线排序」选项。', 265,
    'TechCrunch', ['Policy', 'EU'], false],
  ['bytebytego', '一张图讲清楚：分布式系统里的幂等性到底该怎么做',
    '从唯一请求 ID、状态机约束到数据库唯一索引兜底，三层防线各自解决什么问题，以及为什么只做其中一层往往不够。', 300,
    'ByteByteGo', ['System Design'], true],
  ['mittr', '数据中心的电力账单正在重塑电网规划',
    '几个州的电力公司已经开始为 AI 数据中心单独规划输电线路，居民电价上涨的争议随之而来。', 330,
    'MIT Tech Review', ['Energy'], true],
  ['ruanyifeng', '科技爱好者周刊：本周值得关注的 12 个工具与 5 篇长文',
    '包括一个把命令行输出转成 SVG 动图的工具、一份关于时区处理的踩坑清单，以及关于远程办公三年后的一份长期观察。', 360,
    '阮一峰', ['周刊'], false],
  ['github-blog', 'Actions 缓存机制升级，大型仓库构建时间平均下降 40%',
    '新的分层缓存支持跨分支复用，并提供了更细粒度的失效控制。迁移只需要改动一行配置。', 400,
    'GitHub', ['CI/CD'], false],
  ['venturebeat', '企业级 AI 落地调研：73% 的试点项目没能进入生产',
    '受访的 400 家企业中，卡点主要在数据治理和评估体系缺失，而不是模型能力本身。', 430,
    'VentureBeat', ['Enterprise'], true],
  ['ifanr', '这款折叠屏把厚度做到了 8.9 毫米，代价是什么',
    '为了压缩铰链空间，电池容量比上代少了 400mAh。实际体验中重度使用一天需要补一次电。', 470,
    '爱范儿', ['硬件'], true],
  ['theverge', '流媒体平台再次涨价，这次连带年付方案一起',
    '涨幅在 12% 到 18% 之间，广告版价格保持不变——平台显然希望把更多用户推向广告版。', 520,
    'The Verge', ['Streaming'], false],
  ['hackernews', 'PostgreSQL 18 的新特性里，最被低估的是这一个',
    '异步 IO 带来的顺序扫描提速在大表分析场景下非常明显，作者给了一组从 4 分钟降到 90 秒的实测数据。', 560,
    'ycombinator', ['Database'], false, 288, 94],
  ['arstechnica', '天文学家发现一颗轨道极其反常的系外行星',
    '它的公转轨道几乎与恒星自转轴垂直，现有的行星形成理论很难解释这种构型。', 610,
    'Ars Technica', ['Science'], true],
  ['openai', '开发者平台更新：更便宜的批处理接口与更细的用量看板',
    '批处理价格下调 50%，24 小时内返回结果。新的用量看板支持按 API key 维度拆分成本。', 680,
    'OpenAI', ['Platform'], false],
  ['jiqizhixin', '具身智能公司发布家庭场景数据集，包含 12 万条真实操作轨迹',
    '数据采集自 300 个真实家庭，覆盖抓取、开关、整理等 48 类任务，已开放学术申请。', 720,
    '机器之心', ['具身智能', '数据集'], true],
  ['sspai', '一份被低估的备份方案：3-2-1 原则在个人场景下的最省钱实现',
    '本地 NAS + 冷备硬盘 + 对象存储，年成本控制在 300 元以内，作者附上了完整的自动化脚本。', 790,
    '少数派', ['备份'], false],
  ['mittr', '基因编辑疗法获批用于第二种遗传病',
    '单次治疗定价仍在 200 万美元以上，支付方式的创新可能比技术本身更决定普及速度。', 860,
    'MIT Tech Review', ['Biotech'], true],
  ['techcrunch', '一家做 AI 客服的公司被收购，价格是年收入的 11 倍',
    '收购方看中的是其在保险行业的深度集成，而非模型本身。这笔交易可能成为垂直 AI 应用的估值锚点。', 930,
    'TechCrunch', ['M&A'], false],
  ['simonwillison', '我给自己的博客加了一个本地运行的语义搜索，全过程记录',
    '嵌入向量存在 SQLite 里，前端用 WASM 跑相似度计算，整站零后端依赖，索引文件只有 4MB。', 1010,
    'Simon Willison', ['SQLite', 'Search'], false],
  ['bytebytego', '为什么你的限流器在多实例部署下总是不准',
    '本地计数器在 8 个实例下的实际放行量可能是配置值的 8 倍，文章给了三种一致性方案的取舍对比。', 1120,
    'ByteByteGo', ['System Design'], true],
  ['googleai', '小模型也能做好工具调用：一份蒸馏配方',
    '用 7B 模型达到接近 70B 的工具调用准确率，关键在于合成数据里保留失败样例。', 1250,
    'Google AI', ['Small Models'], false],
  ['stratechery', '订阅疲劳是真实存在的，但它不会杀死订阅制',
    '真正被淘汰的是那些无法证明持续价值的中间层产品，而不是订阅这种商业模式本身。', 1400,
    'Ben Thompson', ['Business'], false],
];

const FEED_MAP = new Map(FEEDS.map((f) => [f.id, f]));

/** 用一张 SVG 占位图代替真实图片（避免本地开发时外链图挂掉） */
function placeholderImage(title, source, index) {
  const params = new URLSearchParams({
    i: String(index),
    t: title.slice(0, 40),
    s: source,
  });
  return `/api/placeholder?${params.toString()}`;
}

export function buildSampleItems(now = Date.now()) {
  return RAW.map((row, index) => {
    const [sourceId, title, summary, minutesAgo, author, tags, withImage, points = 0, comments = 0] = row;
    const feed = FEED_MAP.get(sourceId) || { id: sourceId, name: sourceId, category: 'tech', lang: 'zh', weight: 5 };
    const ts = now - minutesAgo * MIN;
    const link = `https://example.com/${feed.id}/${encodeURIComponent(title.slice(0, 24))}`;

    return {
      id: `${feed.id}:${normalizeLink(link)}`,
      title,
      link,
      source: feed.name,
      sourceId: feed.id,
      sourceHome: feed.home || '',
      category: feed.category,
      lang: feed.lang,
      author,
      published: new Date(ts).toISOString(),
      timestamp: ts,
      image: withImage ? placeholderImage(title, feed.name, index) : '',
      tags,
      points,
      comments,
      readMinutes: estimateReadMinutes(summary), // 修复：原先 summary + title.repeat(6) 导致估算偏长
      summary: summary.slice(0, 220),
      description: summary,
      weight: feed.weight ?? 5,
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
}

export function buildSampleData(now = Date.now()) {
  const items = buildSampleItems(now);
  const counts = new Map();
  for (const it of items) counts.set(it.sourceId, (counts.get(it.sourceId) || 0) + 1);

  const sources = FEEDS.filter((f) => f.enabled).map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    lang: f.lang,
    home: f.home,
    ok: counts.has(f.id),
    count: counts.get(f.id) || 0,
    error: counts.has(f.id) ? undefined : '演示数据中无此源',
  }));

  return {
    updated: new Date(now).toISOString(),
    count: items.length,
    demo: true,
    categories: CATEGORIES,
    sources,
    items,
  };
}

export const SAMPLE_WINDOW_HOURS = 24;
export const SAMPLE_HOUR = HOUR;
