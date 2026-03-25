/* ═══════════════════════════════════════════════════════════
   TerritoryMap — Risk-style SVG campaign map
   v2: 13×13 grid for 8-vertex organic territories,
       Pointer Events API for smooth drag, gradient fills,
       animated glows, vignette atmosphere.
   ═══════════════════════════════════════════════════════════ */
window.TerritoryMap = (function () {

  // ── Canvas & grid constants ──────────────────────────────
  const CW = 1080, CH = 870;
  const ROWS = 6, COLS = 6;
  // 13×13 point grid: 2 points per cell edge (corners + midpoints)
  const PTS_R = 13, PTS_C = 13;
  const MX = 30, MY = 30;
  const CELL_W = (CW - MX * 2) / COLS;
  const CELL_H = (CH - MY * 2) / ROWS;

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

  // ── Build 13×13 perturbed point grid ────────────────────
  // Even indices = cell corners, odd = edge midpoints
  const rng = mkRng(31337);
  const pts = [];
  for (let r = 0; r < PTS_R; r++) {
    for (let c = 0; c < PTS_C; c++) {
      const bx = MX + (c / 2) * CELL_W;
      const by = MY + (r / 2) * CELL_H;
      const onEdge = r === 0 || r === PTS_R - 1 || c === 0 || c === PTS_C - 1;
      const jx = rng(), jy = rng();
      // Midpoints (odd index) get more jitter = wigglier borders
      const jitter = (r % 2 === 1 || c % 2 === 1) ? 32 : 16;
      pts.push(onEdge
        ? { x: bx, y: by }
        : { x: bx + (jx - 0.5) * 2 * jitter, y: by + (jy - 0.5) * 2 * jitter });
    }
  }
  function pt (r, c) { return pts[r * PTS_C + c]; }

  // 8-vertex polygon for a grid cell: TL → T-mid → TR → R-mid → BR → B-mid → BL → L-mid
  function cellPts (r, c) {
    const R = 2 * r, C = 2 * c;
    return [
      pt(R,   C),   pt(R,   C+1), pt(R,   C+2),
      pt(R+1, C+2), pt(R+2, C+2), pt(R+2, C+1),
      pt(R+2, C),   pt(R+1, C),
    ];
  }
  function cellPolyStr (r, c) {
    return cellPts(r, c).map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  }
  function cellCenter (r, c) {
    const p = cellPts(r, c);
    return { x: p.reduce((s, v) => s + v.x, 0) / p.length,
             y: p.reduce((s, v) => s + v.y, 0) / p.length };
  }

  // ── Continent / section mapping ──────────────────────────
  // 2 continents wide (cols 0-2 | 3-5), 3 continents tall
  // Each = 2 rows × 3 cols = 6 sections
  function continentOf (r, c) { return Math.floor(r / 2) * 2 + Math.floor(c / 3); }
  function sectionIdx  (r, c) { return continentOf(r, c) * 6 + (r % 2) * 3 + (c % 3); }
  function neighbors   (r, c) {
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      .filter(([nr,nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
  }

  // ── Continent metadata ───────────────────────────────────
  const CONTS = [
    { name: 'OSI Foundations', label: 'FOUNDATIONS', color: [0,   210, 240],  dark: [0,   100, 130] },
    { name: 'Network Basics',  label: 'NET BASICS',  color: [130, 110, 255],  dark: [70,  50,  160] },
    { name: 'Routing',         label: 'ROUTING',     color: [0,   220, 140],  dark: [0,   110, 70]  },
    { name: 'Switching',       label: 'SWITCHING',   color: [255, 165, 40],   dark: [160, 90,  10]  },
    { name: 'Security / WAN',  label: 'SECURITY',    color: [230, 60,  80],   dark: [120, 20,  40]  },
    { name: 'Advanced Topics', label: 'ADVANCED',    color: [210, 175, 50],   dark: [120, 100, 20]  },
  ];

  // ── Border segments (3-point polylines for organic look) ─
  const contBorders = [], terrBorders = [];
  for (let r = 0; r < ROWS - 1; r++) {        // horizontal shared edges
    for (let c = 0; c < COLS; c++) {
      const arr = continentOf(r,c) !== continentOf(r+1,c) ? contBorders : terrBorders;
      arr.push([pt(2*r+2, 2*c), pt(2*r+2, 2*c+1), pt(2*r+2, 2*c+2)]);
    }
  }
  for (let r = 0; r < ROWS; r++) {             // vertical shared edges
    for (let c = 0; c < COLS - 1; c++) {
      const arr = continentOf(r,c) !== continentOf(r,c+1) ? contBorders : terrBorders;
      arr.push([pt(2*r, 2*c+2), pt(2*r+1, 2*c+2), pt(2*r+2, 2*c+2)]);
    }
  }
  function pl (pts3) {
    return pts3.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  }

  // ── Main render ──────────────────────────────────────────
  function render (container, sections, getStatus, getMastery, getBeatToday, focusSec, onBattle) {

    // SVG gradient defs (one per continent, conquered + unconquered shades)
    let defs = `
      <radialGradient id="tmOcean" cx="45%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#1c2540"/>
        <stop offset="100%" stop-color="#090c18"/>
      </radialGradient>
      <pattern id="tmDots" width="34" height="34" patternUnits="userSpaceOnUse">
        <circle cx="17" cy="17" r="0.7" fill="rgba(255,255,255,0.06)"/>
      </pattern>
      <radialGradient id="tmVignette" cx="50%" cy="50%" r="70%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
      </radialGradient>`;

    CONTS.forEach((m, i) => {
      const [r,g,b] = m.color, [dr,dg,db] = m.dark;
      defs += `
        <linearGradient id="gFill${i}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="rgb(${dr},${dg},${db})" stop-opacity="0.65"/>
        </linearGradient>
        <linearGradient id="gProg${i}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="rgb(${dr},${dg},${db})" stop-opacity="0.18"/>
        </linearGradient>
        <linearGradient id="gDim${i}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="rgb(${dr},${dg},${db})" stop-opacity="0.06"/>
        </linearGradient>`;
    });
    defs += `<filter id="tmBlur2"><feGaussianBlur stdDeviation="2"/></filter>
      <filter id="tmBlur6"><feGaussianBlur stdDeviation="6"/></filter>`;

    // Territory polygons
    let polys = '', labels = '', terrLines = '', contLines = '', watermarks = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx    = sectionIdx(r, c);
        const sec    = sections[idx];
        if (!sec) continue;
        const cont   = continentOf(r, c);
        const meta   = CONTS[cont];
        const [cr, cg, cb] = meta.color;
        const status = getStatus(sec.id);
        const mInfo  = getMastery(sec.id);
        const mPct   = Math.round((mInfo.avgMastery / 5) * 100);
        const beaten = getBeatToday(sec.id);
        const isFocus = focusSec === sec.id;
        const poly   = cellPolyStr(r, c);
        const cen    = cellCenter(r, c);

        // Pick fill
        let fill;
        if (status === 'conquered')    fill = 'url(#gFill' + cont + ')';
        else if (status === 'in-progress') fill = 'url(#gProg' + cont + ')';
        else if (status === 'decayed') fill = 'rgba(240,155,40,0.22)';
        else                           fill = 'url(#gDim' + cont + ')';

        // Glow halo behind conquered territories
        if (status === 'conquered') {
          polys += '<polygon points="' + poly + '" fill="rgb(' + cr + ',' + cg + ',' + cb + ')" opacity="0.18" filter="url(#tmBlur6)"/>';
        }

        const cls = 'terr-poly terr-' + status
          + (isFocus  ? ' terr-focus'  : '')
          + (beaten   ? ' terr-beaten' : '');

        polys += '<polygon class="' + cls + '" data-r="' + r + '" data-c="' + c
          + '" data-sec="' + sec.id + '" points="' + poly + '" fill="' + fill + '" stroke="none"/>';

        // Labels
        const nameShort  = sec.name.length > 15 ? sec.name.slice(0, 13) + '…' : sec.name;
        const numOpacity = status === 'conquered' ? '1' : '0.75';
        const nameColor  = status === 'conquered' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';

        // Section number (big)
        labels += '<text class="tl-num" x="' + cen.x.toFixed(1) + '" y="' + (cen.y - 5).toFixed(1)
          + '" fill="rgba(255,255,255,' + numOpacity + ')" font-size="13">' + sec.id + '</text>';
        // Section name (small)
        labels += '<text class="tl-name" x="' + cen.x.toFixed(1) + '" y="' + (cen.y + 9).toFixed(1)
          + '" fill="' + nameColor + '">' + nameShort + '</text>';
        // Mastery %
        if (mPct > 0) {
          labels += '<text class="tl-mastery" x="' + cen.x.toFixed(1) + '" y="' + (cen.y + 21).toFixed(1)
            + '" fill="rgba(' + cr + ',' + cg + ',' + cb + ',0.7)">' + mPct + '%</text>';
        }
        // Conquered check
        if (status === 'conquered') {
          labels += '<text class="tl-check" x="' + (cen.x + 26).toFixed(1) + '" y="' + (cen.y - 18).toFixed(1)
            + '" fill="rgb(' + cr + ',' + cg + ',' + cb + ')">\u2713</text>';
        }
        // Focus star
        if (isFocus) {
          labels += '<text class="tl-pin" x="' + cen.x.toFixed(1) + '" y="' + (cen.y - 24).toFixed(1)
            + '" fill="#fbbf24">\u2605</text>';
        }
      }
    }

    // Territory borders (thin organic polylines)
    terrBorders.forEach(seg => {
      terrLines += '<polyline class="terr-border" points="' + pl(seg) + '" fill="none"/>';
    });

    // Continent borders (thick + glow)
    contBorders.forEach(seg => {
      const pts3 = pl(seg);
      contLines += '<polyline class="cont-border-glow" points="' + pts3 + '" fill="none"/>';
      contLines += '<polyline class="cont-border"      points="' + pts3 + '" fill="none"/>';
    });

    // Continent watermark labels
    for (let cr2 = 0; cr2 < 3; cr2++) {
      for (let cc2 = 0; cc2 < 2; cc2++) {
        const cont = cr2 * 2 + cc2;
        const meta = CONTS[cont];
        const [r2, g2, b2] = meta.color;
        const cx = [], cy = [];
        for (let lr = 0; lr < 2; lr++) for (let lc = 0; lc < 3; lc++) {
          const ctr = cellCenter(cr2*2+lr, cc2*3+lc);
          cx.push(ctr.x); cy.push(ctr.y);
        }
        const wmx = cx.reduce((a,b)=>a+b,0)/cx.length;
        const wmy = cy.reduce((a,b)=>a+b,0)/cy.length;
        watermarks += '<text class="cont-wm" x="' + wmx.toFixed(1) + '" y="' + wmy.toFixed(1)
          + '" fill="rgba(' + r2 + ',' + g2 + ',' + b2 + ',0.13)">' + meta.label + '</text>';
      }
    }

    const svgInner = `
      <defs>${defs}</defs>
      <rect width="${CW}" height="${CH}" fill="url(#tmOcean)"/>
      <rect width="${CW}" height="${CH}" fill="url(#tmDots)"/>
      <g id="tmTerritories" class="tm-territories">${polys}</g>
      <g class="tm-terr-borders">${terrLines}</g>
      <g class="tm-cont-borders">${contLines}</g>
      <g class="tm-watermarks" style="pointer-events:none">${watermarks}</g>
      <g class="tm-labels" style="pointer-events:none">${labels}</g>
      <rect width="${CW}" height="${CH}" fill="url(#tmVignette)" style="pointer-events:none"/>
      <g id="tmOverlay" style="pointer-events:none"></g>
    `;

    container.innerHTML = `
      <div class="tmap-outer" id="tmapOuter">
        <div class="tmap-pan" id="tmapPan">
          <svg id="tmapSvg" class="tmap-svg"
               viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}"
               xmlns="http://www.w3.org/2000/svg">${svgInner}</svg>
        </div>
        <div class="tmap-controls" id="tmapControls">
          <button class="tmap-btn" id="tmZoomIn"  title="Zoom In">+</button>
          <button class="tmap-btn" id="tmZoomOut" title="Zoom Out">−</button>
          <button class="tmap-btn" id="tmReset"   title="Reset View">⌂</button>
          <button class="tmap-btn" id="tmFS"      title="Fullscreen">⛶</button>
        </div>
        <div class="tmap-legend" id="tmapLegend">
          ${CONTS.map(m => {
            const [r,g,b] = m.color;
            return '<div class="tmap-leg-item"><span class="tmap-leg-dot" style="background:rgb('+r+','+g+','+b+')"></span><span>'+m.name+'</span></div>';
          }).join('')}
        </div>
      </div>`;

    // ── Pointer Events drag / zoom (no text selection) ────
    let panX = 0, panY = 0, zoom = 1;
    let dragging = false, dragMoved = false, sx = 0, sy = 0;
    const pan   = document.getElementById('tmapPan');
    const outer = document.getElementById('tmapOuter');

    function applyXform () {
      pan.style.transform =
        'rotateX(11deg) rotateZ(-1deg) ' +
        'translate(' + panX + 'px,' + panY + 'px) ' +
        'scale(' + zoom + ')';
    }
    applyXform(); // set initial tilt

    outer.addEventListener('pointerdown', e => {
      if (e.target.closest('.tmap-controls') || e.target.closest('.tmap-legend')) return;
      e.preventDefault();
      outer.setPointerCapture(e.pointerId);
      dragging = true; dragMoved = false;
      sx = e.clientX - panX; sy = e.clientY - panY;
      outer.style.cursor = 'grabbing';
    });
    outer.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - sx - panX, dy = e.clientY - sy - panY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
      panX = e.clientX - sx; panY = e.clientY - sy;
      applyXform();
    });
    outer.addEventListener('pointerup', e => {
      dragging = false; outer.style.cursor = '';
      outer.releasePointerCapture(e.pointerId);
    });
    outer.addEventListener('pointercancel', e => {
      dragging = false; outer.style.cursor = '';
      outer.releasePointerCapture(e.pointerId);
    });

    // Wheel zoom (centered on cursor)
    outer.addEventListener('wheel', e => {
      e.preventDefault();
      zoom = Math.max(0.35, Math.min(3.5, zoom * (e.deltaY > 0 ? 0.92 : 1.09)));
      applyXform();
    }, { passive: false });

    // Pinch zoom
    let td = 0;
    outer.addEventListener('touchstart', e => {
      if (e.touches.length === 2)
        td = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    }, { passive: true });
    outer.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        zoom = Math.max(0.35, Math.min(3.5, zoom * (d/td))); td = d; applyXform();
      }
    }, { passive: true });

    // Control buttons
    document.getElementById('tmZoomIn').onclick  = () => { zoom = Math.min(3.5, zoom*1.25); applyXform(); };
    document.getElementById('tmZoomOut').onclick = () => { zoom = Math.max(0.35, zoom*0.8); applyXform(); };
    document.getElementById('tmReset').onclick   = () => { panX=0; panY=0; zoom=1; applyXform(); };
    document.getElementById('tmFS').onclick      = () => {
      outer.classList.toggle('tmap-fullscreen');
      document.getElementById('tmFS').textContent = outer.classList.contains('tmap-fullscreen') ? '✕' : '⛶';
    };

    // ── Hover: highlight + glow neighbors ─────────────────
    const overlay    = document.getElementById('tmOverlay');
    const terrGroup  = document.getElementById('tmTerritories');
    let hovered      = null;

    terrGroup.addEventListener('mouseover', e => {
      const poly = e.target.closest('.terr-poly');
      if (!poly) return;
      const r = +poly.dataset.r, c = +poly.dataset.c;
      if (hovered && hovered[0]===r && hovered[1]===c) return;
      hovered = [r,c];
      let html = '';

      // Bright highlight on hovered territory
      html += '<polygon points="' + cellPolyStr(r,c) + '" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>';

      // Dashed gold glow on adjacent territories
      neighbors(r,c).forEach(([nr,nc]) => {
        const nCont = continentOf(nr,nc);
        const [nr2,ng2,nb2] = CONTS[nCont].color;
        html += '<polygon points="' + cellPolyStr(nr,nc) + '" fill="rgba(255,220,0,0.05)" stroke="rgba(255,210,0,0.7)" stroke-width="1.8" stroke-dasharray="5 4"/>';
      });

      // Tooltip
      const idx    = sectionIdx(r,c);
      const sec    = sections[idx];
      if (sec) {
        const status = getStatus(sec.id);
        const mInfo  = getMastery(sec.id);
        const mPct   = Math.round((mInfo.avgMastery/5)*100);
        const cont   = continentOf(r,c);
        const meta   = CONTS[cont];
        const [cr,cg,cb] = meta.color;
        const cen    = cellCenter(r,c);
        // Position tooltip: avoid right/bottom edges
        const tx = cen.x > CW*0.58 ? cen.x - 202 : cen.x + 18;
        const ty = cen.y > CH*0.70  ? cen.y - 92  : cen.y - 12;
        const stLabel = {conquered:'Conquered ✓', 'in-progress':'In Progress', decayed:'Decayed ⚠', unconquered:'Not yet claimed'}[status] || status;

        html += '<rect x="'+tx+'" y="'+ty+'" width="184" height="80" rx="10" fill="rgba(6,10,22,0.94)" stroke="rgba('+cr+','+cg+','+cb+',0.55)" stroke-width="1.5"/>';
        html += '<text x="'+(tx+92)+'" y="'+(ty+18)+'" text-anchor="middle" fill="rgba('+cr+','+cg+','+cb+',1)" font-size="9.5" font-weight="700" font-family="monospace" letter-spacing="1">'+meta.label+' · §'+sec.id+'</text>';
        html += '<text x="'+(tx+92)+'" y="'+(ty+36)+'" text-anchor="middle" fill="white" font-size="11.5" font-weight="700" font-family="sans-serif">'+(sec.name.length>24?sec.name.slice(0,22)+'…':sec.name)+'</text>';
        html += '<text x="'+(tx+92)+'" y="'+(ty+52)+'" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10" font-family="monospace">'+mPct+'% mastery · '+stLabel+'</text>';
        html += '<text x="'+(tx+92)+'" y="'+(ty+68)+'" text-anchor="middle" fill="rgba('+cr+','+cg+','+cb+',0.65)" font-size="9" font-family="monospace" font-weight="600">[ CLICK TO BATTLE ]</text>';
      }
      overlay.innerHTML = html;
    });

    terrGroup.addEventListener('mouseleave', () => { hovered=null; overlay.innerHTML=''; });

    // ── Click = battle (only if not a drag) ───────────────
    terrGroup.addEventListener('click', e => {
      if (dragMoved) return;
      const poly = e.target.closest('.terr-poly');
      if (!poly) return;
      const sec = sections[sectionIdx(+poly.dataset.r, +poly.dataset.c)];
      if (sec && onBattle) onBattle(sec.id);
    });
  }

  return { render };
})();
