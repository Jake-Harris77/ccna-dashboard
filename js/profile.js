// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Profile Page
//  Avatar picker, border display, user stats
// ─────────────────────────────────────────────────────────────────────────────

var Profile = (function () {
  'use strict';

  const STORAGE_KEY = 'ccna_anki_game';
  const PROFILE_KEY = 'ccna_profile';

  function loadGame () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  // ── Avatar SVG definitions (IT-themed) ─────────────────────
  // Free: clean solid icons with fills for visual weight
  // Premium: multi-layered, detailed, filled backgrounds — clearly a tier above
  const AVATARS = {
    // ── Free avatars ───────────────────────────────────────
    router:    { name: 'Router',    free: true, svg: '<rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" opacity="0.15"/><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7.5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="16.5" cy="12" r="1.5" fill="currentColor"/><path d="M7 6V3.5M17 6V3.5M7 18v2.5M17 18v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    switch_d:  { name: 'Switch',    free: true, svg: '<rect x="1" y="7" width="22" height="10" rx="2" fill="currentColor" opacity="0.15"/><rect x="1" y="7" width="22" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="10" width="2" height="4" rx="0.5" fill="currentColor"/><rect x="8" y="10" width="2" height="4" rx="0.5" fill="currentColor"/><rect x="12" y="10" width="2" height="4" rx="0.5" fill="currentColor"/><rect x="16" y="10" width="2" height="4" rx="0.5" fill="currentColor"/><circle cx="20" cy="10" r="0.8" fill="currentColor"/>' },
    firewall:  { name: 'Firewall',  free: true, svg: '<rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" opacity="0.12"/><rect x="3" y="2" width="18" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h18M3 14h18" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="5" r="1.2" fill="currentColor"/><circle cx="7" cy="11" r="1.2" fill="currentColor"/><circle cx="7" cy="17" r="1.2" fill="currentColor"/><path d="M10 5h8M10 11h8M10 17h8" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>' },
    server:    { name: 'Server',    free: true, svg: '<rect x="4" y="2" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.18"/><rect x="4" y="9" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.12"/><rect x="4" y="16" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.08"/><rect x="4" y="2" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="9" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="16" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="5" r="1" fill="currentColor"/><circle cx="17" cy="12" r="1" fill="currentColor"/><circle cx="17" cy="19" r="1" fill="currentColor"/><path d="M7 5h6M7 12h6M7 19h6" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>' },
    cloud:     { name: 'Cloud',     free: true, svg: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" fill="currentColor" opacity="0.15"/><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    wifi:      { name: 'WiFi',      free: true, svg: '<path d="M1.42 9a16 16 0 0121.16 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 12.55a11 11 0 0114.08 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.53 16.11a6 6 0 016.95 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="20" r="2" fill="currentColor"/>' },
    ethernet:  { name: 'Ethernet',  free: true, svg: '<rect x="5" y="2" width="14" height="11" rx="2" fill="currentColor" opacity="0.15"/><rect x="5" y="2" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="8" y="5" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="11" y="5" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="14" y="5" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.5"/><path d="M8 13v4M12 13v4M16 13v4M8 17h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/>' },
    terminal:  { name: 'Terminal',  free: true, svg: '<rect x="2" y="3" width="20" height="18" rx="2.5" fill="currentColor" opacity="0.15"/><rect x="2" y="3" width="20" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h20" stroke="currentColor" stroke-width="1" opacity="0.3"/><polyline points="6 10 10 13 6 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="16" x2="18" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    database:  { name: 'Database',  free: true, svg: '<ellipse cx="12" cy="5" rx="9" ry="3" fill="currentColor" opacity="0.2"/><ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    lock:      { name: 'Lock',      free: true, svg: '<rect x="4" y="10" width="16" height="12" rx="2.5" fill="currentColor" opacity="0.15"/><rect x="4" y="10" width="16" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 10V6.5a4 4 0 018 0V10" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="16" r="2" fill="currentColor"/><path d="M12 18v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    shield:    { name: 'Shield',    free: true, svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" opacity="0.15"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' },
    globe:     { name: 'Globe',     free: true, svg: '<circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.2"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    cpu:       { name: 'CPU',       free: true, svg: '<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" opacity="0.15"/><rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.2"/><path d="M9 1.5v3M15 1.5v3M9 19.5v3M15 19.5v3M1.5 9h3M1.5 15h3M19.5 9h3M19.5 15h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    ram:       { name: 'RAM',       free: true, svg: '<rect x="1" y="7" width="22" height="11" rx="1.5" fill="currentColor" opacity="0.12"/><rect x="1" y="7" width="22" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="9" width="4" height="7" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="10" y="9" width="4" height="7" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="16" y="9" width="4" height="7" rx="0.5" fill="currentColor" opacity="0.25"/><path d="M6 7v-3M10 7v-3M14 7v-3M18 7v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    harddrive: { name: 'Hard Drive', free: true, svg: '<rect x="2" y="4" width="20" height="16" rx="2.5" fill="currentColor" opacity="0.12"/><rect x="2" y="4" width="20" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="1.2"/><circle cx="17" cy="17" r="1.5" fill="currentColor"/><circle cx="13" cy="17" r="0.8" fill="currentColor" opacity="0.5"/>' },
    monitor:   { name: 'Monitor',   free: true, svg: '<rect x="2" y="2" width="20" height="15" rx="2" fill="currentColor" opacity="0.15"/><rect x="2" y="2" width="20" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 14h20" stroke="currentColor" stroke-width="1" opacity="0.3"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    cable:     { name: 'Cable',     free: true, svg: '<rect x="2" y="8" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.2"/><rect x="16" y="8" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.2"/><rect x="2" y="8" width="6" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="16" y="8" width="6" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' },
    antenna:   { name: 'Antenna',   free: true, svg: '<circle cx="12" cy="8" r="3" fill="currentColor" opacity="0.2"/><circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v9" stroke="currentColor" stroke-width="2"/><path d="M5 3l7 5 7-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    binary:    { name: 'Binary',    free: true, svg: '<rect x="1" y="1" width="22" height="22" rx="3" fill="currentColor" opacity="0.08"/><text x="3" y="10" font-family="monospace" font-size="7" fill="currentColor" font-weight="bold">01</text><text x="13" y="10" font-family="monospace" font-size="7" fill="currentColor" opacity="0.5">10</text><text x="3" y="19" font-family="monospace" font-size="7" fill="currentColor" opacity="0.5">11</text><text x="13" y="19" font-family="monospace" font-size="7" fill="currentColor" font-weight="bold">00</text>' },
    packet:    { name: 'Packet',    free: true, svg: '<rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity="0.1"/><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="4" width="20" height="5" rx="2" fill="currentColor" opacity="0.2"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="9" x2="9" y2="20" stroke="currentColor" stroke-width="1" opacity="0.4"/><text x="4" y="8" font-family="monospace" font-size="3.5" fill="currentColor" font-weight="bold">HDR</text>' },
    bgp:       { name: 'BGP',      free: true, svg: '<circle cx="6" cy="6" r="3.5" fill="currentColor" opacity="0.18"/><circle cx="18" cy="6" r="3.5" fill="currentColor" opacity="0.18"/><circle cx="12" cy="19" r="3.5" fill="currentColor" opacity="0.18"/><circle cx="6" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="19" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 8.5l2 7M15.5 8.5l-2 7M9.5 6h5" stroke="currentColor" stroke-width="1.3"/>' },
    vlan:      { name: 'VLAN',     free: true, svg: '<rect x="1" y="3" width="9" height="7" rx="1.5" fill="currentColor" opacity="0.2"/><rect x="14" y="3" width="9" height="7" rx="1.5" fill="currentColor" opacity="0.12"/><rect x="5" y="14" width="14" height="7" rx="1.5" fill="currentColor" opacity="0.15"/><rect x="1" y="3" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="14" width="14" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 10v4M16 10v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' },
    ipv6:      { name: 'IPv6',     free: true, svg: '<rect x="1" y="2" width="22" height="20" rx="3" fill="currentColor" opacity="0.08"/><text x="4" y="11" font-family="monospace" font-size="7" fill="currentColor" font-weight="bold">IPv6</text><path d="M3 14h18" stroke="currentColor" stroke-width="1.2" opacity="0.4"/><text x="3" y="20" font-family="monospace" font-size="4" fill="currentColor" opacity="0.6">2001:db8</text>' },
    ospf:      { name: 'OSPF',     free: true, svg: '<circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.08"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.25"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 3v5.5M12 15.5v5.5M3 12h5.5M15.5 12h5.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>' },
    stp:       { name: 'STP',      free: true, svg: '<circle cx="12" cy="4" r="3" fill="currentColor" opacity="0.25"/><circle cx="12" cy="4" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="20" r="3" fill="currentColor" opacity="0.15"/><circle cx="4" cy="20" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.15"/><circle cx="20" cy="20" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5M12 12l-6.5 5.5M12 12l6.5 5.5" stroke="currentColor" stroke-width="1.5"/>' },
    subnet:    { name: 'Subnet',   free: true, svg: '<rect x="2" y="2" width="20" height="20" rx="2.5" fill="currentColor" opacity="0.08"/><rect x="2" y="2" width="20" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1" opacity="0.3"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1" opacity="0.3"/><circle cx="7" cy="7" r="2" fill="currentColor"/><circle cx="17" cy="7" r="2" fill="currentColor" opacity="0.6"/><circle cx="7" cy="17" r="2" fill="currentColor" opacity="0.4"/><circle cx="17" cy="17" r="2" fill="currentColor" opacity="0.8"/>' },

    // ── Premium avatars (cost coins) ───────────────────────
    // These are visually richer: filled shapes, layered depth, glow effects, detail elements
    rack:       { name: 'Server Rack', free: false, cost: 100, svg: '<rect x="4" y="1" width="16" height="22" rx="1.5" fill="currentColor" opacity="0.12"/><rect x="4" y="1" width="16" height="22" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="3" width="12" height="4" rx="0.8" fill="currentColor" opacity="0.25"/><rect x="6" y="8.5" width="12" height="4" rx="0.8" fill="currentColor" opacity="0.2"/><rect x="6" y="14" width="12" height="4" rx="0.8" fill="currentColor" opacity="0.15"/><rect x="6" y="3" width="12" height="4" rx="0.8" fill="none" stroke="currentColor" stroke-width="1"/><rect x="6" y="8.5" width="12" height="4" rx="0.8" fill="none" stroke="currentColor" stroke-width="1"/><rect x="6" y="14" width="12" height="4" rx="0.8" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="16" cy="5" r="0.9" fill="currentColor"/><circle cx="16" cy="10.5" r="0.9" fill="currentColor"/><circle cx="16" cy="16" r="0.9" fill="currentColor"/><circle cx="14" cy="5" r="0.5" fill="currentColor" opacity="0.5"/><circle cx="14" cy="10.5" r="0.5" fill="currentColor" opacity="0.5"/><circle cx="14" cy="16" r="0.5" fill="currentColor" opacity="0.5"/><path d="M8 5h4M8 10.5h4M8 16h4" stroke="currentColor" stroke-width="0.8" opacity="0.35"/><path d="M6 19.5h12" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>' },
    fiber:      { name: 'Fiber Optic', free: false, cost: 100, svg: '<circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 1v7M12 16v7M1 12h7M16 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.2 4.2l5.2 5.2M14.6 14.6l5.2 5.2M4.2 19.8l5.2-5.2M14.6 9.4l5.2-5.2" stroke="currentColor" stroke-width="1" opacity="0.35"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.25" stroke-dasharray="2 2"/>' },
    loadbalancer: { name: 'Load Balancer', free: false, cost: 150, svg: '<circle cx="12" cy="4.5" r="3.5" fill="currentColor" opacity="0.3"/><circle cx="12" cy="4.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="19.5" r="3" fill="currentColor" opacity="0.2"/><circle cx="4" cy="19.5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="19.5" r="3" fill="currentColor" opacity="0.2"/><circle cx="12" cy="19.5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="19.5" r="3" fill="currentColor" opacity="0.2"/><circle cx="20" cy="19.5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v3.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 11.5l-7 5M12 11.5v5M12 11.5l7 5" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="4.5" r="1.2" fill="currentColor"/>' },
    vpn:        { name: 'VPN Tunnel', free: false, cost: 150, svg: '<rect x="0.5" y="7" width="7" height="10" rx="1.5" fill="currentColor" opacity="0.25"/><rect x="16.5" y="7" width="7" height="10" rx="1.5" fill="currentColor" opacity="0.25"/><rect x="0.5" y="7" width="7" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="16.5" y="7" width="7" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 9.5c3-4 6-4 9 0" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 14.5c3 4 6 4 9 0" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 12h9" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 2"/><rect x="2" y="10" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="18" y="10" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/><circle cx="4" cy="12" r="0.8" fill="currentColor"/><circle cx="20" cy="12" r="0.8" fill="currentColor"/>' },
    api:        { name: 'API Gateway', free: false, cost: 200, svg: '<path d="M12 2L1.5 7.5l10.5 5.5 10.5-5.5L12 2z" fill="currentColor" opacity="0.25"/><path d="M12 2L1.5 7.5l10.5 5.5 10.5-5.5L12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M1.5 12l10.5 5.5L22.5 12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M1.5 16.5l10.5 5.5 10.5-5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 13v9" stroke="currentColor" stroke-width="0.8" opacity="0.3" stroke-dasharray="1.5 1.5"/><circle cx="12" cy="7.5" r="1.8" fill="currentColor" opacity="0.3"/><text x="10.2" y="9" font-family="monospace" font-size="3.5" fill="currentColor" font-weight="bold">{}</text>' },
    kubernetes: { name: 'Kubernetes', free: false, cost: 200, svg: '<circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.08"/><circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v5M12 17v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2.5 7.5L7 10.5M17 13.5l4.5 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2.5 16.5L7 13.5M17 10.5l4.5-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="2" r="1.5" fill="currentColor"/><circle cx="12" cy="22" r="1.5" fill="currentColor"/><circle cx="2.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="21.5" cy="16.5" r="1.5" fill="currentColor"/><circle cx="2.5" cy="16.5" r="1.5" fill="currentColor"/><circle cx="21.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' },
    docker:     { name: 'Container', free: false, cost: 250, svg: '<rect x="2" y="10" width="20" height="12" rx="2.5" fill="currentColor" opacity="0.15"/><rect x="2" y="10" width="20" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4.5" y="12.5" width="4" height="3.5" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="10" y="12.5" width="4" height="3.5" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="15.5" y="12.5" width="4" height="3.5" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="4.5" y="17.5" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.2"/><rect x="10" y="17.5" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.2"/><rect x="15.5" y="17.5" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.2"/><path d="M5 10V6.5M9 10V4M13 10V6.5M17 10V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M1 9c2-3 5-4 8-3.5" stroke="currentColor" stroke-width="1" opacity="0.3"/>' },
    quantum:    { name: 'Quantum',   free: false, cost: 300, svg: '<circle cx="12" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.5"/><ellipse cx="12" cy="12" rx="10.5" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(0 12 12)"/><ellipse cx="12" cy="12" rx="10.5" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10.5" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(120 12 12)"/><circle cx="12" cy="7.5" r="0.8" fill="currentColor" opacity="0.5"/><circle cx="7.5" cy="14.5" r="0.8" fill="currentColor" opacity="0.5"/><circle cx="16.5" cy="14.5" r="0.8" fill="currentColor" opacity="0.5"/><circle cx="3" cy="9" r="0.6" fill="currentColor" opacity="0.3"/><circle cx="21" cy="15" r="0.6" fill="currentColor" opacity="0.3"/><circle cx="5" cy="17" r="0.6" fill="currentColor" opacity="0.3"/>' },
    ai:         { name: 'AI Brain',  free: false, cost: 350, svg: '<circle cx="12" cy="9.5" r="8" fill="currentColor" opacity="0.12"/><circle cx="12" cy="9.5" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 7.5c0-1.5 1.5-3 2.5-2.5s1.5 1 2 1.5c.5-.5 1-2 2-1.5s2.5 1 2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7 10c1 1.5 3 2.5 5 2.5s4-1 5-2.5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/><circle cx="9.5" cy="9" r="1.5" fill="currentColor"/><circle cx="14.5" cy="9" r="1.5" fill="currentColor"/><circle cx="9.5" cy="9" r="0.5" fill="currentColor" opacity="0"/><path d="M8 17.5v4M12 17.5v5M16 17.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 17.5c0 0 2 1 4 1s4-1 4-1" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="22" r="0.8" fill="currentColor"/><circle cx="12" cy="23" r="0.8" fill="currentColor"/><circle cx="16" cy="22" r="0.8" fill="currentColor"/>' },
    satellite:  { name: 'Satellite', free: false, cost: 400, svg: '<rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.3"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M3 3l5 5M21 3l-5 5M3 21l5-5M21 21l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor" opacity="0.2"/><rect x="19" y="1" width="4" height="4" rx="1" fill="currentColor" opacity="0.2"/><rect x="1" y="19" width="4" height="4" rx="1" fill="currentColor" opacity="0.2"/><rect x="19" y="19" width="4" height="4" rx="1" fill="currentColor" opacity="0.2"/><path d="M1 7h3M20 7h3M1 17h3M20 17h3M7 1v3M17 1v3M7 20v3M17 20v3" stroke="currentColor" stroke-width="1" opacity="0.35"/>' },
    honeypot:   { name: 'Honeypot', free: false, cost: 175, svg: '<path d="M7 2h10l2.5 7H4.5L7 2z" fill="currentColor" opacity="0.2"/><path d="M7 2h10l2.5 7H4.5L7 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="9" width="16" height="10" rx="2.5" fill="currentColor" opacity="0.15"/><rect x="4" y="9" width="16" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 12v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 14h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 19v3M16.5 19v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="22" x2="18" y2="22" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="5" r="0.6" fill="currentColor" opacity="0.4"/><circle cx="16" cy="5" r="0.6" fill="currentColor" opacity="0.4"/>' },
    soc:        { name: 'SOC Center', free: false, cost: 275, svg: '<rect x="1" y="5" width="8" height="6" rx="1.5" fill="currentColor" opacity="0.25"/><rect x="15" y="5" width="8" height="6" rx="1.5" fill="currentColor" opacity="0.25"/><rect x="7" y="14" width="10" height="7" rx="1.5" fill="currentColor" opacity="0.2"/><rect x="1" y="5" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="15" y="5" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="14" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 8h6M12 11v3" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="2.5" r="2" fill="currentColor" opacity="0.3"/><circle cx="12" cy="2.5" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="2.5" r="0.7" fill="currentColor"/><path d="M3 7.5h4M17 7.5h4" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><circle cx="3" cy="9.5" r="0.6" fill="currentColor"/><circle cx="21" cy="9.5" r="0.6" fill="currentColor"/><path d="M9 17h6" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><circle cx="10" cy="19" r="0.6" fill="currentColor"/><circle cx="14" cy="19" r="0.6" fill="currentColor"/>' },
    pentest:    { name: 'Pentester', free: false, cost: 350, svg: '<rect x="3" y="2" width="18" height="12" rx="2" fill="currentColor" opacity="0.15"/><rect x="3" y="2" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 5h18" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><circle cx="5" cy="3.5" r="0.5" fill="currentColor" opacity="0.5"/><circle cx="7" cy="3.5" r="0.5" fill="currentColor" opacity="0.5"/><text x="5.5" y="10.5" font-family="monospace" font-size="5" fill="currentColor" font-weight="bold">$_</text><rect x="12" y="7" width="7" height="4" rx="0.5" fill="currentColor" opacity="0.1"/><path d="M13 8.5h5M13 10h3" stroke="currentColor" stroke-width="0.6" opacity="0.4"/><path d="M9 14v4M15 14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="18" x2="18" y2="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 21l4-3M21 21l-4-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>' },
    cloudarch:  { name: 'Cloud Architect', free: false, cost: 450, svg: '<path d="M17 12h-1A7 7 0 106 14H5a4.5 4.5 0 000 9h14a3.5 3.5 0 000-7h-.5" fill="currentColor" opacity="0.15"/><path d="M17 12h-1A7 7 0 106 14H5a4.5 4.5 0 000 9h14a3.5 3.5 0 000-7h-.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 1v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 4l4 2.5L16 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="1" r="1.5" fill="currentColor"/><rect x="9" y="16" width="6" height="4" rx="1" fill="currentColor" opacity="0.2"/><rect x="9" y="16" width="6" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/><path d="M10.5 17.5h3M10.5 19h2" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>' },
  };

  // ── Border definitions ─────────────────────────────────────
  const BORDERS = [
    { id: 0, name: 'Plain Circle',       cost: 0,   minLevel: 1  },
    { id: 1, name: 'Cyan Ring',          cost: 0,   minLevel: 1  },
    { id: 2, name: 'Green Ring',         cost: 50,  minLevel: 3  },
    { id: 3, name: 'Gold Ring',          cost: 75,  minLevel: 5  },
    { id: 4, name: 'Purple Ring',        cost: 100, minLevel: 7  },
    { id: 5, name: 'Glowing Cyan',       cost: 150, minLevel: 10 },
    { id: 6, name: 'Glowing Green',      cost: 200, minLevel: 12 },
    { id: 7, name: 'Rainbow Spin',       cost: 300, minLevel: 15 },
    { id: 8, name: 'Golden Pulse',       cost: 400, minLevel: 18 },
    { id: 9, name: 'Prismatic Aura',     cost: 500, minLevel: 20 },
  ];

  // ── Profile persistence ────────────────────────────────────
  function loadProfile () {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || defaultProfile(); }
    catch (_) { return defaultProfile(); }
  }

  function defaultProfile () {
    return {
      avatar: 'router',
      border: 0,
      ownedBorders: [0, 1],
      ownedAvatars: Object.keys(AVATARS).filter(function (k) { return AVATARS[k].free; }),
      currentSection: 0,
    };
  }

  function saveProfile (p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
    catch (_) {}
    // Sync to Firestore
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isSignedIn()) {
      syncProfileToFirestore(p);
    }
  }

  async function syncProfileToFirestore (p) {
    try {
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();
      if (!db || !user) return;
      await db.collection('users').doc(user.uid).set({
        avatar: p.avatar,
        border: p.border,
        ownedBorders: p.ownedBorders,
        ownedAvatars: p.ownedAvatars,
        currentSection: p.currentSection || 0,
      }, { merge: true });
    } catch (err) {
      console.error('Profile sync error:', err);
    }
  }

  async function pullProfileFromFirestore () {
    try {
      if (!FirebaseSync.isSignedIn()) return;
      var db = FirebaseSync.getDb();
      var user = FirebaseSync.getCurrentUser();
      var doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        var d = doc.data();
        var local = loadProfile();
        if (d.avatar) local.avatar = d.avatar;
        if (d.border !== undefined) local.border = d.border;
        if (d.ownedBorders) {
          local.ownedBorders = arrayUnion(local.ownedBorders, d.ownedBorders);
        }
        if (d.ownedAvatars) {
          local.ownedAvatars = arrayUnion(local.ownedAvatars, d.ownedAvatars);
        }
        if (d.currentSection !== undefined) local.currentSection = d.currentSection;
        saveProfile(local);
        // Refresh topbar to reflect cloud avatar/border
        if (typeof window.updateTopbarAvatar === 'function') {
          window.updateTopbarAvatar();
        }
      }
    } catch (err) {
      console.error('Profile pull error:', err);
    }
  }

  function arrayUnion (a, b) {
    var set = {};
    (a || []).forEach(function (v) { set[v] = true; });
    (b || []).forEach(function (v) { set[v] = true; });
    return Object.keys(set).map(function (k) { return isNaN(k) ? k : Number(k); });
  }

  // ── Render helpers ─────────────────────────────────────────
  function getAvatarSVG (avatarId, size) {
    size = size || 24;
    var av = AVATARS[avatarId] || AVATARS.router;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none">' + av.svg + '</svg>';
  }

  function getAvatarWithBorder (avatarId, borderId, size) {
    size = size || 40;
    var innerSize = Math.round(size * 0.6);
    return '<div class="avatar-ring" data-border="' + (borderId || 0) + '" style="width:' + size + 'px;height:' + size + 'px;">'
      + '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">'
      + getAvatarSVG(avatarId, innerSize)
      + '</div></div>';
  }

  // ── Profile page render ────────────────────────────────────
  function init () {
    var panel = document.getElementById('tool-profile');
    if (!panel) return;

    var g = loadGame();
    var p = loadProfile();
    var level = CoinSystem.levelFromXP(g.xp || 0);
    var nextXP = CoinSystem.xpForLevel(level + 1);
    var coins = g.coins || 0;

    var conquered = 0;
    if (g.sections) {
      for (var sid in g.sections) {
        if (g.sections[sid].defeated) conquered++;
      }
    }

    var displayName = 'Player';
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isSignedIn()) {
      var user = FirebaseSync.getCurrentUser();
      if (user) displayName = user.displayName || user.email.split('@')[0];
    }

    // Free avatars grid
    var freeAvatarKeys = Object.keys(AVATARS).filter(function (k) { return AVATARS[k].free; });
    var premiumAvatarKeys = Object.keys(AVATARS).filter(function (k) { return !AVATARS[k].free; });

    var avatarGridHTML = freeAvatarKeys.map(function (key) {
      var selected = p.avatar === key ? ' selected' : '';
      return '<button class="avatar-pick-item' + selected + '" data-avatar="' + key + '" title="' + AVATARS[key].name + '">'
        + getAvatarSVG(key, 30) + '</button>';
    }).join('');

    var premiumGridHTML = premiumAvatarKeys.map(function (key) {
      var av = AVATARS[key];
      var owned = p.ownedAvatars.indexOf(key) !== -1;
      var selected = p.avatar === key ? ' selected' : '';
      var locked = !owned ? ' locked' : '';
      return '<div style="text-align:center;">'
        + '<button class="avatar-pick-item' + selected + locked + '" data-avatar="' + key + '" title="' + av.name + (owned ? '' : ' (' + av.cost + ' coins)') + '">'
        + getAvatarSVG(key, 30) + '</button>'
        + (!owned ? '<div class="avatar-pick-cost">' + av.cost + '</div>' : '')
        + '</div>';
    }).join('');

    var emberIntensity = parseInt(localStorage.getItem('ccna_ember_intensity') || '75', 10);

    panel.innerHTML = '<div class="profile-container">'
      + '<div class="profile-card">'
      + '  <div class="profile-section-title" style="margin-bottom:14px;">⚙️ Visual Settings</div>'
      + '  <div class="ember-setting">'
      + '    <div class="ember-setting-label">'
      + '      <span>🔥 Ember Intensity</span>'
      + '      <span class="ember-val-display" id="emberValDisplay">' + emberIntensity + '%</span>'
      + '    </div>'
      + '    <input type="range" id="emberSlider" class="ember-slider" min="0" max="100" value="' + emberIntensity + '">'
      + '    <div class="ember-slider-ticks"><span>Off</span><span>Low</span><span>Med</span><span>High</span><span>Max</span></div>'
      + '  </div>'
      + '</div>'
      + '<div class="profile-card">'
      + '  <div class="profile-avatar-display">'
      + '    <div class="profile-avatar-large avatar-ring" data-border="' + p.border + '">'
      + getAvatarSVG(p.avatar, 56)
      + '    </div>'
      + '    <div class="profile-name">' + esc(displayName) + '</div>'
      + '  </div>'
      + '  <div class="profile-stats-grid">'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + level + '</span><span class="profile-stat-lbl">Level</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + (g.xp || 0) + '</span><span class="profile-stat-lbl">XP</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val coins-val">' + coins + '</span><span class="profile-stat-lbl">Coins</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val green-val">' + (g.totalCorrect || 0) + '</span><span class="profile-stat-lbl">Correct</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + (g.bestStreak || 0) + '</span><span class="profile-stat-lbl">Best Streak</span></div>'
      + '    <div class="profile-stat-box"><span class="profile-stat-val">' + conquered + '</span><span class="profile-stat-lbl">Conquered</span></div>'
      + '  </div>'
      + '  <div class="profile-section-dropdown" style="margin-top:16px;">'
      + '    <label for="currentSectionSelect" class="profile-section-title" style="margin-bottom:8px;display:block;">Section I Am In</label>'
      + '    <select id="currentSectionSelect" class="profile-section-select">'
      + '      <option value="0"' + (p.currentSection === 0 ? ' selected' : '') + '>-- Not Set --</option>'
      + (function(){ var opts=''; for(var i=1;i<=38;i++){ opts+='<option value="'+i+'"'+(p.currentSection===i?' selected':'')+'>Section '+i+'</option>'; } return opts; })()
      + '    </select>'
      + '  </div>'
      + '</div>'
      + '<div class="profile-card">'
      + '  <div class="profile-section-title">Choose Avatar</div>'
      + '  <div class="avatar-picker-grid" id="avatarPickerGrid">' + avatarGridHTML + '</div>'
      + (premiumAvatarKeys.length > 0 ? '<div class="profile-section-title" style="margin-top:20px;">Premium Avatars</div><div class="avatar-picker-grid" id="premiumAvatarGrid">' + premiumGridHTML + '</div>' : '')
      + '</div>'
      + '</div>';

    // Bind ember intensity slider
    var emberSlider = document.getElementById('emberSlider');
    var emberValDisplay = document.getElementById('emberValDisplay');
    if (emberSlider) {
      emberSlider.addEventListener('input', function () {
        var val = parseInt(this.value, 10);
        if (emberValDisplay) emberValDisplay.textContent = val + '%';
        if (typeof window.applyEmberIntensity === 'function') {
          window.applyEmberIntensity(val);
        }
      });
    }

    // Bind avatar selection
    panel.addEventListener('click', function (e) {
      var item = e.target.closest('.avatar-pick-item');
      if (!item) return;
      var key = item.dataset.avatar;
      if (!key) return;

      var profile = loadProfile();

      // Check if owned
      if (profile.ownedAvatars.indexOf(key) === -1) {
        // Need to buy
        var av = AVATARS[key];
        if (!av || av.free) return;
        if (!CoinSystem.spendCoins(av.cost)) {
          alert('Not enough coins! You need ' + av.cost + ' coins.');
          return;
        }
        profile.ownedAvatars.push(key);
      }

      profile.avatar = key;
      saveProfile(profile);

      // Update selection visuals
      panel.querySelectorAll('.avatar-pick-item').forEach(function (el) {
        el.classList.remove('selected');
        if (el.dataset.avatar === key) el.classList.add('selected');
        // Remove locked class if now owned
        if (profile.ownedAvatars.indexOf(el.dataset.avatar) !== -1) {
          el.classList.remove('locked');
        }
      });

      // Update large avatar
      var largeAvatar = panel.querySelector('.profile-avatar-large');
      if (largeAvatar) {
        largeAvatar.innerHTML = getAvatarSVG(key, 56);
      }

      CoinSystem.updateTopbar();
      // Update topbar avatar to match new selection
      if (typeof window.updateTopbarAvatar === 'function') {
        window.updateTopbarAvatar();
      }
    });

    // Bind section dropdown
    var secSelect = document.getElementById('currentSectionSelect');
    if (secSelect) {
      secSelect.addEventListener('change', function () {
        var profile = loadProfile();
        profile.currentSection = parseInt(this.value, 10) || 0;
        saveProfile(profile);
      });
    }
  }

  function esc (str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init: init,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    pullProfileFromFirestore: pullProfileFromFirestore,
    getAvatarSVG: getAvatarSVG,
    getAvatarWithBorder: getAvatarWithBorder,
    AVATARS: AVATARS,
    BORDERS: BORDERS,
  };

})();
