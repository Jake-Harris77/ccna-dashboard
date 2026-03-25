// ─────────────────────────────────────────────────────────────────────────────
//  CcnaGlobe — SVG Game-Path Maps (no Three.js)
//  Overworld → pick a World → S-curve trail through 6 territories
//  Public API: render(container, sections, getSectionStatus,
//              getSectionMasteryInfo, wasBossBeatenToday, focusSection,
//              onBattle, onStudyGuide)
// ─────────────────────────────────────────────────────────────────────────────
window.CcnaGlobe = (function () {
  'use strict';

  // ── World definitions ──────────────────────────────────────────────────────
  var WORLDS = [
    { name: 'OSI Foundations',  short: 'OSI',      accent: '#4a9ee8', base: '#0b1e40', glow: '#2255cc' },
    { name: 'Network Basics',   short: 'Network',  accent: '#a46de8', base: '#1a0b40', glow: '#7722cc' },
    { name: 'Routing',          short: 'Routing',  accent: '#e8913a', base: '#3a1a06', glow: '#cc6600' },
    { name: 'Switching',        short: 'Switching',accent: '#2cc8c8', base: '#062e2e', glow: '#009999' },
    { name: 'Security & WAN',   short: 'Security', accent: '#e84466', base: '#3a0812', glow: '#cc1144' },
    { name: 'Advanced Topics',  short: 'Advanced', accent: '#3ecd7e', base: '#073520', glow: '#00aa66' },
  ];

  // ── Map layout — ViewBox 800×560 ──────────────────────────────────────────
  // S-curve: top-left → top-right → mid-right → mid-left → bot-left → bot-right
  var VW = 800, VH = 560;
  var NODE_POS = [
    { x: 128, y: 108 },   // 0
    { x: 518, y:  92 },   // 1
    { x: 576, y: 284 },   // 2
    { x: 220, y: 300 },   // 3
    { x: 148, y: 464 },   // 4
    { x: 544, y: 452 },   // 5  ← BOSS
  ];
  // 5 bezier segments connecting consecutive nodes
  var TRAIL_SEGS = [
    'M128,108 C308,78  412,86  518,92',
    'M518,92  C576,92  580,186 576,284',
    'M576,284 C572,374 384,296 220,300',
    'M220,300 C68,304   80,390 148,464',
    'M148,464 C220,532 396,458 544,452',
  ];
  // Decorative terrain points (mountain triangles) between nodes
  var TERRAIN = [
    { x:318, y:185, r:10 },
    { x:395, y:390, r:12 },
    { x:205, y:198, r:8  },
    { x:460, y:344, r:9  },
    { x:340, y:485, r:11 },
    { x:100, y:290, r:7  },
  ];

  // ── Color helpers ──────────────────────────────────────────────────────────
  function hexToRgb(h) {
    h = h.replace('#','');
    return { r:parseInt(h.slice(0,2),16)||0, g:parseInt(h.slice(2,4),16)||0, b:parseInt(h.slice(4,6),16)||0 };
  }
  function rgba(h, a) { var c=hexToRgb(h); return 'rgba('+c.r+','+c.g+','+c.b+','+a+')'; }
  function blend(a, b, t) {
    var ca=hexToRgb(a), cb=hexToRgb(b);
    return '#'+[
      Math.round(ca.r+(cb.r-ca.r)*t).toString(16).padStart(2,'0'),
      Math.round(ca.g+(cb.g-ca.g)*t).toString(16).padStart(2,'0'),
      Math.round(ca.b+(cb.b-ca.b)*t).toString(16).padStart(2,'0'),
    ].join('');
  }

  // ── Progress helpers ───────────────────────────────────────────────────────
  function worldProgress(wSections, getSS) {
    var done=0;
    wSections.forEach(function(s){
      var st=getSS(s.id);
      if(st==='conquered'||st==='decayed') done++;
    });
    return { done:done, total:wSections.length };
  }
  function currentNodeIdx(wSections, getSS, wasBeat, focus) {
    // Find the section currently active: focusSection, else first in-progress, else last conquered+1
    if(focus) {
      for(var i=0;i<wSections.length;i++){
        if(String(wSections[i].id)===String(focus)) return i;
      }
    }
    for(var j=0;j<wSections.length;j++){
      var st=getSS(wSections[j].id);
      if(st==='in-progress') return j;
    }
    // Last conquered + 1
    var last=-1;
    for(var k=0;k<wSections.length;k++){
      var s2=getSS(wSections[k].id);
      if(s2==='conquered'||s2==='decayed'||wasBeat(wSections[k].id)) last=k;
    }
    return Math.min(last+1, wSections.length-1);
  }

  // ── SVG map builder ────────────────────────────────────────────────────────
  // nodes: [{id, label, sublabel, status, beaten, isLocked}]
  // currentIdx: which node gets the YOU-ARE-HERE marker (-1 = none)
  // accent / base: color strings
  // onNodeClick(idx): callback
  function buildSVGMap(wrapper, nodes, currentIdx, accent, base, onNodeClick) {
    var NS = 'http://www.w3.org/2000/svg';

    // ── SVG root ──
    var svg = document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 '+VW+' '+VH);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.style.cssText='width:100%;height:100%;display:block;';
    wrapper.appendChild(svg);

    // ── Defs: filters + gradients + animation ──
    var defs = document.createElementNS(NS,'defs');
    defs.innerHTML =
      '<radialGradient id="cgBg" cx="50%" cy="48%" r="62%">'+
        '<stop offset="0%" stop-color="'+rgba(base,0.85)+'"/>'+
        '<stop offset="100%" stop-color="#020508"/>'+
      '</radialGradient>'+
      '<filter id="cgGlow" x="-60%" y="-60%" width="220%" height="220%">'+
        '<feGaussianBlur stdDeviation="4" result="b"/>'+
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'+
      '</filter>'+
      '<filter id="cgGlowSm" x="-40%" y="-40%" width="180%" height="180%">'+
        '<feGaussianBlur stdDeviation="2" result="b"/>'+
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'+
      '</filter>'+
      '<filter id="cgGlowXl" x="-80%" y="-80%" width="260%" height="260%">'+
        '<feGaussianBlur stdDeviation="7" result="b"/>'+
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'+
      '</filter>';
    svg.appendChild(defs);

    // ── Background ──
    var bg = document.createElementNS(NS,'rect');
    bg.setAttribute('width',VW); bg.setAttribute('height',VH);
    bg.setAttribute('fill','url(#cgBg)');
    svg.appendChild(bg);

    // Subtle dot pattern
    var patEl = document.createElementNS(NS,'g');
    patEl.setAttribute('opacity','0.045');
    for(var pi=0;pi<280;pi++){
      var px=(pi*137.5)%VW, py=(pi*97.3)%VH;
      var pc = document.createElementNS(NS,'circle');
      pc.setAttribute('cx',px.toFixed(1)); pc.setAttribute('cy',py.toFixed(1));
      pc.setAttribute('r','1.2'); pc.setAttribute('fill',accent);
      patEl.appendChild(pc);
    }
    svg.appendChild(patEl);

    // ── Terrain decorations ──
    var terG = document.createElementNS(NS,'g');
    terG.setAttribute('opacity','0.18');
    TERRAIN.forEach(function(t){
      // Mountain triangle
      var r=t.r;
      var tri = document.createElementNS(NS,'polygon');
      tri.setAttribute('points',t.x+','+(t.y+r)+' '+(t.x-r*0.9)+','+(t.y+r*2.1)+' '+(t.x+r*0.9)+','+(t.y+r*2.1));
      tri.setAttribute('fill',rgba(accent,0.4));
      tri.setAttribute('stroke',rgba(accent,0.6));
      tri.setAttribute('stroke-width','0.7');
      terG.appendChild(tri);
      // Snow cap
      var cap = document.createElementNS(NS,'polygon');
      cap.setAttribute('points',t.x+','+(t.y+r)+' '+(t.x-r*0.4)+','+(t.y+r*1.55)+' '+(t.x+r*0.4)+','+(t.y+r*1.55));
      cap.setAttribute('fill','rgba(255,255,255,0.55)');
      terG.appendChild(cap);
    });
    svg.appendChild(terG);

    // ── Trail segments ──
    // Determine progress: segments 0..i-1 where node[i] is conquered = complete
    // Segment i complete if node[i] AND node[i+1] are both done
    function segStatus(i) {
      var a = nodes[i] ? nodes[i].status : 'locked';
      var b = nodes[i+1] ? nodes[i+1].status : 'locked';
      if((a==='conquered'||a==='decayed'||a==='beaten') && (b==='conquered'||b==='decayed'||b==='beaten')) return 'done';
      if(i === currentIdx || i === currentIdx-1) return 'current';
      if(nodes[i+1] && nodes[i+1].isLocked) return 'locked';
      return 'upcoming';
    }

    // Shadow trail (full path behind)
    TRAIL_SEGS.forEach(function(d){
      var p = document.createElementNS(NS,'path');
      p.setAttribute('d',d); p.setAttribute('fill','none');
      p.setAttribute('stroke','rgba(0,0,0,0.55)'); p.setAttribute('stroke-width','9');
      p.setAttribute('stroke-linecap','round');
      svg.appendChild(p);
    });

    // Styled trail segments
    TRAIL_SEGS.forEach(function(d,i){
      var st=segStatus(i);
      var p = document.createElementNS(NS,'path');
      p.setAttribute('d',d); p.setAttribute('fill','none');
      p.setAttribute('stroke-linecap','round');
      if(st==='done'){
        p.setAttribute('stroke','#d4a820'); p.setAttribute('stroke-width','4');
        p.setAttribute('filter','url(#cgGlowSm)');
        // Dotted overlay
        var dots = document.createElementNS(NS,'path');
        dots.setAttribute('d',d); dots.setAttribute('fill','none');
        dots.setAttribute('stroke','rgba(255,220,80,0.45)'); dots.setAttribute('stroke-width','2');
        dots.setAttribute('stroke-dasharray','6,7');
        svg.appendChild(p); svg.appendChild(dots);
      } else if(st==='current'){
        p.setAttribute('stroke',accent); p.setAttribute('stroke-width','3.5');
        p.setAttribute('stroke-dasharray','8,5');
        p.setAttribute('filter','url(#cgGlowSm)');
        svg.appendChild(p);
      } else {
        p.setAttribute('stroke',rgba(accent,0.12)); p.setAttribute('stroke-width','2.5');
        p.setAttribute('stroke-dasharray','4,6');
        svg.appendChild(p);
      }
    });

    // ── Compass rose (top-right corner) ──
    var cg = document.createElementNS(NS,'g');
    cg.setAttribute('transform','translate(748,42)');
    cg.setAttribute('opacity','0.28');
    ['N','S','E','W'].forEach(function(dir,di){
      var angles=[0,180,90,270];
      var rad=angles[di]*Math.PI/180;
      var tx=Math.sin(rad)*16, ty=-Math.cos(rad)*16;
      // Arrow spike
      var spike = document.createElementNS(NS,'path');
      spike.setAttribute('d','M0,0 L'+(-Math.cos(rad)*4)+','+(-Math.sin(rad)*4)+' L'+tx+','+ty+' L'+(Math.cos(rad)*4)+','+(Math.sin(rad)*4)+' Z');
      spike.setAttribute('fill', di===0 ? rgba(accent,0.8) : rgba(accent,0.35));
      cg.appendChild(spike);
      // Label
      var lt = document.createElementNS(NS,'text');
      lt.setAttribute('x',(tx*1.6).toFixed(1)); lt.setAttribute('y',(ty*1.6+4).toFixed(1));
      lt.setAttribute('text-anchor','middle'); lt.setAttribute('fill',rgba(accent,0.55));
      lt.setAttribute('font-size','8'); lt.setAttribute('font-family','Courier New,monospace');
      lt.setAttribute('font-weight','bold');
      lt.textContent=dir;
      cg.appendChild(lt);
    });
    // Center circle
    var cc=document.createElementNS(NS,'circle');
    cc.setAttribute('r','3'); cc.setAttribute('fill',rgba(accent,0.5));
    cg.appendChild(cc);
    svg.appendChild(cg);

    // ── Nodes ──
    nodes.forEach(function(node, idx) {
      var pos = NODE_POS[idx];
      var isBoss = (idx === nodes.length-1);
      var isActive = (idx === currentIdx);
      var R = isBoss ? 30 : 26;

      var nodeG = document.createElementNS(NS,'g');
      nodeG.setAttribute('transform','translate('+pos.x+','+pos.y+')');
      if(!node.isLocked) {
        nodeG.style.cursor='pointer';
        nodeG.setAttribute('data-node', idx);
      }

      // Outer glow ring (status)
      var ringColor, fillColor, textColor;
      if(node.beaten) {
        ringColor='#22c55e'; fillColor='#0a2f18'; textColor='#4ade80';
      } else if(node.status==='conquered'||node.status==='decayed') {
        ringColor='#d4a820'; fillColor='#2a1e06'; textColor='#f0c840';
      } else if(node.status==='in-progress') {
        ringColor=accent; fillColor=blend(base,'#000000',0.3); textColor='#ffffff';
      } else if(node.isLocked) {
        ringColor='rgba(255,255,255,0.10)'; fillColor='#06080e'; textColor='rgba(255,255,255,0.25)';
      } else {
        ringColor=rgba(accent,0.35); fillColor='#0a0f1a'; textColor='rgba(255,255,255,0.7)';
      }

      // Outer pulse ring (active nodes only)
      if(isActive || node.status==='in-progress') {
        var pulseRing = document.createElementNS(NS,'circle');
        pulseRing.setAttribute('r', R+10);
        pulseRing.setAttribute('fill','none');
        pulseRing.setAttribute('stroke', ringColor);
        pulseRing.setAttribute('stroke-width','1.5');
        pulseRing.setAttribute('opacity','0.4');
        pulseRing.setAttribute('filter','url(#cgGlow)');
        pulseRing.setAttribute('class','cg-pulse-ring');
        nodeG.appendChild(pulseRing);
      }

      // Glow halo for conquered/beaten
      if(node.beaten || node.status==='conquered' || node.status==='decayed') {
        var halo = document.createElementNS(NS,'circle');
        halo.setAttribute('r', R+8);
        halo.setAttribute('fill',rgba(ringColor,0.15));
        halo.setAttribute('filter','url(#cgGlowXl)');
        nodeG.appendChild(halo);
      }

      // Main circle shadow
      var shadow = document.createElementNS(NS,'circle');
      shadow.setAttribute('r', R+3);
      shadow.setAttribute('fill','rgba(0,0,0,0.55)');
      shadow.setAttribute('cy','3');
      nodeG.appendChild(shadow);

      // Main circle
      var circle = document.createElementNS(NS,'circle');
      circle.setAttribute('r', R);
      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', ringColor);
      circle.setAttribute('stroke-width', isBoss ? '3' : '2.5');
      if(!node.isLocked && (node.status==='in-progress'||isActive)) {
        circle.setAttribute('filter','url(#cgGlowSm)');
      }
      nodeG.appendChild(circle);

      // Inner highlight
      var hl = document.createElementNS(NS,'circle');
      hl.setAttribute('r', R*0.55); hl.setAttribute('cx','-'+R*0.18); hl.setAttribute('cy','-'+R*0.22);
      hl.setAttribute('fill','rgba(255,255,255,0.07)');
      nodeG.appendChild(hl);

      // Boss crown / icon
      if(isBoss && !node.isLocked) {
        var crownTxt = document.createElementNS(NS,'text');
        crownTxt.setAttribute('x','0'); crownTxt.setAttribute('y', -(R+12));
        crownTxt.setAttribute('text-anchor','middle'); crownTxt.setAttribute('font-size','16');
        crownTxt.textContent = node.beaten || node.status==='conquered' ? '👑' : '⚔';
        nodeG.appendChild(crownTxt);
      }

      // Lock icon
      if(node.isLocked) {
        var lockTxt = document.createElementNS(NS,'text');
        lockTxt.setAttribute('x','0'); lockTxt.setAttribute('y','6');
        lockTxt.setAttribute('text-anchor','middle'); lockTxt.setAttribute('font-size','18');
        lockTxt.setAttribute('fill','rgba(255,255,255,0.2)');
        lockTxt.textContent='🔒';
        nodeG.appendChild(lockTxt);
      } else {
        // Section number
        var numTxt = document.createElementNS(NS,'text');
        numTxt.setAttribute('x','0'); numTxt.setAttribute('y','7');
        numTxt.setAttribute('text-anchor','middle'); numTxt.setAttribute('dominant-baseline','middle');
        numTxt.setAttribute('font-family','Courier New,monospace');
        numTxt.setAttribute('font-size', isBoss?'20':'18');
        numTxt.setAttribute('font-weight','900');
        numTxt.setAttribute('fill', textColor);
        numTxt.textContent = node.label;
        nodeG.appendChild(numTxt);

        // Beaten checkmark overlay
        if(node.beaten) {
          var chk = document.createElementNS(NS,'text');
          chk.setAttribute('x', R-4); chk.setAttribute('y', -(R-4));
          chk.setAttribute('text-anchor','middle'); chk.setAttribute('font-size','14');
          chk.setAttribute('fill','#4ade80'); chk.setAttribute('filter','url(#cgGlowSm)');
          chk.textContent='✓';
          nodeG.appendChild(chk);
        }
      }

      // Section sublabel (below circle)
      if(node.sublabel) {
        // Dark pill background
        var pillW = Math.min(110, node.sublabel.length*7+16);
        var pillRect = document.createElementNS(NS,'rect');
        pillRect.setAttribute('x',-pillW/2); pillRect.setAttribute('y', R+6);
        pillRect.setAttribute('width',pillW); pillRect.setAttribute('height',16);
        pillRect.setAttribute('rx','4'); pillRect.setAttribute('fill','rgba(0,0,0,0.6)');
        nodeG.appendChild(pillRect);

        var subTxt = document.createElementNS(NS,'text');
        subTxt.setAttribute('x','0'); subTxt.setAttribute('y', R+17);
        subTxt.setAttribute('text-anchor','middle');
        subTxt.setAttribute('font-family','Courier New,monospace');
        subTxt.setAttribute('font-size','9.5');
        subTxt.setAttribute('fill', node.isLocked ? 'rgba(255,255,255,0.2)' : rgba(accent,0.9));
        subTxt.textContent = node.sublabel.length>14 ? node.sublabel.slice(0,13)+'…' : node.sublabel;
        nodeG.appendChild(subTxt);
      }

      // YOU ARE HERE marker
      if(isActive && !node.isLocked) {
        var markerG = document.createElementNS(NS,'g');
        markerG.setAttribute('class','cg-here-marker');
        // Triangle pointer
        var tri = document.createElementNS(NS,'polygon');
        tri.setAttribute('points','0,-'+( R+8)+' -8,-'+(R+22)+' 8,-'+(R+22));
        tri.setAttribute('fill','#fbbf24');
        tri.setAttribute('filter','url(#cgGlow)');
        markerG.appendChild(tri);
        // YOU text
        var youTxt = document.createElementNS(NS,'text');
        youTxt.setAttribute('x','0'); youTxt.setAttribute('y',-(R+28));
        youTxt.setAttribute('text-anchor','middle');
        youTxt.setAttribute('font-family','Courier New,monospace');
        youTxt.setAttribute('font-size','9'); youTxt.setAttribute('font-weight','900');
        youTxt.setAttribute('fill','#fbbf24'); youTxt.setAttribute('letter-spacing','2');
        youTxt.textContent='YOU';
        markerG.appendChild(youTxt);
        nodeG.appendChild(markerG);
      }

      // Hover + click
      if(!node.isLocked) {
        nodeG.addEventListener('mouseenter', function(){
          circle.setAttribute('stroke-width', isBoss?'4':'3.5');
          circle.setAttribute('fill', blend(fillColor,'#ffffff',0.06));
        });
        nodeG.addEventListener('mouseleave', function(){
          circle.setAttribute('stroke-width', isBoss?'3':'2.5');
          circle.setAttribute('fill', fillColor);
        });
        nodeG.addEventListener('click', function(){ onNodeClick(idx); });
      }

      svg.appendChild(nodeG);
    });
  }

  // ── SCREEN 1: Overworld (6 world cards) ───────────────────────────────────
  function showWorldSelect(container, sections, getSS, getMI, getB, focus, onBattle, onSG) {
    container.innerHTML='';
    container.style.cssText='position:relative;width:100%;height:100%;overflow:hidden;background:#02040a;';

    // Determine overall current world
    var currentWorld=0;
    for(var wi=0;wi<6;wi++){
      var grp=sections.slice(wi*6, wi*6+6);
      var prog=worldProgress(grp, getSS);
      if(prog.done>0) currentWorld=wi;
      var hasIP=grp.some(function(s){return getSS(s.id)==='in-progress';});
      if(hasIP){currentWorld=wi;break;}
    }

    // Build overworld nodes
    var owNodes=WORLDS.map(function(w, wi){
      var grp=sections.slice(wi*6, wi*6+6);
      var prog=worldProgress(grp,getSS);
      var st = prog.done===grp.length ? 'conquered' :
               prog.done>0 ? 'in-progress' : 'not-started';
      return {
        id: wi, label: String(wi+1), sublabel: w.name,
        status: st, beaten: false, isLocked: false,  // all worlds browseable
      };
    });

    // Overworld title + map
    var root=document.createElement('div');
    root.className='cg-map-root';
    container.appendChild(root);

    var hdr=document.createElement('div');
    hdr.className='cg-map-hdr';
    hdr.innerHTML='<span class="cg-map-title">&#x2B22; WORLD MAP</span><span class="cg-map-sub">Choose your world</span>';
    root.appendChild(hdr);

    var mapArea=document.createElement('div');
    mapArea.className='cg-map-area';
    root.appendChild(mapArea);

    buildSVGMap(mapArea, owNodes, currentWorld,
      '#4a9ee8', '#080e20',
      function(wi){
        showWorldMap(container, wi, sections, getSS, getMI, getB, focus, onBattle, onSG);
      }
    );
  }

  // ── SCREEN 2: Per-world territory map ─────────────────────────────────────
  function showWorldMap(container, wi, sections, getSS, getMI, getB, focus, onBattle, onSG) {
    container.innerHTML='';
    container.style.cssText=
      'position:relative;width:100%;height:100%;overflow:hidden;background:#02040a;'+
      'display:flex;flex-direction:column;';

    var world=WORLDS[wi];
    var wSections=sections.slice(wi*6, wi*6+6);
    while(wSections.length<6) wSections.push({id:'empty-'+wi+'-'+wSections.length, name:'—'});

    // ── Nav bar ──
    var nav=document.createElement('div');
    nav.className='cg-wv-nav';
    nav.style.setProperty('--wa', world.accent);

    var back=document.createElement('button');
    back.className='cg-wv-back';
    back.innerHTML='&#8592; All Worlds';
    back.addEventListener('click',function(){
      showWorldSelect(container, sections, getSS, getMI, getB, focus, onBattle, onSG);
    });

    var navTitle=document.createElement('div');
    navTitle.className='cg-wv-nav-title';
    navTitle.style.color=world.accent;
    navTitle.textContent=world.name.toUpperCase();

    var dots=document.createElement('div');
    dots.className='cg-wv-dots';
    for(var di=0;di<6;di++){
      var dot=document.createElement('button');
      dot.className='cg-wv-dot'+(di===wi?' cg-wv-dot--active':'');
      dot.style.setProperty('--dc',WORLDS[di].accent);
      dot.title=WORLDS[di].name;
      dot.addEventListener('click',(function(di_){
        return function(){
          showWorldMap(container, di_, sections, getSS, getMI, getB, focus, onBattle, onSG);
        };
      })(di));
      dots.appendChild(dot);
    }

    nav.appendChild(back); nav.appendChild(navTitle); nav.appendChild(dots);
    container.appendChild(nav);

    // ── Map area ──
    var mapArea=document.createElement('div');
    mapArea.className='cg-map-area';
    container.appendChild(mapArea);

    // Build territory nodes
    var curIdx=currentNodeIdx(wSections, getSS, getB, focus);
    var tNodes=wSections.map(function(sec,idx){
      var st=getSS(sec.id);
      var beat=getB(sec.id);
      var numStr=String(sec.id).replace(/[^0-9]/g,'')||String(idx+1);
      var locked= st==='locked' || (idx>0 && getSS(wSections[idx-1].id)==='locked'
                                         && getSS(wSections[idx-1].id)!=='not-started'
                                         && !wSections[idx-1].id.toString().startsWith('empty'));
      // Simpler lock: if the previous territory is locked, this one is too
      // But not-started ≠ locked for the first unlocked territory
      var actuallyLocked = (st==='locked');
      return {
        id: sec.id, label: numStr,
        sublabel: sec.name||'',
        status: beat?'beaten':st, beaten: beat,
        isLocked: actuallyLocked,
      };
    });

    buildSVGMap(mapArea, tNodes, curIdx, world.accent, world.base,
      function(idx){
        var sec=wSections[idx];
        if(!sec||sec.id.toString().startsWith('empty')) return;
        var st=getSS(sec.id);
        if(st==='locked'){
          if(typeof Toast!=='undefined') Toast.show('Complete previous sections to unlock!','warning');
          return;
        }
        onSG(sec.id);
      }
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function render(container, sections, getSS, getMI, getB, focus, onBattle, onSG) {
    showWorldSelect(container, sections, getSS, getMI, getB, focus, onBattle, onSG);
  }

  return { render: render };

})();
