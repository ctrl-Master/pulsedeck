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

// 与 worker/index.js 中 JSON_HEADERS 保持一致，仅用于自愈分支的 502 兜底头。
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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
  // Vercel 免费版 Edge Function 仅有 25s 硬上限。原代码在无 env.AI 时会降级到 MyMemory
  // 翻译，默认全源约 200 条英文 × 每条 2 次调用 ≈ 480 次 MyMemory 网络请求（还带重试），
  // 免费额度很快 429，叠加起来必然超时（实测 /api/news 返回 FUNCTION_INVOCATION_TIMEOUT）。
  //
  // Vercel 上并无 Workers AI 绑定，这里注入一个「即时空操作」的假 env.AI：
  //   - 让 makeTranslator / makeSummarizer 走 Workers AI 分支（该分支不发起 MyMemory 请求）；
  //   - 每次调用直接返回空，把那 ~480 次慢网络请求彻底消除。
  // 于是 /api/news 只剩 ~17 个 RSS 并行抓取（≤8s）+ 解析排序，稳稳在 25s 内完成。
  //
  // 代价：英文条目在 Vercel 上显示原文（不做中文翻译）——这本就是免费版 MyMemory 撑不住的功能。
  // 其余功能 / 格式 / 内容与原 Cloudflare 部署完全一致。
  const env = {
    AI: {
      async run() {
        return {};
      },
    },
  };
  // context 携带 waitUntil（Vercel Edge 支持），原 worker 通过可选链安全调用。
  const url = new URL(request.url);
  const isNews = url.pathname === '/api/news';
  const isFeeds = url.pathname === '/api/feeds';

  let res = await worker.fetch(request, env, context);

  // 空响应自愈：上游偶发把「空 200」写进边缘缓存后，非 fresh 请求会读到空体，
  // 且 Vercel CDN 会据此缓存空体长达 max-age。这里检测到空体即强制 fresh 重算，
  // 并把好数据写回 caches.default 与本次返回，使 CDN 也改写为好响应。
  if ((isNews || isFeeds) && res.status === 200) {
    const body = await res.text();
    let data = null;
    try { data = JSON.parse(body); } catch {}
    const isEmpty =
      !body ||
      (data && Array.isArray(data.items) && data.items.length === 0) ||
      (data && !('items' in data));

    if (isEmpty) {
      if (isNews) {
        // 新闻：空体多为上游偶发写入空缓存，强制 fresh 重算并刷新缓存。
        const fu = new URL(request.url);
        fu.searchParams.set('fresh', '1');
        const freshReq = new Request(fu.toString(), request);
        const freshRes = await worker.fetch(freshReq, env, context);
        const freshBody = await freshRes.text();
        if (freshBody) {
          try {
            const s = url.searchParams.get('sources') || 'default';
            const l = Math.min(Number(url.searchParams.get('limit')) || 200, 400);
            const ck = new Request(`https://pulsedeck.cache/news?s=${encodeURIComponent(s)}&l=${l}`);
            await caches.default.put(ck, new Response(freshBody, { headers: freshRes.headers }));
          } catch {}
          return new Response(freshBody, { status: 200, headers: freshRes.headers });
        }
        // fresh 也拿不到数据：返回 502 且不缓存，避免把空体固化进 CDN。
        return new Response(
          JSON.stringify({ error: 'empty aggregate', items: [], sources: [] }),
          { status: 502, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } }
        );
      }
      // 社区：全部源失败是真实状态（RSSHub 可能被边缘 IP 拦截），原样返回（模块已缓存）。
      return new Response(body, { status: 200, headers: res.headers });
    }
    // 非空：重新缓冲后返回，规避 clone() 在 edge 缓存写入时的竞态（防缓存空体）。
    return new Response(body, { status: 200, headers: res.headers });
  }

  return res;
}
