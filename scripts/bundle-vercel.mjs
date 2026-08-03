/**
 * Pulsedeck · Vercel 入口打包脚本
 * -------------------------------------------------------------
 * Vercel 的打包器（Edge esbuild / Node nft）对 api/ 目录里
 * `../shared/*.js` 这种「跨目录 ESM 相对导入」处理不稳定，
 * 会导致 FUNCTION_INVOCATION_FAILED（所有路由 500）。
 * 这里用 esbuild 把入口 + shared 打成一个零依赖单文件，作为
 * 部署产物 api/[...path].js，彻底消除跨目录导入歧义。
 *
 * 用法：node scripts/bundle-vercel.mjs
 * 依赖：esbuild（本地已装在 workspace，或用 npx 自动获取）
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const entry = resolve(root, 'src', 'vercel-entry.js');
const out = resolve(root, 'api', '[...path].js');

const banner =
  '/* Pulsedeck Vercel deploy bundle (self-contained). Source: src/vercel-entry.js + shared/*. ' +
  'Regenerate: node scripts/bundle-vercel.mjs */';

const cmd =
  'npx --yes esbuild ' +
  JSON.stringify(entry) +
  ' --bundle --format=esm --platform=neutral --target=es2022' +
  ' --outfile=' + JSON.stringify(out) +
  ' --banner:js=' + JSON.stringify(banner);

try {
  execSync(cmd, { stdio: 'inherit', cwd: root });
  console.log('[bundle-vercel] OK ->', out);
} catch (e) {
  console.error('[bundle-vercel] esbuild 失败，请先安装：npm i -D esbuild');
  process.exit(1);
}
