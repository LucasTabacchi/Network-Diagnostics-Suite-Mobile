import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { colors } from '../../core/theme/colors';

interface PhotoCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({ visible, onClose, onCaptured }) => {
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission();
    }
    if (!visible) setReady(false);
  }, [visible, hasPermission, requestPermission]);

  const capture = async () => {
    if (!ready || capturing) return;
    setCapturing(true);
    try {
      const photo = await photoOutput.capturePhotoToFile({}, {});
      const source = photo.filePath.replace(/^file:\/\//, '');
      const directory = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/installation-photos`;
      if (!(await ReactNativeBlobUtil.fs.exists(directory))) {
        await ReactNativeBlobUtil.fs.mkdir(directory);
      }
      const target = `${directory}/photo-${Date.now()}.jpg`;
      await ReactNativeBlobUtil.fs.cp(source, target);
      if (!(await ReactNativeBlobUtil.fs.exists(target))) {
        throw new Error('La foto no se guardó en el dispositivo.');
      }
      onCaptured(`file://${target}`);
      onClose();
    } catch (error) {
      Alert.alert('Error de cámara', (error as Error).message);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {hasPermission && device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            outputs={[photoOutput]}
            isActive={visible}
            onStarted={() => setReady(true)}
            onStopped={() => setReady(false)}
          />
        ) : (
          <View style={styles.message}>
            <Text style={styles.text}>
              {hasPermission ? 'No hay una cámara disponible.' : 'Se necesita permiso de cámara para capturar evidencia.'}
            </Text>
            {!hasPermission && (
              <TouchableOpacity onPress={requestPermission} style={styles.button}>
                <Text style={styles.text}>Permitir cámara</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.controls}>
          <TouchableOpacity onPress={onClose} style={styles.button} disabled={capturing}>
            <Text style={styles.text}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={capture}
            style={[styles.button, styles.captureButton]}
            disabled={!hasPermission || !device || !ready || capturing}
          >
            {capturing ? <ActivityIndicator color={colors.onSurface} /> : <Text style={styles.text}>Capturar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  controls: { position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  button: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 16 },
  captureButton: { backgroundColor: colors.primary },
  text: { color: colors.onSurface, fontWeight: '600' },
});
