// i18n.js — lightweight language manager

const LANGS = {
  en: {
    code: 'en',
    label: '\u4e2d\u6587',
    htmlLang: 'en',
    fontFamily: '',
    categories: { All: 'All', Motivation: 'Motivation', Healing: 'Healing', Hustle: 'Hustle', Calm: 'Calm' },
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
    label: 'EN',
    htmlLang: 'zh-Hant',
    fontFamily: "'Noto Serif SC', serif",
    categories: { All: '\u5168\u90e8', Motivation: '\u52d5\u529b', Healing: '\u7642\u7652', Hustle: '\u62fc\u640f', Calm: '\u975c\u5fc3' },
    strings: {
      btn_new: '\u63db\u4e00\u53e5',
      btn_copy: '\u8907\u88fd',
      btn_download: '\u5132\u5b58\u5716\u7247',
      grid_all: '\u6240\u6709\u8a9e\u9304',
      grid_cat: (cat) => `${cat}\u8a9e\u9304`,
      photo_by: (name, pUrl, pexelsUrl) =>
        `\u76f8\u7247\u7531 <a href="${pUrl}" target="_blank" rel="noopener">${name}</a> \u63d0\u4f9b\uff0c\u4f86\u81ea <a href="${pexelsUrl}" target="_blank" rel="noopener">Pexels</a>`,
      nav_about: '\u95dc\u65bc',
      nav_privacy: '\u79c1\u96b1\u653f\u7b56',
      nav_contact: '\u806f\u7d61\u6211\u5011',
      footer_copy: '\u00a9 2026 GoodVibe Quotes. \u6240\u6709\u8a9e\u9304\u5747\u70ba\u8afa\u8a9e\u3001\u50b3\u7d71\u683c\u8a00\u6216\u6b77\u53f2\u4e0a\u7684\u516c\u6709\u9818\u57df\u540d\u53e5\u3002',
    },
  },
};

const I18N = (() => {
  const STORAGE_KEY = 'gv_lang';
  // Read saved lang synchronously — no DOMContentLoaded needed
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

  function toggle() {
    current = current === 'en' ? 'zh' : 'en';
    localStorage.setItem(STORAGE_KEY, current);
    applyToDOM();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
  }

  // wireToggle called explicitly by app.js after DOM is ready
  function wireToggle() {
    document.getElementById('lang-toggle')?.addEventListener('click', toggle);
  }

  return { get, t, catLabel, applyToDOM, wireToggle };
})();
