// GoodVibe Quotes — app.js

const PEXELS_KEY = 'GLDWwN7wP8Fb9QrbXcm8kwRziSj3k1p335PrlTZQh3RehkjoxXGTtqQP';
const CACHE_PREFIX = 'gv_img_';
const CACHE_TTL = 24 * 60 * 60 * 1000;

const state = {
  quotes: [],
  currentCategory: 'All',
  currentQuote: null,
  hintDismissed: false,
};

const memCache = {};

async function loadQuotes() {
  const res = await fetch('quotes.json');
  const data = await res.json();
  const flat = [];
  Object.entries(data).forEach(([category, list]) => {
    list.forEach(item => flat.push({ ...item, category }));
  });
  state.quotes = flat;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function filteredQuotes() {
  if (state.currentCategory === 'All') return state.quotes;
  return state.quotes.filter(q => q.category === state.currentCategory);
}

async function getImageData(keywords) {
  const keyword = pickRandom(keywords);
  const cacheKey = CACHE_PREFIX + keyword;
  if (memCache[cacheKey]) return memCache[cacheKey];
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const { data, ts } = JSON.parse(stored);
      if (Date.now() - ts < CACHE_TTL) { memCache[cacheKey] = data; return data; }
    }
  } catch(e) {}
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&orientation=landscape&per_page=15`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) throw new Error('Pexels error');
    const json = await res.json();
    if (!json.photos || !json.photos.length) return null;
    const photo = pickRandom(json.photos);
    const data = {
      small: photo.src.medium,
      regular: photo.src.large2x,
      photographerName: photo.photographer,
      photographerUrl: photo.photographer_url,
      photoUrl: photo.url,
    };
    memCache[cacheKey] = data;
    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
    return data;
  } catch(e) { return null; }
}

function applyBlurUp(el, data) {
  if (!data) return;
  // Preload the small (blurred) image first, then apply it; finally preload the regular image and swap in
  const smallImg = new Image();
  smallImg.crossOrigin = 'anonymous';
  smallImg.onload = () => {
      // Use blur-to-clear transition (avoid scaling which caused a zoom effect)
      el.style.transition = 'filter 0.45s ease, background-image 0.3s ease';
      el.style.backgroundImage = `url('${data.small}')`;
      el.style.filter = 'blur(8px)';
    // preload regular
    const reg = new Image();
    reg.crossOrigin = 'anonymous';
    reg.onload = () => {
        // swap to the higher-res image then fade the blur away
        el.style.backgroundImage = `url('${data.regular}')`;
        // small timeout so browser has a chance to apply the new background before removing blur
        setTimeout(() => { el.style.filter = 'none'; }, 50);
    };
    reg.src = data.regular;
  };
  smallImg.onerror = () => {
    // if small fails, try regular directly
    const reg = new Image();
    reg.crossOrigin = 'anonymous';
    reg.onload = () => {
      el.style.backgroundImage = `url('${data.regular}')`;
      setTimeout(() => { el.style.filter = 'none'; }, 50);
    };
    reg.src = data.regular;
  };
  smallImg.src = data.small;
}

// Scroll helper that accounts for sticky header height
function getHeaderOffset() {
  const header = document.querySelector('.site-header');
  return header ? header.getBoundingClientRect().height : 0;
}

function scrollToElementWithOffset(el, padding = 12) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const y = window.pageYOffset + rect.top - getHeaderOffset() - padding;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

function setAttribution(data) {
  const el = document.getElementById('photo-credit');
  if (!el) return;
  if (!data) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = I18N.t('photo_by', data.photographerName, data.photographerUrl, 'https://www.pexels.com');
}

function fallbackGradient(category) {
  const gradients = {
    Motivation: 'linear-gradient(135deg,#f6941c,#e0524d)',
    Healing:    'linear-gradient(135deg,#8ec5fc,#e0c3fc)',
    Hustle:     'linear-gradient(135deg,#2c3e50,#4b6cb7)',
    Calm:       'linear-gradient(135deg,#a8e6cf,#3d84a8)',
  };
  return gradients[category] || 'linear-gradient(135deg,#333,#555)';
}

function getQuoteText(item) {
  const lang = I18N.get().code;
  if (lang === 'zh') return item.zh || item.quote;
  if (lang === 'zh-Hans') return item.zh_hans || item.zh || item.quote;
  return item.quote;
}

function getQuoteAuthor(item) {
  const lang = I18N.get().code;
  if (lang === 'zh') return item.zh_author || item.author || '';
  if (lang === 'zh-Hans') return item.zh_author_hans || item.zh_author || item.author || '';
  return item.author || '';
}

async function renderHero(item) {
  state.currentQuote = item;
  document.getElementById('quote-tag').textContent = I18N.catLabel(item.category);
  document.getElementById('quote-text').textContent = `\u201c${getQuoteText(item)}\u201d`;
  document.getElementById('quote-author').textContent = getQuoteAuthor(item);
  const bgEl = document.getElementById('quote-bg');
  bgEl.style.backgroundImage = '';
  bgEl.style.filter = 'none';
  bgEl.style.transform = 'scale(1)';
  bgEl.style.background = fallbackGradient(item.category);
  setAttribution(null);
  const data = await getImageData(item.keywords);
  applyBlurUp(bgEl, data);
  setAttribution(data);
  preloadNext();
}

function preloadNext() {
  const pool = filteredQuotes();
  if (pool.length < 2) return;
  const others = pool.filter(q => q !== state.currentQuote);
  getImageData(pickRandom(others).keywords);
}

function newRandomQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return;
  renderHero(pickRandom(pool));
}

function renderGrid() {
  const lang = I18N.get();
  const catLabel = I18N.catLabel(state.currentCategory);
  const titleEl = document.getElementById('grid-title');
  titleEl.textContent = state.currentCategory === 'All'
    ? I18N.t('grid_all')
    : I18N.t('grid_cat', catLabel);

  const grid = document.getElementById('quote-grid');
  grid.innerHTML = '';
  filteredQuotes().forEach(item => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.style.background = fallbackGradient(item.category);
    card.innerHTML = `
      <div class="grid-bg"></div>
      <div class="grid-overlay"></div>
      <div class="grid-content">
        <div class="grid-quote-text">\u201c${getQuoteText(item)}\u201d</div>
        <div class="grid-tag">${I18N.catLabel(item.category)}</div>
      </div>`;
    card.addEventListener('click', () => {
      renderHero(item);
      scrollToElementWithOffset(document.getElementById('quote-card'));
    });
    grid.appendChild(card);
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting) {
        const data = await getImageData(item.keywords);
        applyBlurUp(card.querySelector('.grid-bg'), data);
        observer.disconnect();
      }
    });
    observer.observe(card);
  });
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category;
      newRandomQuote();
      renderGrid();
      // scroll to the grid title so content is visible below the sticky header
      scrollToElementWithOffset(document.getElementById('grid-title'));
    });
  });
}

// Dismiss the tap hint after first tap on the card
function dismissHint() {
  if (state.hintDismissed) return;
  state.hintDismissed = true;
  const hint = document.getElementById('tap-hint');
  if (hint) hint.classList.add('hidden');
}

// Auto-dismiss hint after 4 seconds on first load
function scheduleHintAutoDismiss() {
  setTimeout(dismissHint, 4000);
}

function updateTapHintText() {
  const el = document.getElementById('tap-hint-text');
  if (!el) return;
  const code = I18N.get().code;
  if (code === 'zh') el.textContent = '點擊任意位置換一句';
  else if (code === 'zh-Hans') el.textContent = '点击任意位置换一句';
  else el.textContent = 'Tap anywhere for next quote';
}

function setupActions() {
  // Tap anywhere on the card → new quote (but not when clicking action buttons or photo credit)
  document.getElementById('quote-card').addEventListener('click', (e) => {
    if (e.target.closest('.quote-actions') || e.target.closest('.photo-credit')) return;
    dismissHint();
    newRandomQuote();
  });

  document.getElementById('btn-copy').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.currentQuote) return;
    const text = `\u201c${getQuoteText(state.currentQuote)}\u201d \u2014 ${getQuoteAuthor(state.currentQuote)}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy');
      const orig = btn.textContent;
      const code = I18N.get().code;
      if (code === 'zh') btn.textContent = '已複製！';
      else if (code === 'zh-Hans') btn.textContent = '已复制！';
      else btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
  document.getElementById('btn-download').addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQuoteImage();
  });

  // Set initial hint text and update on language change
  updateTapHintText();
  document.addEventListener('langchange', updateTapHintText);
}

