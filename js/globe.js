// ─────────────────────────────────────────────────────────────────────────────
//  CcnaGlobe — Full 3-D WebGL globe (Three.js r128)
//  Equirectangular canvas texture → SphereGeometry
//  Drag-to-rotate with momentum, scroll-to-zoom, click + hover via Raycaster
// ─────────────────────────────────────────────────────────────────────────────
window.CcnaGlobe = (function () {
  'use strict';

  // ── Continent layout on 2048×1024 equirectangular texture ──────────────────
  // 6 continents, each 3 cols × 2 rows = 6 territories
  // Positions chosen so each continent is clearly visible as the globe rotates
  var CONT_LAYOUT = [
    { cx: 330, cy: 255, hw: 240, hh: 175 },   // 0 OSI Foundations  (upper-left)
    { cx: 880, cy: 225, hw: 235, hh: 170 },   // 1 Network Basics   (upper-center)
    { cx: 330, cy: 660, hw: 238, hh: 172 },   // 2 Routing          (lower-left)
    { cx: 880, cy: 660, hw: 238, hh: 172 },   // 3 Switching        (lower-center)
    { cx: 1490, cy: 248, hw: 242, hh: 175 },  // 4 Security & WAN   (upper-right)
    { cx: 1490, cy: 660, hw: 240, hh: 172 },  // 5 Advanced Topics  (lower-right)
  ];

  var CONT_NAMES = [
    'OSI Foundations', 'Network Basics', 'Routing',
    'Switching', 'Security & WAN', 'Advanced Topics'
  ];

  // Per-continent base colors — each continent has its own hue family
  // Order matches CONT_LAYOUT: OSI, Network Basics, Routing, Switching, Security & WAN, Advanced Topics
  var CONT_BASE = [
    '#1a3a6b',  // 0 OSI Foundations   — deep blue
    '#3b1a6b',  // 1 Network Basics     — deep purple
    '#6b3a10',  // 2 Routing            — deep amber/orange
    '#0f5050',  // 3 Switching          — deep teal
    '#6b1528',  // 4 Security & WAN     — deep crimson
    '#0f5535',  // 5 Advanced Topics    — deep emerald
  ];
  var CONT_ACCENT = [
    '#4a8fd4',  // 0 OSI         — bright blue
    '#9a5dd8',  // 1 Network     — bright purple
    '#d4853a',  // 2 Routing     — bright orange
    '#2ab8b8',  // 3 Switching   — bright teal
    '#d44466',  // 4 Security    — bright crimson
    '#2ab87a',  // 5 Advanced    — bright emerald
  ];

  // Status overlays — blended on top of continent color
  var STATUS_STROKE = {
    notStarted:  null,
    inProgress:  'rgba(255,80,80,0.9)',
    conquered:   'rgba(220,170,40,0.9)',
    beaten:      'rgba(50,220,110,0.95)',
  };

  // ── Seeded RNG ─────────────────────────────────────────────────────────────
  function mkRng(seed) {
    var s = seed | 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
  }

  // ── Build organic territory polygons for one continent ─────────────────────
  // Returns array of 6 polygon arrays. Each polygon = [{x,y}, …] (8 vertices)
  function buildContPolys(layout, ci) {
    var cx = layout.cx, cy = layout.cy, hw = layout.hw, hh = layout.hh;
    var rng = mkRng(ci * 7919 + 42);

    // 4×3 point grid for 3-col × 2-row territory divisions
    var GX = 4, GY = 3;
    var pts = [];
    for (var gy = 0; gy < GY; gy++) {
      for (var gx = 0; gx < GX; gx++) {
        var bx = cx - hw + (gx / (GX - 1)) * hw * 2;
        var by = cy - hh + (gy / (GY - 1)) * hh * 2;
        var jx = (gx > 0 && gx < GX - 1) ? (rng() - 0.5) * hw * 0.32 : 0;
        var jy = (gy > 0 && gy < GY - 1) ? (rng() - 0.5) * hh * 0.32 : 0;
        pts.push({ x: bx + jx, y: by + jy });
      }
    }

    function pt(gx, gy) { return pts[gy * GX + gx]; }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

    var polys = [];
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 3; col++) {
        var tl = pt(col, row), tr = pt(col + 1, row);
        var bl = pt(col, row + 1), br = pt(col + 1, row + 1);
        polys.push([
          mid(tl, tr), tr, mid(tr, br), br,
          mid(br, bl), bl, mid(bl, tl), tl,
        ]);
      }
    }
    return polys;
  }

  // Pre-computed polygon data
  var _allPolys = null;
  var _allContIdx = [];

  function ensurePolys() {
    if (_allPolys) return;
    _allPolys = [];
    _allContIdx = [];
    CONT_LAYOUT.forEach(function (layout, ci) {
      buildContPolys(layout, ci).forEach(function (poly) {
        _allPolys.push(poly);
        _allContIdx.push(ci);
      });
    });
  }

  // ── Canvas texture drawing ─────────────────────────────────────────────────
  function drawTexture(canvas, sections, getSectionStatus, getSectionMasteryInfo, wasBossBeatenToday, focusSection) {
    ensurePolys();
    var W = canvas.width, H = canvas.height;
    var ctx = canvas.getContext('2d');

    // Deep ocean gradient
    var ocean = ctx.createLinearGradient(0, 0, 0, H);
    ocean.addColorStop(0,   '#060d1f');
    ocean.addColorStop(0.5, '#091628');
    ocean.addColorStop(1,   '#040b18');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, W, H);

    // Subtle lat/lon grid lines
    ctx.strokeStyle = 'rgba(40,80,160,0.18)';
    ctx.lineWidth = 1;
    for (var li = 1; li < 8; li++) {
      ctx.beginPath(); ctx.moveTo(0, li/8*H); ctx.lineTo(W, li/8*H); ctx.stroke();
    }
    for (var lj = 1; lj < 16; lj++) {
      ctx.beginPath(); ctx.moveTo(lj/16*W, 0); ctx.lineTo(lj/16*W, H); ctx.stroke();
    }

    // Ocean shimmer (random dots)
    var rng0 = mkRng(9999);
    for (var d = 0; d < 300; d++) {
      var dx = rng0() * W, dy = rng0() * H;
      var dr = 1 + rng0() * 3;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,180,255,' + (0.03 + rng0() * 0.06) + ')';
      ctx.fill();
    }

    // ── Draw territories ───────────────────────────────────
    sections.forEach(function (sec, idx) {
      if (!_allPolys || idx >= _allPolys.length) return;
      var poly = _allPolys[idx];
      var ci   = _allContIdx[idx];
      var status  = getSectionStatus(sec.id);
      var beaten  = wasBossBeatenToday(sec.id);
      var isFocus = focusSection && String(sec.id) === String(focusSection);

      // ── Polygon path ──
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (var pi = 1; pi < poly.length; pi++) ctx.lineTo(poly[pi].x, poly[pi].y);
      ctx.closePath();

      // ── Fill: continent base color + status overlay ──
      var base   = CONT_BASE[ci]  || '#2a3450';
      var accent = CONT_ACCENT[ci] || '#4a6aaa';
      var bounds = polyBounds(poly);

      // Status shifts the brightness/tint
      var topColor, botColor;
      if (beaten) {
        topColor = '#1a7a40'; botColor = '#0d4422';
      } else if (status === 'conquered' || status === 'decayed') {
        topColor = '#6a5010'; botColor = '#3a2c08';
      } else if (status === 'in-progress') {
        topColor = '#7a2020'; botColor = '#3a0f0f';
      } else {
        // notStarted — use continent color, top = lightened accent, bot = base
        topColor = accent; botColor = base;
      }

      var grad = ctx.createLinearGradient(bounds.x1, bounds.y1, bounds.x1, bounds.y2);
      grad.addColorStop(0,   topColor);
      grad.addColorStop(0.5, blendHex(topColor, botColor, 0.45));
      grad.addColorStop(1,   botColor);
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Inner highlight (top edge shine) ──
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (var pi2 = 1; pi2 < poly.length; pi2++) ctx.lineTo(poly[pi2].x, poly[pi2].y);
      ctx.closePath();
      var shine = ctx.createLinearGradient(bounds.x1, bounds.y1, bounds.x1, bounds.y1 + (bounds.y2-bounds.y1)*0.35);
      shine.addColorStop(0,   'rgba(255,255,255,0.18)');
      shine.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.fill();

      // ── Territory border ──
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── Status / focus accent border ──
      if (isFocus) {
        ctx.strokeStyle = 'rgba(251,191,36,0.98)';
        ctx.lineWidth = 6;
        ctx.stroke();
      } else if (beaten) {
        ctx.strokeStyle = 'rgba(50,220,110,0.95)';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (status === 'conquered' || status === 'decayed') {
        ctx.strokeStyle = 'rgba(220,170,40,0.9)';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      } else if (status === 'in-progress') {
        ctx.strokeStyle = 'rgba(255,80,80,0.9)';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      } else {
        // notStarted — subtle accent color rim
        ctx.strokeStyle = accent + 'aa';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // ── Section number label ──
      var cen = polyCentroid(poly);
      var secNum = String(sec.id).replace(/[^0-9]/g, '') || String(idx + 3);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Thick dark outline for readability
      ctx.font = 'bold 28px "Courier New",monospace';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = 7;
      ctx.lineJoin = 'round';
      ctx.strokeText(secNum, cen.x, cen.y);

      // Colored glow pass
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(secNum, cen.x, cen.y);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Status icons
      if (beaten) {
        ctx.font = 'bold 20px sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.95)';
        ctx.lineWidth = 4;
        ctx.strokeText('\u2713', cen.x + 24, cen.y - 16);
        ctx.fillStyle = '#4ade80';
        ctx.fillText('\u2713', cen.x + 24, cen.y - 16);
      }
    });

    // ── Continent name labels ──
    CONT_LAYOUT.forEach(function (layout, ci) {
      var accent = CONT_ACCENT[ci] || '#00e8ff';
      var lbl    = CONT_NAMES[ci].toUpperCase();
      var labelY = layout.cy - layout.hh - 16;

      // Dark backing pill for readability
      ctx.font = 'bold 14px "Courier New",monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var tw = ctx.measureText(lbl).width;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(layout.cx - tw/2 - 8, labelY - 10, tw + 16, 20, 4);
      ctx.fill();

      // Glow text
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.fillStyle = accent;
      ctx.fillText(lbl, layout.cx, labelY);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    });

    // Polar vignette
    var northGrad = ctx.createLinearGradient(0, 0, 0, 100);
    northGrad.addColorStop(0, 'rgba(160,210,255,0.15)');
    northGrad.addColorStop(1, 'rgba(160,210,255,0)');
    ctx.fillStyle = northGrad;
    ctx.fillRect(0, 0, W, 100);

    var southGrad = ctx.createLinearGradient(0, H - 100, 0, H);
    southGrad.addColorStop(0, 'rgba(160,210,255,0)');
    southGrad.addColorStop(1, 'rgba(160,210,255,0.12)');
    ctx.fillStyle = southGrad;
    ctx.fillRect(0, H - 100, W, 100);
  }

  // ── Polygon utilities ──────────────────────────────────────────────────────
  function polyBounds(poly) {
    var x1=Infinity, y1=Infinity, x2=-Infinity, y2=-Infinity;
    poly.forEach(function(p){ x1=Math.min(x1,p.x); y1=Math.min(y1,p.y); x2=Math.max(x2,p.x); y2=Math.max(y2,p.y); });
    return { x1:x1, y1:y1, x2:x2, y2:y2 };
  }

  function polyCentroid(poly) {
    var sx=0, sy=0;
    poly.forEach(function(p){ sx+=p.x; sy+=p.y; });
    return { x: sx/poly.length, y: sy/poly.length };
  }

  function hexToRgb(hex) {
    hex = hex.replace('#','');
    return {
      r: parseInt(hex.slice(0,2),16)||0,
      g: parseInt(hex.slice(2,4),16)||0,
      b: parseInt(hex.slice(4,6),16)||0
    };
  }
  function hexToRgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba('+c.r+','+c.g+','+c.b+','+a+')';
  }
  function lightenHex(hex, amt) {
    var c = hexToRgb(hex);
    return 'rgb('+Math.min(255,c.r+amt*120|0)+','+Math.min(255,c.g+amt*120|0)+','+Math.min(255,c.b+amt*120|0)+')';
  }
  function darkenHex(hex, amt) {
    var c = hexToRgb(hex);
    return 'rgb('+Math.max(0,c.r-amt*60|0)+','+Math.max(0,c.g-amt*60|0)+','+Math.max(0,c.b-amt*60|0)+')';
  }
  // Blend two hex colors: t=0 → a, t=1 → b
  function blendHex(a, b, t) {
    var ca = hexToRgb(a), cb = hexToRgb(b);
    return 'rgb('+(ca.r+(cb.r-ca.r)*t|0)+','+(ca.g+(cb.g-ca.g)*t|0)+','+(ca.b+(cb.b-ca.b)*t|0)+')';
  }

  // ── Point-in-polygon hit test ──────────────────────────────────────────────
  function pointInPoly(px, py, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
        inside = !inside;
    }
    return inside;
  }

  // UV (0–1) → section index (-1 if none)
  function uvToSection(u, v) {
    if (!_allPolys) return -1;
    var px = u * 2048, py = v * 1024;
    for (var i = 0; i < _allPolys.length; i++) {
      if (pointInPoly(px, py, _allPolys[i])) return i;
    }
    return -1;
  }

  // ── Main entry point ───────────────────────────────────────────────────────
  function render(container, sections, getSectionStatus, getSectionMasteryInfo,
                  wasBossBeatenToday, focusSection, onBattle, onStudyGuide) {
    ensurePolys();

    if (typeof THREE === 'undefined') {
      // Three.js should be loaded via index.html — show error
      container.innerHTML = '<div style="color:#ef4444;padding:40px;text-align:center;font-family:monospace">Three.js not loaded. Add the script tag to index.html.</div>';
      return;
    }
    buildGlobe(container, sections, getSectionStatus, getSectionMasteryInfo,
               wasBossBeatenToday, focusSection, onBattle, onStudyGuide);
  }

  // ── Build Three.js scene ───────────────────────────────────────────────────
  function buildGlobe(container, sections, getSectionStatus, getSectionMasteryInfo,
                      wasBossBeatenToday, focusSection, onBattle, onStudyGuide) {
    // Clear any previous instance
    container.innerHTML = '';
    container.style.cssText = 'position:relative;width:100%;height:100%;min-height:480px;overflow:hidden;background:#02040a;cursor:grab;';

    // ── Canvas texture ──────────────────────────────────────
    var texCanvas = document.createElement('canvas');
    texCanvas.width  = 2048;
    texCanvas.height = 1024;
    drawTexture(texCanvas, sections, getSectionStatus, getSectionMasteryInfo, wasBossBeatenToday, focusSection);

    // ── Three.js renderer ───────────────────────────────────
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x02040a, 1);
    var cW = container.clientWidth  || 860;
    var cH = container.clientHeight || 590;
    renderer.setSize(cW, cH);
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // ── Scene + camera ──────────────────────────────────────
    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, cW / cH, 0.1, 200);
    camera.position.z = 3.0;

    // ── Globe mesh (MeshBasicMaterial — no lighting math, texture renders exact) ──
    var globeGeo = new THREE.SphereGeometry(1, 80, 80);
    var texture  = new THREE.CanvasTexture(texCanvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var globeMat = new THREE.MeshBasicMaterial({ map: texture });
    var globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // ── Atmosphere glow shaders ─────────────────────────────
    var atmVert = [
      'uniform vec3 viewVector;',
      'uniform float c; uniform float p;',
      'varying float intensity;',
      'void main(){',
      '  vec3 vN = normalize(normalMatrix * normal);',
      '  vec3 vV = normalize(normalMatrix * viewVector);',
      '  intensity = pow(max(0.0, c - dot(vN,vV)), p);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
      '}'
    ].join('\n');
    var atmFrag = [
      'uniform vec3 glowColor;',
      'varying float intensity;',
      'void main(){ vec3 g = glowColor * intensity; gl_FragColor = vec4(g, intensity * 0.65); }'
    ].join('\n');

    function makeAtm(radius, c, p, color, side) {
      return new THREE.Mesh(
        new THREE.SphereGeometry(radius, 64, 64),
        new THREE.ShaderMaterial({
          uniforms: {
            c:         { value: c },
            p:         { value: p },
            glowColor: { value: new THREE.Color(color) },
            viewVector:{ value: camera.position.clone() },
          },
          vertexShader:   atmVert,
          fragmentShader: atmFrag,
          side: side,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        })
      );
    }

    // Atmosphere mesh kept for animation loop refs — not added to scene (no blue glow)
    var atmOuter = makeAtm(1.10, 0.08, 7.0, 0x1a55cc, THREE.FrontSide);

    // ── Starfield ───────────────────────────────────────────
    var starCount = 2800;
    var starPos   = new Float32Array(starCount * 3);
    var rngStar   = mkRng(54321);
    for (var si = 0; si < starCount; si++) {
      var theta = rngStar() * Math.PI * 2;
      var phi   = Math.acos(2 * rngStar() - 1);
      var r     = 45 + rngStar() * 20;
      starPos[si*3]   = r * Math.sin(phi) * Math.cos(theta);
      starPos[si*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[si*3+2] = r * Math.cos(phi);
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.75 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Tooltip ─────────────────────────────────────────────
    var tip = document.createElement('div');
    tip.className = 'globe-tooltip';
    container.appendChild(tip);

    // ── Control buttons ─────────────────────────────────────
    var ctrlDiv = document.createElement('div');
    ctrlDiv.style.cssText = 'position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:6px;z-index:50;';
    ctrlDiv.innerHTML =
      '<button class="tmap-btn" id="gZoomIn" title="Zoom In">+</button>' +
      '<button class="tmap-btn" id="gZoomOut" title="Zoom Out">&minus;</button>' +
      '<button class="tmap-btn" id="gReset" title="Reset">&#8982;</button>' +
      '<button class="tmap-btn" id="gSpin" title="Toggle Spin">&#9654;</button>';
    container.appendChild(ctrlDiv);

    // ── Legend ──────────────────────────────────────────────
    var legDiv = document.createElement('div');
    legDiv.className = 'tmap-legend';
    var legItems = [
      ['#737a8b','Not Started'],
      ['#a84848','In Progress'],
      ['#c49a28','Conquered / Review'],
      ['#2aad5e','Beaten Today ✓'],
    ];
    legDiv.innerHTML = legItems.map(function(it) {
      return '<div class="tmap-leg-item"><div class="tmap-leg-dot" style="background:' + it[0] + ';border:1px solid rgba(255,255,255,0.14)"></div>' + it[1] + '</div>';
    }).join('');
    container.appendChild(legDiv);

    // ── Interaction state ────────────────────────────────────
    var rotX = 0.25, rotY = -0.6;
    var velX = 0, velY = 0.002;
    var autoSpin = true;
    var dragging = false, dragMoved = false;
    var prevX = 0, prevY = 0;
    var targetZ = 3.0;
    var spinTimer = null;
    var hoveredIdx = -1;

    function applyRot() {
      globe.rotation.x   = rotX;
      globe.rotation.y   = rotY;
      atmOuter.rotation.x = rotX; atmOuter.rotation.y = rotY;
    }
    applyRot();

    var glCanvas = renderer.domElement;

    glCanvas.addEventListener('pointerdown', function (e) {
      glCanvas.setPointerCapture(e.pointerId);
      dragging = true; dragMoved = false;
      prevX = e.clientX; prevY = e.clientY;
      velX = 0; velY = 0;
      autoSpin = false;
      clearTimeout(spinTimer);
      container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    glCanvas.addEventListener('pointermove', function (e) {
      if (!dragging) { doHover(e); return; }
      var dx = e.clientX - prevX, dy = e.clientY - prevY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      velY = dx * 0.007;
      velX = dy * 0.007;
      rotY += velY;
      rotX  = Math.max(-1.35, Math.min(1.35, rotX + velX));
      prevX = e.clientX; prevY = e.clientY;
      applyRot();
      e.preventDefault();
    });

    glCanvas.addEventListener('pointerup', function (e) {
      dragging = false;
      container.style.cursor = 'grab';
      if (!dragMoved) doClick(e);
      spinTimer = setTimeout(function () { autoSpin = true; }, 5000);
    });

    glCanvas.addEventListener('wheel', function (e) {
      targetZ = Math.max(1.7, Math.min(7.0, targetZ + e.deltaY * 0.004));
      e.preventDefault();
    }, { passive: false });

    // Button wiring — wait for DOM
    setTimeout(function () {
      var bIn  = document.getElementById('gZoomIn');
      var bOut = document.getElementById('gZoomOut');
      var bRst = document.getElementById('gReset');
      var bSpin= document.getElementById('gSpin');
      if (bIn)   bIn.onclick  = function(){ targetZ = Math.max(1.7, targetZ - 0.6); };
      if (bOut)  bOut.onclick = function(){ targetZ = Math.min(7.0, targetZ + 0.6); };
      if (bRst)  bRst.onclick = function(){ targetZ=3.0; rotX=0.25; rotY=-0.6; velX=0; velY=0; };
      if (bSpin) bSpin.onclick= function(){ autoSpin = !autoSpin; bSpin.style.color = autoSpin ? '#00e8ff' : ''; };
    }, 50);

    // ── Raycaster helpers ────────────────────────────────────
    var raycaster = new THREE.Raycaster();
    var mouse2    = new THREE.Vector2();

    function getHitUV(e) {
      var rect = glCanvas.getBoundingClientRect();
      mouse2.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
      mouse2.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;
      raycaster.setFromCamera(mouse2, camera);
      var hits = raycaster.intersectObject(globe);
      return hits.length ? hits[0].uv : null;
    }

    function doHover(e) {
      var uv = getHitUV(e);
      if (!uv) { tip.style.display = 'none'; hoveredIdx = -1; return; }
      var idx = uvToSection(uv.x, 1 - uv.y);
      if (idx < 0 || idx >= sections.length) { tip.style.display = 'none'; hoveredIdx = -1; return; }
      hoveredIdx = idx;

      var sec    = sections[idx];
      var status = getSectionStatus(sec.id);
      var mInfo  = getSectionMasteryInfo(sec.id);
      var beaten = wasBossBeatenToday(sec.id);
      var stLbl  = { 'locked':'🔒 Locked','not-started':'⬜ Not Started','in-progress':'🔴 In Progress','conquered':'🟡 Conquered','focus':'🎯 Focus' }[status] || status;
      var avgM   = Math.round(mInfo.avgMastery || 0);
      var mLbl   = ['New','Learning','Familiar','Practiced','Strong','Mastered'][avgM] || 'New';
      var mPct   = mInfo.total ? Math.round((mInfo.mastered||0) / mInfo.total * 100) : 0;
      var stars  = '\u2605'.repeat(avgM) + '\u2606'.repeat(Math.max(0, 5 - avgM));
      var mColor = ['#6b7280','#ef4444','#f59e0b','#22c55e','#06b6d4','#818cf8'][avgM] || '#6b7280';

      tip.innerHTML =
        '<div class="globe-tip-title">' + (sec.name || sec.id) + '</div>' +
        '<div class="globe-tip-mastery-row">' +
          '<span style="color:' + mColor + ';font-size:14px;letter-spacing:1px">' + stars + '</span>' +
          '<span style="color:' + mColor + ';font-weight:700;margin-left:6px">' + mLbl + '</span>' +
          '<span style="color:#64748b;margin-left:4px">(' + avgM + '/5)</span>' +
        '</div>' +
        '<div class="globe-tip-bar-wrap"><div class="globe-tip-bar" style="width:' + mPct + '%;background:' + mColor + '"></div></div>' +
        '<div class="globe-tip-sub">' + (mInfo.mastered||0) + ' / ' + (mInfo.total||0) + ' cards mastered (' + mPct + '%)</div>' +
        '<div class="globe-tip-tags">' +
          '<span class="globe-tip-tag">' + stLbl + '</span>' +
          (beaten ? '<span class="globe-tip-tag globe-tip-beaten">\u2713 Beaten Today</span>' : '') +
          ((mInfo.dueCount||0) > 0 ? '<span class="globe-tip-tag" style="color:#f59e0b">' + mInfo.dueCount + ' due</span>' : '') +
        '</div>' +
        '<div class="globe-tip-hint">Click to enter territory</div>';

      var rect = glCanvas.getBoundingClientRect();
      var tx = e.clientX - rect.left + 16;
      var ty = e.clientY - rect.top;
      var tipW = 230;
      if (tx + tipW > cW) tx = e.clientX - rect.left - tipW - 12;
      tip.style.left    = Math.max(4, tx) + 'px';
      tip.style.top     = Math.max(4, ty - 80) + 'px';
      tip.style.display = 'block';
    }

    function doClick(e) {
      var uv = getHitUV(e);
      if (!uv) return;
      var idx = uvToSection(uv.x, 1 - uv.y);
      if (idx < 0 || idx >= sections.length) return;
      var sec    = sections[idx];
      var status = getSectionStatus(sec.id);
      tip.style.display = 'none';
      if (status === 'locked') {
        if (typeof Toast !== 'undefined') Toast.show('Complete previous sections to unlock!', 'warning');
        return;
      }
      onStudyGuide(sec.id);
    }

    // ── Animation loop ───────────────────────────────────────
    var animId = null;

    function animate() {
      animId = requestAnimationFrame(animate);

      if (!dragging) {
        if (autoSpin) {
          velY = 0.0025;
          velX *= 0.95;
        } else {
          velX *= 0.92;
          velY *= 0.92;
        }
        rotY += velY;
        rotX  = Math.max(-1.35, Math.min(1.35, rotX + velX));
        applyRot();
      }

      // Smooth zoom
      var zDelta = (targetZ - camera.position.z) * 0.1;
      camera.position.z += zDelta;

      // Update atmosphere uniform
      atmOuter.material.uniforms.viewVector.value = camera.position.clone();

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ───────────────────────────────────────────────
    function onResize() {
      cW = container.clientWidth  || 860;
      cH = container.clientHeight || 590;
      camera.aspect = cW / cH;
      camera.updateProjectionMatrix();
      renderer.setSize(cW, cH);
    }
    window.addEventListener('resize', onResize);

    // ── Cleanup observer ─────────────────────────────────────
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.removedNodes.forEach(function (n) {
          if (n === glCanvas || !container.parentNode) {
            cancelAnimationFrame(animId);
            renderer.dispose();
            window.removeEventListener('resize', onResize);
            obs.disconnect();
          }
        });
      });
    });
    obs.observe(container, { childList: true });
  }

  return { render: render };

})();
