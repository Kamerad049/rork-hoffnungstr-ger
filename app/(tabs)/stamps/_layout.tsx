import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function StampsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '700' as const },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="checkin" options={{ title: 'Einchecken', headerBackTitle: ' ', }} />
    </Stack>
  );
}
