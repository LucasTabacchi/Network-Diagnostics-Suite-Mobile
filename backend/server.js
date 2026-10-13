const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory store for sync data
const serverDatabase = {
  installations: new Map(),
  diagnostics: new Map(),
  versions: new Map(),
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NetDiag Sync Hub',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// Catalog of remote technical sheets for equipment QR/barcode resolution
const REMOTE_DEVICE_SHEETS = {
  HG8245W5: {
    model: 'EchoLife HG8245W5',
    vendor: 'Huawei',
    category: 'ont',
    hardwareSpecs: {
      ports: '4x GE + 2x POTS + 1x USB + 1x GPON SC/APC',
      processor: 'HiSilicon SD5117P',
      frequency: '2.4 GHz + 5 GHz 802.11ac',
      opticalPower: 'Rx -8 dBm a -27 dBm',
      firmwareDefault: 'V500R019C00SPC120',
    },
    installationChecklist: [
      'Verificar potencia óptica entre -15 dBm y -24 dBm',
      'Configurar VLAN 100 para servicio de Internet',
      'Comprobar sincronismo PON en verde fijo',
    ],
  },
  HAP_AC2: {
    model: 'RouterBOARD hAP ac2 (RBD52G)',
    vendor: 'MikroTik',
    category: 'router',
    hardwareSpecs: {
      ports: '5x Gigabit Ethernet 10/100/1000 + 1x USB',
      processor: 'IPQ-4018 4 cores 716 MHz',
      frequency: 'Dual band 2.4 GHz + 5 GHz 802.11ac',
      firmwareDefault: 'RouterOS v7.14.3',
    },
    installationChecklist: [
      'Actualizar RouterOS y RouterBOOT firmware',
      'Configurar ether1 como WAN DHCP/PPPoE',
      'Crear bridge-lan en ether2-ether5',
    ],
  },
  LBE_5AC_GEN2: {
    model: 'LiteBeam 5AC Gen2',
    vendor: 'Ubiquiti',
    category: 'antenna',
    hardwareSpecs: {
      ports: '1x 10/100/1000 Ethernet (PoE pasivo 24V)',
      processor: 'MIPS 74Kc',
      frequency: '5150 - 5875 MHz',
      firmwareDefault: 'airOS v8.7.1',
    },
    installationChecklist: [
      'Alinear mástil con nivel de burbuja',
      'Ajustar azimuth y elevación para señal > -65 dBm',
    ],
  },
  SG250_8P: {
    model: 'Cisco 250 Series SG250-8P',
    vendor: 'Cisco',
    category: 'switch',
    hardwareSpecs: {
      ports: '8x Gigabit Ethernet PoE+',
      processor: 'ARM 800 MHz',
      firmwareDefault: 'Firmware 2.5.5.47',
    },
    installationChecklist: [
      'Asignar IP estática de gestión en VLAN nativa',
      'Comprobar consumo total de puertos PoE',
    ],
  },
};

app.get('/sheets/:id', (req, res) => {
  const query = (req.params.id || '').toUpperCase();
  for (const [key, sheet] of Object.entries(REMOTE_DEVICE_SHEETS)) {
    if (query.includes(key) || key.includes(query) || sheet.model.toUpperCase().includes(query)) {
      return res.json({
        ...sheet,
        source: 'remote',
        fetchedAt: Date.now(),
      });
    }
  }
  res.status(404).json({ error: 'Ficha técnica no encontrada en repositorio central' });
});

// Push endpoint for mobile app outbox sync
app.post('/sync/push', (req, res) => {
  const { items, force } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Payload must contain an "items" array.' });
  }

  const results = [];

  for (const item of items) {
    const { id, entityType, entityId, payloadJson, baseVersion } = item;
    let payload = {};
    try {
      payload = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
    } catch {
      payload = {};
    }

    // Conflict simulation or real version check:
    const isConflictSimulated =
      payload.simulateConflict === true ||
      entityId === 'conflict-test' ||
      entityId?.includes('conflict');

    const currentServerVersion = serverDatabase.versions.get(entityId) || 1;
    const isVersionOutdated = (baseVersion || 1) < currentServerVersion;

    if (!force && (isConflictSimulated || isVersionOutdated)) {
      const existingRecord =
        serverDatabase.installations.get(entityId) ||
        serverDatabase.diagnostics.get(entityId) || {
          id: entityId,
          deviceName: payload.deviceName || 'Router MikroTik hAP ac2',
          siteName: payload.siteName || 'Sitio Azotea Norte',
          notes: 'Equipo registrado en Nodo Central. Notas distintas a las locales.',
          version: currentServerVersion,
          updatedAt: Date.now(),
        };

      return res.status(409).json({
        error: 'Conflict detected',
        conflictId: id,
        entityId: entityId,
        serverVersion: {
          ...existingRecord,
          version: Math.max(existingRecord.version || 1, 2),
        },
        localVersion: payload,
      });
    }

    // Normal successful persistence
    const nextVersion = currentServerVersion + 1;
    serverDatabase.versions.set(entityId, nextVersion);

    if (entityType === 'installation') {
      serverDatabase.installations.set(entityId, { ...payload, version: nextVersion });
    } else if (entityType === 'diagnostic') {
      serverDatabase.diagnostics.set(entityId, { ...payload, version: nextVersion });
    }

    results.push({
      id: id,
      entityId: entityId,
      status: 'synced',
      version: nextVersion,
    });
  }

  res.json({
    status: 'success',
    processed: results.length,
    results: results,
  });
});

// Pull endpoint to fetch server updates
app.get('/sync/pull', (req, res) => {
  const since = Number(req.query.since) || 0;
  const installations = Array.from(serverDatabase.installations.values()).filter(
    (i) => (i.updatedAt || 0) > since
  );
  const diagnostics = Array.from(serverDatabase.diagnostics.values()).filter(
    (d) => (d.updatedAt || 0) > since
  );

  res.json({
    status: 'success',
    timestamp: Date.now(),
    updates: {
      installations,
      diagnostics,
    },
  });
});

const { startSnmpServer } = require('./snmpServer');
const { startSshServer } = require('./sshServer');

app.listen(PORT, () => {
  console.log(`[NetDiag Backend] Sync stub server running on port ${PORT}`);
  try {
    startSnmpServer(161);
  } catch (err) {
    console.warn('[NetDiag Backend] Could not start SNMP server:', err.message);
  }
  try {
    startSshServer(22);
  } catch (err) {
    console.warn('[NetDiag Backend] Could not start SSH server:', err.message);
  }
});
