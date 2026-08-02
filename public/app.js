/* =========================================================
   Pulsedeck · 前端主逻辑（原生 ESM，无构建步骤）
   ========================================================= */

/** 分离部署时改成 Worker 地址，例如 'https://pulsedeck.xxx.workers.dev' */
const API_BASE = '';

/* ------------------------- 布局定义 ------------------------- */

const ICON = {
  cards: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  list: '<rect x="3" y="4.5" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="18" height="2.4" rx="1.2"/><rect x="3" y="17.1" width="18" height="2.4" rx="1.2"/>',
  magazine: '<rect x="3" y="3" width="11" height="11" rx="1.6"/><rect x="16" y="3" width="5" height="5" rx="1.4"/><rect x="16" y="9" width="5" height="5" rx="1.4"/><rect x="3" y="16" width="18" height="2.2" rx="1.1"/><rect x="3" y="19.6" width="12" height="1.8" rx=".9"/>',
  board: '<rect x="2.5" y="3" width="5.6" height="18" rx="1.6"/><rect x="9.2" y="3" width="5.6" height="13" rx="1.6"/><rect x="15.9" y="3" width="5.6" height="16" rx="1.6"/>',
  timeline: '<circle cx="5" cy="6" r="2.2"/><circle cx="5" cy="12" r="2.2"/><circle cx="5" cy="18" r="2.2"/><rect x="9.5" y="4.9" width="11.5" height="2.2" rx="1.1"/><rect x="9.5" y="10.9" width="9" height="2.2" rx="1.1"/><rect x="9.5" y="16.9" width="11.5" height="2.2" rx="1.1"/>',
  reader: '<rect x="2.5" y="3" width="6.4" height="18" rx="1.6"/><rect x="10.6" y="3" width="10.9" height="18" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.9"/>',
};

const LAYOUTS = [
  { id: 'cards', name: '卡片流', hint: '缩略图优先，扫视效率最高' },
  { id: 'list', name: '列表', hint: '信息密度最高，手机单手最舒服' },
  { id: 'magazine', name: '杂志', hint: '头条大图 + 混排，像一份日报' },
  { id: 'board', name: '看板', hint: '按分类分栏，横向对比' },
  { id: 'timeline', name: '时间轴', hint: '按时间线索追踪事件' },
  { id: 'reader', name: '阅读器', hint: '左索引右正文，PC 连读' },
];

const STAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.73L6.8 19.6l1-5.8-4.2-4.1 5.8-.85z"/></svg>';

/* ------------------------- 错误兜底 ------------------------- */

function surfaceError(msg) {
  const s = document.getElementById('stage');
  if (!s) return;
  s.innerHTML = `<div class="fatal">
    <div class="big">⚠</div>
    <p class="fmsg">${esc(msg)}</p>
    <button class="btn primary" onclick="location.reload()">重新加载</button>
  </div>`;
}
window.addEventListener('error', (e) => surfaceError('页面脚本出错：' + (e.message || (e.error && e.error.message) || '未知错误')));
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  surfaceError('请求或渲染失败：' + (r && (r.message || r)) || '未知错误');
});

/* ------------------------- 状态 ------------------------- */

const DEFAULT_PREFS = {
  layout: 'cards',
  theme: 'auto',
  sort: 'time',
  category: 'all',
  compact: false,
  hideRead: false,
  images: true,
  proxy: false,
  onlyStar: false,
  block: '',
  sources: null, // null = 用服务端默认
};

/* 安全存储：预览环境的沙箱 iframe 可能禁用 localStorage，必须 try/catch，否则顶层抛错会让整页脚本中断 */
const storage = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 忽略：隐私模式 / 沙箱限制 */
    }
  },
};
function safeParse(s, d) {
  try {
    return JSON.parse(s);
  } catch {
    return d;
  }
}

const state = {
  prefs: loadPrefs(),
  config: { categories: [], feeds: [] },
  data: { items: [], sources: [], updated: null, demo: false, note: '' },
  query: '',
  selected: null,
  cursor: -1,
  loading: false,
  read: new Set(safeParse(storage.get('pd.read', '[]'), [])),
  star: new Set(safeParse(storage.get('pd.star', '[]'), [])),
};

function loadPrefs() {
  return { ...DEFAULT_PREFS, ...safeParse(storage.get('pd.prefs', '{}'), {}) };
}
function savePrefs() {
  storage.set('pd.prefs', JSON.stringify(state.prefs));
}
function saveSets() {
  storage.set('pd.read', JSON.stringify([...state.read].slice(-800)));
  storage.set('pd.star', JSON.stringify([...state.star].slice(-400)));
}

