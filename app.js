// GoodVibe Quotes — app.js

const PEXELS_PROXY = 'https://rjtbagfuuijgiemtpnlm.supabase.co/functions/v1/pexels-proxy';
const SUPABASE_ANON_KEY = 'sb_publishable_xWqySzc3hIPkn_46WbcmOQ_yAG-4Ulu';
const CACHE_PREFIX = 'gv_img_';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const PEXELS_TIMEOUT_MS = 3500;
const PEXELS_COOLDOWN_MS = 5 * 60 * 1000;
const PEXELS_AUTH_FAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DAILY_QUOTE_KEY = 'gv_daily_quote';

const state = {
  quotes: [],
  currentCategory: 'All',
  currentQuote: null,
  hintDismissed: false,
  imageSizePref: 'auto',
  lastQuote: null,
  gridRenderedCount: 0,
};

const memCache = {};
const inFlightCache = {};
const proxyHealth = {
  consecutiveFailures: 0,
  cooldownUntil: 0,
};

function fallbackImageData(keyword) {
  const seed = encodeURIComponent((keyword || 'inspiration').toLowerCase());
  return {
    small: `https://picsum.photos/seed/${seed}-small/480/320`,
    regular: `https://picsum.photos/seed/${seed}-regular/1400/1000`,
    photographerName: 'Lorem Picsum',
    photographerUrl: 'https://picsum.photos/',
    photoUrl: 'https://picsum.photos/',
  };
}

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

try {
  const storedCooldown = Number(localStorage.getItem('gv_pexels_cooldown_until') || '0');
  if (storedCooldown > Date.now()) proxyHealth.cooldownUntil = storedCooldown;
} catch (e) {}

