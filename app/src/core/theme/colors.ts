export const colors = {
  // Canvas & Background
  background: '#071425',
  canvasBase: '#0F1B2D',

  // Surfaces & Elevation
  surface: '#071425',
  surfaceContainerLowest: '#030E20',
  surfaceContainerLow: '#101C2E',
  surfaceContainer: '#142032',
  surfaceContainerHigh: '#1F2A3D',
  surfaceContainerHighest: '#2A3548',
  surfaceStroke: '#223854',

  // Brand, Focus & Telemetry Accents
  primary: '#4A90E2',
  primaryContainer: '#2F7BC4',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFFFFF',

  secondary: '#A0C9FF',
  secondaryContainer: '#0063AA',

  // Status & Telemetry Indicators
  success: '#3DDC97',
  warning: '#F5A524',
  critical: '#FF5C5C',

  // Text & Foregrounds
  onSurface: '#D7E3FC',
  onSurfaceVariant: '#A0B2C6',
  muted: '#6C829D',
  outline: '#8B919D',
  outlineVariant: '#414751',

  // Specific LED Glows
  ledGreen: '#3DDC97',
  ledAmber: '#F5A524',
  ledRed: '#FF5C5C',
};

export type Colors = typeof colors;
