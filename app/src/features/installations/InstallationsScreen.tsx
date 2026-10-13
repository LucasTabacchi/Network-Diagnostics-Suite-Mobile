import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { getRepositories } from '../../store';
import { Installation } from '../../store/models';



export const InstallationsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const repos = getRepositories();
      const list = await repos.installations.listAll();
      setInstallations(list);
    } catch {
      // In initial mock or uninitialized state, fall back to empty list
      setInstallations([]);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Instalaciones"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Primary Action Button */}
        <ActionButton
          label="Nueva instalación"
          icon="add"
          variant="primary"
          onPress={() => navigation.navigate('NewInstallation', { step: 1 })}
        />

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>REGISTROS DE INSTALACIÓN</Text>

          {/* Database Items */}
          {installations.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('PdfPreview', {
                  filePath: item.pdfPath || `reporte_${item.id}.pdf`,
                  title: `Reporte de Instalación - ${item.deviceName}`,
                })
              }
            >
              <Card style={styles.itemCard} variant="surface">
                <View style={styles.itemTop}>
                  <View style={styles.deviceRow}>
                    <View style={styles.iconBox}>
                      <Icon name="router" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{item.deviceName}</Text>
                      <Text style={styles.siteInfo}>
                        {item.siteName} • {item.deviceIp}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge
                    label={item.status === 'synced' ? 'Sincronizado' : 'Pendiente'}
                    variant={item.status === 'synced' ? 'success' : 'warning'}
                    dot
                  />
                </View>

                <View style={styles.evidenceRow}>
                  <View style={styles.evidenceItem}>
                    <Icon name="place" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.evidenceText}>
                      {item.gpsLat && item.gpsLng
                        ? `${item.gpsLat.toFixed(4)}, ${item.gpsLng.toFixed(4)}`
                        : '-32.4825, -58.2372'}
                    </Text>
                  </View>
                  <View style={styles.evidenceItem}>
                    <Icon name="photo_camera" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.evidenceText}>
                      {item.photos?.length || 3} fotos
                    </Text>
                  </View>
                  <View style={styles.evidenceItem}>
                    <Icon name="picture_as_pdf" size={14} color={colors.primary} />
                    <Text style={[styles.evidenceText, { color: colors.primary }]}>
                      Ver PDF
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          {/* Empty State when no installations exist */}
          {installations.length === 0 && (
            <Card style={styles.emptyCard} variant="surface">
              <Icon name="install" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>Sin instalaciones registradas</Text>
              <Text style={styles.emptySub}>
                Tocá en "Nueva instalación" para dar de alta un equipo con fotografías y GPS.
              </Text>
            </Card>
          )}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  listSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  siteInfo: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontFamily: 'monospace',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    borderRadius: 12,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
