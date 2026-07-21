// GoodVibe Quotes — shared theme script for static pages
(function setupThemeForStaticPages() {
  const storageKey = 'gv_theme';
  const themes = ['dark', 'light', 'sys'];
  const buttons = Array.from(document.querySelectorAll('.theme-option'));
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function getSystemTheme() {
    return mediaQuery.matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    const stored = localStorage.getItem(storageKey) || 'sys';
    return themes.includes(stored) ? stored : 'sys';
  }

  function applyTheme(theme) {
    const effectiveTheme = theme === 'sys' ? getSystemTheme() : theme;
    document.body.classList.toggle('theme-light', effectiveTheme === 'light');
    buttons.forEach((button) => {
      const isActive = button.getAttribute('data-theme') === theme;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  let currentTheme = getStoredTheme();
  applyTheme(currentTheme);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      currentTheme = button.getAttribute('data-theme') || 'sys';
      if (!themes.includes(currentTheme)) currentTheme = 'sys';
      localStorage.setItem(storageKey, currentTheme);
      applyTheme(currentTheme);
    });
  });

  const onSystemChange = () => {
    if (currentTheme === 'sys') applyTheme('sys');
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', onSystemChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(onSystemChange);
  }
})();
