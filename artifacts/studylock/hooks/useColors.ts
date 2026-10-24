import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export type ColorScheme = 'light' | 'dark';

export function useColors(override?: ColorScheme) {
  const scheme = useColorScheme();
  const selected = override ?? (scheme === 'dark' ? 'dark' : 'light');
  const palette = selected === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, scheme: selected };
}
