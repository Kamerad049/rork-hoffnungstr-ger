import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { MapPin, Heart, Navigation, ArrowLeft, Route, Stamp, Pencil, X } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { useStampPass } from '@/providers/StampPassProvider';
import { useTargetReviews } from '@/providers/ReviewProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { useCanEditContent } from '@/hooks/useCanEditContent';

import { PLACE_CATEGORIES } from '@/constants/types';
import type { PlaceCategory } from '@/constants/types';
import StarRating from '@/components/StarRating';
import ReviewSection from '@/components/ReviewSection';
import * as Haptics from 'expo-haptics';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { hasStamp } = useStampPass();
  const router = useRouter();

  const { places: adminPlaces, updatePlace } = useAdmin();
  const canEdit = useCanEditContent();
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editCategory, setEditCategory] = useState<PlaceCategory>('Denkmal');
  const [editImageUrl, setEditImageUrl] = useState<string>('');

  const place = useMemo(() => adminPlaces.find((p: any) => p.id === id), [id, adminPlaces]);
  const { averageRating, count } = useTargetReviews(id ?? '', 'place');
  const scrollRef = useRef<ScrollView>(null);
  const reviewSectionY = useRef<number>(0);

  const favorited = place ? isFavorite(place.id) : false;
  const stamped = place ? hasStamp(place.id) : false;

  const openEditModal = useCallback(() => {
    if (!place) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditTitle(place.title);
    setEditDescription(place.description);
    setEditCity(place.city);
    setEditCategory(place.category);
    setEditImageUrl(place.images[0] || '');
    setEditModalVisible(true);
  }, [place]);

  const handleSaveEdit = useCallback(() => {
    if (!place) return;
    if (!editTitle.trim() || !editCity.trim()) {
      Alert.alert('Fehler', 'Titel und Stadt sind erforderlich.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updatePlace(place.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      city: editCity.trim(),
      category: editCategory,
      images: editImageUrl.trim() ? [editImageUrl.trim()] : place.images,
    });
    setEditModalVisible(false);
  }, [place, editTitle, editDescription, editCity, editCategory, editImageUrl, updatePlace]);

  const handleFavorite = useCallback(() => {
    if (!place) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(place.id);
  }, [place, toggleFavorite]);

  const handleCheckin = useCallback(() => {
    if (!place) return;
    router.push({ pathname: '/stamps/checkin' as any, params: { placeId: place.id } });
  }, [place, router]);

  const handleScrollToReviews = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollTo({ y: reviewSectionY.current, animated: true });
  }, []);

  const handleDirections = useCallback(() => {
    if (!place) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { latitude, longitude, title } = place;
    const encodedTitle = encodeURIComponent(title);
    let url = '';
    if (Platform.OS === 'ios') {
      url = `maps:0,0?q=${encodedTitle}&ll=${latitude},${longitude}`;
    } else if (Platform.OS === 'android') {
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedTitle})`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
    Linking.openURL(url);
  }, [place]);

  if (!place) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.primaryText }]}>Ort nicht gefunden</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: place.images[0] }} style={styles.image} contentFit="cover" />
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color="#BFA35D" />
          </Pressable>
          <View style={styles.topRightActions}>
            {canEdit && (
              <Pressable style={styles.editBtn} onPress={openEditModal} hitSlop={8} testID="place-edit-btn">
                <Pencil size={18} color="#FFFFFF" />
              </Pressable>
            )}
            <Pressable style={styles.favBtnInline} onPress={handleFavorite} hitSlop={8}>
              <Heart
                size={22}
                color={favorited ? '#E05252' : '#FFFFFF'}
                fill={favorited ? '#E05252' : 'transparent'}
              />
            </Pressable>
          </View>
          <View style={styles.imageOverlay}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{place.category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.primaryText }]}>{place.title}</Text>

          <View style={styles.locationRow}>
            <MapPin size={16} color={colors.accent} />
            <Text style={[styles.locationText, { color: colors.secondaryText }]}>
              {place.city}, {place.bundesland}
            </Text>
          </View>

          <Pressable style={styles.ratingRow} onPress={handleScrollToReviews}>
            <StarRating rating={averageRating} size={16} variant="monument" />
            <Text style={[styles.ratingText, { color: colors.tertiaryText }]}>
              {count > 0 ? `${averageRating} · ${count} Bewertung${count !== 1 ? 'en' : ''}` : 'Noch keine Bewertungen'}
            </Text>
          </Pressable>

          {stamped && (
            <View style={[styles.stampedBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.stampedText, { color: colors.success }]}>
                ✓ Stempel gesammelt
              </Text>
            </View>
          )}

          <Text style={[styles.description, { color: colors.secondaryText }]}>
            {place.description}
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.directionsBtn, { borderColor: colors.accent }]}
              onPress={handleDirections}
              testID="place-directions-btn"
            >
              <Route size={18} color={colors.accent} />
              <Text style={[styles.directionsBtnText, { color: colors.accent }]}>Wegbeschreibung</Text>
            </Pressable>
            {!stamped && (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                onPress={handleCheckin}
                testID="place-checkin-btn"
              >
                <Stamp size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Einchecken</Text>
              </Pressable>
            )}
          </View>

          <View
            onLayout={(e) => { reviewSectionY.current = e.nativeEvent.layout.y; }}
          >
            <ReviewSection targetId={place.id} targetType="place" variant="monument" />
          </View>
        </View>
      </ScrollView>
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Ort bearbeiten</Text>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={10}>
                <X size={22} color={colors.tertiaryText} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Titel</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Name des Ortes..."
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
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Kategorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PLACE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, editCategory === cat ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: editCategory === cat ? '#1c1c1e' : colors.primaryText }]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
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
    height: 300,
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
  favBtnInline: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 10,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  categoryTag: {
    backgroundColor: 'rgba(28,28,30,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryTagText: {
    color: '#E8DCC8',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    marginBottom: 10,
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
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 13,
  },
  stampedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  stampedText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  directionsBtnText: {
    fontSize: 16,
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
  chipRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
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
