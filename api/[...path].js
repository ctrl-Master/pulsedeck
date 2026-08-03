/**
 * Pulsedeck · Vercel 部署适配层（新增文件，原 worker 代码保持不变）
 * -------------------------------------------------------------
 * 作用：把 Cloudflare Worker 的 `export default { fetch }` 入口包成一个
 * Vercel Edge Function（文件名 [..path].js 即 Vercel 的 /api/* catch-all 路由），
 * 使同一份业务代码无需改动即可跑在 Vercel 上。
 *
 * - 原 worker/index.js、shared/*、public/* 等「内容 / 格式 / 功能」完全不动。
 * - env 留空 {}：原代码检测到无 env.AI 会自动降级到 MyMemory 翻译 / 本地摘要，
 *   与本地 Node 行为一致，无需任何密钥。
 * - 对 caches.default 做防御性垫片：Vercel Edge 若未提供则退化为内存缓存，
 *   保证不抛错（原代码用 ctx?.waitUntil?. 可选链，缺失也安全）。
 */

import worker from '../worker/index.js';

// Vercel Edge 上若没有 caches（极少数情况），给一个最小内存垫片，避免崩溃。
if (typeof caches === 'undefined' || !caches.default) {
  const store = new Map();
  globalThis.caches = {
    default: {
      async match(req) {
        const key = typeof req === 'string' ? req : req?.url;
        return store.get(key) || null;
      },
      async put(req, res) {
        const key = typeof req === 'string' ? req : req?.url;
        store.set(key, res);
      },
    },
  };
}

export const config = { runtime: 'edge' };

export default async function handler(request, context) {
  // env 留空：触发原代码的 MyMemory / 本地降级分支，无需 Workers AI 绑定。
  const env = {};
  // context 携带 waitUntil（Vercel Edge 支持），原 worker 通过可选链安全调用。
  return worker.fetch(request, env, context);
}
