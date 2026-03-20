// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — App Logic
//  Sidebar toggle, nav switching, panel initialization
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  var sidebar       = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var topbarTitle   = document.getElementById('topbarTitle');
  var navItems      = document.querySelectorAll('.nav-item');
  var toolPanels    = document.querySelectorAll('.tool-panel');

  var toolTitles = {
    'anki':        'Territory Map',
    'leaderboard': 'Leaderboard',
    'friends':     'Friends',
    'challenges':  'Challenges',
    'profile':     'Profile',
    'shop':        'Shop',
  };

  // ── Sidebar Toggle ───────────────────────────────────────
  sidebarToggle.addEventListener('click', function () {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // ── Card count is now shown via CoinSystem topbar ───────

  // ── Init ANKI game on load ───────────────────────────────
  if (window.AnkiEngine) AnkiEngine.init();

  // ── Init Coin System topbar ─────────────────────────────
  if (window.CoinSystem) CoinSystem.init();

  // ── Loading screen fade-out ─────────────────────────────
  setTimeout(function () {
    var loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(function () { loadingScreen.remove(); }, 800);
    }
  }, 4200);

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

      // Close mobile sidebar
      sidebar.classList.remove('mobile-open');

      // Init panels
      if (tool === 'anki' && window.AnkiEngine)      AnkiEngine.init();
      if (tool === 'leaderboard' && window.Leaderboard) Leaderboard.init();
      if (tool === 'friends' && window.Friends)        Friends.init();
      if (tool === 'challenges' && window.Challenges)  Challenges.init();
      if (tool === 'profile' && window.Profile)        Profile.init();
      if (tool === 'shop' && window.Shop)              Shop.init();
    });
  });

})();
