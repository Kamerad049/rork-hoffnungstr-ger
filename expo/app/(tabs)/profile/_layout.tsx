import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProfileLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '700' as const },
      }}
    >
      <Stack.Screen name="index" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="settings" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="edit" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="friends" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="messages" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="chats" options={{ title: 'Nachrichten' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat' }} />
      <Stack.Screen name="privacy" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="saved" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="ordenshalle" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="datenschutz" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="impressum" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="support" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
      <Stack.Screen name="avatar-generator" options={{ title: '', headerShown: true, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTintColor: '#E8DCC8' }} />
    </Stack>
  );
}
