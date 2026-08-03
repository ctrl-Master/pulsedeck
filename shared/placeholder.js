/**
 * Pulsedeck · 渐变占位图生成器（唯一实现）
 * -------------------------------------------------------------
 * 原代码把 placeholderSVG 放在 worker/index.js 里，结果 dev-server.js 和
 * test-parse.mjs 都要 import 整个 Worker 才能生成占位图——方向反了。
 * 移到 shared，worker / dev-server / 测试都从这里取。
 */

import { escapeXml } from './escape.js';

export function placeholderSVG(params = {}) {
  const index = Number(params.i) || 0;
  const title = String(params.t || '').slice(0, 60);
  const source = String(params.s || '').slice(0, 24);

  const palettes = [
    ['#6366f1', '#8b5cf6'],
    ['#0ea5e9', '#22d3ee'],
    ['#f97316', '#f43f5e'],
    ['#10b981', '#34d399'],
    ['#eab308', '#f97316'],
    ['#ec4899', '#8b5cf6'],
    ['#14b8a6', '#0ea5e9'],
    ['#f43f5e', '#f59e0b'],
  ];
  const [c1, c2] = palettes[Math.abs(index) % palettes.length];

  const lines = [];
  let buf = '';
  for (const ch of title) {
    buf += ch;
    const width = [...buf].reduce((n, c) => n + (/[\u4e00-\u9fa5]/.test(c) ? 2 : 1), 0);
    if (width >= 26) {
      lines.push(buf);
      buf = '';
    }
    if (lines.length >= 3) break;
  }
  if (buf && lines.length < 3) lines.push(buf);

  const text = lines
    .map((line, i) => `<text x="40" y="${150 + i * 42}" font-size="30" font-weight="600" fill="rgba(255,255,255,.94)">${escapeXml(line)}</text>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="420" fill="url(#g)"/>
  <circle cx="700" cy="60" r="170" fill="rgba(255,255,255,.10)"/>
  <circle cx="120" cy="380" r="130" fill="rgba(0,0,0,.08)"/>
  <text x="40" y="72" font-size="17" letter-spacing="3" fill="rgba(255,255,255,.75)">${escapeXml(source.toUpperCase())}</text>
  ${text}
</svg>`;

  return svg;
}
