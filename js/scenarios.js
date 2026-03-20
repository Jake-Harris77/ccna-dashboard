// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Scenario Questions
//  Multi-step troubleshooting scenarios with partial credit
// ─────────────────────────────────────────────────────────────────────────────

var Scenarios = (function () {
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

  function esc (s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function shuffleArray (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function init () {
    var panel = document.getElementById('tool-scenarios');
    if (!panel) return;
    renderList(panel);
  }

  function renderList (panel) {
    if (typeof SCENARIO_QUESTIONS === 'undefined') { panel.innerHTML = '<p>Loading...</p>'; return; }

    var html = '<div class="scenario-list">'
      + '<h2 class="scenario-title">\uD83D\uDD0D Scenario Questions</h2>'
      + '<p class="scenario-subtitle">Multi-step troubleshooting scenarios. Work through each step to solve the problem.</p>'
      + '<div class="scenario-grid">';

    SCENARIO_QUESTIONS.forEach(function (sc) {
      html += '<button class="scenario-card" data-sc="' + sc.id + '">'
        + '<div class="scenario-card-title">' + esc(sc.title) + '</div>'
        + '<div class="scenario-card-steps">' + sc.steps.length + ' steps</div>'
        + '</button>';
    });

    html += '</div></div>';
    panel.innerHTML = html;

    panel.querySelectorAll('.scenario-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var sc = SCENARIO_QUESTIONS.find(function (s) { return s.id === card.dataset.sc; });
        if (sc) runScenario(panel, sc);
      });
    });
  }

  function runScenario (panel, scenario) {
    var state = { scenario: scenario, stepIndex: 0, correct: 0, total: scenario.steps.length };
    renderStep(panel, state);
  }

  function renderStep (panel, state) {
    if (state.stepIndex >= state.total) {
      renderResults(panel, state);
      return;
    }

    var step = state.scenario.steps[state.stepIndex];
    var options = shuffleArray(step.options);
    var letters = ['A', 'B', 'C', 'D'];

    var optHTML = options.map(function (opt, i) {
      return '<button class="scenario-option" data-val="' + esc(opt) + '">'
        + '<span class="scenario-letter">' + letters[i] + '</span>'
        + '<span>' + esc(opt) + '</span>'
        + '</button>';
    }).join('');

    panel.innerHTML = '<div class="scenario-active">'
      + '<div class="scenario-header">'
      + '  <button class="anki-back-btn" id="scenarioBack">\u2190 Back</button>'
      + '  <span class="scenario-progress">Step ' + (state.stepIndex + 1) + ' / ' + state.total + '</span>'
      + '</div>'
      + '<div class="scenario-situation">'
      + '  <h3>' + esc(state.scenario.title) + '</h3>'
      + '  <p>' + esc(state.scenario.situation) + '</p>'
      + '</div>'
      + '<div class="scenario-step-card">'
      + '  <p class="scenario-question">' + esc(step.question) + '</p>'
      + '  <div class="scenario-options">' + optHTML + '</div>'
      + '</div>'
      + '</div>';

    document.getElementById('scenarioBack').addEventListener('click', function () { renderList(panel); });

    panel.querySelectorAll('.scenario-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isCorrect = btn.dataset.val === step.answer;
        if (isCorrect) {
          state.correct++;
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
          panel.querySelectorAll('.scenario-option').forEach(function (o) {
            if (o.dataset.val === step.answer) o.classList.add('correct');
          });
        }
        // Award XP
        var g = loadGame();
        if (isCorrect) {
          g.xp = (g.xp || 0) + 8;
          g.totalCorrect = (g.totalCorrect || 0) + 1;
          g.coins = (g.coins || 0) + 1;
        }
        saveGame(g);

        state.stepIndex++;
        setTimeout(function () { renderStep(panel, state); }, 600);
      });
    });
  }

  function renderResults (panel, state) {
    var pct = Math.round((state.correct / state.total) * 100);
    var g = loadGame();
    // Bonus for completing scenario
    g.coins = (g.coins || 0) + 3;
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();

    panel.innerHTML = '<div class="scenario-results">'
      + '<h2>Scenario Complete!</h2>'
      + '<p>' + esc(state.scenario.title) + '</p>'
      + '<div class="scenario-score">' + state.correct + ' / ' + state.total + ' (' + pct + '%)</div>'
      + '<div class="scenario-results-actions">'
      + '  <button class="anki-btn anki-btn-accent" id="scenarioListBtn">More Scenarios</button>'
      + '</div>'
      + '</div>';

    document.getElementById('scenarioListBtn').addEventListener('click', function () { renderList(panel); });

    if (pct >= 80 && typeof Effects !== 'undefined') {
      Effects.confetti({ count: 50, duration: 2000 });
    }
  }

  return { init: init };
})();
