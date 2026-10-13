import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'high' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'surface',
}) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'high' && styles.cardHigh,
        variant === 'interactive' && styles.cardInteractive,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
  },
  cardHigh: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  cardInteractive: {
    borderColor: colors.primary,
  },
});
