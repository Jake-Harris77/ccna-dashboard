// ─────────────────────────────────────────────────────────────────────────────
//  IOS Command Reference Database
//  Each entry: { id, title, category, syntax, description, variations[], outputTips[], tip, tags[] }
// ─────────────────────────────────────────────────────────────────────────────

const COMMANDS = [

  // ══════════════════════════════════════════════════════════
  //  INTERFACES
  // ══════════════════════════════════════════════════════════
  {
    id: 1,
    title: "Show Interface Status",
    category: "interface",
    syntax: "show interfaces\nshow interfaces <type> <num>",
    description: "Displays detailed statistics and status for all interfaces or a specific interface. Essential for verifying link state, encapsulation, and error counters.",
    variations: [
      { label: "Brief summary table", cmd: "show interfaces status" },
      { label: "Only up/down state", cmd: "show interfaces summary" },
      { label: "Specific interface", cmd: "show interfaces GigabitEthernet0/1" },
      { label: "Trunk interfaces only", cmd: "show interfaces trunk" },
      { label: "Interface counters", cmd: "show interfaces counters" },
    ],
    outputTips: [
      "Line 1: Protocol state — 'GigabitEthernet0/0 is up, line protocol is up' means physically connected AND Layer 2 functional.",
      "'administratively down' means the interface has been shut down with the shutdown command.",
      "'line protocol is down' with physical up often means mismatched duplex/speed or encapsulation.",
      "Input/output errors: CRC errors point to cabling or duplex mismatch. Input drops indicate buffer overflow.",
      "Last clearing of counters tells you how recent the stats are — use 'clear counters <int>' to reset.",
    ],
    tip: "Use 'show interfaces status' on switches for a quick one-line-per-port summary including VLAN, duplex, speed.",
    tags: ["show", "interface", "status", "counters", "errors", "Layer 2"],
  },

  {
    id: 2,
    title: "Configure IP Address on Interface",
    category: "interface",
    syntax: "interface <type> <num>\n ip address <ip> <subnet-mask>\n no shutdown",
    description: "Assigns an IPv4 address to an interface and brings it up. Always follow with 'no shutdown' as interfaces default to administratively down on routers.",
    variations: [
      { label: "Secondary IP address", cmd: "ip address <ip> <mask> secondary" },
      { label: "DHCP client", cmd: "ip address dhcp" },
      { label: "Remove IP address", cmd: "no ip address" },
      { label: "IPv6 address", cmd: "ipv6 address <prefix>/<len>" },
      { label: "IPv6 EUI-64", cmd: "ipv6 address <prefix>/64 eui-64" },
    ],
    outputTips: [
      "Verify with 'show interfaces <int>' — look for 'Internet address is x.x.x.x/x'.",
      "Verify with 'show ip interface brief' for a quick status check.",
    ],
    tip: "Routers require 'no shutdown' — switches have interfaces up by default. Forgetting this is a classic exam mistake.",
    tags: ["ip address", "interface", "no shutdown", "ipv6", "config"],
  },

  {
    id: 3,
    title: "Show IP Interface Brief",
    category: "interface",
    syntax: "show ip interface brief",
    description: "One-line summary of every interface: IP address, OK? status, Method, and both Status columns. The fastest way to check interface health across the entire router.",
    variations: [
      { label: "IPv6 version", cmd: "show ipv6 interface brief" },
      { label: "Single interface", cmd: "show ip interface brief GigabitEthernet0/1" },
      { label: "Detailed IP info", cmd: "show ip interface <type> <num>" },
    ],
    outputTips: [
      "Status column: 'up' = physical layer OK. Protocol column: 'up' = data link layer OK.",
      "Both columns 'up' = fully operational. 'up/down' usually means encapsulation or keepalive issue.",
      "'administratively down' in Status = shutdown command applied. 'down/down' = cable/hardware problem.",
      "Method column shows how IP was assigned: 'manual', 'DHCP', 'unset'.",
    ],
    tip: "Memorize this command — it is your first troubleshooting step for any connectivity issue on a router.",
    tags: ["show", "brief", "status", "interface", "ip", "troubleshoot"],
  },

  {
    id: 4,
    title: "Interface Speed and Duplex",
    category: "interface",
    syntax: "interface <type> <num>\n speed { 10 | 100 | 1000 | auto }\n duplex { half | full | auto }",
    description: "Manually sets interface speed and duplex mode. Mismatched duplex settings between devices cause late collisions and poor performance.",
    variations: [
      { label: "Auto-negotiate (default)", cmd: "speed auto\nduplex auto" },
      { label: "Force 1 Gbps full duplex", cmd: "speed 1000\nduplex full" },
      { label: "Verify setting", cmd: "show interfaces <int> | include duplex" },
    ],
    outputTips: [
      "A mismatch (one side auto, one side hard-coded) causes late collisions on the half-duplex side.",
      "'show interfaces' will display 'Half-duplex' or 'Full-duplex, 100Mb/s' near the top.",
    ],
    tip: "Best practice: either both sides auto-negotiate, OR both sides hard-coded to the same values. Never mix.",
    tags: ["duplex", "speed", "mismatch", "auto-negotiate", "performance"],
  },

  {
    id: 5,
    title: "Loopback Interface",
    category: "interface",
    syntax: "interface loopback <number>\n ip address <ip> 255.255.255.255\n (no shutdown not needed)",
    description: "Creates a virtual loopback interface that is always up/up. Used for router IDs, management, BGP peering, and as a stable reference address.",
    variations: [
      { label: "Typical router-ID loopback", cmd: "interface loopback 0\n ip address 1.1.1.1 255.255.255.255" },
      { label: "Verify", cmd: "show interfaces loopback 0" },
    ],
    outputTips: [
      "Loopbacks always show 'up/up' — they never go down unless administratively shut.",
      "Typically assigned a /32 host mask when used for router IDs.",
    ],
    tip: "OSPF and BGP use the highest loopback IP as the Router ID by default. Always configure loopback 0 on exam routers.",
    tags: ["loopback", "router-id", "virtual", "always-up", "BGP", "OSPF"],
  },

  // ══════════════════════════════════════════════════════════
  //  ROUTING
  // ══════════════════════════════════════════════════════════
  {
    id: 6,
    title: "Show IP Route",
    category: "routing",
    syntax: "show ip route\nshow ip route <ip-address>",
    description: "Displays the routing table. The most important verification command in routing. Shows all known routes, their source, and next-hop/outgoing interface.",
    variations: [
      { label: "Only static routes", cmd: "show ip route static" },
      { label: "Only connected routes", cmd: "show ip route connected" },
      { label: "Only OSPF routes", cmd: "show ip route ospf" },
      { label: "Only EIGRP routes", cmd: "show ip route eigrp" },
      { label: "Only BGP routes", cmd: "show ip route bgp" },
      { label: "Summary count", cmd: "show ip route summary" },
      { label: "Specific prefix lookup", cmd: "show ip route 192.168.1.0" },
    ],
    outputTips: [
      "Route codes: C=Connected, S=Static, O=OSPF, D=EIGRP, R=RIP, B=BGP, i=ISIS, L=Local (/32 host route).",
      "Administrative Distance shown in brackets: [AD/metric]. Lower AD wins between protocols.",
      "'via x.x.x.x' = next-hop router. 'GigabitEthernet0/1' = exit interface.",
      "An asterisk (*) marks the best path when multiple equal-cost paths exist.",
      "No route = traffic goes to default route (0.0.0.0/0) or is dropped.",
    ],
    tip: "If you see 'S* 0.0.0.0/0' that is a default static route (gateway of last resort).",
    tags: ["routing table", "show", "routes", "static", "OSPF", "EIGRP", "BGP"],
  },

  {
    id: 7,
    title: "Static Route",
    category: "routing",
    syntax: "ip route <network> <mask> { <next-hop-ip> | <exit-interface> } [AD]",
    description: "Manually configures a route to a destination network. Simple and predictable but does not adapt to topology changes.",
    variations: [
      { label: "Next-hop IP (preferred)", cmd: "ip route 192.168.2.0 255.255.255.0 10.0.0.2" },
      { label: "Exit interface", cmd: "ip route 192.168.2.0 255.255.255.0 GigabitEthernet0/1" },
      { label: "Default route (gateway of last resort)", cmd: "ip route 0.0.0.0 0.0.0.0 10.0.0.1" },
      { label: "Floating static (backup, higher AD)", cmd: "ip route 192.168.2.0 255.255.255.0 10.0.0.3 10" },
      { label: "Null0 discard route", cmd: "ip route 10.0.0.0 255.0.0.0 Null0" },
    ],
    outputTips: [
      "Appears as 'S' in routing table. Default AD=1.",
      "A floating static uses a higher AD (e.g., 10) so it only activates if the primary route disappears.",
      "Exit-interface static routes show as 'directly connected' — can cause ARP issues on multi-access networks.",
    ],
    tip: "Default route (0.0.0.0/0) is the 'catch-all' — any packet with no more specific match uses it.",
    tags: ["static route", "default route", "gateway", "next-hop", "floating"],
  },

  // ══════════════════════════════════════════════════════════
  //  OSPF
  // ══════════════════════════════════════════════════════════
  {
    id: 8,
    title: "OSPF Neighbor Verification",
    category: "ospf",
    syntax: "show ip ospf neighbor\nshow ip ospf neighbor detail",
    description: "Displays OSPF neighbor relationships including state, Dead timer, and interface. The primary command to verify OSPF adjacencies are forming correctly.",
    variations: [
      { label: "Detailed neighbor info", cmd: "show ip ospf neighbor detail" },
      { label: "OSPF database", cmd: "show ip ospf database" },
      { label: "OSPF interface detail", cmd: "show ip ospf interface <int>" },
      { label: "OSPF process info", cmd: "show ip ospf" },
    ],
    outputTips: [
      "State should be FULL for point-to-point and router-to-DR/BDR. TWO_WAY is normal between DROTHERs.",
      "Dead timer counting down — if it hits 0, the neighbor is dropped. Default Dead = 40s, Hello = 10s.",
      "Neighbor ID is the Router ID (highest loopback or highest active interface IP).",
      "States progression: DOWN → INIT → 2WAY → EXSTART → EXCHANGE → LOADING → FULL",
    ],
    tip: "If stuck in EXSTART/EXCHANGE, check for MTU mismatch: 'ip ospf mtu-ignore' can work around it.",
    tags: ["OSPF", "neighbor", "adjacency", "FULL", "2WAY", "DR", "BDR"],
  },

  {
    id: 9,
    title: "Configure OSPF",
    category: "ospf",
    syntax: "router ospf <process-id>\n router-id <ip>\n network <net> <wildcard> area <area-id>",
    description: "Enables OSPF routing process and advertises networks. Process ID is locally significant. Area 0 is the backbone — all other areas must connect to it.",
    variations: [
      { label: "Basic single-area OSPF", cmd: "router ospf 1\n router-id 1.1.1.1\n network 0.0.0.0 255.255.255.255 area 0" },
      { label: "Interface-level OSPF (modern)", cmd: "interface Gi0/0\n ip ospf 1 area 0" },
      { label: "Passive interface", cmd: "router ospf 1\n passive-interface GigabitEthernet0/0" },
      { label: "Passive by default", cmd: "passive-interface default\n no passive-interface Gi0/1" },
      { label: "Default route into OSPF", cmd: "default-information originate [always]" },
      { label: "OSPF cost on interface", cmd: "interface Gi0/0\n ip ospf cost 100" },
    ],
    outputTips: [
      "Verify with 'show ip ospf neighbor' — neighbors must reach FULL state.",
      "Verify with 'show ip route ospf' — OSPF routes appear with 'O' code.",
    ],
    tip: "'network 0.0.0.0 255.255.255.255 area 0' matches ALL interfaces — quick but less precise than per-interface.",
    tags: ["OSPF", "configure", "router ospf", "network", "area", "router-id", "passive"],
  },

  {
    id: 10,
    title: "OSPF Hello & Dead Timers",
    category: "ospf",
    syntax: "interface <type> <num>\n ip ospf hello-interval <seconds>\n ip ospf dead-interval <seconds>",
    description: "Sets OSPF Hello and Dead timer intervals on an interface. Both sides must match or adjacency will not form. Dead interval must be 4x Hello by default.",
    variations: [
      { label: "Show timers", cmd: "show ip ospf interface <int> | include Timer" },
      { label: "Fast hello (sub-second)", cmd: "ip ospf dead-interval minimal hello-multiplier 4" },
    ],
    outputTips: [
      "'show ip ospf interface' shows 'Hello due in X, Dead timer due in Y'.",
      "Mismatched timers = no adjacency. Log shows: '%OSPF-4-BADLSATYPE: hello mismatch'.",
    ],
    tip: "Default: Broadcast/point-to-point = 10s Hello / 40s Dead. NBMA = 30s Hello / 120s Dead.",
    tags: ["OSPF", "hello", "dead timer", "timer", "adjacency", "mismatch"],
  },

  {
    id: 11,
    title: "OSPF DR/BDR Election",
    category: "ospf",
    syntax: "interface <type> <num>\n ip ospf priority <0-255>",
    description: "Controls OSPF Designated Router election on multi-access networks (Ethernet). Highest priority wins; priority 0 = never become DR/BDR. Tie broken by Router ID.",
    variations: [
      { label: "Make this router always DR", cmd: "ip ospf priority 255" },
      { label: "Prevent DR/BDR election", cmd: "ip ospf priority 0" },
      { label: "Show DR/BDR info", cmd: "show ip ospf interface <int>" },
    ],
    outputTips: [
      "'show ip ospf interface' shows: 'Network Type BROADCAST, Cost: 1, DR: x.x.x.x, BDR: y.y.y.y'.",
      "DR election is NOT preemptive — changing priority won't kick out an existing DR without clearing OSPF.",
    ],
    tip: "DR election only matters on broadcast (Ethernet) and NBMA networks. Point-to-point links skip election.",
    tags: ["OSPF", "DR", "BDR", "designated router", "priority", "election"],
  },

  // ══════════════════════════════════════════════════════════
  //  EIGRP
  // ══════════════════════════════════════════════════════════
  {
    id: 12,
    title: "EIGRP Neighbor Verification",
    category: "eigrp",
    syntax: "show ip eigrp neighbors\nshow ip eigrp neighbors detail",
    description: "Shows EIGRP neighbor table including hold time, SRTT, and interface. Core verification command for EIGRP adjacency troubleshooting.",
    variations: [
      { label: "Topology table", cmd: "show ip eigrp topology" },
      { label: "Only Successor routes", cmd: "show ip eigrp topology active" },
      { label: "All paths including FS", cmd: "show ip eigrp topology all-links" },
      { label: "EIGRP interfaces", cmd: "show ip eigrp interfaces" },
      { label: "Traffic stats", cmd: "show ip eigrp traffic" },
    ],
    outputTips: [
      "Hold time counts down — when it hits 0, the neighbor is removed. Default hold = 15s.",
      "SRTT = Smooth Round-Trip Time in ms. RTO = Retransmission Timeout.",
      "Q Cnt should be 0 — non-zero means packets are queued and may indicate congestion.",
      "Uptime shows how long the adjacency has been up.",
    ],
    tip: "If neighbors don't form: check same AS number, same K-values, matching authentication.",
    tags: ["EIGRP", "neighbor", "adjacency", "hold time", "SRTT"],
  },

  {
    id: 13,
    title: "Configure EIGRP",
    category: "eigrp",
    syntax: "router eigrp <AS-number>\n network <network> [<wildcard>]\n no auto-summary",
    description: "Enables EIGRP with the specified Autonomous System number. All routers must use the same AS number to form adjacencies.",
    variations: [
      { label: "Advertise all networks", cmd: "router eigrp 100\n network 0.0.0.0\n no auto-summary" },
      { label: "Specific network with wildcard", cmd: "network 192.168.1.0 0.0.0.255" },
      { label: "Named EIGRP (modern)", cmd: "router eigrp MYORG\n address-family ipv4 unicast autonomous-system 100\n  network 10.0.0.0" },
      { label: "Passive interface", cmd: "passive-interface GigabitEthernet0/0" },
      { label: "Bandwidth for metric", cmd: "interface Gi0/0\n bandwidth 100000" },
    ],
    outputTips: [
      "Verify with 'show ip eigrp neighbors' — neighbors must appear.",
      "Verify routes with 'show ip route eigrp' — EIGRP routes appear with 'D' code.",
      "'D EX' = EIGRP external route (redistributed from another protocol).",
    ],
    tip: "Always use 'no auto-summary' in classic EIGRP to prevent summarization at classful boundaries.",
    tags: ["EIGRP", "configure", "AS", "network", "auto-summary", "passive"],
  },

  {
    id: 14,
    title: "EIGRP Topology Table",
    category: "eigrp",
    syntax: "show ip eigrp topology\nshow ip eigrp topology <network>/<prefix>",
    description: "Shows the EIGRP topology table including Successors and Feasible Successors. Key for understanding DUAL algorithm and fast convergence.",
    variations: [
      { label: "All paths", cmd: "show ip eigrp topology all-links" },
      { label: "Active routes only", cmd: "show ip eigrp topology active" },
      { label: "Specific prefix", cmd: "show ip eigrp topology 10.1.1.0/24" },
    ],
    outputTips: [
      "P = Passive (stable), A = Active (converging — in ACTIVE state means DUAL is running queries).",
      "Successor (S) = best path, installed in routing table. Feasible Successor (FS) = backup path.",
      "FD = Feasible Distance (metric from local router to destination). RD = Reported Distance (metric from neighbor).",
      "FS condition: neighbor's RD < local FD. If met, instant failover without re-querying.",
    ],
    tip: "If a route stays 'Active' for too long (SIA — Stuck in Active), check for unreachable neighbors in the path.",
    tags: ["EIGRP", "topology", "DUAL", "Successor", "Feasible Successor", "FD", "RD", "SIA"],
  },

  // ══════════════════════════════════════════════════════════
  //  BGP
  // ══════════════════════════════════════════════════════════
  {
    id: 15,
    title: "BGP Neighbor Summary",
    category: "bgp",
    syntax: "show bgp summary\nshow bgp ipv4 unicast summary",
    description: "Displays all BGP neighbor states and prefix counts. The first command to run when verifying BGP sessions.",
    variations: [
      { label: "IPv4 unicast (explicit)", cmd: "show bgp ipv4 unicast summary" },
      { label: "IPv6 unicast", cmd: "show bgp ipv6 unicast summary" },
      { label: "Detailed neighbor", cmd: "show bgp neighbors <ip>" },
      { label: "BGP table", cmd: "show bgp ipv4 unicast" },
      { label: "Advertised routes to neighbor", cmd: "show bgp neighbors <ip> advertised-routes" },
      { label: "Received routes from neighbor", cmd: "show bgp neighbors <ip> received-routes" },
    ],
    outputTips: [
      "State/PfxRcd column: a number = session is Established and showing # of prefixes received.",
      "State shows text (Idle/Active/Connect/OpenSent/OpenConfirm) only when NOT established.",
      "'Idle' = BGP not trying to connect. 'Active' = trying to connect but failing TCP.",
      "Up/Down column shows session duration if up, or time since last reset if down.",
      "MsgRcvd/MsgSent should both be incrementing on a healthy session.",
    ],
    tip: "If state stays 'Active', check: TCP connectivity on port 179, ACLs, correct neighbor IP, TTL (eBGP needs TTL≥1).",
    tags: ["BGP", "neighbor", "summary", "Established", "Idle", "Active", "session"],
  },

  {
    id: 16,
    title: "Configure BGP",
    category: "bgp",
    syntax: "router bgp <local-AS>\n neighbor <ip> remote-as <AS>\n network <net> mask <mask>",
    description: "Enables BGP and defines neighbor relationships. iBGP = same AS number. eBGP = different AS number.",
    variations: [
      { label: "eBGP peer (different AS)", cmd: "router bgp 65001\n neighbor 203.0.113.2 remote-as 65002" },
      { label: "iBGP peer (same AS)", cmd: "router bgp 65001\n neighbor 10.0.0.2 remote-as 65001\n neighbor 10.0.0.2 update-source loopback0" },
      { label: "Advertise network", cmd: "network 192.168.1.0 mask 255.255.255.0" },
      { label: "eBGP multi-hop (loopback peering)", cmd: "neighbor 1.1.1.2 ebgp-multihop 2" },
      { label: "BGP next-hop-self (iBGP)", cmd: "neighbor 10.0.0.3 next-hop-self" },
      { label: "Default route to neighbor", cmd: "neighbor <ip> default-originate" },
    ],
    outputTips: [
      "Verify with 'show bgp summary' — state should show a number (prefix count) not a text state.",
    ],
    tip: "iBGP requires full mesh OR Route Reflectors. iBGP does NOT change next-hop — use 'next-hop-self'.",
    tags: ["BGP", "configure", "iBGP", "eBGP", "AS", "neighbor", "remote-as"],
  },

  // ══════════════════════════════════════════════════════════
  //  SWITCHING
  // ══════════════════════════════════════════════════════════
  {
    id: 17,
    title: "Show MAC Address Table",
    category: "switching",
    syntax: "show mac address-table\nshow mac address-table address <MAC>",
    description: "Displays the switch's MAC address table (CAM table) showing which MAC addresses are learned on which ports and VLANs.",
    variations: [
      { label: "Filter by VLAN", cmd: "show mac address-table vlan <vlan-id>" },
      { label: "Filter by interface", cmd: "show mac address-table interface <int>" },
      { label: "Filter by MAC", cmd: "show mac address-table address <xxxx.xxxx.xxxx>" },
      { label: "Count entries", cmd: "show mac address-table count" },
      { label: "Clear dynamic entries", cmd: "clear mac address-table dynamic" },
    ],
    outputTips: [
      "Type column: DYNAMIC = learned, STATIC = manually configured or secure.",
      "If a MAC appears on multiple ports, there may be a loop or a hub in the path.",
      "Empty table or missing MACs after clear — traffic must flow through the switch for entries to re-populate.",
    ],
    tip: "Use this to trace which physical port a device is connected to when you know its MAC address.",
    tags: ["switch", "MAC", "CAM table", "port", "VLAN", "Layer 2"],
  },

  {
    id: 18,
    title: "Trunk Port Configuration",
    category: "switching",
    syntax: "interface <type> <num>\n switchport mode trunk\n switchport trunk encapsulation dot1q",
    description: "Configures an interface as an 802.1Q trunk to carry multiple VLANs between switches or to a router/firewall.",
    variations: [
      { label: "Set allowed VLANs", cmd: "switchport trunk allowed vlan 10,20,30" },
      { label: "Add VLANs to allowed list", cmd: "switchport trunk allowed vlan add 40" },
      { label: "Remove VLANs from trunk", cmd: "switchport trunk allowed vlan remove 30" },
      { label: "Set native VLAN", cmd: "switchport trunk native vlan 999" },
      { label: "Verify trunk", cmd: "show interfaces trunk" },
      { label: "Verify specific interface", cmd: "show interfaces Gi0/1 trunk" },
    ],
    outputTips: [
      "'show interfaces trunk' shows: Mode (on/auto/desirable), Encapsulation (802.1q), Status (trunking), Native VLAN.",
      "'VLANs allowed on trunk' vs 'VLANs allowed and active in management domain' — the second list is what actually works.",
      "If trunk is not forming: check DTP mode (both sides), encapsulation type, and VLAN existence.",
    ],
    tip: "Mismatched native VLANs cause a CDP warning and can be a security vulnerability (VLAN hopping).",
    tags: ["trunk", "802.1Q", "dot1q", "VLAN", "switchport", "native VLAN", "DTP"],
  },

  {
    id: 19,
    title: "Access Port Configuration",
    category: "switching",
    syntax: "interface <type> <num>\n switchport mode access\n switchport access vlan <vlan-id>",
    description: "Configures a switch port as an access port assigned to a single VLAN. Used for end devices (PCs, phones, printers).",
    variations: [
      { label: "Disable DTP negotiation", cmd: "switchport nonegotiate" },
      { label: "Voice VLAN (with data VLAN)", cmd: "switchport access vlan 10\n switchport voice vlan 20" },
      { label: "Verify access port", cmd: "show interfaces <int> switchport" },
    ],
    outputTips: [
      "'show interfaces switchport' shows Administrative Mode: static access, Operational Mode: static access, Access Mode VLAN: x.",
      "If Operational Mode shows 'trunk' even though you set 'access', check DTP — the neighbor may be forcing a trunk.",
    ],
    tip: "Always add 'switchport nonegotiate' on access ports facing end devices to disable DTP and prevent VLAN hopping attacks.",
    tags: ["access port", "switchport", "VLAN", "DTP", "nonegotiate", "voice VLAN"],
  },

  // ══════════════════════════════════════════════════════════
  //  VLANs
  // ══════════════════════════════════════════════════════════
  {
    id: 20,
    title: "VLAN Creation and Verification",
    category: "vlan",
    syntax: "vlan <vlan-id>\n name <name>\n\nshow vlan brief",
    description: "Creates a VLAN in the VLAN database and assigns it a name. VLANs must exist on a switch before they can be used on trunk ports.",
    variations: [
      { label: "Create VLAN", cmd: "vlan 10\n name SALES" },
      { label: "Create range of VLANs", cmd: "vlan 10,20,30,40" },
      { label: "Delete VLAN", cmd: "no vlan 10" },
      { label: "Show VLAN database", cmd: "show vlan" },
      { label: "Brief summary", cmd: "show vlan brief" },
      { label: "VTP status", cmd: "show vtp status" },
    ],
    outputTips: [
      "'show vlan brief' shows VLAN ID, Name, Status (active/act/lshut), and ports assigned.",
      "Ports only appear in 'show vlan' output if they are ACCESS ports — trunk ports are NOT listed here.",
      "Default VLANs (1, 1002-1005) cannot be deleted.",
    ],
    tip: "A VLAN that doesn't exist in the database cannot pass traffic, even if a trunk port allows that VLAN ID.",
    tags: ["VLAN", "create", "vlan database", "show vlan", "VTP", "switch"],
  },

  {
    id: 21,
    title: "Inter-VLAN Routing (Router-on-a-Stick)",
    category: "vlan",
    syntax: "interface Gi0/0.<vlan-id>\n encapsulation dot1q <vlan-id> [native]\n ip address <ip> <mask>",
    description: "Creates subinterfaces on a router to route between VLANs using a single physical trunk link to the switch. One subinterface per VLAN.",
    variations: [
      { label: "Data VLAN subinterface", cmd: "interface Gi0/0.10\n encapsulation dot1q 10\n ip address 192.168.10.1 255.255.255.0" },
      { label: "Native VLAN subinterface", cmd: "interface Gi0/0.1\n encapsulation dot1q 1 native\n ip address 192.168.1.1 255.255.255.0" },
      { label: "Verify subinterfaces", cmd: "show ip interface brief | include Gi0/0" },
    ],
    outputTips: [
      "Subinterface number (Gi0/0.10) doesn't have to match VLAN ID but doing so avoids confusion.",
      "Physical interface must be 'no shutdown' — subinterfaces inherit the physical state.",
      "The 'encapsulation dot1q' command is what activates the subinterface for that VLAN.",
    ],
    tip: "This is not scalable for many VLANs due to bandwidth bottleneck. Layer 3 switches (SVI) are preferred in real networks.",
    tags: ["inter-VLAN routing", "subinterface", "dot1q", "router-on-a-stick", "VLAN routing"],
  },

  {
    id: 22,
    title: "SVI — Switched Virtual Interface",
    category: "vlan",
    syntax: "interface vlan <vlan-id>\n ip address <ip> <mask>\n no shutdown",
    description: "Creates a Layer 3 interface for a VLAN on a Layer 3 switch. Used for inter-VLAN routing, management access, and as default gateways.",
    variations: [
      { label: "Management SVI", cmd: "interface vlan 1\n ip address 192.168.1.10 255.255.255.0\n no shutdown" },
      { label: "Default gateway (for management)", cmd: "ip default-gateway 192.168.1.1" },
      { label: "Enable IP routing on L3 switch", cmd: "ip routing" },
      { label: "Verify SVIs", cmd: "show interfaces vlan <id>" },
    ],
    outputTips: [
      "SVI shows 'up/up' only if: the VLAN exists, at least one access or trunk port in that VLAN is up.",
      "'ip routing' must be enabled on L3 switches to route between SVIs.",
    ],
    tip: "For L2-only switches (access layer), use 'ip default-gateway' not 'ip routing' for management traffic.",
    tags: ["SVI", "VLAN interface", "L3 switch", "ip routing", "management", "inter-VLAN"],
  },

  // ══════════════════════════════════════════════════════════
  //  STP
  // ══════════════════════════════════════════════════════════
  {
    id: 23,
    title: "Show Spanning Tree",
    category: "stp",
    syntax: "show spanning-tree\nshow spanning-tree vlan <vlan-id>",
    description: "Displays STP topology including root bridge, port roles (Root, Designated, Alternate), and port states. Essential for Layer 2 loop prevention verification.",
    variations: [
      { label: "Specific VLAN", cmd: "show spanning-tree vlan 10" },
      { label: "Active interfaces only", cmd: "show spanning-tree active" },
      { label: "Summary table", cmd: "show spanning-tree summary" },
      { label: "Interface detail", cmd: "show spanning-tree interface <int> detail" },
    ],
    outputTips: [
      "Root bridge has all ports as Designated (FWD). If 'This bridge is the root' appears, this switch IS the root.",
      "Port roles: ROOT (best path to root), DESIGNATED (sending to segment), ALTERNATE (blocked backup), BACKUP (blocked redundant).",
      "Port states: BLK=Blocking, LIS=Listening, LRN=Learning, FWD=Forwarding, DSB=Disabled.",
      "Bridge Priority shown as priority + VLAN (e.g., 32778 = 32768 + VLAN 10). Default = 32768.",
    ],
    tip: "To become root bridge: 'spanning-tree vlan X priority 0' or 'spanning-tree vlan X root primary'.",
    tags: ["STP", "spanning tree", "root bridge", "port state", "PVST", "RSTP", "blocking"],
  },

  {
    id: 24,
    title: "STP PortFast and BPDU Guard",
    category: "stp",
    syntax: "interface <type> <num>\n spanning-tree portfast\n spanning-tree bpduguard enable",
    description: "PortFast skips Listening/Learning states for faster convergence on end-device ports. BPDU Guard disables the port if a BPDU (switch) is detected — prevents rogue switches.",
    variations: [
      { label: "Enable globally on all access ports", cmd: "spanning-tree portfast default" },
      { label: "Global BPDU Guard", cmd: "spanning-tree portfast bpduguard default" },
      { label: "Verify PortFast/BPDU Guard", cmd: "show spanning-tree interface <int> detail" },
      { label: "Recover error-disabled port", cmd: "shutdown\nno shutdown" },
      { label: "Auto-recovery from err-disabled", cmd: "errdisable recovery cause bpduguard\nerrdisable recovery interval 300" },
    ],
    outputTips: [
      "'err-disabled' in 'show interfaces' means BPDU Guard fired. The port is shut down.",
      "'show spanning-tree interface Gi0/1 detail' shows 'The port is in the portfast mode'.",
    ],
    tip: "Always enable PortFast + BPDU Guard together on access ports. PortFast alone on trunk = network loop risk.",
    tags: ["PortFast", "BPDU Guard", "err-disabled", "STP", "access port", "security"],
  },

  // ══════════════════════════════════════════════════════════
  //  SECURITY
  // ══════════════════════════════════════════════════════════
  {
    id: 25,
    title: "Standard ACL",
    category: "security",
    syntax: "ip access-list standard <name|number>\n permit <source> <wildcard>\n deny any\n\ninterface <int>\n ip access-group <name> { in | out }",
    description: "Filters traffic based on source IP only. Best applied close to the destination (since it can only match source). Numbered standard ACLs: 1-99, 1300-1999.",
    variations: [
      { label: "Numbered standard ACL", cmd: "access-list 10 permit 192.168.1.0 0.0.0.255\naccess-list 10 deny any" },
      { label: "Named standard ACL", cmd: "ip access-list standard PERMIT-SALES\n permit 192.168.10.0 0.0.0.255\n deny any" },
      { label: "Apply inbound", cmd: "interface Gi0/1\n ip access-group PERMIT-SALES in" },
      { label: "Permit host only", cmd: "permit host 192.168.1.10" },
      { label: "Permit any", cmd: "permit any" },
    ],
    outputTips: [
      "'show ip access-lists' shows each ACE with match count (number of packets matched).",
      "Implicit deny at end — if no permit matches, traffic is dropped. Always verify!",
      "ACEs are processed top-down — order matters. More specific rules must come before general ones.",
    ],
    tip: "Wildcard mask is the inverse of a subnet mask: /24 = 0.0.0.255. 'host x.x.x.x' = 0.0.0.0 wildcard.",
    tags: ["ACL", "standard ACL", "access-list", "filter", "source IP", "security", "wildcard"],
  },

  {
    id: 26,
    title: "Extended ACL",
    category: "security",
    syntax: "ip access-list extended <name|number>\n permit <protocol> <src> <wildcard> <dst> <wildcard> [eq <port>]\n\ninterface <int>\n ip access-group <name> { in | out }",
    description: "Filters traffic by protocol, source IP, destination IP, and port number. Numbered extended ACLs: 100-199, 2000-2699. Apply close to the source.",
    variations: [
      { label: "Permit HTTP from subnet", cmd: "permit tcp 192.168.1.0 0.0.0.255 any eq 80" },
      { label: "Permit HTTPS", cmd: "permit tcp any any eq 443" },
      { label: "Deny telnet", cmd: "deny tcp any any eq 23" },
      { label: "Permit ICMP (ping)", cmd: "permit icmp any any" },
      { label: "Permit established TCP (return traffic)", cmd: "permit tcp any any established" },
      { label: "Verify ACL hits", cmd: "show ip access-lists <name>" },
    ],
    outputTips: [
      "Protocol options: tcp, udp, icmp, ip (matches all), ospf, eigrp.",
      "Common ports: 20/21=FTP, 22=SSH, 23=Telnet, 25=SMTP, 53=DNS, 80=HTTP, 110=POP3, 143=IMAP, 443=HTTPS.",
      "'established' keyword matches TCP packets with ACK or RST flag — allows return traffic without a stateful firewall.",
    ],
    tip: "Extended ACLs should be applied closest to the SOURCE to prevent unwanted traffic from traversing the network.",
    tags: ["ACL", "extended ACL", "TCP", "UDP", "port", "protocol", "filter"],
  },

  {
    id: 27,
    title: "Port Security",
    category: "security",
    syntax: "interface <type> <num>\n switchport mode access\n switchport port-security\n switchport port-security maximum <count>\n switchport port-security mac-address sticky\n switchport port-security violation { protect | restrict | shutdown }",
    description: "Limits which MAC addresses can communicate through a switch port. Prevents MAC flooding attacks and controls unauthorized device connections.",
    variations: [
      { label: "Sticky (auto-learn and save)", cmd: "switchport port-security mac-address sticky" },
      { label: "Static MAC entry", cmd: "switchport port-security mac-address <xxxx.xxxx.xxxx>" },
      { label: "Verify port security", cmd: "show port-security interface <int>" },
      { label: "Show all secured ports", cmd: "show port-security" },
      { label: "Recover err-disabled", cmd: "shutdown\nno shutdown" },
    ],
    outputTips: [
      "Violation modes: Protect=drop, no log. Restrict=drop+increment counter+log. Shutdown=err-disable port (default).",
      "'show port-security interface' shows: Max MACs, Current MACs, Violation count, Last violating MAC.",
      "SecurityViolation count > 0 means an unauthorized device tried to connect.",
    ],
    tip: "Sticky learning is ideal for exam configs — it auto-learns MACs and saves them to running-config.",
    tags: ["port security", "MAC", "sticky", "violation", "err-disabled", "security", "switch"],
  },

  // ══════════════════════════════════════════════════════════
  //  NAT
  // ══════════════════════════════════════════════════════════
  {
    id: 28,
    title: "PAT (NAT Overload) Configuration",
    category: "nat",
    syntax: "ip nat inside source list <acl> interface <outside-int> overload\n\ninterface <inside-int>\n ip nat inside\ninterface <outside-int>\n ip nat outside",
    description: "Configures Port Address Translation (PAT/NAT Overload) — maps many private IPs to one public IP using different source ports. The most common NAT for home/SMB.",
    variations: [
      { label: "Full PAT config", cmd: "access-list 1 permit 192.168.1.0 0.0.0.255\nip nat inside source list 1 interface Gi0/0 overload\ninterface Gi0/1\n ip nat inside\ninterface Gi0/0\n ip nat outside" },
      { label: "Static NAT (1-to-1)", cmd: "ip nat inside source static 192.168.1.10 203.0.113.10" },
      { label: "Dynamic NAT with pool", cmd: "ip nat pool MYPOOL 203.0.113.1 203.0.113.10 netmask 255.255.255.0\nip nat inside source list 1 pool MYPOOL" },
      { label: "Show NAT translations", cmd: "show ip nat translations" },
      { label: "Clear NAT table", cmd: "clear ip nat translation *" },
      { label: "NAT statistics", cmd: "show ip nat statistics" },
    ],
    outputTips: [
      "'show ip nat translations' shows: Inside Local → Inside Global → Outside Local → Outside Global.",
      "Inside Local = private IP. Inside Global = public IP. Outside Global = destination IP.",
      "PAT entries include port numbers (e.g., 192.168.1.10:1024 → 203.0.113.1:2048).",
      "Hits/misses in 'show ip nat statistics' — misses mean traffic not matching the ACL.",
    ],
    tip: "Most common error: forgetting to mark interfaces as 'ip nat inside' or 'ip nat outside'.",
    tags: ["NAT", "PAT", "overload", "translation", "inside", "outside", "private IP"],
  },

  // ══════════════════════════════════════════════════════════
  //  SYSTEM
  // ══════════════════════════════════════════════════════════
  {
    id: 29,
    title: "Show Version",
    category: "system",
    syntax: "show version",
    description: "Displays IOS version, router model, serial number, uptime, boot image, RAM, flash, config register, and license information.",
    variations: [
      { label: "Check IOS version only", cmd: "show version | include IOS" },
      { label: "Check uptime", cmd: "show version | include uptime" },
      { label: "Check config register", cmd: "show version | include Configuration register" },
    ],
    outputTips: [
      "IOS version format: e.g., 'Cisco IOS Software, Version 15.4(3)M2' — useful for bug/feature research.",
      "Config register 0x2102 = normal boot. 0x2142 = ignore NVRAM (password recovery mode).",
      "Uptime tells you if the device recently rebooted (potential issue indicator).",
      "RAM and Flash sizes help plan IOS upgrades.",
    ],
    tip: "The config register value determines boot behavior. 0x2102 is normal; 0x2142 bypasses startup-config (password recovery).",
    tags: ["show version", "IOS", "uptime", "config register", "RAM", "flash", "model"],
  },

  {
    id: 30,
    title: "Show Running-Config / Startup-Config",
    category: "system",
    syntax: "show running-config\nshow startup-config",
    description: "Displays the active configuration in RAM (running) or the saved configuration in NVRAM (startup). Fundamental for verification and auditing.",
    variations: [
      { label: "Filter to interface section", cmd: "show running-config interface Gi0/1" },
      { label: "Filter by keyword", cmd: "show running-config | include router ospf" },
      { label: "Section filter", cmd: "show running-config | section router bgp" },
      { label: "Save running to startup", cmd: "copy running-config startup-config  (or: write memory / wr)" },
      { label: "Erase startup config", cmd: "erase startup-config" },
    ],
    outputTips: [
      "'Building configuration...' precedes the output — wait for it to complete.",
      "If running-config and startup-config differ, changes were made but not saved — will be lost on reload.",
      "'!' lines are comments/separators in the config output.",
    ],
    tip: "Always save after making changes: 'copy run start' or 'wr'. Forgetting this is an exam classic mistake.",
    tags: ["running-config", "startup-config", "save", "copy run start", "wr", "NVRAM"],
  },

  {
    id: 31,
    title: "Hostname and Basic Security",
    category: "system",
    syntax: "hostname <name>\nenable secret <password>\nservice password-encryption\nno ip domain-lookup",
    description: "Sets device hostname and secures privileged EXEC mode. 'enable secret' uses MD5 hash; always preferred over 'enable password'. 'no ip domain-lookup' prevents slow DNS lookups on mistyped commands.",
    variations: [
      { label: "Console password", cmd: "line console 0\n password <pw>\n login" },
      { label: "VTY (SSH/Telnet) password", cmd: "line vty 0 4\n password <pw>\n login\n transport input ssh" },
      { label: "Configure SSH", cmd: "ip domain-name lab.local\ncrypto key generate rsa modulus 2048\nip ssh version 2\nusername admin privilege 15 secret <pw>\nline vty 0 4\n login local\n transport input ssh" },
      { label: "Banner MOTD", cmd: "banner motd # Unauthorized access prohibited! #" },
      { label: "Encrypt all passwords", cmd: "service password-encryption" },
    ],
    outputTips: [
      "'show running-config' — enable secret shows as 'enable secret 5 $1$...' (MD5 hash).",
      "service password-encryption encrypts with type 7 (weak/reversible) — enable secret is stronger.",
    ],
    tip: "For exams: hostname + enable secret + no ip domain-lookup + service password-encryption = standard initial config.",
    tags: ["hostname", "enable secret", "password", "SSH", "VTY", "console", "security", "initial config"],
  },

  {
    id: 32,
    title: "Reload and Boot Commands",
    category: "system",
    syntax: "reload\ncopy running-config startup-config",
    description: "Reboots the device. Always save configuration before reloading. Useful for applying changes that require a restart or for recovering from issues.",
    variations: [
      { label: "Save and reload", cmd: "copy run start\nreload" },
      { label: "Reload in 30 minutes (cancellable)", cmd: "reload in 30" },
      { label: "Cancel scheduled reload", cmd: "reload cancel" },
      { label: "Password recovery (break into rommon)", cmd: "confreg 0x2142 (in rommon)\nboot\ncopy startup-config running-config\nno enable secret\nconfreg 0x2102\ncopy run start\nreload" },
    ],
    outputTips: [
      "If you reload without saving, all unsaved changes are lost — running-config reverts to startup-config.",
      "'reload in X' gives a time window to validate changes — if the network breaks, just wait and it will revert.",
    ],
    tip: "Use 'reload in 30' when making risky changes remotely — if you lose access, the router reboots to the last saved config.",
    tags: ["reload", "reboot", "password recovery", "confreg", "rommon", "save"],
  },

  // ══════════════════════════════════════════════════════════
  //  TROUBLESHOOTING
  // ══════════════════════════════════════════════════════════
  {
    id: 33,
    title: "Ping",
    category: "troubleshoot",
    syntax: "ping <destination-ip>\nping <ip> source <source-ip|interface> repeat <count>",
    description: "Tests Layer 3 reachability using ICMP echo requests. Extended ping allows specifying source interface/IP, count, size, and timeout.",
    variations: [
      { label: "Basic ping", cmd: "ping 8.8.8.8" },
      { label: "Extended ping (interactive)", cmd: "ping" },
      { label: "Source from loopback", cmd: "ping 10.0.0.2 source loopback0" },
      { label: "Large packet (MTU test)", cmd: "ping 10.0.0.2 size 1500 df-bit" },
      { label: "Flood ping", cmd: "ping 10.0.0.2 repeat 1000" },
      { label: "IPv6 ping", cmd: "ping ipv6 <address>" },
    ],
    outputTips: [
      "! = success, . = timeout, U = destination unreachable, O = admin prohibited, Q = source quench.",
      "5 dots (.....) = no reply at all — routing or ACL issue.",
      "Partial success (!!!!.) = some packets lost — could be ACL, routing asymmetry, or intermittent issue.",
      "'U' responses mean the router knows the destination is unreachable (ICMP unreachable returned).",
    ],
    tip: "Always use 'source' option when pinging between router interfaces — default uses outbound interface IP which may not be routable back.",
    tags: ["ping", "ICMP", "reachability", "test", "troubleshoot", "Layer 3"],
  },

  {
    id: 34,
    title: "Traceroute",
    category: "troubleshoot",
    syntax: "traceroute <destination-ip>\ntraceroute <ip> source <ip>",
    description: "Identifies the path packets take to a destination by sending probes with incrementing TTL values. Each hop is revealed. Pinpoints where routing fails.",
    variations: [
      { label: "Basic traceroute", cmd: "traceroute 8.8.8.8" },
      { label: "With source interface", cmd: "traceroute 8.8.8.8 source Gi0/0" },
      { label: "IPv6 traceroute", cmd: "traceroute ipv6 <address>" },
    ],
    outputTips: [
      "Each row = one hop. Shows IP of router at that hop plus 3 RTT probes.",
      "* * * = no response (firewall blocking ICMP, or interface down). Doesn't always mean path is broken.",
      "If traceroute stops at a specific hop, that's where the problem is — check routing table on that device.",
      "Asymmetric routing = different forward and return paths — traceroute only shows the forward path.",
    ],
    tip: "If you see the path going correctly until the last hop where you get '* * *', the destination host may be blocking ICMP.",
    tags: ["traceroute", "path", "TTL", "hops", "routing", "troubleshoot"],
  },

  {
    id: 35,
    title: "Debug Commands",
    category: "troubleshoot",
    syntax: "debug ip ospf events\ndebug ip eigrp\ndebug ip bgp\nundebug all",
    description: "Enables real-time protocol debugging output to the console or syslog. Extremely useful but can overwhelm CPU on production routers — use with caution.",
    variations: [
      { label: "OSPF events (hello/adj)", cmd: "debug ip ospf events" },
      { label: "OSPF LSA activity", cmd: "debug ip ospf lsa-generation" },
      { label: "EIGRP neighbors", cmd: "debug ip eigrp neighbor" },
      { label: "EIGRP packets", cmd: "debug ip eigrp" },
      { label: "BGP events", cmd: "debug ip bgp events" },
      { label: "IP routing", cmd: "debug ip routing" },
      { label: "IP ICMP", cmd: "debug ip icmp" },
      { label: "Turn off all debugs", cmd: "undebug all  (or: no debug all  or: u all)" },
      { label: "Send to terminal", cmd: "terminal monitor  (for SSH/Telnet sessions)" },
    ],
    outputTips: [
      "Debug output only appears on console by default. Use 'terminal monitor' in VTY session.",
      "High debug output can cause CPU overload on busy routers — always 'undebug all' when done.",
      "Timestamps help correlate events: 'service timestamps debug datetime msec'.",
    ],
    tip: "ALWAYS turn off debugging when done: 'undebug all'. A common disaster: leaving debug on and walking away.",
    tags: ["debug", "OSPF", "EIGRP", "BGP", "troubleshoot", "real-time", "undebug"],
  },

  {
    id: 36,
    title: "Show Logging",
    category: "troubleshoot",
    syntax: "show logging\nlogging buffered <size>",
    description: "Displays the local syslog buffer containing system messages, link up/down events, and routing changes. Configure buffered logging to capture events before you connect.",
    variations: [
      { label: "Enable buffered logging", cmd: "logging buffered 64000 debugging" },
      { label: "Show log buffer", cmd: "show logging" },
      { label: "Send logs to syslog server", cmd: "logging host 192.168.1.100\nlogging trap informational" },
      { label: "Add timestamps to logs", cmd: "service timestamps log datetime msec" },
      { label: "Clear log buffer", cmd: "clear logging" },
    ],
    outputTips: [
      "Log levels (severity): 0=emergencies, 1=alerts, 2=critical, 3=errors, 4=warnings, 5=notifications, 6=informational, 7=debugging.",
      "Look for LINK-3-UPDOWN and LINEPROTO-5-UPDOWN messages for interface flapping.",
      "OSPF/EIGRP/BGP neighbor changes are logged at level 5 (informational).",
    ],
    tip: "Configure 'service timestamps log datetime msec localtime' to get accurate timestamps in logs for correlating events.",
    tags: ["logging", "syslog", "log", "events", "troubleshoot", "buffer"],
  },

  {
    id: 37,
    title: "CDP — Cisco Discovery Protocol",
    category: "troubleshoot",
    syntax: "show cdp neighbors\nshow cdp neighbors detail",
    description: "Discovers directly connected Cisco devices. Shows device ID, local/remote interface, platform, IOS version, and IP addresses. Layer 2 only — doesn't need IP.",
    variations: [
      { label: "Summary view", cmd: "show cdp neighbors" },
      { label: "Full detail (shows IPs)", cmd: "show cdp neighbors detail" },
      { label: "CDP global info", cmd: "show cdp" },
      { label: "CDP interface info", cmd: "show cdp interface" },
      { label: "Disable CDP globally", cmd: "no cdp run" },
      { label: "Disable on interface", cmd: "no cdp enable" },
    ],
    outputTips: [
      "'show cdp neighbors detail' shows the neighbor's IP address — use this to identify devices you can't reach yet.",
      "Capability codes: R=Router, S=Switch, H=Host, T=Trans Bridge, B=Source Bridge, I=IGMP.",
      "Holdtime counts down — if it hits 0, the neighbor entry expires.",
    ],
    tip: "CDP works even when no IP addresses are configured — great for initial setup and cable tracing.",
    tags: ["CDP", "discovery", "neighbors", "Layer 2", "Cisco", "topology"],
  },

  {
    id: 38,
    title: "Show Processes and CPU",
    category: "troubleshoot",
    syntax: "show processes cpu\nshow processes cpu sorted",
    description: "Displays CPU utilization per process over 5s/1m/5m intervals. Identifies which processes are consuming the most CPU cycles.",
    variations: [
      { label: "Sorted by CPU usage", cmd: "show processes cpu sorted" },
      { label: "Memory usage", cmd: "show processes memory sorted" },
      { label: "Show interface input queue", cmd: "show interfaces <int> | include input queue" },
    ],
    outputTips: [
      "CPU at >75% sustained = potential problem. Interrupt percentage high = hardware/switching issue.",
      "High 'IP Input' process = lots of process-switched packets (usually means routing table issues or ACL with log keyword).",
      "'OSPF Router' or 'EIGRP-IPv4' high CPU = routing instability (adjacencies flapping).",
    ],
    tip: "High CPU from 'IP Input' + lots of debug running = turn off debug! 'undebug all' immediately.",
    tags: ["CPU", "processes", "performance", "memory", "troubleshoot"],
  },


  // ══════════════════════════════════════════════════════════
  //  NAT (additions)
  // ══════════════════════════════════════════════════════════
  {
    id: 42,
    title: "Static NAT Configuration",
    category: "nat",
    syntax: "ip nat inside source static <private-ip> <public-ip>\n\ninterface <inside-int>\n ip nat inside\n\ninterface <outside-int>\n ip nat outside",
    description: "Creates a permanent one-to-one mapping between a private IP and a public IP. Used for internal servers that must be reachable from the internet on a consistent address.",
    variations: [
      { label: "Static PAT (port forwarding)", cmd: "ip nat inside source static tcp <priv-ip> <priv-port> <pub-ip> <pub-port>" },
      { label: "Verify translation table", cmd: "show ip nat translations" },
      { label: "Verify NAT statistics", cmd: "show ip nat statistics" },
      { label: "Clear all NAT translations", cmd: "clear ip nat translation *" },
      { label: "Debug NAT in real time", cmd: "debug ip nat" },
    ],
    outputTips: [
      "'show ip nat translations' columns: Pro / Inside global (public IP) / Inside local (private IP) / Outside local / Outside global.",
      "Static entries appear permanently in the table even with no active traffic — dynamic/PAT entries time out.",
      "Both 'ip nat inside' and 'ip nat outside' must be on the correct interfaces or NAT will silently fail.",
      "'show ip nat statistics' shows hits (successful translations) and misses (pool exhausted or no matching rule).",
    ],
    tip: "Static NAT = 1:1 permanent map. Use it for inbound connections to servers. PAT/Dynamic NAT are for outbound client traffic.",
    tags: ["NAT", "static NAT", "one-to-one", "ip nat inside", "ip nat outside", "server", "port forwarding"],
  },

  {
    id: 43,
    title: "Dynamic NAT Configuration",
    category: "nat",
    syntax: "ip nat pool <name> <start-ip> <end-ip> netmask <mask>\n!\nip access-list standard NAT_ACL\n permit <source-network> <wildcard>\n!\nip nat inside source list NAT_ACL pool <name>",
    description: "Maps private addresses to a pool of public IPs on a first-come, first-served basis. When the pool is exhausted, new connections are dropped. Add 'overload' for PAT behavior.",
    variations: [
      { label: "Dynamic NAT with overload (PAT)", cmd: "ip nat inside source list <acl> pool <pool> overload" },
      { label: "PAT using exit interface IP", cmd: "ip nat inside source list <acl> interface <outside-int> overload" },
      { label: "Verify translations", cmd: "show ip nat translations" },
      { label: "Verify statistics and pool usage", cmd: "show ip nat statistics" },
      { label: "Clear dynamic translations", cmd: "clear ip nat translation *" },
    ],
    outputTips: [
      "Dynamic NAT entries in 'show ip nat translations' show a dash '-' for the outside fields until traffic is initiated.",
      "'show ip nat statistics' — rising 'misses' counter means the NAT pool is exhausted. Switch to PAT (overload).",
      "Dynamic entries expire after idle timeout: TCP=24h, UDP=5min by default. Adjust with 'ip nat translation timeout'.",
      "The ACL in the NAT rule selects which inside source IPs get translated — only permitted traffic is NAT'd.",
    ],
    tip: "In most modern deployments, PAT (overload) is used instead of pure dynamic NAT because it allows thousands of hosts to share a single public IP.",
    tags: ["NAT", "dynamic NAT", "NAT pool", "overload", "PAT", "ip nat pool"],
  },

  // ══════════════════════════════════════════════════════════
  //  STP (additions)
  // ══════════════════════════════════════════════════════════
  {
    id: 44,
    title: "Rapid PVST+ and Root Bridge Configuration",
    category: "stp",
    syntax: "spanning-tree mode rapid-pvst\n\nspanning-tree vlan <vlan-id> root primary\nspanning-tree vlan <vlan-id> root secondary\nspanning-tree vlan <vlan-id> priority <value>",
    description: "Enables Rapid PVST+ (802.1W) and controls Root Bridge election per VLAN. 'root primary' automatically calculates a priority low enough to win election.",
    variations: [
      { label: "Set root bridge automatically", cmd: "spanning-tree vlan 1 root primary" },
      { label: "Set secondary/backup root", cmd: "spanning-tree vlan 1 root secondary" },
      { label: "Set manual priority (multiples of 4096)", cmd: "spanning-tree vlan 1 priority 4096" },
      { label: "Enable PortFast globally on access ports", cmd: "spanning-tree portfast default" },
      { label: "Enable BPDU Guard globally", cmd: "spanning-tree portfast bpduguard default" },
      { label: "Enable loop guard on uplinks", cmd: "spanning-tree loopguard default" },
      { label: "Verify spanning tree per VLAN", cmd: "show spanning-tree vlan <id>" },
    ],
    outputTips: [
      "'show spanning-tree vlan X' — check 'This bridge is the root' to confirm root election. Shows port roles: Root/Desg/Altn and states: FWD/BLK.",
      "Priority values must be multiples of 4096 (0, 4096, 8192 ... 61440). 'root primary' sets 24576 or lower if needed.",
      "Rapid PVST+ uses FWD/BLK states — no Listening/Learning displayed. Convergence is typically 1-2 seconds.",
      "If a port shows 'BKN' (err-disabled), check 'show interfaces status err-disabled' — likely a BPDU Guard violation.",
    ],
    tip: "Always explicitly set the Root Bridge — never rely on default priorities. Use 'root primary' on the distribution/core switch and 'root secondary' on its redundant peer.",
    tags: ["STP", "Rapid PVST+", "root bridge", "priority", "802.1W", "PortFast", "BPDU Guard"],
  },

  // ══════════════════════════════════════════════════════════
  //  TROUBLESHOOT (additions)
  // ══════════════════════════════════════════════════════════
  {
    id: 45,
    title: "Show IP ARP Table",
    category: "troubleshoot",
    syntax: "show ip arp\nshow ip arp <ip-address>\nshow ip arp <interface>",
    description: "Displays the ARP cache — IP-to-MAC address mappings learned on directly connected interfaces. Essential for diagnosing Layer 2/3 boundary issues.",
    variations: [
      { label: "Full ARP table", cmd: "show ip arp" },
      { label: "ARP for specific IP", cmd: "show ip arp <ip-address>" },
      { label: "ARP entries for an interface", cmd: "show ip arp <interface-type> <num>" },
      { label: "Clear entire ARP cache", cmd: "clear ip arp" },
      { label: "Clear specific entry", cmd: "clear ip arp <ip-address>" },
      { label: "Send gratuitous ARP", cmd: "arp <ip-address> <mac> arpa" },
    ],
    outputTips: [
      "Columns: Protocol / Address (IP) / Age (min) / Hardware Addr (MAC) / Type / Interface.",
      "Age '-' means the entry is the router's own interface IP, not learned from a remote host.",
      "An entry with dashes in the Hardware Addr column is 'Incomplete' — the host is unreachable or not responding to ARP.",
      "Stale ARP entries can cause intermittent connectivity — 'clear ip arp' forces re-resolution of all entries.",
    ],
    tip: "If a host can reach the router but not remote destinations, run 'show ip arp' on the router and verify the host's MAC appears. If missing, ARP resolution is failing.",
    tags: ["ARP", "MAC address", "show ip arp", "Layer 2", "troubleshoot", "connectivity"],
  },

  {
    id: 46,
    title: "LLDP — Link Layer Discovery Protocol",
    category: "troubleshoot",
    syntax: "lldp run\n\nshow lldp neighbors\nshow lldp neighbors detail",
    description: "Enables LLDP (IEEE 802.1AB), the open-standard equivalent of Cisco CDP. Discovers directly connected devices including non-Cisco equipment. Disabled by default on Cisco IOS.",
    variations: [
      { label: "Enable LLDP globally", cmd: "lldp run" },
      { label: "Disable LLDP globally", cmd: "no lldp run" },
      { label: "Disable LLDP TX on interface", cmd: "interface <int>\n no lldp transmit" },
      { label: "Disable LLDP RX on interface", cmd: "interface <int>\n no lldp receive" },
      { label: "Summary of all neighbors", cmd: "show lldp neighbors" },
      { label: "Full neighbor details", cmd: "show lldp neighbors detail" },
      { label: "LLDP global status", cmd: "show lldp" },
    ],
    outputTips: [
      "'show lldp neighbors': Device ID / Local Intf / Hold-time / Capability / Port ID — same layout as 'show cdp neighbors'.",
      "'show lldp neighbors detail' includes management IP, system description, enabled capabilities, and VLAN info.",
      "Capability codes: B=Bridge (switch), R=Router, T=Telephone, W=WLAN AP, S=Station.",
      "LLDP hold time defaults to 120 seconds (vs CDP's 180). Entries expire if not refreshed within hold time.",
    ],
    tip: "CDP is Cisco-only and on by default. LLDP requires 'lldp run' but works with any vendor. Use LLDP in multi-vendor environments (Linux servers, HP/Juniper/Aruba).",
    tags: ["LLDP", "CDP", "neighbor discovery", "troubleshoot", "802.1AB", "multi-vendor"],
  },

  // ══════════════════════════════════════════════════════════
  //  SYSTEM (additions)
  // ══════════════════════════════════════════════════════════
  {
    id: 47,
    title: "SSH Configuration and Hardening",
    category: "system",
    syntax: "hostname <name>\nip domain-name <domain.com>\ncrypto key generate rsa modulus 2048\nip ssh version 2\n!\nusername <user> privilege 15 secret <password>\n!\nline vty 0 15\n login local\n transport input ssh",
    description: "Configures SSHv2 for secure encrypted management. Requires hostname, domain name, and RSA key pair. Always disable Telnet on production devices.",
    variations: [
      { label: "Verify SSH status", cmd: "show ip ssh" },
      { label: "Show active SSH sessions", cmd: "show ssh" },
      { label: "Set SSH timeout and retry limit", cmd: "ip ssh time-out 60\nip ssh authentication-retries 3" },
      { label: "Delete RSA keys (to regenerate)", cmd: "crypto key zeroize rsa" },
      { label: "Disable Telnet — SSH only", cmd: "line vty 0 15\n transport input ssh" },
      { label: "Allow both SSH and Telnet", cmd: "line vty 0 15\n transport input telnet ssh" },
    ],
    outputTips: [
      "'show ip ssh' — verify 'SSH Enabled - version 2.0'. Shows auth timeout and retry count.",
      "'show ssh' — shows active sessions: version, state (Session started), username, and source IP.",
      "If key generation fails: check that hostname is not default ('Router') and ip domain-name is set.",
      "Minimum RSA modulus for SSHv2 is 768 bits; use 2048 for compliance with modern security standards.",
    ],
    tip: "SSH setup checklist: (1) hostname, (2) ip domain-name, (3) crypto key generate rsa modulus 2048, (4) ip ssh version 2, (5) username with secret, (6) login local + transport input ssh on VTY.",
    tags: ["SSH", "crypto key", "RSA", "VTY", "secure management", "transport input ssh"],
  },

  {
    id: 48,
    title: "Password Security and Banners",
    category: "system",
    syntax: "enable secret <password>\nservice password-encryption\nbanner motd # <message> #\nbanner login # <message> #",
    description: "Secures privileged access and displays warning banners. 'enable secret' uses MD5 hashing. 'service password-encryption' applies Type 7 obfuscation to all plaintext passwords in the config.",
    variations: [
      { label: "Enable secret (hashed, always use this)", cmd: "enable secret <password>" },
      { label: "Console line password", cmd: "line console 0\n password <pw>\n login\n exec-timeout 5 0" },
      { label: "VTY line password", cmd: "line vty 0 15\n password <pw>\n login\n exec-timeout 10 0" },
      { label: "Encrypt all plaintext passwords", cmd: "service password-encryption" },
      { label: "MOTD banner (shown on connect)", cmd: "banner motd # Authorized access only! #" },
      { label: "Login banner (shown before login prompt)", cmd: "banner login # Authorized users only. #" },
      { label: "Exec banner (shown after successful login)", cmd: "banner exec # Welcome. All activity is logged. #" },
    ],
    outputTips: [
      "In 'show running-config', Type 5 passwords (enable secret) appear as '$1$...' — MD5, not reversible.",
      "Type 7 passwords (service password-encryption) appear as '7 0822455D0A16' — easily decoded, NOT real encryption.",
      "Banner display order: MOTD (on connect) → login prompt → exec banner (after successful authentication).",
      "'exec-timeout 5 0' disconnects idle sessions after 5 minutes — always set this on console and VTY lines.",
    ],
    tip: "'enable secret' always takes precedence over 'enable password'. Never use 'enable password' alone. Type 7 encryption is obfuscation — real security requires Type 5 (secret) or Type 9 (scrypt).",
    tags: ["password", "enable secret", "service password-encryption", "banner", "security", "VTY", "console"],
  },

  {
    id: 49,
    title: "NTP Configuration",
    category: "system",
    syntax: "ntp server <ip-address>\nntp server <ip-address> prefer\nntp master <stratum-number>",
    description: "Synchronizes the device clock to an NTP time source. Accurate time is critical for log correlation, certificate validity, and Kerberos authentication. Configure on every network device.",
    variations: [
      { label: "Point to NTP server", cmd: "ntp server <ip-address>" },
      { label: "Preferred NTP server", cmd: "ntp server <ip-address> prefer" },
      { label: "Make this device an NTP master", cmd: "ntp master 3" },
      { label: "Set NTP source interface", cmd: "ntp source loopback0" },
      { label: "Check sync status", cmd: "show ntp status" },
      { label: "Show all NTP peers", cmd: "show ntp associations" },
      { label: "Set timezone", cmd: "clock timezone EST -5\nclock summer-time EDT recurring" },
      { label: "Manually set clock", cmd: "clock set 14:30:00 20 Feb 2026" },
    ],
    outputTips: [
      "'show ntp status' — 'Clock is synchronized, stratum X, reference is Y.Y.Y.Y' = NTP working. 'unsynchronized' = problem.",
      "'show ntp associations' — asterisk (*) = current sync source, plus (+) = candidate, tilde (~) = configured but unreachable.",
      "Stratum value shows accuracy: stratum 2 = synced to a stratum 1 (GPS-connected) server.",
      "If NTP isn't syncing: verify reachability (ping the server), confirm UDP 123 is not blocked by an ACL.",
    ],
    tip: "Configure 'ntp master 3' on a core router as a fallback so all devices have a local time source if internet NTP is unavailable.",
    tags: ["NTP", "time synchronization", "ntp server", "show ntp status", "clock", "UDP 123"],
  },

  {
    id: 50,
    title: "SNMP Configuration",
    category: "system",
    syntax: "snmp-server community <string> ro\nsnmp-server community <string> rw\nsnmp-server host <nms-ip> version 2c <community>\nsnmp-server enable traps snmp linkdown linkup",
    description: "Configures SNMP for network monitoring. SNMPv2c uses community strings. SNMPv3 adds authentication and AES encryption — always use SNMPv3 in production.",
    variations: [
      { label: "Read-only community (v2c)", cmd: "snmp-server community NetMonRO ro" },
      { label: "Read-write community (v2c)", cmd: "snmp-server community NetMonRW rw" },
      { label: "Restrict community to ACL", cmd: "snmp-server community NetMonRO ro 10" },
      { label: "SNMPv3 group and user", cmd: "snmp-server group MGMT v3 priv\nsnmp-server user admin MGMT v3 auth sha Auth@Pass priv aes 128 Priv@Pass" },
      { label: "Send traps to NMS", cmd: "snmp-server host <nms-ip> version 2c <community>" },
      { label: "Set device contact and location", cmd: "snmp-server contact noc@company.com\nsnmp-server location 'Datacenter Rack 3'" },
      { label: "Verify SNMP", cmd: "show snmp\nshow snmp community" },
    ],
    outputTips: [
      "'show snmp' shows input/output packet stats, enabled traps, and chassis ID.",
      "'show snmp community' lists all community strings and their access level (ro/rw) and associated ACL if set.",
      "Default community strings 'public' (ro) and 'private' (rw) are well-known — always change them.",
      "An ACL number after the community keyword restricts which NMS IPs can query the device.",
    ],
    tip: "Always restrict SNMP access with an ACL: 'snmp-server community <str> ro <acl>'. Use SNMPv3 with auth+priv for production — v2c community strings travel in plaintext.",
    tags: ["SNMP", "community string", "snmp-server", "NMS", "monitoring", "SNMPv3"],
  },

  {
    id: 51,
    title: "Syslog Configuration",
    category: "system",
    syntax: "logging host <syslog-server-ip>\nlogging trap informational\nlogging source-interface loopback0\nservice timestamps log datetime msec",
    description: "Sends log messages to a central syslog server. Set the severity threshold to control volume. 'service timestamps' adds date/time to every log entry — essential for troubleshooting.",
    variations: [
      { label: "Set syslog server IP", cmd: "logging host <ip-address>" },
      { label: "Set logging severity (0-7)", cmd: "logging trap informational" },
      { label: "Console logging level", cmd: "logging console warnings" },
      { label: "Buffer logs locally", cmd: "logging buffered 16384 debugging" },
      { label: "Add timestamps to logs", cmd: "service timestamps log datetime msec" },
      { label: "Set source interface for consistent IP", cmd: "logging source-interface loopback0" },
      { label: "View log buffer", cmd: "show logging" },
    ],
    outputTips: [
      "Severity levels: 0=Emergency, 1=Alert, 2=Critical, 3=Error, 4=Warning, 5=Notice, 6=Informational, 7=Debug.",
      "'logging trap informational' sends levels 0–6. 'logging trap debugging' sends all (0–7) — high volume, use carefully.",
      "'show logging' shows server destinations, current trap level, and the local log buffer contents.",
      "Without 'service timestamps log datetime msec', log entries have no timestamps — nearly useless for troubleshooting.",
    ],
    tip: "Always configure 'service timestamps log datetime msec' and 'service timestamps debug datetime msec' on every device. No timestamps = no useful logs.",
    tags: ["syslog", "logging", "log server", "severity levels", "service timestamps", "UDP 514"],
  },

  // ══════════════════════════════════════════════════════════
  //  RIP
  // ══════════════════════════════════════════════════════════
  {
    id: 39,
    title: "Configure RIPv2",
    category: "rip",
    syntax: "router rip\n version 2\n network <classful-network>\n no auto-summary",
    description: "Enables RIPv2 on the router, advertises connected networks, and disables automatic classful summarization. 'no auto-summary' is required for VLSM/CIDR support.",
    variations: [
      { label: "Passive interface (suppress updates)", cmd: "passive-interface <interface>" },
      { label: "Default route injection", cmd: "default-information originate" },
      { label: "Redistribute static routes", cmd: "redistribute static metric 1" },
      { label: "Adjust timers", cmd: "timers basic <update> <invalid> <holddown> <flush>" },
      { label: "MD5 authentication", cmd: "ip rip authentication mode md5\nip rip authentication key-chain <name>" },
    ],
    outputTips: [
      "The 'network' statement uses classful network boundaries — e.g., 'network 192.168.1.0' enables RIP on any interface in the 192.168.1.x range.",
      "'no auto-summary' is critical — without it, RIPv2 summarizes to classful boundaries and drops VLSM subnet information.",
      "Passive-interface stops sending RIP updates out that interface but still includes it in advertisements to other neighbors.",
      "Default timers: Update=30s, Invalid=180s, Holddown=180s, Flush=240s. Verify with 'show ip protocols'.",
    ],
    tip: "Always use 'version 2' and 'no auto-summary' for any modern deployment. RIPv1 is classful and should never be used.",
    tags: ["RIP", "RIPv2", "router rip", "network", "no auto-summary", "routing protocol"],
  },

  {
    id: 40,
    title: "Verify RIP Operation",
    category: "rip",
    syntax: "show ip rip database\nshow ip protocols",
    description: "Verifies RIP routing table entries and protocol configuration. 'show ip rip database' shows all RIP-learned routes; 'show ip protocols' confirms timers, version, and network statements.",
    variations: [
      { label: "RIP routing database", cmd: "show ip rip database" },
      { label: "Protocol parameters and timers", cmd: "show ip protocols" },
      { label: "Routing table (RIP entries only)", cmd: "show ip route rip" },
      { label: "Interface RIP status", cmd: "show ip interface brief" },
      { label: "Debug RIP updates (use with caution)", cmd: "debug ip rip" },
    ],
    outputTips: [
      "'show ip rip database' lists each prefix with its metric (hop count) and the advertising neighbor IP.",
      "'show ip protocols' shows the configured version, network statements, passive interfaces, timers, and current neighbors.",
      "In 'show ip route', RIP routes are marked with 'R'. The metric is shown as [120/X] where 120 is AD and X is hop count.",
      "'debug ip rip' shows real-time update packets — look for routes being sent and received. Disable with 'undebug all' after use.",
      "If expected routes are missing, verify: correct 'network' statement, no passive-interface on wrong port, no auto-summary masking subnets.",
    ],
    tip: "'show ip protocols' is the fastest way to confirm RIP version, timers, and which networks are being advertised.",
    tags: ["RIP", "show ip rip database", "show ip protocols", "verify", "debug", "troubleshoot"],
  },

  {
    id: 41,
    title: "RIP Split Horizon and Passive Interface",
    category: "rip",
    syntax: "! Split horizon (enabled by default)\nno ip split-horizon\n\n! Passive interface\nrouter rip\n passive-interface <interface>",
    description: "Controls split horizon behavior and suppresses RIP updates on specific interfaces. Split horizon prevents routing loops; passive-interface stops sending updates while still advertising the network.",
    variations: [
      { label: "Disable split horizon on interface", cmd: "interface <type> <num>\n no ip split-horizon" },
      { label: "Re-enable split horizon", cmd: "interface <type> <num>\n ip split-horizon" },
      { label: "Passive all, enable specific", cmd: "router rip\n passive-interface default\n no passive-interface <uplink-int>" },
      { label: "Verify split horizon state", cmd: "show ip interface <type> <num> | include Split" },
    ],
    outputTips: [
      "Split horizon is enabled by default on all interfaces. Disable only when required (e.g., Frame Relay hub-and-spoke where the hub must advertise spoke routes back out the same interface).",
      "Passive-interface suppresses RIP hello/update output on the specified interface but the connected network is still included in updates sent out other interfaces.",
      "'passive-interface default' + 'no passive-interface <uplink>' is a security best practice — stops RIP updates leaking to untrusted segments.",
      "Verify with 'show ip protocols' — passive interfaces are listed under 'Passive Interface(s)'.",
    ],
    tip: "Use 'passive-interface default' and selectively enable only uplink interfaces. This prevents RIP updates from being sent to end-user segments.",
    tags: ["RIP", "split horizon", "passive-interface", "loop prevention", "security", "routing"],
  },

  // ══════════════════════════════════════════════════════════
  //  IPv6
  // ══════════════════════════════════════════════════════════
  {
    id: 58,
    title: "Configure IPv6 Addressing",
    category: "ipv6",
    syntax: "ipv6 unicast-routing\n\ninterface <type> <num>\n ipv6 address <prefix>/<length>\n ipv6 address <prefix>/64 eui-64\n no shutdown",
    description: "Enables IPv6 routing globally and assigns addresses to interfaces. Link-local addresses (FE80::/10) are automatically generated when IPv6 is enabled on any interface.",
    variations: [
      { label: "Enable IPv6 routing (required on routers)", cmd: "ipv6 unicast-routing" },
      { label: "Manual full address", cmd: "ipv6 address 2001:db8:1::1/64" },
      { label: "EUI-64 derived from MAC", cmd: "ipv6 address 2001:db8:1::/64 eui-64" },
      { label: "Link-local only (no global)", cmd: "ipv6 enable" },
      { label: "DHCPv6 client", cmd: "ipv6 address dhcp" },
      { label: "Verify IPv6 addresses", cmd: "show ipv6 interface brief" },
      { label: "Full IPv6 interface detail", cmd: "show ipv6 interface <type> <num>" },
    ],
    outputTips: [
      "'show ipv6 interface brief' shows each interface's global unicast and link-local addresses and up/down state.",
      "Every IPv6-enabled interface automatically gets a link-local address (FE80::) — this is used for NDP and routing protocol next-hops.",
      "EUI-64 derives the interface ID from the MAC address: splits MAC, inserts FFFE, flips the 7th bit.",
      "'ipv6 unicast-routing' is required on routers to forward IPv6 packets — without it the router drops all routed IPv6 traffic.",
    ],
    tip: "Always configure 'ipv6 unicast-routing' first on routers. Switches don't need it for Layer 2 IPv6, but L3 switches do for routing.",
    tags: ["IPv6", "ipv6 unicast-routing", "ipv6 address", "EUI-64", "link-local", "FE80"],
  },

  {
    id: 59,
    title: "IPv6 Static Routes",
    category: "ipv6",
    syntax: "ipv6 route <prefix>/<length> <next-hop-ipv6>\nipv6 route <prefix>/<length> <exit-interface> <next-hop>\nipv6 route ::/0 <next-hop>",
    description: "Configures static IPv6 routes including default routes (::/0). IPv6 next-hops on Ethernet interfaces must specify both exit interface and next-hop address when the next-hop is a link-local address.",
    variations: [
      { label: "Static route via global unicast next-hop", cmd: "ipv6 route 2001:db8:2::/64 2001:db8:1::2" },
      { label: "Static route via link-local next-hop (requires interface)", cmd: "ipv6 route 2001:db8:2::/64 GigabitEthernet0/1 FE80::1" },
      { label: "IPv6 default route", cmd: "ipv6 route ::/0 2001:db8:1::1" },
      { label: "Floating static (higher AD)", cmd: "ipv6 route 2001:db8:2::/64 2001:db8:1::2 200" },
      { label: "Verify IPv6 routing table", cmd: "show ipv6 route" },
      { label: "Show only static IPv6 routes", cmd: "show ipv6 route static" },
    ],
    outputTips: [
      "'show ipv6 route' — route codes: C=Connected, L=Local (host route /128), S=Static, O=OSPF, R=RIP.",
      "Every interface address appears as both a /64 network route (C) and a /128 host route for the exact address (L).",
      "When using a link-local address as the next-hop, you MUST also specify the exit interface — link-local addresses are not unique across interfaces.",
      "The IPv6 default route ::/0 is equivalent to IPv4's 0.0.0.0/0.",
    ],
    tip: "Use link-local addresses as next-hops in production — they don't change when interface IPs are renumbered. Always specify the exit interface with link-local next-hops.",
    tags: ["IPv6", "ipv6 route", "static route", "default route", "::/0", "show ipv6 route"],
  },

  {
    id: 60,
    title: "IPv6 Routing and Neighbor Verification",
    category: "ipv6",
    syntax: "show ipv6 route\nshow ipv6 interface brief\nshow ipv6 neighbors\nshow ipv6 protocols",
    description: "Verifies IPv6 routing table, interface addressing, NDP neighbor cache (IPv6 ARP equivalent), and active routing protocols. Core IPv6 troubleshooting commands.",
    variations: [
      { label: "IPv6 routing table", cmd: "show ipv6 route" },
      { label: "IPv6 interface addresses", cmd: "show ipv6 interface brief" },
      { label: "NDP neighbor cache (like ARP)", cmd: "show ipv6 neighbors" },
      { label: "Active IPv6 routing protocols", cmd: "show ipv6 protocols" },
      { label: "IPv6 ping", cmd: "ping ipv6 <address>" },
      { label: "IPv6 traceroute", cmd: "traceroute ipv6 <address>" },
      { label: "Clear NDP neighbor cache", cmd: "clear ipv6 neighbors" },
    ],
    outputTips: [
      "'show ipv6 neighbors' shows State: REACH (reachable), STALE (cached, not verified), DELAY, PROBE, INCOMPLETE. INCOMPLETE = NDP failed.",
      "NDP neighbor cache entries include the IPv6 address, age, MAC (hardware address), state, and interface.",
      "'show ipv6 protocols' lists active IPv6 routing protocols (OSPFv3, EIGRP for IPv6, RIPng) and their configured networks.",
      "IPv6 ping to a link-local address requires specifying the source interface: 'ping ipv6 FE80::1 source GigabitEthernet0/0'.",
    ],
    tip: "'show ipv6 neighbors' is IPv6's equivalent of 'show ip arp'. INCOMPLETE state means Layer 2 reachability is failing — check the cable, VLAN, or port.",
    tags: ["IPv6", "show ipv6 route", "show ipv6 neighbors", "NDP", "ARP equivalent", "troubleshoot"],
  },

  {
    id: 61,
    title: "OSPFv3 for IPv6",
    category: "ipv6",
    syntax: "ipv6 router ospf <process-id>\n router-id <32-bit-id>\n!\ninterface <type> <num>\n ipv6 ospf <process-id> area <area-id>",
    description: "Configures OSPFv3 for IPv6 routing. Unlike OSPFv2, OSPFv3 is enabled per-interface rather than using the 'network' command. A 32-bit router ID must be manually set if no IPv4 address exists.",
    variations: [
      { label: "Enable OSPFv3 routing process", cmd: "ipv6 router ospf 1\n router-id 1.1.1.1" },
      { label: "Enable OSPFv3 on interface", cmd: "interface GigabitEthernet0/0\n ipv6 ospf 1 area 0" },
      { label: "Passive interface", cmd: "ipv6 router ospf 1\n passive-interface GigabitEthernet0/1" },
      { label: "Verify OSPFv3 neighbors", cmd: "show ipv6 ospf neighbor" },
      { label: "Verify OSPFv3 routing table", cmd: "show ipv6 route ospf" },
      { label: "OSPFv3 interface detail", cmd: "show ipv6 ospf interface brief" },
    ],
    outputTips: [
      "'show ipv6 ospf neighbor' — same states as OSPFv2: FULL = adjacency established. EXSTART/EXCHANGE = database sync in progress.",
      "OSPFv3 uses link-local addresses for neighbor communication and next-hops — unlike OSPFv2 which uses unicast IPs.",
      "If no IPv4 addresses exist on the router, OSPFv3 cannot auto-select a router ID — configure 'router-id X.X.X.X' manually.",
      "'show ipv6 ospf interface brief' shows area assignment, process ID, hello/dead timers, and neighbor count per interface.",
    ],
    tip: "OSPFv3 key difference from v2: enabled per-interface with 'ipv6 ospf <pid> area <area>', NOT via the 'network' command. Router ID is still a 32-bit dotted decimal.",
    tags: ["IPv6", "OSPFv3", "ipv6 ospf", "routing protocol", "area", "router-id"],
  },

  // ══════════════════════════════════════════════════════════
  //  DHCP
  // ══════════════════════════════════════════════════════════
  {
    id: 62,
    title: "Configure DHCP Server",
    category: "dhcp",
    syntax: "ip dhcp excluded-address <start-ip> <end-ip>\n!\nip dhcp pool <name>\n network <network-ip> <subnet-mask>\n default-router <gateway-ip>\n dns-server <dns-ip>\n lease <days>",
    description: "Configures the Cisco IOS DHCP server to assign IP addresses, gateways, and DNS servers to clients. Always exclude static IPs (routers, servers, printers) before defining the pool.",
    variations: [
      { label: "Exclude static IPs from pool", cmd: "ip dhcp excluded-address 192.168.1.1 192.168.1.10" },
      { label: "Basic DHCP pool", cmd: "ip dhcp pool LAN\n network 192.168.1.0 255.255.255.0\n default-router 192.168.1.1\n dns-server 8.8.8.8\n lease 1" },
      { label: "Domain name option", cmd: "ip dhcp pool LAN\n domain-name company.local" },
      { label: "Disable DHCP server", cmd: "no service dhcp" },
      { label: "Verify active leases", cmd: "show ip dhcp binding" },
      { label: "Verify pool statistics", cmd: "show ip dhcp pool" },
      { label: "Show DHCP conflicts", cmd: "show ip dhcp conflict" },
      { label: "Clear all bindings", cmd: "clear ip dhcp binding *" },
    ],
    outputTips: [
      "'show ip dhcp binding' lists client MAC, assigned IP, lease expiration, and type (Automatic/Manual).",
      "'show ip dhcp pool' shows pool name, network, range, lease time, and current utilization (leased/available).",
      "'show ip dhcp conflict' lists IPs that DHCP attempted to assign but got a ping response (already in use). Clear conflicts with 'clear ip dhcp conflict *'.",
      "If clients aren't getting addresses, check: pool network matches interface subnet, excluded-address doesn't exclude the entire pool, 'no service dhcp' is not configured.",
    ],
    tip: "Always configure 'ip dhcp excluded-address' before the pool. If you forget, clients may receive IPs assigned to your routers or servers, causing duplicate IP conflicts.",
    tags: ["DHCP", "ip dhcp pool", "excluded-address", "default-router", "dns-server", "show ip dhcp binding"],
  },

  {
    id: 63,
    title: "DHCP Relay (ip helper-address)",
    category: "dhcp",
    syntax: "interface <client-facing-interface>\n ip helper-address <dhcp-server-ip>",
    description: "Forwards DHCP broadcasts to a DHCP server on a different subnet. DHCP Discover messages are broadcasts — routers drop them by default. ip helper-address converts them to unicast and forwards them.",
    variations: [
      { label: "Configure relay on router interface", cmd: "interface GigabitEthernet0/0\n ip helper-address 10.0.0.10" },
      { label: "Multiple helper addresses", cmd: "interface GigabitEthernet0/0\n ip helper-address 10.0.0.10\n ip helper-address 10.0.0.11" },
      { label: "Verify helper is configured", cmd: "show ip interface GigabitEthernet0/0 | include Helper" },
      { label: "Show relay statistics", cmd: "show ip helper-address" },
    ],
    outputTips: [
      "'show ip interface <int>' shows 'Helper address is X.X.X.X' if configured correctly.",
      "ip helper-address also forwards other broadcasts by default: TFTP (69), DNS (53), NTP (37), NetBIOS (137/138), TACACS (49). Control with 'no ip forward-protocol udp <port>'.",
      "Configure ip helper-address on the interface closest to the DHCP clients — the interface they send their broadcast out of.",
      "If DHCP relay isn't working: verify reachability to the DHCP server, check ACLs aren't blocking UDP 67/68.",
    ],
    tip: "'ip helper-address' must be on the interface facing the clients, pointing to the DHCP server IP. If the DHCP server is behind multiple routers, the server must have a route back to the client subnet.",
    tags: ["DHCP", "ip helper-address", "DHCP relay", "broadcast forwarding", "inter-subnet DHCP"],
  },

  // ══════════════════════════════════════════════════════════
  //  HSRP / FHRP
  // ══════════════════════════════════════════════════════════
  {
    id: 64,
    title: "Configure HSRP",
    category: "fhrp",
    syntax: "interface <type> <num>\n standby <group> ip <virtual-ip>\n standby <group> priority <value>\n standby <group> preempt",
    description: "Configures HSRP (Hot Standby Router Protocol) for default gateway redundancy. Creates a shared virtual IP that moves to the standby router if the active router fails.",
    variations: [
      { label: "Basic HSRP group", cmd: "standby 1 ip 192.168.1.254" },
      { label: "Set priority (highest = active)", cmd: "standby 1 priority 110" },
      { label: "Enable preemption", cmd: "standby 1 preempt" },
      { label: "Preempt with delay (wait for routing convergence)", cmd: "standby 1 preempt delay minimum 30" },
      { label: "Track an interface (lower priority if uplink fails)", cmd: "standby 1 track GigabitEthernet0/0 20" },
      { label: "Set hello and hold timers", cmd: "standby 1 timers 1 3" },
      { label: "MD5 authentication", cmd: "standby 1 authentication md5 key-string <secret>" },
      { label: "HSRPv2 (supports IPv6, more groups)", cmd: "standby version 2" },
    ],
    outputTips: [
      "'show standby' — shows group, state (Active/Standby/Listen), virtual IP, active/standby router IP, priority, and preempt status.",
      "Active router owns the virtual IP and virtual MAC (0000.0c07.acXX for v1, 0000.0c9f.fXXX for v2).",
      "Standby router sends Hello packets to 224.0.0.2 (v1) or 224.0.0.102 (v2) every 3 seconds by default.",
      "Object tracking ('standby track') decrements priority if a tracked interface goes down, allowing preemption failover.",
    ],
    tip: "Hosts point to the HSRP virtual IP as their gateway — never the physical interface IP. Enable 'preempt' if you want the higher-priority router to reclaim Active role after recovery.",
    tags: ["HSRP", "FHRP", "standby", "virtual IP", "redundancy", "default gateway", "preempt"],
  },

  {
    id: 52,
    title: "Verify HSRP and FHRP",
    category: "fhrp",
    syntax: "show standby\nshow standby brief\nshow standby <interface> <group>",
    description: "Verifies HSRP group state, virtual IP, active/standby router roles, and timers. Use 'show standby brief' for a quick per-group summary across all interfaces.",
    variations: [
      { label: "Full HSRP detail", cmd: "show standby" },
      { label: "Compact one-line-per-group summary", cmd: "show standby brief" },
      { label: "Specific interface and group", cmd: "show standby GigabitEthernet0/1 1" },
      { label: "VRRP equivalent", cmd: "show vrrp brief" },
      { label: "GLBP equivalent", cmd: "show glbp brief" },
      { label: "Debug HSRP state changes", cmd: "debug standby" },
    ],
    outputTips: [
      "'show standby brief' columns: Interface / Grp / Pri / P (preempt) / State / Active addr / Standby addr / Virtual IP.",
      "State should be 'Active' on the primary and 'Standby' on the backup. 'Init' or 'Listen' may indicate a misconfiguration.",
      "If both routers show 'Active', they cannot see each other's Hellos — check Layer 2 connectivity and VLAN assignment.",
      "Virtual MAC in ARP table of hosts should be 0000.0c07.acXX (group XX in hex) for HSRPv1.",
    ],
    tip: "If HSRP is not failing over as expected, check: same group number, same virtual IP, preempt configured, and that the standby router has a route to send Hellos to 224.0.0.2.",
    tags: ["HSRP", "FHRP", "show standby", "verify", "active", "standby", "VRRP", "GLBP"],
  },

  // ══════════════════════════════════════════════════════════
  //  ETHERCHANNEL
  // ══════════════════════════════════════════════════════════
  {
    id: 53,
    title: "Configure EtherChannel (LACP / PAgP)",
    category: "etherchannel",
    syntax: "interface range GigabitEthernet0/1 - 2\n channel-group <number> mode active\n\ninterface port-channel <number>\n switchport mode trunk",
    description: "Bundles multiple physical links into a single logical port-channel for increased bandwidth and redundancy. LACP (IEEE 802.3ad) is the open standard; PAgP is Cisco proprietary.",
    variations: [
      { label: "LACP active (initiates negotiation)", cmd: "channel-group 1 mode active" },
      { label: "LACP passive (waits for negotiation)", cmd: "channel-group 1 mode passive" },
      { label: "PAgP desirable (Cisco, initiates)", cmd: "channel-group 1 mode desirable" },
      { label: "PAgP auto (Cisco, waits)", cmd: "channel-group 1 mode auto" },
      { label: "Static EtherChannel (no negotiation)", cmd: "channel-group 1 mode on" },
      { label: "Configure port-channel as trunk", cmd: "interface port-channel 1\n switchport mode trunk\n switchport trunk allowed vlan 10,20,30" },
      { label: "Load-balance method", cmd: "port-channel load-balance src-dst-mac" },
    ],
    outputTips: [
      "'show etherchannel summary': one line per port-channel. Flags: U=in use, P=port in use, I=inactive, s=suspended, D=down.",
      "All member interfaces must match: speed, duplex, VLAN config, trunk/access mode, and native VLAN — or the channel will not form.",
      "The port-channel interface inherits all Layer 2 configuration. Configure trunk/access settings on the port-channel, not individual member links.",
      "'show etherchannel 1 detail' shows load-balancing method, protocol (LACP/PAgP/None), and per-port statistics.",
    ],
    tip: "At least one side must be 'active' (LACP) or 'desirable' (PAgP) — two 'passive' or two 'auto' sides will NOT form a channel. Use 'active' on both sides for simplicity.",
    tags: ["EtherChannel", "LACP", "PAgP", "port-channel", "channel-group", "link aggregation", "LAG"],
  },

  {
    id: 54,
    title: "Verify EtherChannel",
    category: "etherchannel",
    syntax: "show etherchannel summary\nshow etherchannel <number> detail\nshow interfaces port-channel <number>",
    description: "Verifies EtherChannel formation, member port status, load-balancing method, and protocol negotiation. Key troubleshooting command when a bundle is not forming.",
    variations: [
      { label: "Summary of all port-channels", cmd: "show etherchannel summary" },
      { label: "Detailed view of one channel", cmd: "show etherchannel 1 detail" },
      { label: "Port-channel interface status", cmd: "show interfaces port-channel 1" },
      { label: "LACP neighbor info", cmd: "show lacp neighbor" },
      { label: "LACP counters", cmd: "show lacp counters" },
      { label: "PAgP neighbor info", cmd: "show pagp neighbor" },
      { label: "Check member port config matches", cmd: "show interfaces GigabitEthernet0/1 trunk" },
    ],
    outputTips: [
      "In 'show etherchannel summary', look for 'SU' flags on the port-channel line (S=Layer2, U=in use). Member ports should show 'P' (in port-channel).",
      "If ports show 'I' (independent) or 'D' (down), the channel failed — most common cause is mismatched configuration on member ports.",
      "'show lacp neighbor' confirms the remote switch port and system ID — useful to verify both sides see each other.",
      "A port-channel with 'SD' flags (not 'SU') means all member links are down or in err-disabled state.",
    ],
    tip: "EtherChannel troubleshooting checklist: (1) same speed/duplex, (2) same VLAN/trunk config, (3) same native VLAN, (4) one side active/desirable, (5) no spanning-tree inconsistencies.",
    tags: ["EtherChannel", "show etherchannel summary", "port-channel", "LACP", "troubleshoot", "verify"],
  },

  // ══════════════════════════════════════════════════════════
  //  WAN / GRE
  // ══════════════════════════════════════════════════════════
  {
    id: 55,
    title: "Configure GRE Tunnel",
    category: "wan",
    syntax: "interface tunnel <number>\n ip address <tunnel-ip> <mask>\n tunnel source <local-interface-or-ip>\n tunnel destination <remote-public-ip>",
    description: "Creates a GRE (Generic Routing Encapsulation) tunnel between two routers across an IP network. GRE encapsulates any protocol (including multicast and routing protocol traffic) inside IP packets.",
    variations: [
      { label: "Basic GRE tunnel", cmd: "interface tunnel 0\n ip address 10.10.10.1 255.255.255.252\n tunnel source GigabitEthernet0/0\n tunnel destination 203.0.113.2" },
      { label: "Route traffic over tunnel", cmd: "ip route 192.168.2.0 255.255.255.0 10.10.10.2" },
      { label: "Run OSPF over GRE tunnel", cmd: "router ospf 1\n network 10.10.10.0 0.0.0.3 area 0" },
      { label: "GRE over IPsec (tunnel protection)", cmd: "interface tunnel 0\n tunnel protection ipsec profile <profile-name>" },
      { label: "Verify tunnel status", cmd: "show interfaces tunnel 0" },
      { label: "Verify tunnel endpoints", cmd: "show tunnel endpoints" },
    ],
    outputTips: [
      "'show interfaces tunnel X' — look for 'Tunnel0 is up, line protocol is up'. Protocol down = cannot reach tunnel destination via the underlay.",
      "Tunnel MTU is lower than physical MTU (GRE adds 24-byte overhead). Set 'ip tcp adjust-mss 1436' on tunnel interface to prevent fragmentation issues.",
      "GRE provides NO encryption — traffic is plaintext. Use 'tunnel protection ipsec profile' to add IPsec encryption.",
      "If the tunnel protocol is down, ping the tunnel destination IP using the tunnel source IP to test underlay connectivity.",
    ],
    tip: "The tunnel source interface must have a route to the tunnel destination before the tunnel can come up. The tunnel destination is always the remote router's public/underlay IP — not the tunnel IP.",
    tags: ["GRE", "tunnel", "WAN", "encapsulation", "ip tunnel", "VPN", "overlay"],
  },

  {
    id: 56,
    title: "WAN Interface and Serial Configuration",
    category: "wan",
    syntax: "interface serial <num>\n ip address <ip> <mask>\n encapsulation hdlc\n clock rate 64000\n no shutdown",
    description: "Configures serial WAN interfaces with HDLC (default Cisco encapsulation) or PPP. Serial interfaces require clock rate on the DCE side. Common in CCNA lab environments.",
    variations: [
      { label: "HDLC encapsulation (default)", cmd: "interface serial 0/0/0\n encapsulation hdlc" },
      { label: "PPP encapsulation", cmd: "interface serial 0/0/0\n encapsulation ppp" },
      { label: "PPP with CHAP authentication", cmd: "interface serial 0/0/0\n encapsulation ppp\n ppp authentication chap\n!\nusername <remote-hostname> secret <password>" },
      { label: "Set clock rate (DCE side only)", cmd: "clock rate 64000" },
      { label: "Verify encapsulation and line state", cmd: "show interfaces serial 0/0/0" },
      { label: "Determine DCE/DTE role", cmd: "show controllers serial 0/0/0" },
    ],
    outputTips: [
      "'show controllers serial X' — shows 'DCE' or 'DTE'. Only the DCE side needs 'clock rate'.",
      "'show interfaces serial X' — 'Serial0/0/0 is up, line protocol is up' = both physical and data link OK. 'up/down' = connected but encapsulation mismatch (HDLC vs PPP).",
      "HDLC is Cisco proprietary — two Cisco routers default to HDLC. If connecting to a non-Cisco device, use PPP.",
      "PPP supports authentication (CHAP/PAP), compression, and multilink — HDLC does not.",
    ],
    tip: "'Line protocol is down' on a serial with physical up usually means encapsulation mismatch or missing clock rate on the DCE side. Check 'show controllers' first.",
    tags: ["WAN", "serial", "HDLC", "PPP", "CHAP", "clock rate", "DCE", "DTE"],
  },

  // ══════════════════════════════════════════════════════════
  //  SECURITY (additions)
  // ══════════════════════════════════════════════════════════
  {
    id: 57,
    title: "Named ACL Configuration",
    category: "security",
    syntax: "ip access-list standard <name>\n permit <source> <wildcard>\n deny any\n!\nip access-list extended <name>\n permit tcp <src> <wildcard> <dst> <wildcard> eq <port>\n deny ip any any",
    description: "Creates named ACLs for readability and flexibility. Named ACLs allow individual ACE deletion/resequencing — numbered ACLs require full deletion and re-entry. Best practice for production.",
    variations: [
      { label: "Named standard ACL", cmd: "ip access-list standard MGMT_ACCESS\n permit 192.168.1.0 0.0.0.255\n deny any" },
      { label: "Named extended ACL", cmd: "ip access-list extended INTERNET_IN\n permit tcp any host 10.0.0.10 eq 80\n permit tcp any host 10.0.0.10 eq 443\n deny ip any any log" },
      { label: "Delete a specific ACE (by sequence number)", cmd: "ip access-list extended INTERNET_IN\n no 30" },
      { label: "Resequence ACL entries", cmd: "ip access-list resequence INTERNET_IN 10 10" },
      { label: "Apply to interface inbound", cmd: "interface GigabitEthernet0/1\n ip access-group INTERNET_IN in" },
      { label: "Apply to interface outbound", cmd: "interface GigabitEthernet0/1\n ip access-group MGMT_ACCESS out" },
      { label: "Apply to VTY lines", cmd: "line vty 0 15\n access-class MGMT_ACCESS in" },
      { label: "Verify ACL matches", cmd: "show ip access-lists <name>" },
    ],
    outputTips: [
      "'show ip access-lists' shows each ACE with its sequence number and match count — 'matches' increments every time traffic hits that rule.",
      "ACEs are evaluated top-to-bottom; first match wins. Add a 'permit' before a broad 'deny' or vice versa as needed.",
      "The implicit 'deny any' at the end of every ACL is invisible in 'show ip access-lists' but always present.",
      "Adding 'log' keyword to an ACE enables logging but increases CPU — use only for troubleshooting or security monitoring.",
    ],
    tip: "Use named ACLs in production — they allow 'no <seq>' to delete individual entries without rewriting the entire ACL. Use 'ip access-list resequence' to renumber after insertions.",
    tags: ["ACL", "named ACL", "ip access-list", "ip access-group", "extended ACL", "standard ACL", "permit", "deny"],
  },

];
