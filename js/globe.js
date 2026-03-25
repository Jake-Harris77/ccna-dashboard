// ─────────────────────────────────────────────────────────────────────────────
//  CcnaGlobe — Multi-World Design  (Three.js r128)
//  World Select screen → 6 individual world globes
//  Public API: render(container, sections, getSectionStatus,
//              getSectionMasteryInfo, wasBossBeatenToday, focusSection,
//              onBattle, onStudyGuide)
// ─────────────────────────────────────────────────────────────────────────────
window.CcnaGlobe = (function () {
  'use strict';

  // ── World definitions ──────────────────────────────────────────────────────
  var WORLDS = [
    { name: 'OSI Foundations',  short: 'OSI',      accent: '#4a8fd4', base: '#0e2248', glow: '#2255cc' },
    { name: 'Network Basics',   short: 'Network',  accent: '#9a5dd8', base: '#220e48', glow: '#7722cc' },
    { name: 'Routing',          short: 'Routing',  accent: '#d4853a', base: '#3d1e06', glow: '#cc6600' },
    { name: 'Switching',        short: 'Switching',accent: '#2ab8b8', base: '#062e2e', glow: '#009999' },
    { name: 'Security & WAN',   short: 'Security', accent: '#d44466', base: '#3d0815', glow: '#cc1144' },
    { name: 'Advanced Topics',  short: 'Advanced', accent: '#38c87a', base: '#073520', glow: '#00aa66' },
  ];

  // Territory layout on 2048×1024 texture — centered at equator (cy=512)
  // hh=210 → row centers at ±105px = ±18.5° latitude → cos(18.5°)=0.948
  // This gives essentially equal-sized territories top and bottom
  var WORLD_LAYOUT = { cx: 1024, cy: 512, hw: 1000, hh: 210 };

  // ── Seeded RNG ─────────────────────────────────────────────────────────────
  function mkRng(seed) {
    var s = seed | 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
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
    return { r:parseInt(hex.slice(0,2),16)||0, g:parseInt(hex.slice(2,4),16)||0, b:parseInt(hex.slice(4,6),16)||0 };
  }
  function hexToRgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba('+c.r+','+c.g+','+c.b+','+a+')';
  }
  function blendHex(a, b, t) {
    var ca = hexToRgb(a), cb = hexToRgb(b);
    return 'rgb('+(ca.r+(cb.r-ca.r)*t|0)+','+(ca.g+(cb.g-ca.g)*t|0)+','+(ca.b+(cb.b-ca.b)*t|0)+')';
  }
  function pointInPoly(px, py, poly) {
    var inside=false;
    for(var i=0, j=poly.length-1; i<poly.length; j=i++){
      var xi=poly[i].x, yi=poly[i].y, xj=poly[j].x, yj=poly[j].y;
      if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
    }
    return inside;
  }

  // ── Build 6 territory polygons for a world ────────────────────────────────
  function buildWorldPolys(wi) {
    var cx=WORLD_LAYOUT.cx, cy=WORLD_LAYOUT.cy, hw=WORLD_LAYOUT.hw, hh=WORLD_LAYOUT.hh;
    var rng = mkRng(wi * 7919 + 42);
    var GX=4, GY=3;
    var pts=[];
    for(var gy=0; gy<GY; gy++) {
      for(var gx=0; gx<GX; gx++) {
        var bx = cx - hw + (gx/(GX-1)) * hw*2;
        var by = cy - hh + (gy/(GY-1)) * hh*2;
        var jx = (gx>0&&gx<GX-1) ? (rng()-0.5)*hw*0.26 : 0;
        var jy = (gy>0&&gy<GY-1) ? (rng()-0.5)*hh*0.26 : 0;
        pts.push({ x: bx+jx, y: by+jy });
      }
    }
    function pt(gx,gy){ return pts[gy*GX+gx]; }
    function mid(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }
    var polys=[];
    for(var row=0; row<2; row++) {
      for(var col=0; col<3; col++) {
        var tl=pt(col,row), tr=pt(col+1,row), bl=pt(col,row+1), br=pt(col+1,row+1);
        polys.push([mid(tl,tr),tr,mid(tr,br),br,mid(br,bl),bl,mid(bl,tl),tl]);
      }
    }
    return polys;
  }

  // Cache polygons per world index
  var _worldPolys = {};
  function getWorldPolys(wi) {
    if(!_worldPolys[wi]) _worldPolys[wi] = buildWorldPolys(wi);
    return _worldPolys[wi];
  }

  // UV (0-1) → section index within a world (-1 if none)
  function uvToWorldSection(u, v, wi) {
    var polys = getWorldPolys(wi);
    var px = u*2048, py = v*1024;
    for(var i=0; i<polys.length; i++){
      if(pointInPoly(px, py, polys[i])) return i;
    }
    return -1;
  }

  // ── Progress helper ────────────────────────────────────────────────────────
  function getWorldProgress(wSections, getSectionStatus) {
    var done=0;
    wSections.forEach(function(s){
      var st=getSectionStatus(s.id);
      if(st==='conquered'||st==='decayed'||st==='beaten') done++;
    });
    return { done: done, total: wSections.length };
  }

  // ── Draw world globe texture ───────────────────────────────────────────────
  function drawWorldTexture(canvas, wi, wSections, getSectionStatus,
                             getSectionMasteryInfo, wasBossBeatenToday, focusSection) {
    var W=canvas.width, H=canvas.height;
    var ctx=canvas.getContext('2d');
    var world=WORLDS[wi];
    var polys=getWorldPolys(wi);

    // Deep-space background with world color tint
    var bg=ctx.createRadialGradient(W/2,H/2,0, W/2,H/2, W*0.65);
    bg.addColorStop(0,   hexToRgba(world.base, 0.6));
    bg.addColorStop(0.5, '#070d1a');
    bg.addColorStop(1,   '#020408');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Lat/lon grid in world accent tint
    ctx.strokeStyle=hexToRgba(world.accent, 0.09);
    ctx.lineWidth=1;
    for(var li=1;li<8;li++){
      ctx.beginPath(); ctx.moveTo(0,li/8*H); ctx.lineTo(W,li/8*H); ctx.stroke();
    }
    for(var lj=1;lj<16;lj++){
      ctx.beginPath(); ctx.moveTo(lj/16*W,0); ctx.lineTo(lj/16*W,H); ctx.stroke();
    }

    // Subtle star shimmer
    var rng0=mkRng(wi*999+1);
    for(var d=0;d<180;d++){
      ctx.beginPath();
      ctx.arc(rng0()*W, rng0()*H, 1+rng0()*1.5, 0, Math.PI*2);
      ctx.fillStyle=hexToRgba(world.accent, 0.05+rng0()*0.07);
      ctx.fill();
    }

    // ── Draw territories ───────────────────────────────────────────────────
    wSections.forEach(function(sec, idx) {
      if(idx >= polys.length) return;
      var poly=polys[idx];
      var status=getSectionStatus(sec.id);
      var beaten=wasBossBeatenToday(sec.id);
      var isFocus=focusSection && String(sec.id)===String(focusSection);
      var bounds=polyBounds(poly);

      // ── Territory path ──
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for(var pi=1;pi<poly.length;pi++) ctx.lineTo(poly[pi].x, poly[pi].y);
      ctx.closePath();

      // ── Fill colors ──
      var topColor, botColor;
      if(beaten) {
        topColor='#22aa55'; botColor='#0a3a1e';
      } else if(status==='conquered'||status==='decayed') {
        topColor='#9a7020'; botColor='#3a2808';
      } else if(status==='in-progress') {
        topColor='#962020'; botColor='#380c0c';
      } else {
        // Not started — distinct shade per index within world color family
        var t = idx / 5;
        topColor = blendHex(world.accent, '#c0d8ff', 0.08 + t*0.12);
        botColor = blendHex(world.base,   world.accent, 0.15 + t*0.20);
      }

      var grad=ctx.createLinearGradient(bounds.x1,bounds.y1,bounds.x1,bounds.y2);
      grad.addColorStop(0,   topColor);
      grad.addColorStop(0.4, blendHex(topColor,botColor,0.55));
      grad.addColorStop(1,   botColor);
      ctx.fillStyle=grad; ctx.fill();

      // ── Top-edge shine ──
      ctx.beginPath();
      ctx.moveTo(poly[0].x,poly[0].y);
      for(var pi2=1;pi2<poly.length;pi2++) ctx.lineTo(poly[pi2].x,poly[pi2].y);
      ctx.closePath();
      var shine=ctx.createLinearGradient(bounds.x1,bounds.y1,bounds.x1,bounds.y1+(bounds.y2-bounds.y1)*0.32);
      shine.addColorStop(0,'rgba(255,255,255,0.22)');
      shine.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=shine; ctx.fill();

      // ── Base border ──
      ctx.lineJoin='round';
      ctx.strokeStyle='rgba(0,0,0,0.82)';
      ctx.lineWidth=2.5;
      ctx.stroke();

      // ── Status/focus accent border ──
      if(isFocus) {
        ctx.strokeStyle='rgba(251,191,36,0.98)'; ctx.lineWidth=7; ctx.stroke();
      } else if(beaten) {
        ctx.strokeStyle='rgba(46,220,105,0.95)'; ctx.lineWidth=5; ctx.stroke();
      } else if(status==='conquered'||status==='decayed') {
        ctx.strokeStyle='rgba(220,175,40,0.90)'; ctx.lineWidth=4; ctx.stroke();
      } else if(status==='in-progress') {
        ctx.strokeStyle='rgba(255,80,80,0.90)';  ctx.lineWidth=4; ctx.stroke();
      } else {
        ctx.strokeStyle=hexToRgba(world.accent,0.55); ctx.lineWidth=2; ctx.stroke();
      }

      // ── Section number (large, centered) ──
      var cen=polyCentroid(poly);
      var secNum=String(sec.id).replace(/[^0-9]/g,'')||String(idx+1);

      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='bold 36px "Courier New",monospace';
      ctx.strokeStyle='rgba(0,0,0,1)'; ctx.lineWidth=9; ctx.lineJoin='round';
      ctx.strokeText(secNum, cen.x, cen.y-10);
      ctx.shadowColor=world.accent; ctx.shadowBlur=14;
      ctx.fillStyle='#ffffff';
      ctx.fillText(secNum, cen.x, cen.y-10);
      ctx.shadowBlur=0; ctx.shadowColor='transparent';

      // ── Section name (short, below number) ──
      if(sec.name) {
        var words=sec.name.split(' ');
        // Show up to 3 words, abbreviating long names
        var label = words.length<=3 ? sec.name : words.slice(0,3).join(' ');
        ctx.font='bold 12px "Courier New",monospace';
        ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=3.5;
        ctx.strokeText(label, cen.x, cen.y+14);
        ctx.fillStyle=hexToRgba(world.accent, 0.95);
        ctx.fillText(label, cen.x, cen.y+14);
      }

      // ── Beaten checkmark ──
      if(beaten) {
        ctx.font='bold 22px sans-serif';
        ctx.strokeStyle='rgba(0,0,0,0.95)'; ctx.lineWidth=4;
        ctx.strokeText('✓', cen.x+38, cen.y-24);
        ctx.fillStyle='#4ade80';
        ctx.fillText('✓', cen.x+38, cen.y-24);
      }
    });

    // Polar fade — darkens north and south poles for depth
    var ng=ctx.createLinearGradient(0,0,0,140);
    ng.addColorStop(0,'rgba(0,0,0,0.78)');
    ng.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ng; ctx.fillRect(0,0,W,140);

    var sg=ctx.createLinearGradient(0,H-140,0,H);
    sg.addColorStop(0,'rgba(0,0,0,0)');
    sg.addColorStop(1,'rgba(0,0,0,0.78)');
    ctx.fillStyle=sg; ctx.fillRect(0,H-140,W,140);
  }

  // ── SCREEN 1: World Select ─────────────────────────────────────────────────
  function showWorldSelect(container, sections, getSectionStatus, getSectionMasteryInfo,
                           wasBossBeatenToday, focusSection, onBattle, onStudyGuide) {
    container.innerHTML='';
    container.style.cssText='position:relative;width:100%;height:100%;overflow:hidden;background:#02040a;';

    var root=document.createElement('div');
    root.className='cg-ws-root';
    container.appendChild(root);

    // ── Header ──
    var hdr=document.createElement('div');
    hdr.className='cg-ws-header';
    hdr.innerHTML='<span class="cg-ws-title">&#x2B22; WORLD MAP</span>' +
                  '<span class="cg-ws-sub">Select a world to begin</span>';
    root.appendChild(hdr);

    // ── Trail bar ──
    var wSectionGroups=[];
    for(var wi=0; wi<6; wi++) {
      var grp=sections.slice(wi*6, wi*6+6);
      while(grp.length<6) grp.push({ id:'empty-'+wi+'-'+grp.length, name:'—' });
      wSectionGroups.push(grp);
    }

    var trailDiv=document.createElement('div');
    trailDiv.className='cg-trail';
    var trailDots=WORLDS.map(function(w,i){
      var prog=getWorldProgress(wSectionGroups[i], getSectionStatus);
      var done=prog.done>0;
      return '<div class="cg-trail-dot'+(done?' cg-trail-dot--done':'')+'" style="--dc:'+w.accent+'">'+
               '<span class="cg-trail-dot-num">'+(i+1)+'</span>'+
             '</div>';
    }).join('<div class="cg-trail-line"></div>');
    trailDiv.innerHTML=trailDots;
    root.appendChild(trailDiv);

    // ── World grid ──
    var grid=document.createElement('div');
    grid.className='cg-ws-grid';

    wSectionGroups.forEach(function(wSections, wi) {
      var world=WORLDS[wi];
      var prog=getWorldProgress(wSections, getSectionStatus);
      var pct=prog.total ? prog.done/prog.total : 0;
      var circumference=(2*Math.PI*38).toFixed(2);
      var dash=(circumference*pct).toFixed(2);

      // Orb inner gradient colors
      var orbHi=blendHex(world.accent,'#ffffff',0.35);

      var card=document.createElement('div');
      card.className='cg-ws-card';
      card.style.cssText=
        '--wa:'+world.accent+';'+
        '--wb:'+world.base+';'+
        '--wg:'+world.glow+';';

      card.innerHTML=
        '<div class="cg-ws-orb-wrap">'+
          '<svg class="cg-ws-ring-svg" viewBox="0 0 100 100">'+
            '<circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="5"/>'+
            '<circle cx="50" cy="50" r="38" fill="none" stroke="'+world.accent+'"'+
              ' stroke-width="5" stroke-dasharray="'+dash+' '+circumference+'"'+
              ' stroke-linecap="round" transform="rotate(-90 50 50)"/>'+
          '</svg>'+
          '<div class="cg-ws-orb" style="background:radial-gradient(circle at 34% 28%, '+orbHi+', '+world.accent+' 48%, '+world.base+' 100%)">'+
            '<div class="cg-ws-orb-shine"></div>'+
            '<div class="cg-ws-orb-num">'+(wi+1)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="cg-ws-card-body">'+
          '<div class="cg-ws-card-name">'+world.name+'</div>'+
          '<div class="cg-ws-card-prog">'+prog.done+' / '+prog.total+' territories</div>'+
          '<div class="cg-ws-card-bar-wrap">'+
            '<div class="cg-ws-card-bar" style="width:'+Math.round(pct*100)+'%;background:'+world.accent+'"></div>'+
          '</div>'+
        '</div>';

      card.addEventListener('click', (function(wi_) {
        return function() {
          showWorldGlobe(container, wi_, sections, getSectionStatus, getSectionMasteryInfo,
                         wasBossBeatenToday, focusSection, onBattle, onStudyGuide);
        };
      })(wi));

      grid.appendChild(card);
    });

    root.appendChild(grid);
  }

  // ── SCREEN 2: World Globe ──────────────────────────────────────────────────
  function showWorldGlobe(container, wi, sections, getSectionStatus, getSectionMasteryInfo,
                          wasBossBeatenToday, focusSection, onBattle, onStudyGuide) {
    container.innerHTML='';
    container.style.cssText=
      'position:relative;width:100%;height:100%;overflow:hidden;background:#02040a;'+
      'display:flex;flex-direction:column;';

    var world=WORLDS[wi];
    var worldSections=sections.slice(wi*6, wi*6+6);
    while(worldSections.length<6) worldSections.push({ id:'empty-'+wi+'-'+worldSections.length, name:'—' });

    // ── Navigation bar ──────────────────────────────────────
    var nav=document.createElement('div');
    nav.className='cg-wv-nav';
    nav.style.setProperty('--wa', world.accent);

    var backBtn=document.createElement('button');
    backBtn.className='cg-wv-back';
    backBtn.innerHTML='&#8592; All Worlds';
    backBtn.addEventListener('click', function() {
      showWorldSelect(container, sections, getSectionStatus, getSectionMasteryInfo,
                      wasBossBeatenToday, focusSection, onBattle, onStudyGuide);
    });

    var navTitle=document.createElement('div');
    navTitle.className='cg-wv-nav-title';
    navTitle.style.color=world.accent;
    navTitle.textContent=world.name.toUpperCase();

    var dots=document.createElement('div');
    dots.className='cg-wv-dots';
    for(var di=0; di<6; di++) {
      var dot=document.createElement('button');
      dot.className='cg-wv-dot'+(di===wi?' cg-wv-dot--active':'');
      dot.style.setProperty('--dc', WORLDS[di].accent);
      dot.title=WORLDS[di].name;
      dot.addEventListener('click', (function(di_) {
        return function() {
          showWorldGlobe(container, di_, sections, getSectionStatus, getSectionMasteryInfo,
                         wasBossBeatenToday, focusSection, onBattle, onStudyGuide);
        };
      })(di));
      dots.appendChild(dot);
    }

    nav.appendChild(backBtn);
    nav.appendChild(navTitle);
    nav.appendChild(dots);
    container.appendChild(nav);

    // ── Globe area ──────────────────────────────────────────
    var globeDiv=document.createElement('div');
    globeDiv.className='cg-wv-globe';
    container.appendChild(globeDiv);

    buildWorldGlobe(globeDiv, wi, worldSections, getSectionStatus, getSectionMasteryInfo,
                    wasBossBeatenToday, focusSection, onBattle, onStudyGuide);
  }

  // ── Build Three.js world globe ─────────────────────────────────────────────
  function buildWorldGlobe(container, wi, worldSections, getSectionStatus, getSectionMasteryInfo,
                           wasBossBeatenToday, focusSection, onBattle, onStudyGuide) {
    var world=WORLDS[wi];
    container.style.cssText='position:relative;width:100%;flex:1;overflow:hidden;cursor:grab;';

    // ── Texture ──
    var texCanvas=document.createElement('canvas');
    texCanvas.width=2048; texCanvas.height=1024;
    drawWorldTexture(texCanvas, wi, worldSections, getSectionStatus, getSectionMasteryInfo,
                     wasBossBeatenToday, focusSection);

    // ── Renderer ──
    var renderer=new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x02040a,1);
    var cW=container.clientWidth||860;
    var cH=container.clientHeight||520;
    renderer.setSize(cW,cH);
    renderer.domElement.style.display='block';
    container.appendChild(renderer.domElement);

    // ── Scene + camera ──
    var scene=new THREE.Scene();
    var camera=new THREE.PerspectiveCamera(42, cW/cH, 0.1, 200);
    camera.position.z=3.0;

    // ── Globe — MeshBasicMaterial (no lighting, full color fidelity) ──
    var texture=new THREE.CanvasTexture(texCanvas);
    texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    var globe=new THREE.Mesh(
      new THREE.SphereGeometry(1, 80, 80),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    scene.add(globe);

    // ── Subtle atmosphere rim glow (world accent color) ──
    var atmVert=[
      'uniform vec3 viewVector;',
      'uniform float c; uniform float p;',
      'varying float intensity;',
      'void main(){',
      '  vec3 vN=normalize(normalMatrix*normal);',
      '  vec3 vV=normalize(normalMatrix*viewVector);',
      '  intensity=pow(max(0.0,c-dot(vN,vV)),p);',
      '  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
      '}'
    ].join('\n');
    var atmFrag=[
      'uniform vec3 glowColor;',
      'varying float intensity;',
      'void main(){vec3 g=glowColor*intensity;gl_FragColor=vec4(g,intensity*0.55);}'
    ].join('\n');
    var gc=hexToRgb(world.glow);
    var atmMesh=new THREE.Mesh(
      new THREE.SphereGeometry(1.13,64,64),
      new THREE.ShaderMaterial({
        uniforms:{
          c:{value:0.12}, p:{value:5.5},
          glowColor:{value:new THREE.Color(gc.r/255,gc.g/255,gc.b/255)},
          viewVector:{value:camera.position.clone()}
        },
        vertexShader:atmVert, fragmentShader:atmFrag,
        side:THREE.FrontSide, blending:THREE.AdditiveBlending,
        transparent:true, depthWrite:false
      })
    );
    scene.add(atmMesh);

    // ── Starfield ──
    var sp=new Float32Array(2800*3);
    var rs=mkRng(54321);
    for(var si=0;si<2800;si++){
      var th=rs()*Math.PI*2, ph=Math.acos(2*rs()-1), r=45+rs()*20;
      sp[si*3]=r*Math.sin(ph)*Math.cos(th);
      sp[si*3+1]=r*Math.sin(ph)*Math.sin(th);
      sp[si*3+2]=r*Math.cos(ph);
    }
    var sg=new THREE.BufferGeometry();
    sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
    scene.add(new THREE.Points(sg,
      new THREE.PointsMaterial({color:0xffffff,size:0.09,sizeAttenuation:true,transparent:true,opacity:0.75})));

    // ── Tooltip ──
    var tip=document.createElement('div');
    tip.className='globe-tooltip';
    container.appendChild(tip);

    // ── Control buttons ──
    var ctrlDiv=document.createElement('div');
    ctrlDiv.style.cssText='position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:6px;z-index:50;';
    ctrlDiv.innerHTML=
      '<button class="tmap-btn" id="gZoomIn" title="Zoom In">+</button>'+
      '<button class="tmap-btn" id="gZoomOut" title="Zoom Out">&minus;</button>'+
      '<button class="tmap-btn" id="gReset" title="Reset">&#8982;</button>'+
      '<button class="tmap-btn" id="gSpin" title="Toggle Spin">&#9654;</button>';
    container.appendChild(ctrlDiv);

    // ── Legend ──
    var legDiv=document.createElement('div');
    legDiv.className='tmap-legend';
    [['#737a8b','Not Started'],['#a84848','In Progress'],['#c49a28','Conquered'],['#2aad5e','Beaten Today ✓']].forEach(function(it){
      var d=document.createElement('div'); d.className='tmap-leg-item';
      d.innerHTML='<div class="tmap-leg-dot" style="background:'+it[0]+'"></div>'+it[1];
      legDiv.appendChild(d);
    });
    container.appendChild(legDiv);

    // ── Interaction state ──
    var rotX=0.0, rotY=-0.6;
    var velX=0, velY=0.002;
    var autoSpin=true, dragging=false, dragMoved=false;
    var prevX=0, prevY=0, targetZ=3.0, spinTimer=null;

    function applyRot() {
      globe.rotation.x=rotX; globe.rotation.y=rotY;
      atmMesh.rotation.x=rotX; atmMesh.rotation.y=rotY;
    }
    applyRot();

    var glCanvas=renderer.domElement;

    glCanvas.addEventListener('pointerdown', function(e) {
      glCanvas.setPointerCapture(e.pointerId);
      dragging=true; dragMoved=false; prevX=e.clientX; prevY=e.clientY;
      velX=0; velY=0; autoSpin=false; clearTimeout(spinTimer);
      container.style.cursor='grabbing'; e.preventDefault();
    });

    glCanvas.addEventListener('pointermove', function(e) {
      if(!dragging){ doHover(e); return; }
      var dx=e.clientX-prevX, dy=e.clientY-prevY;
      if(Math.abs(dx)+Math.abs(dy)>2) dragMoved=true;
      velY=dx*0.007; velX=dy*0.007;
      rotY+=velY; rotX=Math.max(-1.35,Math.min(1.35,rotX+velX));
      prevX=e.clientX; prevY=e.clientY; applyRot(); e.preventDefault();
    });

    glCanvas.addEventListener('pointerup', function(e) {
      dragging=false; container.style.cursor='grab';
      if(!dragMoved) doClick(e);
      spinTimer=setTimeout(function(){ autoSpin=true; },5000);
    });

    glCanvas.addEventListener('wheel', function(e) {
      targetZ=Math.max(1.7,Math.min(7.0,targetZ+e.deltaY*0.004));
      e.preventDefault();
    }, { passive:false });

    setTimeout(function() {
      var bIn=document.getElementById('gZoomIn');
      var bOut=document.getElementById('gZoomOut');
      var bRst=document.getElementById('gReset');
      var bSpin=document.getElementById('gSpin');
      if(bIn)   bIn.onclick=function(){targetZ=Math.max(1.7,targetZ-0.6);};
      if(bOut)  bOut.onclick=function(){targetZ=Math.min(7.0,targetZ+0.6);};
      if(bRst)  bRst.onclick=function(){targetZ=3.0;rotX=0.0;rotY=-0.6;velX=0;velY=0;};
      if(bSpin) bSpin.onclick=function(){autoSpin=!autoSpin;bSpin.style.color=autoSpin?world.accent:'';};
    },50);

    // ── Raycaster ──
    var raycaster=new THREE.Raycaster();
    var mouse2=new THREE.Vector2();

    function getHitUV(e) {
      var rect=glCanvas.getBoundingClientRect();
      mouse2.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse2.y=((e.clientY-rect.top)/rect.height)*-2+1;
      raycaster.setFromCamera(mouse2,camera);
      var hits=raycaster.intersectObject(globe);
      return hits.length?hits[0].uv:null;
    }

    function doHover(e) {
      var uv=getHitUV(e);
      if(!uv){tip.style.display='none';return;}
      var idx=uvToWorldSection(uv.x,1-uv.y,wi);
      if(idx<0||idx>=worldSections.length){tip.style.display='none';return;}
      var sec=worldSections[idx];
      if(!sec||sec.id.toString().indexOf('empty')===0){tip.style.display='none';return;}
      var status=getSectionStatus(sec.id);
      var mInfo=getSectionMasteryInfo(sec.id);
      var beaten=wasBossBeatenToday(sec.id);
      var stLbl={locked:'🔒 Locked','not-started':'⬜ Not Started','in-progress':'🔴 In Progress',
                 conquered:'🟡 Conquered',focus:'🎯 Focus'}[status]||status;
      var avgM=Math.round(mInfo.avgMastery||0);
      var mLbl=['New','Learning','Familiar','Practiced','Strong','Mastered'][avgM]||'New';
      var mPct=mInfo.total?Math.round((mInfo.mastered||0)/mInfo.total*100):0;
      var stars='★'.repeat(avgM)+'☆'.repeat(Math.max(0,5-avgM));
      var mColor=['#6b7280','#ef4444','#f59e0b','#22c55e','#06b6d4','#818cf8'][avgM]||'#6b7280';

      tip.innerHTML=
        '<div class="globe-tip-title">'+(sec.name||sec.id)+'</div>'+
        '<div class="globe-tip-mastery-row">'+
          '<span style="color:'+mColor+';font-size:14px;letter-spacing:1px">'+stars+'</span>'+
          '<span style="color:'+mColor+';font-weight:700;margin-left:6px">'+mLbl+'</span>'+
          '<span style="color:#64748b;margin-left:4px">('+avgM+'/5)</span>'+
        '</div>'+
        '<div class="globe-tip-bar-wrap"><div class="globe-tip-bar" style="width:'+mPct+'%;background:'+mColor+'"></div></div>'+
        '<div class="globe-tip-sub">'+(mInfo.mastered||0)+' / '+(mInfo.total||0)+' cards mastered ('+mPct+'%)</div>'+
        '<div class="globe-tip-tags">'+
          '<span class="globe-tip-tag">'+stLbl+'</span>'+
          (beaten?'<span class="globe-tip-tag globe-tip-beaten">✓ Beaten Today</span>':'')+
          ((mInfo.dueCount||0)>0?'<span class="globe-tip-tag" style="color:#f59e0b">'+mInfo.dueCount+' due</span>':'')+
        '</div>'+
        '<div class="globe-tip-hint">Click to study this territory</div>';

      var rect=glCanvas.getBoundingClientRect();
      var tx=e.clientX-rect.left+16, ty=e.clientY-rect.top;
      if(tx+230>cW) tx=e.clientX-rect.left-242;
      tip.style.left=Math.max(4,tx)+'px';
      tip.style.top=Math.max(4,ty-80)+'px';
      tip.style.display='block';
    }

    function doClick(e) {
      var uv=getHitUV(e);
      if(!uv) return;
      var idx=uvToWorldSection(uv.x,1-uv.y,wi);
      if(idx<0||idx>=worldSections.length) return;
      var sec=worldSections[idx];
      if(!sec||sec.id.toString().indexOf('empty')===0) return;
      var status=getSectionStatus(sec.id);
      tip.style.display='none';
      if(status==='locked'){
        if(typeof Toast!=='undefined') Toast.show('Complete previous sections to unlock!','warning');
        return;
      }
      onStudyGuide(sec.id);
    }

    // ── Animation loop ──
    var animId=null;
    function animate() {
      animId=requestAnimationFrame(animate);
      if(!dragging){
        if(autoSpin){ velY=0.0025; velX*=0.95; }
        else { velX*=0.92; velY*=0.92; }
        rotY+=velY; rotX=Math.max(-1.35,Math.min(1.35,rotX+velX));
        applyRot();
      }
      camera.position.z+=(targetZ-camera.position.z)*0.1;
      atmMesh.material.uniforms.viewVector.value=camera.position.clone();
      renderer.render(scene,camera);
    }
    animate();

    function onResize() {
      cW=container.clientWidth||860; cH=container.clientHeight||520;
      camera.aspect=cW/cH; camera.updateProjectionMatrix();
      renderer.setSize(cW,cH);
    }
    window.addEventListener('resize',onResize);

    var obs=new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.removedNodes.forEach(function(n){
          if(n===glCanvas||!container.parentNode){
            cancelAnimationFrame(animId);
            renderer.dispose();
            window.removeEventListener('resize',onResize);
            obs.disconnect();
          }
        });
      });
    });
    obs.observe(container,{childList:true});
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function render(container, sections, getSectionStatus, getSectionMasteryInfo,
                  wasBossBeatenToday, focusSection, onBattle, onStudyGuide) {
    if(typeof THREE==='undefined') {
      container.innerHTML='<div style="color:#ef4444;padding:40px;text-align:center;font-family:monospace">Three.js not loaded. Add the script tag to index.html.</div>';
      return;
    }
    showWorldSelect(container, sections, getSectionStatus, getSectionMasteryInfo,
                    wasBossBeatenToday, focusSection, onBattle, onStudyGuide);
  }

  return { render: render };

})();
