// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Streak Calendar
//  GitHub-style heatmap of daily study activity
// ─────────────────────────────────────────────────────────────────────────────

var StreakCalendar = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';

  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function todayKey () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function recordActivity (correct, wrong, xp) {
    var g = loadGame();
    if (!g.streakCalendar) g.streakCalendar = {};
    var key = todayKey();
    var day = g.streakCalendar[key] || { correct: 0, wrong: 0, xp: 0 };
    day.correct += (correct || 0);
    day.wrong += (wrong || 0);
    day.xp += (xp || 0);
    g.streakCalendar[key] = day;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch (_) {}
  }

  function getStreak () {
    var g = loadGame();
    var cal = g.streakCalendar || {};
    var streak = 0;
    var d = new Date();
    // Check today first
    var key = formatDate(d);
    if (!cal[key]) {
      // Check if yesterday had activity (streak still alive if today not started)
      d.setDate(d.getDate() - 1);
      key = formatDate(d);
      if (!cal[key]) return 0;
    }
    // Count consecutive days backward
    d = new Date();
    for (var i = 0; i < 365; i++) {
      key = formatDate(d);
      if (cal[key] && cal[key].correct > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0) {
        // Today has no activity yet, check from yesterday
        d.setDate(d.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  function getBestStreak () {
    var g = loadGame();
    var cal = g.streakCalendar || {};
    var dates = Object.keys(cal).filter(function (k) { return cal[k].correct > 0; }).sort();
    if (dates.length === 0) return 0;
    var best = 1, current = 1;
    for (var i = 1; i < dates.length; i++) {
      var prev = new Date(dates[i - 1]);
      var curr = new Date(dates[i]);
      var diff = (curr - prev) / (24 * 60 * 60 * 1000);
      if (diff === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }

  function formatDate (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function init () {
    var panel = document.getElementById('tool-streak');
    if (!panel) return;

    var g = loadGame();
    var cal = g.streakCalendar || {};
    var streak = getStreak();
    var best = getBestStreak();
    var totalDays = Object.keys(cal).filter(function (k) { return cal[k].correct > 0; }).length;

    // Build 91-day heatmap (13 weeks)
    var days = [];
    var d = new Date();
    d.setDate(d.getDate() - 90);
    for (var i = 0; i < 91; i++) {
      var key = formatDate(d);
      var data = cal[key] || null;
      days.push({ date: key, data: data, dow: d.getDay() });
      d.setDate(d.getDate() + 1);
    }

    // Find max XP for color scaling
    var maxXP = 1;
    days.forEach(function (day) {
      if (day.data && day.data.xp > maxXP) maxXP = day.data.xp;
    });

    var cellsHTML = days.map(function (day) {
      var level = 0;
      if (day.data && day.data.xp > 0) {
        var pct = day.data.xp / maxXP;
        level = pct > 0.75 ? 4 : pct > 0.5 ? 3 : pct > 0.25 ? 2 : 1;
      }
      var tooltip = day.date + (day.data ? ': ' + day.data.correct + ' correct, ' + day.data.xp + ' XP' : ': No activity');
      return '<div class="streak-cell streak-level-' + level + '" title="' + tooltip + '"></div>';
    }).join('');

    var dayLabels = '<div class="streak-day-labels">'
      + '<span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>'
      + '</div>';

    panel.innerHTML = '<div class="streak-view">'
      + '<div class="streak-header">'
      + '  <h2 class="streak-title">Study Streak</h2>'
      + '</div>'
      + '<div class="streak-stats">'
      + '  <div class="streak-stat streak-current">'
      + '    <div class="streak-stat-val" id="streakCurrentNum">' + streak + '</div>'
      + '    <div class="streak-stat-lbl">Current Streak</div>'
      + '  </div>'
      + '  <div class="streak-stat">'
      + '    <div class="streak-stat-val">' + best + '</div>'
      + '    <div class="streak-stat-lbl">Best Streak</div>'
      + '  </div>'
      + '  <div class="streak-stat">'
      + '    <div class="streak-stat-val">' + totalDays + '</div>'
      + '    <div class="streak-stat-lbl">Days Studied</div>'
      + '  </div>'
      + '</div>'
      + '<div class="streak-heatmap-wrap">'
      + '  <div class="streak-heatmap-label">Last 91 Days</div>'
      + '  <div class="streak-heatmap-row">'
      + dayLabels
      + '    <div class="streak-heatmap">' + cellsHTML + '</div>'
      + '  </div>'
      + '  <div class="streak-legend">'
      + '    <span>Less</span>'
      + '    <div class="streak-cell streak-level-0"></div>'
      + '    <div class="streak-cell streak-level-1"></div>'
      + '    <div class="streak-cell streak-level-2"></div>'
      + '    <div class="streak-cell streak-level-3"></div>'
      + '    <div class="streak-cell streak-level-4"></div>'
      + '    <span>More</span>'
      + '  </div>'
      + '</div>'
      + '</div>';

    // Fire effect on streak number if streak >= 3
    if (streak >= 3 && typeof Effects !== 'undefined') {
      var numEl = document.getElementById('streakCurrentNum');
      if (numEl) setTimeout(function () { Effects.streakFire(numEl); }, 500);
    }
  }

  return { init: init, recordActivity: recordActivity, getStreak: getStreak, todayKey: todayKey };
})();
