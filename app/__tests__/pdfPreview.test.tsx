import React from 'react';
import { Alert, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { PdfPreviewScreen } from '../src/features/reporting/PdfPreviewScreen';
import { ActionButton } from '../src/core/ui';

let mockRouteParams = {
  filePath: '/data/user/0/com.fcyt.netdiag/files/reporte_real.pdf',
  title: 'Reporte real',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

describe('PDF preview', () => {
  let tree: ReactTestRenderer;
  const fsExists = ReactNativeBlobUtil.fs.exists as jest.Mock;
  const exportToDownloads = ReactNativeBlobUtil.MediaCollection.copyToMediaStore as jest.Mock;
  const openPdf = ReactNativeBlobUtil.android.actionViewIntent as jest.Mock;
  let alert: jest.SpyInstance;

  beforeEach(() => {
    Platform.OS = 'android';
    mockRouteParams = {
      filePath: '/data/user/0/com.fcyt.netdiag/files/reporte_real.pdf',
      title: 'Reporte real',
    };
    fsExists.mockResolvedValue(true);
    exportToDownloads.mockResolvedValue('content://downloads/report.pdf');
    openPdf.mockResolvedValue(true);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => { tree?.unmount(); });
    alert.mockRestore();
    jest.clearAllMocks();
  });

  async function renderScreen() {
    await act(async () => {
      tree = create(<PdfPreviewScreen />);
    });
  }

  it('renders the generated PDF file, not a hardcoded mock sheet', async () => {
    await renderScreen();
    const pdf = tree!.root.findByProps({ testID: 'mock-pdf-view' });
    expect(pdf.props.source.uri).toBe('file:///data/user/0/com.fcyt.netdiag/files/reporte_real.pdf');
  });

  it('exports the real file to Android Downloads before confirming', async () => {
    await renderScreen();
    const button = tree!.root.findAllByType(ActionButton).find(item => item.props.label === 'Guardar en Descargas');
    await act(async () => { await button!.props.onPress(); });
    expect(exportToDownloads).toHaveBeenCalledWith(
      { name: 'reporte_real.pdf', parentFolder: '', mimeType: 'application/pdf' },
      'Download',
      '/data/user/0/com.fcyt.netdiag/files/reporte_real.pdf',
    );
    expect(alert).toHaveBeenCalledWith('PDF guardado', 'El reporte se guardó en Descargas.');
  });

  it('never claims an export succeeded when native storage fails', async () => {
    exportToDownloads.mockRejectedValue(new Error('Sin espacio disponible'));
    await renderScreen();
    const button = tree!.root.findAllByType(ActionButton).find(item => item.props.label === 'Guardar en Descargas');
    await act(async () => { await button!.props.onPress(); });
    expect(alert).toHaveBeenCalledWith('No se pudo guardar el PDF', 'Sin espacio disponible');
    expect(alert).not.toHaveBeenCalledWith('PDF guardado', expect.anything());
  });

  it('opens the actual PDF rather than sending its path as text', async () => {
    await renderScreen();
    const button = tree!.root.findAllByType(ActionButton).find(item => item.props.label === 'Abrir PDF');
    await act(async () => { await button!.props.onPress(); });
    expect(openPdf).toHaveBeenCalledWith(
      '/data/user/0/com.fcyt.netdiag/files/reporte_real.pdf',
      'application/pdf',
    );
  });
});
