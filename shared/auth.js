/**
 * 轻量服务端会话管理（Vercel 个人站点访问控制）
 * -------------------------------------------------------------
 * 设计目标：修复「刷新几次就被请去重登」的问题。
 *
 * 关键改造（相对旧版「纯内存 token」）：
 *   1. 无状态签名 token：token = base64url(payload).HMAC-SHA256(payload)，
 *      payload 含 { u, ip, iat, exp }。校验只验签名 + 过期，不查服务端内存 →
 *      刷新命中任意 Vercel 实例都通过，不再因「实例不认识 token」而 401 重登。
 *   2. IP 检校：登录时按客户端 IP 去重——同一 IP 已有效会话则复用其 token，
 *      不新增会话、不累积，因此刷新 / 多开标签页都不会把自己挤下线。
 *   3. 并发上限：最多 MAX_SESSIONS 个「不同 IP」在线（即最多 3 人）；
 *      第 4 个 IP 登录时踢掉「最旧」的那个（腾位置），保持「超员踢人」语义。
 *
 * 边界说明（务必知晓）：
 *   - 校验无状态，因此「踢人」是软踢：被踢者的旧 token 仍签名有效，其客户端在
 *     当前实例可能仍可用，直到 token 过期或主动登出。要严格全局统一计数 + 硬踢，
 *     请把 SESSIONS 换成 Vercel KV / Upstash Redis（接口不变）。
 *   - 凭证来自环境变量 SITE_USER / SITE_PASS，缺省 admin / admin123。
 */

import crypto from 'node:crypto';

const SESSIONS = new Map(); // token -> { createdAt, lastSeen, ip, user }（仅用于 ≤3 计数 / 软踢，非校验依据）
const MAX_SESSIONS = 3;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

function creds() {
  const env = (typeof process !== 'undefined' && process.env) || {};
  return {
    user: env.SITE_USER || 'admin',
    pass: env.SITE_PASS || 'admin123',
  };
}

// 签名密钥：优先用 AUTH_SECRET，否则由 SITE_PASS 派生（改密码即让旧 token 失效）
function secret() {
  const env = (typeof process !== 'undefined' && process.env) || {};
  return env.AUTH_SECRET || 'pd-' + (env.SITE_PASS || 'admin123');
}

function b64url(s) {
  return Buffer.from(s).toString('base64url');
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

function makeToken(user, ip) {
  const payload = { u: user, ip, iat: Date.now(), exp: Date.now() + SESSION_TTL };
  const p = b64url(JSON.stringify(payload));
  return p + '.' + sign(p);
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  try {
    if (sign(p) !== s) return null; // 签名不符
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!payload || (payload.exp && Date.now() > payload.exp)) return null; // 过期
    return payload;
  } catch {
    return null;
  }
}

// 清理过期会话；超出上限则按 createdAt 踢最旧，保证最多 MAX_SESSIONS 个
function prune() {
  const now = Date.now();
  for (const [t, s] of SESSIONS) {
    if (now - s.createdAt > SESSION_TTL) SESSIONS.delete(t);
  }
  while (SESSIONS.size >= MAX_SESSIONS) {
    let oldestT = null;
    let oldestAt = Infinity;
    for (const [t, s] of SESSIONS) {
      if (s.createdAt < oldestAt) {
        oldestAt = s.createdAt;
        oldestT = t;
      }
    }
    if (!oldestT) break;
    SESSIONS.delete(oldestT);
  }
}

// 同 IP 已有一个有效会话则复用其 token（不新增会话）
function findSessionByIp(ip) {
  const now = Date.now();
  for (const [t, s] of SESSIONS) {
    if (s.ip === ip && now - s.createdAt < SESSION_TTL) return t;
  }
  return null;
}

/**
 * 登录：校验凭证，成功返回 token（IP 去重 + 强制 ≤3 不同 IP），失败返回 null。
 * @param {string} user
 * @param {string} pass
 * @param {string} ip 客户端 IP（用于 IP 检校 / 去重）
 */
export function login(user, pass, ip = '') {
  const c = creds();
  if (user !== c.user || pass !== c.pass) return null;

  // 同 IP 复用，避免刷新 / 多开产生新会话 → 不会被自己挤下线
  const existing = findSessionByIp(ip);
  if (existing) {
    const s = SESSIONS.get(existing);
    if (s) {
      s.lastSeen = Date.now();
      s.createdAt = Math.min(s.createdAt, Date.now());
    }
    return existing;
  }

  prune();
  // 已达上限（3 个不同 IP）：踢最旧腾位（软踢，保持「超员踢人」语义）
  if (SESSIONS.size >= MAX_SESSIONS) {
    let oldestT = null;
    let oldestAt = Infinity;
    for (const [t, s] of SESSIONS) {
      if (s.createdAt < oldestAt) {
        oldestAt = s.createdAt;
        oldestT = t;
      }
    }
    if (oldestT) SESSIONS.delete(oldestT);
  }

  const token = makeToken(user, ip);
  SESSIONS.set(token, { createdAt: Date.now(), lastSeen: Date.now(), ip, user });
  return token;
}

/**
 * 校验 token：无状态（验签名 + 过期），不依赖服务端内存 → 刷新跨实例不会 401。
 * @param {string} token
 * @param {string} _ip 预留（当前不强制 IP 绑定，避免移动网络切换导致误踢）
 */
export function check(token, _ip) {
  const payload = verifyToken(token);
  if (!payload) return false;
  const s = SESSIONS.get(token);
  if (s) s.lastSeen = Date.now();
  return true;
}

export function sessionCount() {
  return SESSIONS.size;
}
