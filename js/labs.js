// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Practice Labs (Drag-and-Drop)
//  Order exercises and matching exercises using HTML5 Drag and Drop
// ─────────────────────────────────────────────────────────────────────────────

var PracticeLabs = (function () {
  'use strict';

  var STORAGE_KEY = 'ccna_anki_game';

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
    var panel = document.getElementById('tool-labs');
    if (!panel) return;
    renderList(panel);
  }

  function renderList (panel) {
    if (typeof LAB_EXERCISES === 'undefined') { panel.innerHTML = '<p>Loading...</p>'; return; }

    var html = '<div class="lab-list">'
      + '<h2 class="lab-title">\uD83E\uDDEA Practice Labs</h2>'
      + '<p class="lab-subtitle">Drag-and-drop exercises to test your hands-on knowledge.</p>'
      + '<div class="lab-grid">';

    LAB_EXERCISES.forEach(function (lab) {
      var typeLabel = lab.type === 'order' ? 'Ordering' : 'Matching';
      html += '<button class="lab-card" data-lab="' + lab.id + '">'
        + '<div class="lab-card-type">' + typeLabel + '</div>'
        + '<div class="lab-card-title">' + esc(lab.title) + '</div>'
        + '</button>';
    });

    html += '</div></div>';
    panel.innerHTML = html;

    panel.querySelectorAll('.lab-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var lab = LAB_EXERCISES.find(function (l) { return l.id === card.dataset.lab; });
        if (lab) {
          if (lab.type === 'order') runOrderLab(panel, lab);
          else runMatchLab(panel, lab);
        }
      });
    });
  }

  // ── ORDER LAB ──────────────────────────────────────────
  function runOrderLab (panel, lab) {
    var items = shuffleArray(lab.items);

    function render () {
      var html = '<div class="lab-active">'
        + '<div class="lab-header">'
        + '  <button class="anki-back-btn" id="labBack">\u2190 Back</button>'
        + '  <span class="lab-header-title">' + esc(lab.title) + '</span>'
        + '</div>'
        + '<p class="lab-instruction">' + esc(lab.instruction) + '</p>'
        + '<div class="lab-order-list" id="labOrderList">';

      items.forEach(function (item, i) {
        html += '<div class="lab-order-item" draggable="true" data-idx="' + i + '">'
          + '<span class="lab-drag-handle">\u2630</span>'
          + '<span>' + esc(item) + '</span>'
          + '</div>';
      });

      html += '</div>'
        + '<button class="anki-btn anki-btn-accent" id="labCheckBtn">Check Answer</button>'
        + '</div>';

      panel.innerHTML = html;

      // Drag and drop
      var list = document.getElementById('labOrderList');
      var dragItem = null;

      list.querySelectorAll('.lab-order-item').forEach(function (el) {
        el.addEventListener('dragstart', function (e) {
          dragItem = el;
          el.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });
        el.addEventListener('dragend', function () {
          el.classList.remove('dragging');
          dragItem = null;
        });
        el.addEventListener('dragover', function (e) {
          e.preventDefault();
          if (dragItem && dragItem !== el) {
            var rect = el.getBoundingClientRect();
            var midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
              list.insertBefore(dragItem, el);
            } else {
              list.insertBefore(dragItem, el.nextSibling);
            }
          }
        });
      });

      document.getElementById('labBack').addEventListener('click', function () { renderList(panel); });
      document.getElementById('labCheckBtn').addEventListener('click', function () {
        var currentOrder = [];
        list.querySelectorAll('.lab-order-item span:last-child').forEach(function (s) {
          currentOrder.push(s.textContent);
        });
        items = currentOrder; // sync
        checkOrderAnswer(panel, lab, currentOrder);
      });
    }

    render();
  }

  function checkOrderAnswer (panel, lab, currentOrder) {
    var correct = 0;
    var list = document.getElementById('labOrderList');
    var elems = list.querySelectorAll('.lab-order-item');
    elems.forEach(function (el, i) {
      if (currentOrder[i] === lab.correctOrder[i]) {
        el.classList.add('correct');
        correct++;
      } else {
        el.classList.add('wrong');
      }
    });

    var g = loadGame();
    g.xp = (g.xp || 0) + correct * 5;
    g.coins = (g.coins || 0) + 2;
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();

    var pct = Math.round((correct / lab.correctOrder.length) * 100);
    var resultEl = document.createElement('div');
    resultEl.className = 'lab-result';
    resultEl.innerHTML = '<strong>' + correct + '/' + lab.correctOrder.length + ' correct (' + pct + '%)</strong>';
    var checkBtn = document.getElementById('labCheckBtn');
    checkBtn.parentNode.insertBefore(resultEl, checkBtn.nextSibling);
    checkBtn.disabled = true;
    checkBtn.style.opacity = '0.4';

    if (pct === 100 && typeof Effects !== 'undefined') {
      Effects.confetti({ count: 40, duration: 1500 });
    }
  }

  // ── MATCH LAB ──────────────────────────────────────────
  function runMatchLab (panel, lab) {
    var shuffledRight = shuffleArray(lab.pairs.map(function (p) { return p.right; }));
    var matches = {}; // leftIndex -> rightValue
    var selectedLeft = null;

    function render () {
      var html = '<div class="lab-active">'
        + '<div class="lab-header">'
        + '  <button class="anki-back-btn" id="labBack">\u2190 Back</button>'
        + '  <span class="lab-header-title">' + esc(lab.title) + '</span>'
        + '</div>'
        + '<p class="lab-instruction">' + esc(lab.instruction) + '</p>'
        + '<div class="lab-match-area">'
        + '  <div class="lab-match-left">';

      lab.pairs.forEach(function (p, i) {
        var matched = matches[i] !== undefined;
        var selClass = selectedLeft === i ? ' selected' : '';
        html += '<div class="lab-match-item left' + selClass + (matched ? ' matched' : '') + '" data-li="' + i + '">'
          + esc(p.left)
          + (matched ? '<span class="lab-match-tag">' + esc(matches[i]) + '</span>' : '')
          + '</div>';
      });

      html += '</div><div class="lab-match-right">';

      var usedRight = {};
      for (var k in matches) usedRight[matches[k]] = true;

      shuffledRight.forEach(function (r, i) {
        var used = usedRight[r] ? ' used' : '';
        html += '<div class="lab-match-item right' + used + '" data-ri="' + i + '" data-rv="' + esc(r) + '">' + esc(r) + '</div>';
      });

      html += '</div></div>'
        + '<div class="lab-match-actions">'
        + '  <button class="anki-btn anki-btn-secondary" id="labResetBtn">Reset</button>'
        + '  <button class="anki-btn anki-btn-accent" id="labCheckBtn"' + (Object.keys(matches).length < lab.pairs.length ? ' disabled style="opacity:0.4"' : '') + '>Check Answer</button>'
        + '</div>'
        + '</div>';

      panel.innerHTML = html;

      document.getElementById('labBack').addEventListener('click', function () { renderList(panel); });
      document.getElementById('labResetBtn').addEventListener('click', function () {
        matches = {};
        selectedLeft = null;
        render();
      });
      document.getElementById('labCheckBtn').addEventListener('click', function () {
        checkMatchAnswer(panel, lab, matches);
      });

      // Click handlers
      panel.querySelectorAll('.lab-match-item.left').forEach(function (el) {
        el.addEventListener('click', function () {
          var idx = parseInt(el.dataset.li, 10);
          if (matches[idx] !== undefined) {
            delete matches[idx];
            selectedLeft = null;
          } else {
            selectedLeft = idx;
          }
          render();
        });
      });

      panel.querySelectorAll('.lab-match-item.right:not(.used)').forEach(function (el) {
        el.addEventListener('click', function () {
          if (selectedLeft === null) return;
          matches[selectedLeft] = el.dataset.rv;
          selectedLeft = null;
          render();
        });
      });
    }

    render();
  }

  function checkMatchAnswer (panel, lab, matches) {
    var correct = 0;
    lab.pairs.forEach(function (p, i) {
      if (matches[i] === p.right) correct++;
    });

    var g = loadGame();
    g.xp = (g.xp || 0) + correct * 5;
    g.coins = (g.coins || 0) + 2;
    saveGame(g);
    if (typeof CoinSystem !== 'undefined') CoinSystem.updateTopbar();

    // Show results
    var items = panel.querySelectorAll('.lab-match-item.left');
    items.forEach(function (el) {
      var idx = parseInt(el.dataset.li, 10);
      if (matches[idx] === lab.pairs[idx].right) {
        el.classList.add('correct');
      } else {
        el.classList.add('wrong');
      }
    });

    var pct = Math.round((correct / lab.pairs.length) * 100);
    var checkBtn = document.getElementById('labCheckBtn');
    var resultEl = document.createElement('div');
    resultEl.className = 'lab-result';
    resultEl.innerHTML = '<strong>' + correct + '/' + lab.pairs.length + ' correct (' + pct + '%)</strong>';
    checkBtn.parentNode.insertBefore(resultEl, checkBtn.nextSibling);
    checkBtn.disabled = true;
    checkBtn.style.opacity = '0.4';

    if (pct === 100 && typeof Effects !== 'undefined') {
      Effects.confetti({ count: 40, duration: 1500 });
    }
  }

  return { init: init };
})();
