import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { CredentialManager } from '../../security/CredentialManager';
import { getRepositories, initDatabase } from '../../store';

export const AddCredentialScreen: React.FC = () => {
  const navigation = useNavigation();
  const [alias, setAlias] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [user, setUser] = useState('admin');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!alias.trim()) {
      Alert.alert('Campo requerido', 'Ingresa un nombre o alias para el equipo');
      return;
    }
    if (!host.trim()) {
      Alert.alert('Campo requerido', 'Ingresa la dirección IP o host');
      return;
    }
    if (!password) {
      Alert.alert('Campo requerido', 'Ingresa la contraseña para acceso SSH');
      return;
    }

    setSaving(true);
    try {
      let repos;
      try {
        repos = getRepositories();
      } catch (_) {
        repos = await initDatabase();
      }

      const manager = new CredentialManager(repos.credentials);
      await manager.saveCredential({
        alias: alias.trim(),
        host: host.trim(),
        port: parseInt(port, 10) || 22,
        username: user.trim() || 'admin',
        password,
      });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la credencial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Agregar credencial"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard} variant="high">
          <Text style={styles.formTitle}>Nueva credencial segura</Text>

          {/* Alias */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NOMBRE O ALIAS DEL EQUIPO</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Router MikroTik hAP ac2"
              placeholderTextColor={colors.muted}
              value={alias}
              onChangeText={setAlias}
            />
          </View>

          {/* Host IP */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DIRECCIÓN IP / HOST</Text>
            <TextInput
              style={[styles.input, styles.monoInput]}
              placeholder="192.168.1.1"
              placeholderTextColor={colors.muted}
              value={host}
              onChangeText={setHost}
              keyboardType="numeric"
            />
          </View>

          {/* Port and User row */}
          <View style={styles.splitRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>PUERTO</Text>
              <TextInput
                style={[styles.input, styles.monoInput]}
                placeholder="22"
                placeholderTextColor={colors.muted}
                value={port}
                onChangeText={setPort}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>USUARIO SSH</Text>
              <TextInput
                style={styles.input}
                placeholder="admin"
                placeholderTextColor={colors.muted}
                value={user}
                onChangeText={setUser}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONTRASEÑA</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Keystore Guarantee Notice */}
          <View style={styles.securityBox}>
            <Icon name="lock" size={16} color={colors.success} />
            <Text style={styles.securityText}>
              Cifrado por hardware en Keystore / Keychain. La clave nunca se almacena en texto plano ni se sincroniza.
            </Text>
          </View>

          {/* Action triggers */}
          <View style={styles.actionsRow}>
            <ActionButton
              label={saving ? 'Guardando...' : 'Guardar credencial'}
              icon="add_task"
              variant="primary"
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </Card>
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
  },
  formCard: {
    gap: spacing.md,
  },
  formTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    color: colors.onSurface,
    ...typography.bodyMd,
  },
  monoInput: {
    ...typography.telemetryMono,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(61, 220, 151, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 151, 0.25)',
    borderRadius: spacing.radius.md,
    padding: spacing.md,
  },
  securityText: {
    ...typography.labelSm,
    color: colors.success,
    flex: 1,
  },
  actionsRow: {
    marginTop: spacing.sm,
  },
});
