// ─────────────────────────────────────────────────────────────────────────────
//  NetReady — Scenario Questions Data
//  Multi-step troubleshooting scenarios
// ─────────────────────────────────────────────────────────────────────────────

var SCENARIO_QUESTIONS = [
  {
    id: 'sc1', title: 'User Cannot Reach the Internet',
    situation: 'A user reports they cannot access any websites. They can ping their default gateway but cannot ping 8.8.8.8.',
    steps: [
      { question: 'Which OSI layer is most likely the problem?', options: ['Layer 1 - Physical', 'Layer 2 - Data Link', 'Layer 3 - Network', 'Layer 7 - Application'], answer: 'Layer 3 - Network' },
      { question: 'What command would you run first to diagnose?', options: ['show ip route', 'show interfaces', 'traceroute 8.8.8.8', 'show arp'], answer: 'traceroute 8.8.8.8' },
      { question: 'The traceroute stops at the edge router. What is the likely issue?', options: ['No default route configured', 'DNS server down', 'VLAN mismatch', 'Duplex mismatch'], answer: 'No default route configured' },
      { question: 'What command fixes this on the edge router?', options: ['ip route 0.0.0.0 0.0.0.0 <next-hop>', 'ip default-gateway', 'no shutdown', 'switchport mode access'], answer: 'ip route 0.0.0.0 0.0.0.0 <next-hop>' },
    ]
  },
  {
    id: 'sc2', title: 'VLAN Communication Failure',
    situation: 'Two PCs on the same switch but different VLANs (VLAN 10 and VLAN 20) cannot communicate with each other.',
    steps: [
      { question: 'Why can\'t they communicate directly?', options: ['VLANs require a router for inter-VLAN routing', 'The switch needs a reboot', 'ARP tables are full', 'STP is blocking'], answer: 'VLANs require a router for inter-VLAN routing' },
      { question: 'What solution enables inter-VLAN routing?', options: ['Router-on-a-stick', 'Port mirroring', 'EtherChannel', 'DHCP relay'], answer: 'Router-on-a-stick' },
      { question: 'What must the switch port connected to the router be configured as?', options: ['Trunk port', 'Access port', 'Port-channel', 'Monitor port'], answer: 'Trunk port' },
    ]
  },
  {
    id: 'sc3', title: 'Slow Network Performance',
    situation: 'Users report extremely slow file transfers between two buildings connected by a single link.',
    steps: [
      { question: 'What is the first thing to check on the link?', options: ['Interface errors and duplex settings', 'VLAN configuration', 'ACL rules', 'DNS resolution time'], answer: 'Interface errors and duplex settings' },
      { question: 'You see high CRC errors. What is the likely cause?', options: ['Duplex mismatch', 'Wrong subnet mask', 'Incorrect VLAN', 'OSPF misconfiguration'], answer: 'Duplex mismatch' },
      { question: 'Both sides are set to auto-negotiate. One side shows half-duplex. What is the fix?', options: ['Manually set both sides to full-duplex', 'Change the cable', 'Enable spanning tree', 'Set speed to 10Mbps'], answer: 'Manually set both sides to full-duplex' },
    ]
  },
  {
    id: 'sc4', title: 'OSPF Neighbor Not Forming',
    situation: 'Two routers connected via an Ethernet link are not forming an OSPF adjacency. Both have OSPF configured.',
    steps: [
      { question: 'What must match for OSPF neighbors to form?', options: ['Area ID, hello/dead timers, subnet mask', 'Hostname and password', 'Router ID only', 'Interface speed only'], answer: 'Area ID, hello/dead timers, subnet mask' },
      { question: 'You run "show ip ospf interface" and see different area IDs. What do you fix?', options: ['Change the area ID on one router to match', 'Restart OSPF process', 'Change the router ID', 'Enable passive interface'], answer: 'Change the area ID on one router to match' },
      { question: 'After fixing area IDs, neighbors still won\'t form. Show ip ospf shows different hello timers. Default hello timer is?', options: ['10 seconds', '30 seconds', '5 seconds', '60 seconds'], answer: '10 seconds' },
    ]
  },
  {
    id: 'sc5', title: 'DHCP Not Assigning Addresses',
    situation: 'New PCs plugged into VLAN 30 are getting 169.254.x.x addresses instead of DHCP assignments.',
    steps: [
      { question: 'What does a 169.254.x.x address indicate?', options: ['DHCP server unreachable (APIPA)', 'Static IP configured', 'DNS failure', 'Firewall blocking'], answer: 'DHCP server unreachable (APIPA)' },
      { question: 'The DHCP server is on a different subnet. What is needed?', options: ['ip helper-address on the VLAN interface', 'Port forwarding on the firewall', 'A second DHCP server', 'NAT configuration'], answer: 'ip helper-address on the VLAN interface' },
      { question: 'What command configures this on the SVI?', options: ['ip helper-address <DHCP-server-IP>', 'ip dhcp relay', 'ip forward-protocol udp', 'service dhcp'], answer: 'ip helper-address <DHCP-server-IP>' },
    ]
  },
  {
    id: 'sc6', title: 'Switch Port Security Violation',
    situation: 'A user moved their laptop to a different port and lost network connectivity. The port LED is amber.',
    steps: [
      { question: 'What is the most likely cause?', options: ['Port security violation (err-disabled)', 'Cable fault', 'VLAN pruning', 'STP root bridge change'], answer: 'Port security violation (err-disabled)' },
      { question: 'What command verifies this?', options: ['show port-security interface', 'show mac address-table', 'show spanning-tree', 'show ip route'], answer: 'show port-security interface' },
      { question: 'How do you recover the port?', options: ['shutdown then no shutdown on the interface', 'clear mac address-table', 'reload the switch', 'Delete the VLAN'], answer: 'shutdown then no shutdown on the interface' },
    ]
  },
  {
    id: 'sc7', title: 'NAT Not Translating',
    situation: 'Internal hosts on 192.168.1.0/24 cannot reach the internet. The router has NAT configured but translations are empty.',
    steps: [
      { question: 'What should you check first in NAT config?', options: ['Inside and outside interface assignments', 'ACL on the WAN interface', 'Default route', 'OSPF redistribution'], answer: 'Inside and outside interface assignments' },
      { question: 'The inside interface has "ip nat inside" but the outside interface is missing its designation. What command fixes it?', options: ['ip nat outside', 'ip nat inside', 'ip nat enable', 'ip nat pool'], answer: 'ip nat outside' },
      { question: 'After fixing, you see translations but users still can\'t browse. What else could be missing?', options: ['ACL for NAT overload not matching traffic', 'STP blocking the WAN port', 'DHCP scope exhausted', 'CDP disabled'], answer: 'ACL for NAT overload not matching traffic' },
    ]
  },
  {
    id: 'sc8', title: 'Wireless Client Cannot Connect',
    situation: 'A user\'s laptop can see the corporate SSID but fails to connect. Other devices on the same SSID work fine.',
    steps: [
      { question: 'What is the first thing to check on the laptop?', options: ['Wireless security settings (WPA2/password)', 'IP address configuration', 'DNS settings', 'Proxy settings'], answer: 'Wireless security settings (WPA2/password)' },
      { question: 'Security settings match. The AP logs show "authentication failure." What might be wrong?', options: ['802.1X certificate expired or wrong credentials', 'Channel overlap', 'Power too low', 'SSID broadcast disabled'], answer: '802.1X certificate expired or wrong credentials' },
      { question: 'What protocol handles enterprise wireless authentication?', options: ['RADIUS', 'TACACS+', 'LDAP', 'Kerberos'], answer: 'RADIUS' },
    ]
  },
  {
    id: 'sc9', title: 'ACL Blocking Legitimate Traffic',
    situation: 'After applying a new ACL, the help desk reports that users cannot access the internal web server at 10.0.1.50.',
    steps: [
      { question: 'What is the implicit rule at the end of every ACL?', options: ['deny any', 'permit any', 'log all', 'drop and notify'], answer: 'deny any' },
      { question: 'You need to allow HTTP to 10.0.1.50. What ACL entry is needed?', options: ['permit tcp any host 10.0.1.50 eq 80', 'permit ip any any', 'deny tcp any any eq 80', 'permit udp any host 10.0.1.50 eq 80'], answer: 'permit tcp any host 10.0.1.50 eq 80' },
      { question: 'Where should this ACL be applied?', options: ['As close to the source as possible for extended ACLs', 'On the web server itself', 'On every interface', 'Only on the WAN interface'], answer: 'As close to the source as possible for extended ACLs' },
    ]
  },
  {
    id: 'sc10', title: 'Spanning Tree Loop Detected',
    situation: 'The network is experiencing broadcast storms. MAC address tables are constantly flapping.',
    steps: [
      { question: 'What is the most likely cause?', options: ['Spanning tree loop', 'DHCP exhaustion', 'Routing loop', 'ARP poisoning'], answer: 'Spanning tree loop' },
      { question: 'What command helps identify the issue?', options: ['show spanning-tree', 'show ip route', 'show arp', 'show ip interface brief'], answer: 'show spanning-tree' },
      { question: 'What feature prevents loops on access ports?', options: ['BPDU Guard / PortFast', 'Root Guard', 'Loop Guard', 'UDLD'], answer: 'BPDU Guard / PortFast' },
    ]
  },
  {
    id: 'sc11', title: 'EtherChannel Misconfiguration',
    situation: 'An EtherChannel between two switches is not forming. Individual links are up but the port-channel is down.',
    steps: [
      { question: 'What must match on both sides for EtherChannel?', options: ['Speed, duplex, VLAN, trunk mode, and channel protocol', 'Only speed and duplex', 'Just the channel group number', 'STP priority'], answer: 'Speed, duplex, VLAN, trunk mode, and channel protocol' },
      { question: 'One side is set to LACP active and the other to PAgP desirable. Will this work?', options: ['No - both must use the same protocol', 'Yes - they auto-negotiate', 'Only with a crossover cable', 'Only on Layer 3 switches'], answer: 'No - both must use the same protocol' },
      { question: 'What LACP mode combinations form a channel?', options: ['active-active or active-passive', 'Only active-active', 'passive-passive', 'Any combination works'], answer: 'active-active or active-passive' },
    ]
  },
  {
    id: 'sc12', title: 'IPv6 Address Not Working',
    situation: 'A router has been configured with an IPv6 address but cannot ping other IPv6 hosts on the network.',
    steps: [
      { question: 'What must be enabled globally for IPv6 routing?', options: ['ipv6 unicast-routing', 'ip routing', 'ipv6 enable', 'router ospfv3'], answer: 'ipv6 unicast-routing' },
      { question: 'What type of IPv6 address is automatically created on every IPv6-enabled interface?', options: ['Link-local (fe80::)', 'Global unicast', 'Multicast', 'Anycast'], answer: 'Link-local (fe80::)' },
      { question: 'What protocol does IPv6 use instead of ARP?', options: ['NDP (Neighbor Discovery Protocol)', 'IGMP', 'ICMPv6 Echo', 'DHCPv6'], answer: 'NDP (Neighbor Discovery Protocol)' },
    ]
  },
  {
    id: 'sc13', title: 'SSH Access Denied',
    situation: 'An admin cannot SSH into a switch. Telnet works but SSH connections are refused.',
    steps: [
      { question: 'What is required for SSH that Telnet does not need?', options: ['RSA key pair and domain name', 'Enable secret', 'Console password', 'SNMP community string'], answer: 'RSA key pair and domain name' },
      { question: 'What command generates the SSH key?', options: ['crypto key generate rsa', 'ip ssh server', 'ssh-keygen', 'enable ssh'], answer: 'crypto key generate rsa' },
      { question: 'What VTY line command restricts access to SSH only?', options: ['transport input ssh', 'login local', 'no telnet', 'protocol ssh'], answer: 'transport input ssh' },
    ]
  },
  {
    id: 'sc14', title: 'HSRP Failover Not Working',
    situation: 'The primary HSRP router failed but traffic is not moving to the standby router.',
    steps: [
      { question: 'What does HSRP provide?', options: ['First Hop Redundancy (virtual gateway IP)', 'Load balancing', 'Link aggregation', 'Route summarization'], answer: 'First Hop Redundancy (virtual gateway IP)' },
      { question: 'What must match on both HSRP routers?', options: ['Group number and virtual IP address', 'Hostname and IOS version', 'Interface speed only', 'OSPF area'], answer: 'Group number and virtual IP address' },
      { question: 'You find the standby router has a different HSRP group number. After fixing it, what determines which router is active?', options: ['Priority value (highest wins)', 'Router ID', 'IP address (lowest wins)', 'MAC address'], answer: 'Priority value (highest wins)' },
    ]
  },
  {
    id: 'sc15', title: 'Subnet Addressing Error',
    situation: 'Two devices on the same physical segment cannot ping each other. One has 192.168.1.65/26 and the other has 192.168.1.130/26.',
    steps: [
      { question: 'Are these two addresses in the same subnet?', options: ['No - they are in different /26 subnets', 'Yes - both are in 192.168.1.0/24', 'Cannot determine without the gateway', 'Only if a router connects them'], answer: 'No - they are in different /26 subnets' },
      { question: 'What is the range of the first /26 subnet containing .65?', options: ['192.168.1.64 - 192.168.1.127', '192.168.1.0 - 192.168.1.63', '192.168.1.128 - 192.168.1.191', '192.168.1.1 - 192.168.1.126'], answer: '192.168.1.64 - 192.168.1.127' },
      { question: 'How many usable host addresses are in a /26 subnet?', options: ['62', '64', '30', '126'], answer: '62' },
    ]
  },
];
