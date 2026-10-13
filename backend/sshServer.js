const ssh2 = require('ssh2');
const crypto = require('crypto');

// Generate RSA host key for the server
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

function handleCommand(cmd) {
  const clean = (cmd || '').trim();

  // MikroTik
  if (clean.includes('/system resource print')) {
    return (
      `  uptime: 14d12h19m\n` +
      `  version: 7.14.3 (stable)\n` +
      `  build-time: 2026-03-12 10:14:02\n` +
      `  factory-software: 7.6\n` +
      `  free-memory: 89.4MiB\n` +
      `  total-memory: 128.0MiB\n` +
      `  cpu: ARM\n` +
      `  cpu-count: 4\n` +
      `  cpu-frequency: 716MHz\n` +
      `  cpu-load: 14%\n` +
      `  free-hdd-space: 4.8MiB\n` +
      `  total-hdd-space: 16.0MiB\n` +
      `  write-sect-since-reboot: 1845\n` +
      `  write-sect-total: 39120\n` +
      `  architecture-name: arm\n` +
      `  board-name: hAP ac2\n` +
      `  platform: MikroTik\n`
    );
  }

  if (clean.includes('/interface print')) {
    return (
      `Flags: D - DYNAMIC; X - DISABLED, R - RUNNING; S - SLAVE\n` +
      ` 0  R  name="ether1-gateway" default-name="ether1" type="ether" mtu=1500 actual-mtu=1500 mac-address=B8:69:F4:11:C2:AA fast-path=yes\n` +
      ` 1  RS name="ether2" default-name="ether2" type="ether" mtu=1500 actual-mtu=1500 mac-address=B8:69:F4:11:C2:AB fast-path=yes\n` +
      ` 2  RS name="ether3" default-name="ether3" type="ether" mtu=1500 actual-mtu=1500 mac-address=B8:69:F4:11:C2:AC fast-path=yes\n` +
      ` 3  RS name="ether4" default-name="ether4" type="ether" mtu=1500 actual-mtu=1500 mac-address=B8:69:F4:11:C2:AD fast-path=yes\n` +
      ` 4  RS name="ether5" default-name="ether5" type="ether" mtu=1500 actual-mtu=1500 mac-address=B8:69:F4:11:C2:AE fast-path=yes\n`
    );
  }

  if (clean.includes('/ip address print')) {
    return (
      `Flags: X - DISABLED, I - INVALID, D - DYNAMIC\n` +
      ` #   ADDRESS            NETWORK         INTERFACE\n` +
      ` 0   10.0.2.2/24        10.0.2.0        ether1-gateway\n` +
      ` 1   192.168.88.1/24    192.168.88.0    bridge-lan\n`
    );
  }

  if (clean.includes('/system identity print')) {
    return `name: RTR-CORE-CENTRAL\n`;
  }

  // Cisco
  if (clean.includes('show version')) {
    return (
      `Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(2)E8\n` +
      `Technical Support: http://www.cisco.com/techsupport\n` +
      `ROM: Bootstrap program is C2960 boot loader\n` +
      `cisco WS-C2960-24TT-L (PowerPC405) processor with 65536K bytes of memory.\n` +
      `Model number: WS-C2960-24TT-L\n` +
      `System serial number: FOC1234X5YZ\n`
    );
  }

  if (clean.includes('show ip int') || clean.includes('show ip interface')) {
    return (
      `Interface              IP-Address      OK? Method Status                Protocol\n` +
      `FastEthernet0/1        unassigned      YES unset  up                    up      \n` +
      `FastEthernet0/2        unassigned      YES unset  up                    up      \n` +
      `Vlan1                  10.0.2.2        YES manual up                    up      \n`
    );
  }

  // Huawei
  if (clean.includes('display version')) {
    return (
      `Huawei Versatile Routing Platform Software\n` +
      `VRP (R) software, Version 5.170 (V200R019C00SPC120)\n` +
      `Copyright (C) 2012-2026 HUAWEI TECH CO., LTD.\n` +
      `Quidway S5700 Routing Switch uptime is 12 days, 4 hours, 23 minutes\n`
    );
  }

  if (clean.includes('display int') || clean.includes('display interface')) {
    return (
      `Interface                   PHY      Protocol InUti OutUti   inErrors  outErrors\n` +
      `GigabitEthernet0/0/1        up       up          0%     0%          0          0\n` +
      `GigabitEthernet0/0/2        up       up       0.01%  0.01%          0          0\n` +
      `MEth0/0/1                   *down    down        0%     0%          0          0\n`
    );
  }

  // Ubiquiti
  if (clean.includes('mca-status')) {
    return (
      `deviceName=LBE-5AC-Gen2\n` +
      `deviceModel=LiteBeam 5AC Gen2\n` +
      `firmwareVersion=WA.v8.7.1\n` +
      `uptime=125430\n` +
      `wlanRxBytes=54238910\n` +
      `wlanTxBytes=12984501\n` +
      `signal=-62\n` +
      `noise=-95\n` +
      `ccq=98.5\n`
    );
  }

  if (clean.includes('ifconfig')) {
    return (
      `eth0      Link encap:Ethernet  HWaddr DC:9F:DB:44:19:EF\n` +
      `          inet addr:10.0.2.2  Bcast:10.0.2.255  Mask:255.255.255.0\n` +
      `          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1\n` +
      `          RX packets:489102 errors:0 dropped:0 overruns:0 frame:0\n` +
      `          TX packets:329481 errors:0 dropped:0 overruns:0 carrier:0\n`
    );
  }

  return `[RTR-CORE-CENTRAL] Comando ejecutado con éxito: ${clean}\n`;
}

function startSshServer(port = 22) {
  const server = new ssh2.Server(
    {
      hostKeys: [privateKey],
    },
    (client) => {
      client.on('authentication', (ctx) => {
        // Accept any username and password for development testing
        ctx.accept();
      });

      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();

          session.on('pty', (acceptPty) => {
            acceptPty();
          });

          session.on('shell', (acceptShell) => {
            const stream = acceptShell();
            stream.write('MikroTik RouterOS 7.14.3 (terminal)\r\n[admin@RTR-CORE-CENTRAL] > ');
            stream.on('data', (data) => {
              const str = data.toString();
              const response = handleCommand(str);
              stream.write(`\r\n${response.replace(/\n/g, '\r\n')}[admin@RTR-CORE-CENTRAL] > `);
            });
          });

          session.on('exec', (acceptExec, rejectExec, info) => {
            const stream = acceptExec();
            const output = handleCommand(info.command);
            stream.write(output);
            stream.exit(0);
            stream.end();
            console.log(`[SSH Server] Executed command: "${info.command}"`);
          });
        });
      });

      client.on('error', (err) => {
        console.warn('[SSH Server] Client error:', err.message);
      });
    }
  );

  server.on('error', (err) => {
    console.error('[SSH Server] Server error:', err.message);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[SSH Server] Listening on tcp://0.0.0.0:${port}`);
  });

  return server;
}

module.exports = {
  startSshServer,
};
