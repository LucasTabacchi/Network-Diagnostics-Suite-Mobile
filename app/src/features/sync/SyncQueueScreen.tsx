import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { getRepositories } from '../../store';
import { OutboxItem } from '../../store/models';
import { SyncWorker } from '../../sync/SyncWorker';

export const SyncQueueScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const [dbItems, setDbItems] = useState<OutboxItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const repos = getRepositories();
      const items = await repos.outbox.listAll(50);
      setDbItems(items);
      const count = await repos.outbox.countPending();
      setPendingCount(count);
    } catch {
      setDbItems([]);
      setPendingCount(0);
    }

    try {
      const net = await NetInfo.fetch();
      setIsOnline(Boolean(net.isConnected && net.isInternetReachable !== false));
    } catch {
      setIsOnline(true);
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

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await SyncWorker.syncAll();
      await loadData();
    } catch (err) {
      console.warn('[SyncQueueScreen] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryItem = async (id: string) => {
    setIsSyncing(true);
    try {
      await SyncWorker.retryItem(id);
      await loadData();
    } catch (err) {
      console.warn('Retry error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Cola de sincronización"
        showBack
        onPressBack={() => navigation.goBack()}
        isOnline={isOnline}
        pendingCount={pendingCount}
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
        {/* Offline Warning Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Icon name="warning" size={20} color="#F5A524" />
            <Text style={styles.offlineBannerText}>
              Sin conexión. Se sincronizará automáticamente al recuperar red.
            </Text>
          </View>
        )}

        {/* Summary text */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {pendingCount === 0
              ? 'Sin acciones pendientes'
              : `${pendingCount} ${
                  pendingCount === 1 ? 'acción pendiente' : 'acciones pendientes'
                }`}
          </Text>
        </View>

        {/* Database Items (if any) */}
        {dbItems.length > 0 ? (
          dbItems.map((item) => {
            let title = 'Registro';
            if (item.entityType === 'installation') title = 'Reporte de instalación';
            if (item.entityType === 'diagnostic') title = 'Diagnóstico SNMP / SSH';

            let payloadObj: any = {};
            try {
              payloadObj = JSON.parse(item.payloadJson);
            } catch {}

            const deviceName =
              payloadObj.deviceName ||
              payloadObj.model ||
              payloadObj.target ||
              `ID: ${item.entityId}`;
            const subinfo =
              payloadObj.siteName ||
              payloadObj.target ||
              `Entidad: ${item.entityType}`;
            const isConflict = item.status === 'conflict';
            const isSynced = item.status === 'synced';
            const isError = item.attempts >= 3;

            return (
              <Card key={item.id} style={styles.itemCard} variant="surface">
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{title}</Text>
                  {isConflict ? (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('SyncConflict', { conflictId: item.id })
                      }
                    >
                      <StatusBadge label="Conflicto" variant="warning" dot />
                    </TouchableOpacity>
                  ) : isSynced ? (
                    <StatusBadge label="Sincronizado" variant="success" dot />
                  ) : isError ? (
                    <StatusBadge label="Error" variant="critical" dot />
                  ) : item.attempts > 0 ? (
                    <StatusBadge
                      label={`Reintentando (${item.attempts})`}
                      variant="warning"
                      dot
                    />
                  ) : (
                    <StatusBadge label="Pendiente" variant="neutral" dot />
                  )}
                </View>

                <Text style={styles.itemDevice}>{deviceName}</Text>
                <Text style={styles.itemMeta}>{subinfo}</Text>
                <Text style={[styles.itemMeta, { marginTop: 2 }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                {isConflict && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.conflictBtn}
                    onPress={() =>
                      navigation.navigate('SyncConflict', { conflictId: item.id })
                    }
                  >
                    <Icon name="warning" size={16} color="#F5A524" />
                    <Text style={styles.conflictBtnText}>Resolver conflicto de versión</Text>
                  </TouchableOpacity>
                )}

                {isError && (
                  <View style={styles.retryRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.retryBtn}
                      onPress={() => handleRetryItem(item.id)}
                    >
                      <Text style={styles.retryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard} variant="surface">
            <Icon name="check_circle" size={36} color={colors.success} />
            <Text style={styles.emptyTitle}>Cola de sincronización al día</Text>
            <Text style={styles.emptySubtitle}>
              No hay acciones pendientes en la base de datos local SQLite. Todas las instalaciones y diagnósticos han sido sincronizados con el nodo central.
            </Text>
          </Card>
        )}

        {/* Prominent Primary Button */}
        <View style={styles.bottomSection}>
          <ActionButton
            label={isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            icon="cloud_sync"
            variant="primary"
            onPress={handleManualSync}
            disabled={isSyncing}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 165, 36, 0.15)',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 36, 0.3)',
  },
  offlineBannerText: {
    ...typography.bodyMedium,
    color: '#F5A524',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  summaryRow: {
    marginTop: spacing.xs,
  },
  summaryText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  itemCard: {
    padding: spacing.md,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemDevice: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  itemMeta: {
    ...typography.labelSmall,
    color: colors.outline,
    fontSize: 11,
  },
  retryRow: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  retryBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  conflictBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 165, 36, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  conflictBtnText: {
    ...typography.labelSmall,
    color: '#F5A524',
    fontWeight: '700',
  },
  bottomSection: {
    marginTop: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
