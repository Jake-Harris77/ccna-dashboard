// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Live Duels
//  Real-time 1v1 battles via Firestore
// ─────────────────────────────────────────────────────────────────────────────

var Duels = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';
  var DUEL_CARD_COUNT = 10;
  var unsubscribe = null;

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
    var panel = document.getElementById('tool-duels');
    if (!panel) return;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    renderHome(panel);
  }

  function renderHome (panel) {
    var isSignedIn = typeof FirebaseSync !== 'undefined' && FirebaseSync.isSignedIn();

    if (!isSignedIn) {
      panel.innerHTML = '<div class="duel-view">'
        + '<h2 class="duel-title">\u2694\uFE0F Live Duels</h2>'
        + '<div class="duel-signin-msg">'
        + '  <p>Sign in to challenge friends to real-time duels!</p>'
        + '</div>'
        + '</div>';
      return;
    }

    var user = FirebaseSync.getCurrentUser();
    var db = FirebaseSync.getDb();

    // Load pending duels
    db.collection('duels')
      .where('status', '==', 'waiting')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
      .then(function (snap) {
        var duels = [];
        snap.forEach(function (doc) { duels.push(Object.assign({ id: doc.id }, doc.data())); });
        renderDuelList(panel, duels, user, db);
      })
      .catch(function () {
        renderDuelList(panel, [], user, db);
      });
  }

  function renderDuelList (panel, duels, user, db) {
    var myDuels = duels.filter(function (d) { return d.player1 === user.uid || d.player2 === user.uid; });
    var openDuels = duels.filter(function (d) { return d.player1 !== user.uid && !d.player2; });

    var sectionOptions = '';
    if (typeof ANKI_SECTIONS !== 'undefined') {
      ANKI_SECTIONS.forEach(function (sec) {
        sectionOptions += '<option value="' + sec.id + '">' + esc(sec.name) + '</option>';
      });
    }

    var myHTML = myDuels.length > 0
      ? myDuels.map(function (d) {
        return '<div class="duel-item">'
          + '<span>vs ' + esc(d.player1Name || 'Player') + '</span>'
          + '<span class="duel-status-badge">' + d.status + '</span>'
          + (d.status === 'waiting' && d.player2 === user.uid
            ? '<button class="anki-btn anki-btn-accent duel-accept-btn" data-did="' + d.id + '">Accept</button>'
            : '')
          + '</div>';
      }).join('')
      : '<p class="duel-empty">No active duels</p>';

    var openHTML = openDuels.length > 0
      ? openDuels.map(function (d) {
        return '<div class="duel-item">'
          + '<span>' + esc(d.player1Name || 'Someone') + ' is waiting</span>'
          + '<button class="anki-btn anki-btn-accent duel-join-btn" data-did="' + d.id + '">Join</button>'
          + '</div>';
      }).join('')
      : '<p class="duel-empty">No open duels. Create one!</p>';

    panel.innerHTML = '<div class="duel-view">'
      + '<h2 class="duel-title">\u2694\uFE0F Live Duels</h2>'
      + '<div class="duel-create">'
      + '  <select id="duelSectionSelect" class="duel-select"><option value="random">Random Section</option>' + sectionOptions + '</select>'
      + '  <button class="anki-btn anki-btn-accent" id="duelCreateBtn">Create Duel</button>'
      + '</div>'
      + '<div class="duel-section">'
      + '  <h3>Your Duels</h3>' + myHTML
      + '</div>'
      + '<div class="duel-section">'
      + '  <h3>Open Duels</h3>' + openHTML
      + '</div>'
      + '</div>';

    document.getElementById('duelCreateBtn').addEventListener('click', function () {
      createDuel(panel, db, user);
    });

    panel.querySelectorAll('.duel-join-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { joinDuel(panel, db, user, btn.dataset.did); });
    });

    panel.querySelectorAll('.duel-accept-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { joinDuel(panel, db, user, btn.dataset.did); });
    });
  }

  function createDuel (panel, db, user) {
    var selectEl = document.getElementById('duelSectionSelect');
    var sectionId = selectEl.value;
    var cards;

    if (sectionId === 'random') {
      cards = shuffleArray(typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).slice(0, DUEL_CARD_COUNT);
    } else {
      cards = shuffleArray((typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).filter(function (c) { return c.section === sectionId; })).slice(0, DUEL_CARD_COUNT);
    }

    var cardIds = cards.map(function (c) { return c.id; });

    db.collection('duels').add({
      player1: user.uid,
      player1Name: user.displayName || user.email,
      player2: null,
      player2Name: null,
      sectionId: sectionId,
      cardIds: cardIds,
      status: 'waiting',
      scores: {},
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(function (docRef) {
      if (typeof Toast !== 'undefined') Toast.show('Duel created! Waiting for opponent...', 'info');
      waitForOpponent(panel, db, user, docRef.id);
    });
  }

  function waitForOpponent (panel, db, user, duelId) {
    panel.innerHTML = '<div class="duel-waiting">'
      + '<h2>Waiting for opponent...</h2>'
      + '<div class="duel-loader"></div>'
      + '<p>Share the duel code: <strong>' + duelId.substring(0, 8) + '</strong></p>'
      + '<button class="anki-btn anki-btn-secondary" id="duelCancelBtn">Cancel</button>'
      + '</div>';

    document.getElementById('duelCancelBtn').addEventListener('click', function () {
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      db.collection('duels').doc(duelId).delete();
      renderHome(panel);
    });

    unsubscribe = db.collection('duels').doc(duelId).onSnapshot(function (doc) {
      var data = doc.data();
      if (data && data.player2) {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        startDuelBattle(panel, db, user, duelId, data);
      }
    });
  }

  function joinDuel (panel, db, user, duelId) {
    db.collection('duels').doc(duelId).update({
      player2: user.uid,
      player2Name: user.displayName || user.email,
      status: 'active',
    }).then(function () {
      db.collection('duels').doc(duelId).get().then(function (doc) {
        startDuelBattle(panel, db, user, duelId, doc.data());
      });
    });
  }

  function startDuelBattle (panel, db, user, duelId, duelData) {
    var cardIds = duelData.cardIds || [];
    var cards = cardIds.map(function (id) {
      return (typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).find(function (c) { return c.id === id; });
    }).filter(Boolean);

    if (cards.length === 0) {
      if (typeof Toast !== 'undefined') Toast.show('No cards found for this duel', 'error');
      renderHome(panel);
      return;
    }

    var state = { cards: cards, index: 0, correct: 0, total: cards.length, startTime: Date.now() };

    function renderDuelCard () {
      if (state.index >= state.total) {
        finishDuel(panel, db, user, duelId, duelData, state);
        return;
      }

      var card = state.cards[state.index];
      var distractors = getSimpleDistractors(card);
      var options = shuffleArray([card.back].concat(distractors));
      var letters = ['A', 'B', 'C', 'D'];

      var optHTML = options.map(function (opt, i) {
        return '<button class="duel-option" data-val="' + esc(opt) + '">'
          + '<span class="duel-letter">' + letters[i] + '</span>'
          + '<span>' + esc(opt) + '</span>'
          + '</button>';
      }).join('');

      panel.innerHTML = '<div class="duel-battle">'
        + '<div class="duel-battle-header">'
        + '  <span>Duel: ' + (state.index + 1) + '/' + state.total + '</span>'
        + '  <span>Score: ' + state.correct + '</span>'
        + '</div>'
        + '<div class="duel-card">'
        + '  <p class="duel-question">' + esc(card.front) + '</p>'
        + '  <div class="duel-options">' + optHTML + '</div>'
        + '</div>'
        + '</div>';

      panel.querySelectorAll('.duel-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.dataset.val === card.back) {
            state.correct++;
            btn.classList.add('correct');
          } else {
            btn.classList.add('wrong');
          }
          state.index++;
          setTimeout(renderDuelCard, 400);
        });
      });
    }

    renderDuelCard();
  }

  function getSimpleDistractors (card) {
    var seen = {};
    seen[card.back.toLowerCase().trim()] = true;
    var pool = shuffleArray((typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS : []).filter(function (c) { return c.id !== card.id; }));
    var result = [];
    for (var i = 0; i < pool.length && result.length < 3; i++) {
      var norm = pool[i].back.toLowerCase().trim();
      if (!seen[norm]) { seen[norm] = true; result.push(pool[i].back); }
    }
    return result;
  }

  function finishDuel (panel, db, user, duelId, duelData, state) {
    var elapsed = Math.round((Date.now() - state.startTime) / 1000);
    var myScore = { correct: state.correct, total: state.total, time: elapsed };

    // Save score to Firestore
    var scoreUpdate = {};
    scoreUpdate['scores.' + user.uid] = myScore;
    db.collection('duels').doc(duelId).update(scoreUpdate);

    // Award XP and coins
    var g = loadGame();
    g.xp = (g.xp || 0) + state.correct * 8;
    g.coins = (g.coins || 0) + state.correct;
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();

    // Check if opponent has finished
    unsubscribe = db.collection('duels').doc(duelId).onSnapshot(function (doc) {
      var data = doc.data();
      if (!data) return;
      var scores = data.scores || {};
      var opponentUid = data.player1 === user.uid ? data.player2 : data.player1;
      var opponentScore = scores[opponentUid];

      if (opponentScore) {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        db.collection('duels').doc(duelId).update({ status: 'done' });
        renderDuelResults(panel, myScore, opponentScore, data, user);
      } else {
        panel.innerHTML = '<div class="duel-waiting">'
          + '<h2>Your Score: ' + state.correct + '/' + state.total + '</h2>'
          + '<div class="duel-loader"></div>'
          + '<p>Waiting for opponent to finish...</p>'
          + '</div>';
      }
    });
  }

  function renderDuelResults (panel, myScore, theirScore, duelData, user) {
    var iWon = myScore.correct > theirScore.correct || (myScore.correct === theirScore.correct && myScore.time < theirScore.time);
    var tie = myScore.correct === theirScore.correct && myScore.time === theirScore.time;
    var opponentName = duelData.player1 === user.uid ? (duelData.player2Name || 'Opponent') : (duelData.player1Name || 'Opponent');

    if (iWon) {
      var g = loadGame();
      g.coins = (g.coins || 0) + 10;
      saveGame(g);
      if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();
    }

    var resultText = tie ? 'Tie!' : (iWon ? 'You Win!' : 'You Lose');
    var resultColor = tie ? 'var(--yellow)' : (iWon ? 'var(--green)' : 'var(--red)');

    panel.innerHTML = '<div class="duel-results">'
      + '<h2 style="color:' + resultColor + '">' + resultText + '</h2>'
      + '<div class="duel-results-compare">'
      + '  <div class="duel-results-player">'
      + '    <div class="duel-results-name">You</div>'
      + '    <div class="duel-results-score">' + myScore.correct + '/' + myScore.total + '</div>'
      + '    <div class="duel-results-time">' + myScore.time + 's</div>'
      + '  </div>'
      + '  <div class="duel-vs">VS</div>'
      + '  <div class="duel-results-player">'
      + '    <div class="duel-results-name">' + esc(opponentName) + '</div>'
      + '    <div class="duel-results-score">' + theirScore.correct + '/' + theirScore.total + '</div>'
      + '    <div class="duel-results-time">' + theirScore.time + 's</div>'
      + '  </div>'
      + '</div>'
      + '<button class="anki-btn anki-btn-accent" id="duelHomeBtn">Back to Duels</button>'
      + '</div>';

    document.getElementById('duelHomeBtn').addEventListener('click', function () { renderHome(panel); });

    if (iWon && typeof Effects !== 'undefined') {
      Effects.confetti({ count: 80, duration: 2500 });
    }
  }

  return { init: init };
})();
