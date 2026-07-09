// GoodVibe Quotes — app.js

const PEXELS_KEY = 'GLDWwN7wP8Fb9QrbXcm8kwRziSj3k1p335PrlTZQh3RehkjoxXGTtqQP';
const CACHE_PREFIX = 'gv_img_';
const CACHE_TTL = 24 * 60 * 60 * 1000;

const state = {
  quotes: [],
  currentCategory: 'All',
  currentQuote: null,
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

// Returns { small, regular, photographerName, photographerUrl } via Pexels
async function getImageData(keywords) {
  const keyword = pickRandom(keywords);
  const cacheKey = CACHE_PREFIX + keyword;

  if (memCache[cacheKey]) return memCache[cacheKey];

  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const { data, ts } = JSON.parse(stored);
      if (Date.now() - ts < CACHE_TTL) {
        memCache[cacheKey] = data;
        return data;
      }
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
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
    } catch(e) {}
    return data;
  } catch(e) {
    return null;
  }
}

// Blur-up: show small instantly, swap to full-res when loaded
function applyBlurUp(el, data) {
  if (!data) return;
  el.style.backgroundImage = `url('${data.small}')`;
  el.style.filter = 'blur(8px)';
  el.style.transform = 'scale(1.04)';
  el.style.transition = 'filter 0.5s ease, transform 0.5s ease';
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url('${data.regular}')`;
    el.style.filter = 'none';
    el.style.transform = 'scale(1)';
  };
  img.src = data.regular;
}

function setAttribution(data) {
  const el = document.getElementById('photo-credit');
  if (!el) return;
  if (!data) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = `Photo by <a href="${data.photographerUrl}" target="_blank" rel="noopener">${data.photographerName}</a> on <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>`;
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

async function renderHero(item) {
  state.currentQuote = item;
  document.getElementById('quote-tag').textContent = item.category;
  document.getElementById('quote-text').textContent = `"${item.quote}"`;
  document.getElementById('quote-author').textContent = item.author || '';
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
