# Pulsedeck · 热点新闻聚合站

多源 RSS 文字新闻聚合，一份代码同时跑在 **本地 Node** 与 **Cloudflare Worker** 上。
手机 / 平板 / PC 全适配，内置 **六种阅读布局**随时切换。

> 与同目录的 `reelay`（视频聚合）是姊妹项目，架构一致、内容形态不同，可以同时部署、各绑一个子域名。

---

## 快速开始

```bash
cd pulsedeck
npm run dev              # http://localhost:5174
```

- 无任何 npm 依赖，Node 18+ 直接跑，不需要 `npm install`。
- `npm run dev:demo` → 跳过真实源，直接用离线演示数据，秒开。
- `node scripts/dev-server.js --port=8080` → 换端口。
- `npm test` → 解析器自测（24 项断言）。

**本地实测**：24 个源里默认开启 17 个，国内直连能通 12 个左右（TechCrunch、Ars Technica、The Verge、OpenAI、Google AI、MIT TR、Simon Willison、ByteByteGo、GitHub Blog、少数派、爱范儿、阮一峰），约 200 条。
Hacker News / Hugging Face / VentureBeat / Stratechery / 机器之心 本地直连常失败——**这是正常的**，部署到 Cloudflare 后由边缘节点抓取，成功率会显著提高。
若全部源都失败，界面会自动降级为演示数据，不会白屏。

---

## 六种布局

| 布局 | 快捷键 | 适合场景 |
|------|--------|----------|
| **卡片流 Cards** | `1` | 默认。缩略图优先，扫视效率最高 |
| **列表 List** | `2` | 信息密度最高，手机单手刷最舒服 |
| **杂志 Magazine** | `3` | 头条大图 + 三条次条 + 多栏快讯，像一份日报 |
| **看板 Board** | `4` | 按分类分栏并排，横向对比各领域动态 |
| **时间轴 Timeline** | `5` | 按天分组 + 时刻标注，追踪事件推进 |
| **阅读器 Reader** | `6` | 左索引右正文，PC 上连续阅读不用来回跳 |

其它快捷键：`/` 搜索、`R` 刷新、`T` 主题、`S` 设置、`J`/`K` 上下选中、`Enter` 打开、`Esc` 关闭。

**响应式策略**

| 断点 | 变化 |
|------|------|
| `>1800` | 卡片流列宽放大，看板可并排更多列 |
| `1280` | 杂志快讯栏 3 栏 → 2 栏，阅读器索引收窄 |
| `1080` | 杂志头条转为上下堆叠；阅读器由左右分栏改为上下堆叠 |
| `900` | 顶栏折行，分类与布局条分两行；卡片流两列；看板一列占 78vw |
| `720` | 手机模式：布局切换器移到**底部标签栏**；卡片流单列；弹窗改为**底部抽屉**；阅读器详情**全屏滑出**；看板整屏横滑吸附 |
| `380` | 隐藏排序下拉，进一步压缩顶栏 |

还处理了 `prefers-reduced-motion`（关闭动画）与打印样式。

---

## 功能

- **分类**：全部 / 综合科技 / AI 前沿 / 开发者 / 创投商业 / 中文源，带实时条数
- **排序**：最新优先 / 重点优先（新鲜度 + 源权重 + HN 热度加权）/ 按来源分组 / 最短读完
- **搜索**：标题、摘要、来源、作者、标签实时过滤
- **源开关**：右上角齿轮逐个勾选，显示每个源本次抓取的条数或失败状态
- **屏蔽关键词**：命中标题即隐藏，逗号分隔
- **已读标记**：点开过的自动置灰，可一键隐藏已读
- **收藏**：星标 + 「只看收藏」模式
- **阅读时长估算**：中文按字数、英文按词数
- **跨源去重**：同链接 / 同标题只保留权重最高的源那条
- **暗色 / 浅色主题**，首次跟随系统
- **紧凑密度**、**图片边缘代理**（图裂时开）、**无图模式**
- **导出聚合 RSS**：`/api/rss`，可导入任意阅读器
- 所有偏好存 localStorage；每 10 分钟自动刷新一次

---

## 目录结构

```
pulsedeck/
├─ shared/               # Worker 与本地服务共用（纯 Web 标准，零依赖）
│  ├─ feeds.js           # 24 个新闻源配置（分类 / 语言 / 权重 / 默认开关）
│  ├─ aggregate.js       # RSS + Atom + RDF 通用解析、配图提取、去重排序
│  └─ sample-data.js     # 离线演示数据（30 条）
├─ worker/index.js       # Cloudflare Worker 入口（API + 静态资源 + Cron 预热）
├─ public/               # 前端（无构建步骤，原生 ESM）
│  ├─ index.html
│  ├─ styles.css         # 六种布局 + 全部响应式断点
│  └─ app.js
├─ scripts/
│  ├─ dev-server.js      # 本地开发服务器（内存缓存 + 自动降级）
│  └─ test-parse.mjs     # 解析器自测
├─ wrangler.toml
└─ package.json
```

## API

| 路由 | 说明 |
|------|------|
| `GET /api/config` | 分类 + 源列表（不含 url，避免暴露源地址） |
| `GET /api/news?sources=a,b&limit=240` | 聚合结果；`sources=*` 取全部源，`fresh=1` 跳过缓存 |
| `GET /api/rss` | 把聚合结果再输出成一份 RSS |
| `GET /api/placeholder?i=&t=&s=` | 生成渐变 SVG 占位图 |
| `GET /api/img?u=<url>` | 图片边缘代理 |
| `GET /api/health` | 健康检查 |

---

## 部署到 Cloudflare

### 方案 A：单 Worker 带静态资源（推荐）

```bash
npx wrangler login
npx wrangler deploy
```

`wrangler.toml` 已配置 `[assets] directory = "./public"`，前端与 API 同域，`API_BASE` 保持空即可。
`[triggers] crons = ["*/20 * * * *"]` 每 20 分钟预热一次缓存。

### 方案 B：Pages 前端 + Worker API 分离

1. 注释掉 `wrangler.toml` 的 `[assets]` 段，`npx wrangler deploy` 只部署 API。
2. Cloudflare Dashboard → Pages → 连接仓库，构建命令留空，输出目录填 `public`。
3. 把 `public/app.js` 顶部的 `const API_BASE = ''` 改成 Worker 地址，例如
   `const API_BASE = 'https://pulsedeck.your-name.workers.dev'`。

### 绑定自己的域名

Workers & Pages → 项目 → **自定义域** → 添加 `news.你的域名.com`。
之后国内用户只访问你的域名，抓取全部发生在 Cloudflare 边缘节点，无需翻墙。

---

## 增删新闻源

编辑 `shared/feeds.js`：

```js
{
  id: 'my-blog',            // 唯一，别和现有的重
  name: '某某博客',
  category: 'dev',          // 必须是 CATEGORIES 里的 id
  url: 'https://example.com/feed',
  home: 'https://example.com',
  lang: 'zh',               // 'zh' | 'en'
  enabled: true,            // 是否默认开启
  weight: 7,                // 0-10，影响「重点优先」排序与去重时谁保留
}
```

- 改完执行 `npm test`，会校验分类合法性、id 唯一性与 URL 格式。
- 没有官方 RSS 的站点，可以先用 RSSHub 或 `rss-worker` 生成，再填进来。
- 增加分类时同步改 `CATEGORIES`，前端 tab 与看板分栏会自动跟上。
