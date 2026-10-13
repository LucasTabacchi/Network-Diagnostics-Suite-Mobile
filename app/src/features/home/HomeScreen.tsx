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
import { StatusHeader, Card, Icon, StatusBadge } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { getRepositories } from '../../store';

interface RecentActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timeStr: string;
  desc: string;
  status: 'synced' | 'pending' | 'failed' | 'conflict';
  icon: 'router' | 'terminal' | 'install';
  createdAt: number;
  onPress: () => void;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const formatRelativeTime = (timestamp: number): string => {
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} h`;
    return `${Math.floor(diffHours / 24)} d`;
  };

  const loadData = async () => {
    try {
      const repos = getRepositories();
      const count = await repos.outbox.countPending();
      setPendingSyncCount(count);

      const [diags, insts] = await Promise.all([
        repos.diagnostics.listAll(5),
        repos.installations.listAll(),
      ]);

      const items: RecentActivityItem[] = [
        ...diags.map((d) => ({
          id: `diag-${d.id}`,
          title: d.target,
          subtitle: `IP: ${d.target}`,
          timeStr: formatRelativeTime(d.createdAt),
          desc: d.type === 'snmp' ? 'Diagnóstico SNMP completado' : 'Sesión SSH ejecutada',
          status: d.status,
          icon: (d.type === 'snmp' ? 'router' : 'terminal') as 'router' | 'terminal',
          createdAt: d.createdAt,
          onPress: () =>
            d.type === 'snmp'
              ? navigation.navigate('DeviceDetail', { ip: d.target, diagnosticId: d.id })
              : navigation.navigate('SshConsole', {
                  ip: d.target,
                  alias: d.target,
                  initialOutput: d.rawOutput,
                  diagnosticId: d.id,
                }),
        })),
        ...insts.slice(0, 5).map((inst) => ({
          id: `inst-${inst.id}`,
          title: inst.deviceName,
          subtitle: `IP: ${inst.deviceIp}`,
          timeStr: formatRelativeTime(inst.createdAt),
          desc: 'Reporte de instalación generado',
          status: inst.status,
          icon: 'install' as const,
          createdAt: inst.createdAt,
          onPress: () =>
            navigation.navigate('PdfPreview', {
              filePath: inst.pdfPath || `reporte_${inst.id}.pdf`,
              title: `Reporte de Instalación - ${inst.deviceName}`,
            }),
        })),
      ]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);

      setRecentActivities(items);
    } catch (_) {
      // Keep safe defaults if database uninitialized in test mocks
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
        title="Inicio"
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
        {/* Header de la Suite */}
        <View style={styles.operatorSection}>
          <Text style={styles.greeting}>Suite de Diagnóstico</Text>

          <View style={styles.siteBanner}>
            <Icon name="radar" size={18} color={colors.primary} />
            <Text style={styles.siteText}>Operaciones de Red en Campo</Text>
          </View>
        </View>

        {/* Connectivity & Sync Buffer Card */}
        <Card style={styles.syncCard} variant="high">
          <View style={styles.syncCardHeader}>
            <View style={styles.syncIconContainer}>
              <Icon name="cloud_sync" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.syncTitleCol}>
              <Text style={styles.syncCategory}>ALMACENAMIENTO LOCAL</Text>
              <Text style={styles.syncTitle}>Sincronización de Campo</Text>
            </View>
            <View
              style={[
                styles.syncCountBadge,
                pendingSyncCount === 0 && styles.syncCountBadgeSynced,
              ]}
            >
              <Text style={styles.syncCountText}>{pendingSyncCount}</Text>
            </View>
          </View>

          {/* Buffer breakdown */}
          <View style={styles.bufferBreakdown}>
            <View style={styles.bufferLeft}>
              <Icon
                name={pendingSyncCount > 0 ? 'pending_actions' : 'check_circle'}
                size={18}
                color={pendingSyncCount > 0 ? colors.secondary : colors.success}
              />
              <Text style={styles.bufferText}>
                {pendingSyncCount === 1
                  ? '1 acción pendiente'
                  : pendingSyncCount > 1
                  ? `${pendingSyncCount} acciones pendientes`
                  : 'Todo sincronizado con el servidor'}
              </Text>
            </View>
            {pendingSyncCount > 0 && (
              <Text style={styles.bufferDetails}>En cola local</Text>
            )}
          </View>

          {/* Sync Card Footer */}
          <View style={styles.syncCardFooter}>
            <View style={styles.syncTimestampRow}>
              <Icon name="history" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.syncTimestampText}>
                {pendingSyncCount > 0
                  ? 'Pendiente de sincronizar'
                  : 'Base de datos local al día'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.verColaButton}
              onPress={() => navigation.navigate('SyncQueue')}
              accessibilityLabel="Ver cola de sincronización"
            >
              <Text style={styles.verColaText}>Ver cola</Text>
              <Icon name="chevron_right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Big Action Triggers */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionHeaderLabel}>ACCIONES RÁPIDAS DE DIAGNÓSTICO</Text>

          {/* Action 1: Radar Scan */}
          <TouchableOpacity
            style={styles.actionRadar}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Network' })}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionRadarIconBox}>
                <Icon name="radar" size={26} color={colors.onPrimary} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionRadarTitle}>Escanear red local</Text>
                <Text style={styles.actionRadarSubtitle}>Subred actual: 192.168.1.0/24</Text>
              </View>
            </View>
            <Icon name="arrow_forward" size={20} color={colors.onPrimary} />
          </TouchableOpacity>

          {/* Action 2: QR Scanner */}
          <TouchableOpacity
            style={styles.actionStandard}
            onPress={() => navigation.navigate('QrScanner')}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionIconBox}>
                <Icon name="qr_code_scanner" size={22} color={colors.primary} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionStandardTitle}>Escanear código QR</Text>
                <Text style={styles.actionStandardSubtitle}>Identificar ONT/Router al instante</Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Action 3: New Field Installation */}
          <TouchableOpacity
            style={styles.actionStandard}
            onPress={() => navigation.navigate('NewInstallation', { step: 1 })}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionIconBox}>
                <Icon name="add_task" size={22} color={colors.success} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionStandardTitle}>Nueva instalación</Text>
                <Text style={styles.actionStandardSubtitle}>Asistente en 4 pasos con fotos y GPS</Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.recentHeaderTitleRow}>
              <Icon name="terminal" size={18} color={colors.primary} />
              <Text style={styles.recentHeaderTitle}>Actividad reciente</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('MainTabs', { screen: 'History' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.verTodoText}>Ver todo</Text>
            </TouchableOpacity>
          </View>

          {recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <TouchableOpacity
                key={act.id}
                style={styles.activityCard}
                onPress={act.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.activityTop}>
                  <View style={styles.activityDeviceCol}>
                    <View style={styles.activityIconBox}>
                      <Icon name={act.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.activityTextCol}>
                      <Text style={styles.activityDeviceName}>{act.title}</Text>
                      <Text style={styles.activityIp}>{act.subtitle}</Text>
                    </View>
                  </View>
                  <Text style={styles.activityTime}>{act.timeStr}</Text>
                </View>

                <View style={styles.activityBottom}>
                  <View style={styles.activityStatusRow}>
                    <Icon
                      name={act.status === 'synced' ? 'check_circle' : 'pending_actions'}
                      size={15}
                      color={act.status === 'synced' ? colors.success : colors.warning}
                    />
                    <Text style={styles.activityStatusDesc}>{act.desc}</Text>
                  </View>
                  <StatusBadge
                    label={act.status === 'synced' ? 'Sincronizado' : 'Pendiente'}
                    variant={act.status === 'synced' ? 'success' : 'warning'}
                    dot
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Card style={styles.emptyRecentCard} variant="surface">
              <Icon name="history" size={28} color={colors.muted} />
              <Text style={styles.emptyRecentTitle}>Sin actividad registrada</Text>
              <Text style={styles.emptyRecentSub}>
                Los diagnósticos SNMP, sesiones SSH e instalaciones realizadas aparecerán aquí.
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
    gap: spacing.lg,
  },
  operatorSection: {
    gap: spacing.sm,
  },
  greeting: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  siteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.sm,
  },
  siteText: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  syncCard: {
    gap: spacing.md,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncIconContainer: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  syncTitleCol: {
    flex: 1,
  },
  syncCategory: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  syncTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  syncCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCountText: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bufferBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bufferLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bufferText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  bufferDetails: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  syncCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  syncTimestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTimestampText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  verColaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: spacing.touchTargetMin,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  verColaText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  actionsSection: {
    gap: spacing.sm + 2,
  },
  sectionHeaderLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  actionRadar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryContainer,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    minHeight: 64,
  },
  actionRadarIconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionRadarTitle: {
    ...typography.headlineSm,
    color: colors.onPrimary,
  },
  actionRadarSubtitle: {
    ...typography.labelSm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  actionStandard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTextCol: {
    flex: 1,
  },
  actionStandardTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  actionStandardSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  recentSection: {
    gap: spacing.sm + 2,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  recentHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentHeaderTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  verTodoText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  activityCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.md,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activityDeviceCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm + 2,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextCol: {
    flex: 1,
  },
  activityDeviceName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  activityIp: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  activityTime: {
    ...typography.bodySm,
    color: colors.muted,
  },
  activityBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  activityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityStatusDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  emptyRecentCard: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  emptyRecentTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyRecentSub: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  syncCountBadgeSynced: {
    backgroundColor: colors.success,
  },
});
