// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Dark/Light Theme Toggle
//  Theme.init(), Theme.toggle()
// ─────────────────────────────────────────────────────────────────────────────

var Theme = (function () {
  'use strict';

  var STORAGE_KEY = 'netready_theme';

  function getTheme () {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function setTheme (theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    document.body.classList.toggle('theme-light', theme === 'light');
    updateToggleIcon(theme);
  }

  function toggle () {
    var current = getTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof Toast !== 'undefined') Toast.show(next === 'light' ? 'Light mode' : 'Dark mode', 'info', 1500);
  }

  function updateToggleIcon (theme) {
    var btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function init () {
    setTheme(getTheme());
    var btn = document.getElementById('themeToggleBtn');
    if (btn) btn.addEventListener('click', toggle);
  }

  return { init: init, toggle: toggle, getTheme: getTheme };
})();
