import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import {
  DiscoveryEngine,
  SubnetInfo,
  DiscoveredDevice,
  calculateSubnet,
} from '../../network/discovery';
import { getRepositories, initDatabase } from '../../store';

export const NetworkScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const engine = useMemo(() => new DiscoveryEngine(), []);
  const [subnet, setSubnet] = useState<SubnetInfo>(() =>
    calculateSubnet('192.168.1.100', '255.255.255.0')
  );
  const [cachedDevices, setCachedDevices] = useState<DiscoveredDevice[]>([]);
  const [scanDevices, setScanDevices] = useState<DiscoveredDevice[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Load existing cached devices from DB on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sub = await engine.getCurrentSubnet();
        if (mounted) setSubnet(sub);

        let repos;
        try {
          repos = getRepositories();
        } catch {
          repos = await initDatabase();
        }

        const stored = await repos.devices.listAll();
        if (mounted && stored.length > 0) {
          setCachedDevices(
            stored.map((d) => ({
              ip: d.ip,
              mac: d.mac,
              name: d.hostname || `Equipo ${d.ip}`,
              vendor: d.vendor || 'Genérico',
              type: 'router',
              openPorts: [],
              isOnline: false,
              responseTimeMs: 0,
            }))
          );
        }
      } catch {}
    })();

    return () => {
      mounted = false;
      engine.stopScan();
    };
  }, [engine]);

  const handleToggleScan = useCallback(async () => {
    if (isScanning) {
      engine.stopScan();
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setScannedCount(0);
    setScanDevices([]);
    setHasScanned(true);

    try {
      await engine.startScan(
        subnet,
        (progress) => {
          setScannedCount(progress.scanned);
        },
        (newDev) => {
          setScanDevices((prev) => {
            const index = prev.findIndex((d) => d.ip === newDev.ip);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = newDev;
              return updated;
            }
            return [...prev, newDev];
          });
        }
      );
    } catch {
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, engine, subnet]);

  const visibleDevices = hasScanned ? scanDevices : cachedDevices;
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return visibleDevices;
    const q = searchQuery.toLowerCase();
    return visibleDevices.filter(
      (d) =>
        d.ip.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q) ||
        (d.mac && d.mac.toLowerCase().includes(q))
    );
  }, [visibleDevices, searchQuery]);

  const totalHosts = subnet.hosts.length || 254;
  const progressPercent = Math.min(
    100,
    Math.round((scannedCount / totalHosts) * 100)
  );

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Red"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Operational Subnet Header Card */}
        <Card style={styles.subnetCard} variant="high">
          <View style={styles.subnetHeader}>
            <Icon name="radar" size={18} color={colors.primary} />
            <Text style={styles.subnetLabel}>SUBRED OPERATIVA</Text>
          </View>
          <Text style={styles.subnetValue}>
            {subnet.networkAddress}/{subnet.cidr}
          </Text>

          {/* Scan Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <View style={styles.progressLeft}>
                <Icon name="radar" size={14} color={colors.success} />
                <Text style={styles.progressText}>
                  {isScanning
                    ? `Escaneando: ${scannedCount}/${totalHosts} hosts`
                    : hasScanned
                    ? scannedCount === totalHosts
                      ? `Escaneo completo: ${scanDevices.length} ${scanDevices.length === 1 ? 'detectado' : 'detectados'}`
                      : `Escaneo detenido: ${scanDevices.length} ${scanDevices.length === 1 ? 'detectado' : 'detectados'}`
                    : 'Listo para escanear'}
                </Text>
              </View>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          {/* Action Trigger */}
          <ActionButton
            label={isScanning ? 'Detener escaneo' : 'Iniciar escaneo de red'}
            variant={isScanning ? 'secondary' : 'primary'}
            onPress={handleToggleScan}
            icon={isScanning ? 'warning' : 'radar'}
          />
        </Card>

        {/* Search / Filter Input */}
        <View style={styles.searchBar}>
          <Icon name="radar" size={16} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filtrar por IP, nombre o fabricante..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Detected Devices Section */}
        <View style={styles.devicesSection}>
          <View style={styles.devicesHeader}>
            <Text style={styles.devicesHeaderLabel}>
              {hasScanned ? 'DISPOSITIVOS DETECTADOS' : 'EQUIPOS GUARDADOS (SIN VERIFICAR)'}
            </Text>
            <Text style={styles.devicesHeaderCount}>
              {filteredDevices.length} {hasScanned
                ? filteredDevices.length === 1 ? 'ENCONTRADO' : 'ENCONTRADOS'
                : filteredDevices.length === 1 ? 'GUARDADO' : 'GUARDADOS'}
            </Text>
          </View>

          {filteredDevices.map((dev) => (
            <TouchableOpacity
              key={dev.ip}
              style={styles.deviceCard}
              onPress={() =>
                navigation.navigate('DeviceDetail', {
                  ip: dev.ip,
                  mac: dev.mac,
                  model: dev.name,
                  hostname: dev.name,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.deviceTop}>
                <View style={styles.deviceTitleRow}>
                  <View style={[styles.onlineDot, !dev.isOnline && styles.cachedDot]} />
                  <Text style={styles.deviceName}>{dev.name}</Text>
                </View>

                {dev.openPorts.length > 0 && (
                  <StatusBadge
                    label={`:${dev.openPorts[0]}`}
                    variant="neutral"
                  />
                )}
              </View>

              <View style={styles.deviceMetaRow}>
                <View style={styles.deviceMetaCol}>
                  <Text style={styles.metaLabel}>DIRECCIÓN IP</Text>
                  <Text style={styles.metaValue}>{dev.ip}</Text>
                </View>

                <View style={styles.deviceMetaCol}>
                  <Text style={styles.metaLabel}>DIRECCIÓN MAC</Text>
                  <Text style={styles.metaValue}>{dev.mac || '—'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredDevices.length === 0 && !isScanning && (
            <View style={styles.emptyState}>
              <Icon name="radar" size={32} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>Ningún equipo detectado</Text>
              <Text style={styles.emptySub}>
                {hasScanned
                  ? 'No se encontraron equipos que respondan en este escaneo.'
                  : 'Presiona "Iniciar escaneo de red" para descubrir equipos en la subred.'}
              </Text>
            </View>
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
  subnetCard: {
    gap: spacing.md,
  },
  subnetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subnetLabel: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  subnetValue: {
    ...typography.headlineXl,
    color: colors.onSurface,
  },
  progressContainer: {
    gap: spacing.xs + 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  progressPercent: {
    ...typography.labelSm,
    color: colors.success,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.onSurface,
  },
  clearSearch: {
    ...typography.labelSm,
    color: colors.primary,
  },
  devicesSection: {
    gap: spacing.sm + 2,
  },
  devicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  devicesHeaderLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  devicesHeaderCount: {
    ...typography.labelSm,
    color: colors.success,
  },
  deviceCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.md,
  },
  deviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  cachedDot: {
    backgroundColor: colors.muted,
  },
  deviceName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  deviceMetaCol: {
    flex: 1,
  },
  metaLabel: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  metaValue: {
    ...typography.telemetryMono,
    color: colors.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  emptySub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 260,
  },
});
