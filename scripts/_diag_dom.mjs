import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync('./_live_root.html', 'utf8');
const appjs = readFileSync('./public/app.js', 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://insights.hizhihao.me/',
  pretendToBeVisual: true,
  beforeParse(window) {
    // ---- polyfills for APIs jsdom lacks ----
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    window.CSS = window.CSS || { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c) };
    window.scrollTo = () => {};
    window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
    if (!window.AbortController) window.AbortController = globalThis.AbortController;
    // simulate broken Vercel API: every fetch HANGS forever (connection accepted but
    // function never responds — the worst case that could stall boot())
    window.fetch = () => new Promise(() => {});
    // capture errors
    window.addEventListener('error', (e) => errors.push('window.error: ' + (e.message || (e.error && e.error.stack) || e)));
    window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  },
});

const { window } = dom;
// inject app.js as a classic script (no imports/exports, safe)
const s = window.document.createElement('script');
s.textContent = appjs;
try {
  window.document.body.appendChild(s);
} catch (e) {
  errors.push('eval-throw: ' + (e.stack || e.message));
}

// give async boot() time to run (fetch rejects immediately, so no 30s wait)
await new Promise((r) => setTimeout(r, 800));

const stage = window.document.getElementById('stage');
const bf = window.document.getElementById('bootFallback');
console.log('=== captured errors (' + errors.length + ') ===');
errors.forEach((e) => console.log('  • ' + e));
console.log('=== stage.innerHTML length:', stage ? stage.innerHTML.length : 'NO #stage');
console.log('=== bootFallback still present?', !!bf, '| its text:', bf ? bf.textContent.trim().slice(0, 40) : '-');
console.log('=== stage first 300 chars ===');
console.log((stage ? stage.innerHTML : '').slice(0, 300));
process.exit(0);
