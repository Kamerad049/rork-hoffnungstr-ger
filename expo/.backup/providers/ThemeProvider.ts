import { useColorScheme } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import Colors from '@/constants/colors';
import type { ThemeColors } from '@/constants/colors';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors: ThemeColors = isDark ? Colors.dark : Colors.light;
  return { colors, isDark };
});
