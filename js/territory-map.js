/* ═══════════════════════════════════════════════════════════
   TerritoryMap — Risk-style SVG territory map
   Renders 36 CCNA sections as organic polygon "countries"
   grouped into 6 continental topic clusters.
   ═══════════════════════════════════════════════════════════ */
window.TerritoryMap = (function () {

  // ── Canvas & Grid constants ──────────────────────────────
  const CW = 1080, CH = 870;          // SVG canvas size
  const ROWS = 6, COLS = 6;           // territory grid
  const PTS_R = 7, PTS_C = 7;         // grid point array (one more in each dir)
  const MX = 28, MY = 28;             // outer margin
  const CELL_W = (CW - MX * 2) / COLS;  // ~170.7
  const CELL_H = (CH - MY * 2) / ROWS;  // ~135.7
  const JITTER  = 26;                 // max pixel perturbation of interior points

  // ── Seeded deterministic RNG ─────────────────────────────
  function mkRng (seed) {
    let s = seed >>> 0;
    return function () {
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
      s ^= s >>> 16;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // ── Build perturbed grid points (7×7) ───────────────────
  const rng = mkRng(7777);
  const pts = [];
  for (let r = 0; r < PTS_R; r++) {
    for (let c = 0; c < PTS_C; c++) {
      const bx = MX + c * CELL_W, by = MY + r * CELL_H;
      const edge = r === 0 || r === PTS_R - 1 || c === 0 || c === PTS_C - 1;
      const jx = rng(), jy = rng();
      pts.push(edge
        ? { x: bx, y: by }
        : { x: bx + (jx - 0.5) * 2 * JITTER, y: by + (jy - 0.5) * 2 * JITTER });
    }
  }

  function pt (r, c) { return pts[r * PTS_C + c]; }

  // Four corners of a grid cell
  function cellPts (r, c) {
    return [pt(r, c), pt(r, c + 1), pt(r + 1, c + 1), pt(r + 1, c)];
  }
  function cellPolyStr (r, c) {
    return cellPts(r, c).map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  }
  function cellCenter (r, c) {
    const p = cellPts(r, c);
    return { x: p.reduce((s, v) => s + v.x, 0) / 4, y: p.reduce((s, v) => s + v.y, 0) / 4 };
  }

  // ── Continent / section mapping ──────────────────────────
  // Grid layout: 2 continents wide (cols 0-2 | cols 3-5), 3 continents tall
  // Each continent = 2 rows × 3 cols = 6 territories
  function continentOf (r, c) { return Math.floor(r / 2) * 2 + Math.floor(c / 3); }
  function sectionIdx  (r, c) { return continentOf(r, c) * 6 + (r % 2) * 3 + (c % 3); }

  function neighbors (r, c) {
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
  }

  // ── Continent metadata ───────────────────────────────────
  const CONTS = [
    { name: 'OSI Foundations', short: 'FOUNDATIONS', color: [0,   200, 230], sections: '03–08' },
    { name: 'Network Basics',  short: 'NET BASICS',  color: [120, 100, 255], sections: '09–14' },
    { name: 'Routing',         short: 'ROUTING',     color: [0,   210, 130], sections: '15–20' },
    { name: 'Switching',       short: 'SWITCHING',   color: [255, 160, 40],  sections: '21–26' },
    { name: 'Security / WAN',  short: 'SECURITY',    color: [225, 55,  75],  sections: '27–32' },
    { name: 'Advanced Topics', short: 'ADVANCED',    color: [205, 170, 45],  sections: '33–38' },
  ];

  // ── Pre-compute which edges are continent borders ────────
  const contBorderSegs = [], terrBorderSegs = [];
  // Horizontal shared edges (between row r and r+1)
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      const arr = continentOf(r, c) !== continentOf(r + 1, c) ? contBorderSegs : terrBorderSegs;
      arr.push([pt(r + 1, c), pt(r + 1, c + 1)]);
    }
  }
  // Vertical shared edges (between col c and c+1)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const arr = continentOf(r, c) !== continentOf(r, c + 1) ? contBorderSegs : terrBorderSegs;
      arr.push([pt(r, c + 1), pt(r + 1, c + 1)]);
    }
  }

  function seg (p1, p2) {
    return 'x1="' + p1.x.toFixed(1) + '" y1="' + p1.y.toFixed(1) +
           '" x2="' + p2.x.toFixed(1) + '" y2="' + p2.y.toFixed(1) + '"';
  }

  // ── Main render ──────────────────────────────────────────
  function render (container, sections, getStatus, getMastery, getBeatToday, focusSec, onBattle, onGuide) {

    // ── Build SVG innards ──────────────────────────────────
    let polys = '', labels = '', terrLines = '', contLines = '', contWatermarks = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx  = sectionIdx(r, c);
        const sec  = sections[idx];
        if (!sec) continue;

        const cont       = continentOf(r, c);
        const meta       = CONTS[cont];
        const [cr, cg, cb] = meta.color;
        const status     = getStatus(sec.id);
        const mInfo      = getMastery(sec.id);
        const mastery    = Math.round((mInfo.avgMastery / 5) * 100);
        const beaten     = getBeatToday(sec.id);
        const isFocus    = focusSec === sec.id;
        const polyStr    = cellPolyStr(r, c);
        const center     = cellCenter(r, c);

        // Fill based on status
        let fill, fillOp;
        if (status === 'conquered') { fill = `rgb(${cr},${cg},${cb})`; fillOp = beaten ? '0.85' : '0.7'; }
        else if (status === 'in-progress') { fill = `rgb(${cr},${cg},${cb})`; fillOp = '0.22'; }
        else if (status === 'decayed')     { fill = 'rgb(240,155,40)';       fillOp = '0.28'; }
        else                               { fill = `rgb(${cr},${cg},${cb})`; fillOp = '0.07'; }

        const classes = 'terr-poly terr-' + status + (isFocus ? ' terr-focus' : '') + (beaten ? ' terr-beaten' : '');

        polys += '<polygon class="' + classes + '" data-r="' + r + '" data-c="' + c +
          '" data-sec="' + sec.id + '" points="' + polyStr +
          '" fill="' + fill + '" fill-opacity="' + fillOp + '" stroke="none"/>';

        // Territory label: section ID + short name
        const shortName = sec.name.length > 17 ? sec.name.slice(0, 15) + '…' : sec.name;
        const textColor = status === 'conquered' ? '#fff' : 'rgba(255,255,255,0.7)';
        const numSize   = status === 'conquered' ? '13' : '11';

        labels += '<text class="tl-num" x="' + center.x.toFixed(1) + '" y="' + (center.y - 7).toFixed(1) +
          '" fill="' + textColor + '" font-size="' + numSize + '">' + sec.id + '</text>';
        labels += '<text class="tl-name" x="' + center.x.toFixed(1) + '" y="' + (center.y + 7).toFixed(1) +
          '" fill="rgba(255,255,255,0.5)">' + shortName + '</text>';
        if (mastery > 0 && status !== 'conquered') {
          labels += '<text class="tl-mastery" x="' + center.x.toFixed(1) + '" y="' + (center.y + 19).toFixed(1) +
            '" fill="rgba(255,255,255,0.35)">' + mastery + '%</text>';
        }
        if (status === 'conquered') {
          labels += '<text class="tl-check" x="' + (center.x + 28).toFixed(1) + '" y="' + (center.y - 22).toFixed(1) +
            '" fill="rgb(' + cr + ',' + cg + ',' + cb + ')" font-size="14">\u2713</text>';
        }
        if (isFocus) {
          labels += '<text class="tl-pin" x="' + center.x.toFixed(1) + '" y="' + (center.y - 26).toFixed(1) +
            '" fill="#fbbf24" font-size="14">\u2605</text>';
        }
      }
    }

    // Border lines
    terrBorderSegs.forEach(([p1, p2]) => { terrLines += '<line ' + seg(p1, p2) + ' class="terr-border"/>'; });
    contBorderSegs.forEach(([p1, p2]) => {
      contLines += '<line ' + seg(p1, p2) + ' class="cont-border-glow"/>';
      contLines += '<line ' + seg(p1, p2) + ' class="cont-border"/>';
    });

    // Continent watermark labels
    for (let cr2 = 0; cr2 < 3; cr2++) {
      for (let cc2 = 0; cc2 < 2; cc2++) {
        const cont = cr2 * 2 + cc2;
        const meta = CONTS[cont];
        const [r2, g2, b2] = meta.color;
        const cx = [], cy = [];
        for (let lr = 0; lr < 2; lr++) for (let lc = 0; lc < 3; lc++) {
          const ctr = cellCenter(cr2 * 2 + lr, cc2 * 3 + lc);
          cx.push(ctr.x); cy.push(ctr.y);
        }
        const wmx = cx.reduce((a, b) => a + b, 0) / cx.length;
        const wmy = cy.reduce((a, b) => a + b, 0) / cy.length;
        contWatermarks += '<text class="cont-wm" x="' + wmx.toFixed(1) + '" y="' + wmy.toFixed(1) +
          '" fill="rgba(' + r2 + ',' + g2 + ',' + b2 + ',0.18)">' + meta.short + '</text>';
      }
    }

    const svgInner = `
      <defs>
        <radialGradient id="tmOcean" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stop-color="#1e2840"/>
          <stop offset="100%" stop-color="#0b0f1c"/>
        </radialGradient>
        <pattern id="tmGrid" width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="18" cy="18" r="0.8" fill="rgba(255,255,255,0.055)"/>
        </pattern>
        <filter id="tmGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tmShadow">
          <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.7)"/>
        </filter>
      </defs>
      <rect width="${CW}" height="${CH}" fill="url(#tmOcean)"/>
      <rect width="${CW}" height="${CH}" fill="url(#tmGrid)"/>
      <g class="tm-territories" id="tmTerritories" filter="url(#tmShadow)">${polys}</g>
      <g class="tm-terr-borders">${terrLines}</g>
      <g class="tm-cont-borders">${contLines}</g>
      <g class="tm-watermarks" style="pointer-events:none">${contWatermarks}</g>
      <g class="tm-labels" style="pointer-events:none">${labels}</g>
      <g id="tmOverlay" style="pointer-events:none"></g>
    `;

    container.innerHTML = `
      <div class="tmap-outer" id="tmapOuter">
        <div class="tmap-scene" id="tmapScene">
          <div class="tmap-pan" id="tmapPan">
            <svg id="tmapSvg" class="tmap-svg"
                 viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}"
                 xmlns="http://www.w3.org/2000/svg">
              ${svgInner}
            </svg>
          </div>
        </div>
        <div class="tmap-controls" id="tmapControls">
          <button class="tmap-btn" id="tmZoomIn"  title="Zoom In">+</button>
          <button class="tmap-btn" id="tmZoomOut" title="Zoom Out">−</button>
          <button class="tmap-btn" id="tmReset"   title="Reset">⌂</button>
          <button class="tmap-btn" id="tmFS"      title="Fullscreen">⛶</button>
        </div>
        <div class="tmap-legend" id="tmapLegend">
          ${CONTS.map((m, i) => {
            const [r, g, b] = m.color;
            return '<div class="tmap-leg-item"><span class="tmap-leg-dot" style="background:rgb(' + r + ',' + g + ',' + b + ')"></span>'
              + '<span>' + m.name + ' (' + m.sections + ')</span></div>';
          }).join('')}
        </div>
      </div>
    `;

    // ── Pan / Zoom ─────────────────────────────────────────
    let panX = 0, panY = 0, zoom = 1, dragging = false, sx = 0, sy = 0;
    const pan = document.getElementById('tmapPan');
    const outer = document.getElementById('tmapOuter');

    function applyXform () {
      pan.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
    }

    outer.addEventListener('mousedown', e => {
      if (e.target.closest('.tmap-controls') || e.target.closest('.tmap-legend')) return;
      dragging = true; sx = e.clientX - panX; sy = e.clientY - panY;
      outer.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panX = e.clientX - sx; panY = e.clientY - sy; applyXform();
    });
    document.addEventListener('mouseup', () => { dragging = false; outer.style.cursor = ''; });

    outer.addEventListener('wheel', e => {
      e.preventDefault();
      zoom = Math.max(0.35, Math.min(3.5, zoom * (e.deltaY > 0 ? 0.92 : 1.09)));
      applyXform();
    }, { passive: false });

    // Touch
    let td = 0;
    outer.addEventListener('touchstart', e => {
      if (e.touches.length === 1) { dragging = true; sx = e.touches[0].clientX - panX; sy = e.touches[0].clientY - panY; }
      else if (e.touches.length === 2) td = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    });
    outer.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && dragging) { panX = e.touches[0].clientX - sx; panY = e.touches[0].clientY - sy; applyXform(); }
      else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoom = Math.max(0.35, Math.min(3.5, zoom * (d / td))); td = d; applyXform();
      }
    }, { passive: false });
    outer.addEventListener('touchend', () => { dragging = false; });

    // Buttons
    document.getElementById('tmZoomIn').onclick  = () => { zoom = Math.min(3.5, zoom * 1.2); applyXform(); };
    document.getElementById('tmZoomOut').onclick = () => { zoom = Math.max(0.35, zoom * 0.82); applyXform(); };
    document.getElementById('tmReset').onclick   = () => { panX = 0; panY = 0; zoom = 1; applyXform(); };
    document.getElementById('tmFS').onclick      = () => {
      outer.classList.toggle('tmap-fullscreen');
      document.getElementById('tmFS').textContent = outer.classList.contains('tmap-fullscreen') ? '✕' : '⛶';
    };

    // ── Hover: highlight territory + glow neighbors ────────
    const overlay   = document.getElementById('tmOverlay');
    const terrGroup = document.getElementById('tmTerritories');
    let hovered     = null;

    terrGroup.addEventListener('mouseover', e => {
      const poly = e.target.closest('.terr-poly');
      if (!poly) return;
      const r = +poly.dataset.r, c = +poly.dataset.c;
      if (hovered && hovered[0] === r && hovered[1] === c) return;
      hovered = [r, c];

      let html = '';
      // Hovered territory highlight
      html += '<polygon points="' + cellPolyStr(r, c) + '" fill="rgba(255,255,255,0.14)" stroke="white" stroke-width="2.5"/>';

      // Neighbor glow
      neighbors(r, c).forEach(([nr, nc]) => {
        html += '<polygon points="' + cellPolyStr(nr, nc) + '" fill="rgba(255,215,0,0.04)" stroke="rgba(255,215,0,0.65)" stroke-width="1.8" stroke-dasharray="5 4"/>';
      });

      // Tooltip
      const idx  = sectionIdx(r, c);
      const sec  = sections[idx];
      if (sec) {
        const status  = getStatus(sec.id);
        const mInfo   = getMastery(sec.id);
        const mPct    = Math.round((mInfo.avgMastery / 5) * 100);
        const cont    = continentOf(r, c);
        const meta    = CONTS[cont];
        const [cr, cg, cb] = meta.color;
        const center  = cellCenter(r, c);
        const tx      = center.x > CW * 0.55 ? center.x - 195 : center.x + 16;
        const ty      = center.y > CH * 0.72  ? center.y - 88  : center.y - 10;
        const statusLabel = status === 'conquered' ? 'Conquered \u2713' : status === 'in-progress' ? 'In Progress' : status === 'decayed' ? 'Decayed \u26a0' : 'Unconquered';
        html += '<rect x="' + tx + '" y="' + ty + '" width="178" height="72" rx="9" fill="rgba(8,12,24,0.93)" stroke="rgba(' + cr + ',' + cg + ',' + cb + ',0.5)" stroke-width="1.5"/>';
        html += '<text x="' + (tx + 89) + '" y="' + (ty + 17) + '" text-anchor="middle" fill="rgba(' + cr + ',' + cg + ',' + cb + ',1)" font-size="10" font-weight="700" font-family="monospace">' + meta.short + ' \u00b7 \u00a7' + sec.id + '</text>';
        html += '<text x="' + (tx + 89) + '" y="' + (ty + 33) + '" text-anchor="middle" fill="white" font-size="11" font-weight="600" font-family="sans-serif">' + (sec.name.length > 23 ? sec.name.slice(0, 21) + '\u2026' : sec.name) + '</text>';
        html += '<text x="' + (tx + 89) + '" y="' + (ty + 49) + '" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9.5" font-family="monospace">' + mPct + '% mastery \u00b7 ' + statusLabel + '</text>';
        html += '<text x="' + (tx + 89) + '" y="' + (ty + 64) + '" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="8.5" font-family="monospace">Click to battle \u2192</text>';
      }
      overlay.innerHTML = html;
    });

    terrGroup.addEventListener('mouseleave', () => { hovered = null; overlay.innerHTML = ''; });

    // ── Click = battle ─────────────────────────────────────
    terrGroup.addEventListener('click', e => {
      const poly = e.target.closest('.terr-poly');
      if (!poly) return;
      const sec = sections[sectionIdx(+poly.dataset.r, +poly.dataset.c)];
      if (sec && onBattle) onBattle(sec.id);
    });
  }

  return { render };

})();
