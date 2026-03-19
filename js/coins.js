// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Coin System & Topbar Stats
//  Manages coins, XP boosters, topbar stat display, coin animations
// ─────────────────────────────────────────────────────────────────────────────

var CoinSystem = (function () {
  'use strict';

  const STORAGE_KEY = 'ccna_anki_game';
  const BOOSTER_KEY = 'ccna_boosters';

  // ── XP helpers (mirrors anki.js) ──────────────────────────
  function xpForLevel (lvl) { return lvl * (lvl - 1) * 50; }
  function levelFromXP (xp) {
    let lvl = 1;
    while (xpForLevel(lvl + 1) <= xp) lvl++;
    return lvl;
  }

  // ── Load game state ────────────────────────────────────────
  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function saveGame (g) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }
    catch (_) {}
  }

  // ── Coin operations ────────────────────────────────────────
  function getCoins () {
    var g = loadGame();
    return g.coins || 0;
  }

  function addCoins (amount) {
    var g = loadGame();
    g.coins = (g.coins || 0) + amount;
    saveGame(g);
    updateTopbar();
    showCoinPopup('+' + amount);
    // Sync to firebase
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveAnki();
    return g.coins;
  }

  function spendCoins (amount) {
    var g = loadGame();
    if ((g.coins || 0) < amount) return false;
    g.coins -= amount;
    saveGame(g);
    updateTopbar();
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.saveAnki();
    return true;
  }

  // ── Coin popup animation ───────────────────────────────────
  function showCoinPopup (text) {
    var popup = document.createElement('div');
    popup.className = 'coin-popup';
    popup.textContent = text;
    document.body.appendChild(popup);
    setTimeout(function () { popup.remove(); }, 1300);
  }

  // ── XP Boosters ────────────────────────────────────────────
  function loadBoosters () {
    try { return JSON.parse(localStorage.getItem(BOOSTER_KEY)) || []; }
    catch (_) { return []; }
  }

  function saveBoosters (boosters) {
    try { localStorage.setItem(BOOSTER_KEY, JSON.stringify(boosters)); }
    catch (_) {}
  }

  function activateBooster (durationMinutes, cost) {
    if (!spendCoins(cost)) return false;
    var boosters = loadBoosters();
    var expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    boosters.push({ multiplier: 2, expiresAt: expiresAt });
    saveBoosters(boosters);
    updateTopbar();
    return true;
  }

  function getActiveBooster () {
    var boosters = loadBoosters();
    var now = Date.now();
    // Remove expired
    var active = boosters.filter(function (b) { return b.expiresAt > now; });
    if (active.length !== boosters.length) saveBoosters(active);
    return active.length > 0 ? active[0] : null;
  }

  function getBoosterMultiplier () {
    var b = getActiveBooster();
    return b ? b.multiplier : 1;
  }

  function getBoosterTimeLeft () {
    var b = getActiveBooster();
    if (!b) return null;
    var left = b.expiresAt - Date.now();
    if (left <= 0) return null;
    var mins = Math.ceil(left / 60000);
    if (mins >= 60) return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
    return mins + 'm';
  }

  // ── Topbar Stats Update ────────────────────────────────────
  function updateTopbar () {
    var g = loadGame();
    var level = levelFromXP(g.xp || 0);
    var nextXP = xpForLevel(level + 1);
    var prevXP = xpForLevel(level);
    var pct = nextXP > prevXP ? Math.round(((g.xp - prevXP) / (nextXP - prevXP)) * 100) : 100;
    var coins = g.coins || 0;

    // Level badge
    var levelNum = document.getElementById('topbarLevelNum');
    if (levelNum) levelNum.textContent = level;

    // XP bar
    var xpFill = document.getElementById('topbarXpFill');
    if (xpFill) xpFill.style.width = pct + '%';

    var xpLabel = document.getElementById('topbarXpLabel');
    if (xpLabel) xpLabel.textContent = (g.xp || 0) + ' / ' + nextXP + ' XP';

    // Coins
    var coinCount = document.getElementById('topbarCoinCount');
    if (coinCount) coinCount.textContent = formatNum(coins);

    // Booster indicator
    var boosterEl = document.getElementById('topbarBooster');
    var timeLeft = getBoosterTimeLeft();
    if (boosterEl) {
      if (timeLeft) {
        boosterEl.style.display = 'flex';
        boosterEl.querySelector('.booster-time').textContent = '2x ' + timeLeft;
      } else {
        boosterEl.style.display = 'none';
      }
    }
  }

  function formatNum (n) {
    if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // ── Init ───────────────────────────────────────────────────
  function init () {
    updateTopbar();
    // Refresh booster display every 30s
    setInterval(updateTopbar, 30000);
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init: init,
    getCoins: getCoins,
    addCoins: addCoins,
    spendCoins: spendCoins,
    activateBooster: activateBooster,
    getActiveBooster: getActiveBooster,
    getBoosterMultiplier: getBoosterMultiplier,
    getBoosterTimeLeft: getBoosterTimeLeft,
    updateTopbar: updateTopbar,
    levelFromXP: levelFromXP,
    xpForLevel: xpForLevel,
  };

})();
