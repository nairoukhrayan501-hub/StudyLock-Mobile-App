/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#0F172A',
    tint: '#2563EB',
    background: '#F8FAFC',
    foreground: '#0F172A',
    card: '#FFFFFF',
    cardForeground: '#0F172A',
    primary: '#2563EB',
    primaryForeground: '#FFFFFF',
    secondary: '#EAF0FF',
    secondaryForeground: '#1E3A8A',
    muted: '#E9EEF5',
    mutedForeground: '#64748B',
    accent: '#EAF1FF',
    accentForeground: '#1D4ED8',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    border: '#E2E8F0',
    input: '#E2E8F0',
    success: '#16A34A',
    successSoft: '#E8F7EE',
    danger: '#EF4444',
    warning: '#D97706',
    pink: '#DB2777',
    chartMuted: '#D8E2F0',
    timerTrack: '#E8EEF7',
    heroStart: '#1D4ED8',
    heroEnd: '#0F2551',
    heroForeground: '#FFFFFF',
    heroMuted: '#DBEAFE',
    heroOverlay: 'rgba(255,255,255,0.16)',
    heroProgress: '#7DD3FC',
    switchKnob: '#FFFFFF',
  },
  dark: {
    text: '#F8FAFC',
    tint: '#60A5FA',
    background: '#081426',
    foreground: '#F8FAFC',
    card: '#101F35',
    cardForeground: '#F8FAFC',
    primary: '#60A5FA',
    primaryForeground: '#0B1830',
    secondary: '#172B49',
    secondaryForeground: '#DBEAFE',
    muted: '#1B2B43',
    mutedForeground: '#9BAEC8',
    accent: '#152E4D',
    accentForeground: '#93C5FD',
    destructive: '#F87171',
    destructiveForeground: '#0F172A',
    border: '#263750',
    input: '#263750',
    success: '#4ADE80',
    successSoft: '#123A31',
    danger: '#F87171',
    warning: '#FBBF24',
    pink: '#F472B6',
    chartMuted: '#314562',
    timerTrack: '#21324A',
    heroStart: '#143C85',
    heroEnd: '#0B1A30',
    heroForeground: '#FFFFFF',
    heroMuted: '#C5D8F4',
    heroOverlay: 'rgba(255,255,255,0.12)',
    heroProgress: '#67E8F9',
    switchKnob: '#F8FAFC',
  },
  radius: 22,
};

export default colors;