async function loadQuotes() {
  try {
    const res = await fetch('quotes.json?v=2');
    if (!res.ok) throw new Error('Failed to load quotes');
    const data = await res.json();
    const flat = [];
    Object.entries(data).forEach(([category, list]) => {
      list.forEach(item => flat.push({ ...item, category }));
    });
    state.quotes = flat;
  } catch(e) {
    const el = document.getElementById('quote-text');
    if (el) el.textContent = 'Could not load quotes. Please refresh the page.';
    throw e;
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function filteredQuotes() {
  if (state.currentCategory === 'All') return state.quotes;
  return state.quotes.filter(q => q.category === state.currentCategory);
}

function brightnessFromHex(hex) {
  if (!hex) return 255;
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return 255;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function makeQuoteSeed(item) {
  if (!item) return '';
  const base = [item.quote || '', item.author || '', item.category || ''].join('|').toLowerCase();
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h << 5) - h + base.charCodeAt(i);
  return String(Math.abs(h));
}

function buildImageQueryMeta(keywords, quoteSeed) {
  const cleaned = (Array.isArray(keywords) ? keywords : [])
    .map(k => String(k || '').trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(cleaned)].slice(0, 3);
  if (!unique.length) unique.push('inspiration');

  const queryKeyword = unique.join(' ');
  const cacheParts = [unique.join('|')];
  if (quoteSeed) cacheParts.push(String(quoteSeed));
  const cacheSuffix = cacheParts.join('::');
  const fallbackSeed = cacheSuffix.replace(/::/g, '-').replace(/\|/g, '-').replace(/\s+/g, '-');

  return { queryKeyword, cacheSuffix, fallbackSeed };
}

async function getImageData(keywords, quoteSeed = '') {
  const { queryKeyword, cacheSuffix, fallbackSeed } = buildImageQueryMeta(keywords, quoteSeed);
  const sizePref = state.imageSizePref || 'auto';
  const cacheKey = CACHE_PREFIX + cacheSuffix + '::' + sizePref;
  if (memCache[cacheKey]) return memCache[cacheKey];
  if (inFlightCache[cacheKey]) return inFlightCache[cacheKey];

  // If proxy recently failed repeatedly, fail fast to avoid UI lag.
  if (Date.now() < proxyHealth.cooldownUntil) {
    return fallbackImageData(fallbackSeed);
  }

  const fetchPromise = (async () => {
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const { data, ts } = JSON.parse(stored);
      if (Date.now() - ts < CACHE_TTL) { memCache[cacheKey] = data; return data; }
    }
  } catch(e) {}
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PEXELS_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(
        `${PEXELS_PROXY}?query=${encodeURIComponent(queryKeyword)}&per_page=8`,
        {
          signal: controller.signal,
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[GoodVibe] Pexels proxy HTTP', res.status, errText.slice(0, 200));
      // Unauthorized API key means further attempts are unlikely to succeed soon.
      if (res.status === 401 || /invalid api key|unauthorized/i.test(errText)) {
        proxyHealth.cooldownUntil = Date.now() + PEXELS_AUTH_FAIL_COOLDOWN_MS;
        try { localStorage.setItem('gv_pexels_cooldown_until', String(proxyHealth.cooldownUntil)); } catch (e) {}
      }
      throw new Error('Pexels error ' + res.status);
    }
    const json = await res.json();
    if (json.error) {
      console.warn('[GoodVibe] Pexels proxy error payload', json);
      return fallbackImageData(fallbackSeed);
    }
    if (!json.photos || !json.photos.length) return fallbackImageData(fallbackSeed);
    const darkSortedPhotos = json.photos
      .filter(photo => photo.avg_color)
      .sort((a, b) => brightnessFromHex(a.avg_color) - brightnessFromHex(b.avg_color));
    const photo = (darkSortedPhotos.length && brightnessFromHex(darkSortedPhotos[0].avg_color) < 180)
      ? darkSortedPhotos[0]
      : pickRandom(json.photos);
    // Try to use cached small image dataURL (stored by photo.id)
    const smallKey = `gv_img_data_${photo.id}`;
    let smallData = null;
    try { smallData = localStorage.getItem(smallKey); } catch (e) { smallData = null; }
    // Choose sizes adaptively or according to user's preference
    const effectiveType = (navigator.connection && navigator.connection.effectiveType) ? navigator.connection.effectiveType : '4g';
    const dpr = window.devicePixelRatio || 1;
    const smallCandidate = photo.src.small || photo.src.tiny || photo.src.medium;
    // determine regularCandidate based on preference
    let regularCandidate;
    if (state.imageSizePref && state.imageSizePref !== 'auto') {
      const pref = state.imageSizePref;
      regularCandidate = photo.src[pref] || photo.src.large || photo.src.medium;
    } else {
      if (effectiveType.includes('2g') || effectiveType === 'slow-2g') regularCandidate = photo.src.medium;
      else if (effectiveType.includes('3g')) regularCandidate = photo.src.large;
      else if (dpr > 1.5) regularCandidate = photo.src.large2x;
      else regularCandidate = photo.src.large;
    }
    const data = {
      small: smallData || smallCandidate,
      _smallUrl: smallCandidate,
      regular: regularCandidate,
      photographerName: photo.photographer,
      photographerUrl: photo.photographer_url,
      photoUrl: photo.url,
    };
    memCache[cacheKey] = data;
    proxyHealth.consecutiveFailures = 0;
    try { localStorage.removeItem('gv_pexels_cooldown_until'); } catch (e) {}
    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
    // If we don't have the small image dataURL cached, fetch and store it asynchronously (limit attempts)
    if (!smallData) {
      (async () => {
        try {
          const r = await fetch(smallCandidate);
          if (!r.ok) return;
          const blob = await r.blob();
          const reader = new FileReader();
          reader.onload = () => {
            try {
              localStorage.setItem(smallKey, reader.result);
              // maintain list of cached keys (limit to 30)
              const listKey = 'gv_img_data_keys';
              let keys = [];
              try { keys = JSON.parse(localStorage.getItem(listKey) || '[]'); } catch(e) { keys = []; }
              keys = keys.filter(k => k !== smallKey);
              keys.unshift(smallKey);
              while (keys.length > 30) {
                const rem = keys.pop();
                try { localStorage.removeItem(rem); } catch(e) {}
              }
              try { localStorage.setItem(listKey, JSON.stringify(keys)); } catch(e) {}
            } catch(e) {}
          };
          reader.readAsDataURL(blob);
        } catch(e) {}
      })();
    }
    return data;
  } catch(e) {
    proxyHealth.consecutiveFailures += 1;
    if (proxyHealth.consecutiveFailures >= 2) {
      proxyHealth.cooldownUntil = Date.now() + PEXELS_COOLDOWN_MS;
      try { localStorage.setItem('gv_pexels_cooldown_until', String(proxyHealth.cooldownUntil)); } catch (e2) {}
    }
    console.warn('[GoodVibe] getImageData failed', e);
    return fallbackImageData(fallbackSeed);
  }
  })();

  inFlightCache[cacheKey] = fetchPromise;
  try {
    return await fetchPromise;
  } finally {
    delete inFlightCache[cacheKey];
  }
}

