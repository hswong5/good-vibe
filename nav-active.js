// nav-active.js — highlights the current page in .category-nav
(function () {
  // Use full pathname for reliable matching (avoids index.html collision)
  const pathname = location.pathname;

  document.querySelectorAll('.category-nav a.nav-btn').forEach(link => {
    const href = link.getAttribute('href');

    // Resolve href relative to current origin for comparison
    const abs = new URL(href, location.href).pathname;

    // Exact match, or treat root '/' as index.html
    const match =
      abs === pathname ||
      (abs.endsWith('/index.html') && (pathname === abs.replace('index.html', '') || pathname === abs));

    if (match) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
})();