async function downloadQuoteImage() {
  if (!state.currentQuote) return;
  const canvas = document.getElementById('export-canvas');
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1080;
  canvas.width = W; canvas.height = H;
  const bgEl = document.getElementById('quote-bg');
  const bgUrl = bgEl.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
  const code = I18N.get().code;
  const isZh = code === 'zh' || code === 'zh-Hans';

  function drawText() {
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.25)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = isZh ? '48px "Noto Serif SC", serif' : 'italic 48px Georgia';
    wrapText(ctx, `\u201c${getQuoteText(state.currentQuote)}\u201d`, W/2, H/2 - 40, W - 160, 60);
    ctx.font = isZh ? '28px "Noto Serif SC", serif' : '28px sans-serif';
    ctx.fillText(`\u2014 ${getQuoteAuthor(state.currentQuote)}`, W/2, H/2 + 160);
    const link = document.createElement('a');
    link.download = 'goodvibe-quote.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (bgUrl && bgUrl.startsWith('http')) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { ctx.drawImage(img, 0, 0, W, H); drawText(); };
    img.onerror = () => { ctx.fillStyle = '#333'; ctx.fillRect(0,0,W,H); drawText(); };
    img.src = bgUrl;
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#e0a458'); g.addColorStop(1, '#333');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H); drawText();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  words.forEach(w => {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w + ' '; }
    else line = test;
  });
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
}

// Re-render everything when language changes
document.addEventListener('langchange', () => {
  if (state.currentQuote) renderHero(state.currentQuote);
  renderGrid();
});

(async function init() {
  await loadQuotes();
  setupNav();
  setupActions();
  newRandomQuote();
  renderGrid();
  scheduleHintAutoDismiss();
})();
