// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Leaderboard
//  Real-time XP rankings from Firestore
// ─────────────────────────────────────────────────────────────────────────────

var Leaderboard = (function () {
  'use strict';

  function init () {
    var panel = document.getElementById('tool-leaderboard');
    if (!panel) return;

    if (!FirebaseSync.isSignedIn()) {
      panel.innerHTML = signinPrompt();
      return;
    }

    panel.innerHTML = '<div class="lb-loading">Loading leaderboard…</div>';
    loadLeaderboard(panel);
  }

  async function loadLeaderboard (panel) {
    try {
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();
      var snap = await db.collection('users')
        .orderBy('xp', 'desc')
        .limit(50)
        .get();

      if (snap.empty) {
        panel.innerHTML = '<div class="lb-empty">No players yet. Start playing to appear here!</div>';
        return;
      }

      // Get existing friendships to know who's already a friend
      var friendSnap = await db.collection('friendships')
        .where('users', 'array-contains', user.uid)
        .get();
      var friendUids = new Set();
      var pendingUids = new Set();
      friendSnap.forEach(function (doc) {
        var d = doc.data();
        var otherUid = d.users.find(function (u) { return u !== user.uid; });
        if (d.status === 'active') friendUids.add(otherUid);
        else if (d.status === 'pending') pendingUids.add(otherUid);
      });

      var rows = '';
      var rank = 0;
      snap.forEach(function (doc) {
        rank++;
        var d = doc.data();
        var isSelf = doc.id === user.uid;
        var rankClass = rank <= 3 ? ' lb-rank-' + rank : '';
        var selfClass = isSelf ? ' lb-self' : '';

        var avatarHTML = d.photoURL
          ? '<img class="lb-avatar" src="' + esc(d.photoURL) + '" alt="">'
          : '<div class="lb-avatar-placeholder">' + (d.displayName || '?').charAt(0).toUpperCase() + '</div>';

        var actionHTML = '';
        if (!isSelf) {
          if (friendUids.has(doc.id)) {
            actionHTML = '<span class="lb-stat" style="color:var(--green)">Friend</span>';
          } else if (pendingUids.has(doc.id)) {
            actionHTML = '<span class="lb-stat">Pending</span>';
          } else {
            actionHTML = '<button class="friend-btn friend-btn-accept lb-add-btn" data-uid="' + doc.id + '" data-name="' + esc(d.displayName || 'Anonymous') + '">+ Add</button>';
          }
        }

        rows += '<tr class="lb-row' + selfClass + '">'
          + '<td class="lb-rank' + rankClass + '">' + rank + '</td>'
          + '<td><div class="lb-user-cell">' + avatarHTML + '<span class="lb-name">' + esc(d.displayName || 'Anonymous') + '</span></div></td>'
          + '<td><span class="lb-level">Lv ' + (d.level || 1) + '</span></td>'
          + '<td class="lb-xp">' + formatNum(d.xp || 0) + ' XP</td>'
          + '<td class="lb-stat">' + (d.sectionsConquered || 0) + ' conquered</td>'
          + '<td>' + actionHTML + '</td>'
          + '</tr>';
      });

      panel.innerHTML = '<div class="social-header"><h2>Leaderboard</h2>'
        + '<span class="social-header-meta">Top 50 players by XP</span></div>'
        + '<table class="lb-table"><tbody>' + rows + '</tbody></table>';

      // Bind add friend buttons
      panel.addEventListener('click', function (e) {
        var btn = e.target.closest('.lb-add-btn');
        if (!btn) return;
        addFriendFromLeaderboard(btn, user);
      });

    } catch (err) {
      console.error('Leaderboard error:', err);
      panel.innerHTML = '<div class="lb-empty">Failed to load leaderboard. Try again later.</div>';
    }
  }

  async function addFriendFromLeaderboard (btn, user) {
    var targetUid = btn.dataset.uid;
    try {
      var db = FirebaseSync.getDb();
      var pair = [user.uid, targetUid].sort();

      // Check if already exists
      var existing = await db.collection('friendships').where('users', '==', pair).limit(1).get();
      if (!existing.empty) {
        btn.textContent = 'Sent';
        btn.disabled = true;
        return;
      }

      await db.collection('friendships').add({
        users:       pair,
        status:      'pending',
        requestedBy: user.uid,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });

      btn.textContent = 'Sent!';
      btn.disabled = true;
      btn.style.opacity = '0.6';
    } catch (err) {
      console.error('Add friend from leaderboard error:', err);
      btn.textContent = 'Error';
    }
  }

  function signinPrompt () {
    return '<div class="social-signin-prompt">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21V11M16 21V7M12 21V3"/></svg>'
      + '<p>Sign in to see the leaderboard</p>'
      + '<button onclick="document.getElementById(\'authSignInBtn\').click()">Sign In</button>'
      + '</div>';
  }

  function esc (str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatNum (n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }

  return { init: init };
})();
