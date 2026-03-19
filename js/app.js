// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — App Logic
//  Sidebar toggle + ANKI game initialization
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const sidebar       = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const statTotal     = document.getElementById('statTotal');

  // ── Sidebar Toggle ───────────────────────────────────────
  sidebarToggle.addEventListener('click', function () {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // ── Show card count in topbar ────────────────────────────
  if (typeof ANKI_CARDS !== 'undefined') {
    statTotal.textContent = ANKI_CARDS.length + ' cards';
  }

  // ── Init ANKI game immediately ───────────────────────────
  var ankiPanel = document.getElementById('tool-anki');
  if (ankiPanel) ankiPanel.style.display = '';

  // AnkiEngine.init() is called by anki.js on load

})();
