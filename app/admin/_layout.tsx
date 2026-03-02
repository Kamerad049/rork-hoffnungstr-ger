import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AdminProvider } from '@/providers/AdminProvider';
import { ModerationProvider } from '@/providers/ModerationProvider';

export default function AdminLayout() {
  const { colors } = useTheme();
  const router = useRouter();

  const subPageOptions = {
    headerStyle: { backgroundColor: '#141416' },
    headerTintColor: '#E8DCC8',
    headerTitleStyle: { fontWeight: '700' as const, color: '#E8DCC8' },
    headerShadowVisible: false,
    headerBackTitle: 'Zurück',
    headerLeft: () => (
      <Pressable
        onPress={() => router.back()}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: '#1e1e20',
          borderWidth: 1,
          borderColor: 'rgba(191,163,93,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <ArrowLeft size={18} color="#BFA35D" />
      </Pressable>
    ),
  };

  return (
    <AdminProvider>
    <ModerationProvider>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#141416' },
        headerTintColor: '#E8DCC8',
        headerTitleStyle: { fontWeight: '700' as const, color: '#E8DCC8' },
        headerShadowVisible: false,
        headerBackTitle: 'Zurück',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <Stack.Screen name="news" options={{ title: 'News verwalten', ...subPageOptions }} />
      <Stack.Screen name="places" options={{ title: 'Orte verwalten', ...subPageOptions }} />
      <Stack.Screen name="restaurants" options={{ title: 'Restaurants verwalten', ...subPageOptions }} />
      <Stack.Screen name="posts" options={{ title: 'Beiträge verwalten', ...subPageOptions }} />
      <Stack.Screen name="users" options={{ title: 'Nutzer verwalten', ...subPageOptions }} />
      <Stack.Screen name="push" options={{ title: 'Push-Nachricht senden', ...subPageOptions }} />
      <Stack.Screen name="push-history" options={{ title: 'Push-Verlauf', ...subPageOptions }} />
      <Stack.Screen name="push-detail" options={{ title: 'Empfangsbestätigung', ...subPageOptions }} />
      <Stack.Screen name="reports" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="moderators" options={{ title: 'Moderatoren', ...subPageOptions }} />
      <Stack.Screen name="submissions" options={{ title: 'Einsendungen', ...subPageOptions }} />
    </Stack>
    </ModerationProvider>
    </AdminProvider>
  );
}
