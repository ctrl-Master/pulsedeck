/**
 * Pulsedeck · 解析器自测
 * 运行：node scripts/test-parse.mjs
 * 不依赖任何测试框架，失败会以非零退出码结束。
 */

import assert from 'node:assert/strict';
import { parseFeed, cleanText, decodeEntities, normalizeLink, estimateReadMinutes } from '../shared/aggregate.js';
import { FEEDS, CATEGORIES, resolveFeeds, publicFeeds } from '../shared/feeds.js';
import { buildSampleData } from '../shared/sample-data.js';
import { placeholderSVG } from '../shared/placeholder.js';

let pass = 0;
const cases = [];
function test(name, fn) {
  cases.push([name, fn]);
}

/* ------------------------- 测试夹具 ------------------------- */

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>Demo Tech</title>
  <item>
    <title><![CDATA[OpenAI &amp; friends ship a new model]]></title>
    <link>https://example.com/a?utm_source=rss&amp;utm_medium=feed#top</link>
    <pubDate>Sat, 01 Aug 2026 10:30:00 GMT</pubDate>
    <dc:creator>Jane Doe</dc:creator>
    <category>AI</category>
    <category>Research</category>
    <media:thumbnail url="https://img.example.com/hero.jpg"/>
    <description><![CDATA[<p>Some <b>HTML</b> summary with &quot;quotes&quot; and an <img src="https://img.example.com/inline.png"/>.</p>]]></description>
    <content:encoded><![CDATA[<p>${'word '.repeat(500)}</p>]]></content:encoded>
  </item>
  <item>
    <title>Second story without image</title>
    <guid isPermaLink="true">https://example.com/b</guid>
    <pubDate>Sat, 01 Aug 2026 08:00:00 GMT</pubDate>
    <description>Points: 321
#Comments: 88</description>
  </item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Demo Atom</title>
  <entry>
    <title type="html">Atom &#x4E2D;&#x6587; 标题</title>
    <link rel="alternate" href="https://atom.example.com/post-1"/>
    <published>2026-08-01T09:15:00Z</published>
    <author><name>阮某某</name></author>
    <summary>这是一段中文摘要，用来验证中文阅读时长估算是否正常工作。</summary>
  </entry>
</feed>`;

const FEED_META = { id: 'demo', name: 'Demo Tech', category: 'demo', lang: 'en', home: 'https://example.com', weight: 7 };

/* ------------------------- 用例 ------------------------- */

test('RSS：能解析出全部条目', () => {
  const items = parseFeed(RSS, FEED_META);
  assert.equal(items.length, 2);
});

test('RSS：CDATA 与 HTML 实体被正确还原', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.equal(first.title, 'OpenAI & friends ship a new model');
});

test('RSS：链接去掉了追踪参数与锚点', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.equal(normalizeLink(first.link), 'https://example.com/a');
});

test('RSS：pubDate 正确转成时间戳', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.equal(first.published, '2026-08-01T10:30:00.000Z');
  assert.ok(first.timestamp > 0);
});

test('RSS：dc:creator 作为作者', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.equal(first.author, 'Jane Doe');
});

test('RSS：media:thumbnail 优先作为配图', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.equal(first.image, 'https://img.example.com/hero.jpg');
});

test('RSS：category 被收集成 tags', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.deepEqual(first.tags, ['AI', 'Research']);
});

test('RSS：摘要已去标签、去实体', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.ok(first.summary.startsWith('Some HTML summary with "quotes"'));
  assert.ok(!first.summary.includes('<'));
});

test('RSS：content:encoded 参与阅读时长估算', () => {
  const [first] = parseFeed(RSS, FEED_META);
  assert.ok(first.readMinutes >= 2, `readMinutes=${first.readMinutes}`);
});

test('RSS：guid 可以兜底当链接', () => {
  const [, second] = parseFeed(RSS, FEED_META);
  assert.equal(second.link, 'https://example.com/b');
});

test('RSS：Hacker News 风格的 Points / Comments 被提取', () => {
  const [, second] = parseFeed(RSS, FEED_META);
  assert.equal(second.points, 321);
  assert.equal(second.comments, 88);
});

test('Atom：entry 与 rel=alternate 链接可解析', () => {
  const items = parseFeed(ATOM, { id: 'atom', name: 'Demo Atom', category: 'cn', lang: 'zh' });
  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://atom.example.com/post-1');
});

test('Atom：数字实体解码为中文', () => {
  const [item] = parseFeed(ATOM, { id: 'atom', name: 'Demo Atom', category: 'cn' });
  assert.equal(item.title, 'Atom 中文 标题');
});

test('Atom：author > name 被提取', () => {
  const [item] = parseFeed(ATOM, { id: 'atom', name: 'Demo Atom', category: 'cn' });
  assert.equal(item.author, '阮某某');
});

test('空输入不会抛异常', () => {
  assert.deepEqual(parseFeed('', FEED_META), []);
  assert.deepEqual(parseFeed(null, FEED_META), []);
  assert.deepEqual(parseFeed('<rss></rss>', FEED_META), []);
});

test('cleanText 会压缩空白并剥离 script', () => {
  assert.equal(cleanText('<script>bad()</script>  hello   world '), 'hello world');
});

test('decodeEntities 处理十六进制与十进制', () => {
  assert.equal(decodeEntities('&#x4F60;&#22909;'), '你好');
});

test('中文阅读时长按字数估算', () => {
  assert.equal(estimateReadMinutes('中'.repeat(800)), 2);
});

test('feeds：分类 id 全部合法', () => {
  const ids = new Set(CATEGORIES.map((c) => c.id));
  for (const f of FEEDS) assert.ok(ids.has(f.category), `${f.id} 的分类 ${f.category} 不在 CATEGORIES 里`);
});

test('feeds：id 唯一且 url 合法', () => {
  const seen = new Set();
  for (const f of FEEDS) {
    assert.ok(!seen.has(f.id), `重复的源 id: ${f.id}`);
    seen.add(f.id);
    assert.doesNotThrow(() => new URL(f.url), `非法 URL: ${f.url}`);
  }
});

test('resolveFeeds：* 取全部，逗号取指定，非法回退默认', () => {
  assert.equal(resolveFeeds('*').length, FEEDS.length);
  assert.equal(resolveFeeds('openai,techcrunch').length, 2);
  assert.ok(resolveFeeds('不存在的源').length > 0);
});

test('publicFeeds 不泄漏 url 字段', () => {
  assert.ok(publicFeeds().every((f) => !('url' in f)));
});

test('演示数据结构完整且按时间倒序', () => {
  const data = buildSampleData();
  assert.ok(data.items.length >= 20);
  assert.equal(data.demo, true);
  for (let i = 1; i < data.items.length; i++) {
    assert.ok(data.items[i - 1].timestamp >= data.items[i].timestamp, '演示数据未按时间倒序');
  }
  for (const it of data.items) {
    assert.ok(it.id && it.title && it.link && it.source && it.category);
  }
});

test('占位图返回合法 SVG', () => {
  const svg = placeholderSVG({ i: 3, t: '一个比较长的中文标题用来测试换行逻辑是否正常', s: 'TechCrunch' });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('</svg>'));
  assert.ok(svg.includes('TECHCRUNCH'));
});

/* ------------------------- 执行 ------------------------- */

console.log('\n  Pulsedeck 解析器自测\n');
let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}
console.log(`\n  ${pass} 通过 / ${cases.length} 项${failed ? `，${failed} 失败` : ''}\n`);
process.exit(failed ? 1 : 0);
