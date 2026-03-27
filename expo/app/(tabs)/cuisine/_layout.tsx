import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function CuisineLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '700' as const },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Deutsche Küche' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="map" options={{ title: 'Karte' }} />
    </Stack>
  );
}
