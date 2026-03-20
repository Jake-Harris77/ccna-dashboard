// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Timed Speed Rounds
//  60-second rapid-fire multiple choice
// ─────────────────────────────────────────────────────────────────────────────

var SpeedRound = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';
  var DURATION = 60; // seconds
  var timer = null;

  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function saveGame (g) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }
    catch (_) {}
  }

  function shuffleArray (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function getDistractors (card) {
    var seen = {};
    seen[card.back.toLowerCase().trim()] = true;
    var pool = (typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).filter(function (c) {
      return c.tag === card.tag && c.id !== card.id;
    });
    if (pool.length < 3) {
      pool = pool.concat(ANKI_CARDS.filter(function (c) { return c.id !== card.id; }));
    }
    pool = shuffleArray(pool);
    var result = [];
    for (var i = 0; i < pool.length && result.length < 3; i++) {
      var norm = pool[i].back.toLowerCase().trim();
      if (!seen[norm]) {
        seen[norm] = true;
        result.push(pool[i].back);
      }
    }
    return result;
  }

  function esc (s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function init () {
    var panel = document.getElementById('tool-speed');
    if (!panel) return;
    if (timer) { clearInterval(timer); timer = null; }
    renderPicker(panel);
  }

  function renderPicker (panel) {
    if (typeof ANKI_SECTIONS === 'undefined') { panel.innerHTML = '<p>Loading...</p>'; return; }
    var sectionsHTML = ANKI_SECTIONS.map(function (sec) {
      return '<button class="speed-section-btn" data-sid="' + sec.id + '">' + esc(sec.name) + ' (' + sec.count + ')</button>';
    }).join('');

    panel.innerHTML = '<div class="speed-view">'
      + '<h2 class="speed-title">\u26A1 Speed Round</h2>'
      + '<p class="speed-subtitle">60 seconds. Multiple choice. How many can you get?</p>'
      + '<div class="speed-section-grid">'
      + '  <button class="speed-section-btn speed-all" data-sid="all">All Sections (Random)</button>'
      + sectionsHTML
      + '</div>'
      + '</div>';

    panel.querySelectorAll('.speed-section-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startRound(panel, btn.dataset.sid);
      });
    });
  }

  function startRound (panel, sectionId) {
    var cards;
    if (sectionId === 'all') {
      cards = shuffleArray(typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []);
    } else {
      cards = shuffleArray((typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).filter(function (c) { return c.section === sectionId; }));
    }
    if (cards.length === 0) return;

    var state = { cards: cards, index: 0, score: 0, wrong: 0, timeLeft: DURATION, sectionId: sectionId };

    renderQuestion(panel, state);

    timer = setInterval(function () {
      state.timeLeft--;
      var timerEl = document.getElementById('speedTimer');
      if (timerEl) timerEl.textContent = state.timeLeft + 's';
      var barEl = document.getElementById('speedTimerBar');
      if (barEl) barEl.style.width = (state.timeLeft / DURATION * 100) + '%';
      if (state.timeLeft <= 0) {
        clearInterval(timer);
        timer = null;
        renderResults(panel, state);
      }
    }, 1000);
  }

  function renderQuestion (panel, state) {
    if (state.index >= state.cards.length) {
      state.cards = shuffleArray(state.cards);
      state.index = 0;
    }
    var card = state.cards[state.index];
    var distractors = getDistractors(card);
    var options = shuffleArray([card.back].concat(distractors));
    var letters = ['A', 'B', 'C', 'D'];

    var optionsHTML = options.map(function (opt, i) {
      return '<button class="speed-option" data-val="' + esc(opt) + '">'
        + '<span class="speed-letter">' + letters[i] + '</span>'
        + '<span>' + esc(opt) + '</span>'
        + '</button>';
    }).join('');

    panel.innerHTML = '<div class="speed-active">'
      + '<div class="speed-header">'
      + '  <div class="speed-score">Score: <strong>' + state.score + '</strong></div>'
      + '  <div class="speed-timer-wrap">'
      + '    <span id="speedTimer">' + state.timeLeft + 's</span>'
      + '    <div class="speed-timer-bar"><div class="speed-timer-fill" id="speedTimerBar" style="width:' + (state.timeLeft / DURATION * 100) + '%"></div></div>'
      + '  </div>'
      + '</div>'
      + '<div class="speed-card">'
      + '  <p class="speed-question">' + esc(card.front) + '</p>'
      + '  <div class="speed-options">' + optionsHTML + '</div>'
      + '</div>'
      + '</div>';

    panel.querySelectorAll('.speed-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var correct = btn.dataset.val === card.back;
        if (correct) {
          state.score++;
          btn.classList.add('correct');
        } else {
          state.wrong++;
          btn.classList.add('wrong');
          // Highlight correct
          panel.querySelectorAll('.speed-option').forEach(function (o) {
            if (o.dataset.val === card.back) o.classList.add('correct');
          });
        }
        // Record to game state
        var g = loadGame();
        if (correct) {
          g.totalCorrect = (g.totalCorrect || 0) + 1;
          g.xp = (g.xp || 0) + 5;
          g.coins = (g.coins || 0) + 1;
        }
        saveGame(g);

        state.index++;
        setTimeout(function () { renderQuestion(panel, state); }, 300);
      });
    });
  }

  function renderResults (panel, state) {
    var g = loadGame();
    if (!g.speedRoundBest) g.speedRoundBest = {};
    var key = state.sectionId;
    if (!g.speedRoundBest[key] || state.score > g.speedRoundBest[key]) {
      g.speedRoundBest[key] = state.score;
    }
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveAnki();

    var accuracy = state.score + state.wrong > 0 ? Math.round((state.score / (state.score + state.wrong)) * 100) : 0;
    var pb = g.speedRoundBest[key] || 0;

    panel.innerHTML = '<div class="speed-results">'
      + '<h2 class="speed-results-title">\u26A1 Time\'s Up!</h2>'
      + '<div class="speed-results-stats">'
      + '  <div class="speed-results-stat"><span class="speed-results-val">' + state.score + '</span><span class="speed-results-lbl">Correct</span></div>'
      + '  <div class="speed-results-stat"><span class="speed-results-val">' + accuracy + '%</span><span class="speed-results-lbl">Accuracy</span></div>'
      + '  <div class="speed-results-stat"><span class="speed-results-val">' + pb + '</span><span class="speed-results-lbl">Personal Best</span></div>'
      + '</div>'
      + '<div class="speed-results-actions">'
      + '  <button class="anki-btn anki-btn-accent" id="speedRetry">Play Again</button>'
      + '  <button class="anki-btn anki-btn-secondary" id="speedBack">Back</button>'
      + '</div>'
      + '</div>';

    document.getElementById('speedRetry').addEventListener('click', function () {
      startRound(panel, state.sectionId);
    });
    document.getElementById('speedBack').addEventListener('click', function () {
      renderPicker(panel);
    });

    if (typeof Effects !== 'undefined' && state.score >= 10) {
      Effects.confetti({ count: 50, duration: 2000 });
    }
  }

  return { init: init };
})();
