import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { CredentialManager } from '../../security/CredentialManager';
import { CredentialMetadata } from '../../store/models';
import { getRepositories, initDatabase } from '../../store';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [manager, setManager] = useState<CredentialManager | null>(null);

  const loadCredentials = useCallback(async () => {
    try {
      let repos;
      try {
        repos = getRepositories();
      } catch (_) {
        repos = await initDatabase();
      }
      const mgr = new CredentialManager(repos.credentials);
      setManager(mgr);
      const list = await mgr.listAll();
      setCredentials(list);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadCredentials();
    }
  }, [isFocused, loadCredentials]);

  const handleDelete = useCallback(
    (cred: CredentialMetadata) => {
      Alert.alert(
        'Eliminar credencial',
        `¿Deseas eliminar la credencial para "${cred.alias}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              if (manager) {
                await manager.deleteCredential(cred.id);
                await loadCredentials();
              }
            },
          },
        ]
      );
    },
    [manager, loadCredentials]
  );

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Ajustes"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={styles.accentBar} />
          <Text style={styles.sectionTitle}>Credenciales de equipos</Text>
        </View>

        {credentials.map((cred) => (
          <Card key={cred.id} style={styles.credCard}>
            <View style={styles.cardHeader}>
              <View style={styles.credInfo}>
                <Text style={styles.credName}>{cred.alias}</Text>
                <Text style={styles.credTarget}>
                  {cred.username}@{cred.host}:{cred.port}
                </Text>
              </View>
              <View style={styles.iconBox}>
                <Icon name="router" size={20} color={colors.onSurfaceVariant} />
              </View>
            </View>

            {/* Password simulation */}
            <View style={styles.passwordField}>
              <Text style={styles.passwordLabel}>CONTRASEÑA</Text>
              <Text style={styles.passwordDots}>••••••••••</Text>
            </View>

            {/* Security Guarantee */}
            <View style={styles.securityRow}>
              <Icon name="lock" size={14} color={colors.success} />
              <Text style={styles.securityText}>
                Almacenado de forma segura (Keychain/Keystore)
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <ActionButton
                label="Abrir SSH"
                icon="terminal"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('SshConsole', {
                    ip: cred.host,
                    alias: cred.alias,
                    user: cred.username,
                    port: cred.port,
                  })
                }
                style={styles.actionBtn}
              />
              <ActionButton
                label="Eliminar"
                icon="delete"
                variant="danger"
                onPress={() => handleDelete(cred)}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        ))}

        {credentials.length === 0 && (
          <View style={styles.emptyCard}>
            <Icon name="lock" size={32} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>Sin credenciales guardadas</Text>
            <Text style={styles.emptySub}>
              Agrega accesos SSH/Telnet para consultar routers y switches de forma segura.
            </Text>
          </View>
        )}

        <ActionButton
          label="Agregar credencial"
          icon="add_task"
          variant="primary"
          onPress={() => navigation.navigate('AddCredential', {})}
        />
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  credCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  credInfo: {
    flex: 1,
  },
  credName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  credTarget: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordField: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.md,
    padding: spacing.sm + 2,
  },
  passwordLabel: {
    ...typography.labelSm,
    color: colors.muted,
  },
  passwordDots: {
    ...typography.telemetryMono,
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 3,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  securityText: {
    ...typography.labelSm,
    color: colors.success,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  emptySub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
