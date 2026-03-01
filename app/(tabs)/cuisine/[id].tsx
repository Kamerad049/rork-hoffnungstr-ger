import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { MapPin, Heart, ArrowLeft, Navigation, Pencil, X } from 'lucide-react-native';
import { Linking, Platform } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { useTargetReviews } from '@/providers/ReviewProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { useCanEditContent } from '@/hooks/useCanEditContent';

import StarRating from '@/components/StarRating';
import ReviewSection from '@/components/ReviewSection';
import * as Haptics from 'expo-haptics';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const router = useRouter();

  const { restaurants, updateRestaurant } = useAdmin();
  const canEdit = useCanEditContent();
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editImageUrl, setEditImageUrl] = useState<string>('');

  const restaurant = useMemo(() => restaurants.find((r: any) => r.id === id), [id, restaurants]);
  const { averageRating, count } = useTargetReviews(id ?? '', 'restaurant');
  const favorited = restaurant ? isFavorite(restaurant.id) : false;

  const handleDirections = useCallback(() => {
    if (!restaurant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { latitude, longitude, name } = restaurant;
    const label = encodeURIComponent(name);
    let url = '';
    if (Platform.OS === 'ios') {
      url = `maps:0,0?q=${label}@${latitude},${longitude}`;
    } else if (Platform.OS === 'android') {
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  }, [restaurant]);

  const openEditModal = useCallback(() => {
    if (!restaurant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditName(restaurant.name);
    setEditDescription(restaurant.description);
    setEditCity(restaurant.city);
    setEditImageUrl(restaurant.images[0] || '');
    setEditModalVisible(true);
  }, [restaurant]);

  const handleSaveEdit = useCallback(() => {
    if (!restaurant) return;
    if (!editName.trim() || !editCity.trim()) {
      Alert.alert('Fehler', 'Name und Stadt sind erforderlich.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateRestaurant(restaurant.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      city: editCity.trim(),
      images: editImageUrl.trim() ? [editImageUrl.trim()] : restaurant.images,
    });
    setEditModalVisible(false);
  }, [restaurant, editName, editDescription, editCity, editImageUrl, updateRestaurant]);

  const handleFavorite = useCallback(() => {
    if (!restaurant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(restaurant.id);
  }, [restaurant, toggleFavorite]);

  if (!restaurant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.primaryText }]}>Restaurant nicht gefunden</Text>
      </View>
    );
  }

  const priceLabel = '€'.repeat(restaurant.priceRange);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: restaurant.images[0] }} style={styles.image} contentFit="cover" />
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color="#BFA35D" />
          </Pressable>
          <View style={styles.topRightActions}>
            {canEdit && (
              <Pressable style={styles.editBtn} onPress={openEditModal} hitSlop={8} testID="restaurant-edit-btn">
                <Pencil size={18} color="#FFFFFF" />
              </Pressable>
            )}
            <Pressable style={styles.favBtn} onPress={handleFavorite} hitSlop={8}>
              <Heart
                size={22}
                color={favorited ? '#E05252' : '#FFFFFF'}
                fill={favorited ? '#E05252' : 'transparent'}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.primaryText }]}>{restaurant.name}</Text>
            <View style={[styles.priceBadge, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.priceText, { color: colors.accent }]}>{priceLabel}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={16} color={colors.accent} />
            <Text style={[styles.locationText, { color: colors.secondaryText }]}>
              {restaurant.city}, {restaurant.bundesland}
            </Text>
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={averageRating} size={16} />
            <Text style={[styles.ratingText, { color: colors.tertiaryText }]}>
              {count > 0 ? `${averageRating} · ${count} Bewertung${count !== 1 ? 'en' : ''}` : 'Noch keine Bewertungen'}
            </Text>
          </View>

          <View style={styles.cuisineRow}>
            {restaurant.cuisine.map((c) => (
              <View key={c} style={[styles.cuisineBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.cuisineText, { color: colors.accent }]}>{c}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.description, { color: colors.secondaryText }]}>
            {restaurant.description}
          </Text>

          <ReviewSection
            targetId={restaurant.id}
            targetType="restaurant"
            variant="brezel"
            renderAboveForm={() => (
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={handleDirections}
                >
                  <Navigation size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Wegbeschreibung</Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      </ScrollView>
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Restaurant bearbeiten</Text>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={10}>
                <X size={22} color={colors.tertiaryText} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name des Restaurants..."
                placeholderTextColor={colors.tertiaryText}
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Beschreibung</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Beschreibung..."
                placeholderTextColor={colors.tertiaryText}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Stadt</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editCity}
                onChangeText={setEditCity}
                placeholder="Stadt..."
                placeholderTextColor={colors.tertiaryText}
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Bild-URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editImageUrl}
                onChangeText={setEditImageUrl}
                placeholder="https://..."
                placeholderTextColor={colors.tertiaryText}
                autoCapitalize="none"
              />
            </ScrollView>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveEdit}>
              <Text style={styles.saveBtnText}>Speichern</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 280,
  },
  backBtn: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  topRightActions: {
    position: 'absolute',
    top: 54,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    backgroundColor: 'rgba(191,163,93,0.7)',
    borderRadius: 20,
    padding: 10,
  },
  favBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 10,
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    flex: 1,
    marginRight: 12,
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 15,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  ratingText: {
    fontSize: 13,
  },
  cuisineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  cuisineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cuisineText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalBody: {
    paddingHorizontal: 20,
    maxHeight: 450,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
  },
  saveBtn: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
