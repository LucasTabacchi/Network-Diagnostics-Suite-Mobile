import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Icon } from './Icon';

import { getRepositories } from '../../store';

interface StatusHeaderProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  pendingCount?: number;
  onPressSyncQueue?: () => void;
  onPressBack?: () => void;
  showBack?: boolean;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  title,
  subtitle = 'NETWORK DIAGNOSTICS SUITE',
  isOnline = true,
  pendingCount: propPendingCount,
  onPressSyncQueue,
  onPressBack,
  showBack = false,
}) => {
  const insets = useSafeAreaInsets();
  const [autoPending, setAutoPending] = React.useState<number>(0);

  React.useEffect(() => {
    if (propPendingCount !== undefined) return;
    let mounted = true;
    const fetchCount = async () => {
      try {
        const repos = getRepositories();
        const count = await repos.outbox.countPending();
        if (mounted) setAutoPending(count);
      } catch {
        if (mounted) setAutoPending(0);
      }
    };
    fetchCount();
    return () => {
      mounted = false;
    };
  }, [propPendingCount]);

  const effectivePending =
    propPendingCount !== undefined ? propPendingCount : autoPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Left: Back button or Logo + Title */}
        <View style={styles.leftSection}>
          {showBack && onPressBack ? (
            <TouchableOpacity
              onPress={onPressBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Volver"
            >
              <Icon name="chevron_left" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          ) : (
            <View style={styles.appBadge}>
              <Icon name="radar" size={20} color={colors.primary} />
            </View>
          )}

          <View style={styles.titleColumn}>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        {/* Right: Connectivity Status + Sync Buffer Badge */}
        <View style={styles.rightSection}>
          <View style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}>
            <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
              {isOnline ? 'ONLINE' : 'SIN CONEXIÓN'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.syncPill}
            onPress={onPressSyncQueue}
            activeOpacity={0.7}
            accessibilityLabel={`Cola de sincronización, ${effectivePending} pendientes`}
          >
            <Icon name="cloud_sync" size={16} color={colors.onSurfaceVariant} />
            <View
              style={[
                styles.pendingBadge,
                effectivePending === 0 && styles.pendingBadgeSynced,
              ]}
            >
              <Text style={styles.pendingBadgeText}>
                {effectivePending > 0 ? `${effectivePending} pend.` : 'Al día'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceStroke,
    zIndex: 100,
  },
  content: {
    height: spacing.headerHeight,
    paddingHorizontal: spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  appBadge: {
    width: 32,
    height: 32,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  titleColumn: {
    flex: 1,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: spacing.radius.full,
    borderWidth: 1,
  },
  onlinePill: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: 'rgba(61, 220, 151, 0.3)',
  },
  offlinePill: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: 'rgba(245, 165, 36, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: colors.success,
  },
  offlineDot: {
    backgroundColor: colors.warning,
  },
  statusText: {
    ...typography.labelSm,
    fontSize: 9,
  },
  onlineText: {
    color: colors.success,
  },
  offlineText: {
    color: colors.warning,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minHeight: 32,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: 4,
  },
  pendingBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pendingBadgeSynced: {
    backgroundColor: colors.success,
  },
  pendingBadgeText: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
