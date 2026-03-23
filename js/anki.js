// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — ANKI Game Engine
//  Territory map, boss battles, flashcards with hints, XP/leveling, mastery
//  Modes: Free Recall (flip card) + Multiple Choice (multiple choice)
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const STORAGE_KEY = 'ccna_anki_game';
  const DECAY_DAYS  = 7;
  const LETTERS     = ['A', 'B', 'C', 'D'];

  // ── Mastery / Spaced Repetition config ──────────────────
  const MASTERY_INTERVALS = [0, 2, 4, 8, 16, 32];
  const MASTERY_LABELS  = ['New', 'Learning', 'Familiar', 'Practiced', 'Strong', 'Mastered'];
  const MASTERY_COLORS  = ['var(--text-muted)', 'var(--red)', '#f59e0b', 'var(--yellow)', 'var(--accent)', 'var(--green)'];
  const DAY_MS = 24 * 60 * 60 * 1000;

  // ── XP / Level config ─────────────────────────────────────
  function xpForLevel (lvl) { return lvl * (lvl - 1) * 50; }
  function levelFromXP (xp) {
    let lvl = 1;
    while (xpForLevel(lvl + 1) <= xp) lvl++;
    return lvl;
  }

  // ── Persistent state ──────────────────────────────────────
  function loadGame () {
    try {
      const g = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultGame();
      migrateCardStats(g);
      if (g.mode === undefined) g.mode = 'recall';
      return g;
    } catch (_) { return defaultGame(); }
  }

  function defaultGame () {
    return {
      xp: 0, totalCorrect: 0, totalWrong: 0, bestStreak: 0,
      sections: {}, cardStats: {},
      mode: 'recall',
      coins: 0,
      streakCalendar: {},
      achievements: [],
      dailyChallenge: { date: null, completed: false, sectionId: null },
      speedRoundBest: {},
      examHistory: [],
    };
  }

  function migrateCardStats (g) {
    for (const id in g.cardStats) {
      const cs = g.cardStats[id];
      if (cs.mastery === undefined) {
        cs.mastery = 0; cs.consecutiveCorrect = 0; cs.lastReview = null; cs.nextDue = null;
      }
    }
  }

  function saveGame (g) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch (_) {}
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveAnki();
  }

  // ── Mastery helpers ─────────────────────────────────────
  function ensureCardStats (cardId) {
    if (!game.cardStats[cardId]) {
      game.cardStats[cardId] = { correct: 0, wrong: 0, mastery: 0, consecutiveCorrect: 0, lastReview: null, nextDue: null };
    }
    return game.cardStats[cardId];
  }

  function isCardDue (cardId) {
    const cs = game.cardStats[cardId];
    if (!cs || cs.nextDue === null) return true;
    return Date.now() >= cs.nextDue;
  }

  function getSectionMasteryInfo (sectionId) {
    const cards = ANKI_CARDS.filter(c => c.section === sectionId);
    let mastered = 0, dueCount = 0, totalMastery = 0;
    cards.forEach(c => {
      const cs = game.cardStats[c.id];
      const level = cs ? (cs.mastery || 0) : 0;
      totalMastery += level;
      if (level >= 5) mastered++;
      if (!cs || cs.nextDue === null || Date.now() >= cs.nextDue) dueCount++;
    });
    return { total: cards.length, mastered, dueCount, avgMastery: cards.length ? totalMastery / cards.length : 0 };
  }

  // ── Distractor generation for multiple choice ───────────
  // Tiered matching: same tag+section → same tag → same section → any
  function getDistractors (card, count) {
    const correctNorm = card.back.toLowerCase().trim();
    const distractors = [];
    const seen = new Set([correctNorm]);

    function addFromPool (pool) {
      const shuffled = shuffleArray(pool);
      for (const c of shuffled) {
        if (distractors.length >= count) return;
        const norm = c.back.toLowerCase().trim();
        if (!seen.has(norm)) {
          seen.add(norm);
          distractors.push(c.back);
        }
      }
    }

    if (card.tag) {
      // Tier 1: Same tag + same section (best distractors)
      addFromPool(ANKI_CARDS.filter(c => c.tag === card.tag && c.section === card.section && c.id !== card.id));
      // Tier 2: Same tag, any section
      addFromPool(ANKI_CARDS.filter(c => c.tag === card.tag && c.id !== card.id));
    }
    // Tier 3: Same section
    addFromPool(ANKI_CARDS.filter(c => c.section === card.section && c.id !== card.id));
    // Tier 4: Any card (fallback)
    addFromPool(ANKI_CARDS.filter(c => c.id !== card.id));

    return distractors;
  }

  // ── Session state ─────────────────────────────────────────
  let game = loadGame();
  let session = {
    view: 'map', sectionId: null, cards: [], cardIndex: 0,
    lives: 3, bossHP: 0, bossMaxHP: 0, streak: 0, sessionXP: 0,
    sessionCorrect: 0, sessionWrong: 0,
    hintsUsed: 0, hintLevel: 0, flipped: false, timerStart: 0,
    answered: false,
  };

  // ── DOM helper ────────────────────────────────────────────
  function el (id) { return document.getElementById(id); }
  function esc (str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Section helpers ───────────────────────────────────────
  function isSameDay (ts1, ts2) {
    const d1 = new Date(ts1), d2 = new Date(ts2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  function wasBossBeatenToday (sid) {
    const s = game.sections[sid];
    return s && s.defeated && s.lastReview && isSameDay(s.lastReview, Date.now());
  }

  function getSectionStatus (sid) {
    const s = game.sections[sid];
    if (!s) return 'locked';
    if (s.defeated) {
      if (s.lastReview) {
        const days = (Date.now() - s.lastReview) / DAY_MS;
        if (days > DECAY_DAYS) return 'decayed';
      }
      return 'conquered';
    }
    if (s.hp !== undefined && s.hp < s.maxHP) return 'in-progress';
    return 'unconquered';
  }

  function unlockAllSections () {
    ANKI_SECTIONS.forEach(sec => {
      if (!game.sections[sec.id]) {
        const cards = ANKI_CARDS.filter(c => c.section === sec.id);
        game.sections[sec.id] = { defeated: false, lastReview: null, hp: cards.length * 10, maxHP: cards.length * 10 };
      }
    });
    saveGame(game);
  }

  // ── Mastery decay — drop overdue cards ───────────────────
  function decayOverdueCards () {
    let changed = false;
    for (const id in game.cardStats) {
      const cs = game.cardStats[id];
      if (cs.mastery > 0 && cs.nextDue && Date.now() > cs.nextDue) {
        // How many intervals overdue?
        const overdueDays = (Date.now() - cs.nextDue) / DAY_MS;
        const drops = Math.min(cs.mastery, Math.floor(overdueDays / MASTERY_INTERVALS[cs.mastery] || 1));
        if (drops > 0) {
          cs.mastery = Math.max(0, cs.mastery - drops);
          cs.consecutiveCorrect = 0;
          cs.nextDue = null; // Mark as due now
          changed = true;
        }
      }
    }
    if (changed) saveGame(game);
  }

  // ── Mastery color for tile borders ─────────────────────
  function masteryColor (pct) {
    if (pct >= 80) return 'var(--green)';
    if (pct >= 60) return 'var(--accent)';
    if (pct >= 40) return 'var(--yellow)';
    if (pct >= 20) return '#f59e0b';
    return 'var(--red)';
  }

  // ── Init ──────────────────────────────────────────────────
  function init () {
    unlockAllSections();
    decayOverdueCards();
    renderMap();
  }

  // ═══════════════════════════════════════════════════════════
  //  TERRITORY MAP
  // ═══════════════════════════════════════════════════════════

  function renderMap () {
    session.view = 'map';
    const panel = el('tool-anki');
    const level = levelFromXP(game.xp);
    const nextLvlXP = xpForLevel(level + 1);
    const prevLvlXP = xpForLevel(level);
    const pct = nextLvlXP > prevLvlXP ? Math.round(((game.xp - prevLvlXP) / (nextLvlXP - prevLvlXP)) * 100) : 100;

    const conquered = ANKI_SECTIONS.filter(s => getSectionStatus(s.id) === 'conquered').length;
    const totalSections = ANKI_SECTIONS.length;
    const conquestPct = Math.round((conquered / totalSections) * 100);
    const totalMastered = ANKI_SECTIONS.reduce((sum, sec) => sum + getSectionMasteryInfo(sec.id).mastered, 0);
    const totalCards = ANKI_CARDS.length;

    const tilesHTML = ANKI_SECTIONS.map(sec => {
      const status = getSectionStatus(sec.id);
      const secData = game.sections[sec.id] || {};
      const hpPct = secData.maxHP ? Math.round(((secData.maxHP - (secData.hp || 0)) / secData.maxHP) * 100) : 0;
      const mInfo = getSectionMasteryInfo(sec.id);
      const masteryPct = Math.round((mInfo.avgMastery / 5) * 100);
      const highMastery = masteryPct >= 80 ? ' terr-high-mastery' : '';

      const statusIcon = status === 'conquered' ? '<svg class="terr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>'
        : status === 'decayed' ? '<svg class="terr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        : '<svg class="terr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

      const mColor = masteryColor(masteryPct);

      const hasGuide = sec.studyGuide;
      const beatenToday = wasBossBeatenToday(sec.id);
      const todayClass = beatenToday ? ' terr-beaten-today' : '';
      return `
        <button class="territory-tile terr-${status}${highMastery}${todayClass}" data-section="${sec.id}" title="${esc(sec.name)} (${sec.count} cards)" style="--mastery-ring: ${mColor}">
          <div class="terr-section-num">S${sec.id}</div>
          ${mInfo.dueCount > 0 && status !== 'conquered' ? `<div class="terr-due-badge">${mInfo.dueCount} due</div>` : ''}
          ${hasGuide ? `<div class="terr-study-btn" data-study="${sec.id}" title="Study Guide"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>` : ''}
          <div class="terr-status-icon">${statusIcon}</div>
          <div class="terr-name">${esc(sec.name)}</div>
          <div class="terr-card-count">${sec.count} cards</div>
          <div class="terr-mastery-info">${masteryPct}% mastery</div>
          <div class="terr-mastery-bar"><div class="terr-mastery-fill" style="width:${masteryPct}%"></div></div>
          ${status !== 'conquered' ? `<div class="terr-hp-bar"><div class="terr-hp-fill" style="width:${hpPct}%"></div></div>` : ''}
        </button>
      `;
    }).join('');

    // Daily challenge banner
    const dailyBannerHTML = (typeof DailyChallenge !== 'undefined' && DailyChallenge.renderBanner)
      ? DailyChallenge.renderBanner() : '';

    // Streak info
    const streakCount = (typeof StreakCalendar !== 'undefined' && StreakCalendar.getStreak)
      ? StreakCalendar.getStreak() : 0;
    const streakHTML = streakCount > 0 ? `<div class="anki-streak-indicator">\uD83D\uDD25 ${streakCount}-day streak</div>` : '';

    panel.innerHTML = `
      <div class="anki-map-view">
        ${dailyBannerHTML}
        <div class="anki-hud">
          <div class="anki-hud-left">
            <div class="anki-level-badge">Lv ${level}</div>
            <div class="anki-xp-wrap">
              <div class="anki-xp-bar"><div class="anki-xp-fill" style="width:${pct}%"></div></div>
              <span class="anki-xp-label">${game.xp} / ${nextLvlXP} XP</span>
            </div>
            ${streakHTML}
          </div>
          <div class="anki-hud-right">
            <div class="anki-stat"><span class="anki-stat-val">${game.totalCorrect}</span><span class="anki-stat-lbl">Correct</span></div>
            <div class="anki-stat"><span class="anki-stat-val">${game.bestStreak}</span><span class="anki-stat-lbl">Best Streak</span></div>
            <div class="anki-stat"><span class="anki-stat-val">${conquestPct}%</span><span class="anki-stat-lbl">Conquered</span></div>
            <div class="anki-stat"><span class="anki-stat-val">${totalMastered}/${totalCards}</span><span class="anki-stat-lbl">Mastered</span></div>
          </div>
        </div>
        <div class="anki-map-actions">
          <button class="anki-btn anki-btn-accent" id="ankiQuickPlay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Quick Play (Random)
          </button>
          <button class="anki-btn anki-btn-secondary" id="ankiWeakFocus">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Focus Weak Areas
          </button>
          <div class="anki-conquest-bar-wrap">
            <div class="anki-conquest-bar"><div class="anki-conquest-fill" style="width:${conquestPct}%"></div></div>
            <span>${conquered} / ${totalSections} sections conquered</span>
          </div>
        </div>
        <div class="anki-territory-grid" id="ankiTerritoryGrid">${tilesHTML}</div>
      </div>
    `;

    el('ankiQuickPlay').addEventListener('click', startQuickPlay);

    // Weak Area Focus button
    el('ankiWeakFocus').addEventListener('click', startWeakAreaBattle);

    // Daily challenge click
    var dailyBtn = document.getElementById('dailyChallengeBtn');
    if (dailyBtn) {
      dailyBtn.addEventListener('click', function () {
        var secId = dailyBtn.dataset.section;
        if (secId) startBossBattle(secId);
      });
    }

    el('ankiTerritoryGrid').addEventListener('click', e => {
      // Study guide button
      const studyBtn = e.target.closest('.terr-study-btn');
      if (studyBtn) {
        e.stopPropagation();
        renderStudyGuide(studyBtn.dataset.study);
        return;
      }
      const tile = e.target.closest('.territory-tile');
      if (!tile) return;
      startBossBattle(tile.dataset.section);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  STUDY GUIDE
  // ═══════════════════════════════════════════════════════════

  function renderStudyGuide (sectionId) {
    const sec = ANKI_SECTIONS.find(s => s.id === sectionId);
    if (!sec || !sec.studyGuide) return;
    const guide = sec.studyGuide;
    const panel = el('tool-anki');

    let html = '<div class="anki-study-view">';
    html += '<div class="anki-study-header">';
    html += '<button class="anki-back-btn" id="ankiStudyBack">\u2190 Map</button>';
    html += '<h2 class="anki-study-title">' + esc(sec.name) + '</h2>';
    html += '</div>';

    // Overview
    if (guide.overview) {
      html += '<div class="anki-study-section">';
      html += '<p class="anki-study-overview">' + esc(guide.overview) + '</p>';
      html += '</div>';
    }

    // Key Terms
    if (guide.keyTerms && guide.keyTerms.length) {
      html += '<div class="anki-study-section">';
      html += '<h3 class="anki-study-heading">Key Terms</h3>';
      html += '<div class="anki-study-terms">';
      guide.keyTerms.forEach(function (t) {
        html += '<div class="anki-study-term">';
        html += '<span class="anki-study-term-name">' + esc(t.term) + '</span>';
        html += '<span class="anki-study-term-def">' + esc(t.definition) + '</span>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // Key Points
    if (guide.keyPoints && guide.keyPoints.length) {
      html += '<div class="anki-study-section">';
      html += '<h3 class="anki-study-heading">Key Points</h3>';
      html += '<ul class="anki-study-points">';
      guide.keyPoints.forEach(function (p) {
        html += '<li>' + esc(p) + '</li>';
      });
      html += '</ul></div>';
    }

    // Examples
    if (guide.examples && guide.examples.length) {
      html += '<div class="anki-study-section">';
      html += '<h3 class="anki-study-heading">Examples</h3>';
      guide.examples.forEach(function (ex) {
        html += '<div class="anki-study-example">' + esc(ex) + '</div>';
      });
      html += '</div>';
    }

    // Tips
    if (guide.tips && guide.tips.length) {
      html += '<div class="anki-study-section">';
      html += '<h3 class="anki-study-heading">Study Tips</h3>';
      guide.tips.forEach(function (tip) {
        html += '<div class="anki-study-tip">' + esc(tip) + '</div>';
      });
      html += '</div>';
    }

    // Start Quiz button
    html += '<div class="anki-study-actions">';
    html += '<button class="anki-btn anki-btn-accent" id="ankiStudyStart">Start Quiz \u2192</button>';
    html += '</div>';
    html += '</div>';

    panel.innerHTML = html;
    el('ankiStudyBack').addEventListener('click', renderMap);
    el('ankiStudyStart').addEventListener('click', function () { startBossBattle(sectionId); });
  }

  // ═══════════════════════════════════════════════════════════
  //  BOSS BATTLE
  // ═══════════════════════════════════════════════════════════

  function startBossBattle (sectionId) {
    const cards = ANKI_CARDS.filter(c => c.section === sectionId);
    if (cards.length === 0) return;
    const secData = game.sections[sectionId];

    // Reset boss HP for a new run, but preserve today's beaten status
    if (secData.defeated || secData.hp === 0) {
      secData.defeated = false;
      secData.hp = secData.maxHP;
      saveGame(game);
    }

    session.view = 'battle';
    session.sectionId = sectionId;
    session.cards = shuffleArray(cards);
    session.cardIndex = 0;
    session.lives = 3;
    session.bossMaxHP = secData.maxHP || cards.length * 10;
    session.bossHP = secData.hp !== undefined ? secData.hp : session.bossMaxHP;
    session.streak = 0;
    session.sessionXP = 0;
    session.sessionCorrect = 0;
    session.sessionWrong = 0;
    session.hintsUsed = 0;
    session.timerStart = Date.now();
    renderBattle();
  }

  function startWeakAreaBattle () {
    // Collect cards with mastery < 2 or more wrong than correct
    const weakCards = ANKI_CARDS.filter(c => {
      const cs = game.cardStats[c.id];
      if (!cs) return true; // never studied = weak
      return cs.mastery < 2 || (cs.wrong > cs.correct);
    });

    if (weakCards.length === 0) {
      if (typeof Toast !== 'undefined') Toast.show('No weak areas — great job!', 'success');
      return;
    }

    session.view = 'quickplay';
    session.sectionId = null;
    session.cards = shuffleArray(weakCards).slice(0, 20);
    session.cardIndex = 0;
    session.lives = 5;
    session.bossMaxHP = session.cards.length * 10;
    session.bossHP = session.bossMaxHP;
    session.streak = 0;
    session.sessionXP = 0;
    session.sessionCorrect = 0;
    session.sessionWrong = 0;
    session.hintsUsed = 0;
    session.timerStart = Date.now();
    renderBattle();
  }

  function startQuickPlay () {
    session.view = 'quickplay';
    session.sectionId = null;
    session.cards = shuffleArray(ANKI_CARDS).slice(0, 20);
    session.cardIndex = 0;
    session.lives = 5;
    session.bossMaxHP = 200;
    session.bossHP = 200;
    session.streak = 0;
    session.sessionXP = 0;
    session.sessionCorrect = 0;
    session.sessionWrong = 0;
    session.hintsUsed = 0;
    session.timerStart = Date.now();
    renderBattle();
  }

  function renderBattle () {
    if (session.lives <= 0) { renderDefeat(); return; }
    if (session.bossHP <= 0) { renderVictory(); return; }
    if (session.cardIndex >= session.cards.length) {
      session.cards = shuffleArray(session.cards);
      session.cardIndex = 0;
    }

    const card = session.cards[session.cardIndex];
    const panel = el('tool-anki');
    const secInfo = session.sectionId
      ? ANKI_SECTIONS.find(s => s.id === session.sectionId)
      : { name: 'Quick Play', count: 20 };

    const hpPct = Math.round((session.bossHP / session.bossMaxHP) * 100);
    const maxLives = session.view === 'quickplay' ? 5 : 3;
    const livesHTML = Array.from({length: maxLives}, (_, i) =>
      `<span class="anki-heart ${i < session.lives ? 'alive' : 'dead'}">${i < session.lives ? '\u2764' : '\u2661'}</span>`
    ).join('');

    const comboMult = session.streak >= 10 ? 3 : session.streak >= 5 ? 2 : session.streak >= 3 ? 1.5 : 1;
    const comboLabel = comboMult > 1 ? `<span class="anki-combo">${comboMult}x</span>` : '';

    const cs = game.cardStats[card.id] || {};
    const masteryLevel = cs.mastery || 0;
    const masteryLabel = MASTERY_LABELS[masteryLevel];
    const masteryColor = MASTERY_COLORS[masteryLevel];
    const cardDue = isCardDue(card.id);
    const dotsHTML = Array.from({length: 5}, (_, i) => i < masteryLevel ? '\u25cf' : '\u25cb').join('');

    session.hintLevel = 0;
    session.flipped = false;
    session.answered = false;
    session.timerStart = Date.now();

    const isMC = game.mode === 'mc';
    const modeRecallActive = !isMC ? 'active' : '';
    const modeMCActive = isMC ? 'active' : '';

    // Multiple choice options
    let mcHTML = '';
    let mcOptions = [];
    if (isMC) {
      const distractors = getDistractors(card, 3);
      mcOptions = shuffleArray([card.back, ...distractors]);
      mcHTML = `
        <div class="anki-mc-options" id="ankiMCOptions">
          ${mcOptions.map((opt, i) => `
            <button class="anki-mc-option" data-idx="${i}" data-value="${esc(opt)}">
              <span class="anki-mc-letter">${LETTERS[i]}</span>
              <span>${esc(opt)}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    // Card content — different for each mode
    const cardHTML = isMC ? `
        <div class="anki-mc-card">
          <div class="anki-card-badges">
            <div class="anki-card-type-badge ${card.type === 'cloze' ? 'badge-cloze' : 'badge-basic'}">${card.type === 'cloze' ? 'Fill-in' : 'Q&A'}</div>
            <div class="anki-mastery-badge" style="--mastery-color: ${masteryColor}">
              <span class="mastery-dots">${dotsHTML}</span>
              ${masteryLabel}
              ${cardDue ? '<span class="mastery-due-tag">DUE</span>' : ''}
            </div>
          </div>
          <p class="anki-card-question">${esc(card.front)}</p>
          ${mcHTML}
        </div>
    ` : `
        <div class="anki-card-wrap" id="ankiCardWrap" tabindex="0" role="button" aria-label="Click to reveal answer">
          <div class="anki-card" id="ankiCard">
            <div class="anki-card-front">
              <div class="anki-card-badges">
                <div class="anki-card-type-badge ${card.type === 'cloze' ? 'badge-cloze' : 'badge-basic'}">${card.type === 'cloze' ? 'Fill-in' : 'Q&A'}</div>
                <div class="anki-mastery-badge" style="--mastery-color: ${masteryColor}">
                  <span class="mastery-dots">${dotsHTML}</span>
                  ${masteryLabel}
                  ${cardDue ? '<span class="mastery-due-tag">DUE</span>' : ''}
                </div>
              </div>
              <p class="anki-card-question">${esc(card.front)}</p>
              <div class="anki-card-hint-area" id="ankiHintArea">
                <button class="anki-hint-btn" id="ankiHintBtn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Hint
                </button>
                <div class="anki-hint-text" id="ankiHintText"></div>
              </div>
              <div class="anki-card-flip-hint">Click to reveal answer</div>
            </div>
            <div class="anki-card-back">
              <span class="anki-card-answer-label">Answer</span>
              <p class="anki-card-answer">${esc(card.back)}</p>
            </div>
          </div>
        </div>
    `;

    panel.innerHTML = `
      <div class="anki-battle-view">
        <div class="anki-battle-header">
          <button class="anki-back-btn" id="ankiBattleBack">\u2190 Map</button>
          <span class="anki-battle-title">${esc(secInfo.name)}</span>
          <div class="anki-streak-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            ${session.streak} ${comboLabel}
          </div>
        </div>

        <!-- Mode Toggle -->
        <div class="anki-mode-toggle">
          <button class="anki-mode-btn ${modeRecallActive}" data-mode="recall">Free Recall</button>
          <button class="anki-mode-btn ${modeMCActive}" data-mode="mc">Multiple Choice</button>
        </div>

        <div class="anki-boss-bar-wrap">
          <div class="anki-boss-label">
            <span>BOSS: ${esc(secInfo.name)}</span>
            <span>${session.bossHP} / ${session.bossMaxHP} HP</span>
          </div>
          <div class="anki-boss-bar"><div class="anki-boss-hp" style="width:${hpPct}%"></div></div>
        </div>

        <div class="anki-player-status">
          <div class="anki-lives">${livesHTML}</div>
          <div class="anki-session-xp">+${session.sessionXP} XP</div>
        </div>

        ${cardHTML}

        <!-- Actions for Free Recall (hidden until flipped) -->
        ${!isMC ? `
        <div class="anki-battle-actions hidden" id="ankiBattleActions">
          <button class="anki-action-btn anki-btn-wrong" id="ankiBtnWrong">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Got it Wrong
          </button>
          <button class="anki-action-btn anki-btn-right" id="ankiBtnRight">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            Got it Right
          </button>
        </div>
        ` : ''}

        <!-- Explain panel (hidden until triggered) -->
        <div class="anki-explain-panel hidden" id="ankiExplainPanel">
          <div class="anki-explain-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>Explanation</span>
          </div>
          <p class="anki-explain-text">${esc(card.explanation || 'No explanation available for this card.')}</p>
        </div>

        <!-- Next button + Explain button (hidden until answered) -->
        <div class="anki-post-answer hidden" id="ankiPostAnswer">
          <button class="anki-explain-btn" id="ankiExplainBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Explain
          </button>
          <button class="anki-btn anki-btn-accent" id="ankiNextCard">Next Card \u2192</button>
        </div>
      </div>
    `;

    // ── Bind events ──────────────────────────────────────

    // Back button
    el('ankiBattleBack').addEventListener('click', () => {
      if (session.sectionId && game.sections[session.sectionId]) {
        game.sections[session.sectionId].hp = session.bossHP;
        saveGame(game);
      }
      renderMap();
    });

    // Mode toggle
    panel.querySelectorAll('.anki-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        game.mode = btn.dataset.mode;
        saveGame(game);
        renderBattle();
      });
    });

    // Explain button
    el('ankiExplainBtn').addEventListener('click', () => {
      el('ankiExplainPanel').classList.toggle('hidden');
    });

    // Next card button
    el('ankiNextCard').addEventListener('click', () => {
      session.cardIndex++;
      renderBattle();
    });

    if (isMC) {
      // ── Multiple Choice mode ──────────────────────────
      const optionsDiv = el('ankiMCOptions');
      optionsDiv.addEventListener('click', e => {
        const btn = e.target.closest('.anki-mc-option');
        if (!btn || session.answered) return;
        session.answered = true;

        const chosenValue = btn.dataset.value;
        const isCorrect = chosenValue === card.back;

        // Highlight correct/wrong
        optionsDiv.querySelectorAll('.anki-mc-option').forEach(opt => {
          if (opt.dataset.value === card.back) opt.classList.add('correct');
          if (opt === btn && !isCorrect) opt.classList.add('wrong');
          opt.disabled = true;
        });

        handleBattleAnswer(isCorrect, card, true);
      });

    } else {
      // ── Free Recall mode ──────────────────────────────
      const cardWrap = el('ankiCardWrap');
      const ankiCard = el('ankiCard');
      const actions = el('ankiBattleActions');

      function flipCard () {
        if (session.flipped) return;
        session.flipped = true;
        ankiCard.classList.add('flipped');
        actions.classList.remove('hidden');
      }

      cardWrap.addEventListener('click', e => {
        if (e.target.closest('#ankiHintBtn')) return;
        flipCard();
      });
      cardWrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(); }
      });

      // Hint button
      el('ankiHintBtn').addEventListener('click', e => {
        e.stopPropagation();
        session.hintLevel++;
        session.hintsUsed++;
        const hintText = el('ankiHintText');
        if (session.hintLevel === 1) {
          hintText.textContent = card.hint;
          hintText.classList.add('visible');
        } else if (session.hintLevel === 2) {
          const ans = card.back;
          const reveal = ans.length > 6 ? ans.substring(0, Math.ceil(ans.length * 0.4)) + '...' : ans.substring(0, 2) + '...';
          hintText.textContent = card.hint + ' | Starts with: "' + reveal + '"';
        } else {
          hintText.textContent = 'Answer: ' + card.back;
        }
      });

      // Answer buttons
      el('ankiBtnRight').addEventListener('click', () => handleBattleAnswer(true, card, false));
      el('ankiBtnWrong').addEventListener('click', () => handleBattleAnswer(false, card, false));
    }
  }

  function handleBattleAnswer (correct, card, autoAdvance) {
    const elapsed = (Date.now() - session.timerStart) / 1000;
    const speedBonus = elapsed < 5 ? 10 : elapsed < 10 ? 5 : 0;
    const hintPenalty = session.hintLevel > 0 ? session.hintLevel * 3 : 0;
    const comboMult = session.streak >= 10 ? 3 : session.streak >= 5 ? 2 : session.streak >= 3 ? 1.5 : 1;

    const cs = ensureCardStats(card.id);

    if (correct) {
      // Check level before XP gain for level-up detection
      const levelBefore = levelFromXP(game.xp);

      // Apply XP booster multiplier if active
      const boosterMult = (typeof CoinSystem !== 'undefined') ? CoinSystem.getBoosterMultiplier() : 1;
      const earned = Math.round((10 + speedBonus - hintPenalty) * comboMult * boosterMult);
      const xpGain = Math.max(earned, 1);
      game.xp += xpGain;
      game.totalCorrect++;
      cs.correct++;
      session.streak++;
      session.sessionCorrect++;
      session.sessionXP += xpGain;
      if (session.streak > game.bestStreak) game.bestStreak = session.streak;

      // Award 1 coin per correct answer
      game.coins = (game.coins || 0) + 1;

      // Check for level-up and award 25 coins
      const levelAfter = levelFromXP(game.xp);
      if (levelAfter > levelBefore) {
        game.coins += 25;
        if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();
        if (typeof Effects !== 'undefined') Effects.levelUp(levelAfter);
      }

      // Visual effects
      if (typeof Effects !== 'undefined') {
        Effects.correctFlash();
        // Streak milestones
        if (session.streak === 3 || session.streak === 5 || session.streak === 10) {
          var streakEl = document.querySelector('.anki-streak-badge');
          if (streakEl) Effects.streakFire(streakEl);
        }
        // Coin burst
        var cardEl = document.querySelector('.anki-mc-card, .anki-card-wrap');
        if (cardEl) {
          var r = cardEl.getBoundingClientRect();
          Effects.coinBurst(r.left + r.width / 2, r.top + r.height / 2);
        }
      }
      const damage = Math.round((10 + speedBonus) * (session.hintLevel === 0 ? 1.5 : 1));
      session.bossHP = Math.max(0, session.bossHP - damage);
      cs.consecutiveCorrect = (cs.consecutiveCorrect || 0) + 1;
      cs.lastReview = Date.now();
      if (cs.mastery < 5) cs.mastery++;
      cs.nextDue = Date.now() + (MASTERY_INTERVALS[cs.mastery] * DAY_MS);
    } else {
      game.totalWrong++;
      cs.wrong++;
      session.streak = 0;
      session.sessionWrong++;
      session.lives--;
      cs.consecutiveCorrect = 0;
      cs.lastReview = Date.now();
      if (cs.mastery > 0) cs.mastery--;
      cs.nextDue = Date.now() + (MASTERY_INTERVALS[cs.mastery] * DAY_MS);
    }

    saveGame(game);

    // Record daily activity for streak calendar
    if (typeof StreakCalendar !== 'undefined' && StreakCalendar.recordActivity) {
      StreakCalendar.recordActivity(correct ? 1 : 0, correct ? 0 : 1, correct ? (10 + speedBonus) : 0);
    }

    // Check achievements
    if (typeof Achievements !== 'undefined' && Achievements.check) {
      Achievements.check({ elapsed: elapsed, streak: session.streak, correct: correct, sectionId: session.sectionId });
    }

    // Update topbar stats after each answer
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();

    if (autoAdvance) {
      // MC mode: show post-answer buttons (Explain + Next)
      const postAnswer = el('ankiPostAnswer');
      if (postAnswer) postAnswer.classList.remove('hidden');
    } else {
      // Free recall: hide answer buttons, show post-answer
      const actions = el('ankiBattleActions');
      if (actions) actions.classList.add('hidden');
      const postAnswer = el('ankiPostAnswer');
      if (postAnswer) postAnswer.classList.remove('hidden');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  VICTORY / DEFEAT
  // ═══════════════════════════════════════════════════════════

  function renderVictory () {
    const panel = el('tool-anki');
    const secInfo = session.sectionId
      ? ANKI_SECTIONS.find(s => s.id === session.sectionId)
      : { name: 'Quick Play' };

    if (session.sectionId && game.sections[session.sectionId]) {
      game.sections[session.sectionId].defeated = true;
      game.sections[session.sectionId].lastReview = Date.now();
      game.sections[session.sectionId].hp = 0;
    }

    const bonusXP = 50;
    game.xp += bonusXP;
    session.sessionXP += bonusXP;

    // Award 5 coins for boss victory
    game.coins = (game.coins || 0) + 5;
    saveGame(game);

    // Update topbar stats
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();

    const level = levelFromXP(game.xp);
    const mInfo = session.sectionId ? getSectionMasteryInfo(session.sectionId) : { mastered: 0, total: 0 };

    panel.innerHTML = `
      <div class="anki-result-view anki-victory">
        <div class="anki-result-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
          </svg>
        </div>
        <h2 class="anki-result-title">Boss Defeated!</h2>
        <p class="anki-result-subtitle">${esc(secInfo.name)} has been conquered!</p>
        <div class="anki-result-stats">
          <div class="anki-result-stat"><span class="anki-result-stat-val">+${session.sessionXP}</span><span class="anki-result-stat-lbl">XP Earned</span></div>
          <div class="anki-result-stat"><span class="anki-result-stat-val">Lv ${level}</span><span class="anki-result-stat-lbl">Level</span></div>
          <div class="anki-result-stat"><span class="anki-result-stat-val">${session.streak}</span><span class="anki-result-stat-lbl">Final Streak</span></div>
          <div class="anki-result-stat"><span class="anki-result-stat-val">${mInfo.mastered}/${mInfo.total}</span><span class="anki-result-stat-lbl">Mastered</span></div>
        </div>
        <div class="anki-result-actions">
          <button class="anki-btn anki-btn-accent" id="ankiVictoryMap">\u2190 Territory Map</button>
        </div>
      </div>
    `;
    el('ankiVictoryMap').addEventListener('click', renderMap);

    // Victory confetti
    if (typeof Effects !== 'undefined') {
      Effects.confetti({ count: 100, duration: 3000 });
    }

    // Record challenge score if active
    if (typeof Challenges !== 'undefined' && Challenges.recordScore) {
      Challenges.recordScore(session.sessionCorrect, session.sessionWrong, Date.now() - session.timerStart);
    }

    // Check daily challenge completion
    if (typeof DailyChallenge !== 'undefined' && DailyChallenge.checkCompletion) {
      DailyChallenge.checkCompletion(session.sectionId, session.sessionCorrect, session.sessionWrong);
    }

    // Check achievements for boss victory
    if (typeof Achievements !== 'undefined' && Achievements.check) {
      Achievements.check({ bossDefeated: true, sectionId: session.sectionId, correct: true, streak: session.streak, elapsed: 0 });
    }
  }

  function renderDefeat () {
    const panel = el('tool-anki');
    const secInfo = session.sectionId
      ? ANKI_SECTIONS.find(s => s.id === session.sectionId)
      : { name: 'Quick Play' };

    if (session.sectionId && game.sections[session.sectionId]) {
      game.sections[session.sectionId].hp = session.bossHP;
    }
    saveGame(game);

    panel.innerHTML = `
      <div class="anki-result-view anki-defeat">
        <div class="anki-result-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2 class="anki-result-title">Defeated!</h2>
        <p class="anki-result-subtitle">The ${esc(secInfo.name)} boss still stands. Study up and try again!</p>
        <div class="anki-result-stats">
          <div class="anki-result-stat"><span class="anki-result-stat-val">+${session.sessionXP}</span><span class="anki-result-stat-lbl">XP Earned</span></div>
          <div class="anki-result-stat"><span class="anki-result-stat-val">${session.bossHP}/${session.bossMaxHP}</span><span class="anki-result-stat-lbl">Boss HP Left</span></div>
        </div>
        <div class="anki-result-actions">
          <button class="anki-btn anki-btn-accent" id="ankiDefeatRetry">Retry Battle</button>
          <button class="anki-btn anki-btn-secondary" id="ankiDefeatMap">\u2190 Territory Map</button>
        </div>
      </div>
    `;
    el('ankiDefeatRetry').addEventListener('click', () => startBossBattle(session.sectionId));
    el('ankiDefeatMap').addEventListener('click', renderMap);

    // Record challenge score if active
    if (typeof Challenges !== 'undefined' && Challenges.recordScore) {
      Challenges.recordScore(session.sessionCorrect, session.sessionWrong, Date.now() - session.timerStart);
    }
  }

  // ── Utility ───────────────────────────────────────────────
  function shuffleArray (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  window.AnkiEngine = { init: init, startBattle: startBossBattle };
})();
