// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — App Logic
//  Sidebar toggle, nav switching, panel initialization
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  var sidebar       = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var statTotal     = document.getElementById('statTotal');
  var topbarTitle   = document.getElementById('topbarTitle');
  var navItems      = document.querySelectorAll('.nav-item');
  var toolPanels    = document.querySelectorAll('.tool-panel');

  var toolTitles = {
    'anki':        'Territory Map',
    'leaderboard': 'Leaderboard',
    'friends':     'Friends',
    'challenges':  'Challenges',
  };

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

  // ── Init ANKI game on load ───────────────────────────────
  if (window.AnkiEngine) AnkiEngine.init();

  // ── Nav switching ────────────────────────────────────────
  navItems.forEach(function (item) {
    if (!item.dataset.tool) return;

    item.addEventListener('click', function (e) {
      e.preventDefault();
      var tool = item.dataset.tool;

      // Update active nav
      navItems.forEach(function (n) { n.classList.remove('active'); });
      item.classList.add('active');

      // Show/hide panels
      toolPanels.forEach(function (p) {
        if (p.id === 'tool-' + tool) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });

      // Update topbar
      if (topbarTitle) topbarTitle.textContent = toolTitles[tool] || tool;

      // Update topbar meta
      if (tool === 'anki' && typeof ANKI_CARDS !== 'undefined') {
        statTotal.textContent = ANKI_CARDS.length + ' cards';
      } else {
        statTotal.textContent = '';
      }

      // Close mobile sidebar
      sidebar.classList.remove('mobile-open');

      // Init panels
      if (tool === 'anki' && window.AnkiEngine)      AnkiEngine.init();
      if (tool === 'leaderboard' && window.Leaderboard) Leaderboard.init();
      if (tool === 'friends' && window.Friends)        Friends.init();
      if (tool === 'challenges' && window.Challenges)  Challenges.init();
    });
  });

})();
