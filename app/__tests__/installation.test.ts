import { PdfReportService, InstallationReportData } from '../src/evidence/PdfReportService';
import { MockDatabaseAdapter } from '../src/store/db/MockDatabaseAdapter';
import { initializeSchema } from '../src/store/schema';
import { InstallationRepository } from '../src/store/repositories/InstallationRepository';
import { OutboxRepository } from '../src/store/repositories/OutboxRepository';
import { Installation } from '../src/store/models';

describe('T7: Installation Wizard & PDF Report Service', () => {
  let db: MockDatabaseAdapter;
  let installationRepo: InstallationRepository;
  let outboxRepo: OutboxRepository;

  beforeEach(async () => {
    db = new MockDatabaseAdapter();
    await initializeSchema(db);
    installationRepo = new InstallationRepository(db);
    outboxRepo = new OutboxRepository(db);
  });

  describe('PdfReportService HTML Generation', () => {
    const sampleData: InstallationReportData = {
      reportId: 'INST-1042',
      siteName: 'Sitio Azotea Norte',
      technicianName: 'Carlos Méndez',
      date: '03/10/2026',
      equipment: {
        name: 'Router MikroTik hAP ac2',
        ip: '192.168.1.1',
        mac: 'B8:69:F4:11:C2:AA',
        serialNumber: 'MKT-892401-AR',
        opticalPower: '-19.4 dBm',
      },
      gps: {
        latitude: -32.4825,
        longitude: -58.2372,
        accuracy: 4.8,
      },
      photos: [
        {
          uri: 'file:///data/photo1.jpg',
          label: 'Frente rack',
          latitude: -32.4825,
          longitude: -58.2372,
        },
        {
          uri: 'file:///data/photo2.jpg',
          label: 'Roseta óptica',
          latitude: -32.4825,
          longitude: -58.2372,
        },
      ],
      notes: 'Equipo instalado en rack 2. Enlace verificado.',
    };

    it('generates self-contained HTML with technical telemetry', () => {
      const html = PdfReportService.generateHtml(sampleData);

      expect(html).toContain('INST-1042');
      expect(html).toContain('Sitio Azotea Norte');
      expect(html).toContain('Carlos Méndez');
      expect(html).toContain('Router MikroTik hAP ac2');
      expect(html).toContain('192.168.1.1');
      expect(html).toContain('B8:69:F4:11:C2:AA');
      expect(html).toContain('MKT-892401-AR');
      expect(html).toContain('-19.4 dBm');
      expect(html).toContain('-32.4825, -58.2372');
      expect(html).toContain('±5 m');
      expect(html).toContain('Frente rack');
      expect(html).toContain('Roseta óptica');
      expect(html).toContain('Equipo instalado en rack 2');
    });

    it('handles empty photos array gracefully', () => {
      const dataWithoutPhotos: InstallationReportData = {
        ...sampleData,
        photos: [],
      };
      const html = PdfReportService.generateHtml(dataWithoutPhotos);
      expect(html).toContain('Sin fotografías adjuntas');
    });

    it('generates PDF file path via RNHTMLtoPDF convert', async () => {
      const filePath = await PdfReportService.generateReport(sampleData);
      expect(filePath).toBeDefined();
      expect(filePath).toContain('reporte_inst-1042.pdf');
    });
  });

  describe('Installation Store & Outbox Persistence', () => {
    it('saves full installation record with photos and retrieves it', async () => {
      const instId = 'inst-test-001';
      const installation: Installation = {
        id: instId,
        deviceName: 'ONT Huawei HG8245W5',
        deviceIp: '192.168.1.254',
        deviceMac: 'F4:C3:61:9A:82:10',
        siteName: 'Sitio Azotea Norte',
        gpsLat: -32.4825,
        gpsLng: -58.2321,
        gpsAccuracy: 5,
        notes: 'Instalación de fibra óptica finalizada.',
        pdfPath: '/docs/reporte_inst_test.pdf',
        status: 'pending',
        baseVersion: 1,
        createdAt: 1727980000,
        updatedAt: 1727980000,
        photos: [
          {
            id: 'photo-01',
            installationId: instId,
            filePath: '/photos/rack.jpg',
            label: 'Gabinete',
            capturedAt: 1727980000,
          },
          {
            id: 'photo-02',
            installationId: instId,
            filePath: '/photos/fiber.jpg',
            label: 'Fibra',
            capturedAt: 1727980000,
          },
        ],
      };

      await installationRepo.create(installation);

      const retrieved = await installationRepo.findById(instId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.deviceName).toBe('ONT Huawei HG8245W5');
      expect(retrieved?.deviceIp).toBe('192.168.1.254');
      expect(retrieved?.photos?.length).toBe(2);
      expect(retrieved?.photos?.[0].label).toBe('Gabinete');

      const all = await installationRepo.listAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
    });

    it('enqueues installation event into outbox for offline sync', async () => {
      const instId = 'inst-test-002';
      await outboxRepo.enqueue({
        id: `outbox-${instId}`,
        entityType: 'installation',
        entityId: instId,
        payloadJson: JSON.stringify({ id: instId, deviceName: 'Antena Ubiquiti' }),
        status: 'pending',
      });

      const pending = await outboxRepo.peekPending(Date.now(), 10);
      expect(pending.some((p) => p.entityId === instId)).toBe(true);
      const enqueued = pending.find((p) => p.entityId === instId);
      expect(enqueued?.status).toBe('pending');
      expect(enqueued?.entityType).toBe('installation');
    });
  });
});
