import { LocationService } from '../src/evidence/LocationService';
import { DeviceSheetCache, DEVICE_CATALOG } from '../src/evidence/DeviceSheetCache';
import { PdfReportService } from '../src/evidence/PdfReportService';
import { MockDatabaseAdapter } from '../src/store/db/MockDatabaseAdapter';
import { initializeSchema } from '../src/store/schema';
import { DeviceRepository } from '../src/store/repositories/DeviceRepository';

describe('Evidence, GPS & Device Sheet Cache', () => {
  describe('LocationService', () => {
    it('should retrieve current GPS location', async () => {
      const loc = await LocationService.getCurrentLocation();
      expect(loc.latitude).toBeCloseTo(-32.48, 1);
      expect(loc.longitude).toBeCloseTo(-58.23, 1);
      expect(loc.accuracy).toBeDefined();
    });
  });

  describe('DeviceSheetCache & QR parsing', () => {
    it('should parse JSON QR code payloads', () => {
      const payload = JSON.stringify({
        sn: 'HWTC-998877',
        model: 'HG8245W5',
        mac: 'F4:C3:61:9A:82:10',
      });
      const parsed = DeviceSheetCache.parseQrCode(payload);
      expect(parsed.serialNumber).toBe('HWTC-998877');
      expect(parsed.model).toBe('HG8245W5');
      expect(parsed.mac).toBe('F4:C3:61:9A:82:10');
    });

    it('should parse URL-based QR code payloads', () => {
      const url = 'https://netdiag.app/dev?sn=MTK-4011&model=hAP_ac2&mac=00:11:22:33:44:55';
      const parsed = DeviceSheetCache.parseQrCode(url);
      expect(parsed.serialNumber).toBe('MTK-4011');
      expect(parsed.model).toBe('hAP_ac2');
      expect(parsed.mac).toBe('00:11:22:33:44:55');
    });

    it('should parse plain MAC address payload', () => {
      const mac = '48:8F:5A:21:44:B0';
      const parsed = DeviceSheetCache.parseQrCode(mac);
      expect(parsed.mac).toBe(mac);
    });

    it('should resolve device technical sheet and cache to SQLite', async () => {
      const mockDb = new MockDatabaseAdapter();
      await initializeSchema(mockDb);
      const devRepo = new DeviceRepository(mockDb);
      const cache = new DeviceSheetCache(devRepo);

      const sheet = await cache.resolveDeviceSheet('MikroTik hAP ac2 SN12345');
      expect(sheet.vendor).toBe('MikroTik');
      expect(sheet.hardwareSpecs.firmwareDefault).toBe('RouterOS v7.14.3');
      expect(sheet.installationChecklist.length).toBeGreaterThan(0);

      // Verify cached in SQLite
      const devices = await devRepo.listAll();
      expect(devices.length).toBe(1);
      expect(devices[0].vendor).toBe('MikroTik');
      expect(devices[0].cachedSheetJson).toBeDefined();
    });
  });

  describe('PdfReportService HTML Sanitization & Generation', () => {
    it('should sanitize HTML injection in notes, technician, and equipment names', () => {
      const html = PdfReportService.generateHtml({
        reportId: 'REP-001',
        siteName: 'Nodo <Norte> & "Principal"',
        technicianName: 'Juan <script>alert(1)</script>',
        date: '2026-10-04',
        equipment: {
          name: 'Switch <b>Pro</b>',
          ip: '192.168.1.1',
          mac: '00:11:22:33:44:55',
        },
        gps: {
          latitude: -32.48,
          longitude: -58.23,
        },
        photos: [],
        notes: '<img src=x onerror=alert(1)> Notas de prueba',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('Nodo &lt;Norte&gt; &amp; &quot;Principal&quot;');
    });

    it('should generate PDF report through converter', async () => {
      const filePath = await PdfReportService.generateReport({
        reportId: 'REP-002',
        siteName: 'Nodo Sur',
        technicianName: 'Carlos Gómez',
        date: '2026-10-04',
        equipment: {
          name: 'MikroTik Router',
          ip: '192.168.1.254',
          mac: 'AA:BB:CC:DD:EE:FF',
        },
        gps: {
          latitude: -32.48,
          longitude: -58.23,
          accuracy: 5,
        },
        photos: [],
        notes: 'Todo verificado.',
      });

      expect(filePath).toContain('reporte_rep-002.pdf');
    });
  });
});
