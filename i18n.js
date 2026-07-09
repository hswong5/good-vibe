// i18n.js — lightweight language manager (extendable: add new langs to LANGS)

const LANGS = {
  en: {
    code: 'en',
    label: '中文',          // label shown on toggle button (what you switch TO)
    htmlLang: 'en',
    fontFamily: '',
    categories: {
      All: 'All',
      Motivation: 'Motivation',
      Healing: 'Healing',
      Hustle: 'Hustle',
      Calm: 'Calm',
    },
    strings: {
      btn_new: 'New Quote',
      btn_copy: 'Copy',
      btn_download: 'Save Image',
      grid_all: 'All Quotes',
      grid_cat: (cat) => `${cat} Quotes`,
      photo_by: (name, pUrl, pexelsUrl) =>
        `Photo by <a href="${pUrl}" target="_blank" rel="noopener">${name}</a> on <a href="${pexelsUrl}" target="_blank" rel="noopener">Pexels</a>`,
      nav_about: 'About',
      nav_privacy: 'Privacy Policy',
      nav_contact: 'Contact',
      footer_copy: '\u00a9 2026 GoodVibe Quotes. All quotes are proverbs, traditional sayings, or historical public-domain statements.',
    },
  },
  zh: {
    code: 'zh',
    label: 'EN',            // label shown on toggle button (what you switch TO)
    htmlLang: 'zh-Hant',
    fontFamily: "'Noto Serif SC', serif",
    categories: {
      All: '全部',
      Motivation: '動力',
      Healing: '療癒',
      Hustle: '拼搏',
      Calm: '靜心',
    },
    strings: {
      btn_new: '換一句',
      btn_copy: '複製',
      btn_download: '儲存圖片',
      grid_all: '所有語錄',
      grid_cat: (cat) => `${cat}語錄`,
      photo_by: (name, pUrl, pexelsUrl) =>
        `相片由 <a href="${pUrl}" target="_blank" rel="noopener">${name}</a> 提供，來自 <a href="${pexelsUrl}" target="_blank" rel="noopener">Pexels</a>`,
      nav_about: '關於',
      nav_privacy: '私隱政策',
      nav_contact: '聯絡我們',
      footer_copy: '\u00a9 2026 GoodVibe Quotes. 所有語錄均為諺語、傳統格言或歷史上的公有領域名句。',
    },
  },
};

const I18N = (() => {
  const STORAGE_KEY = 'gv_lang';
  let current = localStorage.getItem(STORAGE_KEY) || 'en';
  if (!LANGS[current]) current = 'en';

  function get() { return LANGS[current]; }

  function t(key, ...args) {
    const val = LANGS[current].strings[key];
    if (typeof val === 'function') return val(...args);
    return val || key;
  }

  function catLabel(cat) {
    return LANGS[current].categories[cat] || cat;
  }

  function toggle() {
    current = current === 'en' ? 'zh' : 'en';
    localStorage.setItem(STORAGE_KEY, current);
    applyToDOM();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
  }

  function applyToDOM() {
    const lang = LANGS[current];
    document.documentElement.lang = lang.htmlLang;
    document.body.style.fontFamily = lang.fontFamily || '';
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang.label;
    document.querySelectorAll('[data-i18n-cat]').forEach(el => {
      el.textContent = catLabel(el.dataset.i18nCat);
    });
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = lang.strings[key];
      if (val && typeof val === 'string') el.textContent = val;
    });
    const fc = document.getElementById('footer-copy');
    if (fc) fc.textContent = lang.strings.footer_copy;
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyToDOM();
    document.getElementById('lang-toggle')?.addEventListener('click', toggle);
  });

  return { get, t, catLabel, toggle, applyToDOM };
})();
