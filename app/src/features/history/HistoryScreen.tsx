import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { getRepositories } from '../../store';

export type HistoryType = 'all' | 'snmp' | 'ssh' | 'installation';

interface UnifiedHistoryItem {
  id: string;
  type: 'snmp' | 'ssh' | 'installation';
  typeLabel: 'SNMP' | 'SSH' | 'Instalación';
  deviceName: string;
  ip?: string;
  siteName: string;
  resultStatus: 'OK' | 'Falla' | 'Alerta';
  syncStatus: 'synced' | 'pending';
  timeGroup: 'Hoy' | 'Ayer' | 'Anteriores';
  timeStr: string;
  rawPayload?: any;
}

const getTimeGroup = (timestamp: number): 'Hoy' | 'Ayer' | 'Anteriores' => {
  const itemDate = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  if (timestamp >= startOfToday) {
    return 'Hoy';
  }
  if (timestamp >= startOfYesterday) {
    return 'Ayer';
  }
  return 'Anteriores';
};

const formatTimeStr = (timestamp: number, group: 'Hoy' | 'Ayer' | 'Anteriores'): string => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (group === 'Hoy') return `Hoy ${time}`;
  if (group === 'Ayer') return `Ayer ${time}`;
  return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${time}`;
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<HistoryType>('all');
  const [items, setItems] = useState<UnifiedHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const repos = getRepositories();
      const diagnostics = await repos.diagnostics.listAll(50);
      const installations = await repos.installations.listAll();

      const mappedList: UnifiedHistoryItem[] = [];

      for (const diag of diagnostics) {
        const group = getTimeGroup(diag.createdAt);
        mappedList.push({
          id: diag.id,
          type: diag.type as 'snmp' | 'ssh',
          typeLabel: diag.type === 'snmp' ? 'SNMP' : 'SSH',
          deviceName: diag.type === 'snmp' ? 'Diagnóstico SNMP' : 'Consola SSH',
          ip: diag.target,
          siteName: 'Sitio Local',
          resultStatus: diag.status === 'failed' ? 'Falla' : 'OK',
          syncStatus: diag.status === 'synced' ? 'synced' : 'pending',
          timeGroup: group,
          timeStr: formatTimeStr(diag.createdAt, group),
          rawPayload: diag,
        });
      }

      for (const inst of installations) {
        const group = getTimeGroup(inst.createdAt);
        mappedList.push({
          id: inst.id,
          type: 'installation',
          typeLabel: 'Instalación',
          deviceName: inst.deviceName,
          ip: inst.deviceIp,
          siteName: inst.siteName,
          resultStatus: 'OK',
          syncStatus: inst.status === 'synced' ? 'synced' : 'pending',
          timeGroup: group,
          timeStr: formatTimeStr(inst.createdAt, group),
          rawPayload: inst,
        });
      }

      setItems(mappedList);
    } catch {
      setItems([]);
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

  const filteredItems = items.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.deviceName.toLowerCase().includes(query) ||
      (item.ip && item.ip.toLowerCase().includes(query)) ||
      item.siteName.toLowerCase().includes(query)
    );
  });

  const hoyItems = filteredItems.filter((i) => i.timeGroup === 'Hoy');
  const ayerItems = filteredItems.filter((i) => i.timeGroup === 'Ayer');
  const olderItems = filteredItems.filter((i) => i.timeGroup === 'Anteriores');

  const handleItemPress = (item: UnifiedHistoryItem) => {
    if (item.type === 'installation') {
      navigation.navigate('PdfPreview', {
        filePath: item.rawPayload?.pdfPath || `reporte_${item.id}.pdf`,
        title: `Reporte de Instalación - ${item.deviceName}`,
      });
    } else if (item.type === 'snmp') {
      navigation.navigate('DeviceDetail', {
        ip: item.ip || '192.168.1.254',
        model: item.deviceName,
        hostname: item.deviceName,
        diagnosticId: item.id,
      });
    } else if (item.type === 'ssh') {
      navigation.navigate('SshConsole', {
        ip: item.ip || '192.168.1.1',
        alias: item.deviceName,
        initialOutput: item.rawPayload?.rawOutput,
        diagnosticId: item.id,
      });
    }
  };

  const renderCard = (item: UnifiedHistoryItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.8}
        onPress={() => handleItemPress(item)}
      >
        <Card style={styles.historyCard} variant="surface">
          <View style={styles.cardTop}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{item.typeLabel}</Text>
            </View>

            <View style={styles.statusGroup}>
              {/* Result Pill */}
              <View
                style={[
                  styles.resultPill,
                  item.resultStatus === 'OK' && styles.resultOk,
                  item.resultStatus === 'Falla' && styles.resultError,
                  item.resultStatus === 'Alerta' && styles.resultWarn,
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    item.resultStatus === 'OK' && { color: '#003822' },
                    item.resultStatus === 'Falla' && { color: '#FFDAD6' },
                    item.resultStatus === 'Alerta' && { color: '#00325A' },
                  ]}
                >
                  {item.resultStatus}
                </Text>
              </View>

              {/* Sync Icon */}
              <Icon
                name={item.syncStatus === 'synced' ? 'check_circle' : 'sync'}
                size={18}
                color={item.syncStatus === 'synced' ? colors.success : colors.secondary}
              />
            </View>
          </View>

          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{item.deviceName}</Text>
            {item.ip && <Text style={styles.deviceIp}>{item.ip}</Text>}
          </View>

          <View style={styles.locationRow}>
            <Icon name="place" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.locationText}>{item.siteName}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Historial"
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
        {/* Offline Availability Pill */}
        <View style={styles.offlinePillRow}>
          <View style={styles.offlinePill}>
            <Icon name="check_circle" size={16} color={colors.success} />
            <Text style={styles.offlinePillText}>Disponible sin conexión</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="radar" size={18} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar en historial..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === 'snmp' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('snmp')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'snmp' && styles.filterChipTextActive,
              ]}
            >
              SNMP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === 'ssh' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('ssh')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'ssh' && styles.filterChipTextActive,
              ]}
            >
              SSH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === 'installation' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('installation')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'installation' && styles.filterChipTextActive,
              ]}
            >
              Instalación
            </Text>
          </TouchableOpacity>
        </View>

        {/* Groups */}
        {hoyItems.length > 0 && (
          <View style={styles.groupSection}>
            <Text style={styles.groupHeader}>HOY</Text>
            {hoyItems.map(renderCard)}
          </View>
        )}

        {ayerItems.length > 0 && (
          <View style={styles.groupSection}>
            <Text style={styles.groupHeader}>AYER</Text>
            {ayerItems.map(renderCard)}
          </View>
        )}

        {olderItems.length > 0 && (
          <View style={styles.groupSection}>
            <Text style={styles.groupHeader}>ANTERIORES</Text>
            {olderItems.map(renderCard)}
          </View>
        )}

        {filteredItems.length === 0 && (
          <Card style={styles.emptyCard} variant="surface">
            <Icon name="history" size={32} color={colors.outline} />
            <Text style={styles.emptyTitle}>Sin resultados en el historial</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim() || activeFilter !== 'all'
                ? 'No se encontraron registros para los filtros seleccionados.'
                : 'Realice diagnósticos o instalaciones para ver el registro histórico.'}
            </Text>
          </Card>
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.md,
  },
  offlinePillRow: {
    flexDirection: 'row',
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  offlinePillText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    ...typography.bodyMedium,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#001C39',
    fontWeight: '700',
  },
  groupSection: {
    gap: spacing.xs,
  },
  groupHeader: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  historyCard: {
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 52,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultOk: {
    backgroundColor: '#00A56C',
  },
  resultError: {
    backgroundColor: '#93000A',
  },
  resultWarn: {
    backgroundColor: '#0063AA',
  },
  resultText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deviceInfo: {
    gap: 2,
    marginTop: 2,
  },
  deviceName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  deviceIp: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
