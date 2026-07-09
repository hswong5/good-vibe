// GoodVibe Quotes — i18n.js

const LANGS = {
  en: {
    code: 'en',
    label: 'EN',
    // toggle shows the label for the next language
    toggle: '繁',
    categories: { All: 'All', Motivation: 'Motivation', Healing: 'Healing', Hustle: 'Hustle', Calm: 'Calm' },
    strings: {
      btn_copy: 'Copy',
      btn_download: 'Save Image',
      nav_about: 'About',
      nav_privacy: 'Privacy Policy',
      nav_contact: 'Contact',
      grid_all: 'All Quotes',
      grid_cat: '{0} Quotes',
      photo_by: 'Photo by <a href="{1}" target="_blank">{0}</a> on <a href="{2}" target="_blank">Pexels</a>',
    },
  },
  zh: {
    // keep `zh` as the Traditional Chinese (繁體) variant used in the repo
    code: 'zh',
    label: '繁體',
    toggle: '簡',
    categories: { All: '全部', Motivation: '勵志', Healing: '療癒', Hustle: '奮鬥', Calm: '寧靜' },
    strings: {
      btn_copy: '複製',
      btn_download: '儲存圖片',
      nav_about: '關於',
      nav_privacy: '隱私政策',
      nav_contact: '聯繫我們',
      grid_all: '全部名言',
      grid_cat: '{0}名言',
      photo_by: '照片來自 <a href="{1}" target="_blank">{0}</a>，發布於 <a href="{2}" target="_blank">Pexels</a>',
    },
  },
  'zh-Hans': {
    // Simplified Chinese variant. Content will fall back to Traditional strings
    code: 'zh-Hans',
    label: '简体',
    toggle: 'EN',
    categories: { All: '全部', Motivation: '励志', Healing: '疗愈', Hustle: '奋斗', Calm: '宁静' },
    strings: {
      btn_copy: '复制',
      btn_download: '保存图片',
      nav_about: '关于',
      nav_privacy: '隐私政策',
      nav_contact: '联系我们',
      grid_all: '全部名言',
      grid_cat: '{0}名言',
      photo_by: '照片来自 <a href="{1}" target="_blank">{0}</a>，发布于 <a href="{2}" target="_blank">Pexels</a>',
    },
  },
};

const I18N = (() => {
  // language order for cycling: English -> Traditional Chinese -> Simplified Chinese
  const order = ['en', 'zh', 'zh-Hans'];
  let current = 'en';

  function get() { return LANGS[current]; }

  function t(key, ...args) {
    let str = LANGS[current].strings[key] || key;
    args.forEach((a, i) => { str = str.replace(`{${i}}`, a); });
    return str;
  }

  function catLabel(cat) {
    return LANGS[current].categories[cat] || cat;
  }

  function apply() {
    const lang = LANGS[current];
    // Toggle button
    const toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.textContent = lang.toggle;
    // Nav category buttons
    document.querySelectorAll('[data-i18n-cat]').forEach(el => {
      const cat = el.dataset.i18nCat;
      el.textContent = lang.categories[cat] || cat;
    });
    // data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = lang.strings[key] || key;
    });
    document.documentElement.lang = current;
  }

  function toggle() {
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    current = next;
    apply();
    document.dispatchEvent(new CustomEvent('langchange'));
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.addEventListener('click', toggle);
  });

  return { get, t, catLabel };
})();
