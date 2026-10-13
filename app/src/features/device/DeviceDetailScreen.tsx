import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { SnmpClient, DeviceTelemetry, formatBytes } from '../../network/snmp';
import { initDatabase, getRepositories } from '../../store';

export const DeviceDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DeviceDetail'>>();
  const {
    ip,
    mac = 'F4:C3:61:9A:82:10',
    model = 'Equipo de Red',
    hostname = 'Nodo-Principal',
    diagnosticId,
  } = route.params || {};

  const [activeTab, setActiveTab] = useState<'snmp' | 'ssh'>('snmp');
  const [community, setCommunity] = useState('public');
  const [isEditingCommunity, setIsEditingCommunity] = useState(false);
  const [tempCommunity, setTempCommunity] = useState('public');
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [historicalTimestamp, setHistoricalTimestamp] = useState<number | null>(null);

  const snmpClient = React.useMemo(() => new SnmpClient(), []);

  const loadHistoricalDiagnostic = useCallback(async (id: string) => {
    setLoading(true);
    try {
      let repos;
      try {
        repos = getRepositories();
      } catch (_) {
        repos = await initDatabase();
      }
      const record = await repos.diagnostics.findById(id);
      if (record) {
        setHistoricalTimestamp(record.createdAt);
        if (record.parsedTelemetryJson) {
          try {
            const data: DeviceTelemetry = JSON.parse(record.parsedTelemetryJson);
            setTelemetry(data);
          } catch (_) {
            setTelemetry(null);
          }
        }
      }
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    try {
      const data = await snmpClient.queryDeviceTelemetry(ip, community);
      setTelemetry(data);
      setHistoricalTimestamp(null);

      // Save diagnostic result to SQLite store & outbox
      try {
        const repos = getRepositories();
        const diagId = `diag_${Date.now()}`;
        await repos.diagnostics.create({
          id: diagId,
          type: 'snmp',
          target: ip,
          rawOutput: data.sysDescr || 'OK',
          parsedTelemetryJson: JSON.stringify(data),
          status: 'pending',
          createdAt: Date.now(),
        });

        await repos.outbox.enqueue({
          id: `out_${diagId}`,
          entityType: 'diagnostic',
          entityId: diagId,
          payloadJson: JSON.stringify({ ip, ...data }),
          status: 'pending',
        });
      } catch (dbErr) {
        // If DB not yet initialized, initialize lazily
        try {
          const repos = await initDatabase();
          const diagId = `diag_${Date.now()}`;
          await repos.diagnostics.create({
            id: diagId,
            type: 'snmp',
            target: ip,
            rawOutput: data.sysDescr || 'OK',
            parsedTelemetryJson: JSON.stringify(data),
            status: 'pending',
            createdAt: Date.now(),
          });
        } catch (_) {}
      }
    } catch (err: any) {
      setTelemetry(null);
      try {
        const repos = getRepositories();
        const diagId = `diag_${Date.now()}`;
        await repos.diagnostics.create({
          id: diagId,
          type: 'snmp',
          target: ip,
          rawOutput: err?.message || 'Error de conexión SNMP',
          status: 'failed',
          createdAt: Date.now(),
        });
      } catch (dbErr) {
        try {
          const repos = await initDatabase();
          const diagId = `diag_${Date.now()}`;
          await repos.diagnostics.create({
            id: diagId,
            type: 'snmp',
            target: ip,
            rawOutput: err?.message || 'Error de conexión SNMP',
            status: 'failed',
            createdAt: Date.now(),
          });
        } catch (_) {}
      }
      Alert.alert('Error SNMP', err?.message || 'No se pudo comunicar con el equipo');
    } finally {
      setLoading(false);
    }
  }, [ip, community, snmpClient]);

  useEffect(() => {
    if (diagnosticId) {
      loadHistoricalDiagnostic(diagnosticId);
    } else {
      runDiagnostic();
    }
  }, [diagnosticId, loadHistoricalDiagnostic, runDiagnostic]);

  const currentUptime = telemetry?.uptimeFormatted || '— (Sin respuesta)';
  const currentSysName = telemetry?.sysName || hostname || '—';
  const currentVendor = telemetry?.vendor || 'Desconocido';
  const interfaces = telemetry?.interfaces || [];

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Detalle de equipo"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Summary Card */}
        <Card style={styles.summaryCard} variant="high">
          <View style={styles.summaryTop}>
            <View style={styles.iconBox}>
              <Icon name="router" size={24} color={colors.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{currentSysName}</Text>
              <Text style={styles.deviceSub}>Fabricante: {currentVendor}</Text>
            </View>
            <StatusBadge
              label={telemetry ? 'EN LÍNEA' : 'SIN RESPUESTA'}
              variant={telemetry ? 'success' : 'critical'}
              dot
            />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DIRECCIÓN IP</Text>
              <Text style={styles.metaValue}>{ip}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DIRECCIÓN MAC</Text>
              <Text style={styles.metaValue}>{mac}</Text>
            </View>
          </View>
        </Card>

        {historicalTimestamp && (
          <View style={styles.historyNotice}>
            <Icon name="history" size={16} color={colors.secondary} />
            <Text style={styles.historyNoticeText}>
              Registro histórico del{' '}
              {new Date(historicalTimestamp).toLocaleDateString([], {
                day: '2-digit',
                month: '2-digit',
              })}{' '}
              a las{' '}
              {new Date(historicalTimestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Tab Selector SNMP / SSH */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'snmp' && styles.tabBtnActive]}
            onPress={() => setActiveTab('snmp')}
          >
            <Icon
              name="radar"
              size={18}
              color={activeTab === 'snmp' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'snmp' && styles.tabBtnTextActive,
              ]}
            >
              SNMP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ssh' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('ssh');
              navigation.navigate('SshConsole', { ip, alias: currentSysName });
            }}
          >
            <Icon
              name="terminal"
              size={18}
              color={activeTab === 'ssh' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'ssh' && styles.tabBtnTextActive,
              ]}
            >
              SSH
            </Text>
          </TouchableOpacity>
        </View>

        {/* Community Bar */}
        <View style={styles.communityRow}>
          <View style={styles.communityLeft}>
            <Icon name="lock" size={16} color={colors.onSurfaceVariant} />
            <View>
              <Text style={styles.communityLabel}>COMUNIDAD SNMP</Text>
              <Text style={styles.communityValue}>{community} (v2c)</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              setTempCommunity(community);
              setIsEditingCommunity(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="edit" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Action: Consultar de nuevo */}
        <ActionButton
          label={loading ? 'Consultando SNMP...' : 'Consultar de nuevo'}
          icon="refresh"
          variant="primary"
          onPress={runDiagnostic}
          disabled={loading}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Leyendo MIBs por UDP/161...</Text>
          </View>
        )}

        {/* Security Alert */}
        <View style={styles.securityAlert}>
          <Icon name="warning" size={16} color={colors.warning} />
          <Text style={styles.alertText}>
            SNMP v1/v2c no cifra las credenciales
          </Text>
        </View>

        {/* OID 1: SysUptime */}
        <Card style={styles.oidCard}>
          <View style={styles.oidHeader}>
            <Text style={styles.oidLabel}>SYSUPTIME</Text>
            <Text style={styles.oidNum}>OID: 1.3.6.1.2.1.1.3.0</Text>
          </View>
          <Text style={styles.uptimeValue}>{currentUptime}</Text>
        </Card>

        {/* OID 2: SysName */}
        <Card style={styles.oidCard}>
          <View style={styles.oidHeader}>
            <Text style={styles.oidLabel}>SYSNAME</Text>
            <Text style={styles.oidNum}>OID: 1.3.6.1.2.1.1.5.0</Text>
          </View>
          <Text style={styles.sysnameValue}>{currentSysName}</Text>
        </Card>

        {/* Monitoreo de Interfaces Table */}
        <Card style={styles.interfacesCard}>
          <View style={styles.interfacesHeader}>
            <Icon name="network" size={18} color={colors.secondary} />
            <Text style={styles.interfacesTitle}>Monitoreo de Interfaces</Text>
          </View>

          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 1.2 }]}>INTERFAZ</Text>
            <Text style={[styles.th, { flex: 1 }]}>ESTADO</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>ENTRADA</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>SALIDA</Text>
          </View>

          {interfaces.length === 0 ? (
            <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
              <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                Sin interfaces reportadas o equipo no responde vía SNMP
              </Text>
            </View>
          ) : (
            interfaces.map((row) => (
              <View key={row.name || String(row.index)} style={styles.tableRow}>
                <Text style={[styles.tdMono, { flex: 1.2 }]}>{row.name}</Text>
                <View style={{ flex: 1 }}>
                  <StatusBadge
                    label={row.operUp ? 'UP' : 'DOWN'}
                    variant={row.operUp ? 'success' : 'critical'}
                    dot
                  />
                </View>
                <Text style={[styles.tdMonoHighlight, { flex: 1.2 }]}>
                  {formatBytes(row.rxBytes)}
                </Text>
                <Text style={[styles.tdMono, { flex: 1.2 }]}>
                  {formatBytes(row.txBytes)}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* SSH Console CTA */}
        <ActionButton
          label="Abrir consola SSH"
          icon="terminal"
          variant="secondary"
          onPress={() => navigation.navigate('SshConsole', { ip, alias: currentSysName })}
        />
      </ScrollView>

      {/* Edit SNMP Community Modal */}
      <Modal
        visible={isEditingCommunity}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingCommunity(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Icon name="lock" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Comunidad SNMP</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              Ingresá la comunidad para autenticar las consultas MIB-II (v1 / v2c) en este equipo:
            </Text>

            <TextInput
              style={styles.communityInput}
              value={tempCommunity}
              onChangeText={setTempCommunity}
              placeholder="ej. public, noc_read, telecom"
              placeholderTextColor={colors.onSurfaceVariant}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditingCommunity(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  const trimmed = tempCommunity.trim();
                  if (trimmed) {
                    setCommunity(trimmed);
                  }
                  setIsEditingCommunity(false);
                }}
              >
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  summaryCard: {
    gap: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  deviceSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
    marginTop: 2,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  tabBtnText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  communityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  communityLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  communityValue: {
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
    marginTop: 1,
  },
  editBtn: {
    padding: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.primary,
  },
  securityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.25)',
    borderRadius: spacing.radius.md,
    padding: spacing.sm,
  },
  alertText: {
    ...typography.labelSm,
    color: colors.warning,
    flex: 1,
  },
  oidCard: {
    gap: spacing.xs,
  },
  oidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  oidLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  oidNum: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
  },
  uptimeValue: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  sysnameValue: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  interfacesCard: {
    gap: spacing.md,
  },
  interfacesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  interfacesTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  th: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  tdMono: {
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
  },
  tdMonoHighlight: {
    ...typography.telemetryMonoSm,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 14, 32, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  communityInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.onSurface,
    fontSize: 15,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  modalCancelText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  modalSaveText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  historyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  historyNoticeText: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '500',
  },
});

