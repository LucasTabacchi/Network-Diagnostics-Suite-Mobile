import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Pdf from 'react-native-pdf';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { StatusHeader, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

function localPath(path: string): string {
  return path.replace(/^file:\/\//, '');
}

export const PdfPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PdfPreview'>>();
  const filePath = route.params?.filePath;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    setError(null);
    if (!filePath) {
      setError('Este reporte no tiene un archivo PDF generado.');
      return;
    }
    ReactNativeBlobUtil.fs.exists(localPath(filePath))
      .then(exists => {
        if (mounted) {
          if (exists) {
            setReady(true);
          } else {
            setError('El archivo PDF ya no está disponible en este dispositivo.');
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setError('No se pudo comprobar el archivo PDF.');
        }
      });
    return () => { mounted = false; };
  }, [filePath]);

  const handleOpen = async () => {
    if (!ready || !filePath || busy) { return; }
    try {
      setBusy(true);
      await ReactNativeBlobUtil.android.actionViewIntent(localPath(filePath), 'application/pdf');
    } catch {
      Alert.alert('No se pudo abrir el PDF', 'No hay una aplicación disponible para abrir este documento.');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (!ready || !filePath || busy) { return; }
    try {
      setBusy(true);
      const source = localPath(filePath);
      if (!(await ReactNativeBlobUtil.fs.exists(source))) {
        setError('El archivo PDF ya no está disponible en este dispositivo.');
        setReady(false);
        return;
      }

      if (Platform.OS !== 'android') {
        throw new Error('La exportación a Descargas solo está disponible en Android.');
      }

      const fileName = source.split(/[\\/]/).pop() || 'reporte.pdf';
      const destination = await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
        { name: fileName, parentFolder: '', mimeType: 'application/pdf' },
        'Download',
        source,
      );
      if (!destination) {
        throw new Error('No se obtuvo una ubicación para el archivo exportado.');
      }
      Alert.alert('PDF guardado', 'El reporte se guardó en Descargas.');
    } catch (exportError) {
      const detail = exportError instanceof Error ? exportError.message : String(exportError);
      Alert.alert('No se pudo guardar el PDF', detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Reporte de instalación"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />
      <View style={styles.content}>
        {error ? (
          <Text style={styles.message}>{error}</Text>
        ) : ready && filePath ? (
          <Pdf
            source={{ uri: filePath.startsWith('file://') ? filePath : `file://${filePath}` }}
            style={styles.pdf}
            onError={() => setError('No se pudo mostrar el archivo PDF generado.')}
          />
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
      <View style={styles.actions}>
        <ActionButton
          label="Abrir PDF"
          icon="description"
          variant="secondary"
          onPress={handleOpen}
          style={styles.button}
          disabled={!ready || busy}
        />
        <ActionButton
          label="Guardar en Descargas"
          icon="cloud_sync"
          variant="primary"
          onPress={handleExport}
          style={styles.button}
          disabled={!ready || busy}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, margin: spacing.md, justifyContent: 'center' },
  pdf: { flex: 1, backgroundColor: '#FFFFFF' },
  message: { color: colors.onSurface, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  button: { flex: 1, minHeight: 48 },
});
