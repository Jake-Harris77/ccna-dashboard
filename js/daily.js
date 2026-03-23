// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Daily Challenges
//  Deterministic daily section challenge with bonus rewards
// ─────────────────────────────────────────────────────────────────────────────

var DailyChallenge = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';

  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function saveGame (g) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }
    catch (_) {}
  }

  function todayStr () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getTodayChallenge () {
    if (typeof ANKI_SECTIONS === 'undefined') return null;
    var total = ANKI_SECTIONS.length;
    if (total === 0) return null;
    // Deterministic: days since epoch mod total sections
    var epoch = new Date(2024, 0, 1).getTime();
    var daysSince = Math.floor((Date.now() - epoch) / (24 * 60 * 60 * 1000));
    var idx = daysSince % total;
    return ANKI_SECTIONS[idx];
  }

  function isCompleted () {
    var g = loadGame();
    return g.dailyChallenge && g.dailyChallenge.date === todayStr() && g.dailyChallenge.completed;
  }

  function markCompleted (correct, total) {
    var g = loadGame();
    g.dailyChallenge = {
      date: todayStr(),
      completed: true,
      correct: correct,
      total: total,
    };
    // Bonus: 2x coins (10 coins bonus)
    g.coins = (g.coins || 0) + 10;
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();
    if (typeof Toast !== 'undefined') Toast.show('Daily Challenge Complete! +10 bonus coins', 'success', 4000);
    if (typeof Effects !== 'undefined') Effects.confetti({ count: 60, duration: 2000 });
    // Sync
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveAnki();
  }

  function renderBanner () {
    var section = getTodayChallenge();
    if (!section) return '';
    var completed = isCompleted();
    var statusClass = completed ? 'daily-completed' : '';
    var statusText = completed ? 'Completed!' : 'Battle section "' + section.name + '" today';
    var actionHTML = completed
      ? '<span class="daily-check">\u2713</span>'
      : '<button class="anki-btn anki-btn-accent daily-go-btn" id="dailyChallengeBtn" data-section="' + section.id + '">Go \u2192</button>';

    return '<div class="daily-banner ' + statusClass + '">'
      + '<div class="daily-banner-left">'
      + '  <div class="daily-label">\uD83D\uDD25 Daily Challenge</div>'
      + '  <div class="daily-desc">' + statusText + '</div>'
      + '</div>'
      + '<div class="daily-banner-right">' + actionHTML + '</div>'
      + '</div>';
  }

  function checkCompletion (sectionId, correct, wrong) {
    var challenge = getTodayChallenge();
    if (!challenge) return;
    if (isCompleted()) return;
    if (sectionId === challenge.id) {
      markCompleted(correct, correct + wrong);
    }
  }

  return {
    getTodayChallenge: getTodayChallenge,
    isCompleted: isCompleted,
    markCompleted: markCompleted,
    checkCompletion: checkCompletion,
    renderBanner: renderBanner,
  };
})();
