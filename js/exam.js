// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Exam Simulator
//  50-question mock CCNA exam with 90-minute timer
// ─────────────────────────────────────────────────────────────────────────────

var ExamSimulator = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';
  var QUESTION_COUNT = 50;
  var TIME_LIMIT = 90 * 60; // 90 minutes in seconds
  var PASS_THRESHOLD = 80;
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

  function esc (s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function getDistractors (card) {
    var seen = {};
    seen[card.back.toLowerCase().trim()] = true;
    var pool = shuffleArray((typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).filter(function (c) {
      return c.tag === card.tag && c.id !== card.id;
    }));
    if (pool.length < 3) {
      pool = pool.concat(shuffleArray(ANKI_CARDS.filter(function (c) { return c.id !== card.id; })));
    }
    var result = [];
    for (var i = 0; i < pool.length && result.length < 3; i++) {
      var norm = pool[i].back.toLowerCase().trim();
      if (!seen[norm]) { seen[norm] = true; result.push(pool[i].back); }
    }
    return result;
  }

  var examState = null;

  function init () {
    var panel = document.getElementById('tool-exam');
    if (!panel) return;
    if (timer) { clearInterval(timer); timer = null; }
    renderStart(panel);
  }

  function renderStart (panel) {
    var g = loadGame();
    var history = g.examHistory || [];
    var historyHTML = '';
    if (history.length > 0) {
      historyHTML = '<div class="exam-history"><h3>Previous Attempts</h3>';
      history.slice(-5).reverse().forEach(function (h) {
        var passClass = h.passed ? 'exam-pass' : 'exam-fail';
        historyHTML += '<div class="exam-history-item ' + passClass + '">'
          + '<span>' + h.date + '</span>'
          + '<span>' + h.score + '/' + h.total + ' (' + Math.round(h.score / h.total * 100) + '%)</span>'
          + '<span>' + (h.passed ? 'PASS' : 'FAIL') + '</span>'
          + '</div>';
      });
      historyHTML += '</div>';
    }

    panel.innerHTML = '<div class="exam-view">'
      + '<div class="exam-start-card">'
      + '  <h2 class="exam-title">\uD83D\uDCDD CCNA Practice Exam</h2>'
      + '  <div class="exam-info">'
      + '    <div class="exam-info-item"><strong>50</strong> Questions</div>'
      + '    <div class="exam-info-item"><strong>90</strong> Minutes</div>'
      + '    <div class="exam-info-item"><strong>80%</strong> to Pass</div>'
      + '  </div>'
      + '  <p class="exam-desc">Questions are drawn from all sections, weighted by CCNA exam domains. You can flag questions and change answers before submitting.</p>'
      + '  <button class="anki-btn anki-btn-accent exam-start-btn" id="examStartBtn">Start Exam</button>'
      + '</div>'
      + historyHTML
      + '</div>';

    document.getElementById('examStartBtn').addEventListener('click', function () { startExam(panel); });
  }

  function startExam (panel) {
    var cards = shuffleArray(typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).slice(0, QUESTION_COUNT);
    examState = {
      questions: cards.map(function (card) {
        var distractors = getDistractors(card);
        return {
          card: card,
          options: shuffleArray([card.back].concat(distractors)),
          answer: null,
          flagged: false,
        };
      }),
      currentIndex: 0,
      timeLeft: TIME_LIMIT,
      submitted: false,
    };

    timer = setInterval(function () {
      examState.timeLeft--;
      updateTimer();
      if (examState.timeLeft <= 0) {
        clearInterval(timer);
        timer = null;
        submitExam(panel);
      }
    }, 1000);

    renderQuestion(panel);
  }

  function updateTimer () {
    var el = document.getElementById('examTimer');
    if (!el) return;
    var m = Math.floor(examState.timeLeft / 60);
    var s = examState.timeLeft % 60;
    el.textContent = m + ':' + String(s).padStart(2, '0');
    if (examState.timeLeft < 300) el.style.color = 'var(--red)';
  }

  function renderQuestion (panel) {
    var q = examState.questions[examState.currentIndex];
    var idx = examState.currentIndex;
    var letters = ['A', 'B', 'C', 'D'];
    var m = Math.floor(examState.timeLeft / 60);
    var s = examState.timeLeft % 60;

    // Navigator dots
    var navHTML = examState.questions.map(function (qq, i) {
      var cls = 'exam-nav-dot';
      if (i === idx) cls += ' active';
      if (qq.answer !== null) cls += ' answered';
      if (qq.flagged) cls += ' flagged';
      return '<button class="' + cls + '" data-qi="' + i + '">' + (i + 1) + '</button>';
    }).join('');

    var optionsHTML = q.options.map(function (opt, i) {
      var selected = q.answer === opt ? ' selected' : '';
      return '<button class="exam-option' + selected + '" data-val="' + esc(opt) + '">'
        + '<span class="exam-letter">' + letters[i] + '</span>'
        + '<span>' + esc(opt) + '</span>'
        + '</button>';
    }).join('');

    var answered = examState.questions.filter(function (qq) { return qq.answer !== null; }).length;

    panel.innerHTML = '<div class="exam-active">'
      + '<div class="exam-top-bar">'
      + '  <div class="exam-progress">Q ' + (idx + 1) + ' / ' + QUESTION_COUNT + ' (' + answered + ' answered)</div>'
      + '  <div class="exam-timer" id="examTimer">' + m + ':' + String(s).padStart(2, '0') + '</div>'
      + '</div>'
      + '<div class="exam-nav">' + navHTML + '</div>'
      + '<div class="exam-card">'
      + '  <div class="exam-q-header">'
      + '    <span class="exam-q-num">Question ' + (idx + 1) + '</span>'
      + '    <button class="exam-flag-btn' + (q.flagged ? ' flagged' : '') + '" id="examFlagBtn">'
      + '      <svg width="14" height="14" viewBox="0 0 24 24" fill="' + (q.flagged ? 'var(--yellow)' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>'
      + '      ' + (q.flagged ? 'Flagged' : 'Flag') + '</button>'
      + '  </div>'
      + '  <p class="exam-question">' + esc(q.card.front) + '</p>'
      + '  <div class="exam-options">' + optionsHTML + '</div>'
      + '</div>'
      + '<div class="exam-bottom-bar">'
      + '  <button class="anki-btn anki-btn-secondary" id="examPrev"' + (idx === 0 ? ' disabled' : '') + '>\u2190 Prev</button>'
      + '  <button class="anki-btn anki-btn-accent" id="examSubmitBtn">Submit Exam</button>'
      + '  <button class="anki-btn anki-btn-secondary" id="examNext"' + (idx === QUESTION_COUNT - 1 ? ' disabled' : '') + '>Next \u2192</button>'
      + '</div>'
      + '</div>';

    // Event handlers
    panel.querySelectorAll('.exam-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        q.answer = btn.dataset.val;
        renderQuestion(panel);
      });
    });

    panel.querySelectorAll('.exam-nav-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        examState.currentIndex = parseInt(dot.dataset.qi, 10);
        renderQuestion(panel);
      });
    });

    document.getElementById('examFlagBtn').addEventListener('click', function () {
      q.flagged = !q.flagged;
      renderQuestion(panel);
    });

    document.getElementById('examPrev').addEventListener('click', function () {
      if (examState.currentIndex > 0) { examState.currentIndex--; renderQuestion(panel); }
    });

    document.getElementById('examNext').addEventListener('click', function () {
      if (examState.currentIndex < QUESTION_COUNT - 1) { examState.currentIndex++; renderQuestion(panel); }
    });

    document.getElementById('examSubmitBtn').addEventListener('click', function () {
      var unanswered = examState.questions.filter(function (qq) { return qq.answer === null; }).length;
      if (unanswered > 0) {
        if (!confirm('You have ' + unanswered + ' unanswered questions. Submit anyway?')) return;
      }
      if (timer) { clearInterval(timer); timer = null; }
      submitExam(panel);
    });
  }

  function submitExam (panel) {
    examState.submitted = true;
    var correct = 0;
    examState.questions.forEach(function (q) {
      if (q.answer === q.card.back) correct++;
    });
    var score = correct;
    var total = QUESTION_COUNT;
    var pct = Math.round((score / total) * 100);
    var passed = pct >= PASS_THRESHOLD;

    // Save to history
    var g = loadGame();
    if (!g.examHistory) g.examHistory = [];
    g.examHistory.push({
      date: new Date().toLocaleDateString(),
      score: score,
      total: total,
      passed: passed,
    });
    // Award XP and coins
    g.xp = (g.xp || 0) + score * 5;
    g.coins = (g.coins || 0) + (passed ? 25 : 5);
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveAnki();

    // Section breakdown
    var sections = {};
    examState.questions.forEach(function (q) {
      var sid = q.card.section;
      if (!sections[sid]) sections[sid] = { correct: 0, total: 0, name: '' };
      sections[sid].total++;
      if (q.answer === q.card.back) sections[sid].correct++;
      if (typeof ANKI_SECTIONS !== 'undefined') {
        var sec = ANKI_SECTIONS.find(function (s) { return s.id === sid; });
        if (sec) sections[sid].name = sec.name;
      }
    });

    var breakdownHTML = '<div class="exam-breakdown">';
    for (var sid in sections) {
      var s = sections[sid];
      var sPct = Math.round((s.correct / s.total) * 100);
      var sClass = sPct >= 80 ? 'pass' : 'fail';
      breakdownHTML += '<div class="exam-breakdown-row ' + sClass + '">'
        + '<span>' + (s.name || 'S' + sid) + '</span>'
        + '<span>' + s.correct + '/' + s.total + ' (' + sPct + '%)</span>'
        + '</div>';
    }
    breakdownHTML += '</div>';

    panel.innerHTML = '<div class="exam-results">'
      + '<div class="exam-results-badge ' + (passed ? 'pass' : 'fail') + '">' + (passed ? 'PASS' : 'FAIL') + '</div>'
      + '<h2 class="exam-results-title">Exam Complete</h2>'
      + '<div class="exam-results-score">' + pct + '%</div>'
      + '<p class="exam-results-detail">' + score + ' / ' + total + ' correct</p>'
      + '<h3>Section Breakdown</h3>'
      + breakdownHTML
      + '<div class="exam-results-actions">'
      + '  <button class="anki-btn anki-btn-accent" id="examRetry">Retry Exam</button>'
      + '  <button class="anki-btn anki-btn-secondary" id="examBackToStart">Back</button>'
      + '</div>'
      + '</div>';

    document.getElementById('examRetry').addEventListener('click', function () { startExam(panel); });
    document.getElementById('examBackToStart').addEventListener('click', function () { renderStart(panel); });

    if (passed && typeof Effects !== 'undefined') {
      Effects.confetti({ count: 100, duration: 3000 });
    }
  }

  return { init: init };
})();
