import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export type BadgeVariant = 'success' | 'warning' | 'critical' | 'neutral' | 'primary';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  dot = false,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'rgba(61, 220, 151, 0.12)',
          border: 'rgba(61, 220, 151, 0.3)',
          text: colors.success,
          dot: colors.success,
        };
      case 'warning':
        return {
          bg: 'rgba(245, 165, 36, 0.12)',
          border: 'rgba(245, 165, 36, 0.3)',
          text: colors.warning,
          dot: colors.warning,
        };
      case 'critical':
        return {
          bg: 'rgba(255, 92, 92, 0.12)',
          border: 'rgba(255, 92, 92, 0.3)',
          text: colors.critical,
          dot: colors.critical,
        };
      case 'primary':
        return {
          bg: 'rgba(74, 144, 226, 0.15)',
          border: 'rgba(74, 144, 226, 0.4)',
          text: colors.primary,
          dot: colors.primary,
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceContainerHigh,
          border: colors.surfaceStroke,
          text: colors.onSurfaceVariant,
          dot: colors.onSurfaceVariant,
        };
    }
  };

  const c = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      {dot && <View style={[styles.dot, { backgroundColor: c.dot }]} />}
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    ...typography.labelSm,
  },
});