function applyBlurUp(el, data) {
  if (!data) return Promise.resolve();
  return new Promise((resolve) => {
  if (prefersReducedMotion()) {
    const lowReduced = el.querySelector('.bg-low');
    const highReduced = el.querySelector('.bg-high');
    if (lowReduced && highReduced) {
      lowReduced.style.opacity = '0';
      highReduced.style.backgroundImage = `url('${data.regular}')`;
      highReduced.style.opacity = '1';
      resolve();
      return;
    }
  }
  // If element contains layered children (.bg-low and .bg-high), use crossfade technique
  const low = el.querySelector('.bg-low');
  const high = el.querySelector('.bg-high');
  if (low && high) {
    // apply low-res blurred image first
    low.style.backgroundImage = `url('${data.small}')`;
    low.style.opacity = '1';
    low.style.filter = 'blur(8px)';
    // preload high-res
    const reg = new Image();
    reg.onload = () => {
      // set high-res then fade it in quickly; hide low-res shortly after
      high.style.backgroundImage = `url('${data.regular}')`;
      high.style.opacity = '0';
      requestAnimationFrame(() => { high.style.opacity = '1'; });
      // fade out low shortly after high begins to appear to avoid visible reflow
      setTimeout(() => { low.style.opacity = '0'; resolve(); }, 80);
    };
    reg.onerror = () => {
      // fallback: show regular directly on high layer
      high.style.backgroundImage = `url('${data.regular}')`;
      high.style.opacity = '1';
      low.style.opacity = '0';
      resolve();
    };
    reg.src = data.regular;
    return;
  }
  // Legacy fallback: single-element behavior
  const smallImg = new Image();
  smallImg.onload = () => {
    el.style.transition = 'filter 0.45s ease, background-image 0.3s ease';
    el.style.backgroundImage = `url('${data.small}')`;
    el.style.filter = 'blur(8px)';
    const reg = new Image();
    reg.onload = () => {
      el.style.backgroundImage = `url('${data.regular}')`;
      setTimeout(() => { el.style.filter = 'none'; resolve(); }, 50);
    };
    reg.src = data.regular;
  };
  smallImg.onerror = () => {
    const reg = new Image();
    reg.onload = () => {
      el.style.backgroundImage = `url('${data.regular}')`;
      setTimeout(() => { el.style.filter = 'none'; resolve(); }, 50);
    };
    reg.src = data.regular;
  };
  smallImg.src = data.small;
  });
}

// Scroll helper — match first-load layout (sticky bar + main top padding)
function getHeaderOffset() {
  const mount = document.getElementById('site-header-mount');
  if (mount) return mount.offsetHeight || mount.getBoundingClientRect().height;
  const header = document.querySelector('.site-header');
  const filter = document.getElementById('filter-nav') || document.querySelector('.filter-nav');
  const h = header ? (header.offsetHeight || header.getBoundingClientRect().height) : 0;
  const f = filter ? (filter.offsetHeight || filter.getBoundingClientRect().height) : 0;
  return h + f;
}

function getMainTopPadding() {
  const main = document.querySelector('main');
  if (!main) return 0;
  return parseFloat(getComputedStyle(main).paddingTop) || 0;
}

function scrollToElementWithOffset(el, padding, behavior = 'smooth') {
  if (!el) return;
  // Default gap = main padding-top so position matches opening the page at scroll 0
  const gap = (padding === undefined || padding === null) ? getMainTopPadding() : padding;
  const offset = getHeaderOffset() + gap;
  const rect = el.getBoundingClientRect();
  const y = window.pageYOffset + rect.top - offset;
  const targetY = Math.max(0, y);
  const distance = Math.abs(window.scrollY - targetY);
  const resolvedBehavior = behavior === 'smart'
    ? (distance > 1200 ? 'auto' : 'smooth')
    : behavior;
  window.scrollTo({ top: targetY, behavior: resolvedBehavior });
}

function setAttribution(data) {
  const el = document.getElementById('photo-credit');
  if (!el) return;
  if (!data) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = I18N.t('photo_by', data.photographerName, data.photographerUrl, 'https://www.pexels.com');
}

