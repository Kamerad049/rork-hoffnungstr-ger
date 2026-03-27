import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function HomeLayout() {
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
      <Stack.Screen name="article" options={{ title: 'Artikel' }} />
      <Stack.Screen name="activity" options={{ title: 'Aktivitäten' }} />
    </Stack>
  );
}
