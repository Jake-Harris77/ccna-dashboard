// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Visual Effects Module
//  Confetti, level-up, streak fire, coin burst, mastery sparkle
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── Confetti burst (boss defeat, achievements) ──────────
  function confetti (options) {
    var opts = options || {};
    var count = opts.count || 80;
    var duration = opts.duration || 2500;
    var colors = opts.colors || ['#00c2ff', '#22d47c', '#fbbf24', '#f87171', '#a78bfa', '#ec4899'];

    var canvas = document.createElement('canvas');
    canvas.className = 'effects-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 15,
        gravity: 0.3 + Math.random() * 0.2,
        opacity: 1,
      });
    }

    var start = performance.now();
    function frame (now) {
      var elapsed = now - start;
      if (elapsed > duration) {
        canvas.remove();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var fadeStart = duration * 0.6;
      particles.forEach(function (p) {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rot += p.rotV;
        p.vx *= 0.99;
        p.opacity = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / (duration - fadeStart) : 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ── Level-up overlay ────────────────────────────────────
  function levelUp (level) {
    var overlay = document.createElement('div');
    overlay.className = 'effects-level-up';
    overlay.innerHTML =
      '<div class="effects-level-up-inner">' +
        '<div class="effects-level-up-label">LEVEL UP!</div>' +
        '<div class="effects-level-up-num">' + level + '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    // Trigger confetti with it
    setTimeout(function () { confetti({ count: 50, duration: 2000 }); }, 200);

    setTimeout(function () {
      overlay.classList.add('fade-out');
      setTimeout(function () { overlay.remove(); }, 500);
    }, 2000);
  }

  // ── Streak fire particles ───────────────────────────────
  function streakFire (targetEl) {
    if (!targetEl) return;
    var rect = targetEl.getBoundingClientRect();
    var count = 12;

    for (var i = 0; i < count; i++) {
      var spark = document.createElement('div');
      spark.className = 'effects-spark';
      spark.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 30) + 'px';
      spark.style.top = (rect.top + (Math.random() - 0.5) * 10) + 'px';
      spark.style.setProperty('--drift', ((Math.random() - 0.5) * 40) + 'px');
      spark.style.animationDelay = (Math.random() * 200) + 'ms';
      document.body.appendChild(spark);
      (function (s) {
        setTimeout(function () { s.remove(); }, 1000);
      })(spark);
    }
  }

  // ── Coin burst toward topbar ────────────────────────────
  function coinBurst (startX, startY) {
    var coinEl = document.querySelector('.topbar-coins');
    if (!coinEl) return;
    var targetRect = coinEl.getBoundingClientRect();
    var count = 5;

    for (var i = 0; i < count; i++) {
      var coin = document.createElement('div');
      coin.className = 'effects-coin';
      coin.textContent = '$';
      coin.style.left = (startX + (Math.random() - 0.5) * 40) + 'px';
      coin.style.top = (startY + (Math.random() - 0.5) * 40) + 'px';
      coin.style.setProperty('--tx', (targetRect.left + targetRect.width / 2 - startX) + 'px');
      coin.style.setProperty('--ty', (targetRect.top + targetRect.height / 2 - startY) + 'px');
      coin.style.animationDelay = (i * 80) + 'ms';
      document.body.appendChild(coin);
      (function (c) {
        setTimeout(function () { c.remove(); }, 1000);
      })(coin);
    }
  }

  // ── Mastery up sparkle ──────────────────────────────────
  function masteryUp (targetEl) {
    if (!targetEl) return;
    var rect = targetEl.getBoundingClientRect();
    var count = 8;

    for (var i = 0; i < count; i++) {
      var spark = document.createElement('div');
      spark.className = 'effects-mastery-spark';
      var angle = (i / count) * Math.PI * 2;
      spark.style.left = (rect.left + rect.width / 2) + 'px';
      spark.style.top = (rect.top + rect.height / 2) + 'px';
      spark.style.setProperty('--dx', (Math.cos(angle) * 30) + 'px');
      spark.style.setProperty('--dy', (Math.sin(angle) * 30) + 'px');
      document.body.appendChild(spark);
      (function (s) {
        setTimeout(function () { s.remove(); }, 800);
      })(spark);
    }
  }

  // ── Correct answer flash ────────────────────────────────
  function correctFlash () {
    var flash = document.createElement('div');
    flash.className = 'effects-correct-flash';
    document.body.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 600);
  }

  // ── Public API ──────────────────────────────────────────
  window.Effects = {
    confetti: confetti,
    levelUp: levelUp,
    streakFire: streakFire,
    coinBurst: coinBurst,
    masteryUp: masteryUp,
    correctFlash: correctFlash,
  };

})();