function showHeroStatus(show, key = 'image_fallback_msg') {
  const status = document.getElementById('hero-status');
  const text = document.getElementById('hero-status-text');
  if (!status || !text) return;
  status.classList.toggle('show', !!show);
  if (show) text.textContent = I18N.t(key);
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
  // remember previous quote for "Prev" functionality
  if (state.currentQuote && state.currentQuote !== item) state.lastQuote = state.currentQuote;
  state.currentQuote = item;
  const quoteCardEl = document.getElementById('quote-card');
  // Show tag immediately, but wait to display text/author until background image is ready
  document.getElementById('quote-tag').textContent = I18N.catLabel(item.category);
  const quoteTextEl = document.getElementById('quote-text');
  const quoteAuthorEl = document.getElementById('quote-author');
  if (quoteCardEl) quoteCardEl.classList.add('is-loading');
  showHeroStatus(false);
  // display text immediately with low-res background for faster perceived load
  quoteTextEl.textContent = `\u201c${getQuoteText(item)}\u201d`;
  quoteAuthorEl.textContent = getQuoteAuthor(item);
  const bgEl = document.getElementById('quote-bg');
  // reset layers if present
  const low = bgEl.querySelector('.bg-low');
  const high = bgEl.querySelector('.bg-high');
  if (low) { low.style.opacity = '0'; low.style.backgroundImage = ''; low.style.filter = '' }
  if (high) { high.style.opacity = '0'; high.style.backgroundImage = '' }
  bgEl.style.background = fallbackGradient(item.category);
  setAttribution(null);
  const data = await getImageData(item.keywords, makeQuoteSeed(item));
  // apply blur-up; do not wait — show low-res quickly then let high-res load
  applyBlurUp(bgEl, data)
    .then(() => {
      if (quoteCardEl) quoteCardEl.classList.remove('is-loading');
    })
    .catch(() => {
      if (quoteCardEl) quoteCardEl.classList.remove('is-loading');
    });
  setAttribution(data);
  const isFallback = data && data.photographerName === 'Lorem Picsum';
  showHeroStatus(isFallback, isFallback ? 'image_fallback_msg' : '');
  preloadNext();
}

function getDailyQuote(pool) {
  if (!pool.length) return null;
  const dayId = new Date().toISOString().slice(0, 10);
  const storageKey = `${DAILY_QUOTE_KEY}_${dayId}`;
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const hit = pool.find(q => q.quote === parsed.quote && q.author === parsed.author);
      if (hit) return hit;
    }
  } catch (e) {}

  const hashBase = `${dayId}|goodvibe|${pool.length}`;
  let h = 0;
  for (let i = 0; i < hashBase.length; i++) h = (h << 5) - h + hashBase.charCodeAt(i);
  const index = Math.abs(h) % pool.length;
  const chosen = pool[index];
  try {
    localStorage.setItem(storageKey, JSON.stringify({ quote: chosen.quote, author: chosen.author }));
  } catch (e) {}
  return chosen;
}

function preloadNext() {
  const pool = filteredQuotes();
  if (pool.length < 2) return;
  const others = pool.filter(q => q !== state.currentQuote);
  const nextItem = pickRandom(others);
  getImageData(nextItem.keywords, makeQuoteSeed(nextItem));
}

function newRandomQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return;
  renderHero(pickRandom(pool));
}

function setInitialQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return;
  const daily = getDailyQuote(pool);
  if (daily) renderHero(daily);
  else renderHero(pickRandom(pool));
}

function getGridBatchSize() {
  return window.innerWidth <= 640 ? 24 : 60;
}

function createGridCard(item) {
  const card = document.createElement('div');
  card.className = 'grid-card';
  card.style.background = fallbackGradient(item.category);
  card.innerHTML = `
    <div class="grid-bg">
      <div class="bg-low"></div>
      <div class="bg-high"></div>
    </div>
    <div class="grid-overlay"></div>
    <div class="grid-content">
      <div class="grid-quote-text">\u201c${getQuoteText(item)}\u201d</div>
      <div class="grid-tag">${I18N.catLabel(item.category)}</div>
    </div>`;

  card.addEventListener('click', () => {
    renderHero(item);
    scrollToElementWithOffset(document.getElementById('quote-card'), null, 'smart');
  });

  const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting) {
      const data = await getImageData(item.keywords, makeQuoteSeed(item));
      applyBlurUp(card.querySelector('.grid-bg'), data);
      observer.disconnect();
    }
  });
  observer.observe(card);
  return card;
}

function updateLoadMoreButton(totalCount) {
  const loadMoreBtn = document.getElementById('btn-load-more');
  if (!loadMoreBtn) return;
  const hasMore = state.gridRenderedCount < totalCount;
  loadMoreBtn.hidden = !hasMore;
  loadMoreBtn.setAttribute('aria-hidden', hasMore ? 'false' : 'true');
}

