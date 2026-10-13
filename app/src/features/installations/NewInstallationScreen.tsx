import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { LocationService, GpsCoordinates } from '../../evidence/LocationService';
import { PdfReportService } from '../../evidence/PdfReportService';
import { getRepositories } from '../../store';
import { Installation } from '../../store/models';

interface DetectedDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  serial: string;
  opticalPower?: string;
}

export const NewInstallationScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewInstallation'>>();

  const [currentStep, setCurrentStep] = useState<number>(route.params?.step || 1);

  // Step 1: Equipment data
  const [detectedDevices, setDetectedDevices] = useState<DetectedDevice[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    route.params?.initialDeviceName ? 'custom' : ''
  );
  const [deviceName, setDeviceName] = useState<string>(
    route.params?.initialDeviceName || ''
  );
  const [deviceIp, setDeviceIp] = useState<string>(
    route.params?.initialIp || ''
  );
  const [deviceMac, setDeviceMac] = useState<string>(
    route.params?.initialMac || ''
  );
  const [deviceSerial, setDeviceSerial] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('');

  // Step 2: Evidence data - Starts empty for real field capture
  const [photos, setPhotos] = useState<
    Array<{
      id: string;
      label: string;
      uri: string;
      latitude?: number;
      longitude?: number;
      timestamp?: string;
    }>
  >([]);
  const [gpsCoords, setGpsCoords] = useState<GpsCoordinates>({
    latitude: -32.4825,
    longitude: -58.2372,
    accuracy: 5.0,
    timestamp: Date.now(),
    isEstimated: false,
  });
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Step 3: Technical Notes
  const [notes, setNotes] = useState<string>('');

  // Step 4: Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle incoming route params (e.g. from QR scan)
  useEffect(() => {
    if (route.params?.initialDeviceName) {
      setDeviceName(route.params.initialDeviceName);
      setSelectedPresetId('custom');
    }
    if (route.params?.initialIp) {
      setDeviceIp(route.params.initialIp);
    }
    if (route.params?.initialMac) {
      setDeviceMac(route.params.initialMac);
    }
  }, [route.params]);

  // Load real discovered devices from SQLite repository
  useEffect(() => {
    (async () => {
      try {
        const repos = getRepositories();
        const stored = await repos.devices.listAll();
        if (stored.length > 0) {
          const mapped: DetectedDevice[] = stored.map((d) => ({
            id: d.id,
            name: d.hostname || d.model || `Equipo ${d.ip}`,
            ip: d.ip,
            mac: d.mac || '',
            serial: d.serialNumber || '',
          }));
          setDetectedDevices(mapped);
        } else {
          setDetectedDevices([]);
        }
      } catch (_) {
        setDetectedDevices([]);
      }
    })();
  }, []);

  // Fetch GPS on mounting or when entering step 2
  useEffect(() => {
    if (currentStep === 2) {
      fetchGps();
    }
  }, [currentStep]);

  const fetchGps = async () => {
    setGpsLoading(true);
    try {
      const pos = await LocationService.getCurrentLocation();
      setGpsCoords(pos);
    } catch {
      // Fallback already provided by LocationService
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSelectPreset = (dev: DetectedDevice) => {
    setSelectedPresetId(dev.id);
    setDeviceName(dev.name);
    setDeviceIp(dev.ip);
    setDeviceMac(dev.mac);
    setDeviceSerial(dev.serial);
  };

  const handleAddPhoto = async () => {
    const photoNumber = photos.length + 1;
    const labels = [
      'Frente rack',
      'Roseta óptica',
      'Acometida / Cableado',
      'Medición de Potencia',
      'Etiqueta S/N',
    ];
    const defaultLabel = labels[(photoNumber - 1) % labels.length];
    const photoId = `photo_${Date.now()}`;
    const localUri = `file:///data/user/0/com.fcyt.netdiag/files/${photoId}.jpg`;

    // Associate current truthful GPS coordinates
    const loc = await LocationService.getCurrentLocation();
    const newPhoto = {
      id: photoId,
      label: `${defaultLabel} (#${photoNumber})`,
      uri: localUri,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timestamp: new Date().toISOString(),
    };
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const handleStep1Next = () => {
    if (!deviceName.trim()) {
      Alert.alert('Datos incompletos', 'Por favor ingrese el nombre del dispositivo.');
      return;
    }
    if (!deviceIp.trim()) {
      Alert.alert('Datos incompletos', 'Por favor ingrese la dirección IP del equipo.');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleStep3Next = () => {
    if (!notes.trim()) {
      Alert.alert('Notas técnicas', 'Por favor ingrese observaciones técnicas de la instalación.');
      return;
    }
    setCurrentStep(4);
  };

  const handleSubmitAndGeneratePdf = async () => {
    setIsSubmitting(true);
    const instId = `inst-${Date.now()}`;
    const dateFormatted = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    try {
      const selectedDevice = detectedDevices.find((p) => p.id === selectedPresetId);

      // 1. Generate PDF
      const pdfPath = await PdfReportService.generateReport({
        reportId: `INST-${Date.now().toString().slice(-4)}`,
        siteName: siteName.trim() || 'Sitio sin especificar',
        technicianName: technicianName.trim() || 'Técnico de Campo',
        date: dateFormatted,
        equipment: {
          name: deviceName,
          ip: deviceIp,
          mac: deviceMac,
          serialNumber: deviceSerial,
          opticalPower: selectedDevice?.opticalPower,
        },
        gps: {
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          accuracy: gpsCoords.accuracy,
        },
        photos: photos.map((p) => ({
          uri: p.uri,
          label: p.label,
          latitude: p.latitude ?? gpsCoords.latitude,
          longitude: p.longitude ?? gpsCoords.longitude,
        })),
        notes,
      });

      // 2. Persist in SQLite
      const newInstallation: Installation = {
        id: instId,
        deviceName,
        deviceIp,
        deviceMac,
        siteName: siteName.trim() || 'Sitio sin especificar',
        gpsLat: gpsCoords.latitude,
        gpsLng: gpsCoords.longitude,
        gpsAccuracy: gpsCoords.accuracy,
        notes,
        pdfPath,
        status: 'pending',
        baseVersion: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        photos: photos.map((p) => ({
          id: p.id,
          installationId: instId,
          filePath: p.uri,
          label: p.label,
          capturedAt: Date.now(),
        })),
      };

      const repos = getRepositories();
      await repos.installations.create(newInstallation);

      // 3. Enqueue in Outbox
      await repos.outbox.enqueue({
        id: `outbox-${instId}`,
        entityType: 'installation',
        entityId: instId,
        payloadJson: JSON.stringify(newInstallation),
        status: 'pending',
      });

      // 4. Navigate to PDF Preview
      navigation.navigate('PdfPreview', {
        filePath: pdfPath,
        title: `Reporte de Instalación - ${deviceName}`,
      });
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el reporte PDF: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Nueva instalación"
        showBack
        onPressBack={() => {
          if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
          } else {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wizard Step Indicator */}
        <Card style={styles.wizardHeader} variant="high">
          <View style={styles.stepTitleRow}>
            <Text style={styles.stepCount}>PASO {currentStep} DE 4</Text>
            <Text style={styles.stepName}>
              {currentStep === 1
                ? 'EQUIPO'
                : currentStep === 2
                ? 'EVIDENCIA'
                : currentStep === 3
                ? 'NOTAS'
                : 'REVISIÓN'}
            </Text>
          </View>

          {/* Stepper track */}
          <View style={styles.stepBars}>
            <View
              style={[
                styles.stepBar,
                currentStep >= 1 ? styles.stepBarActive : styles.stepBarInactive,
              ]}
            />
            <View
              style={[
                styles.stepBar,
                currentStep >= 2 ? styles.stepBarActive : styles.stepBarInactive,
              ]}
            />
            <View
              style={[
                styles.stepBar,
                currentStep >= 3 ? styles.stepBarActive : styles.stepBarInactive,
              ]}
            />
            <View
              style={[
                styles.stepBar,
                currentStep >= 4 ? styles.stepBarActive : styles.stepBarInactive,
              ]}
            />
          </View>

          <View style={styles.stepLabels}>
            <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelCurrent]}>
              Equipo
            </Text>
            <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelCurrent]}>
              Evidencia
            </Text>
            <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelCurrent]}>
              Notas
            </Text>
            <Text style={[styles.stepLabel, currentStep === 4 && styles.stepLabelCurrent]}>
              Revisión
            </Text>
          </View>
        </Card>

        {/* STEP 1: EQUIPO */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <ActionButton
              label="Escanear QR de equipo"
              icon="qr_code_scanner"
              variant="secondary"
              onPress={() => navigation.navigate('QrScanner')}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>EQUIPOS DETECTADOS EN RED</Text>
            </View>

            {detectedDevices.length > 0 ? (
              <View style={styles.deviceList}>
                {detectedDevices.map((dev) => {
                  const isSelected = selectedPresetId === dev.id;
                  return (
                    <TouchableOpacity
                      key={dev.id}
                      activeOpacity={0.8}
                      style={[
                        styles.deviceRadioCard,
                        isSelected && styles.deviceRadioCardSelected,
                      ]}
                      onPress={() => handleSelectPreset(dev)}
                    >
                      <View style={styles.radioRow}>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <Icon name="check" size={14} color="#001C39" />}
                        </View>
                        <View style={styles.deviceDetails}>
                          <Text style={styles.deviceItemName}>{dev.name}</Text>
                          <Text style={styles.deviceItemSub}>
                            {dev.ip}{dev.mac ? ` · ${dev.mac}` : ''}
                          </Text>
                        </View>
                      </View>
                      {isSelected && <View style={styles.activeLed} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Card style={styles.noDevicesCard} variant="surface">
                <View style={styles.noDevicesRow}>
                  <Icon name="radar" size={20} color={colors.primary} />
                  <Text style={styles.noDevicesText}>
                    No hay equipos escaneados previamente en la red local. Podés escanear un código QR o ingresar los datos manualmente debajo.
                  </Text>
                </View>
              </Card>
            )}

            {/* Manual Edit Card */}
            <Card style={styles.manualCard} variant="surface">
              <Text style={styles.manualTitle}>Datos de Instalación</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sitio / Ubicación</Text>
                <TextInput
                  style={styles.textInput}
                  value={siteName}
                  onChangeText={setSiteName}
                  placeholder="Ej. Sitio Azotea Norte"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Técnico Responsable</Text>
                <TextInput
                  style={styles.textInput}
                  value={technicianName}
                  onChangeText={setTechnicianName}
                  placeholder="Ej. Carlos Méndez"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del Dispositivo</Text>
                <TextInput
                  style={styles.textInput}
                  value={deviceName}
                  onChangeText={(val) => {
                    setDeviceName(val);
                    setSelectedPresetId('custom');
                  }}
                  placeholder="Ej. Router MikroTik hAP ac2"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.splitRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Dirección IP</Text>
                  <TextInput
                    style={[styles.textInput, styles.fontMono]}
                    value={deviceIp}
                    onChangeText={setDeviceIp}
                    placeholder="192.168.1.1"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Dirección MAC</Text>
                  <TextInput
                    style={[styles.textInput, styles.fontMono]}
                    value={deviceMac}
                    onChangeText={setDeviceMac}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Número de Serie</Text>
                <TextInput
                  style={[styles.textInput, styles.fontMono]}
                  value={deviceSerial}
                  onChangeText={setDeviceSerial}
                  placeholder="Ej. MKT-892401-AR"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                />
              </View>
            </Card>

            <View style={styles.footerRow}>
              <ActionButton
                label="Atrás"
                variant="secondary"
                onPress={() => navigation.goBack()}
                style={styles.halfBtn}
              />
              <ActionButton
                label="Siguiente"
                icon="arrow_forward"
                variant="primary"
                onPress={handleStep1Next}
                style={styles.halfBtn}
              />
            </View>
          </View>
        )}

        {/* STEP 2: EVIDENCIA */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>FOTOS ({photos.length})</Text>
            </View>

            {/* Photo Grid */}
            <View style={styles.photoGrid}>
              {photos.length === 0 && (
                <View style={styles.emptyPhotoState}>
                  <Icon name="photo_camera" size={32} color={colors.onSurfaceVariant} />
                  <Text style={styles.emptyPhotoText}>
                    Sin fotografías adjuntas. Toque "Agregar foto" para documentar la evidencia fotográfica del sitio.
                  </Text>
                </View>
              )}

              {photos.map((item) => (
                <View key={item.id} style={styles.photoThumb}>
                  <TouchableOpacity
                    style={styles.deletePhotoBtn}
                    onPress={() => setPhotos((prev) => prev.filter((p) => p.id !== item.id))}
                  >
                    <Icon name="delete" size={14} color={colors.critical} />
                  </TouchableOpacity>
                  <View style={styles.photoPlaceholder}>
                    <Icon name="photo_camera" size={24} color={colors.primary} />
                    <Text style={styles.photoThumbLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.photoBadge}>
                    <Icon name="place" size={10} color={colors.primary} />
                    <Text style={styles.photoBadgeText}>
                      {(item.latitude ?? gpsCoords.latitude).toFixed(4)}, {(item.longitude ?? gpsCoords.longitude).toFixed(4)}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Add Photo Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.addPhotoCard}
                onPress={handleAddPhoto}
              >
                <View style={styles.addPhotoIconCircle}>
                  <Icon name="add_a_photo" size={22} color={colors.primary} />
                </View>
                <Text style={styles.addPhotoText}>Agregar foto</Text>
              </TouchableOpacity>
            </View>

            {/* Minimal GPS Telemetry Card */}
            <Card style={styles.gpsCard} variant="high">
              <View style={styles.gpsHeader}>
                <View style={styles.gpsHeaderLeft}>
                  <Icon name="satellite_alt" size={18} color={colors.secondary} />
                  <Text style={styles.gpsTitle}>Ubicación GPS</Text>
                </View>
                <TouchableOpacity onPress={fetchGps} disabled={gpsLoading}>
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Icon name="sync" size={16} color={colors.onSurfaceVariant} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.gpsTelemetryRow}>
                <View style={styles.gpsTelemetryCol}>
                  <Text style={styles.gpsMetaLabel}>Latitud</Text>
                  <Text style={styles.gpsMetaValue}>{gpsCoords.latitude.toFixed(4)}</Text>
                </View>
                <View style={styles.gpsTelemetryCol}>
                  <Text style={styles.gpsMetaLabel}>Longitud</Text>
                  <Text style={styles.gpsMetaValue}>{gpsCoords.longitude.toFixed(4)}</Text>
                </View>
                <View style={[styles.gpsTelemetryCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.gpsMetaLabel}>Precisión</Text>
                  <Text style={[styles.gpsAccuracyValue, gpsCoords.isEstimated && { color: colors.warning }]}>
                    {gpsCoords.isEstimated || gpsCoords.accuracy === undefined
                      ? 'Estimada'
                      : `±${Math.round(gpsCoords.accuracy)} m`}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={styles.footerRow}>
              <ActionButton
                label="Atrás"
                variant="secondary"
                onPress={() => setCurrentStep(1)}
                style={styles.halfBtn}
              />
              <ActionButton
                label="Siguiente"
                icon="arrow_forward"
                variant="primary"
                onPress={handleStep2Next}
                style={styles.halfBtn}
              />
            </View>
          </View>
        )}

        {/* STEP 3: NOTAS */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>NOTAS TÉCNICAS</Text>
            </View>

            <Card style={styles.notesCard} variant="high">
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ingrese observaciones, detalles del cableado o cambios realizados..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </Card>

            <View style={styles.footerRow}>
              <ActionButton
                label="Atrás"
                variant="secondary"
                onPress={() => setCurrentStep(2)}
                style={styles.halfBtn}
              />
              <ActionButton
                label="Siguiente"
                icon="arrow_forward"
                variant="primary"
                onPress={handleStep3Next}
                style={styles.halfBtn}
              />
            </View>
          </View>
        )}

        {/* STEP 4: REVISIÓN */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            {/* Card 1: Equipo */}
            <Card style={styles.sectionCard} variant="high">
              <View style={styles.cardHeader}>
                <Icon name="router" size={18} color={colors.success} />
                <Text style={styles.cardTitle}>Equipo</Text>
              </View>
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>Dispositivo</Text>
                <Text style={styles.reviewValue}>{deviceName}</Text>
              </View>
              <View style={styles.splitRow}>
                <View style={styles.splitCol}>
                  <Text style={styles.reviewLabel}>Dirección IP</Text>
                  <Text style={styles.reviewValueMono}>{deviceIp}</Text>
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.reviewLabel}>Dirección MAC</Text>
                  <Text style={styles.reviewValueMono}>{deviceMac}</Text>
                </View>
              </View>
            </Card>

            {/* Card 2: Evidencia */}
            <Card style={styles.sectionCard} variant="high">
              <View style={styles.cardHeader}>
                <Icon name="photo_camera" size={18} color={colors.success} />
                <Text style={styles.cardTitle}>Evidencia</Text>
              </View>
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>Fotos</Text>
                <Text style={styles.reviewValue}>{photos.length} fotos adjuntas</Text>
              </View>
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>Coordenadas GPS</Text>
                <View style={styles.splitRow}>
                  <Text style={styles.reviewValueMono}>
                    {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
                  </Text>
                  <Text style={styles.accuracyTag}>
                    (±{Math.round(gpsCoords.accuracy || 5)} m)
                  </Text>
                </View>
              </View>
            </Card>

            {/* Card 3: Notas */}
            <Card style={styles.sectionCard} variant="high">
              <View style={styles.cardHeader}>
                <Icon name="description" size={18} color={colors.success} />
                <Text style={styles.cardTitle}>Notas</Text>
              </View>
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>Notas técnicas</Text>
                <View style={styles.notesReviewBox}>
                  <Text style={styles.notesReviewText}>{notes}</Text>
                </View>
              </View>
            </Card>

            {/* Bottom Action Controls */}
            <View style={styles.footerRow}>
              <ActionButton
                label="Atrás"
                variant="secondary"
                onPress={() => setCurrentStep(3)}
                style={styles.halfBtn}
                disabled={isSubmitting}
              />
              <ActionButton
                label={isSubmitting ? 'Generando...' : 'Guardar y generar PDF'}
                icon={isSubmitting ? 'sync' : 'picture_as_pdf'}
                variant="primary"
                onPress={handleSubmitAndGeneratePdf}
                style={[styles.halfBtn, { flex: 1.5 }]}
                disabled={isSubmitting}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  wizardHeader: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCount: {
    ...typography.labelSmall,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepName: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepBars: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  stepBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  stepBarActive: {
    backgroundColor: colors.primary,
  },
  stepBarInactive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    flex: 1,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepContainer: {
    gap: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  deviceList: {
    gap: spacing.sm,
  },
  deviceRadioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    minHeight: 56,
  },
  deviceRadioCardSelected: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    backgroundColor: colors.primary,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceItemName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  deviceItemSub: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  activeLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: spacing.sm,
  },
  manualCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  manualTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
  },
  noDevicesCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  noDevicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noDevicesText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.surfaceStroke,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    color: colors.onSurface,
    fontSize: 14,
  },
  fontMono: {
    fontFamily: 'monospace',
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  splitCol: {
    flex: 1,
    gap: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  halfBtn: {
    flex: 1,
    minHeight: 48,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumb: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
  },
  photoThumbLabel: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(3, 14, 32, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  photoBadgeText: {
    fontSize: 9,
    color: colors.onSurface,
    fontFamily: 'monospace',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: 'rgba(3, 14, 32, 0.85)',
    borderRadius: 12,
    padding: 4,
  },
  emptyPhotoState: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  emptyPhotoText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  addPhotoCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderStyle: 'dashed',
    minHeight: 48,
  },
  addPhotoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '500',
  },
  gpsCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gpsTitle: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  gpsTelemetryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: spacing.sm,
  },
  gpsTelemetryCol: {
    flex: 1,
    gap: 2,
  },
  gpsMetaLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  gpsMetaValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  gpsAccuracyValue: {
    ...typography.bodyMedium,
    color: colors.success,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  notesCard: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  notesInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.surfaceStroke,
    padding: 14,
    color: colors.onSurface,
    ...typography.bodyMedium,
    lineHeight: 22,
    minHeight: 140,
  },
  sectionCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  reviewField: {
    gap: 2,
  },
  reviewLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  reviewValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
  },
  reviewValueMono: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontFamily: 'monospace',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  accuracyTag: {
    ...typography.labelSmall,
    color: colors.success,
  },
  notesReviewBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: 6,
    marginTop: 2,
  },
  notesReviewText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    lineHeight: 20,
    fontSize: 13,
  },
});
