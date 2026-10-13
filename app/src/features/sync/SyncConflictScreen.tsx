import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, ActionButton, Icon } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { SyncWorker, conflictStore } from '../../sync/SyncWorker';

export const SyncConflictScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SyncConflict'>>();
  const conflictId = route.params?.conflictId || 'default-conflict';

  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Retrieve stored conflict or use mockup defaults
  const activeConflict = conflictStore.get(conflictId);

  const localNotes =
    activeConflict?.localVersion?.notes ||
    'Equipo instalado en rack 2. Enlace de fibra verificado. Se reemplazó el router anterior.';
  const localDevice =
    activeConflict?.localVersion?.deviceName || 'Router MikroTik hAP ac2';

  const serverNotes =
    activeConflict?.serverVersion?.notes ||
    'Equipo registrado en Nodo Central. Notas distintas a las locales.';
  const serverDevice =
    activeConflict?.serverVersion?.deviceName || 'Router MikroTik hAP ac2';

  const handleResolve = async (resolution: 'keep_local' | 'use_server') => {
    setIsResolving(true);
    try {
      await SyncWorker.resolveConflict(conflictId, resolution);
      Alert.alert(
        'Conflicto resuelto',
        resolution === 'keep_local'
          ? 'Se mantendrán los datos locales para la sincronización.'
          : 'Se aplicó la versión del servidor en el dispositivo.',
        [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo resolver el conflicto: ' + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Conflicto de sincronización"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.dialogCard} variant="high">
          <View style={styles.dialogHeader}>
            <View style={styles.warningCircle}>
              <Icon name="warning" size={24} color="#F5A524" />
            </View>
            <Text style={styles.dialogTitle}>Conflicto de sincronización</Text>
            <Text style={styles.dialogSubtitle}>
              Este registro fue modificado en el servidor.
            </Text>
          </View>

          {/* Local Version Card */}
          <View style={styles.versionBox}>
            <View style={styles.versionHeader}>
              <Text style={styles.versionTagLocal}>VERSIÓN LOCAL</Text>
              <Text style={styles.versionTime}>Hoy 10:42</Text>
            </View>
            <Text style={styles.deviceTitle}>{localDevice}</Text>
            <Text style={styles.deviceNotes}>{localNotes}</Text>
          </View>

          {/* Server Version Card */}
          <View style={styles.versionBox}>
            <View style={styles.versionHeader}>
              <Text style={styles.versionTagServer}>VERSIÓN DEL SERVIDOR</Text>
              <Text style={styles.versionTime}>Hoy 10:45</Text>
            </View>
            <Text style={styles.deviceTitle}>{serverDevice}</Text>
            <Text style={styles.deviceNotes}>{serverNotes}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <ActionButton
              label="Mantener mía"
              variant="secondary"
              onPress={() => handleResolve('keep_local')}
              style={styles.halfBtn}
              disabled={isResolving}
            />
            <ActionButton
              label="Usar servidor"
              variant="primary"
              onPress={() => handleResolve('use_server')}
              style={styles.halfBtn}
              disabled={isResolving}
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
    justifyContent: 'center',
  },
  dialogCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  dialogHeader: {
    alignItems: 'center',
    textAlign: 'center',
    gap: spacing.xs,
  },
  warningCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 165, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dialogTitle: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    textAlign: 'center',
    fontWeight: '700',
  },
  dialogSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  versionBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionTagLocal: {
    ...typography.labelSmall,
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  versionTagServer: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  versionTime: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  deviceTitle: {
    ...typography.labelLarge,
    color: colors.onSurface,
    fontWeight: '600',
  },
  deviceNotes: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
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
