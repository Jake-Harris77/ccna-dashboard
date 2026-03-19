// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Shop Page
//  Buy borders, premium avatars, XP boosters
// ─────────────────────────────────────────────────────────────────────────────

var Shop = (function () {
  'use strict';

  const STORAGE_KEY = 'ccna_anki_game';

  var currentTab = 'borders';

  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function init () {
    var panel = document.getElementById('tool-shop');
    if (!panel) return;
    render(panel);
  }

  function render (panel) {
    if (!panel) panel = document.getElementById('tool-shop');
    var g = loadGame();
    var coins = g.coins || 0;
    var level = CoinSystem.levelFromXP(g.xp || 0);
    var profile = Profile.loadProfile();

    var coinSVG = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#fbbf24" opacity="0.2" stroke="#fbbf24" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#fbbf24">$</text></svg>';

    panel.innerHTML = '<div class="shop-container">'
      + '<div class="shop-balance">' + coinSVG + ' ' + coins + '<span>coins available</span></div>'
      + '<div class="shop-tabs">'
      + '  <button class="shop-tab' + (currentTab === 'borders' ? ' active' : '') + '" data-tab="borders">Borders</button>'
      + '  <button class="shop-tab' + (currentTab === 'avatars' ? ' active' : '') + '" data-tab="avatars">Avatars</button>'
      + '  <button class="shop-tab' + (currentTab === 'boosters' ? ' active' : '') + '" data-tab="boosters">Boosters</button>'
      + '</div>'
      + '<div class="shop-section' + (currentTab === 'borders' ? ' active' : '') + '" id="shopBorders">' + renderBorders(profile, coins, level) + '</div>'
      + '<div class="shop-section' + (currentTab === 'avatars' ? ' active' : '') + '" id="shopAvatars">' + renderAvatars(profile, coins) + '</div>'
      + '<div class="shop-section' + (currentTab === 'boosters' ? ' active' : '') + '" id="shopBoosters">' + renderBoosters(coins) + '</div>'
      + '</div>';

    // Tab switching
    panel.querySelectorAll('.shop-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentTab = tab.dataset.tab;
        render(panel);
      });
    });

    // Border buy/equip
    panel.querySelectorAll('.border-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleBorderAction(btn, panel);
      });
    });

    // Avatar buy/equip
    panel.querySelectorAll('.avatar-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAvatarAction(btn, panel);
      });
    });

    // Booster buy
    panel.querySelectorAll('.booster-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleBoosterAction(btn, panel);
      });
    });
  }

  // ── Borders tab ────────────────────────────────────────────
  function renderBorders (profile, coins, level) {
    var borders = Profile.BORDERS;
    return '<div class="shop-grid">' + borders.map(function (b) {
      var owned = profile.ownedBorders.indexOf(b.id) !== -1;
      var equipped = profile.border === b.id;
      var meetsLevel = level >= b.minLevel;
      var canAfford = coins >= b.cost;

      // Preview ring
      var preview = '<div class="shop-item-preview avatar-ring" data-border="' + b.id + '">'
        + Profile.getAvatarSVG(profile.avatar, 32)
        + '</div>';

      var reqHTML = '';
      if (!owned) {
        var reqClass = meetsLevel ? 'met' : 'unmet';
        reqHTML = '<div class="shop-item-req ' + reqClass + '">Level ' + b.minLevel + ' required</div>';
      }

      var btnHTML;
      if (equipped) {
        btnHTML = '<button class="shop-buy-btn equipped" disabled>Equipped</button>';
      } else if (owned) {
        btnHTML = '<button class="shop-buy-btn equip border-action-btn" data-border="' + b.id + '" data-action="equip">Equip</button>';
      } else {
        var disabled = (!meetsLevel || !canAfford) ? ' disabled' : '';
        btnHTML = '<button class="shop-buy-btn buy border-action-btn" data-border="' + b.id + '" data-action="buy" data-cost="' + b.cost + '"' + disabled + '>'
          + (b.cost > 0 ? b.cost + ' coins' : 'Free')
          + '</button>';
      }

      return '<div class="shop-item">'
        + preview
        + '<div class="shop-item-name">' + b.name + '</div>'
        + reqHTML
        + btnHTML
        + '</div>';
    }).join('') + '</div>';
  }

  // ── Avatars tab ────────────────────────────────────────────
  function renderAvatars (profile, coins) {
    var premiumKeys = Object.keys(Profile.AVATARS).filter(function (k) { return !Profile.AVATARS[k].free; });

    return '<div class="shop-grid">' + premiumKeys.map(function (key) {
      var av = Profile.AVATARS[key];
      var owned = profile.ownedAvatars.indexOf(key) !== -1;
      var equipped = profile.avatar === key;
      var canAfford = coins >= av.cost;

      var preview = '<div class="shop-item-preview">' + Profile.getAvatarSVG(key, 32) + '</div>';

      var btnHTML;
      if (equipped) {
        btnHTML = '<button class="shop-buy-btn equipped" disabled>Equipped</button>';
      } else if (owned) {
        btnHTML = '<button class="shop-buy-btn equip avatar-action-btn" data-avatar="' + key + '" data-action="equip">Equip</button>';
      } else {
        var disabled = !canAfford ? ' disabled' : '';
        btnHTML = '<button class="shop-buy-btn buy avatar-action-btn" data-avatar="' + key + '" data-action="buy" data-cost="' + av.cost + '"' + disabled + '>'
          + av.cost + ' coins</button>';
      }

      return '<div class="shop-item">'
        + preview
        + '<div class="shop-item-name">' + av.name + '</div>'
        + btnHTML
        + '</div>';
    }).join('') + '</div>';
  }

  // ── Boosters tab ───────────────────────────────────────────
  function renderBoosters (coins) {
    var activeBooster = CoinSystem.getActiveBooster();
    var timeLeft = CoinSystem.getBoosterTimeLeft();

    var activeHTML = '';
    if (activeBooster) {
      activeHTML = '<div class="booster-card" style="border-color: var(--yellow); background: var(--yellow-dim);">'
        + '<div class="booster-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>'
        + '<div class="booster-info">'
        + '  <div class="booster-name" style="color: var(--yellow);">2x XP Active!</div>'
        + '  <div class="booster-desc">' + timeLeft + ' remaining</div>'
        + '</div>'
        + '</div>';
    }

    var booster30 = '<div class="booster-card">'
      + '<div class="booster-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>'
      + '<div class="booster-info">'
      + '  <div class="booster-name">2x XP Boost (30 min)</div>'
      + '  <div class="booster-desc">Double all XP earned for 30 minutes</div>'
      + '</div>'
      + '<button class="booster-buy-btn booster-action-btn" data-duration="30" data-cost="50"' + (coins < 50 || activeBooster ? ' disabled' : '') + '>'
      + '50 coins</button>'
      + '</div>';

    var booster120 = '<div class="booster-card">'
      + '<div class="booster-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>'
      + '<div class="booster-info">'
      + '  <div class="booster-name">2x XP Boost (2 hours)</div>'
      + '  <div class="booster-desc">Double all XP earned for 2 hours</div>'
      + '</div>'
      + '<button class="booster-buy-btn booster-action-btn" data-duration="120" data-cost="150"' + (coins < 150 || activeBooster ? ' disabled' : '') + '>'
      + '150 coins</button>'
      + '</div>';

    return activeHTML + booster30 + booster120;
  }

  // ── Action handlers ────────────────────────────────────────
  function handleBorderAction (btn, panel) {
    var action = btn.dataset.action;
    var borderId = parseInt(btn.dataset.border, 10);
    var profile = Profile.loadProfile();

    if (action === 'equip') {
      profile.border = borderId;
      Profile.saveProfile(profile);
      render(panel);
      CoinSystem.updateTopbar();
    } else if (action === 'buy') {
      var cost = parseInt(btn.dataset.cost, 10);
      if (!CoinSystem.spendCoins(cost)) {
        alert('Not enough coins!');
        return;
      }
      profile.ownedBorders.push(borderId);
      profile.border = borderId;
      Profile.saveProfile(profile);
      render(panel);
      CoinSystem.updateTopbar();
    }
  }

  function handleAvatarAction (btn, panel) {
    var action = btn.dataset.action;
    var avatarKey = btn.dataset.avatar;
    var profile = Profile.loadProfile();

    if (action === 'equip') {
      profile.avatar = avatarKey;
      Profile.saveProfile(profile);
      render(panel);
      CoinSystem.updateTopbar();
    } else if (action === 'buy') {
      var cost = parseInt(btn.dataset.cost, 10);
      if (!CoinSystem.spendCoins(cost)) {
        alert('Not enough coins!');
        return;
      }
      profile.ownedAvatars.push(avatarKey);
      profile.avatar = avatarKey;
      Profile.saveProfile(profile);
      render(panel);
      CoinSystem.updateTopbar();
    }
  }

  function handleBoosterAction (btn, panel) {
    var duration = parseInt(btn.dataset.duration, 10);
    var cost = parseInt(btn.dataset.cost, 10);
    if (!CoinSystem.activateBooster(duration, cost)) {
      alert('Not enough coins!');
      return;
    }
    render(panel);
    CoinSystem.updateTopbar();
  }

  return { init: init };

})();
