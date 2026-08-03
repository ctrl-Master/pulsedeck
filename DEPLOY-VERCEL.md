# Pulsedeck · 部署到 Vercel

本目录在保留 **全部原有文件（内容 / 格式 / 功能未改动）** 的前提下，新增了 Vercel 部署支持：

| 新增文件 | 作用 |
|----------|------|
| `vercel.json` | 声明无构建、静态目录为 `public` |
| `api/[[...path]].js` | Vercel Edge Function，把原 `worker/index.js` 的 `fetch` 入口包一层 |
| `DEPLOY-VERCEL.md` | 本说明（README.md 未改动） |

原 `worker/index.js`、`shared/*`、`public/*`、`wrangler.toml`、`package.json` 等**全部原样保留**，Cloudflare 部署方式依旧可用。

---

## 部署步骤

### 方式一：Vercel Dashboard（推荐）
1. 登录 [vercel.com](https://vercel.com) → **Add New → Project** → 导入本仓库。
2. 框架预设选 **Other**，Build Command 留空，Output Directory 填 `public`。
3. 点 **Deploy**。完成后访问分配的 `*.vercel.app` 域名即可。

### 方式二：Vercel CLI
```bash
npm i -g vercel
vercel            # 按提示登录并部署
vercel --prod     # 生产环境
```

---

## 行为差异（与原 Cloudflare 部署相比）

保持**完全一致的功能与界面**，仅后端运行环境不同：

- **翻译 / 摘要（Vercel 上已禁用）**：原代码在无 `env.AI` 时会降级到 MyMemory 免费接口，但默认全源约 200 条英文 × 2 次调用 ≈ **480 次 MyMemory 网络请求**，免费额度很快 429，叠加起来会超出 Vercel 免费版 Edge Function 的 **25 秒硬上限**（实测 `/api/news` 返回 `FUNCTION_INVOCATION_TIMEOUT`，页面因此「能打开却没数据」）。适配层因此注入一个即时空操作的假 `env.AI`，让翻译/摘要在 Vercel 上走 Workers AI 分支（不发 MyMemory 请求、调用直接返回），彻底消除那 480 次慢请求。代价：**英文条目在 Vercel 上显示原文（不做中文翻译）**，其余功能/格式/内容不变。若要坚持中文翻译，请改用 Cloudflare Workers（天然带 Workers AI），或在 Vercel 上接入真实翻译后端并自行放宽超时。
- **缓存**：`/api/news` 的 5 分钟边缘缓存退化为函数实例内的内存缓存（Vercel Edge 未提供 `caches.default` 时自动垫片），功能不受影响。
- **图片代理 `/api/img`**：照常工作（Vercel 函数有出网能力）。
- **静态资源**：由 Vercel 直接托管 `public/`，同源无跨域问题，`API_BASE` 保持为空即可。

---

## 可选增强

### 预热缓存（对应原 `wrangler.toml` 的 cron）
原 Cloudflare 每 20 分钟预热一次。Vercel 用 Cron Jobs 实现，在 `vercel.json` 加：

```json
"crons": [
  { "path": "/api/news?fresh=1", "schedule": "*/20 * * * *" }
]
```

> 注意：Vercel 免费/Hobby 计划的 cron 最小间隔可能受限（按套餐），若部署报错请把频率放宽到 `0 * * * *`（每小时）或按需调整。不加也不影响正常运行，只是少了预热缓存。

### 自定义域名
Vercel 项目 → **Settings → Domains** 绑定自己的域名即可。

### 提升翻译额度（可选）
在 Vercel 项目 **Settings → Environment Variables** 加入 `MYMEMORY_KEY`（MyMemory 免费注册获取），日翻译额度从 ~5000 词提升到 ~50000 词。不填也能跑。
