// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Friends System
//  Add friends by email, accept/decline requests, friend list, challenge button
// ─────────────────────────────────────────────────────────────────────────────

var Friends = (function () {
  'use strict';

  var panel;

  function init () {
    panel = document.getElementById('tool-friends');
    if (!panel) return;

    if (!FirebaseSync.isSignedIn()) {
      panel.innerHTML = signinPrompt();
      return;
    }

    panel.innerHTML = '<div class="lb-loading">Loading friends…</div>';
    loadFriends();
  }

  async function loadFriends () {
    var db = FirebaseSync.getDb();
    var user = FirebaseSync.getCurrentUser();

    try {
      var snap = await db.collection('friendships')
        .where('users', 'array-contains', user.uid)
        .get();

      var pending = [];
      var active  = [];

      snap.forEach(function (doc) {
        var d = doc.data();
        d._id = doc.id;
        if (d.status === 'pending' && d.requestedBy !== user.uid) {
          pending.push(d);
        } else if (d.status === 'active') {
          active.push(d);
        } else if (d.status === 'pending' && d.requestedBy === user.uid) {
          pending.push(d); // show as "pending (sent)"
        }
      });

      // Get user profiles for all friends
      var allUids = new Set();
      snap.forEach(function (doc) {
        doc.data().users.forEach(function (uid) {
          if (uid !== user.uid) allUids.add(uid);
        });
      });

      var profiles = {};
      var uidArray = Array.from(allUids);
      // Firestore in-query limited to 30
      for (var i = 0; i < uidArray.length; i += 30) {
        var batch = uidArray.slice(i, i + 30);
        var pSnap = await db.collection('users')
          .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
          .get();
        pSnap.forEach(function (doc) {
          profiles[doc.id] = doc.data();
        });
      }

      render(pending, active, profiles, user);

    } catch (err) {
      console.error('Friends error:', err);
      panel.innerHTML = '<div class="friends-empty">Failed to load friends.</div>';
    }
  }

  function render (pending, active, profiles, user) {
    var html = '<div class="social-header"><h2>Friends</h2></div>';

    // Search bar
    html += '<div class="friends-search">'
      + '<input type="email" class="friends-search-input" id="friendSearchInput" placeholder="Add friend by email address…" />'
      + '<button class="friends-search-btn" id="friendSearchBtn">Add</button>'
      + '</div>';
    html += '<div class="friends-message" id="friendsMessage"></div>';

    // Pending requests
    if (pending.length > 0) {
      html += '<div class="friends-section-label">Pending Requests</div>';
      pending.forEach(function (f) {
        var otherUid = f.users.find(function (u) { return u !== user.uid; });
        var p = profiles[otherUid] || {};
        var isSent = f.requestedBy === user.uid;

        html += friendCard(p, otherUid, isSent
          ? '<span class="lb-stat">Request sent</span>'
          : '<button class="friend-btn friend-btn-accept" data-action="accept" data-id="' + f._id + '">Accept</button>'
            + '<button class="friend-btn friend-btn-decline" data-action="decline" data-id="' + f._id + '">Decline</button>'
        );
      });
    }

    // Active friends
    html += '<div class="friends-section-label">Friends' + (active.length > 0 ? ' (' + active.length + ')' : '') + '</div>';
    if (active.length === 0) {
      html += '<div class="friends-empty">No friends yet. Add someone by email above!</div>';
    } else {
      active.forEach(function (f) {
        var otherUid = f.users.find(function (u) { return u !== user.uid; });
        var p = profiles[otherUid] || {};
        var isOnline = p.lastSeen && p.lastSeen.toDate && (Date.now() - p.lastSeen.toDate().getTime() < 300000);

        html += friendCard(p, otherUid,
          '<button class="friend-btn friend-btn-challenge" data-action="challenge" data-uid="' + otherUid + '" data-name="' + esc(p.displayName || 'Friend') + '">Challenge</button>',
          isOnline
        );
      });
    }

    panel.innerHTML = html;
    bindEvents(user);
  }

  function friendCard (profile, uid, actionsHTML, isOnline) {
    var avatarHTML = profile.photoURL
      ? '<img class="friend-avatar" src="' + esc(profile.photoURL) + '" alt="">'
      : '<div class="friend-avatar-placeholder">' + (profile.displayName || '?').charAt(0).toUpperCase() + '</div>';

    return '<div class="friend-card">'
      + avatarHTML
      + '<div class="friend-info">'
      + '<div class="friend-name">' + esc(profile.displayName || 'Unknown') + '</div>'
      + '<div class="friend-stats">Lv ' + (profile.level || 1) + ' · ' + formatNum(profile.xp || 0) + ' XP · ' + (profile.sectionsConquered || 0) + ' conquered</div>'
      + '</div>'
      + (isOnline ? '<div class="friend-online" title="Online"></div>' : '')
      + '<div class="friend-actions">' + actionsHTML + '</div>'
      + '</div>';
  }

  function bindEvents (user) {
    var searchBtn   = document.getElementById('friendSearchBtn');
    var searchInput = document.getElementById('friendSearchInput');
    var msg         = document.getElementById('friendsMessage');

    if (searchBtn) {
      searchBtn.addEventListener('click', function () { addFriend(user, searchInput, msg); });
    }
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') addFriend(user, searchInput, msg);
      });
    }

    // Accept/decline/challenge buttons
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.dataset.action;
      if (action === 'accept')   acceptFriend(btn.dataset.id);
      if (action === 'decline')  declineFriend(btn.dataset.id);
      if (action === 'challenge') openChallengePicker(btn.dataset.uid, btn.dataset.name);
    });
  }

  async function addFriend (user, input, msg) {
    var email = input.value.trim().toLowerCase();
    if (!email) return;

    if (email === user.email) {
      showMsg(msg, 'error', "You can't add yourself!");
      return;
    }

    try {
      var db = FirebaseSync.getDb();

      // Find user by email
      var uSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (uSnap.empty) {
        showMsg(msg, 'error', 'No user found with that email.');
        return;
      }

      var targetDoc = uSnap.docs[0];
      var targetUid = targetDoc.id;

      // Check if friendship already exists
      var pair = [user.uid, targetUid].sort();
      var existing = await db.collection('friendships')
        .where('users', '==', pair)
        .limit(1)
        .get();

      if (!existing.empty) {
        showMsg(msg, 'error', 'Friend request already exists.');
        return;
      }

      // Create friendship request
      await db.collection('friendships').add({
        users:       pair,
        status:      'pending',
        requestedBy: user.uid,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });

      input.value = '';
      showMsg(msg, 'success', 'Friend request sent to ' + (targetDoc.data().displayName || email) + '!');
      setTimeout(loadFriends, 1500);

    } catch (err) {
      console.error('Add friend error:', err);
      showMsg(msg, 'error', 'Something went wrong. Try again.');
    }
  }

  async function acceptFriend (docId) {
    try {
      var db = FirebaseSync.getDb();
      await db.collection('friendships').doc(docId).update({ status: 'active' });
      loadFriends();
    } catch (err) {
      console.error('Accept friend error:', err);
    }
  }

  async function declineFriend (docId) {
    try {
      var db = FirebaseSync.getDb();
      await db.collection('friendships').doc(docId).delete();
      loadFriends();
    } catch (err) {
      console.error('Decline friend error:', err);
    }
  }

  function openChallengePicker (friendUid, friendName) {
    if (typeof Challenges !== 'undefined') {
      Challenges.openPicker(friendUid, friendName);
    }
  }

  function showMsg (el, type, text) {
    el.className = 'friends-message ' + type;
    el.textContent = text;
    setTimeout(function () { el.className = 'friends-message'; }, 4000);
  }

  function signinPrompt () {
    return '<div class="social-signin-prompt">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>'
      + '<p>Sign in to add friends</p>'
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
