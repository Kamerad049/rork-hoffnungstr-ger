import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import OptimizedImage from '@/components/OptimizedImage';
import { MapPin, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/hooks/useFavorites';
import StarRating from './StarRating';
import { useTargetReviews } from '@/hooks/useReviews';
import type { Restaurant } from '@/constants/types';
import * as Haptics from 'expo-haptics';

interface RestaurantCardProps {
  restaurant: Restaurant;
  compact?: boolean;
}

function getPriceLabel(price: 1 | 2 | 3): string {
  return '€'.repeat(price);
}

export default React.memo(function RestaurantCard({ restaurant, compact = false }: RestaurantCardProps) {
  const { colors } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const router = useRouter();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const favorited = isFavorite(restaurant.id);
  const { averageRating, count } = useTargetReviews(restaurant.id, 'restaurant');

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    router.push(`/cuisine/${restaurant.id}` as any);
  }, [restaurant.id, router, scaleAnim]);

  const handleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(restaurant.id);
  }, [restaurant.id, toggleFavorite]);

  if (compact) {
    return (
      <Pressable onPress={handlePress} testID={`restaurant-card-compact-${restaurant.id}`}>
        <Animated.View style={[styles.compactCard, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
          <OptimizedImage source={{ uri: restaurant.images[0] }} style={styles.compactImage} contentFit="cover" variant="warm" />
          <View style={styles.compactInfo}>
            <Text style={[styles.compactTitle, { color: colors.primaryText }]} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <View style={styles.locationRow}>
              <Text style={[styles.compactCity, { color: colors.secondaryText }]} numberOfLines={1}>
                {restaurant.plz ? `${restaurant.plz} ${restaurant.city}` : restaurant.city} · {getPriceLabel(restaurant.priceRange)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} testID={`restaurant-card-${restaurant.id}`}>
      <Animated.View style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.imageWrapper}>
          <OptimizedImage source={{ uri: restaurant.images[0] }} style={styles.image} contentFit="cover" variant="warm" />
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{getPriceLabel(restaurant.priceRange)}</Text>
          </View>
          <Pressable onPress={handleFavorite} style={styles.favoriteBtn} hitSlop={8}>
            <Heart
              size={20}
              color={favorited ? '#E05252' : '#FFFFFF'}
              fill={favorited ? '#E05252' : 'transparent'}
            />
          </Pressable>
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.locationRow}>
            <MapPin size={13} color={colors.secondaryText} />
            <Text style={[styles.city, { color: colors.secondaryText }]}>
              {restaurant.plz ? `${restaurant.plz} ${restaurant.city}` : restaurant.city}, {restaurant.bundesland}
            </Text>
          </View>
          <View style={styles.cuisineRow}>
            {restaurant.cuisine.slice(0, 2).map((c) => (
              <View key={c} style={[styles.cuisineBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.cuisineText, { color: colors.accent }]}>{c}</Text>
              </View>
            ))}
          </View>
          <View style={styles.ratingRow}>
            <StarRating rating={averageRating} size={13} />
            <Text style={[styles.ratingText, { color: colors.tertiaryText }]}>
              {count > 0 ? `${averageRating} (${count})` : 'Noch keine Bewertungen'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(28,28,30,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  info: {
    padding: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  city: {
    fontSize: 13,
  },
  cuisineRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  cuisineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cuisineText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
  },
  compactCard: {
    width: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  compactImage: {
    width: 160,
    height: 110,
  },
  compactInfo: {
    padding: 10,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  compactCity: {
    fontSize: 11,
  },
});