/* ------------------------- DOM 引用 ------------------------- */

const $ = (sel) => document.querySelector(sel);
const el = {
  stage: $('#stage'),
  cats: $('#cats'),
  layouts: $('#layouts'),
  mobileBar: $('#mobileBar'),
  search: $('#search'),
  searchClear: $('#searchClear'),
  sort: $('#sort'),
  notice: $('#notice'),
  footStat: $('#footStat'),
  panel: $('#panel'),
  scrim: $('#scrim'),
  modal: $('#modal'),
  modalCard: $('#modalCard'),
  toast: $('#toast'),
  srcList: $('#srcList'),
  brandSub: $('#brandSub'),
};

/* ------------------------- 工具 ------------------------- */

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = new Date(ts);
  const days = Math.floor(h / 24);
  if (days === 1) return `昨天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (days < 7) return `${days} 天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function clockOf(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const y = new Date(today.getTime() - 86400000);
  if (same(d, today)) return '今天';
  if (same(d, y)) return '昨天';
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
}

function imgSrc(item, i = 0) {
  let src = item.image;
  if (!src) {
    const p = new URLSearchParams({ i: String(i), t: item.title.slice(0, 46), s: item.source });
    return `${API_BASE}/api/placeholder?${p}`;
  }
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  if (state.prefs.proxy && /^https?:\/\//i.test(src)) {
    return `${API_BASE}/api/img?u=${encodeURIComponent(src)}`;
  }
  return src;
}

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.toast.hidden = true; }, 1900);
}

/* ------------------------- 主题 ------------------------- */

function applyTheme() {
  const pref = state.prefs.theme;
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0d13' : '#ffffff');
}

/* ------------------------- 数据管道 ------------------------- */

