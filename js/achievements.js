// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Achievement Badges
//  Achievements.check(game, session), Achievements.renderBadges()
// ─────────────────────────────────────────────────────────────────────────────

var Achievements = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';

  var BADGES = [
    { id: 'first_blood',    name: 'First Blood',     desc: 'Answer your first question correctly', icon: '\u2694' },
    { id: 'streak_3',       name: 'On Fire',          desc: 'Get a 3-answer streak', icon: '\uD83D\uDD25' },
    { id: 'streak_5',       name: 'Blazing',          desc: 'Get a 5-answer streak', icon: '\u26A1' },
    { id: 'streak_10',      name: 'Unstoppable',      desc: 'Get a 10-answer streak', icon: '\uD83D\uDCA5' },
    { id: 'streak_25',      name: 'Legend',            desc: 'Get a 25-answer streak', icon: '\uD83C\uDFC6' },
    { id: 'boss_slayer',    name: 'Boss Slayer',       desc: 'Defeat your first boss', icon: '\uD83D\uDDE1' },
    { id: 'speedster',      name: 'Speedster',         desc: 'Answer correctly in under 3 seconds', icon: '\u23F1' },
    { id: 'perfectionist',  name: 'Perfectionist',     desc: 'Complete a section with no mistakes', icon: '\uD83D\uDC8E' },
    { id: 'scholar',        name: 'Scholar',            desc: 'Review 100 cards', icon: '\uD83D\uDCDA' },
    { id: 'master',         name: 'Master',             desc: 'Get 50 cards to mastery level 5', icon: '\uD83C\uDF1F' },
    { id: 'early_bird',     name: 'Early Bird',         desc: 'Study before 7am', icon: '\uD83C\uDF05' },
    { id: 'night_owl',      name: 'Night Owl',          desc: 'Study after 11pm', icon: '\uD83C\uDF19' },
    { id: 'conqueror',      name: 'Conqueror',          desc: 'Defeat all bosses', icon: '\uD83D\uDC51' },
    { id: 'centurion',      name: 'Centurion',          desc: 'Answer 100 questions correctly', icon: '\uD83D\uDEE1' },
    { id: 'marathon',       name: 'Marathon',            desc: 'Answer 500 questions correctly', icon: '\uD83C\uDFC5' },
    { id: 'coin_hoarder',   name: 'Coin Hoarder',       desc: 'Accumulate 500 coins', icon: '\uD83D\uDCB0' },
    { id: 'level_5',        name: 'Rising Star',        desc: 'Reach level 5', icon: '\u2B50' },
    { id: 'level_10',       name: 'Veteran',             desc: 'Reach level 10', icon: '\uD83C\uDF96' },
    { id: 'level_20',       name: 'Elite',               desc: 'Reach level 20', icon: '\uD83D\uDD31' },
    { id: 'week_streak',    name: '7-Day Warrior',       desc: 'Study 7 days in a row', icon: '\uD83D\uDCC5' },
  ];

  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function saveGame (g) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }
    catch (_) {}
  }

  function levelFromXP (xp) {
    var lvl = 1;
    while (lvl * (lvl - 1) * 50 <= (xp || 0)) lvl++;
    return lvl - 1;
  }

  function check (sessionData) {
    var g = loadGame();
    if (!g.achievements) g.achievements = [];
    var newUnlocks = [];
    var hour = new Date().getHours();
    var level = levelFromXP(g.xp || 0);

    // Count mastered cards
    var mastered = 0;
    if (g.cardStats) {
      for (var id in g.cardStats) {
        if (g.cardStats[id].mastery >= 5) mastered++;
      }
    }

    // Count conquered sections
    var conquered = 0;
    var totalSections = 0;
    if (g.sections) {
      for (var sid in g.sections) {
        totalSections++;
        if (g.sections[sid].defeated) conquered++;
      }
    }

    // Streak from StreakCalendar
    var currentStreak = (typeof StreakCalendar !== 'undefined') ? StreakCalendar.getStreak() : 0;

    var conditions = {
      first_blood:    (g.totalCorrect || 0) >= 1,
      streak_3:       (g.bestStreak || 0) >= 3,
      streak_5:       (g.bestStreak || 0) >= 5,
      streak_10:      (g.bestStreak || 0) >= 10,
      streak_25:      (g.bestStreak || 0) >= 25,
      boss_slayer:    conquered >= 1,
      speedster:      sessionData && sessionData.answerTime < 3,
      perfectionist:  sessionData && sessionData.sectionComplete && sessionData.sessionWrong === 0,
      scholar:        (g.totalCorrect || 0) >= 100,
      master:         mastered >= 50,
      early_bird:     hour < 7,
      night_owl:      hour >= 23,
      conqueror:      totalSections > 0 && conquered >= totalSections,
      centurion:      (g.totalCorrect || 0) >= 100,
      marathon:       (g.totalCorrect || 0) >= 500,
      coin_hoarder:   (g.coins || 0) >= 500,
      level_5:        level >= 5,
      level_10:       level >= 10,
      level_20:       level >= 20,
      week_streak:    currentStreak >= 7,
    };

    BADGES.forEach(function (badge) {
      if (g.achievements.indexOf(badge.id) === -1 && conditions[badge.id]) {
        g.achievements.push(badge.id);
        newUnlocks.push(badge);
      }
    });

    if (newUnlocks.length > 0) {
      saveGame(g);
      newUnlocks.forEach(function (badge) {
        if (typeof Toast !== 'undefined') {
          Toast.show(badge.icon + ' Achievement: ' + badge.name, 'success', 4000);
        }
        if (typeof Effects !== 'undefined') {
          Effects.confetti({ count: 40, duration: 1500 });
        }
      });
    }

    return newUnlocks;
  }

  function renderBadges (container) {
    var g = loadGame();
    var unlocked = g.achievements || [];

    var html = '<div class="achievements-grid">';
    BADGES.forEach(function (badge) {
      var isUnlocked = unlocked.indexOf(badge.id) !== -1;
      html += '<div class="achievement-badge ' + (isUnlocked ? 'unlocked' : 'locked') + '" title="' + badge.desc + '">'
        + '<div class="achievement-icon">' + badge.icon + '</div>'
        + '<div class="achievement-name">' + badge.name + '</div>'
        + '</div>';
    });
    html += '</div>';

    if (container) container.innerHTML = html;
    return html;
  }

  return { check: check, renderBadges: renderBadges, BADGES: BADGES };
})();
