# Pulsedeck · 热点新闻聚合站（重构版 v2）

多源 RSS 文字新闻聚合，一份代码同时跑在 **本地 Node** 与 **Cloudflare Worker** 与 **Vercel Edge** 上。
手机 / 平板 / PC 全适配，内置 **六种阅读布局**随时切换。

> 本目录 `pulsedeck.next/` 是对原 `pulsedeck/` 的**重构**，不改动原文件。功能与界面 100% 对齐，
> 主要修正了底层健壮性与代码重复问题。

---

## 快速开始

```bash
cd pulsedeck.next
npm run dev              # http://localhost:5174
```

- 无任何 npm 依赖，Node 18+ 直接跑，不需要 `npm install`。
- `npm run dev:demo` → 跳过真实源，直接用离线演示数据，秒开。
- `node scripts/dev-server.js --port=8080` → 换端口。
- `npm test` → 解析器自测（26 项断言）。

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

---

## 相对原版的重构点

| 问题 | 原版 | 重构版 |
|------|------|--------|
| XML 文本清洗重复实现 | `aggregate.js` 与 `community.js` 各抄一份（社区版还缺实体映射） | 统一到 `shared/xml.js`，两处都 import |
| `escapeXml` 三份拷贝 | `worker`、`dev-server`、隐含各一份 | 统一到 `shared/escape.js` |
| `placeholderSVG` 放错位置 | 定义在 `worker/index.js`，被 dev-server / 测试反向依赖 | 抽到 `shared/placeholder.js` |
| 本地 Node 跑 fetch 带 `cf` 选项报错 | 直接硬塞 `cf` 选项 | `fetchWithTimeout` 按运行环境判断，仅 Cloudflare 带 `cf`，Node 用 `AbortSignal.timeout` 兜底 |
| 排序权重来源不一致 | `hotScore` 用 `item.weight ?? 5`，而条目 weight 在聚合阶段才注入 | `parseFeed` 直接把 `feed.weight` 写入条目，前后端排序对齐 |
| 演示数据阅读时长偏长 | `estimateReadMinutes(summary + title.repeat(6))` | 改为只用 `summary`，估算合理 |
| 社区模式无兜底 | 真实源全失败时界面只剩一条提示 | `loadFeeds` 网络层失败时用示例数据兜底，不白屏 |
| `\p{P}` 兼容 | 古老引擎不支持会抛错 | `normalizeTitle` 加 try/catch 退化到标点集合 |
| 社区解析更弱 | 自定义 `decodeEntities` 漏大量实体 | 复用 `xml.js` 完整实体表 |

所有 API 路由、源配置、布局与样式均与原版一致，可直接套用原版 README 的部署/增源说明。

---

## 目录结构

```
pulsedeck.next/
├─ shared/
│  ├─ xml.js            # XML / 文本清洗（统一单例，取代重复实现）
│  ├─ escape.js         # XML 转义（统一单例）
│  ├─ placeholder.js     # 渐变占位图（从 worker 抽出）
│  ├─ feeds.js          # 新闻源配置
│  ├─ aggregate.js      # RSS/Atom/RDF 解析 + 聚合 + 去重排序
│  ├─ community.js      # 社区源聚合（复用 xml.js）
│  ├─ translate.js      # 翻译器工厂
│  ├─ summarize.js      # 摘要器工厂
│  └─ sample-data.js    # 离线演示数据
├─ worker/index.js      # Cloudflare Worker 入口
├─ api/[...path].js     # Vercel Edge 适配层
├─ public/              # 前端（无构建步骤，原生 ESM）
├─ scripts/
│  ├─ dev-server.js     # 本地开发服务器
│  └─ test-parse.mjs    # 解析器自测
├─ wrangler.toml
├─ vercel.json
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

## 部署

部署方式与原版完全一致（Cloudflare Worker 单 Worker 带资源、或 Pages + Worker 分离、或 Vercel）。
详见原版 `DEPLOY-VERCEL.md`，本版 `api/[...path].js` 与 `vercel.json` 已就位。
