import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const PdfPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PdfPreview'>>();
  const { filePath = 'reporte_instalacion.pdf', title = 'Reporte de Instalación #1042' } =
    route.params || {};

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await Share.share({
        title: title,
        message: `Reporte de Instalación de Telecomunicaciones generado con Network Diagnostics Suite.\nArchivo: ${filePath}`,
        url: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
      });
    } catch (error) {
      console.warn('Error sharing PDF:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = () => {
    Alert.alert(
      'Descarga completada',
      `El reporte ha sido exportado exitosamente a la carpeta Documentos:\n${filePath}`,
      [{ text: 'Aceptar' }]
    );
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Reporte de instalación"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Sheet Frame (Professional Paper View) */}
        <View style={styles.sheetContainer}>
          <View style={styles.sheetPaper}>
            {/* Top Header */}
            <View style={styles.paperHeader}>
              <View>
                <Text style={styles.paperSupTitle}>NETWORK DIAGNOSTICS SUITE</Text>
                <Text style={styles.paperTitle}>Reporte de instalación</Text>
              </View>
              <View style={styles.paperBrandBox}>
                <Icon name="radar" size={24} color="#0063AA" />
              </View>
            </View>

            {/* Metadata Grid */}
            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>SITIO</Text>
                  <Text style={styles.metaVal}>Sitio de Instalación</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>FECHA</Text>
                  <Text style={styles.metaVal}>
                    {new Date().toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
              <View style={[styles.metaRow, styles.metaRowBorder]}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>TÉCNICO</Text>
                  <Text style={styles.metaVal}>Técnico de Campo</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>ESTADO</Text>
                  <Text style={[styles.metaVal, { color: '#00A56C' }]}>Aprobado en campo</Text>
                </View>
              </View>
            </View>

            {/* Datos del equipo */}
            <View style={styles.sectionBlock}>
              <Text style={styles.blockTitle}>DATOS DEL EQUIPO</Text>
              <View style={styles.blockCard}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Nombre:</Text>
                  <Text style={styles.kvValBold}>{title.replace('Reporte de Instalación - ', '')}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>IP:</Text>
                  <Text style={styles.kvValMono}>192.168.1.1</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>MAC:</Text>
                  <Text style={styles.kvValMono}>B8:69:F4:11:C2:AA</Text>
                </View>
                <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.kvKey}>Número de serie:</Text>
                  <Text style={styles.kvValMono}>MKT-892401-AR</Text>
                </View>
              </View>
            </View>

            {/* Fotos & GPS */}
            <View style={styles.sectionBlock}>
              <View style={styles.blockTitleRow}>
                <Text style={styles.blockTitle}>FOTOS</Text>
                <View style={styles.gpsPill}>
                  <Icon name="place" size={12} color="#0F172A" />
                  <Text style={styles.gpsPillText}>-32.4825, -58.2372</Text>
                </View>
              </View>

              <View style={styles.photoRow}>
                <View style={styles.paperPhotoThumb}>
                  <View style={styles.photoPlaceholder}>
                    <Icon name="antenna" size={20} color="#64748B" />
                    <Text style={styles.photoLabelSmall}>Rack</Text>
                  </View>
                  <View style={styles.photoGpsOverlay}>
                    <Text style={styles.photoGpsText}>-32.4825, -58.2372</Text>
                  </View>
                </View>

                <View style={styles.paperPhotoThumb}>
                  <View style={styles.photoPlaceholder}>
                    <Icon name="router" size={20} color="#64748B" />
                    <Text style={styles.photoLabelSmall}>ONT / Equipo</Text>
                  </View>
                  <View style={styles.photoGpsOverlay}>
                    <Text style={styles.photoGpsText}>-32.4825, -58.2372</Text>
                  </View>
                </View>

                <View style={styles.paperPhotoThumb}>
                  <View style={styles.photoPlaceholder}>
                    <Icon name="place" size={20} color="#64748B" />
                    <Text style={styles.photoLabelSmall}>Roseta</Text>
                  </View>
                  <View style={styles.photoGpsOverlay}>
                    <Text style={styles.photoGpsText}>-32.4825, -58.2372</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Notas técnicas */}
            <View style={styles.sectionBlock}>
              <Text style={styles.blockTitle}>NOTAS TÉCNICAS</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>
                  Equipo instalado en rack 2. Enlace de fibra verificado. Se reemplazó el router anterior.
                </Text>
              </View>
            </View>

            {/* Signature row */}
            <View style={styles.paperFooter}>
              <Text style={styles.footerNote}>Generado con Network Diagnostics Suite</Text>
              <Text style={styles.footerNote}>Firma: CONFORME TÉCNICO</Text>
            </View>
          </View>
        </View>

        {/* Status Line on Dark Canvas */}
        <View style={styles.statusPill}>
          <Icon name="pending_actions" size={18} color="#F5A524" />
          <Text style={styles.statusPillText}>En cola para sincronizar</Text>
        </View>

        {/* Primary Bottom Action Triggers */}
        <View style={styles.actionsRow}>
          <ActionButton
            label="Compartir PDF"
            icon="copy"
            variant="secondary"
            onPress={handleShare}
            style={styles.halfBtn}
            disabled={isSharing}
          />
          <ActionButton
            label="Descargar"
            icon="cloud_sync"
            variant="primary"
            onPress={handleDownload}
            style={styles.halfBtn}
          />
        </View>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  sheetContainer: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  sheetPaper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    paddingBottom: spacing.sm,
  },
  paperSupTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  paperTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  paperBrandBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing.xs,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  sectionBlock: {
    gap: 6,
  },
  blockTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gpsPillText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  blockCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  kvKey: {
    fontSize: 12,
    color: '#64748B',
  },
  kvValBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  kvValMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0F172A',
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  paperPhotoThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoLabelSmall: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  photoGpsOverlay: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 3,
    paddingVertical: 1,
    alignItems: 'center',
  },
  photoGpsText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerNote: {
    fontSize: 9,
    color: '#94A3B8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 20,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  statusPillText: {
    ...typography.labelMedium,
    color: colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  halfBtn: {
    flex: 1,
    minHeight: 48,
  },
});
