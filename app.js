// GoodVibe Quotes — app.js

const UNSPLASH_KEY = 'BeiZCxytv05mSYWinomK2fkvxApldAMOd8uYu0iVgXk';
const CACHE_PREFIX = 'gv_img_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const state = {
  quotes: [],
  currentCategory: 'All',
  currentQuote: null,
};

const memCache = {}; // { keyword: { small, regular } }

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

// Returns { small, regular } URLs — checks cache first
async function getImageUrls(keywords) {
  const keyword = pickRandom(keywords);
  const cacheKey = CACHE_PREFIX + keyword;

  if (memCache[cacheKey]) return memCache[cacheKey];

  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const { urls, ts } = JSON.parse(stored);
      if (Date.now() - ts < CACHE_TTL) {
        memCache[cacheKey] = urls;
        return urls;
      }
    }
  } catch(e) {}

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    if (!res.ok) throw new Error('Unsplash error');
    const data = await res.json();
    const urls = { small: data.urls.small, regular: data.urls.regular };
    memCache[cacheKey] = urls;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ urls, ts: Date.now() }));
    } catch(e) {}
    return urls;
  } catch(e) {
    return null;
  }
}

// Blur-up: show small instantly, swap to regular when loaded
function applyBlurUp(el, urls) {
  if (!urls) return;
  // Step 1: show small (blurry) immediately
  el.style.backgroundImage = `url('${urls.small}')`;
  el.style.filter = 'blur(8px)';
  el.style.transform = 'scale(1.04)';
  el.style.transition = 'filter 0.5s ease, transform 0.5s ease';
  // Step 2: load full-res in background, swap when ready
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url('${urls.regular}')`;
    el.style.filter = 'none';
    el.style.transform = 'scale(1)';
  };
  img.src = urls.regular;
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

async function renderHero(item, preloadedUrls) {
  state.currentQuote = item;
  document.getElementById('quote-tag').textContent = item.category;
  document.getElementById('quote-text').textContent = `"${item.quote}"`;
  document.getElementById('quote-author').textContent = item.author || '';
  const bgEl = document.getElementById('quote-bg');
  // Instantly show gradient
  bgEl.style.backgroundImage = '';
  bgEl.style.filter = 'none';
  bgEl.style.transform = 'scale(1)';
  bgEl.style.background = fallbackGradient(item.category);
  // Use preloaded urls if available, else fetch
  const urls = preloadedUrls || await getImageUrls(item.keywords);
  applyBlurUp(bgEl, urls);
  // Preload next random quote's photo in background
  preloadNext();
}

function preloadNext() {
  const pool = filteredQuotes();
  if (pool.length < 2) return;
  // Pick a random quote that isn't the current one
  const others = pool.filter(q => q !== state.currentQuote);
  const next = pickRandom(others);
  // Fire and forget — just warms up the cache
  getImageUrls(next.keywords);
}

function newRandomQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return;
  renderHero(pickRandom(pool));
}

function renderGrid() {
  const grid = document.getElementById('quote-grid');
  document.getElementById('grid-title').textContent =
    state.currentCategory === 'All' ? 'All Quotes' : `${state.currentCategory} Quotes`;
  grid.innerHTML = '';
  filteredQuotes().forEach(item => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.style.background = fallbackGradient(item.category);
    card.innerHTML = `
      <div class="grid-bg"></div>
      <div class="grid-overlay"></div>
      <div class="grid-content">
        <div class="grid-quote-text">"${item.quote}"</div>
        <div class="grid-tag">${item.category}</div>
      </div>`;
    card.addEventListener('click', () => {
      renderHero(item);
      document.getElementById('quote-card').scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting) {
        const urls = await getImageUrls(item.keywords);
        applyBlurUp(card.querySelector('.grid-bg'), urls);
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
    });
  });
}

function setupActions() {
  document.getElementById('btn-new').addEventListener('click', newRandomQuote);
  document.getElementById('btn-copy').addEventListener('click', () => {
    if (!state.currentQuote) return;
    const text = `"${state.currentQuote.quote}" — ${state.currentQuote.author}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
  document.getElementById('btn-download').addEventListener('click', downloadQuoteImage);
}

async function downloadQuoteImage() {
  if (!state.currentQuote) return;
  const canvas = document.getElementById('export-canvas');
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1080;
  canvas.width = W; canvas.height = H;
  const bgEl = document.getElementById('quote-bg');
  const bgUrl = bgEl.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');

  function drawText() {
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.25)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'italic 48px Georgia';
    wrapText(ctx, `"${state.currentQuote.quote}"`, W/2, H/2 - 40, W - 160, 60);
    ctx.font = '28px sans-serif';
    ctx.fillText(`— ${state.currentQuote.author || ''}`, W/2, H/2 + 160);
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

(async function init() {
  await loadQuotes();
  setupNav();
  setupActions();
  newRandomQuote();
  renderGrid();
})();
