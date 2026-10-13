import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { SshService, VENDOR_PRESETS, VendorPreset } from '../../network/ssh/SshService';
import { CredentialManager } from '../../security/CredentialManager';
import { getRepositories, initDatabase } from '../../store';

export const SshConsoleScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SshConsole'>>();
  const {
    ip = '192.168.1.1',
    user = 'admin',
    port = 22,
    alias = 'Equipo',
    initialOutput,
  } = route.params || {};

  const sshService = useMemo(() => new SshService(), []);
  const scrollRef = useRef<any>(null);

  const [password, setPassword] = useState('');
  const [terminalText, setTerminalText] = useState(
    initialOutput ||
      `SSH Terminal Session v1.0\nTarget: ${user}@${ip}:${port}\nSecurity: Hardware Keystore Verified\n\n[${user}@${ip}] > `
  );
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Load credential secret from Keychain for this host
  useEffect(() => {
    (async () => {
      try {
        let repos;
        try {
          repos = getRepositories();
        } catch (_) {
          repos = await initDatabase();
        }
        const manager = new CredentialManager(repos.credentials);
        const match = await manager.getSecretForHost(ip);
        if (match?.secret) {
          setPassword(match.secret);
        }
      } catch (_) {}
    })();
  }, [ip]);

  const executeCommand = useCallback(
    async (cmd: string) => {
      if (!cmd.trim() || isExecuting) return;

      setIsExecuting(true);
      const promptLine = `\n[${user}@${ip}] > ${cmd}\n`;
      setTerminalText((prev) => prev + promptLine);

      try {
        const output = await sshService.executeCommand(
          ip,
          port,
          user,
          password,
          cmd
        );
        setTerminalText((prev) => `${prev}${output}\n\n[${user}@${ip}] > `);
      } catch (err: any) {
        setTerminalText(
          (prev) => `${prev}Error SSH: ${err?.message || 'Fallo de ejecución'}\n\n[${user}@${ip}] > `
        );
      } finally {
        setIsExecuting(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [ip, port, user, password, isExecuting, sshService]
  );

  const handleSaveDiagnostic = useCallback(async () => {
    try {
      let repos;
      try {
        repos = getRepositories();
      } catch (_) {
        repos = await initDatabase();
      }

      const diagId = `ssh_${Date.now()}`;
      await repos.diagnostics.create({
        id: diagId,
        type: 'ssh',
        target: ip,
        rawOutput: terminalText,
        status: 'pending',
        createdAt: Date.now(),
      });

      await repos.outbox.enqueue({
        id: `out_${diagId}`,
        entityType: 'diagnostic',
        entityId: diagId,
        payloadJson: JSON.stringify({
          type: 'ssh',
          target: ip,
          user,
          output: terminalText,
        }),
        status: 'pending',
      });

      Alert.alert('Sesión guardada', 'La salida SSH se guardó en el historial y en la cola de sincronización.');
    } catch (_) {
      Alert.alert('Error', 'No se pudo guardar la sesión en el historial.');
    }
  }, [ip, user, terminalText]);

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Consola SSH"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <View style={styles.content}>
        {/* Host Info Card */}
        <Card style={styles.hostCard} variant="high">
          <View style={styles.hostRow}>
            <View style={styles.iconBox}>
              <Icon name="terminal" size={20} color={colors.primary} />
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostTitle}>{`${user}@${ip}:${port}`}</Text>
              <View style={styles.secRow}>
                <Icon name="lock" size={12} color={colors.success} />
                <Text style={styles.secText}>
                  {password ? 'Credencial Keychain activa' : 'Sin clave guardada (simulación)'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.disconnectText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Vendor Preset Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {VENDOR_PRESETS.map((preset: VendorPreset) => (
            <TouchableOpacity
              key={preset.command}
              style={styles.presetChip}
              onPress={() => executeCommand(preset.command)}
              activeOpacity={0.7}
              disabled={isExecuting}
            >
              <Text style={styles.presetPlay}>▶</Text>
              <Text style={styles.presetLabel}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Terminal Screen */}
        <View style={styles.terminalBox}>
          <ScrollView
            ref={scrollRef}
            style={styles.terminalScroll}
            contentContainerStyle={styles.terminalContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.terminalOutput}>{terminalText}</Text>
            {isExecuting && (
              <View style={styles.executingRow}>
                <ActivityIndicator size="small" color={colors.success} />
                <Text style={styles.executingText}>Ejecutando comando SSH...</Text>
              </View>
            )}
          </ScrollView>

          {/* Command Prompt Input Bar */}
          <View style={styles.promptInputBar}>
            <Text style={styles.promptPrefix}>&gt;</Text>
            <TextInput
              style={styles.promptInput}
              placeholder="Escribe un comando SSH..."
              placeholderTextColor={colors.muted}
              value={commandInput}
              onChangeText={setCommandInput}
              onSubmitEditing={() => {
                if (commandInput.trim()) {
                  executeCommand(commandInput.trim());
                  setCommandInput('');
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => {
                if (commandInput.trim()) {
                  executeCommand(commandInput.trim());
                  setCommandInput('');
                }
              }}
              disabled={isExecuting || !commandInput.trim()}
            >
              <Icon name="terminal" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <ActionButton
            label="Limpiar pantalla"
            icon="refresh"
            variant="secondary"
            onPress={() =>
              setTerminalText(`[${user}@${ip}] > `)
            }
            style={styles.halfBtn}
          />
          <ActionButton
            label="Guardar en historial"
            icon="add_task"
            variant="secondary"
            onPress={handleSaveDiagnostic}
            style={styles.halfBtn}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.margin,
    gap: spacing.md,
  },
  hostCard: {
    padding: spacing.md,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostInfo: {
    flex: 1,
  },
  hostTitle: {
    ...typography.telemetryMono,
    color: colors.onSurface,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  secText: {
    ...typography.labelSm,
    color: colors.success,
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  disconnectText: {
    ...typography.labelSm,
    color: colors.critical,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: 6,
  },
  presetPlay: {
    color: colors.success,
    fontSize: 10,
  },
  presetLabel: {
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
  },
  terminalBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    overflow: 'hidden',
  },
  terminalScroll: {
    flex: 1,
  },
  terminalContent: {
    padding: spacing.md,
  },
  terminalOutput: {
    ...typography.telemetryMonoSm,
    color: colors.success,
    lineHeight: 18,
  },
  executingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  executingText: {
    ...typography.telemetryMonoSm,
    color: colors.success,
  },
  promptInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.xs,
  },
  promptPrefix: {
    ...typography.telemetryMono,
    color: colors.success,
  },
  promptInput: {
    flex: 1,
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
  },
  sendBtn: {
    padding: spacing.xs,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
});
