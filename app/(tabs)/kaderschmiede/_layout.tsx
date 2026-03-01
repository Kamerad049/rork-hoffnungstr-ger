import { Stack } from 'expo-router';

export default function KaderschmiedeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="map" />
      <Stack.Screen name="trupps" />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="trupp-detail" />
      <Stack.Screen name="activity-detail" />
      <Stack.Screen name="challenge-detail" />
      <Stack.Screen name="create-trupp" />
      <Stack.Screen name="create-activity" />
      <Stack.Screen name="create-challenge" />
      <Stack.Screen name="checkin" />
    </Stack>
  );
}
