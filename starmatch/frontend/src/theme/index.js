export const colors = {
  bg:           '#0A0A0C',
  bgElevated:   '#111114',
  surface:      '#18181D',
  surfaceLight: '#222228',
  border:       'rgba(255, 255, 255, 0.08)',
  borderFocus:  'rgba(201, 169, 98, 0.55)',
  primary:      '#C9A962',
  primaryDark:  '#A88B45',
  primaryGlow:  'rgba(201, 169, 98, 0.12)',
  accent:       '#B87D8A',
  accentSoft:   'rgba(184, 125, 138, 0.15)',
  text:         '#F4F2EF',
  textSecondary:'#9B9BA3',
  textMuted:    '#5E5E68',
  overlay:      'rgba(0, 0, 0, 0.82)',
  success:      '#5EAD7E',
  error:        '#D46464',
  card:         '#1E1E24',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
};

export const typography = {
  brandSize:    28,
  titleSize:    24,
  subtitleSize: 15,
  bodySize:     16,
  captionSize:  13,
  labelSize:    11,
};

export const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth:     1,
  borderColor:     colors.border,
  borderRadius:    radius.md,
  paddingHorizontal: spacing.md,
  paddingVertical:   14,
  fontSize:          typography.bodySize,
  color:             colors.text,
};

export const buttonStyle = {
  backgroundColor: colors.primary,
  borderRadius:    radius.md,
  paddingVertical: 16,
  alignItems:      'center',
};

export const buttonTextStyle = {
  color:         colors.bg,
  fontSize:      15,
  fontWeight:    '700',
  letterSpacing: 0.8,
};
