/**
 * 轻量服务端会话管理（Vercel 个人站点访问控制）
 * -------------------------------------------------------------
 * - 最多允许 MAX_SESSIONS 个并发有效会话；第 4 人登录时，踢掉「最旧」的那个。
 * - 被踢的人：其 token 失效，下一次轮询 /api/auth 或内容请求返回 401 → 前端弹登录门。
 * - 凭证来自环境变量 SITE_USER / SITE_PASS，缺省 admin / admin123。
 *
 * 说明（务必知晓的边界）：
 *   Vercel Serverless 多实例时，每个实例各自持有一份 SESSIONS（非全局共享）。
 *   低流量通常命中同一 warm 实例，限制基本准确；若跨实例，可能出现「偶尔被请重登」，
 *   因为 token 由该实例不认识。需要严格全局统一计数，请改用 Vercel KV / Upstash Redis
 *   （把 SESSIONS 换成 KV 即可，接口不变）。
 */

const SESSIONS = new Map(); // token -> { createdAt, lastSeen }
const MAX_SESSIONS = 3;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

function creds() {
  const env = (typeof process !== 'undefined' && process.env) || {};
  return {
    user: env.SITE_USER || 'admin',
    pass: env.SITE_PASS || 'admin123',
  };
}

function genToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* ignore */
  }
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// 清理过期会话；超出上限则按 createdAt 踢最旧，保证最多 MAX_SESSIONS 个
function prune() {
  const now = Date.now();
  for (const [t, s] of SESSIONS) {
    if (now - s.createdAt > SESSION_TTL) SESSIONS.delete(t);
  }
  while (SESSIONS.size >= MAX_SESSIONS) {
    let oldest = null;
    for (const [t, s] of SESSIONS) {
      if (!oldest || s.createdAt < oldest[1].createdAt) oldest = [t, s];
    }
    if (!oldest) break;
    SESSIONS.delete(oldest[0]);
  }
}

/**
 * 登录：校验凭证，成功返回 token（已强制 ≤3 会话），失败返回 null。
 */
export function login(user, pass) {
  const c = creds();
  if (user !== c.user || pass !== c.pass) return null;
  prune();
  const token = genToken();
  SESSIONS.set(token, { createdAt: Date.now(), lastSeen: Date.now() });
  return token;
}

/**
 * 校验 token 是否有效（存在 + 未过期）。有效时顺手刷新 lastSeen。
 */
export function check(token) {
  if (!token) return false;
  const s = SESSIONS.get(token);
  if (!s) return false;
  if (Date.now() - s.createdAt > SESSION_TTL) {
    SESSIONS.delete(token);
    return false;
  }
  s.lastSeen = Date.now();
  return true;
}

export function sessionCount() {
  return SESSIONS.size;
}
