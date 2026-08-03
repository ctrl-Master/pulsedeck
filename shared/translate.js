/**
 * Pulsedeck · 翻译器工厂
 * -------------------------------------------------------------
 * 同一份代码跑在两种环境，翻译后端不同：
 *   - Cloudflare Worker：使用 Workers AI 的 @cf/meta/m2m100-1.2b 翻译模型
 *     （无需外部密钥，随 Worker 运行；需在 wrangler.toml 绑定 [ai]）
 *   - 本地 Node：使用 MyMemory 免费翻译接口做降级（无密钥、有限额）
 *
 * 用法：
 *   const t = makeTranslator(env);          // env 为 Worker 的 env（含 AI 绑定）或 {}
 *   const zh = await t.translate(text);     // 默认 en -> zh
 */

const M2M = '@cf/meta/m2m100-1.2b';
const M2M_MAX = 1400; // 单次翻译的最大字符数（模型输入限制）
const MYMEMORY_MAX = 480; // MyMemory 免费接口单次上限约 500 字符

/**
 * @param {object} env  Worker 环境对象；含 env.AI 时走 Workers AI，否则走 MyMemory
 * @returns {{ name: string, translate: (text: string, from?: string, to?: string) => Promise<string> }}
 */
export function makeTranslator(env = {}) {
  // ---- Cloudflare Workers AI ----
  if (env && typeof env.AI === 'object' && env.AI !== null) {
    return {
      name: 'workers-ai',
      async translate(text, from = 'en', to = 'zh') {
        const src = String(text || '').trim();
        if (!src) return '';
        try {
          const result = await env.AI.run(M2M, {
            text: src.slice(0, M2M_MAX),
            source_lang: from,
            target_lang: to,
          });
          const out = result?.translated_text || result?.text || '';
          return String(out).trim();
        } catch (err) {
          // 翻译失败不应阻断整页，返回空即可（前端会回退显示原文）
          console.warn('[pulsedeck] AI 翻译失败:', err?.message || err);
          return '';
        }
      },
    };
  }

  // ---- 本地降级：MyMemory ----
  // 支持 MYMEMORY_KEY 环境变量（免费注册后填入，日额度从 5000 提到 50000 词）
  const memKey = (typeof process !== 'undefined' && process.env && process.env.MYMEMORY_KEY) || '';
  return {
    name: 'mymemory',
    async translate(text, from = 'en', to = 'zh') {
      const src = String(text || '').trim();
      if (!src) return '';
      const pair = `${from}|${to === 'zh' ? 'zh-CN' : to}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        src.slice(0, MYMEMORY_MAX)
      )}&langpair=${pair}${memKey ? `&key=${encodeURIComponent(memKey)}` : ''}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
          });
          if (!res.ok) continue;
          const j = await res.json();
          const t = j?.responseData?.translatedText || '';
          if (/MYMEMORY WARNING/i.test(t)) return ''; // 额度耗尽，别再重试
          if (t) return String(t).trim();
        } catch {
          /* 忽略，重试或回退 */
        }
      }
      return '';
    },
  };
}
