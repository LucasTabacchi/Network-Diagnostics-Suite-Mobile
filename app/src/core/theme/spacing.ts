export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  margin: 16,
  gutter: 12,

  radius: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 10,
    xl: 12,
    full: 9999,
  },

  // Rugged mobile touch bounding box
  touchTargetMin: 48,
  buttonHeightPrimary: 52,
  buttonHeightSecondary: 48,
  headerHeight: 56,
  bottomBarHeight: 64,
};

export type Spacing = typeof spacing;
