import * as RNHTMLtoPDF from 'react-native-html-to-pdf';

export interface ReportPhoto {
  uri: string;
  label: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

export interface InstallationReportData {
  reportId: string;
  siteName: string;
  technicianName: string;
  date: string;
  equipment: {
    name: string;
    ip: string;
    mac: string;
    serialNumber?: string;
    opticalPower?: string;
    status?: string;
  };
  gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  photos: ReportPhoto[];
  notes: string;
}

export function escapeHtml(str: string = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class PdfReportService {
  /**
   * Generates the complete, self-contained HTML template for the installation report.
   * Matches the official white-sheet layout from the field diagnostics design specification.
   */
  public static generateHtml(data: InstallationReportData): string {
    const accuracyBadge = data.gps.accuracy ? ` (±${Math.round(data.gps.accuracy)} m)` : ' (Estimada de referencia)';
    const coordsStr = `${data.gps.latitude.toFixed(4)}, ${data.gps.longitude.toFixed(4)}`;

    const safeReportId = escapeHtml(data.reportId);
    const safeSiteName = escapeHtml(data.siteName);
    const safeTechnician = escapeHtml(data.technicianName);
    const safeDate = escapeHtml(data.date);
    const safeEquipName = escapeHtml(data.equipment.name);
    const safeEquipIp = escapeHtml(data.equipment.ip);
    const safeEquipMac = escapeHtml(data.equipment.mac);
    const safeNotes = escapeHtml(data.notes || 'Instalación completada y verificada de conformidad técnica.');

    const photosHtml = data.photos && data.photos.length > 0
      ? data.photos
          .map(
            (p) => {
              const photoCoords = (p.latitude !== undefined && p.longitude !== undefined)
                ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                : coordsStr;
              const safeLabel = escapeHtml(p.label);
              return `
          <div style="flex: 1; min-width: 140px; margin: 4px; background: #E2E8F0; border-radius: 8px; overflow: hidden; position: relative;">
            <img src="${p.uri}" alt="${safeLabel}" style="width: 100%; height: 110px; object-fit: cover; display: block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="display: none; height: 110px; background: #16263D; color: #A4C9FF; align-items: center; justify-content: center; font-size: 11px; font-family: monospace;">[${safeLabel}]</div>
            <div style="position: absolute; bottom: 4px; left: 4px; right: 4px; background: rgba(15, 23, 42, 0.85); color: #FFFFFF; font-size: 9px; font-family: monospace; text-align: center; border-radius: 4px; padding: 2px;">
              ${safeLabel} · ${photoCoords}
            </div>
          </div>
        `;
            }
          )
          .join('')
      : '<p style="font-size: 12px; color: #64748B; font-style: italic;">Sin fotografías adjuntas</p>';

    const serialRow = data.equipment.serialNumber
      ? `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E2E8F0;">
        <span style="color: #64748B;">Número de serie:</span>
        <span style="font-family: monospace; font-weight: 600; color: #0F172A;">${escapeHtml(data.equipment.serialNumber)}</span>
      </div>`
      : '';

    const opticalRow = data.equipment.opticalPower
      ? `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E2E8F0;">
        <span style="color: #64748B;">Potencia óptica (Rx):</span>
        <span style="font-family: monospace; font-weight: 600; color: #00A56C;">${escapeHtml(data.equipment.opticalPower)}</span>
      </div>`
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reporte de Instalación - ${safeReportId}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0F172A;
      background-color: #FFFFFF;
      -webkit-print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .title-group h1 {
      margin: 0;
      font-size: 20px;
      color: #0F172A;
      font-weight: 700;
    }
    .title-group p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: #4A90E2;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .report-id {
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      background: #F1F5F9;
      padding: 4px 8px;
      border-radius: 4px;
      color: #334155;
    }
    .grid-meta {
      display: flex;
      background: #F8FAFC;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 16px;
      border: 1px solid #E2E8F0;
    }
    .meta-col {
      flex: 1;
    }
    .meta-label {
      font-size: 9px;
      font-weight: bold;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 12px;
      font-weight: 600;
      color: #0F172A;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 14px 0 6px 0;
    }
    .card-block {
      background: #F8FAFC;
      border-radius: 8px;
      padding: 10px;
      border: 1px solid #E2E8F0;
      font-size: 12px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #E2E8F0;
    }
    .kv-row:last-child {
      border-bottom: none;
    }
    .photo-container {
      display: flex;
      flex-wrap: wrap;
      margin: -4px;
    }
    .notes-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px;
      font-size: 12px;
      line-height: 1.5;
      color: #1E293B;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <p>NETWORK DIAGNOSTICS SUITE • TELECOM EVIDENCE</p>
      <h1>Reporte de Instalación</h1>
    </div>
    <div class="report-id">${safeReportId}</div>
  </div>

  <div class="grid-meta">
    <div class="meta-col">
      <div class="meta-label">Sitio</div>
      <div class="meta-value">${safeSiteName}</div>
    </div>
    <div class="meta-col">
      <div class="meta-label">Fecha</div>
      <div class="meta-value">${safeDate}</div>
    </div>
    <div class="meta-col">
      <div class="meta-label">Técnico</div>
      <div class="meta-value">${safeTechnician}</div>
    </div>
  </div>

  <div class="section-title">Datos del Equipo</div>
  <div class="card-block">
    <div class="kv-row">
      <span style="color: #64748B;">Nombre:</span>
      <span style="font-weight: 600; color: #0F172A;">${safeEquipName}</span>
    </div>
    <div class="kv-row">
      <span style="color: #64748B;">Dirección IP:</span>
      <span style="font-family: monospace; font-weight: 600; color: #0F172A;">${safeEquipIp}</span>
    </div>
    <div class="kv-row">
      <span style="color: #64748B;">Dirección MAC:</span>
      <span style="font-family: monospace; font-weight: 600; color: #0F172A;">${safeEquipMac}</span>
    </div>
    ${serialRow}
    ${opticalRow}
  </div>

  <div style="display: flex; justify-content: space-between; align-items: baseline;">
    <div class="section-title">Evidencia Fotográfica (${data.photos.length} Fotos)</div>
    <div style="font-size: 11px; font-family: monospace; color: #475569; background: #EEF2F6; padding: 2px 6px; border-radius: 4px;">
      📍 ${coordsStr}${accuracyBadge}
    </div>
  </div>
  <div class="photo-container">
    ${photosHtml}
  </div>

  <div class="section-title">Notas Técnicas</div>
  <div class="notes-box">
    ${safeNotes}
  </div>

  <div class="footer">
    <span>Generado automáticamente por com.fcyt.netdiag</span>
    <span>Firma Técnica: VALIDADA</span>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Converts the HTML template into a PDF file using react-native-html-to-pdf.
   * Returns the absolute path of the generated PDF.
   */
  public static async generateReport(data: InstallationReportData): Promise<string> {
    const html = this.generateHtml(data);
    const fileName = `reporte_${data.reportId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;

    try {
      const options = {
        html,
        fileName,
        directory: 'Documents',
      };

      const pdfModule = RNHTMLtoPDF as any;
      let result: any;
      if (typeof pdfModule.generatePDF === 'function') {
        result = await pdfModule.generatePDF(options);
      } else if (typeof pdfModule.convert === 'function') {
        result = await pdfModule.convert(options);
      } else if (typeof pdfModule.default?.convert === 'function') {
        result = await pdfModule.default.convert(options);
      } else {
        throw new Error('Módulo react-native-html-to-pdf no disponible');
      }

      if (!result?.filePath) {
        throw new Error('La conversión a PDF no produjo una ruta de archivo válida');
      }

      return result.filePath;
    } catch (error: any) {
      console.error('[PdfReportService] Error generating PDF:', error);
      throw new Error(`Fallo en generación de reporte PDF: ${error?.message || error}`);
    }
  }
}
