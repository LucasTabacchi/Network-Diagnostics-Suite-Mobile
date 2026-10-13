import { Platform, TextStyle } from 'react-native';

const monospaceFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

export const typography: Record<string, TextStyle> = {
  headlineXl: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headlineLg: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headlineSm: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMd: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodySm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  labelLg: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  labelMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // High-frequency telemetry tabular numbers
  telemetryMono: {
    fontFamily: monospaceFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  telemetryMonoSm: {
    fontFamily: monospaceFont,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
};
