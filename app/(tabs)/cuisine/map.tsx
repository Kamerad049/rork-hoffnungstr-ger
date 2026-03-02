import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useContent } from '@/hooks/useContent';

let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch {
  MapView = null;
  Marker = null;
}

const GERMANY_CENTER = {
  latitude: 51.1657,
  longitude: 10.4515,
  latitudeDelta: 7,
  longitudeDelta: 7,
};

export default function CuisineMapScreen() {
  const { colors } = useTheme();
  const { restaurants } = useContent();
  const router = useRouter();

  const markers = useMemo(
    () =>
      restaurants.map((r: any) => ({
        id: r.id,
        title: r.name,
        description: `${r.city} · ${'€'.repeat(r.priceRange)}`,
        latitude: r.latitude,
        longitude: r.longitude,
      })),
    [restaurants],
  );

  if (!MapView || Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background }]}>
        <Text style={[styles.fallbackTitle, { color: colors.primaryText }]}>Kartenansicht</Text>
        <Text style={[styles.fallbackText, { color: colors.secondaryText }]}>
          Die Karte ist nur in der nativen App verfügbar.
        </Text>
        {restaurants.map((r: any) => (
          <Text key={r.id} style={[styles.listItem, { color: colors.secondaryText }]}>
            🍽️ {r.name} — {r.city}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={GERMANY_CENTER}>
        {Marker && markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
            onCalloutPress={() => router.push(`/cuisine/${m.id}` as any)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    marginBottom: 16,
  },
  listItem: {
    fontSize: 14,
    paddingVertical: 6,
  },
});
