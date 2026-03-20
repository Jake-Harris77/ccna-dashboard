// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Practice Lab Data
//  Drag-and-drop exercises
// ─────────────────────────────────────────────────────────────────────────────

var LAB_EXERCISES = [
  {
    id: 'lab1', title: 'OSI Model Layer Order', type: 'order',
    instruction: 'Drag the OSI layers into the correct order from Layer 1 (bottom) to Layer 7 (top).',
    items: ['Physical', 'Data Link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'],
    correctOrder: ['Physical', 'Data Link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'],
  },
  {
    id: 'lab2', title: 'TCP/IP Model Layers', type: 'order',
    instruction: 'Arrange the TCP/IP model layers from bottom to top.',
    items: ['Network Access', 'Internet', 'Transport', 'Application'],
    correctOrder: ['Network Access', 'Internet', 'Transport', 'Application'],
  },
  {
    id: 'lab3', title: 'Port to Protocol Matching', type: 'match',
    instruction: 'Match each port number to its protocol.',
    pairs: [
      { left: 'Port 22', right: 'SSH' },
      { left: 'Port 23', right: 'Telnet' },
      { left: 'Port 53', right: 'DNS' },
      { left: 'Port 80', right: 'HTTP' },
      { left: 'Port 443', right: 'HTTPS' },
      { left: 'Port 25', right: 'SMTP' },
    ],
  },
  {
    id: 'lab4', title: 'OSI Layer to PDU Matching', type: 'match',
    instruction: 'Match each OSI layer to its Protocol Data Unit.',
    pairs: [
      { left: 'Layer 1', right: 'Bits' },
      { left: 'Layer 2', right: 'Frames' },
      { left: 'Layer 3', right: 'Packets' },
      { left: 'Layer 4', right: 'Segments' },
    ],
  },
  {
    id: 'lab5', title: 'Subnetting Steps', type: 'order',
    instruction: 'Arrange the subnetting process in the correct order.',
    items: [
      'Determine the number of subnets needed',
      'Determine the number of host bits to borrow',
      'Calculate the new subnet mask',
      'Calculate the block size',
      'List the subnet ranges',
      'Identify usable host addresses'
    ],
    correctOrder: [
      'Determine the number of subnets needed',
      'Determine the number of host bits to borrow',
      'Calculate the new subnet mask',
      'Calculate the block size',
      'List the subnet ranges',
      'Identify usable host addresses'
    ],
  },
  {
    id: 'lab6', title: 'OSPF Neighbor States', type: 'order',
    instruction: 'Arrange the OSPF neighbor states in the correct order.',
    items: ['Down', 'Init', '2-Way', 'ExStart', 'Exchange', 'Loading', 'Full'],
    correctOrder: ['Down', 'Init', '2-Way', 'ExStart', 'Exchange', 'Loading', 'Full'],
  },
  {
    id: 'lab7', title: 'Wireless Standard Speeds', type: 'match',
    instruction: 'Match each Wi-Fi standard to its maximum speed.',
    pairs: [
      { left: '802.11a', right: '54 Mbps' },
      { left: '802.11n', right: '600 Mbps' },
      { left: '802.11ac', right: '6.9 Gbps' },
      { left: '802.11ax', right: '9.6 Gbps' },
    ],
  },
  {
    id: 'lab8', title: 'Cable Type Matching', type: 'match',
    instruction: 'Match each connection scenario to the correct cable type.',
    pairs: [
      { left: 'Switch to Switch', right: 'Crossover' },
      { left: 'Switch to Router', right: 'Straight-through' },
      { left: 'Switch to PC', right: 'Straight-through' },
      { left: 'Router to Router', right: 'Crossover' },
    ],
  },
  {
    id: 'lab9', title: 'STP Port States', type: 'order',
    instruction: 'Arrange the STP port states in the correct transition order.',
    items: ['Blocking', 'Listening', 'Learning', 'Forwarding'],
    correctOrder: ['Blocking', 'Listening', 'Learning', 'Forwarding'],
  },
  {
    id: 'lab10', title: 'Router Boot Sequence', type: 'order',
    instruction: 'Arrange the Cisco router boot sequence in the correct order.',
    items: ['POST', 'Load Bootstrap', 'Locate IOS', 'Load IOS', 'Locate Configuration', 'Load Configuration'],
    correctOrder: ['POST', 'Load Bootstrap', 'Locate IOS', 'Load IOS', 'Locate Configuration', 'Load Configuration'],
  },
  {
    id: 'lab11', title: 'Private IP Ranges', type: 'match',
    instruction: 'Match each class to its private IP address range.',
    pairs: [
      { left: 'Class A', right: '10.0.0.0 - 10.255.255.255' },
      { left: 'Class B', right: '172.16.0.0 - 172.31.255.255' },
      { left: 'Class C', right: '192.168.0.0 - 192.168.255.255' },
    ],
  },
  {
    id: 'lab12', title: 'DHCP DORA Process', type: 'order',
    instruction: 'Arrange the DHCP process steps in order.',
    items: ['Discover', 'Offer', 'Request', 'Acknowledge'],
    correctOrder: ['Discover', 'Offer', 'Request', 'Acknowledge'],
  },
];
