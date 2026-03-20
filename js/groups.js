// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Study Groups
//  Create/join groups with shared leaderboard and chat
// ─────────────────────────────────────────────────────────────────────────────

var StudyGroups = (function () {
  'use strict';

  var chatUnsubscribe = null;

  function esc (s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function generateCode () {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function init () {
    var panel = document.getElementById('tool-groups');
    if (!panel) return;
    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    renderHome(panel);
  }

  function renderHome (panel) {
    var isSignedIn = typeof FirebaseSync !== 'undefined' && FirebaseSync.isSignedIn();

    if (!isSignedIn) {
      panel.innerHTML = '<div class="group-view">'
        + '<h2 class="group-title">\uD83D\uDC65 Study Groups</h2>'
        + '<div class="group-signin-msg"><p>Sign in to create or join study groups!</p></div>'
        + '</div>';
      return;
    }

    var user = FirebaseSync.getCurrentUser();
    var db = FirebaseSync.getDb();

    // Load user's groups
    db.collection('groups')
      .where('members', 'array-contains', user.uid)
      .get()
      .then(function (snap) {
        var groups = [];
        snap.forEach(function (doc) { groups.push(Object.assign({ id: doc.id }, doc.data())); });
        renderGroupList(panel, groups, user, db);
      })
      .catch(function () {
        renderGroupList(panel, [], user, db);
      });
  }

  function renderGroupList (panel, groups, user, db) {
    var groupsHTML = groups.length > 0
      ? groups.map(function (g) {
        return '<button class="group-card" data-gid="' + g.id + '">'
          + '<div class="group-card-name">' + esc(g.name) + '</div>'
          + '<div class="group-card-info">' + (g.members ? g.members.length : 0) + ' members \u2022 Code: ' + (g.inviteCode || '???') + '</div>'
          + '</button>';
      }).join('')
      : '<p class="group-empty">No groups yet. Create or join one!</p>';

    panel.innerHTML = '<div class="group-view">'
      + '<h2 class="group-title">\uD83D\uDC65 Study Groups</h2>'
      + '<div class="group-actions">'
      + '  <div class="group-create">'
      + '    <input type="text" id="groupNameInput" class="group-input" placeholder="Group name..." maxlength="30" />'
      + '    <button class="anki-btn anki-btn-accent" id="groupCreateBtn">Create</button>'
      + '  </div>'
      + '  <div class="group-join">'
      + '    <input type="text" id="groupCodeInput" class="group-input" placeholder="Invite code..." maxlength="6" style="text-transform:uppercase" />'
      + '    <button class="anki-btn anki-btn-secondary" id="groupJoinBtn">Join</button>'
      + '  </div>'
      + '</div>'
      + '<div class="group-list">' + groupsHTML + '</div>'
      + '</div>';

    document.getElementById('groupCreateBtn').addEventListener('click', function () {
      var name = document.getElementById('groupNameInput').value.trim();
      if (!name) return;
      createGroup(panel, db, user, name);
    });

    document.getElementById('groupJoinBtn').addEventListener('click', function () {
      var code = document.getElementById('groupCodeInput').value.trim().toUpperCase();
      if (!code) return;
      joinGroup(panel, db, user, code);
    });

    panel.querySelectorAll('.group-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openGroup(panel, db, user, card.dataset.gid);
      });
    });
  }

  function createGroup (panel, db, user, name) {
    var code = generateCode();
    db.collection('groups').add({
      name: name,
      inviteCode: code,
      admin: user.uid,
      members: [user.uid],
      memberNames: [user.displayName || user.email],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(function () {
      if (typeof Toast !== 'undefined') Toast.show('Group created! Code: ' + code, 'success', 5000);
      renderHome(panel);
    });
  }

  function joinGroup (panel, db, user, code) {
    db.collection('groups')
      .where('inviteCode', '==', code)
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) {
          if (typeof Toast !== 'undefined') Toast.show('Group not found', 'error');
          return;
        }
        var doc = snap.docs[0];
        var data = doc.data();
        if (data.members && data.members.indexOf(user.uid) !== -1) {
          if (typeof Toast !== 'undefined') Toast.show('Already in this group', 'warning');
          return;
        }
        db.collection('groups').doc(doc.id).update({
          members: firebase.firestore.FieldValue.arrayUnion(user.uid),
          memberNames: firebase.firestore.FieldValue.arrayUnion(user.displayName || user.email),
        }).then(function () {
          if (typeof Toast !== 'undefined') Toast.show('Joined "' + data.name + '"!', 'success');
          renderHome(panel);
        });
      });
  }

  function openGroup (panel, db, user, groupId) {
    db.collection('groups').doc(groupId).get().then(function (doc) {
      if (!doc.exists) return;
      var group = Object.assign({ id: doc.id }, doc.data());
      renderGroupDetail(panel, db, user, group);
    });
  }

  function renderGroupDetail (panel, db, user, group) {
    var membersHTML = (group.memberNames || []).map(function (n) {
      return '<div class="group-member">' + esc(n) + '</div>';
    }).join('');

    panel.innerHTML = '<div class="group-detail">'
      + '<div class="group-detail-header">'
      + '  <button class="anki-back-btn" id="groupBackBtn">\u2190 Groups</button>'
      + '  <h2>' + esc(group.name) + '</h2>'
      + '  <span class="group-code">Code: ' + (group.inviteCode || '') + '</span>'
      + '</div>'
      + '<div class="group-detail-tabs">'
      + '  <button class="group-tab active" data-tab="chat">Chat</button>'
      + '  <button class="group-tab" data-tab="members">Members (' + (group.members || []).length + ')</button>'
      + '</div>'
      + '<div class="group-tab-content" id="groupTabContent">'
      + '  <div class="group-chat" id="groupChat">'
      + '    <div class="group-messages" id="groupMessages"></div>'
      + '    <div class="group-chat-input">'
      + '      <input type="text" id="groupMsgInput" class="group-input" placeholder="Type a message..." maxlength="200" />'
      + '      <button class="anki-btn anki-btn-accent" id="groupSendBtn">Send</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="group-members-list" id="groupMembersList" style="display:none">' + membersHTML + '</div>'
      + '</div>'
      + '</div>';

    document.getElementById('groupBackBtn').addEventListener('click', function () {
      if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
      renderHome(panel);
    });

    // Tabs
    panel.querySelectorAll('.group-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        panel.querySelectorAll('.group-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var chatEl = document.getElementById('groupChat');
        var membersEl = document.getElementById('groupMembersList');
        if (tab.dataset.tab === 'chat') {
          chatEl.style.display = '';
          membersEl.style.display = 'none';
        } else {
          chatEl.style.display = 'none';
          membersEl.style.display = '';
        }
      });
    });

    // Chat
    var messagesEl = document.getElementById('groupMessages');
    chatUnsubscribe = db.collection('groups').doc(group.id).collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(50)
      .onSnapshot(function (snap) {
        var html = '';
        snap.forEach(function (doc) {
          var msg = doc.data();
          var isMe = msg.uid === user.uid;
          html += '<div class="group-msg ' + (isMe ? 'mine' : '') + '">'
            + '<span class="group-msg-name">' + esc(msg.name || 'User') + '</span>'
            + '<span class="group-msg-text">' + esc(msg.text) + '</span>'
            + '</div>';
        });
        messagesEl.innerHTML = html;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });

    document.getElementById('groupSendBtn').addEventListener('click', sendMessage);
    document.getElementById('groupMsgInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendMessage();
    });

    function sendMessage () {
      var input = document.getElementById('groupMsgInput');
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      db.collection('groups').doc(group.id).collection('messages').add({
        uid: user.uid,
        name: user.displayName || user.email,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  return { init: init };
})();
