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
import { readFileSync, writeFileSync } from 'node:fs';

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
  ' --bundle --format=esm --platform=node --target=es2022' +
  ' --outfile=' + JSON.stringify(out) +
  ' --banner:js=' + JSON.stringify(banner);

try {
  execSync(cmd, { stdio: 'inherit', cwd: root });
  console.log('[bundle-vercel] esbuild OK ->', out);

  // esbuild 会把 `export const runtime` 降级成 `var runtime` + 底部 `export { runtime }`，
  // 而 Vercel 的静态分析只认顶层 `export const runtime / maxDuration`，识别不到就会
  // 退化成账户默认超时（Pro 默认 300s），导致函数挂到超时。这里把尾部改写成干净形式。
  let code = readFileSync(out, 'utf8');
  const cleaned = code.replace(
    /var runtime = "nodejs";\s*var maxDuration = 60;\s*export\s*{\s*handler as default,\s*maxDuration,\s*runtime\s*};/,
    'export const runtime = "nodejs";\nexport const maxDuration = 60;\nexport { handler as default };'
  );
  if (cleaned !== code) {
    writeFileSync(out, cleaned);
    console.log('[bundle-vercel] 已规范化 runtime/maxDuration 导出（Vercel 可识别）');
  } else {
    console.log('[bundle-vercel] 尾部已是干净导出，无需改写');
  }
} catch (e) {
  console.error('[bundle-vercel] esbuild 失败，请先安装：npm i -D esbuild');
  process.exit(1);
}