function blockWords() {
  return state.prefs.block
    .split(/[,，\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function visibleItems() {
  const q = state.query.trim().toLowerCase();
  const blocks = blockWords();
  const cat = state.prefs.category;

  let list = state.data.items.filter((it) => {
    if (cat !== 'all' && it.category !== cat) return false;
    if (state.prefs.onlyStar && !state.star.has(it.id)) return false;
    if (state.prefs.hideRead && state.read.has(it.id) && state.selected !== it.id) return false;
    if (blocks.length) {
      const hay = `${it.title} ${it.summary}`.toLowerCase();
      if (blocks.some((b) => hay.includes(b))) return false;
    }
    if (q) {
      const hay = `${it.title} ${it.summary} ${it.source} ${it.author} ${(it.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const now = Date.now();
  const sort = state.prefs.sort;
  if (sort === 'hot') {
    list = [...list].sort((a, b) => score(b, now) - score(a, now));
  } else if (sort === 'source') {
    list = [...list].sort((a, b) => (a.source || '').localeCompare(b.source || '', 'zh') || b.timestamp - a.timestamp);
  } else if (sort === 'read') {
    list = [...list].sort((a, b) => (a.readMinutes || 9) - (b.readMinutes || 9) || b.timestamp - a.timestamp);
  } else {
    list = [...list].sort((a, b) => b.timestamp - a.timestamp);
  }
  return list;
}

function score(item, now) {
  const ageH = item.timestamp ? (now - item.timestamp) / 36e5 : 999;
  const fresh = Math.max(0, 48 - ageH) / 48;
  const w = (item.weight ?? 5) / 10;
  const buzz = Math.min(Math.log10(1 + (item.points || 0) + (item.comments || 0) * 2) / 3, 1);
  return fresh * 0.55 + w * 0.3 + buzz * 0.15;
}

function categoryCounts() {
  const map = new Map();
  for (const it of state.data.items) map.set(it.category, (map.get(it.category) || 0) + 1);
  return map;
}

/* ------------------------- 渲染：外围 ------------------------- */

function renderCats() {
  const counts = categoryCounts();
  const cats = state.config.categories.length ? state.config.categories : [{ id: 'all', name: '全部' }];
  el.cats.innerHTML = cats
    .map((c) => {
      const n = c.id === 'all' ? state.data.items.length : counts.get(c.id) || 0;
      const on = state.prefs.category === c.id ? ' on' : '';
      return `<button class="cat${on}" data-cat="${c.id}" role="tab">${esc(c.name)}<span class="n">${n}</span></button>`;
    })
    .join('');
}

function layoutButtonsHTML(mobile) {
  return LAYOUTS.map((l, i) => {
    const on = state.prefs.layout === l.id ? ' on' : '';
    const svg = `<svg viewBox="0 0 24 24" fill="currentColor">${ICON[l.id]}</svg>`;
    return mobile
      ? `<button class="mb-btn${on}" data-layout="${l.id}">${svg}<span>${l.name}</span></button>`
      : `<button class="lay-btn${on}" data-layout="${l.id}" title="${esc(l.hint)}（快捷键 ${i + 1}）">${svg}<span>${l.name}</span></button>`;
  }).join('');
}

function renderLayoutSwitchers() {
  el.layouts.innerHTML = layoutButtonsHTML(false);
  el.mobileBar.innerHTML = layoutButtonsHTML(true);
  const cur = LAYOUTS.find((l) => l.id === state.prefs.layout);
  if (cur) el.brandSub.textContent = cur.name;
}

function renderNotice() {
  // 抓取失败的源不再单独提示（顶部不再显示“X 个源本次抓取失败”）。
  const parts = [];
  if (state.data.note) parts.push(state.data.note);
  else if (state.data.demo) parts.push('当前展示的是演示数据。');
  if (parts.length) {
    el.notice.innerHTML = parts.join(' ');
    el.notice.hidden = false;
  } else {
    el.notice.hidden = true;
  }
}

function renderFoot(list) {
  const ok = (state.data.sources || []).filter((s) => s.ok).length;
  const total = (state.data.sources || []).length;
  const up = state.data.updated ? new Date(state.data.updated) : null;
  const tr = state.data.translate;
  const trLabel = tr === 'workers-ai' ? 'Workers AI 翻译' : tr === 'mymemory' ? 'MyMemory 翻译' : '';
  el.footStat.textContent = `显示 ${list.length} / 共 ${state.data.items.length} 条 · ${ok}/${total} 个源可用${up ? ` · 更新于 ${clockOf(up.getTime())}` : ''}${trLabel ? ` · 英文已${trLabel}` : ''}`;
}

function renderSources() {
  const stat = new Map((state.data.sources || []).map((s) => [s.id, s]));
  const enabled = new Set(state.prefs.sources ?? state.config.feeds.filter((f) => f.enabled).map((f) => f.id));
  const catName = new Map(state.config.categories.map((c) => [c.id, c.short || c.name]));

  const groups = new Map();
  for (const f of state.config.feeds) {
    if (!groups.has(f.category)) groups.set(f.category, []);
    groups.get(f.category).push(f);
  }

  el.srcList.innerHTML = [...groups.entries()]
    .map(([cat, feeds]) => {
      const rows = feeds
        .map((f) => {
          const s = stat.get(f.id);
          const info = s ? (s.ok ? `${s.count} 条` : '失败') : '—';
          const bad = s && !s.ok ? ' bad' : '';
          return `<label class="src-item">
            <input type="checkbox" data-src="${f.id}" ${enabled.has(f.id) ? 'checked' : ''} />
            <span class="src-name">${esc(f.name)}</span>
            <span class="src-stat${bad}">${info}</span>
          </label>`;
        })
        .join('');
      return `<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--faint);padding:4px 9px">${esc(catName.get(cat) || cat)}</div>${rows}</div>`;
    })
    .join('');
}

/* ------------------------- 渲染：条目片段 ------------------------- */

function metaHTML(it, extra = '') {
  const bits = [`<span class="src">${esc(it.source)}</span>`];
  if (it.timestamp) bits.push(`<span>${timeAgo(it.timestamp)}</span>`);
  if (it.readMinutes) bits.push(`<span>${it.readMinutes} 分钟读完</span>`);
  if (it.points) bits.push(`<span>▲ ${it.points}</span>`);
  if (extra) bits.push(extra);
  return `<div class="meta">${bits.join('<span class="sep">·</span>')}</div>`;
}

function starHTML(it) {
  const on = state.star.has(it.id) ? ' on' : '';
  return `<button class="star-btn${on}" data-star="${it.id}" aria-label="收藏">${STAR_SVG}</button>`;
}

function cls(it) {
  return state.read.has(it.id) ? ' is-read' : '';
}

function thumbHTML(it, i) {
  if (!state.prefs.images) return '';
  /* 没有真实图片时不显示占位图，让卡片以纯文字形式呈现 */
  if (!it.image) return '';
  return `<img class="thumb" loading="lazy" src="${esc(imgSrc(it, i))}" alt="" onerror="this.closest('.thumb')?.remove();this.remove()" />`;
}

/* 中文译文：英文条目聚合时已自动翻译（titleZh / summaryZh），这里负责呈现 */
function zhTitle(it) {
  if (!it.titleZh || it.titleZh === it.title) return '';
  return `<span class="zh ttl-zh">${esc(it.titleZh)}</span>`;
}
function zhSummary(it) {
  if (!it.summaryZh || it.summaryZh === it.summary) return '';
  return `<span class="zh sum-zh">${esc(it.summaryZh)}</span>`;
}

/* 卡片主摘要：优先显示「中文汇总 digest」（部署=AI 凝练，本地=译文/原文），
   让用户在列表里就能看到几十~几百字的内容，无需点进原文。 */
function summaryHTML(it) {
  const text = it.digest || it.summary || '';
  if (!text) return '';
  const isChinese = /[一-鿿]/.test(text);
  let tag = '';
  if (it.lang === 'en') tag = isChinese ? '<span class="tag-zh">译</span>' : '<span class="tag-zh en">原文</span>';
  else if (it.digest && it.digest !== it.summary) tag = '<span class="tag-zh">汇</span>';
  return `<p class="sum">${esc(text)} ${tag}</p>`;
}

/* ------------------------- 渲染：六种布局 ------------------------- */

function viewCards(list) {
  return `<div class="lay-cards">${list
    .map(
      (it, i) => `<article class="card${cls(it)}" data-id="${esc(it.id)}">
      ${thumbHTML(it, i)}
      <div class="card-body">
        ${metaHTML(it)}
        <h2 class="ttl" data-open="${esc(it.id)}">${esc(it.title)}${zhTitle(it)}</h2>
        ${summaryHTML(it)}
        <div class="card-foot">
          <span class="badge">${esc(it.author || it.source)}</span>
          ${starHTML(it)}
        </div>
      </div>
    </article>`
    )
    .join('')}</div>`;
}

function viewList(list) {
  return `<div class="lay-list">${list
    .map(
      (it, i) => `<article class="row${cls(it)}" data-id="${esc(it.id)}">
      <div class="row-idx">${i + 1}</div>
      <div class="row-main">
        <h2 class="ttl" data-open="${esc(it.id)}">${esc(it.title)}${zhTitle(it)}</h2>
        ${summaryHTML(it)}
        ${metaHTML(it)}
      </div>
      ${thumbHTML(it, i)}
      ${starHTML(it)}
    </article>`
    )
    .join('')}</div>`;
}

function viewMagazine(list) {
  if (!list.length) return viewEmpty();
  const [hero, ...rest] = list;
  const side = rest.slice(0, 3);
  const briefs = rest.slice(3);

  const heroImg = state.prefs.images
    ? `<img class="thumb" src="${esc(imgSrc(hero, 0))}" alt="" onerror="this.style.display='none'" />`
    : '';

  return `<div class="lay-mag">
    <div class="mag-top">
      <article class="mag-hero${cls(hero)}" data-id="${esc(hero.id)}">
        ${heroImg}
        <div class="mag-hero-body">
          <span class="badge">头条 · ${esc(hero.source)}</span>
          <h2 class="ttl" data-open="${esc(hero.id)}">${esc(hero.title)}${zhTitle(hero)}</h2>
          ${summaryHTML(hero)}
          ${metaHTML(hero)}
        </div>
      </article>
      <div class="mag-side">
        ${side
          .map(
            (it, i) => `<article class="mag-item${cls(it)}" data-id="${esc(it.id)}">
          ${thumbHTML(it, i + 1)}
          <div style="flex:1;min-width:0">
            <h3 class="ttl" data-open="${esc(it.id)}">${esc(it.title)}${zhTitle(it)}</h3>
            ${metaHTML(it)}
          </div>
        </article>`
          )
          .join('')}
      </div>
    </div>
    ${
      briefs.length
        ? `<div class="mag-rest-head">更多快讯</div>
           <div class="mag-rest">${briefs
             .map(
               (it) => `<div class="mag-brief${cls(it)}" data-id="${esc(it.id)}">
              <h4 class="ttl" data-open="${esc(it.id)}">${esc(it.title)}${zhTitle(it)}</h4>
              ${metaHTML(it)}
            </div>`
             )
             .join('')}</div>`
        : ''
    }
  </div>`;
}

function viewBoard(list) {
  const byCat = state.prefs.category === 'all';
  const nameOf = new Map(state.config.categories.map((c) => [c.id, c.name]));

  const groups = new Map();
  for (const it of list) {
    const key = byCat ? it.category : it.sourceId;
    if (!groups.has(key)) groups.set(key, { title: byCat ? nameOf.get(it.category) || it.category : it.source, items: [] });
    groups.get(key).items.push(it);
  }

  const cols = [...groups.values()].sort((a, b) => b.items.length - a.items.length);
  if (!cols.length) return viewEmpty();

  return `<div class="lay-board">${cols
    .map(
      (g) => `<section class="board-col">
      <div class="board-head"><span class="src-dot"></span><h3>${esc(g.title)}</h3><span class="n">${g.items.length}</span></div>
      <div class="board-list">${g.items
        .map(
          (it) => `<article class="mini${cls(it)}" data-id="${esc(it.id)}">
          <h4 class="ttl" data-open="${esc(it.id)}">${esc(it.title)}${zhTitle(it)}</h4>
          ${metaHTML(it)}
        </article>`
        )
        .join('')}</div>
    </section>`
    )
    .join('')}</div>`;
}

function viewTimeline(list) {
  if (!list.length) return viewEmpty();
  const groups = [];
  let cur = null;
  for (const it of list) {
    const label = dayLabel(it.timestamp || Date.now());
    if (!cur || cur.label !== label) {
      cur = { label, items: [] };
      groups.push(cur);
    }
    cur.items.push(it);
  }

  return `<div class="lay-time">${groups
    .map(
      (g) => `<section class="time-group">
      <div class="time-label">${esc(g.label)}<span style="opacity:.6">${g.items.length}</span></div>
      <div class="time-list">${g.items
        .map(
          (it, i) => `<article class="tl${cls(it)}" data-id="${esc(it.id)}">
          <div class="tl-time">${it.timestamp ? clockOf(it.timestamp) : '--:--'}</div>
          <div class="tl-main">
            <h3 class="ttl" data-open="${esc(it.id)}">${esc(it.title)}${zhTitle(it)}</h3>
            ${summaryHTML(it)}
            ${metaHTML(it)}
          </div>
          ${thumbHTML(it, i)}
          ${starHTML(it)}
        </article>`
        )
        .join('')}</div>
    </section>`
    )
    .join('')}</div>`;
}

function viewReader(list) {
  if (!list.length) return viewEmpty();
  if (!state.selected || !list.some((i) => i.id === state.selected)) state.selected = list[0].id;

  const index = list
    .map(
      (it) => `<div class="idx${state.selected === it.id ? ' on' : ''}${cls(it)}" data-pick="${esc(it.id)}" data-id="${esc(it.id)}">
      <h3 class="ttl">${esc(it.title)}${zhTitle(it)}</h3>
      ${metaHTML(it)}
    </div>`
    )
    .join('');

  return `<div class="lay-reader">
    <div class="reader-index">${index}</div>
    <div class="reader-pane" id="readerPane">${readerPaneHTML()}</div>
  </div>`;
}

function readerPaneHTML() {
  const it = state.data.items.find((x) => x.id === state.selected);
  if (!it) return '<div class="reader-empty">从左侧选择一条开始阅读</div>';
  return `<div class="reader-inner">
    <div class="kicker">
      <span class="src-dot"></span>
      <strong style="color:var(--accent)">${esc(it.source)}</strong>
      <span class="sep">·</span><span>${timeAgo(it.timestamp)}</span>
      ${it.author ? `<span class="sep">·</span><span>${esc(it.author)}</span>` : ''}
      ${it.readMinutes ? `<span class="sep">·</span><span>${it.readMinutes} 分钟读完</span>` : ''}
      <button class="icon-btn" data-mobile-close style="margin-left:auto">✕</button>
    </div>
    <h1>${esc(it.title)}${zhTitle(it)}</h1>
    ${state.prefs.images ? `<img class="reader-hero" src="${esc(imgSrc(it, 0))}" alt="" onerror="this.style.display='none'" />` : ''}
    ${it.digest ? `<div class="body-digest"><span class="tag-zh">汇总</span>${esc(it.digest)}</div>` : ''}
    <div class="body">${esc(it.description || it.summary || '该源未提供摘要，点击下方按钮阅读原文。')}</div>
    ${it.summaryZh && it.summaryZh !== it.digest ? `<div class="body-zh">${esc(it.summaryZh)}</div>` : ''}
    ${(it.tags || []).length ? `<div class="modal-tags">${it.tags.map((t) => `<span class="badge">#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="reader-actions">
      <a class="btn primary" href="${esc(it.link)}" target="_blank" rel="noopener" data-read="${esc(it.id)}">阅读原文 ↗</a>
      <button class="btn" data-star="${esc(it.id)}">${state.star.has(it.id) ? '★ 已收藏' : '☆ 收藏'}</button>
      <button class="btn" data-copy="${esc(it.link)}">复制链接</button>
    </div>
  </div>`;
}

function viewEmpty() {
  return `<div class="empty"><div class="big">◎</div><p>没有匹配的内容</p><p style="font-size:12.5px">试试换个分类、清空搜索，或在设置里多勾几个源。</p></div>`;
}

function viewSkeleton() {
  return `<div class="skeleton">
    <div class="sk-msg"><span class="spinner"></span> 正在聚合各站 RSS，首次约需几秒…</div>
    ${Array.from({ length: 9 }, () => '<div class="sk"></div>').join('')}
  </div>`;
}

/* ------------------------- 渲染入口 ------------------------- */

const VIEWS = { cards: viewCards, list: viewList, magazine: viewMagazine, board: viewBoard, timeline: viewTimeline, reader: viewReader };

function render() {
  document.body.classList.toggle('compact', state.prefs.compact);
  el.stage.dataset.layout = state.prefs.layout;

  if (state.loading && !state.data.items.length) {
    el.stage.innerHTML = viewSkeleton();
    return;
  }

  const list = visibleItems();
  const view = VIEWS[state.prefs.layout] || viewCards;
  el.stage.innerHTML = list.length ? view(list) : viewEmpty();

  renderCats();
  renderFoot(list);
  state.cursor = -1;
}

/* ------------------------- 交互 ------------------------- */

function markRead(id) {
  if (!state.read.has(id)) {
    state.read.add(id);
    saveSets();
    document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach((n) => n.classList.add('is-read'));
  }
}

function openItem(id) {
  const it = state.data.items.find((x) => x.id === id);
  if (!it) return;
  markRead(id);

  if (state.prefs.layout === 'reader') {
    selectReader(id);
    return;
  }

  el.modalCard.innerHTML = `
    ${state.prefs.images ? `<img class="modal-hero" src="${esc(imgSrc(it, 0))}" alt="" onerror="this.style.display='none'" />` : ''}
    <div class="modal-body">
      <div class="meta">
        <span class="src">${esc(it.source)}</span><span class="sep">·</span>
        <span>${timeAgo(it.timestamp)}</span>
        ${it.author ? `<span class="sep">·</span><span>${esc(it.author)}</span>` : ''}
        ${it.readMinutes ? `<span class="sep">·</span><span>${it.readMinutes} 分钟读完</span>` : ''}
      </div>
      <h2>${esc(it.title)}${zhTitle(it)}</h2>
      <div class="body">${esc(it.description || it.summary || '该源未提供摘要，点击下方按钮阅读原文。')}</div>
    ${it.summaryZh ? `<div class="body-zh">${esc(it.summaryZh)}</div>` : ''}
      ${(it.tags || []).length ? `<div class="modal-tags">${it.tags.map((t) => `<span class="badge">#${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="modal-actions">
        <a class="btn primary" href="${esc(it.link)}" target="_blank" rel="noopener">阅读原文 ↗</a>
        <button class="btn" data-star="${esc(it.id)}">${state.star.has(it.id) ? '★ 已收藏' : '☆ 收藏'}</button>
        <button class="btn" data-copy="${esc(it.link)}">复制链接</button>
        <button class="btn" data-close-modal>关闭</button>
      </div>
    </div>`;
  el.modal.hidden = false;
}

function selectReader(id) {
  state.selected = id;
  markRead(id);
  document.querySelectorAll('.idx').forEach((n) => n.classList.toggle('on', n.dataset.pick === id));
  const pane = document.getElementById('readerPane');
  if (pane) {
    pane.innerHTML = readerPaneHTML();
    pane.scrollTop = 0;
    if (window.innerWidth <= 720) pane.classList.add('mobile-open');
  }
}

function toggleStar(id) {
  if (state.star.has(id)) {
    state.star.delete(id);
    toast('已取消收藏');
  } else {
    state.star.add(id);
    toast('已收藏');
  }
  saveSets();
  document.querySelectorAll(`[data-star="${CSS.escape(id)}"]`).forEach((n) => {
    if (n.classList.contains('star-btn')) n.classList.toggle('on', state.star.has(id));
    else n.textContent = state.star.has(id) ? '★ 已收藏' : '☆ 收藏';
  });
  if (state.prefs.onlyStar) render();
}

function setLayout(id) {
  if (!VIEWS[id]) return;
  state.prefs.layout = id;
  savePrefs();
  renderLayoutSwitchers();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeOverlays() {
  el.modal.hidden = true;
  el.panel.hidden = true;
  el.scrim.hidden = true;
  document.getElementById('readerPane')?.classList.remove('mobile-open');
}

/* ------------------------- 拉数据 ------------------------- */

async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    state.config = await res.json();
  } catch {
    state.config = { categories: [{ id: 'all', name: '全部' }], feeds: [] };
  }
}

async function loadNews({ fresh = false } = {}) {
  state.loading = true;
  document.getElementById('refreshBtn')?.classList.add('spin');
  /* 刷新时：即使有旧数据也立刻显示骨架屏，让用户知道「正在干活」 */
  if (fresh || !state.data.items.length) {
    el.stage.innerHTML = viewSkeleton();
  }

  // 一个源都没勾选：直接清空，不必打接口
  if (Array.isArray(state.prefs.sources) && state.prefs.sources.length === 0) {
    state.loading = false;
    document.getElementById('refreshBtn')?.classList.remove('spin');
    state.data = { ...state.data, items: [], count: 0, note: '当前没有勾选任何新闻源，去右上角设置里选几个。' };
    renderNotice();
    render();
    return;
  }

  const params = new URLSearchParams({ limit: '240' });
  if (state.prefs.sources) params.set('sources', state.prefs.sources.join(','));
  if (fresh) params.set('fresh', '1');

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${API_BASE}/api/news?${params}`, { signal: ctrl.signal });
    const data = await res.json();
    state.data = { note: '', ...data };
  } catch (err) {
    if (!state.data.items.length) {
      el.stage.innerHTML = `<div class="fatal">
        <div class="big">⚠</div>
        <p class="fmsg">加载失败：${esc(err.message || err)}</p>
        <button class="btn primary" id="retryBtn">重试</button>
      </div>`;
      document.getElementById('retryBtn')?.addEventListener('click', () => loadNews());
    } else {
      state.data = { ...state.data, note: `加载失败：${err.message}` };
    }
  } finally {
    clearTimeout(to);
    state.loading = false;
    document.getElementById('refreshBtn')?.classList.remove('spin');
  }

  if (state.data.categories?.length) state.config.categories = state.data.categories;
  renderNotice();
  renderSources();
  render();

  /* 刷新完成后给一个视觉反馈，让用户确认「确实刷新了」 */
  if (fresh) {
    el.stage.classList.add('stage-flash');
    setTimeout(() => el.stage.classList.remove('stage-flash'), 600);
    const up = state.data.updated ? new Date(state.data.updated) : null;
    toast(`已刷新 · ${state.data.items.length} 条${up ? ` · ${clockOf(up.getTime())}` : ''}`);
  }
}

/* ------------------------- 事件绑定 ------------------------- */

function bind() {
  // 舞台委托
  el.stage.addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]');
    if (star) { e.preventDefault(); e.stopPropagation(); toggleStar(star.dataset.star); return; }

    const copy = e.target.closest('[data-copy]');
    if (copy) { navigator.clipboard?.writeText(copy.dataset.copy); toast('链接已复制'); return; }

    const mclose = e.target.closest('[data-mobile-close]');
    if (mclose) { document.getElementById('readerPane')?.classList.remove('mobile-open'); return; }

    const readLink = e.target.closest('[data-read]');
    if (readLink) { markRead(readLink.dataset.read); return; }

    const pick = e.target.closest('[data-pick]');
    if (pick) { selectReader(pick.dataset.pick); return; }

    if (e.target.closest('a')) return;

    const card = e.target.closest('[data-id]');
    if (card) openItem(card.dataset.id);
  });

  // 分类
  el.cats.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.prefs.category = btn.dataset.cat;
    state.selected = null;
    savePrefs();
    render();
  });

  // 布局（桌面 + 移动）
  for (const node of [el.layouts, el.mobileBar]) {
    node.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-layout]');
      if (btn) setLayout(btn.dataset.layout);
    });
  }

  // 搜索
  let t;
  el.search.addEventListener('input', () => {
    el.searchClear.hidden = !el.search.value;
    clearTimeout(t);
    t = setTimeout(() => { state.query = el.search.value; render(); }, 160);
  });
  el.searchClear.addEventListener('click', () => {
    el.search.value = '';
    el.searchClear.hidden = true;
    state.query = '';
    render();
  });

  // 排序
  el.sort.value = state.prefs.sort;
  el.sort.addEventListener('change', () => {
    state.prefs.sort = el.sort.value;
    savePrefs();
    render();
  });

  // 顶栏按钮
  $('#refreshBtn').addEventListener('click', () => loadNews({ fresh: true }));
  $('#themeBtn').addEventListener('click', () => {
    const order = ['light', 'dark'];
    const cur = document.documentElement.dataset.theme;
    state.prefs.theme = order[(order.indexOf(cur) + 1) % order.length];
    savePrefs();
    applyTheme();
    toast(state.prefs.theme === 'dark' ? '深色模式' : '浅色模式');
  });
  $('#settingsBtn').addEventListener('click', () => {
    el.panel.hidden = false;
    el.scrim.hidden = false;
  });
  $('#panelClose').addEventListener('click', closeOverlays);
  el.scrim.addEventListener('click', closeOverlays);
  $('#brandHome').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // 弹窗
  el.modal.addEventListener('click', (e) => {
    if (e.target === el.modal || e.target.closest('[data-close-modal]')) { el.modal.hidden = true; return; }
    const star = e.target.closest('[data-star]');
    if (star) { toggleStar(star.dataset.star); return; }
    const copy = e.target.closest('[data-copy]');
    if (copy) { navigator.clipboard?.writeText(copy.dataset.copy); toast('链接已复制'); }
  });

  // 偏好开关
  const opt = (id, key, after) => {
    const node = $(id);
    node.checked = !!state.prefs[key];
    node.addEventListener('change', () => {
      state.prefs[key] = node.checked;
      savePrefs();
      (after || render)();
    });
  };
  opt('#optCompact', 'compact');
  opt('#optHideRead', 'hideRead');
  opt('#optImages', 'images');
  opt('#optProxy', 'proxy');
  opt('#optOnlyStar', 'onlyStar');

  const blockInput = $('#optBlock');
  blockInput.value = state.prefs.block;
  blockInput.addEventListener('input', () => {
    state.prefs.block = blockInput.value;
    savePrefs();
    clearTimeout(blockInput._t);
    blockInput._t = setTimeout(render, 300);
  });

  // 源开关
  el.srcList.addEventListener('change', (e) => {
    const box = e.target.closest('[data-src]');
    if (!box) return;
    const checked = [...el.srcList.querySelectorAll('[data-src]')].filter((b) => b.checked).map((b) => b.dataset.src);
    state.prefs.sources = checked;
    savePrefs();
    loadNews();
  });
  $('#srcAll').addEventListener('click', () => {
    state.prefs.sources = state.config.feeds.map((f) => f.id);
    savePrefs();
    renderSources();
    loadNews();
  });
  $('#srcNone').addEventListener('click', () => {
    state.prefs.sources = [];
    savePrefs();
    renderSources();
    toast('已取消全部源，至少勾选一个才有内容');
  });
  $('#srcReset').addEventListener('click', () => {
    state.prefs.sources = null;
    savePrefs();
    renderSources();
    loadNews();
  });

  // 快捷键
  document.addEventListener('keydown', (e) => {
    const typing = /input|textarea|select/i.test(e.target.tagName);
    if (e.key === 'Escape') { closeOverlays(); el.search.blur(); return; }
    if (typing) return;

    if (e.key === '/') { e.preventDefault(); el.search.focus(); return; }
    if (/^[1-6]$/.test(e.key)) { setLayout(LAYOUTS[Number(e.key) - 1].id); return; }
    const k = e.key.toLowerCase();
    if (k === 'r') { loadNews({ fresh: true }); return; }
    if (k === 't') { $('#themeBtn').click(); return; }
    if (k === 's') { e.preventDefault(); $('#settingsBtn').click(); return; }
    if (k === 'j' || k === 'k') { e.preventDefault(); moveCursor(k === 'j' ? 1 : -1); return; }
    if (e.key === 'Enter') {
      const node = document.querySelector('.cursor');
      if (node) openItem(node.dataset.id);
    }
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.prefs.theme === 'auto') applyTheme();
  });

  // 每 10 分钟自动刷新一次
  setInterval(() => { if (!document.hidden) loadNews(); }, 10 * 60 * 1000);
}

function moveCursor(delta) {
  const nodes = [...el.stage.querySelectorAll('[data-id]')];
  if (!nodes.length) return;
  nodes.forEach((n) => n.classList.remove('cursor'));
  state.cursor = Math.max(0, Math.min(nodes.length - 1, state.cursor + delta));
  const node = nodes[state.cursor];
  node.classList.add('cursor');
  node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (state.prefs.layout === 'reader') selectReader(node.dataset.id);
}

/* ------------------------- 启动 ------------------------- */

async function boot() {
  /* 启动时强制关闭所有浮层，防止残留状态覆盖页面 */
  try { closeOverlays(); } catch(_) {}

  try {
    applyTheme();
    renderLayoutSwitchers();
    el.sort.value = state.prefs.sort;
    bind();
    render();
    await loadConfig();
    renderSources();
    await loadNews();
  } catch (err) {
    surfaceError('启动失败：' + (err && err.message ? err.message : err));
  }
}

boot();
