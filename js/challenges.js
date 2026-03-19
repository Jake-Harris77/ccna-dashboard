// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Challenges
//  Challenge friends to section battles, track scores, show results
// ─────────────────────────────────────────────────────────────────────────────

var Challenges = (function () {
  'use strict';

  var panel;
  var pickerOverlay;

  function init () {
    panel = document.getElementById('tool-challenges');
    if (!panel) return;

    if (!FirebaseSync.isSignedIn()) {
      panel.innerHTML = signinPrompt();
      return;
    }

    panel.innerHTML = '<div class="lb-loading">Loading challenges…</div>';
    loadChallenges();
  }

  async function loadChallenges () {
    var db = FirebaseSync.getDb();
    var user = FirebaseSync.getCurrentUser();

    try {
      // Get challenges where user is involved (from or to)
      // Simple queries without orderBy to avoid needing composite indexes
      var [fromSnap, toSnap] = await Promise.all([
        db.collection('challenges').where('from', '==', user.uid).get(),
        db.collection('challenges').where('to', '==', user.uid).get(),
      ]);

      var challenges = [];
      var seen = new Set();

      fromSnap.forEach(function (doc) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          var d = doc.data(); d._id = doc.id;
          challenges.push(d);
        }
      });
      toSnap.forEach(function (doc) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          var d = doc.data(); d._id = doc.id;
          challenges.push(d);
        }
      });

      // Sort by date
      challenges.sort(function (a, b) {
        var aTime = a.createdAt ? a.createdAt.toMillis() : 0;
        var bTime = b.createdAt ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      render(challenges, user);

    } catch (err) {
      console.error('Challenges error:', err);
      panel.innerHTML = '<div class="challenges-empty">Failed to load challenges.</div>';
    }
  }

  function render (challenges, user) {
    var html = '<div class="social-header"><h2>Challenges</h2></div>';

    if (challenges.length === 0) {
      html += '<div class="challenges-empty">'
        + '<p>No challenges yet.</p>'
        + '<p style="margin-top:8px;font-size:12px;color:var(--text-muted)">Go to Friends and challenge someone to a section battle!</p>'
        + '</div>';
      panel.innerHTML = html;
      return;
    }

    var pendingHTML = '';
    var activeHTML  = '';
    var completedHTML = '';

    challenges.forEach(function (c) {
      var isFrom = c.from === user.uid;
      var myName = isFrom ? c.fromName : c.toName;
      var oppName = isFrom ? c.toName : c.fromName;
      var myScore = isFrom ? c.fromScore : c.toScore;
      var oppScore = isFrom ? c.toScore : c.fromScore;

      var card = '<div class="challenge-card">'
        + '<div class="challenge-header">'
        + '<span class="challenge-section">' + esc(c.sectionName || 'Section ' + c.sectionId) + '</span>'
        + '<span class="challenge-status challenge-status-' + c.status + '">' + c.status + '</span>'
        + '</div>'
        + '<div class="challenge-vs">'
        + playerBlock(myName, myScore, c.status === 'completed' ? c.winner === (isFrom ? c.from : c.to) : null)
        + '<span class="challenge-vs-text">VS</span>'
        + playerBlock(oppName, oppScore, c.status === 'completed' ? c.winner === (isFrom ? c.to : c.from) : null)
        + '</div>';

      if (c.status === 'pending' && !isFrom) {
        card += '<div class="challenge-actions">'
          + '<button class="challenge-btn challenge-btn-accept" data-action="accept-challenge" data-id="' + c._id + '">Accept & Play</button>'
          + '<button class="challenge-btn challenge-btn-decline" data-action="decline-challenge" data-id="' + c._id + '">Decline</button>'
          + '</div>';
      } else if (c.status === 'pending' && isFrom) {
        card += '<div style="text-align:center;padding:6px;font-size:12px;color:var(--text-muted)">Waiting for ' + esc(oppName) + ' to accept…</div>';
      } else if (c.status === 'active') {
        // Check if current user still needs to play
        if ((isFrom && !c.fromScore) || (!isFrom && !c.toScore)) {
          card += '<div class="challenge-actions">'
            + '<button class="challenge-btn challenge-btn-accept" data-action="play-challenge" data-id="' + c._id + '" data-section="' + c.sectionId + '">Play Now</button>'
            + '</div>';
        } else {
          card += '<div style="text-align:center;padding:6px;font-size:12px;color:var(--text-muted)">Waiting for ' + esc(oppName) + ' to play…</div>';
        }
      }

      card += '</div>';

      if (c.status === 'pending')        pendingHTML += card;
      else if (c.status === 'active')    activeHTML += card;
      else if (c.status === 'completed') completedHTML += card;
    });

    if (pendingHTML)   html += '<div class="friends-section-label">Pending</div>' + pendingHTML;
    if (activeHTML)    html += '<div class="friends-section-label">Active</div>' + activeHTML;
    if (completedHTML) html += '<div class="friends-section-label">Completed</div>' + completedHTML;

    panel.innerHTML = html;
    bindEvents();
  }

  function playerBlock (name, score, isWinner) {
    var scoreText = score ? score.correct + '/' + (score.correct + score.wrong) : '—';
    var winClass = isWinner === true ? ' winner' : (isWinner === false ? ' loser' : '');

    return '<div class="challenge-player">'
      + '<div class="challenge-player-name">' + esc(name) + '</div>'
      + '<div class="challenge-player-score' + winClass + '">' + scoreText + '</div>'
      + '</div>';
  }

  function bindEvents () {
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.dataset.action;
      if (action === 'accept-challenge')  acceptChallenge(btn.dataset.id);
      if (action === 'decline-challenge') declineChallenge(btn.dataset.id);
      if (action === 'play-challenge')    playChallenge(btn.dataset.id, btn.dataset.section);
    });
  }

  async function acceptChallenge (docId) {
    try {
      var db = FirebaseSync.getDb();
      await db.collection('challenges').doc(docId).update({ status: 'active' });
      loadChallenges();
    } catch (err) {
      console.error('Accept challenge error:', err);
    }
  }

  async function declineChallenge (docId) {
    try {
      var db = FirebaseSync.getDb();
      await db.collection('challenges').doc(docId).delete();
      loadChallenges();
    } catch (err) {
      console.error('Decline challenge error:', err);
    }
  }

  function playChallenge (challengeId, sectionId) {
    // Switch to ANKI panel and start a challenge battle
    // Store challenge context so ANKI can record the score
    sessionStorage.setItem('activeChallenge', JSON.stringify({
      challengeId: challengeId,
      sectionId:   sectionId,
    }));

    // Switch to ANKI tab
    var ankiNav = document.querySelector('[data-tool="anki"]');
    if (ankiNav) ankiNav.click();

    // Start the section battle after a brief delay for panel switch
    setTimeout(function () {
      if (window.AnkiEngine && window.AnkiEngine.startBattle) {
        window.AnkiEngine.startBattle(sectionId);
      }
    }, 100);
  }

  // ── Section picker (called from Friends) ────────────────
  function openPicker (friendUid, friendName) {
    if (!pickerOverlay) createPickerOverlay();

    var list = pickerOverlay.querySelector('.challenge-picker-list');
    if (!list || typeof ANKI_SECTIONS === 'undefined') return;

    list.innerHTML = ANKI_SECTIONS.map(function (sec) {
      return '<div class="challenge-picker-section" data-section="' + sec.id + '" data-name="' + esc(sec.name) + '">'
        + '<span class="challenge-picker-section-name">S' + sec.id + ' — ' + esc(sec.name) + '</span>'
        + '<span class="challenge-picker-section-count">' + sec.count + ' cards</span>'
        + '</div>';
    }).join('');

    // Bind section clicks
    list.onclick = function (e) {
      var item = e.target.closest('.challenge-picker-section');
      if (!item) return;
      sendChallenge(friendUid, friendName, item.dataset.section, item.dataset.name);
      closePicker();
    };

    pickerOverlay.classList.add('active');
  }

  function closePicker () {
    if (pickerOverlay) pickerOverlay.classList.remove('active');
  }

  function createPickerOverlay () {
    pickerOverlay = document.createElement('div');
    pickerOverlay.className = 'challenge-picker-overlay';
    pickerOverlay.innerHTML = '<div class="challenge-picker">'
      + '<h3>Choose a Section to Challenge</h3>'
      + '<div class="challenge-picker-list"></div>'
      + '<button class="challenge-picker-close" id="pickerClose">Cancel</button>'
      + '</div>';

    document.body.appendChild(pickerOverlay);

    pickerOverlay.querySelector('#pickerClose').addEventListener('click', closePicker);
    pickerOverlay.addEventListener('click', function (e) {
      if (e.target === pickerOverlay) closePicker();
    });
  }

  async function sendChallenge (friendUid, friendName, sectionId, sectionName) {
    try {
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();

      await db.collection('challenges').add({
        from:        user.uid,
        to:          friendUid,
        fromName:    user.displayName || user.email.split('@')[0],
        toName:      friendName,
        sectionId:   sectionId,
        sectionName: sectionName,
        status:      'pending',
        fromScore:   null,
        toScore:     null,
        winner:      null,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Show feedback — switch to challenges tab
      var chalNav = document.querySelector('[data-tool="challenges"]');
      if (chalNav) chalNav.click();

    } catch (err) {
      console.error('Send challenge error:', err);
    }
  }

  // ── Record challenge score (called after ANKI battle) ───
  async function recordScore (correct, wrong, timeMs) {
    var raw = sessionStorage.getItem('activeChallenge');
    if (!raw) return;

    var ctx = JSON.parse(raw);
    sessionStorage.removeItem('activeChallenge');

    try {
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();
      var docRef = db.collection('challenges').doc(ctx.challengeId);
      var doc = await docRef.get();
      if (!doc.exists) return;

      var data = doc.data();
      var isFrom = data.from === user.uid;
      var scoreField = isFrom ? 'fromScore' : 'toScore';
      var otherScoreField = isFrom ? 'toScore' : 'fromScore';

      var update = {};
      update[scoreField] = { correct: correct, wrong: wrong, time: timeMs };

      // Check if both scores are now in
      var otherScore = data[otherScoreField];
      if (otherScore) {
        // Both played — determine winner
        var myCorrect    = correct;
        var theirCorrect = otherScore.correct;
        if (myCorrect > theirCorrect)       update.winner = user.uid;
        else if (theirCorrect > myCorrect)  update.winner = isFrom ? data.to : data.from;
        else                                update.winner = 'tie';
        update.status = 'completed';
      }

      await docRef.update(update);

    } catch (err) {
      console.error('Record challenge score error:', err);
    }
  }

  function signinPrompt () {
    return '<div class="social-signin-prompt">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
      + '<p>Sign in to challenge friends</p>'
      + '<button onclick="document.getElementById(\'authSignInBtn\').click()">Sign In</button>'
      + '</div>';
  }

  function esc (str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    init:        init,
    openPicker:  openPicker,
    recordScore: recordScore,
  };
})();
