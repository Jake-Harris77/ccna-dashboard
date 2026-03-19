// ─────────────────────────────────────────────────────────────────────────────
//  NetDash — ACL Builder & Explainer
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  let currentMode = 'builder'; // 'builder' | 'explainer'
  let lastOutput  = '';        // for Copy ACL button

  // ── Data tables ───────────────────────────────────────────────────────────
  const SERVICE_TABLE = {
    // TCP
    ftp:     { protocol: 'tcp',  port: 21,   label: 'FTP' },
    ssh:     { protocol: 'tcp',  port: 22,   label: 'SSH' },
    telnet:  { protocol: 'tcp',  port: 23,   label: 'Telnet' },
    smtp:    { protocol: 'tcp',  port: 25,   label: 'SMTP (email)' },
    http:    { protocol: 'tcp',  port: 80,   label: 'HTTP' },
    www:     { protocol: 'tcp',  port: 80,   label: 'HTTP' },
    https:   { protocol: 'tcp',  port: 443,  label: 'HTTPS' },
    bgp:     { protocol: 'tcp',  port: 179,  label: 'BGP' },
    ldap:    { protocol: 'tcp',  port: 389,  label: 'LDAP' },
    rdp:     { protocol: 'tcp',  port: 3389, label: 'RDP' },
    // UDP
    dns:     { protocol: 'udp',  port: 53,   label: 'DNS' },
    tftp:    { protocol: 'udp',  port: 69,   label: 'TFTP' },
    dhcp:    { protocol: 'udp',  port: 67,   label: 'DHCP' },
    ntp:     { protocol: 'udp',  port: 123,  label: 'NTP' },
    snmp:    { protocol: 'udp',  port: 161,  label: 'SNMP' },
    syslog:  { protocol: 'udp',  port: 514,  label: 'Syslog' },
    // ICMP / protocol-only
    icmp:    { protocol: 'icmp', port: null,  label: 'ICMP' },
    ping:    { protocol: 'icmp', port: null,  label: 'ICMP (ping)' },
  };

  // Named port strings IOS uses
  const NAMED_PORT_MAP = {
    ftp: 21, 'ftp-data': 20, ssh: 22, telnet: 23, smtp: 25, www: 80,
    http: 80, https: 443, bgp: 179, ldap: 389, dns: 53, tftp: 69, ntp: 123,
    snmp: 161, syslog: 514, rdp: 3389, pop3: 110, imap: 143,
    'ms-sql-s': 1433, 'oracle': 1521, kerberos: 88,
  };

  const CIDR_TO_WILDCARD = {
    0: '255.255.255.255',
    8: '0.255.255.255',
    16: '0.0.255.255',
    24: '0.0.0.255',
    25: '0.0.0.127',
    26: '0.0.0.63',
    27: '0.0.0.31',
    28: '0.0.0.15',
    29: '0.0.0.7',
    30: '0.0.0.3',
    31: '0.0.0.1',
    32: '0.0.0.0',
  };

  const PROTO_NUMBER_MAP = {
    1: 'icmp', 6: 'tcp', 17: 'udp', 47: 'gre', 88: 'eigrp', 89: 'ospf',
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function padRight(s, n) {
    s = String(s);
    return s.length >= n ? s : s + ' '.repeat(n - s.length);
  }

  function wildcardToCIDR(wc) {
    // Reverse-lookup
    for (const [cidr, wild] of Object.entries(CIDR_TO_WILDCARD)) {
      if (wild === wc) return parseInt(cidr, 10);
    }
    // Bit-inversion fallback
    const parts = wc.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    const inverted = parts.map(x => 255 - x).join('.');
    const bits = inverted.split('.').map(n => n >>> 0);
    let cidrCount = 0;
    let inOnes = true;
    for (const octet of bits) {
      for (let b = 7; b >= 0; b--) {
        const bit = (octet >> b) & 1;
        if (inOnes && bit === 1) { cidrCount++; }
        else if (bit === 0) { inOnes = false; }
        else { return null; } // non-contiguous
      }
    }
    return cidrCount;
  }

  function resolveNamedPort(name) {
    const n = String(name).toLowerCase();
    if (NAMED_PORT_MAP[n] !== undefined) return NAMED_PORT_MAP[n];
    const num = parseInt(n, 10);
    return isNaN(num) ? null : num;
  }

  function formatPortOp(op, p1, p2) {
    if (!op) return '';
    if (op === 'range') return `ports ${p1}–${p2}`;
    const labels = { eq: 'port', gt: 'ports above', lt: 'ports below', neq: 'all ports except' };
    return `${labels[op] || op} ${p1}`;
  }

  // ── Address parsing ───────────────────────────────────────────────────────
  // Returns { type, ip, wildcard, cidr } or null
  function parseAddress(tokens, idx) {
    const tok = tokens[idx];
    if (!tok) return { addr: null, nextIdx: idx };

    if (tok === 'any') {
      return {
        addr: { type: 'any', ip: null, wildcard: null, cidr: null },
        nextIdx: idx + 1,
      };
    }

    if (tok === 'host') {
      const ip = tokens[idx + 1];
      if (!ip) return { addr: null, nextIdx: idx };
      return {
        addr: { type: 'host', ip, wildcard: '0.0.0.0', cidr: 32 },
        nextIdx: idx + 2,
      };
    }

    // CIDR notation like 192.168.1.0/24
    if (tok.includes('/')) {
      const [ip, prefix] = tok.split('/');
      const cidr = parseInt(prefix, 10);
      const wildcard = CIDR_TO_WILDCARD[cidr] || null;
      if (cidr === 32) return { addr: { type: 'host', ip, wildcard: '0.0.0.0', cidr: 32 }, nextIdx: idx + 1 };
      if (cidr === 0)  return { addr: { type: 'any', ip: null, wildcard: null, cidr: null }, nextIdx: idx + 1 };
      return { addr: { type: 'network', ip, wildcard, cidr }, nextIdx: idx + 1 };
    }

    // Bare IP (next token might be wildcard)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(tok)) {
      const next = tokens[idx + 1];
      if (next && /^\d{1,3}(\.\d{1,3}){3}$/.test(next)) {
        // ip + wildcard pair (explainer mode)
        if (next === '0.0.0.0') {
          return { addr: { type: 'host', ip: tok, wildcard: '0.0.0.0', cidr: 32 }, nextIdx: idx + 2 };
        }
        if (next === '255.255.255.255') {
          return { addr: { type: 'any', ip: null, wildcard: null, cidr: null }, nextIdx: idx + 2 };
        }
        const cidr = wildcardToCIDR(next);
        return { addr: { type: 'network', ip: tok, wildcard: next, cidr }, nextIdx: idx + 2 };
      }
      // bare IP → treat as /32
      return { addr: { type: 'host', ip: tok, wildcard: '0.0.0.0', cidr: 32 }, nextIdx: idx + 1 };
    }

    return { addr: null, nextIdx: idx };
  }

  function addrToIOS(addr) {
    if (!addr) return '?';
    if (addr.type === 'any')  return 'any';
    if (addr.type === 'host') return `host ${addr.ip}`;
    return `${addr.ip} ${addr.wildcard}`;
  }

  function addrToEnglish(addr) {
    if (!addr) return 'unknown address';
    if (addr.type === 'any')  return 'any address';
    if (addr.type === 'host') return `host ${addr.ip}`;
    return `network ${addr.ip}/${addr.cidr !== null ? addr.cidr : addr.wildcard}`;
  }

  // ── BUILDER: Natural language parser ─────────────────────────────────────
  function parseNaturalLine(rawLine) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) return null;

    const result = {
      action: null, protocol: 'ip', port: null, portLabel: null,
      src: null, dst: null, isExtended: false,
      generatedLine: '', explanation: '', error: null,
    };

    // Normalize
    const tokens = line.toLowerCase().replace(/,/g, ' ').trim().split(/\s+/);

    // ── Catchall check ──────────────────────────────────────────────────────
    const full = tokens.join(' ');
    if (/^(permit\s+)?(everything|all|any\s+traffic|allow\s+all|allow\s+any)/.test(full) ||
        full === 'permit all' || full === 'allow any' || full === 'allow all') {
      result.action   = 'permit';
      result.src      = { type: 'any', ip: null, wildcard: null, cidr: null };
      result.dst      = { type: 'any', ip: null, wildcard: null, cidr: null };
      result.generatedLine = 'permit ip any any';
      result.explanation   = 'Permit all IP traffic from any source to any destination.';
      return result;
    }

    // ── Action ──────────────────────────────────────────────────────────────
    for (const t of tokens) {
      if (/^(permit|allow|pass|accept)$/.test(t)) { result.action = 'permit'; break; }
      if (/^(deny|block|drop|reject)$/.test(t))   { result.action = 'deny';   break; }
    }
    if (!result.action) {
      result.error = `No action found (permit/deny) in: "${line}"`;
      return result;
    }

    // ── Service / protocol ──────────────────────────────────────────────────
    for (const t of tokens) {
      if (SERVICE_TABLE[t]) {
        const svc = SERVICE_TABLE[t];
        result.protocol  = svc.protocol;
        result.port      = svc.port;
        result.portLabel = svc.label;
        break;
      }
      if (t === 'tcp' || t === 'udp' || t === 'icmp' || t === 'ip') {
        result.protocol = t;
        break;
      }
    }

    // "port <n>" override
    const portIdx = tokens.indexOf('port');
    if (portIdx !== -1 && tokens[portIdx + 1]) {
      const pNum = parseInt(tokens[portIdx + 1], 10);
      if (!isNaN(pNum)) { result.port = pNum; result.portLabel = null; }
    }

    // ── Source ───────────────────────────────────────────────────────────────
    const fromIdx = tokens.indexOf('from');
    if (fromIdx !== -1) {
      const { addr } = parseAddress(tokens, fromIdx + 1);
      result.src = addr;
    }
    if (!result.src) {
      result.src = { type: 'any', ip: null, wildcard: null, cidr: null };
    }

    // ── Destination ──────────────────────────────────────────────────────────
    const toIdx = tokens.indexOf('to');
    if (toIdx !== -1) {
      const { addr } = parseAddress(tokens, toIdx + 1);
      result.dst = addr;
    }
    if (!result.dst) {
      result.dst = { type: 'any', ip: null, wildcard: null, cidr: null };
    }

    // ── Is extended? ─────────────────────────────────────────────────────────
    result.isExtended = result.port !== null ||
      result.dst.type !== 'any' ||
      result.protocol !== 'ip';

    // ── Build IOS syntax ─────────────────────────────────────────────────────
    let ios = `${result.action} ${result.protocol}`;
    ios += ` ${addrToIOS(result.src)}`;
    if (result.port !== null) {
      ios += ` ${addrToIOS(result.dst)} eq ${result.port}`;
    } else {
      if (result.protocol !== 'ip' || result.dst.type !== 'any') {
        ios += ` ${addrToIOS(result.dst)}`;
      }
    }
    result.generatedLine = ios;

    // ── English explanation ───────────────────────────────────────────────────
    const actionWord = result.action === 'permit' ? 'Allow' : 'Block';
    let svcStr = result.portLabel
      ? `${result.portLabel} traffic`
      : result.protocol !== 'ip'
        ? `${result.protocol.toUpperCase()} traffic`
        : 'all IP traffic';
    result.explanation = `${actionWord} ${svcStr} from ${addrToEnglish(result.src)} to ${addrToEnglish(result.dst)}.`;

    return result;
  }

  function buildACLOutput(name, aclType, lines) {
    const rules = lines.map(l => parseNaturalLine(l)).filter(Boolean);

    // Determine if any rule needs extended
    const needsExtended = aclType === 'extended' ||
      (aclType === 'auto' && rules.some(r => !r.error && r.isExtended));
    const finalType = needsExtended ? 'extended' : 'standard';
    const aclName = name.trim() || 'MY_ACL';

    const header = `ip access-list ${finalType} ${aclName}`;
    const iosLines = [header];
    rules.forEach(r => {
      if (!r.error) iosLines.push(' ' + r.generatedLine);
    });

    return { rules, iosLines, finalType, aclName };
  }

  // ── EXPLAINER: IOS ACL line parser ───────────────────────────────────────
  function parseACELine(rawLine) {
    const line = rawLine.trim();
    if (!line) return null;

    // Header: ip access-list extended|standard NAME
    const headerMatch = line.match(/^ip\s+access-list\s+(extended|standard)\s+(\S+)/i);
    if (headerMatch) {
      return {
        type: 'header',
        text: line,
        explanation: `Named ${headerMatch[1]} ACL named "${headerMatch[2]}".`,
      };
    }

    // Remark
    if (/^remark\s*/i.test(line)) {
      const text = line.replace(/^remark\s*/i, '');
      return { type: 'remark', text, explanation: `Comment: ${text}` };
    }

    // Strip "access-list <n>" prefix for numbered ACLs
    let working = line.replace(/^access-list\s+\d+\s+/i, '');

    // Strip leading whitespace (indented entries in named ACL)
    working = working.trim();

    // Skip lines that are just the ACL header
    if (/^ip\s+access-list/i.test(working)) return null;

    const tokens = working.toLowerCase().split(/\s+/);
    let idx = 0;

    // Action
    const action = tokens[idx];
    if (action !== 'permit' && action !== 'deny') {
      return { type: 'remark', text: line, explanation: `Unrecognized line: ${line}` };
    }
    idx++;

    // Protocol
    let protocol = tokens[idx] || 'ip';
    idx++;
    // Resolve protocol numbers
    const protoNum = parseInt(protocol, 10);
    if (!isNaN(protoNum) && PROTO_NUMBER_MAP[protoNum]) {
      protocol = PROTO_NUMBER_MAP[protoNum];
    }

    // Source
    const srcResult = parseAddress(tokens, idx);
    const src = srcResult.addr;
    idx = srcResult.nextIdx;

    // Source port (for tcp/udp)
    let srcPort = null;
    let srcPortLabel = null;
    if ((protocol === 'tcp' || protocol === 'udp') && tokens[idx] &&
        /^(eq|gt|lt|neq|range)$/.test(tokens[idx])) {
      const op = tokens[idx]; idx++;
      const p1 = resolveNamedPort(tokens[idx]); idx++;
      let p2 = null;
      if (op === 'range') { p2 = resolveNamedPort(tokens[idx]); idx++; }
      srcPort = { op, p1, p2 };
      srcPortLabel = formatPortOp(op, p1, p2);
    }

    // Destination
    const dstResult = parseAddress(tokens, idx);
    const dst = dstResult.addr;
    idx = dstResult.nextIdx;

    // Destination port
    let dstPort = null;
    let dstPortLabel = null;
    if ((protocol === 'tcp' || protocol === 'udp') && tokens[idx] &&
        /^(eq|gt|lt|neq|range)$/.test(tokens[idx])) {
      const op = tokens[idx]; idx++;
      const p1 = resolveNamedPort(tokens[idx]); idx++;
      let p2 = null;
      if (op === 'range') { p2 = resolveNamedPort(tokens[idx]); idx++; }
      dstPort = { op, p1, p2 };
      dstPortLabel = formatPortOp(op, p1, p2);
    }

    // Trailing flags
    const rest = tokens.slice(idx).join(' ');
    const established = /\bestablished\b/.test(rest);
    const log = /\blog\b/.test(rest);

    // Build explanation
    const actionWord = action === 'permit' ? 'Allow' : 'Block';
    let protoStr = protocol.toUpperCase();
    let parts = [`${actionWord} ${protoStr} traffic`];
    parts.push(`from ${addrToEnglish(src)}`);
    if (srcPortLabel) parts.push(`(src ${srcPortLabel})`);
    parts.push(`to ${addrToEnglish(dst)}`);
    if (dstPortLabel) parts.push(`(dst ${dstPortLabel})`);
    if (established) parts.push('— return/established traffic only');
    if (log) parts.push('— matches logged to syslog');

    return {
      type: 'ace',
      action,
      protocol,
      src,
      dst,
      srcPort,
      dstPort,
      flags: { established, log },
      rawLine: line,
      explanation: parts.join(' ') + '.',
    };
  }

  function explainACL(text) {
    const lines = text.split('\n');
    const results = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const ace = parseACELine(line);
      if (ace) results.push(ace);
    }

    // Append implicit deny
    results.push({
      type: 'implicit',
      action: 'deny',
      explanation: 'Implicit deny: Every ACL ends with an invisible "deny ip any any". Traffic not matched by any rule above is dropped.',
    });

    return results;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function getPanel() {
    return document.getElementById('tool-acl-builder');
  }

  function render() {
    const panel = getPanel();
    if (!panel) return;

    panel.innerHTML = `
      <div class="acl-wrapper">
        ${renderModeTabs()}
        ${renderLayout()}
        ${renderTipsAccordion()}
      </div>
    `;

    bindPanelEvents();
  }

  function renderModeTabs() {
    return `
      <div class="acl-mode-tabs" role="tablist">
        <button class="acl-tab${currentMode === 'builder' ? ' active' : ''}"
                data-mode="builder" role="tab" aria-selected="${currentMode === 'builder'}">
          Plain English → ACL
        </button>
        <button class="acl-tab${currentMode === 'explainer' ? ' active' : ''}"
                data-mode="explainer" role="tab" aria-selected="${currentMode === 'explainer'}">
          ACL → Explainer
        </button>
      </div>
    `;
  }

  function renderLayout() {
    const inputPanel = currentMode === 'builder' ? renderBuilderInput() : renderExplainerInput();
    const outputPanel = renderOutputPanel();
    return `<div class="acl-layout">${inputPanel}${outputPanel}</div>`;
  }

  function renderBuilderInput() {
    return `
      <div class="acl-panel acl-panel-input">
        <p class="acl-panel-title">Write Rules in Plain English</p>
        <div class="acl-name-row">
          <input type="text" id="aclNameInput" class="acl-name-input"
                 placeholder="ACL name (e.g. BLOCK_TELNET)" maxlength="64" />
          <select id="aclTypeSelect" class="acl-type-select">
            <option value="auto">Auto-detect</option>
            <option value="extended">Extended</option>
            <option value="standard">Standard</option>
          </select>
        </div>
        <textarea id="aclInput" class="acl-textarea"
                  placeholder="One rule per line. Examples:&#10;deny telnet from 192.168.1.0/24 to any&#10;permit http from any to host 10.0.0.10&#10;permit ssh from 10.0.0.0/8 to any&#10;permit everything else"
                  rows="8" spellcheck="false"></textarea>
        <div class="acl-input-footer">
          <span class="acl-line-count" id="aclLineCount">0 lines</span>
          <button class="acl-action-btn" id="aclActionBtn">Generate ACL</button>
        </div>
        <div class="acl-tip-box">
          <strong>Tip:</strong> One rule per line. Use plain English — specify the action
          (permit/deny/allow/block), service (telnet, ssh, http…), source, and destination.
          Press <strong>Ctrl+Enter</strong> to generate.
        </div>
      </div>
    `;
  }

  function renderExplainerInput() {
    return `
      <div class="acl-panel acl-panel-input">
        <p class="acl-panel-title">Paste an IOS ACL</p>
        <textarea id="aclInput" class="acl-textarea"
                  placeholder="Paste any IOS ACL here. Examples:&#10;access-list 101 deny tcp 192.168.1.0 0.0.0.255 any eq 23&#10;access-list 101 permit ip any any&#10;&#10;OR named ACL:&#10;ip access-list extended BLOCK_TELNET&#10; deny tcp 192.168.1.0 0.0.0.255 any eq 23&#10; permit ip any any"
                  rows="8" spellcheck="false"></textarea>
        <div class="acl-input-footer">
          <span class="acl-line-count" id="aclLineCount">0 lines</span>
          <button class="acl-action-btn" id="aclActionBtn">Explain ACL</button>
        </div>
        <div class="acl-tip-box">
          <strong>Tip:</strong> Supports numbered ACLs (<code>access-list N ...</code>) and
          named ACLs (<code>ip access-list extended NAME</code>). Paste the full ACL or
          individual lines. Press <strong>Ctrl+Enter</strong> to explain.
        </div>
      </div>
    `;
  }

  function renderOutputPanel() {
    return `
      <div class="acl-panel acl-panel-output">
        <div class="acl-output-header">
          <p class="acl-panel-title">${currentMode === 'builder' ? 'Generated IOS ACL' : 'Line-by-Line Explanation'}</p>
          <button class="acl-copy-btn" id="aclCopyBtn" style="display:none;">Copy ACL</button>
        </div>
        <div class="acl-output-block" id="aclOutputBlock">
          <pre class="acl-code" id="aclCode"></pre>
        </div>
        <div class="acl-breakdown-list" id="aclBreakdown">
          <div class="acl-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p>Your output will appear here.</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderTipsAccordion() {
    return `
      <div class="acl-tips-panel" id="aclTipsPanel">
        <button class="acl-tips-toggle" id="aclTipsToggle" aria-expanded="false">
          <span>CCNA ACL Tips</span>
          <svg class="acl-tips-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="acl-tips-body" id="aclTipsBody">
          <div class="acl-tip-card">
            <p class="acl-tip-card-title">ACL Placement</p>
            <p>Place <strong>Standard ACLs</strong> as close to the <strong>destination</strong> as possible.
               Place <strong>Extended ACLs</strong> as close to the <strong>source</strong> as possible.
               This prevents traffic from travelling unnecessarily across the network before being dropped.</p>
          </div>
          <div class="acl-tip-card">
            <p class="acl-tip-card-title">Wildcard Masks</p>
            <p>A wildcard mask is the <em>inverse</em> of a subnet mask.
               Calculate it as: <code>255.255.255.255 − subnet mask = wildcard</code>.<br>
               Example: subnet <code>/24</code> → mask <code>255.255.255.0</code> → wildcard <code>0.0.0.255</code>.<br>
               A wildcard of <code>0.0.0.0</code> matches exactly one host (same as <code>host x.x.x.x</code>).
               A wildcard of <code>255.255.255.255</code> matches any host (same as <code>any</code>).</p>
          </div>
          <div class="acl-tip-card">
            <p class="acl-tip-card-title">Implicit Deny</p>
            <p>Every ACL ends with an <strong>invisible</strong> <code>deny ip any any</code> statement.
               If a packet doesn't match any explicit rule, it is dropped silently.
               Always add a final <code>permit ip any any</code> if you only want to block specific traffic.
               Verify with <code>show ip access-lists</code> — the implicit deny never appears there.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ── Render output for Builder mode ───────────────────────────────────────
  function renderBuilderOutput(name, aclType, rawLines) {
    const { rules, iosLines } = buildACLOutput(name, aclType, rawLines);

    lastOutput = iosLines.join('\n');

    const codeEl     = document.getElementById('aclCode');
    const blockEl    = document.getElementById('aclOutputBlock');
    const breakEl    = document.getElementById('aclBreakdown');
    const copyBtn    = document.getElementById('aclCopyBtn');

    if (codeEl) codeEl.textContent = lastOutput;
    if (blockEl) blockEl.classList.add('visible');
    if (copyBtn) copyBtn.style.display = '';

    if (!breakEl) return;

    if (rules.length === 0) {
      breakEl.innerHTML = '<div class="acl-placeholder"><p>No rules to show.</p></div>';
      return;
    }

    breakEl.innerHTML = rules.map((r, i) => {
      if (!r) return '';
      if (r.error) {
        return `
          <div class="acl-ace-item ace-error">
            <div class="acl-ace-top">
              <span class="acl-ace-badge badge-error">ERROR</span>
              <span class="acl-ace-syntax">${escHtml(rawLines[i] || '')}</span>
            </div>
            <div class="acl-ace-explain">${escHtml(r.error)}</div>
          </div>
        `;
      }
      const cls = `ace-${r.action}`;
      return `
        <div class="acl-ace-item ${cls}">
          <div class="acl-ace-top">
            <span class="acl-ace-badge badge-${r.action}">${r.action.toUpperCase()}</span>
            <span class="acl-ace-syntax">${escHtml(r.generatedLine)}</span>
          </div>
          <div class="acl-ace-explain">${escHtml(r.explanation)}</div>
        </div>
      `;
    }).join('');
  }

  // ── Render output for Explainer mode ─────────────────────────────────────
  function renderExplainerOutput(text) {
    const aces    = explainACL(text);
    const breakEl = document.getElementById('aclBreakdown');
    const copyBtn = document.getElementById('aclCopyBtn');
    const blockEl = document.getElementById('aclOutputBlock');

    // Build a plain-text reconstruction for copy
    lastOutput = text.trim();
    if (copyBtn) copyBtn.style.display = '';
    if (blockEl) blockEl.classList.remove('visible'); // hide code block in explainer

    if (!breakEl) return;

    if (aces.length === 0) {
      breakEl.innerHTML = '<div class="acl-placeholder"><p>No ACL lines recognized.</p></div>';
      return;
    }

    breakEl.innerHTML = aces.map(ace => {
      if (ace.type === 'header') {
        return `
          <div class="acl-ace-item ace-header">
            <div class="acl-ace-top">
              <span class="acl-ace-badge badge-header">HEADER</span>
              <span class="acl-ace-syntax">${escHtml(ace.text)}</span>
            </div>
            <div class="acl-ace-explain">${escHtml(ace.explanation)}</div>
          </div>
        `;
      }
      if (ace.type === 'remark') {
        return `
          <div class="acl-ace-item ace-remark">
            <div class="acl-ace-top">
              <span class="acl-ace-badge badge-remark">REMARK</span>
              <span class="acl-ace-syntax">${escHtml(ace.text)}</span>
            </div>
            <div class="acl-ace-explain">${escHtml(ace.explanation)}</div>
          </div>
        `;
      }
      if (ace.type === 'implicit') {
        return `
          <div class="acl-ace-item ace-implicit">
            <div class="acl-ace-top">
              <span class="acl-ace-badge badge-implicit">IMPLICIT</span>
              <span class="acl-ace-syntax">deny ip any any</span>
            </div>
            <div class="acl-ace-explain">${escHtml(ace.explanation)}</div>
          </div>
        `;
      }
      // Normal ACE
      const cls = `ace-${ace.action}`;
      return `
        <div class="acl-ace-item ${cls}">
          <div class="acl-ace-top">
            <span class="acl-ace-badge badge-${ace.action}">${ace.action.toUpperCase()}</span>
            <span class="acl-ace-syntax">${escHtml(ace.rawLine || '')}</span>
          </div>
          <div class="acl-ace-explain">${escHtml(ace.explanation)}</div>
        </div>
      `;
    }).join('');
  }

  // ── Event Binding ─────────────────────────────────────────────────────────
  function bindPanelEvents() {
    const panel = getPanel();
    if (!panel) return;

    // Mode tab switching
    panel.querySelectorAll('.acl-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentMode = tab.dataset.mode;
        render();
      });
    });

    // Line count update
    const textarea = document.getElementById('aclInput');
    const lineCount = document.getElementById('aclLineCount');
    if (textarea && lineCount) {
      const updateCount = () => {
        const lines = textarea.value.split('\n').filter(l => l.trim()).length;
        lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
      };
      textarea.addEventListener('input', updateCount);
      updateCount();
    }

    // Action button
    const actionBtn = document.getElementById('aclActionBtn');
    if (actionBtn) {
      actionBtn.addEventListener('click', runAction);
    }

    // Ctrl+Enter shortcut
    if (textarea) {
      textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          runAction();
        }
      });
    }

    // Copy button
    const copyBtn = document.getElementById('aclCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!lastOutput) return;
        const original = copyBtn.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(lastOutput).then(() => flashCopied(copyBtn, original));
        } else {
          const ta = document.createElement('textarea');
          ta.value = lastOutput;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); flashCopied(copyBtn, original); } catch (_) {}
          document.body.removeChild(ta);
        }
      });
    }

    // Tips accordion
    const tipsToggle = document.getElementById('aclTipsToggle');
    const tipsPanel  = document.getElementById('aclTipsPanel');
    if (tipsToggle && tipsPanel) {
      tipsToggle.addEventListener('click', () => {
        const isOpen = tipsPanel.classList.toggle('open');
        tipsToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
  }

  function runAction() {
    const textarea = document.getElementById('aclInput');
    if (!textarea) return;
    const text = textarea.value.trim();

    if (currentMode === 'builder') {
      const nameEl = document.getElementById('aclNameInput');
      const typeEl = document.getElementById('aclTypeSelect');
      const name   = nameEl ? nameEl.value : '';
      const type   = typeEl ? typeEl.value : 'auto';
      const lines  = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('!'));
      renderBuilderOutput(name, type, lines);
    } else {
      renderExplainerOutput(text);
    }
  }

  function flashCopied(btn, original) {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1800);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function init() {
    currentMode = 'builder';
    lastOutput  = '';
    render();
  }

  function startMode(mode) {
    if (mode === 'builder' || mode === 'explainer') {
      currentMode = mode;
    }
    render();
  }

  window.ACLBuilder = { init, startMode };

})();
