/**
 * Pulsedeck · 摘要器工厂
 * -------------------------------------------------------------
 * 生成「中文汇总 digest」：卡片上直接可看的几十~几百字摘要，无需点进原文。
 *
 * 两种环境：
 *   - Cloudflare Worker：用 Workers AI 的 LLM（@cf/meta/llama-3.1-8b-instruct）
 *     把新闻凝练成一段中文摘要（真正“汇总”，而非逐句翻译）。
 *   - 本地 Node：降级方案——中文源直接用原文摘要；英文源优先用已翻译的
 *     summaryZh，没有译文时回退清洗后的英文原文（部署后即全中文）。
 *
 * 用法：
 *   const s = makeSummarizer(env, translator);   // translator 来自 makeTranslator()
 *   await s.summarizeItem(item, 'zh');            // 结果写回 item.digest
 */

const SUMMARY_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const SRC_MAX = 1600; // 喂给 LLM 的原文上限（字符）

function localClean(str = '') {
  return String(str || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {object} env  Worker 环境；含 env.AI 时走 Workers AI，否则走本地降级
 * @param {object|null} translator  来自 makeTranslator()（本地降级时用来补翻摘要）
 * @returns {{ name: string, summarizeItem: (item: object, to?: string) => Promise<void> }}
 */
export function makeSummarizer(env = {}, translator = null) {
  // ---- Cloudflare Workers AI：生成式中文摘要 ----
  if (env && typeof env.AI === 'object' && env.AI !== null) {
    return {
      name: 'workers-ai',
      async summarizeItem(it, to = 'zh') {
        const langName = to === 'zh' ? '中文' : to;
        if (it.lang === 'zh') {
          it.digest = it.summary || it.title;
          return;
        }
        const src = `${it.title}\n${it.summary || ''}`.slice(0, SRC_MAX).trim();
        if (!src) {
          it.digest = it.title;
          return;
        }
        try {
          const out = await env.AI.run(SUMMARY_MODEL, {
            messages: [
              {
                role: 'system',
                content:
                  `你是一个资深新闻编辑。请用${langName}把下面这条新闻凝练成一段连贯的摘要，` +
                  `长度 60-180 字，保留关键事实（谁、做了什么、为何重要），不要列表、不要评论、` +
                  `不要重复标题，只输出摘要本身。`,
              },
              { role: 'user', content: src },
            ],
            max_tokens: 240,
            temperature: 0.3,
          });
          const t = out?.text || out?.response || out?.result || '';
          it.digest = String(t || '').trim() || it.summaryZh || it.summary || it.title;
        } catch (err) {
          console.warn('[pulsedeck] AI 摘要失败:', err?.message || err);
          it.digest = it.summaryZh || it.summary || it.title;
        }
      },
    };
  }

  // ---- 本地降级 ----
  return {
    name: 'local',
    async summarizeItem(it, to = 'zh') {
      if (it.lang === 'zh') {
        it.digest = localClean(it.summary) || it.title;
        return;
      }
      // 优先用聚合阶段已翻译的摘要
      if (it.summaryZh) {
        it.digest = it.summaryZh;
        return;
      }
      // 退而求其次：再翻译一次摘要（用剩余额度尽力）
      if (translator && it.summary) {
        try {
          const zh = await translator.translate(localClean(it.summary).slice(0, 480), 'en', to);
          if (zh) {
            it.digest = zh;
            return;
          }
        } catch {
          /* 忽略，回退原文 */
        }
      }
      // 最终兜底：清洗后的英文原文（部署后会是中文摘要）
      it.digest = localClean(it.summary) || it.title;
    },
  };
}
