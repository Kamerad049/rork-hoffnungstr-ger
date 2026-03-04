import { Stack } from 'expo-router';
import { LobbyEngineProvider } from '@/providers/LobbyEngine';
import { ShadowCardsProvider } from '@/providers/ShadowCardsEngine';
import { ConnectFourProvider } from '@/providers/ConnectFourEngine';

export default function SpieleLayout() {
  return (
    <LobbyEngineProvider>
      <ShadowCardsProvider>
        <ConnectFourProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="create-room" />
            <Stack.Screen name="lobby" />
            <Stack.Screen name="shadow-cards" />
            <Stack.Screen name="connect-four" />
          </Stack>
        </ConnectFourProvider>
      </ShadowCardsProvider>
    </LobbyEngineProvider>
  );
}
