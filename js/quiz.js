// ─────────────────────────────────────────────────────────────────────────────
//  NetDash — Quiz / Flashcard Engine
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const STORAGE_KEY = 'ccna_quiz_stats';
  const DEFAULT_QUIZ_SIZE = 10;
  const LETTERS = ['A', 'B', 'C', 'D'];

  // ── State ─────────────────────────────────────────────────
  const state = {
    mode:              'quiz',      // 'flashcard' | 'quiz'
    topic:             'all',
    difficulty:        'all',
    sessionQuestions:  [],
    currentIndex:      0,
    score:             0,
    wrongAnswers:      [],
    answered:          false,
    streak:            0,
    maxStreak:         0,
  };

  // ── localStorage helpers ───────────────────────────────────
  function loadStats () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function saveStats (stats) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (_) {}
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveQuiz();
  }

  function recordResult (qId, correct) {
    const stats = loadStats();
    if (!stats[qId]) stats[qId] = { correct: 0, incorrect: 0 };
    if (correct) stats[qId].correct++;
    else stats[qId].incorrect++;
    saveStats(stats);
  }

  // ── Adaptive question selection ────────────────────────────
  function buildPool (topicFilter, diffFilter) {
    let pool = QUIZ_QUESTIONS.slice();
    if (topicFilter !== 'all') pool = pool.filter(q => q.topic === topicFilter);
    if (diffFilter !== 'all') pool = pool.filter(q => q.difficulty === Number(diffFilter));
    return pool;
  }

  function weightedSample (pool, n) {
    const stats = loadStats();
    // Assign weights
    const weighted = pool.map(q => {
      const s = stats[q.id];
      let weight;
      if (!s) {
        weight = 1.5; // unseen preferred
      } else {
        weight = Math.max(0.3, 1 + s.incorrect * 0.5 - s.correct * 0.25);
      }
      return { q, weight };
    });

    const result = [];
    const available = weighted.slice();
    const count = Math.min(n, available.length);

    for (let i = 0; i < count; i++) {
      const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
      let rand = Math.random() * totalWeight;
      let chosen = available.length - 1;
      for (let j = 0; j < available.length; j++) {
        rand -= available[j].weight;
        if (rand <= 0) { chosen = j; break; }
      }
      result.push(available[chosen].q);
      available.splice(chosen, 1);
    }
    return result;
  }

  function shuffleArray (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── DOM refs (lazy) ────────────────────────────────────────
  function el (id) { return document.getElementById(id); }

  // ── Main entry point ───────────────────────────────────────
  function init () {
    renderSetup();
  }

  // ─────────────────────────────────────────────────────────
  //  SETUP SCREEN
  // ─────────────────────────────────────────────────────────

  function renderSetup () {
    const panel = el('tool-study');
    panel.innerHTML = buildSetupHTML();
    bindSetupEvents();
    updateSetupStats();
  }

  function buildSetupHTML () {
    const topicPills = QUIZ_TOPICS.map(t => `
      <button class="topic-pill${state.topic === t.id ? ' selected' : ''}"
              data-topic="${t.id}">${t.label}</button>
    `).join('');

    return `
      <div class="study-setup">
        <div class="study-setup-header">
          <h2>Study Center</h2>
          <p>Select a topic and difficulty, then choose your mode.</p>
        </div>

        <!-- Topic -->
        <div class="setup-section">
          <div class="setup-section-title">Topic</div>
          <div class="topic-pills">
            <button class="topic-pill${state.topic === 'all' ? ' selected' : ''}"
                    data-topic="all">All Topics</button>
            ${topicPills}
          </div>
        </div>

        <!-- Difficulty -->
        <div class="setup-section">
          <div class="setup-section-title">Difficulty</div>
          <div class="difficulty-group">
            <button class="diff-btn${state.difficulty === 'all' ? ' selected' : ''}"
                    data-diff="all">All Levels</button>
            <button class="diff-btn${state.difficulty === '1' ? ' selected' : ''}"
                    data-diff="1">Easy</button>
            <button class="diff-btn${state.difficulty === '2' ? ' selected' : ''}"
                    data-diff="2">Medium</button>
            <button class="diff-btn${state.difficulty === '3' ? ' selected' : ''}"
                    data-diff="3">Hard</button>
          </div>
        </div>

        <!-- Stats -->
        <div class="setup-section">
          <div class="setup-section-title">Your Progress</div>
          <div class="stats-row" id="setupStatsRow"></div>
        </div>

        <!-- Start Buttons -->
        <div class="start-buttons">
          <button class="btn-start btn-start-flashcard" id="btnStartFlashcard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M12 5v14M2 12h20" opacity="0.4"/>
            </svg>
            Flashcards
          </button>
          <button class="btn-start btn-start-quiz" id="btnStartQuiz">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            Quiz Mode
          </button>
        </div>
      </div>
    `;
  }

  function updateSetupStats () {
    const statsRow = el('setupStatsRow');
    if (!statsRow) return;

    const pool = buildPool(state.topic, state.difficulty);
    const stats = loadStats();
    let seen = 0, correct = 0, incorrect = 0;
    pool.forEach(q => {
      const s = stats[q.id];
      if (s) {
        seen++;
        correct += s.correct;
        incorrect += s.incorrect;
      }
    });
    const total = pool.length;
    const mastery = total > 0 ? Math.round((seen / total) * 100) : 0;

    statsRow.innerHTML = `
      <div class="stats-chip chip-accent">
        <span class="stats-chip-value">${total}</span>
        <span class="stats-chip-label">Questions</span>
      </div>
      <div class="stats-chip chip-green">
        <span class="stats-chip-value">${correct}</span>
        <span class="stats-chip-label">Correct</span>
      </div>
      <div class="stats-chip chip-red">
        <span class="stats-chip-value">${incorrect}</span>
        <span class="stats-chip-label">Incorrect</span>
      </div>
      <div class="stats-chip chip-yellow">
        <span class="stats-chip-value">${mastery}%</span>
        <span class="stats-chip-label">Coverage</span>
      </div>
    `;
  }

  function bindSetupEvents () {
    // Topic pills
    document.querySelectorAll('.topic-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.topic = btn.dataset.topic;
        document.querySelectorAll('.topic-pill').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateSetupStats();
      });
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.difficulty = btn.dataset.diff;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateSetupStats();
      });
    });

    // Start buttons
    const btnFC = el('btnStartFlashcard');
    const btnQ  = el('btnStartQuiz');
    if (btnFC) btnFC.addEventListener('click', () => startFlashcards());
    if (btnQ)  btnQ.addEventListener('click',  () => startQuiz());
  }

  // ─────────────────────────────────────────────────────────
  //  FLASHCARD MODE
  // ─────────────────────────────────────────────────────────

  function startFlashcards () {
    const pool = buildPool(state.topic, state.difficulty);
    if (pool.length === 0) { alert('No questions match those filters. Try different settings.'); return; }

    state.mode = 'flashcard';
    state.sessionQuestions = shuffleArray(pool);
    state.currentIndex = 0;
    state.score = 0;
    state.wrongAnswers = [];
    state.streak = 0;
    state.maxStreak = 0;

    renderFlashcardSession();
  }

  function renderFlashcardSession () {
    const total = state.sessionQuestions.length;
    const idx   = state.currentIndex;

    if (idx >= total) {
      renderFlashcardResults();
      return;
    }

    const q = state.sessionQuestions[idx];
    const panel = el('tool-study');
    const pct = total > 0 ? (idx / total) * 100 : 0;
    const diffLabel = ['', 'Easy', 'Medium', 'Hard'][q.difficulty] || '';
    const topicLabel = (QUIZ_TOPICS.find(t => t.id === q.topic) || {}).label || q.topic;

    panel.innerHTML = `
      <div class="flashcard-area">

        <!-- Header -->
        <div class="session-header">
          <button class="session-back-btn" id="fcBackBtn">← Setup</button>
          <span class="session-title">Flashcards — ${topicLabel}</span>
          <span class="session-progress-label">${idx + 1} / ${total}</span>
        </div>

        <!-- Progress bar -->
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>

        <!-- Flashcard -->
        <div class="flashcard-wrap" id="fcWrap" title="Click to flip" role="button" tabindex="0" aria-label="Click to flip card">
          <div class="flashcard" id="flashcard">

            <!-- Front -->
            <div class="flashcard-front">
              <span class="flashcard-topic-badge">${escapeHtml(topicLabel)}</span>
              <p class="flashcard-question">${escapeHtml(q.question)}</p>
              <div class="flashcard-flip-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
                </svg>
                Click to reveal answer
              </div>
              <span class="flashcard-diff-dot diff-${q.difficulty}"></span>
            </div>

            <!-- Back -->
            <div class="flashcard-back">
              <span class="flashcard-answer-label">Answer</span>
              <p class="flashcard-answer">${escapeHtml(q.options[q.answer])}</p>
              <p class="flashcard-explanation">${escapeHtml(q.explanation)}</p>
              ${q.tip ? `<div class="flashcard-tip"><strong>Tip:</strong> ${escapeHtml(q.tip)}</div>` : ''}
            </div>

          </div>
        </div>

        <!-- Action buttons (hidden until flipped) -->
        <div class="flashcard-actions hidden" id="fcActions">
          <button class="btn-fc btn-fc-again" id="fcAgain">↻ Review Again</button>
          <button class="btn-fc btn-fc-got-it" id="fcGotIt">✓ Got It</button>
        </div>

      </div>
    `;

    // Flip handler
    const wrap = el('fcWrap');
    const card = el('flashcard');
    const actions = el('fcActions');

    function flipCard () {
      card.classList.add('flipped');
      actions.classList.remove('hidden');
      wrap.setAttribute('tabindex', '-1');
    }

    wrap.addEventListener('click', flipCard);
    wrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(); } });

    el('fcBackBtn').addEventListener('click', () => { renderSetup(); });

    el('fcAgain').addEventListener('click', () => {
      recordResult(q.id, false);
      state.wrongAnswers.push(q);
      state.streak = 0;
      // Re-queue at end
      state.sessionQuestions.push(q);
      // Remove from current position (it's already been "seen")
      state.currentIndex++;
      renderFlashcardSession();
    });

    el('fcGotIt').addEventListener('click', () => {
      recordResult(q.id, true);
      state.score++;
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
      state.currentIndex++;
      renderFlashcardSession();
    });
  }

  function renderFlashcardResults () {
    const total    = state.score + state.wrongAnswers.length;
    const known    = state.score;
    const learning = state.wrongAnswers.length;
    const mastery  = total > 0 ? Math.round((known / total) * 100) : 0;

    // Per-topic mastery
    const topicStats = {};
    state.sessionQuestions.forEach(q => {
      if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0 };
      topicStats[q.topic].total++;
    });
    const stats = loadStats();

    const panel = el('tool-study');
    panel.innerHTML = `
      <div class="fc-results">
        <div class="session-header">
          <button class="session-back-btn" id="fcResBackBtn">← Setup</button>
          <span class="session-title">Flashcard Results</span>
        </div>

        <div class="fc-results-stats">
          <div class="stats-chip chip-green">
            <span class="stats-chip-value">${known}</span>
            <span class="stats-chip-label">Got It</span>
          </div>
          <div class="stats-chip chip-red">
            <span class="stats-chip-value">${learning}</span>
            <span class="stats-chip-label">Still Learning</span>
          </div>
          <div class="stats-chip chip-yellow">
            <span class="stats-chip-value">${mastery}%</span>
            <span class="stats-chip-label">Mastery</span>
          </div>
          <div class="stats-chip chip-accent">
            <span class="stats-chip-value">${state.maxStreak}</span>
            <span class="stats-chip-label">Best Streak</span>
          </div>
        </div>

        <div class="results-actions">
          ${state.wrongAnswers.length > 0 ? `
          <button class="btn-results btn-results-primary" id="fcRetryMissed">
            ↻ Review Missed (${state.wrongAnswers.length})
          </button>` : ''}
          <button class="btn-results btn-results-secondary" id="fcNewSession">
            New Session
          </button>
        </div>
      </div>
    `;

    el('fcResBackBtn').addEventListener('click', renderSetup);
    const retryBtn = el('fcRetryMissed');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        state.sessionQuestions = shuffleArray(state.wrongAnswers);
        state.currentIndex = 0;
        state.score = 0;
        state.wrongAnswers = [];
        state.streak = 0;
        state.maxStreak = 0;
        renderFlashcardSession();
      });
    }
    el('fcNewSession').addEventListener('click', startFlashcards);
  }

  // ─────────────────────────────────────────────────────────
  //  QUIZ MODE
  // ─────────────────────────────────────────────────────────

  function startQuiz () {
    const pool = buildPool(state.topic, state.difficulty);
    if (pool.length === 0) { alert('No questions match those filters. Try different settings.'); return; }

    state.mode = 'quiz';
    state.sessionQuestions = weightedSample(pool, DEFAULT_QUIZ_SIZE);
    state.currentIndex = 0;
    state.score = 0;
    state.wrongAnswers = [];
    state.answered = false;
    state.streak = 0;
    state.maxStreak = 0;

    renderQuizQuestion();
  }

  function renderQuizQuestion () {
    const total = state.sessionQuestions.length;
    const idx   = state.currentIndex;

    if (idx >= total) {
      renderQuizResults();
      return;
    }

    const q   = state.sessionQuestions[idx];
    const pct = total > 0 ? (idx / total) * 100 : 0;
    const topicLabel = (QUIZ_TOPICS.find(t => t.id === q.topic) || {}).label || q.topic;
    const diffLabel  = ['', 'Easy', 'Medium', 'Hard'][q.difficulty] || '';

    state.answered = false;

    const panel = el('tool-study');
    panel.innerHTML = `
      <div class="quiz-area">

        <!-- Header -->
        <div class="session-header">
          <button class="session-back-btn" id="qzBackBtn">← Setup</button>
          <span class="session-title">Quiz — ${topicLabel}</span>
          <div class="streak-badge" id="streakBadge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            ${state.streak}
          </div>
          <span class="session-progress-label">${idx + 1} / ${total}</span>
        </div>

        <!-- Progress bar -->
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>

        <!-- Question card -->
        <div class="quiz-question-card">
          <div class="quiz-q-meta">
            <span class="quiz-topic-badge">${escapeHtml(topicLabel)}</span>
            <span class="quiz-diff-label">${escapeHtml(diffLabel)}</span>
          </div>
          <p class="quiz-question-text">${escapeHtml(q.question)}</p>
        </div>

        <!-- Options -->
        <div class="quiz-options" id="quizOptions">
          ${q.options.map((opt, i) => `
            <button class="quiz-option" data-idx="${i}">
              <span class="quiz-option-letter">${LETTERS[i]}</span>
              <span>${escapeHtml(opt)}</span>
            </button>
          `).join('')}
        </div>

        <!-- Feedback banner -->
        <div class="quiz-feedback-banner" id="quizFeedback"></div>

        <!-- Explanation box -->
        <div class="explanation-box" id="explanationBox">
          <button class="explanation-toggle" id="explanationToggle">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            Explain this answer
            <span class="explanation-toggle-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </button>
          <div class="explanation-body" id="explanationBody">
            <div class="explanation-correct-answer">
              <span class="explanation-correct-label">Correct</span>
              <span class="explanation-correct-text">${escapeHtml(q.options[q.answer])}</span>
            </div>
            <p class="explanation-text">${escapeHtml(q.explanation)}</p>
            ${q.tip ? `<div class="explanation-tip"><strong>Tip:</strong> ${escapeHtml(q.tip)}</div>` : ''}
            <div class="explanation-tags">
              ${q.tags.map(t => `<span class="explanation-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Next button -->
        <div class="quiz-nav">
          <button class="btn-next" id="btnNext" disabled>
            ${idx + 1 < total ? 'Next Question →' : 'See Results →'}
          </button>
        </div>

      </div>
    `;

    // Bind option clicks
    el('quizOptions').addEventListener('click', e => {
      const btn = e.target.closest('.quiz-option');
      if (!btn || state.answered) return;
      handleAnswer(q, parseInt(btn.dataset.idx, 10));
    });

    // Explanation toggle
    el('explanationToggle').addEventListener('click', () => {
      const box = el('explanationBox');
      box.classList.toggle('open');
    });

    el('qzBackBtn').addEventListener('click', renderSetup);
    el('btnNext').addEventListener('click', () => {
      state.currentIndex++;
      renderQuizQuestion();
    });
  }

  function handleAnswer (q, chosenIdx) {
    state.answered = true;
    const isCorrect = chosenIdx === q.answer;

    recordResult(q.id, isCorrect);

    if (isCorrect) {
      state.score++;
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    } else {
      state.wrongAnswers.push(q);
      state.streak = 0;
    }

    // Style options
    const optBtns = document.querySelectorAll('.quiz-option');
    optBtns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer && isCorrect) {
        btn.classList.add('correct');
      } else if (i === chosenIdx && !isCorrect) {
        btn.classList.add('wrong');
      } else if (i === q.answer && !isCorrect) {
        btn.classList.add('reveal');
      } else {
        btn.classList.add('dimmed');
      }
    });

    // Feedback banner
    const banner = el('quizFeedback');
    banner.classList.add('show');
    if (isCorrect) {
      banner.classList.add('correct');
      banner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Correct!`;
    } else {
      banner.classList.add('wrong');
      banner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        Not quite — see explanation below`;
      // Auto-expand explanation on wrong answer
      el('explanationBox').classList.add('open');
    }

    // Update streak badge
    const badge = el('streakBadge');
    if (badge) {
      badge.textContent = '';
      badge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        ${state.streak}
      `;
      if (isCorrect) badge.classList.add('bump');
      setTimeout(() => badge.classList.remove('bump'), 400);
    }

    // Enable next button
    el('btnNext').disabled = false;
  }

  // ─────────────────────────────────────────────────────────
  //  QUIZ RESULTS
  // ─────────────────────────────────────────────────────────

  function renderQuizResults () {
    const total   = state.sessionQuestions.length;
    const score   = state.score;
    const pct     = total > 0 ? Math.round((score / total) * 100) : 0;
    const passing = pct >= 70;

    // Per-topic breakdown
    const topicMap = {};
    state.sessionQuestions.forEach((q, i) => {
      if (!topicMap[q.topic]) {
        const label = (QUIZ_TOPICS.find(t => t.id === q.topic) || {}).label || q.topic;
        topicMap[q.topic] = { label, total: 0, correct: 0 };
      }
      topicMap[q.topic].total++;
    });
    state.wrongAnswers.forEach(q => {
      if (topicMap[q.topic]) {
        // mark as incorrect — correct count = total - wrong
      }
    });
    // Recalculate correct per topic from session
    Object.keys(topicMap).forEach(tid => { topicMap[tid].correct = 0; });
    state.sessionQuestions.forEach(q => {
      if (!state.wrongAnswers.find(w => w.id === q.id)) {
        if (topicMap[q.topic]) topicMap[q.topic].correct++;
      }
    });

    // Areas to review = topics with < 70% score
    const weakTopics = Object.values(topicMap).filter(t => t.total > 0 && (t.correct / t.total) < 0.7);

    // Circle offset: circumference ≈ 283
    const circleOffset = Math.round(283 - (pct / 100) * 283);
    const circleClass  = pct >= 80 ? 'passing' : pct < 50 ? 'failing' : '';

    // Topic rows
    const topicRowsHTML = Object.values(topicMap).map(t => {
      const topicPct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
      const barClass  = topicPct >= 70 ? 'mastery-high' : topicPct >= 40 ? 'mastery-mid' : 'mastery-low';
      return `
        <tr>
          <td>${escapeHtml(t.label)}</td>
          <td>${t.correct} / ${t.total}</td>
          <td>
            <div class="mastery-bar-wrap">
              <div class="mastery-bar-fill ${barClass}" style="width:${topicPct}%"></div>
            </div>
            <span style="margin-left:8px;font-size:12px;color:var(--text-muted)">${topicPct}%</span>
          </td>
        </tr>
      `;
    }).join('');

    const areasHTML = weakTopics.length > 0 ? `
      <div class="areas-review">
        <div class="areas-review-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Areas to Review
        </div>
        <div class="areas-review-list">
          ${weakTopics.map(t => `<span class="area-tag">${escapeHtml(t.label)}</span>`).join('')}
        </div>
      </div>
    ` : '';

    const headlineMsg = pct >= 80
      ? 'Great work! Keep it up.'
      : pct >= 60
        ? 'Good effort — review the weak areas below.'
        : 'Keep studying — you\'ll get there!';

    const panel = el('tool-study');
    panel.innerHTML = `
      <div class="results-view">

        <!-- Back -->
        <div class="session-header">
          <button class="session-back-btn" id="resBackBtn">← Setup</button>
          <span class="session-title">Quiz Results</span>
        </div>

        <!-- Hero -->
        <div class="results-hero">
          <div class="results-score-circle ${circleClass}" id="scoreCircle">
            <svg viewBox="0 0 100 100">
              <circle class="circle-track" cx="50" cy="50" r="45"/>
              <circle class="circle-fill" id="circleFill" cx="50" cy="50" r="45"
                      style="stroke-dashoffset:${circleOffset}"/>
            </svg>
            <div class="results-score-text">
              <span class="results-score-pct">${pct}%</span>
              <span class="results-score-sub">${score}/${total}</span>
            </div>
          </div>
          <div class="results-summary">
            <h3>${headlineMsg}</h3>
            <p>You answered ${score} of ${total} questions correctly.</p>
            ${state.maxStreak >= 3 ? `<div class="results-streak-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Best streak: ${state.maxStreak}
            </div>` : ''}
          </div>
        </div>

        <!-- Topic breakdown -->
        ${Object.keys(topicMap).length > 0 ? `
        <div class="results-card">
          <div class="results-card-title">Topic Breakdown</div>
          <table class="topic-breakdown-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Score</th>
                <th>Mastery</th>
              </tr>
            </thead>
            <tbody>${topicRowsHTML}</tbody>
          </table>
        </div>
        ` : ''}

        ${areasHTML}

        <!-- Actions -->
        <div class="results-actions">
          ${state.wrongAnswers.length > 0 ? `
          <button class="btn-results btn-results-primary" id="retryMissedBtn">
            ↻ Retry Missed (${state.wrongAnswers.length})
          </button>` : ''}
          <button class="btn-results btn-results-secondary" id="newQuizBtn">
            New Quiz
          </button>
          <button class="btn-results btn-results-secondary" id="backSetupBtn2">
            ← Back to Setup
          </button>
        </div>

      </div>
    `;

    // Animate circle
    setTimeout(() => {
      const fill = el('circleFill');
      if (fill) fill.style.strokeDashoffset = String(circleOffset);
    }, 100);

    el('resBackBtn').addEventListener('click', renderSetup);
    el('newQuizBtn').addEventListener('click', startQuiz);
    el('backSetupBtn2').addEventListener('click', renderSetup);

    const retryBtn = el('retryMissedBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        state.sessionQuestions = state.wrongAnswers.slice();
        state.currentIndex = 0;
        state.score = 0;
        state.wrongAnswers = [];
        state.answered = false;
        state.streak = 0;
        state.maxStreak = 0;
        renderQuizQuestion();
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function escapeHtml (str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Public API ────────────────────────────────────────────
  window.QuizEngine = {
    init,
    startMode: function (mode) {
      if (mode === 'flashcard') {
        init();
        // slight delay to ensure DOM is rendered
        setTimeout(startFlashcards, 50);
      } else {
        init();
        setTimeout(startQuiz, 50);
      }
    },
  };

  // Auto-init when tool panel is active
  // (app.js calls QuizEngine.init() when switching to study panel)

})();
