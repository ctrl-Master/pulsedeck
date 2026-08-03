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

- **翻译 / 摘要**：原代码检测到无 `env.AI` 会自动降级到 **MyMemory 免费接口 + 本地清洗摘要**（与本地 `npm run dev` 行为一致），无需任何密钥。如需更好的中文摘要，可后续接第三方翻译/LLM Key。
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
