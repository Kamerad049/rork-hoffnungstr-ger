import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Map as MapIcon, X } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useContent } from '@/hooks/useContent';
import { PLACE_CATEGORIES } from '@/constants/types';
import PlaceCard from '@/components/PlaceCard';
import type { Place, PlaceCategory } from '@/constants/types';

export default function PlacesScreen() {
  const { colors } = useTheme();
  const { places } = useContent();
  const router = useRouter();
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | null>(null);

  const filtered = useMemo(() => {
    let result = places;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.bundesland.toLowerCase().includes(q),
      );
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    return result;
  }, [search, selectedCategory, places]);

  const renderItem = useCallback(({ item }: { item: Place }) => (
    <View style={styles.cardWrapper}>
      <PlaceCard place={item} />
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
            placeholder="Ort suchen..."
            placeholderTextColor={colors.tertiaryText}
            value={search}
            onChangeText={setSearch}
            testID="places-search"
          />
          {search.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={18} color={colors.tertiaryText} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.mapBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/places/map' as any)}
          testID="places-map-btn"
        >
          <MapIcon size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          style={[
            styles.chip,
            { backgroundColor: !selectedCategory ? colors.accent : colors.surface },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, { color: !selectedCategory ? '#FFFFFF' : colors.secondaryText }]}>
            Alle
          </Text>
        </Pressable>
        {PLACE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.chip,
              { backgroundColor: selectedCategory === cat ? colors.accent : colors.surface },
            ]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Text style={[styles.chipText, { color: selectedCategory === cat ? '#FFFFFF' : colors.secondaryText }]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
              Keine Orte gefunden
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
  chipScroll: {
    minHeight: 52,
    maxHeight: 52,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center' as const,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
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
