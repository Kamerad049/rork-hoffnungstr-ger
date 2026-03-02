import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Map as MapIcon, X } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useContent } from '@/providers/ContentProvider';
import RestaurantCard from '@/components/RestaurantCard';
import type { Restaurant } from '@/constants/types';

const PRICE_FILTERS = [
  { label: 'Alle', value: null },
  { label: '€', value: 1 as const },
  { label: '€€', value: 2 as const },
  { label: '€€€', value: 3 as const },
];

export default function CuisineScreen() {
  const { colors } = useTheme();
  const { restaurants } = useContent();
  const router = useRouter();
  const [search, setSearch] = useState<string>('');
  const [selectedPrice, setSelectedPrice] = useState<1 | 2 | 3 | null>(null);

  const filtered = useMemo(() => {
    let result = restaurants;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.cuisine.some((c) => c.toLowerCase().includes(q)),
      );
    }
    if (selectedPrice) {
      result = result.filter((r) => r.priceRange === selectedPrice);
    }
    return result;
  }, [search, selectedPrice, restaurants]);

  const renderItem = useCallback(({ item }: { item: Restaurant }) => (
    <View style={styles.cardWrapper}>
      <RestaurantCard restaurant={item} />
    </View>
  ), []);

  const clearSearch = useCallback(() => setSearch(''), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Search size={18} color={colors.tertiaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder="Restaurant suchen..."
            placeholderTextColor={colors.tertiaryText}
            value={search}
            onChangeText={setSearch}
            testID="cuisine-search"
          />
          {search.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={18} color={colors.tertiaryText} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.mapBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/cuisine/map' as any)}
          testID="cuisine-map-btn"
        >
          <MapIcon size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {PRICE_FILTERS.map((f) => {
          const isActive = (f.value === null && !selectedPrice) || selectedPrice === f.value;
          return (
            <Pressable
              key={f.label}
              style={[
                styles.chip,
                { backgroundColor: isActive ? colors.accent : colors.surface },
              ]}
              onPress={() => setSelectedPrice(f.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? '#FFFFFF' : colors.secondaryText },
                ]}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
              Keine Restaurants gefunden
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 46,
  },
  mapBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    includeFontPadding: false,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardWrapper: {},
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
  },
});
