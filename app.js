// GoodVibe Quotes — app.js
// Set your own free Unsplash Access Key at https://unsplash.com/developers
const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY';

const state = {
  quotes: [],          // flattened list: {quote, author, category, keywords}
  currentCategory: 'All',
  currentQuote: null,
};

const imageCache = {}; // keyword -> image url (session cache to save API calls)

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

// --- Unsplash image fetching with graceful fallback ---
async function getImageUrl(keywords) {
  const key = keywords.join('|');
  if (imageCache[key]) return imageCache[key];

  // Fallback gradient placeholder if no API key configured or request fails
  const fallback = null;

  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    return fallback;
  }

  const query = encodeURIComponent(pickRandom(keywords));
  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`);
    if (!res.ok) throw new Error('Unsplash request failed');
    const data = await res.json();
    const url = data.urls && data.urls.regular;
    imageCache[key] = url;
    return url;
  } catch (err) {
    console.warn('Unsplash fetch failed, using fallback', err);
    return fallback;
  }
}

// Deterministic pleasant gradient fallback based on category
function fallbackGradient(category) {
  const gradients = {
    Motivation: 'linear-gradient(135deg,#f6941c,#e0524d)',
    Healing: 'linear-gradient(135deg,#8ec5fc,#e0c3fc)',
    Hustle: 'linear-gradient(135deg,#2c3e50,#4b6cb7)',
    Calm: 'linear-gradient(135deg,#a8e6cf,#3d84a8)',
  };
  return gradients[category] || 'linear-gradient(135deg,#333,#555)';
}

// --- Hero card rendering ---
async function renderHero(item) {
  state.currentQuote = item;
  document.getElementById('quote-tag').textContent = item.category;
  document.getElementById('quote-text').textContent = `"${item.quote}"`;
  document.getElementById('quote-author').textContent = item.author || '';

  const bgEl = document.getElementById('quote-bg');
  bgEl.style.backgroundImage = '';
  bgEl.style.background = fallbackGradient(item.category);

  const url = await getImageUrl(item.keywords);
  if (url) {
    bgEl.style.backgroundImage = `url('${url}')`;
  }
}

function newRandomQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return;
  const item = pickRandom(pool);
  renderHero(item);
}

// --- Grid rendering ---
function renderGrid() {
  const grid = document.getElementById('quote-grid');
  const title = document.getElementById('grid-title');
  title.textContent = state.currentCategory === 'All' ? 'All Quotes' : `${state.currentCategory} Quotes`;
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
      </div>
    `;
    card.addEventListener('click', () => {
      renderHero(item);
      document.getElementById('quote-card').scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);

    // Lazy-load background image only when card is visible (saves Unsplash quota)
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting) {
        const url = await getImageUrl(item.keywords);
        if (url) {
          card.querySelector('.grid-bg').style.backgroundImage = `url('${url}')`;
        }
        observer.disconnect();
      }
    });
    observer.observe(card);
  });
}

// --- Nav handling ---
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

// --- Actions: copy / download ---
function setupActions() {
  document.getElementById('btn-new').addEventListener('click', newRandomQuote);

  document.getElementById('btn-copy').addEventListener('click', () => {
    if (!state.currentQuote) return;
    const text = `"${state.currentQuote.quote}" — ${state.currentQuote.author}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy');
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    });
  });

  document.getElementById('btn-download').addEventListener('click', downloadQuoteImage);
}

async function downloadQuoteImage() {
  if (!state.currentQuote) return;
  const canvas = document.getElementById('export-canvas');
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1080;
  canvas.width = W;
  canvas.height = H;

  // Background: try to draw the actual bg image, else gradient
  const bgEl = document.getElementById('quote-bg');
  const bgImageUrl = bgEl.style.backgroundImage.slice(5, -2); // extract url(...) content

  function drawTextAndDownload() {
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.25)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'italic 48px Georgia';
    wrapText(ctx, `"${state.currentQuote.quote}"`, W / 2, H / 2 - 40, W - 160, 60);

    ctx.font = '28px -apple-system, sans-serif';
    ctx.fillText(`— ${state.currentQuote.author || ''}`, W / 2, H / 2 + 160);

    const link = document.createElement('a');
    link.download = 'goodvibe-quote.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (bgImageUrl && bgImageUrl.startsWith('http')) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      drawTextAndDownload();
    };
    img.onerror = () => {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, W, H);
      drawTextAndDownload();
    };
    img.src = bgImageUrl;
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#e0a458');
    grad.addColorStop(1, '#333');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    drawTextAndDownload();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  words.forEach(word => {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line);
      line = word + ' ';
    } else {
      line = testLine;
    }
  });
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
}

// --- Init ---
(async function init() {
  await loadQuotes();
  setupNav();
  setupActions();
  newRandomQuote();
  renderGrid();
})();
