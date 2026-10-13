import { DeviceRepository } from '../store/repositories/DeviceRepository';

export interface DeviceSheet {
  model: string;
  vendor: string;
  category: 'ont' | 'router' | 'antenna' | 'switch' | 'generic';
  serialNumber?: string;
  mac?: string;
  ip?: string;
  hardwareSpecs: {
    ports: string;
    processor?: string;
    frequency?: string;
    opticalPower?: string;
    firmwareDefault: string;
  };
  installationChecklist: string[];
}

export const DEVICE_CATALOG: Record<string, Omit<DeviceSheet, 'serialNumber' | 'mac' | 'ip'>> = {
  HG8245W5: {
    model: 'EchoLife HG8245W5',
    vendor: 'Huawei',
    category: 'ont',
    hardwareSpecs: {
      ports: '4x GE + 2x POTS + 1x USB + 1x GPON SC/APC',
      processor: 'HiSilicon SD5117P',
      frequency: '2.4 GHz (2x2 MIMO) + 5 GHz (2x2 MIMO 802.11ac)',
      opticalPower: 'Rx -8 dBm a -27 dBm (Sensibilidad Clase B+)',
      firmwareDefault: 'V500R019C00SPC120',
    },
    installationChecklist: [
      'Verificar potencia óptica entre -15 dBm y -24 dBm',
      'Configurar VLAN 100 para servicio de Internet',
      'Comprobar sincronismo PON en verde fijo',
      'Registrar número de serie (HWTC...) en OLT',
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
      'Deshabilitar servicios inseguros (telnet, ftp, api)',
    ],
  },
  LBE_5AC_GEN2: {
    model: 'LiteBeam 5AC Gen2',
    vendor: 'Ubiquiti',
    category: 'antenna',
    hardwareSpecs: {
      ports: '1x 10/100/1000 Ethernet (PoE pasivo 24V 0.5A)',
      processor: 'MIPS 74Kc',
      frequency: '5150 - 5875 MHz (Ganancia 23 dBi)',
      firmwareDefault: 'airOS v8.7.1',
    },
    installationChecklist: [
      'Alinear mástil con nivel de burbuja',
      'Ajustar azimuth y elevación para señal > -65 dBm',
      'Verificar CINR mayor a 28 dB',
      'Habilitar aislamiento de clientes en AP',
    ],
  },
  SG250_8P: {
    model: 'Cisco 250 Series SG250-8P',
    vendor: 'Cisco',
    category: 'switch',
    hardwareSpecs: {
      ports: '8x Gigabit Ethernet PoE+ (Presupuesto 62W)',
      processor: 'ARM 800 MHz',
      firmwareDefault: 'Firmware 2.5.5.47',
    },
    installationChecklist: [
      'Asignar IP estática de gestión en VLAN nativa',
      'Comprobar consumo total de puertos PoE',
      'Habilitar Spanning Tree (RSTP)',
      'Guardar configuración en running-config y startup-config',
    ],
  },
};

export class DeviceSheetCache {
  constructor(private deviceRepo?: DeviceRepository) {}

  /**
   * Parses raw string from barcode/QR code into device keys
   */
  static parseQrCode(payload: string): {
    serialNumber?: string;
    mac?: string;
    model?: string;
    ip?: string;
  } {
    const trimmed = payload.trim();

    // 1. JSON payload
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        return {
          serialNumber: obj.sn || obj.serialNumber || obj.serial,
          mac: obj.mac || obj.macAddress,
          model: obj.model || obj.name,
          ip: obj.ip || obj.target,
        };
      } catch (_) {}
    }

    // 2. URL parameters payload (e.g. https://netdiag.app/device?sn=HWTC1234&model=HG8245W5)
    if (trimmed.includes('?') && trimmed.includes('=')) {
      const queryPart = trimmed.split('?')[1];
      const params = new URLSearchParams(queryPart);
      return {
        serialNumber: params.get('sn') || params.get('serial') || undefined,
        mac: params.get('mac') || undefined,
        model: params.get('model') || undefined,
        ip: params.get('ip') || undefined,
      };
    }

    // 3. Formatted MAC address (XX:XX:XX:XX:XX:XX)
    if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(trimmed)) {
      return { mac: trimmed };
    }

    // 4. Default: serial number string
    return { serialNumber: trimmed };
  }

  /**
   * Resolves a device technical sheet using cache-first approach
   */
  async resolveDeviceSheet(qrPayload: string, backendUrl = 'http://10.0.2.2:3000'): Promise<DeviceSheet> {
    const parsed = DeviceSheetCache.parseQrCode(qrPayload);
    const lower = (parsed.model || parsed.serialNumber || qrPayload).toLowerCase();

    let catalogEntry: Omit<DeviceSheet, 'serialNumber' | 'mac' | 'ip'> | null = null;

    if (lower.includes('mikrotik') || lower.includes('hap') || lower.includes('rbd52')) {
      catalogEntry = DEVICE_CATALOG.HAP_AC2;
    } else if (lower.includes('ubiquiti') || lower.includes('litebeam') || lower.includes('lbe')) {
      catalogEntry = DEVICE_CATALOG.LBE_5AC_GEN2;
    } else if (lower.includes('cisco') || lower.includes('sg250') || lower.includes('switch')) {
      catalogEntry = DEVICE_CATALOG.SG250_8P;
    } else if (lower.includes('huawei') || lower.includes('hg8245') || lower.includes('ont') || lower.includes('hwtc')) {
      catalogEntry = DEVICE_CATALOG.HG8245W5;
    }

    // Try remote fetch if online and model/sn is known
    try {
      const queryId = parsed.model || parsed.serialNumber || '';
      if (queryId && typeof fetch === 'function') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300);
        try {
          const res = await fetch(`${backendUrl}/sheets/${encodeURIComponent(queryId)}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res && res.ok) {
            const remoteSheet = await res.json();
            if (remoteSheet && remoteSheet.model) {
              catalogEntry = remoteSheet;
            }
          }
        } catch (_) {
          clearTimeout(timeoutId);
        }
      }
    } catch (_) {
      // Offline fallback: rely on local catalog
    }

    if (!catalogEntry) {
      catalogEntry = {
        model: parsed.model || `Equipo (${parsed.serialNumber || 'Desconocido'})`,
        vendor: 'Genérico / Desconocido',
        category: 'generic',
        hardwareSpecs: {
          ports: 'Ethernet RJ45',
          firmwareDefault: 'N/A',
        },
        installationChecklist: [
          'Verificar encendido y estado de LEDs',
          'Comprobar continuidad de cableado',
          'Registrar número de serie en ficha',
        ],
      };
    }

    const sheet: DeviceSheet = {
      ...catalogEntry,
      serialNumber:
        parsed.serialNumber ||
        'SN-' + Math.abs(qrPayload.split('').reduce((a, b) => a + b.charCodeAt(0), 0)),
      mac: parsed.mac,
      ip: parsed.ip,
    };

    // Cache to SQLite if repository available
    if (this.deviceRepo) {
      try {
        await this.deviceRepo.upsert({
          id: `dev_${sheet.serialNumber}`,
          ip: sheet.ip || '0.0.0.0',
          mac: sheet.mac,
          hostname: sheet.model,
          vendor: sheet.vendor,
          model: sheet.model,
          serialNumber: sheet.serialNumber,
          isOnline: true,
          lastSeenAt: Date.now(),
          cachedSheetJson: JSON.stringify(sheet),
        });
      } catch (_) {}
    }

    return sheet;
  }
}
