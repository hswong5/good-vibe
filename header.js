// header.js — shared header for all pages
(function () {
  function renderHeader() {
    const mount = document.getElementById('site-header-mount');
    if (!mount) return;

    const isBlog      = location.pathname.includes('/blog/');
    const root        = isBlog ? '../' : '';
    const currentPath = location.pathname;

    const isIndex = !isBlog && (
      currentPath.endsWith('index.html') ||
      currentPath.endsWith('/') ||
      /\/good-vibe\/?$/.test(currentPath)
    );

    const navLinks = [
      { href: root + 'index.html',      key: 'nav_quotes',   label: 'Quotes'   },
      { href: root + 'blog/index.html', key: 'nav_blog',     label: 'Blog'     },
      { href: root + 'meditate.html',   key: 'nav_meditate', label: 'Meditate' },
      { href: root + 'journal.html',    key: 'nav_journal',  label: 'Journal'  },
      { href: root + 'progress.html',   key: 'nav_progress', label: 'Progress' },
    ];

    const navHTML = navLinks.map(({ href, key, label }) => {
      const abs = new URL(href, location.href).pathname;
      const isActive =
        abs === currentPath ||
        (currentPath.endsWith('/') && abs === currentPath + 'index.html') ||
        (abs.endsWith('/index.html') && currentPath === abs.replace('index.html', ''));
      const text = (window.I18N && I18N.t) ? I18N.t(key) : label;
      return `<a class="nav-btn${isActive ? ' active' : ''}" href="${href}" data-i18n="${key}"${isActive ? ' aria-current="page"' : ''}>${text}</a>`;
    }).join('\n      ');

    // Quote category filters — Quotes page only
    const filterNav = isIndex ? `
  <nav class="filter-nav" id="filter-nav" aria-label="Quote categories">
    <button class="filter-btn active" data-category="All" data-i18n-cat="All">All</button>
    <button class="filter-btn" data-category="Motivation" data-i18n-cat="Motivation">Motivation</button>
    <button class="filter-btn" data-category="Healing" data-i18n-cat="Healing">Healing</button>
    <button class="filter-btn" data-category="Hustle" data-i18n-cat="Hustle">Hustle</button>
    <button class="filter-btn" data-category="Calm" data-i18n-cat="Calm">Calm</button>
  </nav>` : '';

    // Lang + theme always present so header width/position stays stable
    mount.innerHTML = `
<header class="site-header">
  <div class="logo"><a href="${root}index.html" style="color:inherit;text-decoration:none">GoodVibe</a><small>daily calm for busy people</small></div>
  <button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav-wrap">Menu</button>
  <div class="main-nav-wrap" id="main-nav-wrap">
    <nav class="category-nav">
        ${navHTML}
    </nav>
  </div>
  <div class="header-actions">
    <div class="lang-switch" id="lang-switch">
      <button class="lang-btn" data-lang="en" aria-pressed="false">EN</button>
      <button class="lang-btn" data-lang="zh" aria-pressed="false">繁</button>
      <button class="lang-btn" data-lang="zh-Hans" aria-pressed="false">簡</button>
    </div>
    <div class="theme-switch" aria-label="Theme options">
      <button class="theme-option" data-theme="dark" type="button" title="Dark">🌙</button>
      <button class="theme-option" data-theme="light" type="button" title="Light">☀️</button>
      <button class="theme-option" data-theme="sys" type="button" title="System">💻</button>
    </div>
  </div>
</header>${filterNav}`;

    const menuToggle = mount.querySelector('#menu-toggle');
    const navWrap = mount.querySelector('#main-nav-wrap');
    if (menuToggle && navWrap) {
      menuToggle.addEventListener('click', () => {
        const isOpen = navWrap.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      navWrap.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          navWrap.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Theme active state
    const saved = localStorage.getItem('gv_theme') || 'sys';
    mount.querySelectorAll('.theme-option').forEach(btn => {
      const on = btn.dataset.theme === saved;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // Wire theme clicks (works even if theme.js ran before header existed)
    mount.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme || 'sys';
        localStorage.setItem('gv_theme', theme);
        const effective = theme === 'sys'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        document.body.classList.toggle('theme-light', effective === 'light');
        mount.querySelectorAll('.theme-option').forEach(b => {
          const on = b.dataset.theme === theme;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });

    // Wire lang clicks if I18N is already loaded
    if (window.I18N && typeof I18N.setLang === 'function') {
      mount.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => I18N.setLang(btn.dataset.lang));
      });
      I18N.apply && I18N.apply();
    }

    // Tell app.js filter buttons are ready
    requestAnimationFrame(() => {
      const hh = mount.offsetHeight || 0;
      document.documentElement.style.setProperty('--gv-header-offset', hh + 'px');
    });

    document.dispatchEvent(new CustomEvent('headerready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHeader);
  } else {
    renderHeader();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) renderHeader();
  });
})();
