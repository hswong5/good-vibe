// GoodVibe Daily — app.js
const state = {
  quotes: [],
  currentCategory: 'All',
  currentQuote: null,
  likes: JSON.parse(localStorage.getItem('gv_likes') || '{}'),
};

const imageCache = {};

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

function quoteKey(item) {
  return `${item.category}::${item.quote.slice(0, 30)}`;
}

function getLikes(item) {
  return state.likes[quoteKey(item)] || 0;
}

function toggleLike(item) {
  const key = quoteKey(item);
  const current = state.likes[key] || 0;
  // Toggle: if already liked (odd = liked), unlike; if even, like
  state.likes[key] = current % 2 === 0 ? current + 1 : current - 1;
  localStorage.setItem('gv_likes', JSON.stringify(state.likes));
}

async function getImageUrl(keywords) {
  const key = keywords.join('|');
  if (imageCache[key]) return imageCache[key];
  const query = encodeURIComponent(pickRandom(keywords));
  const url = `https://source.unsplash.com/featured/1600x900/?${query}`;
  imageCache[key] = url;
  return url;
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
  bgEl.style.background = fallbackGradient(item.category);
  const url = await getImageUrl(item.keywords);
  if (url) bgEl.style.backgroundImage = `url('${url}')`;
  // Update like button
  const liked = getLikes(item) % 2 !== 0;
  const likeBtn = document.getElementById('btn-like');
  const likeCount = document.getElementById('like-count');
  likeBtn.classList.toggle('liked', liked);
  likeBtn.innerHTML = `${liked ? '❤️' : '🤍'} <span id="like-count">${getLikes(item)}</span>`;
}

function newRandomQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return;
  renderHero(pickRandom(pool));
}

function renderGrid() {
  const grid = document.getElementById('quote-grid');
  const filtered = filteredQuotes();
  document.getElementById('grid-title').textContent =
    state.currentCategory === 'All' ? 'All Quotes' : `${state.currentCategory} Quotes`;
  const countEl = document.getElementById('grid-count');
  if (countEl) countEl.textContent = `${filtered.length} quotes`;
  grid.innerHTML = '';
  filtered.forEach(item => {
    const liked = getLikes(item) % 2 !== 0;
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.style.background = fallbackGradient(item.category);
    card.innerHTML = `
      <div class="grid-bg"></div>
      <div class="grid-overlay"></div>
      <div class="grid-content">
        <div class="grid-quote-text">"${item.quote}"</div>
        <div class="grid-footer">
          <div class="grid-tag">${item.category}</div>
          <button class="grid-like ${liked ? 'liked' : ''}" data-key="${quoteKey(item)}">${liked ? '❤️' : '🤍'} ${getLikes(item)}</button>
        </div>
      </div>`;
    card.querySelector('.grid-like').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(item);
      const btn = card.querySelector('.grid-like');
      const nowLiked = getLikes(item) % 2 !== 0;
      btn.className = `grid-like ${nowLiked ? 'liked' : ''}`;
      btn.innerHTML = `${nowLiked ? '❤️' : '🤍'} ${getLikes(item)}`;
      // Update hero if same quote
      if (state.currentQuote && quoteKey(state.currentQuote) === quoteKey(item)) {
        const likeBtn = document.getElementById('btn-like');
        likeBtn.classList.toggle('liked', nowLiked);
        likeBtn.innerHTML = `${nowLiked ? '❤️' : '🤍'} <span id="like-count">${getLikes(item)}</span>`;
      }
    });
    card.addEventListener('click', () => {
      renderHero(item);
      document.getElementById('quote-card').scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting) {
        const url = await getImageUrl(item.keywords);
        if (url) card.querySelector('.grid-bg').style.backgroundImage = `url('${url}')`;
        observer.disconnect();
      }
    });
    observer.observe(card);
  });
}

function setupNav() {
  // Header nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category;
      newRandomQuote();
      renderGrid();
    });
  });
  // Category cards
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      state.currentCategory = cat;
      document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.category === cat);
      });
      newRandomQuote();
      renderGrid();
      document.getElementById('quote-card').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function setupActions() {
  document.getElementById('btn-new').addEventListener('click', newRandomQuote);

  document.getElementById('btn-like').addEventListener('click', () => {
    if (!state.currentQuote) return;
    toggleLike(state.currentQuote);
    const liked = getLikes(state.currentQuote) % 2 !== 0;
    const btn = document.getElementById('btn-like');
    btn.classList.toggle('liked', liked);
    btn.innerHTML = `${liked ? '❤️' : '🤍'} <span id="like-count">${getLikes(state.currentQuote)}</span>`;
    renderGrid();
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    if (!state.currentQuote) return;
    const text = `"${state.currentQuote.quote}" — ${state.currentQuote.author}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy');
      const orig = btn.innerHTML;
      btn.innerHTML = '✅ Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
  });

  document.getElementById('btn-download').addEventListener('click', downloadQuoteImage);

  // Modal
  document.getElementById('btn-open-submit').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('open');
  });
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.remove('open');
  });
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
  document.getElementById('submit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('submit-form').style.display = 'none';
    document.getElementById('submit-success').style.display = 'block';
    setTimeout(() => {
      document.getElementById('modal-overlay').classList.remove('open');
      document.getElementById('submit-form').style.display = 'flex';
      document.getElementById('submit-success').style.display = 'none';
      document.getElementById('submit-form').reset();
    }, 3000);
  });
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
    ctx.font = '22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('goodvibedaily.com', W/2, H - 50);
    const link = document.createElement('a');
    link.download = 'goodvibedaily-quote.png';
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
    g.addColorStop(0, '#e0a458'); g.addColorStop(1, '#e05c8a');
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
