// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Profile Page
//  Avatar picker, border display, user stats
// ─────────────────────────────────────────────────────────────────────────────

var Profile = (function () {
  'use strict';

  const STORAGE_KEY = 'ccna_anki_game';
  const PROFILE_KEY = 'ccna_profile';

  // ── Avatar SVG definitions (IT-themed) ─────────────────────
  const AVATARS = {
    // Free avatars
    router:    { name: 'Router',    free: true, svg: '<path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><path d="M6 6V3M18 6V3M6 18v3M18 18v3" stroke="currentColor" stroke-width="1.5"/>' },
    switch_d:  { name: 'Switch',    free: true, svg: '<rect x="2" y="8" width="20" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="11" x2="6" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="11" x2="10" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="11" x2="14" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="18" y1="11" x2="18" y2="13" stroke="currentColor" stroke-width="1.5"/>' },
    firewall:  { name: 'Firewall',  free: true, svg: '<rect x="3" y="2" width="18" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h18M3 14h18" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="5" r="1" fill="currentColor"/><circle cx="7" cy="11" r="1" fill="currentColor"/><circle cx="7" cy="17" r="1" fill="currentColor"/>' },
    server:    { name: 'Server',    free: true, svg: '<rect x="4" y="2" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="9" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="16" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="5" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="19" r="1" fill="currentColor"/>' },
    cloud:     { name: 'Cloud',     free: true, svg: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    wifi:      { name: 'WiFi',      free: true, svg: '<path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="20" r="1.5" fill="currentColor"/>' },
    ethernet:  { name: 'Ethernet',  free: true, svg: '<rect x="5" y="3" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 13v4M12 13v4M16 13v4M8 17h8" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/>' },
    terminal:  { name: 'Terminal',  free: true, svg: '<rect x="2" y="3" width="20" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="6 9 10 12 6 15" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="15" x2="18" y2="15" stroke="currentColor" stroke-width="1.5"/>' },
    database:  { name: 'Database',  free: true, svg: '<ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    lock:      { name: 'Lock',      free: true, svg: '<rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 11V7a4 4 0 018 0v4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/>' },
    shield:    { name: 'Shield',    free: true, svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    globe:     { name: 'Globe',     free: true, svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    cpu:       { name: 'CPU',       free: true, svg: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" stroke="currentColor" stroke-width="1.5"/>' },
    ram:       { name: 'RAM',       free: true, svg: '<rect x="2" y="6" width="20" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 6v-2M10 6v-2M14 6v-2M18 6v-2" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="9" width="4" height="6" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="11" y="9" width="4" height="6" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/>' },
    harddrive: { name: 'Hard Drive', free: true, svg: '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="17.5" r="1.5" fill="currentColor"/>' },
    monitor:   { name: 'Monitor',   free: true, svg: '<rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/>' },
    cable:     { name: 'Cable',     free: true, svg: '<path d="M4 9h3v6H4zM17 9h3v6h-3z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 12h10" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="1.5"/>' },
    antenna:   { name: 'Antenna',   free: true, svg: '<path d="M12 20V8" stroke="currentColor" stroke-width="1.5"/><path d="M5 4l7 4 7-4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" stroke-width="1.5"/>' },
    binary:    { name: 'Binary',    free: true, svg: '<text x="3" y="10" font-family="monospace" font-size="7" fill="currentColor">01</text><text x="13" y="10" font-family="monospace" font-size="7" fill="currentColor">10</text><text x="3" y="18" font-family="monospace" font-size="7" fill="currentColor">11</text><text x="13" y="18" font-family="monospace" font-size="7" fill="currentColor">00</text>' },
    packet:    { name: 'Packet',    free: true, svg: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="9" x2="9" y2="19" stroke="currentColor" stroke-width="1"/><text x="5" y="8" font-family="monospace" font-size="3.5" fill="currentColor">HDR</text>' },

    // Premium avatars (cost coins)
    rack:       { name: 'Server Rack', free: false, cost: 100, svg: '<rect x="5" y="2" width="14" height="20" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="6" x2="17" y2="6" stroke="currentColor" stroke-width="1"/><line x1="7" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width="1"/><line x1="7" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="1"/><line x1="7" y1="18" x2="17" y2="18" stroke="currentColor" stroke-width="1"/><circle cx="16" cy="4" r="0.7" fill="currentColor"/><circle cx="16" cy="8" r="0.7" fill="currentColor"/><circle cx="16" cy="12" r="0.7" fill="currentColor"/><circle cx="16" cy="16" r="0.7" fill="currentColor"/>' },
    fiber:      { name: 'Fiber Optic', free: false, cost: 100, svg: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="currentColor" stroke-width="1.5"/><path d="M4.93 4.93l4.95 4.95M14.12 14.12l4.95 4.95M4.93 19.07l4.95-4.95M14.12 9.88l4.95-4.95" stroke="currentColor" stroke-width="1" opacity="0.5"/>' },
    loadbalancer: { name: 'Load Balancer', free: false, cost: 150, svg: '<circle cx="12" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="19" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="19" cy="19" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v3M9 13l-4 4M15 13l4 4" stroke="currentColor" stroke-width="1.5"/>' },
    vpn:        { name: 'VPN Tunnel', free: false, cost: 150, svg: '<rect x="1" y="8" width="6" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="17" y="8" width="6" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 12h10" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/><path d="M7 10c3-3 7-3 10 0M7 14c3 3 7 3 10 0" fill="none" stroke="currentColor" stroke-width="1"/>' },
    api:        { name: 'API Gateway', free: false, cost: 200, svg: '<path d="M12 2L2 7l10 5 10-5-10-5z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    kubernetes: { name: 'Kubernetes', free: false, cost: 200, svg: '<path d="M12 2l-2 4h4l-2-4zM12 22l-2-4h4l-2 4zM2 12l4-2v4l-4-2zM22 12l-4-2v4l4-2z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 9V6M12 18v-3M9 12H6M18 12h-3" stroke="currentColor" stroke-width="1"/>' },
    docker:     { name: 'Container', free: false, cost: 250, svg: '<rect x="3" y="10" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="12" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="10.5" y="12" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="15" y="12" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M6 10V7M10 10V5M14 10V7" stroke="currentColor" stroke-width="1.5"/>' },
    quantum:    { name: 'Quantum',   free: false, cost: 300, svg: '<circle cx="12" cy="12" r="2" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(0 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(120 12 12)"/>' },
    ai:         { name: 'AI Brain',  free: false, cost: 350, svg: '<circle cx="12" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 8c0-1 1-2 2-2s2 1 2 1 0-2 2-2 2 1 2 2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M9 17v4M15 17v4M12 17v5" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="10" r="1" fill="currentColor"/>' },
    satellite:  { name: 'Satellite', free: false, cost: 400, svg: '<rect x="8" y="8" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4" stroke="currentColor" stroke-width="1.5"/><path d="M2 8h4M18 8h4M2 16h4M18 16h4" stroke="currentColor" stroke-width="1"/>' },
  };

  // ── Border definitions ─────────────────────────────────────
  const BORDERS = [
    { id: 0, name: 'Plain Circle',       cost: 0,   minLevel: 1  },
    { id: 1, name: 'Cyan Ring',          cost: 0,   minLevel: 1  },
    { id: 2, name: 'Green Ring',         cost: 50,  minLevel: 3  },
    { id: 3, name: 'Gold Ring',          cost: 75,  minLevel: 5  },
    { id: 4, name: 'Purple Ring',        cost: 100, minLevel: 7  },
    { id: 5, name: 'Glowing Cyan',       cost: 150, minLevel: 10 },
    { id: 6, name: 'Glowing Green',      cost: 200, minLevel: 12 },
    { id: 7, name: 'Rainbow Spin',       cost: 300, minLevel: 15 },
    { id: 8, name: 'Golden Pulse',       cost: 400, minLevel: 18 },
    { id: 9, name: 'Prismatic Aura',     cost: 500, minLevel: 20 },
  ];

  // ── Profile persistence ────────────────────────────────────
  function loadProfile () {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || defaultProfile(); }
    catch (_) { return defaultProfile(); }
  }

  function defaultProfile () {
    return {
      avatar: 'router',
      border: 0,
      ownedBorders: [0, 1],
      ownedAvatars: Object.keys(AVATARS).filter(function (k) { return AVATARS[k].free; }),
    };
  }

  function saveProfile (p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
    catch (_) {}
    // Sync to Firestore
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isSignedIn()) {
      syncProfileToFirestore(p);
    }
  }

  async function syncProfileToFirestore (p) {
    try {
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();
      if (!db || !user) return;
      await db.collection('users').doc(user.uid).set({
        avatar: p.avatar,
        border: p.border,
        ownedBorders: p.ownedBorders,
        ownedAvatars: p.ownedAvatars,
      }, { merge: true });
    } catch (err) {
      console.error('Profile sync error:', err);
    }
  }

  async function pullProfileFromFirestore () {
    try {
      if (!FirebaseSync.isSignedIn()) return;
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();
      var doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        var d = doc.data();
        var local = loadProfile();
        if (d.avatar) local.avatar = d.avatar;
        if (d.border !== undefined) local.border = d.border;
        if (d.ownedBorders && d.ownedBorders.length > local.ownedBorders.length) {
          local.ownedBorders = d.ownedBorders;
        }
        if (d.ownedAvatars && d.ownedAvatars.length > local.ownedAvatars.length) {
          local.ownedAvatars = d.ownedAvatars;
        }
        saveProfile(local);
      }
    } catch (err) {
      console.error('Profile pull error:', err);
    }
  }

  // ── Render helpers ─────────────────────────────────────────
  function getAvatarSVG (avatarId, size) {
    size = size || 24;
    var av = AVATARS[avatarId] || AVATARS.router;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none">' + av.svg + '</svg>';
  }

  function getAvatarWithBorder (avatarId, borderId, size) {
    size = size || 40;
    var innerSize = Math.round(size * 0.6);
    return '<div class="avatar-ring" data-border="' + (borderId || 0) + '" style="width:' + size + 'px;height:' + size + 'px;">'
      + '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">'
      + getAvatarSVG(avatarId, innerSize)
      + '</div></div>';
  }

  // ── Profile page render ────────────────────────────────────
  function init () {
    var panel = document.getElementById('tool-profile');
    if (!panel) return;

    var g = loadGame();
    var p = loadProfile();
    var level = CoinSystem.levelFromXP(g.xp || 0);
    var nextXP = CoinSystem.xpForLevel(level + 1);
    var coins = g.coins || 0;

    var conquered = 0;
    if (g.sections) {
      for (var sid in g.sections) {
        if (g.sections[sid].defeated) conquered++;
      }
    }

    var displayName = 'Player';
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isSignedIn()) {
      var user = FirebaseSync.getCurrentUser();
      if (user) displayName = user.displayName || user.email.split('@')[0];
    }

    // Free avatars grid
    var freeAvatarKeys = Object.keys(AVATARS).filter(function (k) { return AVATARS[k].free; });
    var premiumAvatarKeys = Object.keys(AVATARS).filter(function (k) { return !AVATARS[k].free; });

    var avatarGridHTML = freeAvatarKeys.map(function (key) {
      var selected = p.avatar === key ? ' selected' : '';
      return '<button class="avatar-pick-item' + selected + '" data-avatar="' + key + '" title="' + AVATARS[key].name + '">'
        + getAvatarSVG(key, 30) + '</button>';
    }).join('');

    var premiumGridHTML = premiumAvatarKeys.map(function (key) {
      var av = AVATARS[key];
      var owned = p.ownedAvatars.indexOf(key) !== -1;
      var selected = p.avatar === key ? ' selected' : '';
      var locked = !owned ? ' locked' : '';
      return '<div style="text-align:center;">'
        + '<button class="avatar-pick-item' + selected + locked + '" data-avatar="' + key + '" title="' + av.name + (owned ? '' : ' (' + av.cost + ' coins)') + '">'
        + getAvatarSVG(key, 30) + '</button>'
        + (!owned ? '<div class="avatar-pick-cost">' + av.cost + '</div>' : '')
        + '</div>';
    }).join('');

    panel.innerHTML = '<div class="profile-container">'
      + '<div class="profile-card">'
      + '  <div class="profile-avatar-display">'
      + '    <div class="profile-avatar-large avatar-ring" data-border="' + p.border + '">'
      + getAvatarSVG(p.avatar, 56)
      + '    </div>'
      + '    <div class="profile-name">' + esc(displayName) + '</div>'
      + '  </div>'
      + '  <div class="profile-stats-grid">'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + level + '</span><span class="profile-stat-lbl">Level</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + (g.xp || 0) + '</span><span class="profile-stat-lbl">XP</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val coins-val">' + coins + '</span><span class="profile-stat-lbl">Coins</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val green-val">' + (g.totalCorrect || 0) + '</span><span class="profile-stat-lbl">Correct</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + (g.bestStreak || 0) + '</span><span class="profile-stat-lbl">Best Streak</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + conquered + '</span><span class="profile-stat-lbl">Conquered</span></div>'
      + '  </div>'
      + '</div>'
      + '<div class="profile-card">'
      + '  <div class="profile-section-title">Choose Avatar</div>'
      + '  <div class="avatar-picker-grid" id="avatarPickerGrid">' + avatarGridHTML + '</div>'
      + (premiumAvatarKeys.length > 0 ? '<div class="profile-section-title" style="margin-top:20px;">Premium Avatars</div><div class="avatar-picker-grid" id="premiumAvatarGrid">' + premiumGridHTML + '</div>' : '')
      + '</div>'
      + '</div>';

    // Bind avatar selection
    panel.addEventListener('click', function (e) {
      var item = e.target.closest('.avatar-pick-item');
      if (!item) return;
      var key = item.dataset.avatar;
      if (!key) return;

      var profile = loadProfile();

      // Check if owned
      if (profile.ownedAvatars.indexOf(key) === -1) {
        // Need to buy
        var av = AVATARS[key];
        if (!av || av.free) return;
        if (!CoinSystem.spendCoins(av.cost)) {
          alert('Not enough coins! You need ' + av.cost + ' coins.');
          return;
        }
        profile.ownedAvatars.push(key);
      }

      profile.avatar = key;
      saveProfile(profile);

      // Update selection visuals
      panel.querySelectorAll('.avatar-pick-item').forEach(function (el) {
        el.classList.remove('selected');
        if (el.dataset.avatar === key) el.classList.add('selected');
        // Remove locked class if now owned
        if (profile.ownedAvatars.indexOf(el.dataset.avatar) !== -1) {
          el.classList.remove('locked');
        }
      });

      // Update large avatar
      var largeAvatar = panel.querySelector('.profile-avatar-large');
      if (largeAvatar) {
        largeAvatar.innerHTML = getAvatarSVG(key, 56);
      }

      CoinSystem.updateTopbar();
    });
  }

  function esc (str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init: init,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    pullProfileFromFirestore: pullProfileFromFirestore,
    getAvatarSVG: getAvatarSVG,
    getAvatarWithBorder: getAvatarWithBorder,
    AVATARS: AVATARS,
    BORDERS: BORDERS,
  };

})();