function renderGrid(reset = true) {
  const catLabel = I18N.catLabel(state.currentCategory);
  const titleEl = document.getElementById('grid-title');
  titleEl.textContent = state.currentCategory === 'All'
    ? I18N.t('grid_all')
    : I18N.t('grid_cat', catLabel);

  const all = filteredQuotes();
  const grid = document.getElementById('quote-grid');
  if (reset) {
    grid.innerHTML = '';
    state.gridRenderedCount = 0;
  }

  const start = state.gridRenderedCount;
  const end = Math.min(start + getGridBatchSize(), all.length);
  for (let i = start; i < end; i++) {
    grid.appendChild(createGridCard(all[i]));
  }
  state.gridRenderedCount = end;
  updateLoadMoreButton(all.length);
}

function setupLoadMore() {
  const loadMoreBtn = document.getElementById('btn-load-more');
  if (!loadMoreBtn) return;
  loadMoreBtn.addEventListener('click', () => {
    renderGrid(false);
  });
}

function setupNav() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category;
      newRandomQuote();
      renderGrid();
      scrollToElementWithOffset(document.getElementById('grid-title'));
    });
  });
}

// Re-bind filters after header injects them
document.addEventListener('headerready', setupNav);

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

  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!state.currentQuote) return;
      const shareText = `\u201c${getQuoteText(state.currentQuote)}\u201d \u2014 ${getQuoteAuthor(state.currentQuote)}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'GoodVibe Daily',
            text: shareText,
            url: location.href,
          });
          return;
        } catch (err) {}
      }
      navigator.clipboard.writeText(`${shareText}\n${location.href}`);
      const original = shareBtn.textContent;
      shareBtn.textContent = I18N.t('copied_label');
      setTimeout(() => { shareBtn.textContent = original; }, 1200);
    });
  }

  // Previous quote button
  const prevBtn = document.getElementById('btn-prev');
  if (prevBtn) prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.lastQuote) return;
    // go back to last quote and clear lastQuote
    const prev = state.lastQuote;
    state.lastQuote = null;
    renderHero(prev);
  });

  

  // Set initial hint text and update on language change
  updateTapHintText();
  document.addEventListener('langchange', updateTapHintText);

  const retryBtn = document.getElementById('hero-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      proxyHealth.cooldownUntil = 0;
      proxyHealth.consecutiveFailures = 0;
      try { localStorage.removeItem('gv_pexels_cooldown_until'); } catch (err) {}
      if (state.currentQuote) await renderHero(state.currentQuote);
    });
  }
}

function setupOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  const dismiss = document.getElementById('offline-dismiss');
  if (!banner || !dismiss) return;
  const hideKey = 'gv_hide_offline_banner';

  function update() {
    const dismissed = localStorage.getItem(hideKey) === '1';
    if (!navigator.onLine && !dismissed) banner.classList.add('show');
    else banner.classList.remove('show');
  }

  dismiss.addEventListener('click', () => {
    try { localStorage.setItem(hideKey, '1'); } catch (e) {}
    banner.classList.remove('show');
  });

  window.addEventListener('online', () => {
    try { localStorage.removeItem(hideKey); } catch (e) {}
    update();
  });
  window.addEventListener('offline', update);
  update();
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
  renderGrid(true);
});

function shouldPrefetchImages() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return true;
  if (connection.saveData) return false;
  const type = (connection.effectiveType || '').toLowerCase();
  return type === '4g';
}

(async function init() {
  await loadQuotes();
  setupNav();
  setupLoadMore();
  setupActions();
  setupOfflineBanner();
  setInitialQuote();
  renderGrid(true);
  scheduleHintAutoDismiss();
  // Prefetch small images for a few initial quotes only on faster connections
  try {
    if (shouldPrefetchImages()) {
      const pool = state.quotes.slice(0, 3);
      pool.forEach(q => getImageData(q.keywords));
    }
  } catch(e) {}
})();

// ── THEME TOGGLE ──
function setupThemeToggle() {
  const buttons = Array.from(document.querySelectorAll('.theme-option'));
  if (!buttons.length) return;

  const themes = ['dark', 'light', 'sys'];
  const storageKey = 'gv_theme';
  const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  function applyTheme(theme) {
    const effectiveTheme = theme === 'sys' ? getSystemTheme() : theme;
    document.body.classList.toggle('theme-light', effectiveTheme === 'light');
    buttons.forEach((button) => {
      const isActive = button.getAttribute('data-theme') === theme;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  let current = localStorage.getItem(storageKey) || 'sys';
  if (!themes.includes(current)) current = 'sys';

  applyTheme(current);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      current = button.getAttribute('data-theme');
      localStorage.setItem(storageKey, current);
      applyTheme(current);
    });
  });

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (current === 'sys') applyTheme('sys');
  };
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleSystemChange);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupThemeToggle);
} else {
  setupThemeToggle();
}
