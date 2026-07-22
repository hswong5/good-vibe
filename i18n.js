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
      btn_prev: 'Prev',
      btn_download: 'Save Image',
      grid_load_more: 'Load More',
      nav_about: 'About',
      nav_privacy: 'Privacy Policy',
      nav_contact: 'Contact',
      grid_all: 'All Quotes',
      grid_cat: '{0} Quotes',
      nav_quotes: 'Quotes',
      nav_blog: 'Blog',
      nav_meditate: 'Meditate',
      nav_journal: 'Journal',
      nav_progress: 'Progress',
      btn_start: 'Start',
      btn_pause: 'Pause',
      btn_resume: 'Resume',
      btn_reset: 'Reset',
      btn_save_session: 'Save session',
      btn_add_entry: 'Add entry',
      mood_calm: 'Calm',
      mood_grateful: 'Grateful',
      mood_focused: 'Focused',
      mood_tired: 'Tired',
      mood_anxious: 'Anxious',
      filter_all: 'All',
      min_custom: 'Custom',
      photo_by: 'Photo by <a href="{1}" target="_blank">{0}</a> on <a href="{2}" target="_blank">Pexels</a>',
    },
  },
  zh: {
    // keep `zh` as the Traditional Chinese (繁體) variant used in the repo
    code: 'zh',
    label: '繁',
    toggle: '簡',
    categories: { All: '全部', Motivation: '勵志', Healing: '療癒', Hustle: '奮鬥', Calm: '寧靜' },
    strings: {
      btn_copy: '複製',
      btn_prev: '返回',
      btn_download: '儲存圖片',
      grid_load_more: '顯示更多',
      nav_about: '關於',
      nav_privacy: '隱私政策',
      nav_contact: '聯繫我們',
      grid_all: '全部名言',
      grid_cat: '{0}名言',
      nav_quotes: '名言',
      nav_blog: '網誌',
      nav_meditate: '冥想',
      nav_journal: '日誌',
      nav_progress: '進度',
      btn_start: '開始',
      btn_pause: '暫停',
      btn_resume: '繼續',
      btn_reset: '重設',
      btn_save_session: '儲存練習',
      btn_add_entry: '新增紀錄',
      mood_calm: '平靜',
      mood_grateful: '感恩',
      mood_focused: '專注',
      mood_tired: '疲憊',
      mood_anxious: '焦慮',
      filter_all: '全部',
      min_custom: '自訂',
      photo_by: '照片來自 <a href="{1}" target="_blank">{0}</a>，發布於 <a href="{2}" target="_blank">Pexels</a>',
    },
  },
  'zh-Hans': {
    // Simplified Chinese variant. Content will fall back to Traditional strings
    code: 'zh-Hans',
    label: '簡',
    toggle: 'EN',
    categories: { All: '全部', Motivation: '励志', Healing: '疗愈', Hustle: '奋斗', Calm: '宁静' },
    strings: {
      btn_copy: '复制',
      btn_prev: '返回',
      btn_download: '保存图片',
      grid_load_more: '显示更多',
      nav_about: '关于',
      nav_privacy: '隐私政策',
      nav_contact: '联系我们',
      grid_all: '全部名言',
      grid_cat: '{0}名言',
      nav_quotes: '名言',
      nav_blog: '博客',
      nav_meditate: '冥想',
      nav_journal: '日志',
      nav_progress: '进度',
      btn_start: '开始',
      btn_pause: '暂停',
      btn_resume: '继续',
      btn_reset: '重置',
      btn_save_session: '保存练习',
      btn_add_entry: '新增记录',
      mood_calm: '平静',
      mood_grateful: '感恩',
      mood_focused: '专注',
      mood_tired: '疲惫',
      mood_anxious: '焦虑',
      filter_all: '全部',
      min_custom: '自定义',
      photo_by: '照片来自 <a href="{1}" target="_blank">{0}</a>，发布于 <a href="{2}" target="_blank">Pexels</a>',
    },
  },
};

const I18N = (() => {
  // language order for cycling: English -> Traditional Chinese -> Simplified Chinese
  const order = ['en', 'zh', 'zh-Hans'];
  const STORAGE_KEY = 'gv_lang';
  let current = localStorage.getItem(STORAGE_KEY) || 'en';
  if (!LANGS[current]) current = 'en';

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
    // Update language buttons state (if present)
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const code = btn.dataset.lang;
      btn.textContent = LANGS[code] ? LANGS[code].label : code;
      if (code === current) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
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

  function setLang(code) {
    if (!LANGS[code]) return;
    current = code;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent('langchange'));
  }

  function bindLangButtons() {
    apply();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  // Bind when DOM ready AND whenever header re-injects controls
  document.addEventListener('DOMContentLoaded', bindLangButtons);
  document.addEventListener('headerready', bindLangButtons);
  if (document.readyState !== 'loading') bindLangButtons();

  return { get, t, catLabel, setLang, apply };
})();
