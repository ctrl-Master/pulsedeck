/**
 * Pulsedeck · XML 转义（唯一实现）
 * -------------------------------------------------------------
 * 原 worker/index.js 与 scripts/dev-server.js 各自抄了一份 escapeXml，
 * 与 shared/aggregate.js 的 escapeXml 同源三份。统一收口到这里。
 */

export function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
