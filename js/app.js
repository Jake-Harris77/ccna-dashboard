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
    'speed':       'Speed Round',
    'exam':        'Exam Simulator',
    'scenarios':   'Scenarios',
    'labs':        'Practice Labs',
    'streak':      'Streak Calendar',
    'duels':       'Live Duels',
    'groups':      'Study Groups',
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

  // ── Init modules on load ─────────────────────────────────
  if (window.AnkiEngine) AnkiEngine.init();
  if (window.CoinSystem) CoinSystem.init();
  if (window.Theme) Theme.init();

  // ── Loading screen: show click-to-start after bar fills ─
  setTimeout(function () {
    var loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;
    var cta = document.createElement('div');
    cta.className = 'loading-cta';
    cta.textContent = 'Click anywhere to start learning today';
    loadingScreen.appendChild(cta);
    loadingScreen.style.cursor = 'pointer';
    loadingScreen.addEventListener('click', function () {
      loadingScreen.classList.add('fade-out');
      setTimeout(function () {
        loadingScreen.remove();
        showStudyFocusModal();
      }, 700);
    }, { once: true });
  }, 5000);

  // ── Study focus modal (shown after loading screen) ───────
  function showStudyFocusModal () {
    if (typeof ANKI_SECTIONS === 'undefined') return;
    var saved = localStorage.getItem('netready_focus_section') || '';
    var opts = ANKI_SECTIONS.map(function (s) {
      return '<option value="' + s.id + '"' + (saved === s.id ? ' selected' : '') + '>' + s.name + '</option>';
    }).join('');
    var modal = document.createElement('div');
    modal.id = 'studyFocusModal';
    modal.innerHTML =
      '<div class="sfm-backdrop"></div>' +
      '<div class="sfm-box">' +
      '  <div class="sfm-icon">\uD83D\uDCE1</div>' +
      '  <h2 class="sfm-title">What are you studying today?</h2>' +
      '  <p class="sfm-sub">Pick your focus section \u2014 it will be highlighted on the Territory Map.</p>' +
      '  <select id="sfmSelect" class="sfm-select">' +
      '    <option value="">\u2014 Choose a section \u2014</option>' +
      opts +
      '  </select>' +
      '  <div class="sfm-actions">' +
      '    <button class="sfm-skip" id="sfmSkip">Skip</button>' +
      '    <button class="sfm-go" id="sfmGo">Let\'s Go \u2192</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('sfmSkip').onclick = function () { modal.remove(); };
    document.getElementById('sfmGo').onclick = function () {
      var val = document.getElementById('sfmSelect').value;
      if (val) localStorage.setItem('netready_focus_section', val);
      modal.remove();
      if (window.AnkiEngine) AnkiEngine.init();
    };
  }

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
      if (tool === 'anki' && window.AnkiEngine)          AnkiEngine.init();
      if (tool === 'leaderboard' && window.Leaderboard) Leaderboard.init();
      if (tool === 'friends' && window.Friends)          Friends.init();
      if (tool === 'challenges' && window.Challenges)    Challenges.init();
      if (tool === 'profile' && window.Profile)          Profile.init();
      if (tool === 'shop' && window.Shop)                Shop.init();
      if (tool === 'speed' && window.SpeedRound)         SpeedRound.init();
      if (tool === 'exam' && window.ExamSimulator)       ExamSimulator.init();
      if (tool === 'scenarios' && window.Scenarios)      Scenarios.init();
      if (tool === 'labs' && window.PracticeLabs)        PracticeLabs.init();
      if (tool === 'streak' && window.StreakCalendar)    StreakCalendar.init();
      if (tool === 'duels' && window.Duels)              Duels.init();
      if (tool === 'groups' && window.StudyGroups)       StudyGroups.init();
    });
  });

})();
