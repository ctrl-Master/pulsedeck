/**
 * Pulsedeck · Telegram 快讯聚合 · 独立 Vercel 函数
 * -------------------------------------------------------------
 * 专门承接 /api/telegram，使 Vercel Cron（vercel.json 中每小时触发）
 * 能精确定位到本函数，而非仅依赖 api/[...path].js 的 catch-all 兜底。
 * 逻辑与 src/vercel-entry.js 的 handleTelegram 保持一致，复用 shared/telegram.js。
 */
import { aggregateTelegram } from '../shared/telegram.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

function getHeader(req, isNode, name) {
  if (isNode) return (req && req.headers && req.headers[name.toLowerCase()]) || '';
  try {
    return (req && req.headers && req.headers.get(name)) || '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  const isNode = !!(res && typeof res.end === 'function');

  let searchParams, method;
  if (isNode) {
    const u = new URL(req.url || '/', 'http://localhost');
    searchParams = u.searchParams;
    method = req.method || 'GET';
  } else {
    const u = new URL(req.url || '/', 'http://localhost');
    searchParams = u.searchParams;
    method = req.method || 'GET';
  }

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const fresh = searchParams.get('fresh') === '1';
  const cron = searchParams.get('cron') === '1';

  // Vercel Cron 预热：校验 CRON_SECRET（支持 query ?secret= 或 Vercel 默认 Authorization: Bearer）
  if (cron) {
    const secret = (typeof process !== 'undefined' && process.env && process.env.CRON_SECRET) || '';
    if (secret) {
      const auth = getHeader(req, isNode, 'authorization') || '';
      const qSecret = searchParams.get('secret') || '';
      const ok = qSecret === secret || auth === `Bearer ${secret}`;
      if (!ok) return json({ ok: false, error: 'unauthorized' }, 401);
    }
    const data = await aggregateTelegram({ fresh: true });
    return json({ ok: true, count: data.items.length, sources: data.sources });
  }

  const data = await aggregateTelegram({ fresh });
  return json(data);
}

// 用 export const 形式声明，确保 Vercel 静态分析能识别运行时与超时配置。
export const runtime = 'nodejs';
export const maxDuration = 60;
