// ─────────────────────────────────────────────────────────────────────────────
//  NetDash — App Logic
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────
  let currentSearch = '';
  let currentCat    = 'all';
  let currentCard   = null;

  // ── DOM refs ─────────────────────────────────────────────
  const searchInput   = document.getElementById('searchInput');
  const searchClear   = document.getElementById('searchClear');
  const filterBar     = document.getElementById('filterBar');
  const cardsGrid     = document.getElementById('cardsGrid');
  const resultsMeta   = document.getElementById('resultsMeta');
  const emptyState    = document.getElementById('emptyState');
  const emptyTerm     = document.getElementById('emptyTerm');
  const statTotal     = document.getElementById('statTotal');
  const modalOverlay  = document.getElementById('modalOverlay');
  const modalBody     = document.getElementById('modalBody');
  const modalClose    = document.getElementById('modalClose');
  const sidebar       = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');

  // ── Init ─────────────────────────────────────────────────
  statTotal.textContent = `${COMMANDS.length} commands`;
  renderCards(COMMANDS);
  bindEvents();
  initNavSwitching();

  // ── Event Bindings ───────────────────────────────────────
  function bindEvents () {
    // Search
    searchInput.addEventListener('input', onSearch);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearch(); });
    searchClear.addEventListener('click', clearSearch);

    // Filter buttons
    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      applyFilters();
    });

    // Modal close
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Sidebar toggle
    sidebarToggle.addEventListener('click', toggleSidebar);

    // Keyboard shortcut: / to focus search (skip when typing in any input or textarea)
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  // ── Search & Filter ──────────────────────────────────────
  function onSearch () {
    currentSearch = searchInput.value.trim();
    searchClear.classList.toggle('visible', currentSearch.length > 0);
    applyFilters();
  }

  function clearSearch () {
    searchInput.value = '';
    currentSearch = '';
    searchClear.classList.remove('visible');
    applyFilters();
    searchInput.focus();
  }

  function applyFilters () {
    let results = COMMANDS;

    // Category filter
    if (currentCat !== 'all') {
      results = results.filter(c => c.category === currentCat);
    }

    // Text search
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      results = results.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.syntax.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)) ||
        c.variations.some(v => v.cmd.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)) ||
        c.outputTips.some(t => t.toLowerCase().includes(q))
      );
    }

    renderCards(results);
  }

  // ── Render Cards ─────────────────────────────────────────
  function renderCards (list) {
    cardsGrid.innerHTML = '';

    if (list.length === 0) {
      emptyState.style.display = 'flex';
      emptyTerm.textContent = `"${currentSearch}"`;
      resultsMeta.textContent = '';
      return;
    }

    emptyState.style.display = 'none';

    if (currentSearch || currentCat !== 'all') {
      resultsMeta.textContent = `${list.length} result${list.length !== 1 ? 's' : ''}`;
    } else {
      resultsMeta.textContent = '';
    }

    list.forEach(cmd => {
      const card = buildCard(cmd);
      card.addEventListener('click', () => openModal(cmd));
      cardsGrid.appendChild(card);
    });
  }

  function buildCard (cmd) {
    const el = document.createElement('div');
    el.className = 'cmd-card';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `View details for ${cmd.title}`);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(cmd); });

    // Highlight matched text
    const hl = str => highlightText(str, currentSearch);

    // Syntax preview — first line only
    const syntaxPreview = cmd.syntax.split('\n')[0];

    el.innerHTML = `
      <div class="card-header">
        <span class="card-cat-badge cat-${cmd.category}">${categoryLabel(cmd.category)}</span>
        <span class="card-title">${hl(cmd.title)}</span>
      </div>
      <div class="card-syntax">${escapeHtml(syntaxPreview)}</div>
      <div class="card-desc">${hl(cmd.description)}</div>
      <div class="card-footer">
        <div class="card-tags">
          ${cmd.tags.slice(0, 3).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <span class="card-more">View details →</span>
      </div>
    `;
    return el;
  }

  // ── Modal ────────────────────────────────────────────────
  function openModal (cmd) {
    currentCard = cmd;
    modalBody.innerHTML = buildModalContent(cmd);

    // Bind copy buttons inside modal
    modalBody.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const target = btn.closest('.syntax-block');
        const code = target ? target.querySelector('code') : null;
        const text = code ? code.innerText : btn.dataset.copy || '';
        copyToClipboard(text, btn);
      });
    });

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => modalClose.focus(), 50);
  }

  function closeModal () {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentCard = null;
  }

  function buildModalContent (cmd) {
    const hl = str => highlightText(str, currentSearch);

    // Variations
    const variationsHtml = cmd.variations.map(v => `
      <div class="variation-item">
        <div class="variation-label">${escapeHtml(v.label)}</div>
        <div class="syntax-block">
          <code>${escapeHtml(v.cmd)}</code>
          <button class="copy-btn" title="Copy to clipboard">Copy</button>
        </div>
      </div>
    `).join('');

    // Output tips
    const tipsHtml = cmd.outputTips.map(t => `<li>${escapeHtml(t)}</li>`).join('');

    // Pro tip
    const tipHtml = cmd.tip
      ? `<div class="tip-box"><strong>Pro tip:</strong> ${escapeHtml(cmd.tip)}</div>`
      : '';

    // Tags
    const tagsHtml = cmd.tags.map(t => `<span class="modal-tag">${escapeHtml(t)}</span>`).join('');

    return `
      <span class="modal-cat-badge cat-${cmd.category}">${categoryLabel(cmd.category)}</span>
      <h2 class="modal-title">${hl(cmd.title)}</h2>
      <p class="modal-desc">${hl(cmd.description)}</p>

      <div class="modal-section">
        <div class="modal-section-title">Primary Syntax</div>
        <div class="syntax-block">
          <code>${escapeHtml(cmd.syntax)}</code>
          <button class="copy-btn" title="Copy to clipboard">Copy</button>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Common Variations</div>
        ${variationsHtml}
      </div>

      <div class="modal-section">
        <div class="modal-section-title">What to Look for in Output</div>
        <ul class="output-list">
          ${tipsHtml}
        </ul>
      </div>

      ${tipHtml}

      <div class="modal-tags">
        ${tagsHtml}
      </div>
    `;
  }

  // ── Sidebar Toggle ───────────────────────────────────────
  function toggleSidebar () {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  }

  // ── Copy to Clipboard ────────────────────────────────────
  function copyToClipboard (text, btn) {
    if (!text) return;
    const original = btn.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showCopied(btn, original));
    } else {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showCopied(btn, original); } catch (_) {}
      document.body.removeChild(ta);
    }
  }

  function showCopied (btn, original) {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1800);
  }

  // ── Helpers ──────────────────────────────────────────────
  function escapeHtml (str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightText (str, query) {
    if (!query) return escapeHtml(str);
    const escaped = escapeHtml(str);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(
      new RegExp(`(${escapedQuery})`, 'gi'),
      '<mark class="highlight">$1</mark>'
    );
  }

  function categoryLabel (cat) {
    const labels = {
      interface:    'Interface',
      routing:      'Routing',
      ospf:         'OSPF',
      eigrp:        'EIGRP',
      rip:          'RIP',
      bgp:          'BGP',
      switching:    'Switching',
      vlan:         'VLAN',
      stp:          'STP',
      security:     'Security',
      nat:          'NAT',
      ipv6:         'IPv6',
      dhcp:         'DHCP',
      fhrp:         'HSRP/FHRP',
      etherchannel: 'EtherChannel',
      wan:          'WAN/GRE',
      system:       'System',
      troubleshoot: 'Troubleshoot',
    };
    return labels[cat] || cat;
  }

  // ── Panel / Nav Switching ────────────────────────────────
  function initNavSwitching () {
    const navItems    = document.querySelectorAll('.nav-item');
    const toolPanels  = document.querySelectorAll('.tool-panel');
    const topbarTitle = document.querySelector('.topbar-title');
    const topbarMeta  = document.querySelector('.topbar-meta');

    const toolTitles = {
      'ios-reference': 'IOS Command Reference',
      'study':         'Study Center',
      'acl-builder':   'ACL Builder & Explainer',
      'subnet-calc':   'Subnet Calculator',
      'anki':          'ANKI Game',
    };

    navItems.forEach(item => {
      if (!item.dataset.tool) return;

      item.addEventListener('click', e => {
        e.preventDefault();
        const tool = item.dataset.tool;
        const mode = item.dataset.mode || null;

        // Update active nav item
        navItems.forEach(n => n.classList.remove('active'));
        // Mark all nav items for this tool as active
        navItems.forEach(n => {
          if (n.dataset.tool === tool) n.classList.add('active');
        });

        // Show matching panel, hide others
        toolPanels.forEach(p => {
          if (p.id === `tool-${tool}`) {
            p.classList.add('active');
            p.style.display = '';
          } else {
            p.classList.remove('active');
            p.style.display = 'none';
          }
        });

        // Update topbar title
        if (topbarTitle) topbarTitle.textContent = toolTitles[tool] || tool;

        // Update topbar meta
        if (topbarMeta) {
          if (tool === 'ios-reference') {
            topbarMeta.innerHTML = `<span class="stat-chip" id="statTotal">${COMMANDS.length} commands</span>`;
          } else if (tool === 'study') {
            topbarMeta.innerHTML = `<span class="stat-chip">${QUIZ_QUESTIONS.length} questions</span>`;
          } else if (tool === 'acl-builder') {
            topbarMeta.innerHTML = `<span class="stat-chip">Builder &amp; Explainer</span>`;
          } else if (tool === 'subnet-calc') {
            topbarMeta.innerHTML = `<span class="stat-chip">IPv4 Only</span>`;
          } else if (tool === 'anki') {
            topbarMeta.innerHTML = `<span class="stat-chip">${typeof ANKI_CARDS !== 'undefined' ? ANKI_CARDS.length : 0} cards</span>`;
          } else {
            topbarMeta.innerHTML = '';
          }
        }

        // Close mobile sidebar after nav click
        sidebar.classList.remove('mobile-open');

        // Activate quiz/flashcard engine for study panel
        if (tool === 'study' && window.QuizEngine) {
          if (mode) {
            window.QuizEngine.startMode(mode);
          } else {
            window.QuizEngine.init();
          }
        }

        // Activate ACL Builder
        if (tool === 'acl-builder' && window.ACLBuilder) {
          window.ACLBuilder.init();
        }

        // Activate Subnet Calculator
        if (tool === 'subnet-calc' && window.SubnetCalc) {
          window.SubnetCalc.init();
        }

        // Activate ANKI Game
        if (tool === 'anki' && window.AnkiEngine) {
          window.AnkiEngine.init();
        }
      });
    });

    // Set initial panel visibility: ios-reference visible, study hidden
    toolPanels.forEach(p => {
      if (p.id === 'tool-ios-reference') {
        p.style.display = '';
      } else {
        p.style.display = 'none';
      }
    });
  }

})();
