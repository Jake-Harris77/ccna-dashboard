// ─────────────────────────────────────────────────────────────────────────────
//  NetDash — Subnet Calculator
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  let currentMode    = 'info';     // 'info' | 'splitter' | 'summarizer' | 'drill'
  let currentSubMode = 'equal';    // 'equal' | 'vlsm'
  let initialized    = false;

  // ── Drill State ────────────────────────────────────────────────────────────
  let drillScore    = { correct: 0, wrong: 0, streak: 0 };
  let drillDiff     = 'mixed';   // 'easy' | 'medium' | 'hard' | 'mixed'
  let currentQ      = null;
  let drillAnswered = false;
  let drillStep     = 'octet';   // 'octet' | 'mask' | 'network'

  // ── Core Math ─────────────────────────────────────────────────────────────

  function ipToInt(ip) {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  function intToIp(n) {
    n = n >>> 0;
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8)  & 0xff,
       n         & 0xff,
    ].join('.');
  }

  function cidrToMask(cidr) {
    if (cidr === 0) return 0;
    return (0xffffffff << (32 - cidr)) >>> 0;
  }

  function toBinaryOctets(uint32) {
    uint32 = uint32 >>> 0;
    return [
      (uint32 >>> 24) & 0xff,
      (uint32 >>> 16) & 0xff,
      (uint32 >>> 8)  & 0xff,
       uint32         & 0xff,
    ].map(b => b.toString(2).padStart(8, '0'));
  }

  function ipClass(firstOctet) {
    if (firstOctet >= 1   && firstOctet <= 126) return 'A';
    if (firstOctet === 127)                     return 'A'; // Loopback treated as A
    if (firstOctet >= 128 && firstOctet <= 191) return 'B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'D';
    return 'E';
  }

  function ipType(uint32) {
    // Loopback 127.0.0.0/8
    if ((uint32 >>> 24) === 127)  return 'Loopback';
    // APIPA 169.254.0.0/16
    if ((uint32 >>> 16) === ((169 << 8) | 254)) return 'APIPA (Link-Local)';
    // RFC 1918 private
    if ((uint32 >>> 24) === 10)   return 'Private (RFC 1918)';
    if ((uint32 >>> 20) === ((172 << 4) | 1)) return 'Private (RFC 1918)'; // 172.16-31
    if ((uint32 >>> 16) === ((192 << 8) | 168)) return 'Private (RFC 1918)';
    // Multicast 224.0.0.0/4
    if ((uint32 >>> 28) === 0xe)  return 'Multicast';
    // Reserved/Experimental 240.0.0.0/4
    if ((uint32 >>> 28) === 0xf)  return 'Reserved / Experimental';
    // Documentation blocks
    if ((uint32 >>> 8) === ((192 << 16) | (0 << 8) | 2))      return 'Documentation (TEST-NET-1)';
    if ((uint32 >>> 8) === ((198 << 16) | (51 << 8) | 100))   return 'Documentation (TEST-NET-2)';
    if ((uint32 >>> 8) === ((203 << 16) | (0 << 8)  | 113))   return 'Documentation (TEST-NET-3)';
    return 'Public';
  }

  // Parse "192.168.1.50/24" or "10.0.0.0 255.0.0.0"
  function parseIPInput(str) {
    str = str.trim();
    if (!str) return null;

    // CIDR notation
    const cidrMatch = str.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if (cidrMatch) {
      const ip   = cidrMatch[1];
      const cidr = parseInt(cidrMatch[2], 10);
      if (cidr > 32) return null;
      if (!validIP(ip)) return null;
      return { ip, cidr };
    }

    // IP + mask notation
    const maskMatch = str.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (maskMatch) {
      const ip   = maskMatch[1];
      const mask = maskMatch[2];
      if (!validIP(ip) || !validIP(mask)) return null;
      const cidr = maskToCidr(mask);
      if (cidr === null) return null;
      return { ip, cidr };
    }

    return null;
  }

  function validIP(ip) {
    const parts = ip.split('.').map(Number);
    return parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255);
  }

  function maskToCidr(mask) {
    const n = ipToInt(mask);
    // Must be contiguous 1s followed by 0s
    let cidr = 0;
    let inOnes = true;
    for (let bit = 31; bit >= 0; bit--) {
      const b = (n >>> bit) & 1;
      if (inOnes && b === 1) { cidr++; }
      else if (b === 0)      { inOnes = false; }
      else                   { return null; } // non-contiguous
    }
    return cidr;
  }

  function calcNetworkInfo(ip, cidr) {
    const ipInt   = ipToInt(ip);
    const mask    = cidrToMask(cidr);
    const netInt  = (ipInt & mask) >>> 0;
    const bcast   = (netInt | (~mask >>> 0)) >>> 0;
    const wildcard = (~mask) >>> 0;

    const totalHosts  = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.pow(2, 32 - cidr);
    const usableHosts = cidr >= 31  ? totalHosts : totalHosts - 2;

    const firstHost = cidr >= 31 ? netInt  : (netInt  + 1) >>> 0;
    const lastHost  = cidr >= 31 ? bcast   : (bcast   - 1) >>> 0;

    const firstOctet = (netInt >>> 24) & 0xff;

    return {
      ip,
      cidr,
      inputIp:      ip,
      networkAddr:  intToIp(netInt),
      broadcast:    cidr <= 30 ? intToIp(bcast) : '(none — point-to-point)',
      firstHost:    intToIp(firstHost),
      lastHost:     intToIp(lastHost),
      subnetMask:   intToIp(mask),
      wildcardMask: intToIp(wildcard),
      totalHosts,
      usableHosts,
      ipClass:      ipClass(firstOctet),
      ipType:       ipType(netInt),
      hostBits:     32 - cidr,
      hostBitsSet:  (ipInt & wildcard) !== 0,
      // Binary arrays
      ipBinary:     toBinaryOctets(ipInt),
      maskBinary:   toBinaryOctets(mask),
      netBinary:    toBinaryOctets(netInt),
    };
  }

  function splitEqual(netAddr, cidr, n) {
    if (n < 1 || n > 1024) throw new Error('Number of subnets must be 1–1024.');
    const bitsNeeded = Math.ceil(Math.log2(n));
    const newCidr = cidr + bitsNeeded;
    if (newCidr > 32) throw new Error(`Cannot split /${cidr} into ${n} subnets — not enough host bits.`);

    const netInt   = ipToInt(netAddr);
    const blockSize = Math.pow(2, 32 - newCidr);
    const subnets  = [];

    for (let i = 0; i < n; i++) {
      const sNet   = (netInt + i * blockSize) >>> 0;
      const sBcast = (sNet + blockSize - 1) >>> 0;
      const sFirst = (sNet + 1) >>> 0;
      const sLast  = (sBcast - 1) >>> 0;
      const usable = newCidr >= 31 ? blockSize : blockSize - 2;

      subnets.push({
        index:     i + 1,
        network:   intToIp(sNet),
        broadcast: newCidr <= 30 ? intToIp(sBcast) : '—',
        first:     intToIp(sFirst),
        last:      intToIp(sLast),
        cidr:      newCidr,
        usable,
      });
    }
    return subnets;
  }

  // hosts: array of { name, needed }
  function calcVLSM(netAddr, cidr, hostEntries) {
    const netInt = ipToInt(netAddr);
    const totalAvail = Math.pow(2, 32 - cidr);

    // Sort largest-first
    const sorted = hostEntries.slice().sort((a, b) => b.needed - a.needed);

    let cursor = netInt;
    const netEnd = (netInt + totalAvail) >>> 0;
    const results = [];

    for (const entry of sorted) {
      // Find smallest block that fits
      let blockBits = 1;
      while (Math.pow(2, blockBits) - 2 < entry.needed && blockBits < 32) blockBits++;
      // minimum /30 for 1-2 hosts, /31 for 0-2 special
      const needed = entry.needed;
      let subCidr;
      if      (needed <= 0) subCidr = 32;
      else if (needed <= 2) subCidr = 30;
      else subCidr = 32 - blockBits;

      if (subCidr < cidr) subCidr = cidr;

      const blockSize  = Math.pow(2, 32 - subCidr);
      const sNet       = cursor >>> 0;
      const sBcast     = (sNet + blockSize - 1) >>> 0;

      if (sBcast >= netEnd || sNet >= netEnd) {
        results.push({ ...entry, error: 'Overflow — not enough address space' });
        continue;
      }

      const sFirst = (sNet + 1) >>> 0;
      const sLast  = (sBcast - 1) >>> 0;
      const usable = subCidr <= 30 ? blockSize - 2 : blockSize;

      results.push({
        name:    entry.name,
        needed:  entry.needed,
        network: intToIp(sNet),
        cidr:    subCidr,
        first:   intToIp(sFirst),
        last:    intToIp(sLast),
        usable,
        error:   null,
      });

      cursor = (sNet + blockSize) >>> 0;
    }

    return results;
  }

  // Summarize array of { networkInt, cidr } → { network, cidr, nonContiguous }
  function summarize(networks) {
    if (networks.length === 0) return null;
    if (networks.length === 1) {
      return {
        network: intToIp(networks[0].networkInt),
        cidr: networks[0].cidr,
        nonContiguous: false,
      };
    }

    let minIP = networks[0].networkInt;
    let maxIP = networks[0].networkInt;

    for (const n of networks) {
      const bcast = (n.networkInt | ~cidrToMask(n.cidr)) >>> 0;
      if (n.networkInt < minIP) minIP = n.networkInt;
      if (bcast > maxIP)        maxIP = bcast;
    }

    // XOR to find common prefix
    const diff = (minIP ^ maxIP) >>> 0;
    let prefixLen = 32;
    for (let i = 31; i >= 0; i--) {
      if ((diff >>> i) & 1) { prefixLen = 31 - i; break; }
    }
    // if diff === 0 they're all the same
    if (diff === 0) prefixLen = 32;

    const summaryNet  = (minIP & cidrToMask(prefixLen)) >>> 0;
    const summaryBcast = (summaryNet | ~cidrToMask(prefixLen)) >>> 0;

    // Non-contiguous check: does summary block cover IPs not in any input?
    // Simple heuristic: do the networks fill the summary block without gaps?
    // Sort by network address and check for gaps
    const sorted = networks.slice().sort((a, b) => a.networkInt - b.networkInt);
    let cursor = summaryNet;
    let nonContiguous = false;

    for (const n of sorted) {
      if (n.networkInt > cursor) { nonContiguous = true; break; }
      const bcast = (n.networkInt | ~cidrToMask(n.cidr)) >>> 0;
      cursor = (bcast + 1) >>> 0;
    }
    if (cursor <= summaryBcast) nonContiguous = true;

    return {
      network: intToIp(summaryNet),
      cidr:    prefixLen,
      nonContiguous,
    };
  }

  // ── HTML Helpers ──────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtNum(n) {
    return n.toLocaleString();
  }

  // ── Render: Network Info ──────────────────────────────────────────────────

  function renderInfo(container) {
    container.innerHTML = `
      <div class="sn-input-row">
        <input type="text" class="sn-input" id="snInfoInput"
          placeholder='e.g. 192.168.1.50/24  or  10.0.0.0 255.0.0.0'
          autocomplete="off" spellcheck="false" />
        <button class="sn-calc-btn" id="snInfoBtn">Calculate</button>
      </div>
      <div id="snInfoResult"></div>
    `;

    const input  = container.querySelector('#snInfoInput');
    const btn    = container.querySelector('#snInfoBtn');
    const result = container.querySelector('#snInfoResult');

    function run() {
      const parsed = parseIPInput(input.value);
      if (!parsed) {
        result.innerHTML = `<div class="sn-error">Invalid input. Use CIDR notation like <code>192.168.1.1/24</code> or IP + mask like <code>10.0.0.0 255.0.0.0</code>.</div>`;
        return;
      }
      try {
        const info = calcNetworkInfo(parsed.ip, parsed.cidr);
        result.innerHTML = buildInfoResult(info);
      } catch (e) {
        result.innerHTML = `<div class="sn-error">${esc(e.message)}</div>`;
      }
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });

    result.innerHTML = `<div class="sn-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
      <p>Enter an IP address with prefix or mask above</p>
    </div>`;
  }

  function buildInfoResult(info) {
    const hostBitsNote = info.hostBitsSet
      ? `<div class="sn-host-bits-note">Note: Host bits set in input (${esc(info.inputIp)}/${info.cidr}) — showing network address.</div>`
      : '';

    const classColors = { A: 'class-a', B: 'class-b', C: 'class-c', D: 'class-d', E: 'class-e' };
    const classColor  = classColors[info.ipClass] || '';
    const typeColor   = info.ipType.startsWith('Private') ? 'type-private'
                      : info.ipType === 'Public'          ? 'type-public'
                      : 'type-special';

    const rows = [
      ['Network Address', `<span class="mono">${esc(info.networkAddr)}</span>`],
      ['Broadcast Address', info.cidr <= 30 ? `<span class="mono">${esc(info.broadcast)}</span>` : '<span class="muted">None (point-to-point)</span>'],
      ['First Usable Host', `<span class="mono">${esc(info.firstHost)}</span>`],
      ['Last Usable Host',  `<span class="mono">${esc(info.lastHost)}</span>`],
      ['Subnet Mask',       `<span class="mono">${esc(info.subnetMask)}</span>`],
      ['Wildcard Mask',     `<span class="mono">${esc(info.wildcardMask)}</span>`],
      ['CIDR Notation',     `<span class="mono">/${info.cidr}</span>`],
      ['Total Hosts',       fmtNum(info.totalHosts)],
      ['Usable Hosts',      fmtNum(info.usableHosts)],
      ['IP Class',          `<span class="sn-class-badge ${classColor}">Class ${esc(info.ipClass)}</span>`],
      ['Type',              `<span class="sn-type-badge ${typeColor}">${esc(info.ipType)}</span>`],
      ['Host Bits',         info.hostBits],
    ];

    const gridRows = rows.map(([k, v]) => `
      <div class="sn-result-item">
        <span class="sn-result-key">${esc(k)}</span>
        <span class="sn-result-value">${v}</span>
      </div>
    `).join('');

    return `
      ${hostBitsNote}
      <div class="sn-panel">
        <div class="sn-panel-title">Network Details</div>
        <div class="sn-result-grid">${gridRows}</div>
      </div>
      ${buildBinaryDisplay(info)}
    `;
  }

  function buildBinaryDisplay(info) {
    const cidr = info.cidr;

    function renderOctetBits(octets, octetIndex) {
      const startBit = octetIndex * 8;
      return octets[octetIndex].split('').map((bit, i) => {
        const globalBit = startBit + i;
        const cls = globalBit < cidr ? 'sn-bit-net' : 'sn-bit-host';
        return `<span class="${cls}">${bit}</span>`;
      }).join('');
    }

    const buildRow = (label, octets) => `
      <div class="sn-binary-row">
        <span class="sn-bin-label">${esc(label)}</span>
        <span class="sn-bin-octets">
          <span class="sn-bin-octet">${renderOctetBits(octets, 0)}</span>.<span
              class="sn-bin-octet">${renderOctetBits(octets, 1)}</span>.<span
              class="sn-bin-octet">${renderOctetBits(octets, 2)}</span>.<span
              class="sn-bin-octet">${renderOctetBits(octets, 3)}</span>
        </span>
      </div>
    `;

    // Annotation bar widths
    const netPct  = (cidr / 32 * 100).toFixed(1);
    const hostPct = ((32 - cidr) / 32 * 100).toFixed(1);

    return `
      <div class="sn-panel sn-binary-display">
        <div class="sn-panel-title">Binary Representation</div>
        ${buildRow('IP Address', info.ipBinary)}
        ${buildRow('Subnet Mask', info.maskBinary)}
        ${buildRow('Network Addr', info.netBinary)}
        <div class="sn-binary-annotation">
          <div class="sn-annot-bar">
            <div class="sn-annot-net"  style="width:${netPct}%">← network (${cidr} bits)</div>
            <div class="sn-annot-host" style="width:${hostPct}%">host (${32 - cidr} bits) →</div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Render: Subnet Splitter ───────────────────────────────────────────────

  function renderSplitter(container) {
    container.innerHTML = `
      <div class="sn-sub-tabs" id="snSubTabs">
        <button class="sn-sub-tab ${currentSubMode === 'equal' ? 'active' : ''}" data-sub="equal">Equal Split</button>
        <button class="sn-sub-tab ${currentSubMode === 'vlsm'  ? 'active' : ''}" data-sub="vlsm">VLSM</button>
      </div>
      <div id="snSplitterPanel"></div>
    `;

    const subTabs = container.querySelector('#snSubTabs');
    const panel   = container.querySelector('#snSplitterPanel');

    subTabs.addEventListener('click', e => {
      const btn = e.target.closest('.sn-sub-tab');
      if (!btn) return;
      subTabs.querySelectorAll('.sn-sub-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSubMode = btn.dataset.sub;
      renderSplitterPanel(panel);
    });

    renderSplitterPanel(panel);
  }

  function renderSplitterPanel(panel) {
    if (currentSubMode === 'equal') {
      renderEqualSplit(panel);
    } else {
      renderVLSM(panel);
    }
  }

  function renderEqualSplit(panel) {
    panel.innerHTML = `
      <div class="sn-panel">
        <div class="sn-panel-title">Equal Split</div>
        <div class="sn-input-row">
          <input type="text" class="sn-input" id="snEqNet"
            placeholder="Network e.g. 10.0.0.0/8"
            autocomplete="off" spellcheck="false" style="flex:2" />
          <input type="number" class="sn-input sn-input-sm" id="snEqCount"
            placeholder="# subnets" min="1" max="1024" style="flex:1;max-width:130px" />
          <button class="sn-calc-btn" id="snEqBtn">Split</button>
        </div>
        <div id="snEqResult"></div>
      </div>
    `;

    const netInput  = panel.querySelector('#snEqNet');
    const cntInput  = panel.querySelector('#snEqCount');
    const btn       = panel.querySelector('#snEqBtn');
    const result    = panel.querySelector('#snEqResult');

    function run() {
      const parsed = parseIPInput(netInput.value);
      const n      = parseInt(cntInput.value, 10);

      if (!parsed) { result.innerHTML = `<div class="sn-error">Invalid network. Use e.g. <code>10.0.0.0/8</code></div>`; return; }
      if (isNaN(n) || n < 1 || n > 1024) { result.innerHTML = `<div class="sn-error">Enter a number of subnets between 1 and 1024.</div>`; return; }

      try {
        const info    = calcNetworkInfo(parsed.ip, parsed.cidr);
        const subnets = splitEqual(info.networkAddr, parsed.cidr, n);
        result.innerHTML = buildSubnetTable(subnets, false);
      } catch (e) {
        result.innerHTML = `<div class="sn-error">${esc(e.message)}</div>`;
      }
    }

    btn.addEventListener('click', run);
    [netInput, cntInput].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') run(); }));
  }

  function renderVLSM(panel) {
    panel.innerHTML = `
      <div class="sn-panel">
        <div class="sn-panel-title">VLSM Allocation</div>
        <div class="sn-input-row">
          <input type="text" class="sn-input" id="snVlsmNet"
            placeholder="Network e.g. 192.168.1.0/24"
            autocomplete="off" spellcheck="false" />
          <button class="sn-calc-btn" id="snVlsmBtn">Allocate</button>
        </div>
        <div class="sn-vlsm-hint">One subnet requirement per line: <code>Dept_A 50</code> or just <code>50</code> (max 30 entries)</div>
        <textarea class="sn-textarea" id="snVlsmHosts" rows="6"
          placeholder="Dept_A 50&#10;Dept_B 30&#10;Mgmt   10&#10;WAN     2"></textarea>
        <div id="snVlsmResult"></div>
      </div>
    `;

    const netInput = panel.querySelector('#snVlsmNet');
    const textarea = panel.querySelector('#snVlsmHosts');
    const btn      = panel.querySelector('#snVlsmBtn');
    const result   = panel.querySelector('#snVlsmResult');

    function run() {
      const parsed = parseIPInput(netInput.value);
      if (!parsed) { result.innerHTML = `<div class="sn-error">Invalid network. Use e.g. <code>192.168.1.0/24</code></div>`; return; }

      const lines = textarea.value.trim().split('\n').filter(l => l.trim());
      if (lines.length === 0) { result.innerHTML = `<div class="sn-error">Enter at least one host requirement.</div>`; return; }
      if (lines.length > 30)  { result.innerHTML = `<div class="sn-error">Maximum 30 entries allowed.</div>`; return; }

      const entries = [];
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        let name, needed;
        if (parts.length >= 2 && !isNaN(parseInt(parts[parts.length - 1], 10))) {
          name   = parts.slice(0, -1).join(' ');
          needed = parseInt(parts[parts.length - 1], 10);
        } else if (parts.length === 1 && !isNaN(parseInt(parts[0], 10))) {
          name   = `Subnet ${entries.length + 1}`;
          needed = parseInt(parts[0], 10);
        } else {
          result.innerHTML = `<div class="sn-error">Cannot parse line: <code>${esc(line)}</code>. Use format: <code>Name 50</code> or just <code>50</code></div>`;
          return;
        }
        if (needed < 1) { result.innerHTML = `<div class="sn-error">Host count must be ≥ 1.</div>`; return; }
        entries.push({ name, needed });
      }

      try {
        const info    = calcNetworkInfo(parsed.ip, parsed.cidr);
        const subnets = calcVLSM(info.networkAddr, parsed.cidr, entries);
        result.innerHTML = buildVLSMTable(subnets);
      } catch (e) {
        result.innerHTML = `<div class="sn-error">${esc(e.message)}</div>`;
      }
    }

    btn.addEventListener('click', run);
    netInput.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  }

  function buildSubnetTable(subnets, isVLSM) {
    const rows = subnets.map(s => `
      <tr>
        <td>${s.index}</td>
        <td class="mono">${esc(s.network)}/${s.cidr}</td>
        <td class="mono">${esc(s.broadcast)}</td>
        <td class="mono">${esc(s.first)}</td>
        <td class="mono">${esc(s.last)}</td>
        <td>${fmtNum(s.usable)}</td>
      </tr>
    `).join('');

    return `
      <div class="sn-table-wrapper">
        <table class="sn-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Network / CIDR</th>
              <th>Broadcast</th>
              <th>First Host</th>
              <th>Last Host</th>
              <th>Usable</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function buildVLSMTable(subnets) {
    const rows = subnets.map((s, i) => {
      if (s.error) {
        return `<tr>
          <td>${esc(s.name)}</td>
          <td>${s.needed}</td>
          <td colspan="4" class="sn-error-cell">${esc(s.error)}</td>
        </tr>`;
      }
      return `<tr>
        <td>${esc(s.name)}</td>
        <td>${s.needed}</td>
        <td class="mono">${esc(s.network)}/${s.cidr}</td>
        <td class="mono">${esc(s.first)}</td>
        <td class="mono">${esc(s.last)}</td>
        <td>${fmtNum(s.usable)}</td>
      </tr>`;
    }).join('');

    return `
      <div class="sn-table-wrapper">
        <table class="sn-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hosts Needed</th>
              <th>Allocated Subnet</th>
              <th>First Host</th>
              <th>Last Host</th>
              <th>Usable</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // ── Render: Summarizer ────────────────────────────────────────────────────

  function renderSummarizer(container) {
    container.innerHTML = `
      <div class="sn-layout">
        <div class="sn-panel">
          <div class="sn-panel-title">Input Networks</div>
          <div class="sn-vlsm-hint">One network per line. CIDR or IP + mask format.</div>
          <textarea class="sn-textarea" id="snSumInput" rows="8"
            placeholder="192.168.1.0/24&#10;192.168.2.0/24&#10;192.168.3.0/24"></textarea>
          <div class="sn-input-row" style="margin-top:4px">
            <button class="sn-calc-btn" id="snSumBtn" style="width:100%">Summarize</button>
          </div>
        </div>
        <div class="sn-panel" id="snSumResult">
          <div class="sn-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8M12 8l4 4-4 4"/>
            </svg>
            <p>Enter networks to summarize</p>
          </div>
        </div>
      </div>
    `;

    const textarea = container.querySelector('#snSumInput');
    const btn      = container.querySelector('#snSumBtn');
    const result   = container.querySelector('#snSumResult');

    function run() {
      const lines = textarea.value.split('\n').filter(l => l.trim());

      if (lines.length === 0) {
        result.innerHTML = `<div class="sn-placeholder"><p>Enter at least one network.</p></div>`;
        return;
      }

      const parsed = [];
      const badges = lines.map(line => {
        const p = parseIPInput(line.trim());
        if (!p) return { line, valid: false };
        const info = calcNetworkInfo(p.ip, p.cidr);
        parsed.push({ networkInt: ipToInt(info.networkAddr), cidr: p.cidr });
        return { line, valid: true, display: `${info.networkAddr}/${p.cidr}` };
      });

      const validNets = parsed;
      let summaryHtml = '';

      if (validNets.length === 0) {
        summaryHtml = `<div class="sn-error">No valid networks found.</div>`;
      } else {
        const s = summarize(validNets);
        const warnHtml = s.nonContiguous
          ? `<div class="sn-warning-box">
              <strong>Warning:</strong> Networks are non-contiguous — the summary block
              <code>${esc(s.network)}/${s.cidr}</code> covers address space not included in your inputs.
             </div>`
          : '';
        summaryHtml = `
          <div class="sn-panel-title">Summary Result</div>
          <div class="sn-summary-result">
            <span class="sn-summary-label">Supernet</span>
            <span class="sn-summary-value mono">${esc(s.network)}/${s.cidr}</span>
          </div>
          <div class="sn-summary-result">
            <span class="sn-summary-label">Subnet Mask</span>
            <span class="sn-summary-value mono">${esc(intToIp(cidrToMask(s.cidr)))}</span>
          </div>
          <div class="sn-summary-result">
            <span class="sn-summary-label">Total Addresses</span>
            <span class="sn-summary-value">${fmtNum(Math.pow(2, 32 - s.cidr))}</span>
          </div>
          ${warnHtml}
        `;
      }

      const badgeList = badges.map(b => `
        <div class="sn-sum-entry">
          <span class="${b.valid ? 'sn-valid-badge' : 'sn-invalid-badge'}">${b.valid ? 'Valid' : 'Invalid'}</span>
          <span class="sn-sum-line ${b.valid ? 'mono' : 'muted'}">${esc(b.valid ? b.display : b.line)}</span>
        </div>
      `).join('');

      result.innerHTML = `
        ${summaryHtml}
        <div class="sn-panel-title" style="margin-top:16px">Parsed Inputs</div>
        <div class="sn-sum-entries">${badgeList}</div>
      `;
    }

    btn.addEventListener('click', run);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); run(); }
    });
  }

  // ── Render: Octet Drill ───────────────────────────────────────────────────

  function generateQuestion(difficulty) {
    const pools = {
      easy:   [24, 25, 26, 30],
      medium: [25, 26, 27, 28, 29, 30],
      hard:   [17, 18, 19, 20, 21, 22, 23],
      mixed:  [17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30],
    };
    const pool = pools[difficulty] || pools.mixed;
    const cidr = pool[Math.floor(Math.random() * pool.length)];

    const maskInt    = cidrToMask(cidr);
    const maskOctArr = [
      (maskInt >>> 24) & 0xff,
      (maskInt >>> 16) & 0xff,
      (maskInt >>>  8) & 0xff,
       maskInt         & 0xff,
    ];

    const interestingOctetIdx = cidr < 24 ? 2 : 3;     // 0-indexed
    const interestingOctet    = interestingOctetIdx + 1; // 1-indexed
    const maskOctetVal        = maskOctArr[interestingOctetIdx];
    const blockSize           = 256 - maskOctetVal;

    let ip, octetValue, networkOctet;

    if (interestingOctetIdx === 2) {
      // 3rd-octet drill — use 172.16.x.y
      const numBlocks = Math.floor(256 / blockSize);
      const blockIdx  = Math.floor(Math.random() * numBlocks);
      const thirdNet  = blockIdx * blockSize;
      const thirdHost = 1 + Math.floor(Math.random() * (blockSize - 1));
      const fourth    = Math.floor(Math.random() * 256);
      octetValue      = thirdNet + thirdHost;
      networkOctet    = thirdNet;
      ip              = `172.16.${octetValue}.${fourth}`;
    } else {
      // 4th-octet drill — use 192.168.z.x
      const third     = 1 + Math.floor(Math.random() * 254);
      const numBlocks = Math.floor(256 / blockSize);
      const blockIdx  = Math.floor(Math.random() * numBlocks);
      const fourthNet = blockIdx * blockSize;
      const hostPart  = 1 + Math.floor(Math.random() * Math.max(1, blockSize - 2));
      octetValue      = fourthNet + hostPart;
      networkOctet    = fourthNet;
      ip              = `192.168.${third}.${octetValue}`;
    }

    const info = calcNetworkInfo(ip, cidr);
    return { ip, cidr, networkAddr: info.networkAddr, interestingOctet, maskOctetVal, blockSize, octetValue, networkOctet,
             firstHost: info.firstHost, lastHost: info.lastHost, broadcast: info.broadcast };
  }

  function buildExplanation(q) {
    const ordinals  = ['', '1st', '2nd', '3rd', '4th'];
    const octetName = ordinals[q.interestingOctet] || `${q.interestingOctet}th`;
    const multiple  = Math.floor(q.octetValue / q.blockSize);
    const remainder = q.octetValue - multiple * q.blockSize;

    const steps = [
      `Interesting octet: <strong>${octetName}</strong>`,
      `Mask value in that octet: <strong>${q.maskOctetVal}</strong>`,
      `Block size: 256 &minus; ${q.maskOctetVal} = <strong>${q.blockSize}</strong>`,
      `Your octet value: <strong>${q.octetValue}</strong>`,
      `${q.octetValue} &divide; ${q.blockSize} = ${multiple} remainder ${remainder}&thinsp;&rarr;&thinsp;nearest multiple: ${multiple} &times; ${q.blockSize} = <strong>${q.networkOctet}</strong>`,
      `Network address: <strong class="sn-expl-net">${esc(q.networkAddr)}/${q.cidr}</strong>`,
    ];

    const stepsHtml = steps.map((text, i) =>
      `<div class="sn-drill-step"><span class="sn-step-num">${i + 1}</span><span>${text}</span></div>`
    ).join('');

    return `<div class="sn-drill-explanation">${stepsHtml}</div>`;
  }

  function buildRevealSection(q) {
    const rows = [
      ['First Host',  q.firstHost],
      ['Last Host',   q.lastHost],
      ['Broadcast',   q.broadcast],
    ];
    const rowsHtml = rows.map(([label, val]) => `
      <div class="sn-reveal-row">
        <span class="sn-reveal-label">${label}</span>
        <button class="sn-reveal-btn" data-value="${esc(val)}">Tap to reveal</button>
      </div>
    `).join('');

    const maskInt     = cidrToMask(q.cidr);
    const wildcardInt = (~maskInt) >>> 0;
    const wildcard    = intToIp(wildcardInt);
    const maskOctets  = intToIp(maskInt).split('.');
    const hintRows    = maskOctets.map(o =>
      `<div class="sn-drill-step"><span class="sn-step-num">&minus;</span> 255 &minus; ${o} = <strong>${255 - parseInt(o)}</strong></div>`
    ).join('');

    const wildcardRow = `
      <div class="sn-wc-block">
        <div class="sn-reveal-row">
          <div class="sn-wc-label-group">
            <span class="sn-reveal-label">Wildcard Mask</span>
            <button class="sn-hint-toggle sn-wc-hint-btn">&#128161; Hint</button>
          </div>
          <button class="sn-reveal-btn" data-value="${esc(wildcard)}">Tap to reveal</button>
        </div>
        <div class="sn-hint-body sn-wc-hint-body" style="display:none">
          <div class="sn-wc-hint-label">Subtract each octet from 255:</div>
          ${hintRows}
        </div>
      </div>
    `;

    return `<div class="sn-drill-reveal-section"><div class="sn-reveal-title">Network Range</div>${rowsHtml}${wildcardRow}</div>`;
  }

  function renderDrill(container) {
    drillScore    = { correct: 0, wrong: 0, streak: 0 };
    drillStep     = 'octet';
    currentQ      = generateQuestion(drillDiff);
    drillAnswered = false;
    renderDrillInner(container);
  }

  function renderDrillInner(container) {
    const maskStr  = intToIp(cidrToMask(currentQ.cidr));
    const ord      = ['', '1st', '2nd', '3rd', '4th'];
    const oName    = ord[currentQ.interestingOctet];

    const stepTitles = {
      octet:   'Step 1 of 3 &mdash; Interesting Octet',
      mask:    'Step 2 of 3 &mdash; Subnet Mask',
      network: 'Step 3 of 3 &mdash; Network Address',
    };
    const stepOrder = { octet: 0, mask: 1, network: 2 };
    const idx = stepOrder[drillStep];

    const dots = ['octet', 'mask', 'network'].map((s, i) =>
      `<span class="sn-step-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}"></span>`
    ).join('');

    let questionBlock, placeholder;
    if (drillStep === 'octet') {
      questionBlock = `
        <div class="sn-drill-question">
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">IP:</span>
            <span class="sn-drill-ip-value mono">${esc(currentQ.ip)}</span>
          </div>
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">Prefix:</span>
            <span class="sn-drill-ip-value mono">/${currentQ.cidr}</span>
          </div>
        </div>
        <div class="sn-drill-prompt">Which octet is the <strong>interesting</strong> octet?</div>
      `;
      placeholder = 'e.g. 3  or  3rd';
    } else if (drillStep === 'mask') {
      const maskInt32  = cidrToMask(currentQ.cidr);
      const bin32      = maskInt32.toString(2).padStart(32, '0');
      const binDotted  = bin32.match(/.{8}/g).join('.');
      const hostBits   = 32 - currentQ.cidr;
      questionBlock = `
        <div class="sn-drill-question">
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">IP:</span>
            <span class="sn-drill-ip-value mono">${esc(currentQ.ip)}</span>
          </div>
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">Prefix:</span>
            <span class="sn-drill-ip-value mono">/${currentQ.cidr}</span>
          </div>
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">Int. octet:</span>
            <span class="sn-drill-ip-value mono">${oName}</span>
          </div>
        </div>
        <div class="sn-drill-prompt">What is the subnet mask?</div>
        <div class="sn-hint-wrap">
          <button class="sn-hint-toggle" id="snDrillMaskHintBtn" aria-expanded="false">
            <span class="sn-hint-icon">&#128161;</span> Show hint
          </button>
          <div class="sn-hint-body" id="snDrillMaskHint" style="display:none">
            <div class="sn-drill-step"><span class="sn-step-num">1</span> /${currentQ.cidr} = <strong>${currentQ.cidr}</strong> network bits, <strong>${hostBits}</strong> host bits</div>
            <div class="sn-drill-step"><span class="sn-step-num">2</span> Binary: <span class="mono sn-tn-binary">${binDotted}</span></div>
            <div class="sn-drill-step"><span class="sn-step-num">3</span> Decimal: <span class="mono sn-expl-net">${esc(maskStr)}</span></div>
          </div>
        </div>
      `;
      placeholder = 'e.g. 255.255.240.0';
    } else {
      const q         = currentQ;
      const quotient  = Math.floor(q.octetValue / q.blockSize);
      const decimal   = (q.octetValue / q.blockSize).toFixed(2);
      questionBlock = `
        <div class="sn-drill-question">
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">IP:</span>
            <span class="sn-drill-ip-value mono">${esc(q.ip)}</span>
          </div>
          <div class="sn-drill-ip-row">
            <span class="sn-drill-ip-label">Mask:</span>
            <span class="sn-drill-ip-value mono">/${q.cidr}&ensp;(${esc(maskStr)})</span>
          </div>
        </div>
        <div class="sn-drill-prompt">What is the network address?</div>
        <div class="sn-hint-wrap">
          <button class="sn-hint-toggle" id="snDrillHintBtn" aria-expanded="false">
            <span class="sn-hint-icon">&#128161;</span> Show division method hint
          </button>
          <div class="sn-hint-body" id="snDrillHint" style="display:none">
            <div class="sn-drill-step"><span class="sn-step-num">1</span> Block size: 256 &minus; ${q.maskOctetVal} = <strong>${q.blockSize}</strong></div>
            <div class="sn-drill-step"><span class="sn-step-num">2</span> Divide: ${q.octetValue} &divide; ${q.blockSize} = ${decimal} &rarr; floor = <strong>${quotient}</strong></div>
            <div class="sn-drill-step"><span class="sn-step-num">3</span> Multiply: ${quotient} &times; ${q.blockSize} = <strong>${q.networkOctet}</strong></div>
            <div class="sn-drill-step"><span class="sn-step-num">4</span> Replace ${oName} octet &rarr; <span class="mono sn-expl-net">${esc(q.networkAddr)}/${q.cidr}</span></div>
          </div>
        </div>
      `;
      placeholder = `e.g. ${esc(q.networkAddr)}  or  ${esc(q.networkAddr)}/${q.cidr}`;
    }

    container.innerHTML = `
      <div class="sn-drill-score-bar">
        <span class="sn-score-chip sn-chip-correct">&#10003; ${drillScore.correct} correct</span>
        <span class="sn-score-chip sn-chip-wrong">&#10007; ${drillScore.wrong} wrong</span>
        <span class="sn-score-chip sn-chip-streak">streak: ${drillScore.streak}</span>
      </div>

      <div class="sn-panel sn-drill-card">
        <div class="sn-drill-header">
          <div class="sn-drill-title-group">
            <span class="sn-panel-title">${stepTitles[drillStep]}</span>
            <div class="sn-step-dots">${dots}</div>
          </div>
          <select class="sn-diff-select" id="snDrillDiff">
            <option value="mixed"  ${drillDiff === 'mixed'  ? 'selected' : ''}>Mixed</option>
            <option value="easy"   ${drillDiff === 'easy'   ? 'selected' : ''}>Easy</option>
            <option value="medium" ${drillDiff === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard"   ${drillDiff === 'hard'   ? 'selected' : ''}>Hard</option>
          </select>
        </div>

        ${questionBlock}

        <div class="sn-drill-input-row">
          <input type="text" class="sn-drill-answer" id="snDrillAnswer"
            placeholder="${placeholder}"
            autocomplete="off" spellcheck="false" />
          <button class="sn-check-btn" id="snDrillCheck">Check</button>
          <button class="sn-skip-btn"  id="snDrillSkip">Skip</button>
        </div>

        <div class="sn-drill-feedback" id="snDrillFeedback" style="display:none"></div>
      </div>
    `;
    wireDrillEvents(container);
  }

  function wireDrillEvents(container) {
    const diffSelect  = container.querySelector('#snDrillDiff');
    const answerInput = container.querySelector('#snDrillAnswer');
    const checkBtn    = container.querySelector('#snDrillCheck');
    const skipBtn     = container.querySelector('#snDrillSkip');
    const feedback    = container.querySelector('#snDrillFeedback');
    const ord         = ['', '1st', '2nd', '3rd', '4th'];
    const oName       = ord[currentQ.interestingOctet];

    diffSelect.addEventListener('change', () => {
      drillDiff     = diffSelect.value;
      drillScore    = { correct: 0, wrong: 0, streak: 0 };
      drillStep     = 'octet';
      currentQ      = generateQuestion(drillDiff);
      drillAnswered = false;
      renderDrillInner(container);
    });

    function updateScoreBar() {
      container.querySelector('.sn-chip-correct').textContent = `\u2713 ${drillScore.correct} correct`;
      container.querySelector('.sn-chip-wrong').textContent   = `\u2717 ${drillScore.wrong} wrong`;
      container.querySelector('.sn-chip-streak').textContent  = `streak: ${drillScore.streak}`;
    }

    function showFeedback(html) {
      feedback.innerHTML = html;
      feedback.style.display = '';
      feedback.querySelector('#snDrillNext').addEventListener('click', doNext);
      feedback.querySelectorAll('.sn-reveal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.textContent = btn.dataset.value;
          btn.classList.add('sn-revealed');
          btn.disabled = true;
        });
      });
      feedback.querySelectorAll('.sn-wc-hint-btn').forEach(btn => {
        const body = btn.closest('.sn-wc-block').querySelector('.sn-wc-hint-body');
        btn.addEventListener('click', () => {
          const visible = body.style.display !== 'none';
          body.style.display = visible ? 'none' : '';
          btn.innerHTML = visible ? '&#128161; Hint' : '&#128161; Hide hint';
        });
      });
      checkBtn.disabled = true;
      skipBtn.disabled  = true;
    }

    function doCheck() {
      if (drillAnswered) return;
      const raw = answerInput.value.trim();
      if (!raw) return;
      drillAnswered = true;

      if (drillStep === 'octet') {
        const n         = parseInt(raw.replace(/[^0-9]/g, ''), 10);
        const isCorrect = n === currentQ.interestingOctet;
        showFeedback(`
          <div class="${isCorrect ? 'sn-feedback-correct' : 'sn-feedback-wrong'}">
            <div class="sn-feedback-title">${isCorrect
              ? `&#10003; Correct! &mdash; the <strong>${oName}</strong> octet`
              : `&#10007; Wrong &mdash; the interesting octet is the <strong>${oName}</strong>`
            }</div>
            <button class="sn-next-btn" id="snDrillNext">Continue to Subnet Mask &rarr;</button>
          </div>
        `);
      } else if (drillStep === 'mask') {
        const correct   = intToIp(cidrToMask(currentQ.cidr));
        const isCorrect = raw === correct;
        showFeedback(`
          <div class="${isCorrect ? 'sn-feedback-correct' : 'sn-feedback-wrong'}">
            <div class="sn-feedback-title">${isCorrect
              ? '&#10003; Correct!'
              : `&#10007; Wrong &mdash; subnet mask is <span class="mono">${esc(correct)}</span>`
            }</div>
            <button class="sn-next-btn" id="snDrillNext">Continue to Network Address &rarr;</button>
          </div>
        `);
      } else {
        const normalized = raw.replace(/\/\d+$/, '').trim();
        const correct    = currentQ.networkAddr;
        if (normalized === correct) {
          drillScore.correct++;
          drillScore.streak++;
          updateScoreBar();
          showFeedback(`
            <div class="sn-feedback-correct">
              <div class="sn-feedback-title">&#10003; Correct!</div>
              ${buildExplanation(currentQ)}
              ${buildRevealSection(currentQ)}
              <button class="sn-next-btn" id="snDrillNext">Next Question &rarr;</button>
            </div>
          `);
        } else {
          drillScore.wrong++;
          drillScore.streak = 0;
          updateScoreBar();
          showFeedback(`
            <div class="sn-feedback-wrong">
              <div class="sn-feedback-title">&#10007; Wrong &mdash; correct answer: <span class="mono">${esc(correct)}/${currentQ.cidr}</span></div>
              ${buildExplanation(currentQ)}
              ${buildRevealSection(currentQ)}
              <button class="sn-next-btn" id="snDrillNext">Next Question &rarr;</button>
            </div>
          `);
        }
      }
    }

    function doSkip() {
      if (drillAnswered) return;
      drillAnswered = true;
      if (drillStep === 'octet') {
        showFeedback(`
          <div class="sn-feedback-wrong">
            <div class="sn-feedback-title">Skipped &mdash; interesting octet is the <span class="mono">${oName}</span></div>
            <button class="sn-next-btn" id="snDrillNext">Continue to Subnet Mask &rarr;</button>
          </div>
        `);
      } else if (drillStep === 'mask') {
        const correct = intToIp(cidrToMask(currentQ.cidr));
        showFeedback(`
          <div class="sn-feedback-wrong">
            <div class="sn-feedback-title">Skipped &mdash; subnet mask is <span class="mono">${esc(correct)}</span></div>
            <button class="sn-next-btn" id="snDrillNext">Continue to Network Address &rarr;</button>
          </div>
        `);
      } else {
        showFeedback(`
          <div class="sn-feedback-wrong">
            <div class="sn-feedback-title">Skipped &mdash; correct answer: <span class="mono">${esc(currentQ.networkAddr)}/${currentQ.cidr}</span></div>
            ${buildExplanation(currentQ)}
            ${buildRevealSection(currentQ)}
            <button class="sn-next-btn" id="snDrillNext">Next Question &rarr;</button>
          </div>
        `);
      }
    }

    function doNext() {
      drillAnswered = false;
      if (drillStep === 'octet') {
        drillStep = 'mask';
        renderDrillInner(container);
      } else if (drillStep === 'mask') {
        drillStep = 'network';
        renderDrillInner(container);
      } else {
        drillStep = 'octet';
        currentQ  = generateQuestion(drillDiff);
        renderDrillInner(container);
      }
    }

    checkBtn.addEventListener('click', doCheck);
    skipBtn.addEventListener('click', doSkip);
    answerInput.addEventListener('keydown', e => { if (e.key === 'Enter') doCheck(); });

    const hintBtn  = container.querySelector('#snDrillHintBtn');
    const hintBody = container.querySelector('#snDrillHint');
    if (hintBtn && hintBody) {
      hintBtn.addEventListener('click', () => {
        const visible = hintBody.style.display !== 'none';
        hintBody.style.display = visible ? 'none' : '';
        hintBtn.setAttribute('aria-expanded', String(!visible));
        hintBtn.innerHTML = visible
          ? '<span class="sn-hint-icon">&#128161;</span> Show division method hint'
          : '<span class="sn-hint-icon">&#128161;</span> Hide hint';
      });
    }

    const maskHintBtn  = container.querySelector('#snDrillMaskHintBtn');
    const maskHintBody = container.querySelector('#snDrillMaskHint');
    if (maskHintBtn && maskHintBody) {
      maskHintBtn.addEventListener('click', () => {
        const visible = maskHintBody.style.display !== 'none';
        maskHintBody.style.display = visible ? 'none' : '';
        maskHintBtn.setAttribute('aria-expanded', String(!visible));
        maskHintBtn.innerHTML = visible
          ? '<span class="sn-hint-icon">&#128161;</span> Show hint'
          : '<span class="sn-hint-icon">&#128161;</span> Hide hint';
      });
    }

    answerInput.focus();
  }

  // ── 2ⁿ Logic Drill ───────────────────────────────────────────────────────

  let tnScore    = { correct: 0, wrong: 0, streak: 0 };
  let tnDiff     = 'mixed';
  let tnQuestion = null;
  let tnStep     = 0;       // 0-4
  let tnAnswered = false;
  let tnContext  = {};      // accumulated correct answers for progressive context

  function generateTnQuestion(difficulty) {
    const pools = {
      easy:   [24, 25, 26, 30],
      medium: [25, 26, 27, 28, 29, 30],
      hard:   [17, 18, 19, 20, 21, 22, 23],
      mixed:  [17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30],
    };
    const pool = pools[difficulty] || pools.mixed;
    const cidr = pool[Math.floor(Math.random() * pool.length)];

    const maskInt    = cidrToMask(cidr);
    const maskOctArr = [
      (maskInt >>> 24) & 0xff,
      (maskInt >>> 16) & 0xff,
      (maskInt >>>  8) & 0xff,
       maskInt         & 0xff,
    ];

    const interestingOctetIdx = cidr < 24 ? 2 : 3;
    const interestingOctet    = interestingOctetIdx + 1;
    const maskOctetVal        = maskOctArr[interestingOctetIdx];

    let zeroBits = 0;
    for (let b = 0; b < 8; b++) {
      if (((maskOctetVal >> b) & 1) === 0) zeroBits++;
    }

    const twoToN           = Math.pow(2, zeroBits);
    const blockSize        = twoToN;
    const startingNet      = interestingOctetIdx === 2 ? '172.16.0.0' : '192.168.1.0';
    const numBlocksInOctet = Math.floor(256 / blockSize);
    const numNextNetworks  = Math.min(3, numBlocksInOctet - 1);
    const startParts       = startingNet.split('.').map(Number);
    const nextNetworks     = [];
    for (let i = 1; i <= numNextNetworks; i++) {
      const p = startParts.slice();
      p[interestingOctetIdx] = i * blockSize;
      nextNetworks.push(p.join('.'));
    }

    return { cidr, maskOctetVal, interestingOctet, interestingOctetIdx, zeroBits, twoToN, blockSize, startingNet, numNextNetworks, nextNetworks };
  }

  function renderTnLogic(container) {
    tnScore    = { correct: 0, wrong: 0, streak: 0 };
    tnStep     = 0;
    tnContext  = {};
    tnQuestion = generateTnQuestion(tnDiff);
    tnAnswered = false;
    renderTnInner(container);
  }

  function renderTnInner(container) {
    const q = tnQuestion;

    // Progressive context rows
    const ctxRows = [`
      <div class="sn-drill-ip-row">
        <span class="sn-drill-ip-label">Prefix:</span>
        <span class="sn-drill-ip-value mono">/${q.cidr}</span>
      </div>
    `];
    if (tnContext.interestingOctet !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Int. octet:</span>
          <span class="sn-drill-ip-value mono">${tnContext.interestingOctet === 3 ? '3rd' : '4th'}</span>
        </div>
      `);
    }
    if (tnContext.zeroBits !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Mask bits:</span>
          <span class="sn-drill-ip-value mono sn-tn-binary">${tnContext.maskBinary}</span>
        </div>
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">n =</span>
          <span class="sn-drill-ip-value mono">${tnContext.zeroBits} zero bit${tnContext.zeroBits !== 1 ? 's' : ''}</span>
        </div>
      `);
    }
    if (tnContext.twoToN !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">2ⁿ =</span>
          <span class="sn-drill-ip-value mono">${tnContext.twoToN}</span>
        </div>
      `);
    }
    if (tnContext.blockSize !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Block size:</span>
          <span class="sn-drill-ip-value mono">${tnContext.blockSize}</span>
        </div>
      `);
    }

    const lastStep  = q.numNextNetworks > 0 ? 4 : 3;
    const totalSteps = lastStep + 1;
    const suffix    = ['st','nd','rd'];
    const nLabel    = q.numNextNetworks === 1 ? 'next network address' : `next ${q.numNextNetworks} network addresses`;

    const stepLabels = [
      `Step 1 of ${totalSteps} &mdash; Interesting Octet`,
      `Step 2 of ${totalSteps} &mdash; Zero Bits`,
      `Step 3 of ${totalSteps} &mdash; 2ⁿ Value`,
      `Step 4 of ${totalSteps} &mdash; Block Size`,
      `Step 5 of ${totalSteps} &mdash; Next Networks`,
    ];

    const stepPrompts = [
      'Which octet is the <strong>interesting octet</strong>?',
      'How many <strong>zero bits</strong> are in that octet?',
      'What is <strong>2ⁿ</strong>?',
      'What is the <strong>block size</strong>?',
      `Starting at <span class="mono">${esc(q.startingNet)}/${q.cidr}</span>, what are the <strong>${nLabel}</strong>?`,
    ];

    const netPh = q.interestingOctet === 3 ? '172.16.x.0' : '192.168.1.x';

    const inputArea = tnStep === 4 ? `
      <div class="sn-tn-net-inputs">
        ${Array.from({ length: q.numNextNetworks }, (_, i) => `
          <div class="sn-tn-net-row">
            <span class="sn-tn-net-label">${i + 1}${suffix[i]} next:</span>
            <input type="text" class="sn-drill-answer sn-tn-net-input" id="snTnNet${i}"
              placeholder="${netPh}" autocomplete="off" spellcheck="false" />
          </div>
        `).join('')}
      </div>
      <div class="sn-drill-input-row">
        <button class="sn-check-btn" id="snTnCheck">Check</button>
        <button class="sn-skip-btn"  id="snTnSkip">Skip</button>
      </div>
    ` : `
      <div class="sn-drill-input-row">
        <input type="text" class="sn-drill-answer" id="snTnAnswer"
          placeholder="${['e.g. 3rd  or  4th','e.g. 4','e.g. 16','e.g. 16',''][tnStep]}"
          autocomplete="off" spellcheck="false" />
        <button class="sn-check-btn" id="snTnCheck">Check</button>
        <button class="sn-skip-btn"  id="snTnSkip">Skip</button>
      </div>
    `;

    const dots = Array.from({ length: totalSteps }, (_, i) =>
      `<span class="sn-step-dot ${i < tnStep ? 'done' : i === tnStep ? 'active' : ''}"></span>`
    ).join('');

    container.innerHTML = `
      <div class="sn-drill-score-bar">
        <span class="sn-score-chip sn-chip-correct">&#10003; ${tnScore.correct} correct</span>
        <span class="sn-score-chip sn-chip-wrong">&#10007; ${tnScore.wrong} wrong</span>
        <span class="sn-score-chip sn-chip-streak">streak: ${tnScore.streak}</span>
      </div>

      <div class="sn-panel sn-drill-card">
        <div class="sn-drill-header">
          <div class="sn-drill-title-group">
            <span class="sn-panel-title">${stepLabels[tnStep]}</span>
            <div class="sn-step-dots">${dots}</div>
          </div>
          <select class="sn-diff-select" id="snTnDiff">
            <option value="mixed"  ${tnDiff === 'mixed'  ? 'selected' : ''}>Mixed</option>
            <option value="easy"   ${tnDiff === 'easy'   ? 'selected' : ''}>Easy</option>
            <option value="medium" ${tnDiff === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard"   ${tnDiff === 'hard'   ? 'selected' : ''}>Hard</option>
          </select>
        </div>

        <div class="sn-drill-question">${ctxRows.join('')}</div>

        <div class="sn-drill-prompt">${stepPrompts[tnStep]}</div>

        ${tnStep === 1 ? (() => {
          const classBoundary      = (q.interestingOctet - 1) * 8;
          const networkBitsInOctet = q.cidr - classBoundary;
          const oName              = q.interestingOctet === 3 ? '3rd' : '4th';
          return `
            <div class="sn-hint-wrap">
              <button class="sn-hint-toggle" id="snTnHintBtn" aria-expanded="false">
                <span class="sn-hint-icon">&#128161;</span> Show hint
              </button>
              <div class="sn-hint-body" id="snTnHint" style="display:none">
                <div class="sn-drill-step"><span class="sn-step-num">1</span> Class boundary for ${oName} octet: <strong>/${classBoundary}</strong></div>
                <div class="sn-drill-step"><span class="sn-step-num">2</span> Subnet bits in octet: ${q.cidr} &minus; ${classBoundary} = <strong>${networkBitsInOctet}</strong></div>
                <div class="sn-drill-step"><span class="sn-step-num">3</span> Zero bits: 8 &minus; ${networkBitsInOctet} = <strong>${q.zeroBits}</strong></div>
              </div>
            </div>
          `;
        })() : ''}

        ${inputArea}

        <div class="sn-tn-feedback" id="snTnFeedback" style="display:none"></div>
      </div>
    `;
    wireTnEvents(container);
  }

  function wireTnEvents(container) {
    const q          = tnQuestion;
    const diffSel    = container.querySelector('#snTnDiff');
    const feedback   = container.querySelector('#snTnFeedback');
    const checkBtn   = container.querySelector('#snTnCheck');
    const skipBtn    = container.querySelector('#snTnSkip');
    const ansInput   = container.querySelector('#snTnAnswer');
    const netInputs  = container.querySelectorAll('.sn-tn-net-input');

    diffSel.addEventListener('change', () => {
      tnDiff     = diffSel.value;
      tnScore    = { correct: 0, wrong: 0, streak: 0 };
      tnStep     = 0;
      tnContext  = {};
      tnQuestion = generateTnQuestion(tnDiff);
      tnAnswered = false;
      renderTnInner(container);
    });

    function updateScoreBar() {
      container.querySelector('.sn-chip-correct').textContent = `\u2713 ${tnScore.correct} correct`;
      container.querySelector('.sn-chip-wrong').textContent   = `\u2717 ${tnScore.wrong} wrong`;
      container.querySelector('.sn-chip-streak').textContent  = `streak: ${tnScore.streak}`;
    }

    function showFeedback(html) {
      feedback.innerHTML = html;
      feedback.style.display = '';
      feedback.querySelector('#snTnNext').addEventListener('click', doNext);
      checkBtn.disabled = true;
      skipBtn.disabled  = true;
    }

    function revealContext() {
      if      (tnStep === 0) { tnContext.interestingOctet = q.interestingOctet; }
      else if (tnStep === 1) { tnContext.zeroBits = q.zeroBits; tnContext.maskBinary = q.maskOctetVal.toString(2).padStart(8, '0'); }
      else if (tnStep === 2) { tnContext.twoToN    = q.twoToN; }
      else if (tnStep === 3) { tnContext.blockSize = q.blockSize; }
    }

    function doCheck() {
      if (tnAnswered) return;
      if (tnStep === 4) {
        if (Array.from(netInputs).some(i => !i.value.trim())) return;
      } else {
        if (!ansInput.value.trim()) return;
      }
      tnAnswered = true;

      let isCorrect = false;
      let detail    = '';

      if (tnStep === 0) {
        const n = parseInt(ansInput.value.replace(/[^0-9]/g, ''), 10);
        isCorrect = n === q.interestingOctet;
        const oName = q.interestingOctet === 3 ? '3rd' : '4th';
        detail = isCorrect
          ? `The ${oName} octet contains mixed network/host bits.`
          : `The interesting octet is the <strong>${oName}</strong>.`;

      } else if (tnStep === 1) {
        isCorrect = parseInt(ansInput.value.trim(), 10) === q.zeroBits;
        const bin = q.maskOctetVal.toString(2).padStart(8, '0');
        detail = isCorrect
          ? `<span class="mono">${bin}</span> has ${q.zeroBits} zero bit${q.zeroBits !== 1 ? 's' : ''}.`
          : `<span class="mono">${bin}</span> has <strong>${q.zeroBits}</strong> zero bit${q.zeroBits !== 1 ? 's' : ''}.`;

      } else if (tnStep === 2) {
        isCorrect = parseInt(ansInput.value.trim(), 10) === q.twoToN;
        detail = isCorrect
          ? `2<sup>${q.zeroBits}</sup> = ${q.twoToN}.`
          : `2<sup>${q.zeroBits}</sup> = <strong>${q.twoToN}</strong>.`;

      } else if (tnStep === 3) {
        isCorrect = parseInt(ansInput.value.trim(), 10) === q.blockSize;
        detail = isCorrect
          ? `Block size = 2<sup>${q.zeroBits}</sup> = ${q.blockSize}.`
          : `Block size = 2<sup>${q.zeroBits}</sup> = <strong>${q.blockSize}</strong>.`;

      } else {
        const answers = Array.from(netInputs).map(i => i.value.trim().replace(/\/\d+$/, ''));
        isCorrect = answers.every((a, i) => a === q.nextNetworks[i]);
        detail = q.nextNetworks.map((net, i) => {
          const ok = answers[i] === net;
          return `<div class="sn-tn-net-result ${ok ? 'sn-tn-ok' : 'sn-tn-err'}">
            ${ok ? '&#10003;' : '&#10007;'} ${i+1}${['st','nd','rd'][i]}: <span class="mono">${esc(net)}</span>
            ${ok ? '' : `<span class="muted">&nbsp;(you: ${esc(answers[i] || '—')})</span>`}
          </div>`;
        }).join('');
      }

      isCorrect ? (tnScore.correct++, tnScore.streak++) : (tnScore.wrong++, tnScore.streak = 0);
      updateScoreBar();
      revealContext();

      const lastStep  = q.numNextNetworks > 0 ? 4 : 3;
      const nextLabel = tnStep < lastStep ? 'Next Step &rarr;' : 'Next Question &rarr;';
      showFeedback(`
        <div class="${isCorrect ? 'sn-feedback-correct' : 'sn-feedback-wrong'}">
          <div class="sn-feedback-title">${isCorrect ? '&#10003; Correct!' : '&#10007; Wrong'}</div>
          <div class="sn-tn-detail">${detail}</div>
          <button class="sn-next-btn" id="snTnNext">${nextLabel}</button>
        </div>
      `);
    }

    function doSkip() {
      if (tnAnswered) return;
      tnAnswered = true;
      revealContext();

      let answer = '';
      let detail = '';
      if      (tnStep === 0) { answer = q.interestingOctet === 3 ? '3rd' : '4th'; detail = ''; }
      else if (tnStep === 1) { answer = String(q.zeroBits);  detail = `<span class="mono">${q.maskOctetVal.toString(2).padStart(8,'0')}</span> → ${q.zeroBits} zero bit${q.zeroBits !== 1 ? 's' : ''}`; }
      else if (tnStep === 2) { answer = String(q.twoToN);    detail = `2<sup>${q.zeroBits}</sup> = ${q.twoToN}`; }
      else if (tnStep === 3) { answer = String(q.blockSize); detail = `Block size = ${q.blockSize}`; }
      else {
        detail = q.nextNetworks.map((net, i) =>
          `<div class="sn-tn-net-result">${i+1}${['st','nd','rd'][i]}: <span class="mono">${esc(net)}</span></div>`
        ).join('');
      }

      const lastStepSk = q.numNextNetworks > 0 ? 4 : 3;
      const nextLabel  = tnStep < lastStepSk ? 'Next Step &rarr;' : 'Next Question &rarr;';
      showFeedback(`
        <div class="sn-feedback-wrong">
          <div class="sn-feedback-title">Skipped${answer ? ` &mdash; <span class="mono">${esc(answer)}</span>` : ''}</div>
          <div class="sn-tn-detail">${detail}</div>
          <button class="sn-next-btn" id="snTnNext">${nextLabel}</button>
        </div>
      `);
    }

    function doNext() {
      tnAnswered = false;
      const lastStep = q.numNextNetworks > 0 ? 4 : 3;
      if (tnStep < lastStep) {
        tnStep++;
        renderTnInner(container);
      } else {
        tnStep     = 0;
        tnContext  = {};
        tnQuestion = generateTnQuestion(tnDiff);
        renderTnInner(container);
      }
    }

    checkBtn.addEventListener('click', doCheck);
    skipBtn.addEventListener('click', doSkip);
    if (ansInput) {
      ansInput.addEventListener('keydown', e => { if (e.key === 'Enter') doCheck(); });
      ansInput.focus();
    } else {
      netInputs.forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') doCheck(); }));
      if (netInputs[0]) netInputs[0].focus();
    }

    const tnHintBtn  = container.querySelector('#snTnHintBtn');
    const tnHintBody = container.querySelector('#snTnHint');
    if (tnHintBtn && tnHintBody) {
      tnHintBtn.addEventListener('click', () => {
        const visible = tnHintBody.style.display !== 'none';
        tnHintBody.style.display = visible ? 'none' : '';
        tnHintBtn.setAttribute('aria-expanded', String(!visible));
        tnHintBtn.innerHTML = visible
          ? '<span class="sn-hint-icon">&#128161;</span> Show hint'
          : '<span class="sn-hint-icon">&#128161;</span> Hide hint';
      });
    }
  }

  // ── Division Method Drill ────────────────────────────────────────────────

  let dmScore    = { correct: 0, wrong: 0, streak: 0 };
  let dmDiff     = 'mixed';
  let dmQuestion = null;
  let dmStep     = 0;       // 0-5
  let dmAnswered = false;
  let dmContext  = {};

  function generateDmQuestion(difficulty) {
    const pools = {
      easy:   [24, 25, 26, 30],
      medium: [25, 26, 27, 28, 29, 30],
      hard:   [17, 18, 19, 20, 21, 22, 23],
      mixed:  [17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30],
    };
    const pool = pools[difficulty] || pools.mixed;
    const cidr = pool[Math.floor(Math.random() * pool.length)];

    const maskInt    = cidrToMask(cidr);
    const interestingOctetIdx  = cidr < 24 ? 2 : 3;
    const interestingOctet     = interestingOctetIdx + 1;
    const prefixDiv            = Math.floor(cidr / 8);
    const prefixRem            = cidr % 8;
    const networkBitsInOctet   = cidr - interestingOctetIdx * 8;
    const zeroBits             = 8 - networkBitsInOctet;
    const blockSize            = Math.pow(2, zeroBits);

    let ip, octetValue, networkOctet;
    if (interestingOctetIdx === 2) {
      const second    = 1 + Math.floor(Math.random() * 254);
      const numBlocks = Math.floor(256 / blockSize);
      const blockIdx  = Math.floor(Math.random() * numBlocks);
      const thirdNet  = blockIdx * blockSize;
      const thirdHost = 1 + Math.floor(Math.random() * (blockSize - 1));
      const fourth    = Math.floor(Math.random() * 256);
      octetValue   = thirdNet + thirdHost;
      networkOctet = thirdNet;
      ip           = `10.${second}.${octetValue}.${fourth}`;
    } else {
      const third     = 1 + Math.floor(Math.random() * 254);
      const numBlocks = Math.floor(256 / blockSize);
      const blockIdx  = Math.floor(Math.random() * numBlocks);
      const fourthNet = blockIdx * blockSize;
      const hostPart  = 1 + Math.floor(Math.random() * Math.max(1, blockSize - 2));
      octetValue   = fourthNet + hostPart;
      networkOctet = fourthNet;
      ip           = `192.168.${third}.${octetValue}`;
    }

    const quotient = Math.floor(octetValue / blockSize);
    const info     = calcNetworkInfo(ip, cidr);
    return { ip, cidr, interestingOctet, interestingOctetIdx, prefixDiv, prefixRem,
             networkBitsInOctet, zeroBits, blockSize, octetValue, quotient, networkOctet,
             networkAddr: info.networkAddr };
  }

  function renderDivisionMethod(container) {
    dmScore    = { correct: 0, wrong: 0, streak: 0 };
    dmStep     = 0;
    dmContext  = {};
    dmQuestion = generateDmQuestion(dmDiff);
    dmAnswered = false;
    renderDmInner(container);
  }

  function renderDmInner(container) {
    const q    = dmQuestion;
    const ord  = ['', '1st', '2nd', '3rd', '4th'];
    const oName = ord[q.interestingOctet];

    // Progressive context rows
    const ctxRows = [`
      <div class="sn-drill-ip-row">
        <span class="sn-drill-ip-label">IP:</span>
        <span class="sn-drill-ip-value mono">${esc(q.ip)}</span>
      </div>
      <div class="sn-drill-ip-row">
        <span class="sn-drill-ip-label">Prefix:</span>
        <span class="sn-drill-ip-value mono">/${q.cidr}</span>
      </div>
    `];
    if (dmContext.interestingOctet !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Int. octet:</span>
          <span class="sn-drill-ip-value mono">${oName} &mdash; ${q.networkBitsInOctet} network bit${q.networkBitsInOctet !== 1 ? 's' : ''}</span>
        </div>
      `);
    }
    if (dmContext.zeroBits !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Mask bits:</span>
          <span class="sn-drill-ip-value mono sn-tn-binary">${q.maskOctetVal !== undefined ? '' : '1'.repeat(q.networkBitsInOctet).padEnd(8,'0')}</span>
        </div>
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Zero bits:</span>
          <span class="sn-drill-ip-value mono">${q.zeroBits}</span>
        </div>
      `);
    }
    if (dmContext.blockSize !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Block size:</span>
          <span class="sn-drill-ip-value mono">${q.blockSize}</span>
        </div>
      `);
    }
    if (dmContext.quotient !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Division:</span>
          <span class="sn-drill-ip-value mono">${q.octetValue} &divide; ${q.blockSize} = ${dmContext.quotient}</span>
        </div>
      `);
    }
    if (dmContext.networkOctet !== undefined) {
      ctxRows.push(`
        <div class="sn-drill-ip-row">
          <span class="sn-drill-ip-label">Net. octet:</span>
          <span class="sn-drill-ip-value mono">${dmContext.networkOctet}</span>
        </div>
      `);
    }

    const divLine = q.prefixRem === 0
      ? `${q.cidr} &divide; 8 = ${q.prefixDiv} exactly`
      : `${q.cidr} &divide; 8 = ${q.prefixDiv} remainder ${q.prefixRem}`;

    const stepPrompts = [
      `${divLine} &mdash; which octet is <strong>interesting</strong>?`,
      `${q.networkBitsInOctet} network bit${q.networkBitsInOctet !== 1 ? 's' : ''} in ${oName} octet &rarr; how many <strong>zero bits</strong>?`,
      `2<sup>${q.zeroBits}</sup> = ? &mdash; what is the <strong>block size</strong>?`,
      `${oName} octet of ${esc(q.ip)} is <strong>${q.octetValue}</strong>. floor(${q.octetValue} &divide; ${q.blockSize}) = ? <span class="muted">(drop the decimal)</span>`,
      `${q.quotient} &times; ${q.blockSize} = ? &mdash; what is the <strong>network octet</strong>?`,
      `Replace the ${oName} octet with <strong>${q.networkOctet}</strong>. What is the <strong>network address</strong>?`,
    ];

    const placeholders = [
      'e.g. 3rd  or  4th',
      'e.g. 5',
      'e.g. 32',
      'e.g. 2',
      'e.g. 64',
      `e.g. ${esc(q.networkAddr)}`,
    ];

    const stepLabels = [
      'Step 1 of 6 &mdash; Interesting Octet',
      'Step 2 of 6 &mdash; Zero Bits',
      'Step 3 of 6 &mdash; Block Size',
      'Step 4 of 6 &mdash; Divide',
      'Step 5 of 6 &mdash; Multiply',
      'Step 6 of 6 &mdash; Network Address',
    ];

    const dots = Array.from({ length: 6 }, (_, i) =>
      `<span class="sn-step-dot ${i < dmStep ? 'done' : i === dmStep ? 'active' : ''}"></span>`
    ).join('');

    container.innerHTML = `
      <div class="sn-drill-score-bar">
        <span class="sn-score-chip sn-chip-correct">&#10003; ${dmScore.correct} correct</span>
        <span class="sn-score-chip sn-chip-wrong">&#10007; ${dmScore.wrong} wrong</span>
        <span class="sn-score-chip sn-chip-streak">streak: ${dmScore.streak}</span>
      </div>

      <div class="sn-panel sn-drill-card">
        <div class="sn-drill-header">
          <div class="sn-drill-title-group">
            <span class="sn-panel-title">${stepLabels[dmStep]}</span>
            <div class="sn-step-dots">${dots}</div>
          </div>
          <select class="sn-diff-select" id="snDmDiff">
            <option value="mixed"  ${dmDiff === 'mixed'  ? 'selected' : ''}>Mixed</option>
            <option value="easy"   ${dmDiff === 'easy'   ? 'selected' : ''}>Easy</option>
            <option value="medium" ${dmDiff === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard"   ${dmDiff === 'hard'   ? 'selected' : ''}>Hard</option>
          </select>
        </div>

        <div class="sn-drill-question">${ctxRows.join('')}</div>

        <div class="sn-drill-prompt">${stepPrompts[dmStep]}</div>

        <div class="sn-drill-input-row">
          <input type="text" class="sn-drill-answer" id="snDmAnswer"
            placeholder="${placeholders[dmStep]}"
            autocomplete="off" spellcheck="false" />
          <button class="sn-check-btn" id="snDmCheck">Check</button>
          <button class="sn-skip-btn"  id="snDmSkip">Skip</button>
        </div>

        <div class="sn-dm-feedback" id="snDmFeedback" style="display:none"></div>
      </div>
    `;
    wireDmEvents(container);
  }

  function wireDmEvents(container) {
    const q        = dmQuestion;
    const ord      = ['', '1st', '2nd', '3rd', '4th'];
    const oName    = ord[q.interestingOctet];
    const diffSel  = container.querySelector('#snDmDiff');
    const feedback = container.querySelector('#snDmFeedback');
    const checkBtn = container.querySelector('#snDmCheck');
    const skipBtn  = container.querySelector('#snDmSkip');
    const ansInput = container.querySelector('#snDmAnswer');

    diffSel.addEventListener('change', () => {
      dmDiff     = diffSel.value;
      dmScore    = { correct: 0, wrong: 0, streak: 0 };
      dmStep     = 0;
      dmContext  = {};
      dmQuestion = generateDmQuestion(dmDiff);
      dmAnswered = false;
      renderDmInner(container);
    });

    function updateScoreBar() {
      container.querySelector('.sn-chip-correct').textContent = `\u2713 ${dmScore.correct} correct`;
      container.querySelector('.sn-chip-wrong').textContent   = `\u2717 ${dmScore.wrong} wrong`;
      container.querySelector('.sn-chip-streak').textContent  = `streak: ${dmScore.streak}`;
    }

    function showFeedback(html) {
      feedback.innerHTML = html;
      feedback.style.display = '';
      feedback.querySelector('#snDmNext').addEventListener('click', doNext);
      checkBtn.disabled = true;
      skipBtn.disabled  = true;
    }

    function revealContext() {
      if      (dmStep === 0) { dmContext.interestingOctet = q.interestingOctet; }
      else if (dmStep === 1) { dmContext.zeroBits = q.zeroBits; }
      else if (dmStep === 2) { dmContext.blockSize = q.blockSize; }
      else if (dmStep === 3) { dmContext.quotient  = q.quotient; }
      else if (dmStep === 4) { dmContext.networkOctet = q.networkOctet; }
    }

    function doCheck() {
      if (dmAnswered) return;
      if (!ansInput.value.trim()) return;
      dmAnswered = true;

      let isCorrect = false;
      let detail    = '';
      const raw = ansInput.value.trim();

      if (dmStep === 0) {
        const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
        isCorrect = n === q.interestingOctet;
        detail = isCorrect
          ? `${q.prefixRem === 0 ? `${q.cidr} ÷ 8 = ${q.prefixDiv} exactly` : `remainder ${q.prefixRem}`} → <strong>${oName}</strong> octet.`
          : `The <strong>${oName}</strong> octet. (${q.prefixRem === 0 ? `${q.cidr}÷8=${q.prefixDiv} exactly` : `${q.cidr}÷8=${q.prefixDiv}r${q.prefixRem}`})`;

      } else if (dmStep === 1) {
        isCorrect = parseInt(raw, 10) === q.zeroBits;
        const bin = '1'.repeat(q.networkBitsInOctet).padEnd(8, '0');
        detail = isCorrect
          ? `Binary: <span class="mono sn-tn-binary">${bin}</span> — ${q.zeroBits} zero bit${q.zeroBits !== 1 ? 's' : ''}.`
          : `Binary: <span class="mono sn-tn-binary">${bin}</span> → <strong>${q.zeroBits}</strong> zero bit${q.zeroBits !== 1 ? 's' : ''}.`;

      } else if (dmStep === 2) {
        isCorrect = parseInt(raw, 10) === q.blockSize;
        detail = isCorrect
          ? `2<sup>${q.zeroBits}</sup> = ${q.blockSize}.`
          : `2<sup>${q.zeroBits}</sup> = <strong>${q.blockSize}</strong>.`;

      } else if (dmStep === 3) {
        isCorrect = parseInt(raw, 10) === q.quotient;
        detail = isCorrect
          ? `${q.octetValue} ÷ ${q.blockSize} = ${(q.octetValue / q.blockSize).toFixed(2)} → floor = ${q.quotient}.`
          : `${q.octetValue} ÷ ${q.blockSize} = ${(q.octetValue / q.blockSize).toFixed(2)} → drop decimal → <strong>${q.quotient}</strong>.`;

      } else if (dmStep === 4) {
        isCorrect = parseInt(raw, 10) === q.networkOctet;
        detail = isCorrect
          ? `${q.quotient} × ${q.blockSize} = ${q.networkOctet}.`
          : `${q.quotient} × ${q.blockSize} = <strong>${q.networkOctet}</strong>.`;

      } else {
        const normalized = raw.replace(/\/\d+$/, '').trim();
        isCorrect = normalized === q.networkAddr;
        detail = isCorrect
          ? `Network address: <span class="mono">${esc(q.networkAddr)}/${q.cidr}</span>`
          : `Correct answer: <span class="mono">${esc(q.networkAddr)}/${q.cidr}</span>`;
      }

      isCorrect ? (dmScore.correct++, dmScore.streak++) : (dmScore.wrong++, dmScore.streak = 0);
      updateScoreBar();
      revealContext();

      const nextLabel = dmStep < 5 ? 'Next Step &rarr;' : 'Next Question &rarr;';
      showFeedback(`
        <div class="${isCorrect ? 'sn-feedback-correct' : 'sn-feedback-wrong'}">
          <div class="sn-feedback-title">${isCorrect ? '&#10003; Correct!' : '&#10007; Wrong'}</div>
          <div class="sn-tn-detail">${detail}</div>
          <button class="sn-next-btn" id="snDmNext">${nextLabel}</button>
        </div>
      `);
    }

    function doSkip() {
      if (dmAnswered) return;
      dmAnswered = true;
      revealContext();

      const answers = ['', String(q.zeroBits), String(q.blockSize), String(q.quotient), String(q.networkOctet), q.networkAddr];
      const details = [
        `${oName} octet. (${q.prefixRem === 0 ? `${q.cidr}÷8=${q.prefixDiv}` : `${q.cidr}÷8=${q.prefixDiv}r${q.prefixRem}`})`,
        `${'1'.repeat(q.networkBitsInOctet).padEnd(8,'0')} → ${q.zeroBits} zero bit${q.zeroBits !== 1 ? 's' : ''}`,
        `2<sup>${q.zeroBits}</sup> = ${q.blockSize}`,
        `${q.octetValue} ÷ ${q.blockSize} = ${(q.octetValue/q.blockSize).toFixed(2)} → floor = ${q.quotient}`,
        `${q.quotient} × ${q.blockSize} = ${q.networkOctet}`,
        `<span class="mono">${esc(q.networkAddr)}/${q.cidr}</span>`,
      ];

      const nextLabel = dmStep < 5 ? 'Next Step &rarr;' : 'Next Question &rarr;';
      showFeedback(`
        <div class="sn-feedback-wrong">
          <div class="sn-feedback-title">Skipped &mdash; <span class="mono">${esc(answers[dmStep])}</span></div>
          <div class="sn-tn-detail">${details[dmStep]}</div>
          <button class="sn-next-btn" id="snDmNext">${nextLabel}</button>
        </div>
      `);
    }

    function doNext() {
      dmAnswered = false;
      if (dmStep < 5) {
        dmStep++;
        renderDmInner(container);
      } else {
        dmStep     = 0;
        dmContext  = {};
        dmQuestion = generateDmQuestion(dmDiff);
        renderDmInner(container);
      }
    }

    checkBtn.addEventListener('click', doCheck);
    skipBtn.addEventListener('click', doSkip);
    ansInput.addEventListener('keydown', e => { if (e.key === 'Enter') doCheck(); });
    ansInput.focus();
  }

  // ── Top-level Render ──────────────────────────────────────────────────────

  function render() {
    const panel = document.getElementById('tool-subnet-calc');
    if (!panel) return;

    panel.innerHTML = `
      <div class="sn-wrapper">
        <div class="sn-mode-tabs" id="snModeTabs">
          <button class="sn-tab ${currentMode === 'info'       ? 'active' : ''}" data-mode="info">Network Info</button>
          <button class="sn-tab ${currentMode === 'splitter'   ? 'active' : ''}" data-mode="splitter">Subnet Splitter</button>
          <button class="sn-tab ${currentMode === 'summarizer' ? 'active' : ''}" data-mode="summarizer">Summarizer</button>
          <button class="sn-tab ${currentMode === 'drill'      ? 'active' : ''}" data-mode="drill">Octet Drill</button>
          <button class="sn-tab ${currentMode === 'tnlogic'   ? 'active' : ''}" data-mode="tnlogic">2&#x207F; Logic</button>
          <button class="sn-tab ${currentMode === 'divmethod' ? 'active' : ''}" data-mode="divmethod">Division Method</button>
        </div>
        <div class="sn-content" id="snContent"></div>
      </div>
    `;

    const tabs    = panel.querySelector('#snModeTabs');
    const content = panel.querySelector('#snContent');

    tabs.addEventListener('click', e => {
      const btn = e.target.closest('.sn-tab');
      if (!btn) return;
      tabs.querySelectorAll('.sn-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      renderContent(content);
    });

    renderContent(content);
  }

  function renderContent(content) {
    content.innerHTML = '';
    if      (currentMode === 'info')       renderInfo(content);
    else if (currentMode === 'splitter')   renderSplitter(content);
    else if (currentMode === 'summarizer') renderSummarizer(content);
    else if (currentMode === 'drill')      renderDrill(content);
    else if (currentMode === 'tnlogic')    renderTnLogic(content);
    else if (currentMode === 'divmethod')  renderDivisionMethod(content);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.SubnetCalc = {
    init() {
      render();
    },
  };

})();
