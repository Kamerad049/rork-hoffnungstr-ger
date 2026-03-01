import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Trash2, Plus, Edit3, X, MapPin, ArrowLeft } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import type { Place, PlaceCategory } from '@/constants/types';
import { PLACE_CATEGORIES, BUNDESLAENDER } from '@/constants/types';
import * as Haptics from 'expo-haptics';

export default function AdminPlacesScreen() {
  const { colors } = useTheme();
  const { places, addPlace, updatePlace, deletePlace, deleteAllPlaces } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [bundesland, setBundesland] = useState<string>('Bayern');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [category, setCategory] = useState<PlaceCategory>('Denkmal');

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setCity('');
    setBundesland('Bayern');
    setImageUrl('');
    setCategory('Denkmal');
    setEditingId(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEdit = useCallback((place: Place) => {
    setEditingId(place.id);
    setTitle(place.title);
    setDescription(place.description);
    setCity(place.city);
    setBundesland(place.bundesland);
    setImageUrl(place.images[0] || '');
    setCategory(place.category);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim() || !city.trim()) {
      Alert.alert('Fehler', 'Titel und Stadt sind erforderlich.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (editingId) {
      updatePlace(editingId, {
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        bundesland,
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        category,
      });
    } else {
      addPlace({
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        bundesland,
        images: imageUrl.trim() ? [imageUrl.trim()] : ['https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800'],
        category,
        latitude: 51.1657,
        longitude: 10.4515,
        rating: 0,
        reviewCount: 0,
      });
    }
    setModalVisible(false);
    resetForm();
  }, [editingId, title, description, city, bundesland, imageUrl, category, addPlace, updatePlace, resetForm]);

  const handleDelete = useCallback((id: string, itemTitle: string) => {
    Alert.alert('Löschen', `"${itemTitle}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deletePlace(id);
        },
      },
    ]);
  }, [deletePlace]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert('Alle löschen', 'Wirklich ALLE Orte löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Alle löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteAllPlaces();
        },
      },
    ]);
  }, [deleteAllPlaces]);

  const renderItem = useCallback(({ item }: { item: Place }) => (
    <View style={[styles.card, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}>
      <View style={styles.cardRow}>
        {item.images[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <MapPin size={20} color={colors.tertiaryText} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.tertiaryText }]}>{item.city} · {item.category}</Text>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: 'rgba(191,163,93,0.12)' }]}
            onPress={() => openEdit(item)}
            hitSlop={8}
          >
            <Edit3 size={14} color={colors.accent} />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: 'rgba(192,96,96,0.12)' }]}
            onPress={() => handleDelete(item.id, item.title)}
            hitSlop={8}
          >
            <Trash2 size={14} color={colors.red} />
          </Pressable>
        </View>
      </View>
    </View>
  ), [colors, openEdit, handleDelete]);

  const listHeader = useCallback(() => (
    <>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.heroPattern}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.heroLine,
                {
                  top: 20 + i * 28,
                  opacity: 0.03 + i * 0.005,
                  transform: [{ rotate: '-12deg' }],
                },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={18} color="#BFA35D" />
        </Pressable>
        <View style={styles.heroIconWrap}>
          <MapPin size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Orte verwalten</Text>
        <Text style={styles.heroSubtitle}>
          Erstelle und verwalte sehenswerte Orte.
        </Text>
      </LinearGradient>

      <View style={styles.toolbar}>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={openCreate}>
          <Plus size={18} color="#1c1c1e" />
          <Text style={styles.addBtnText}>Neuer Ort</Text>
        </Pressable>
        {places.length > 0 && (
          <Pressable style={[styles.deleteAllBtn, { borderColor: colors.red }]} onPress={handleDeleteAll}>
            <Trash2 size={14} color={colors.red} />
            <Text style={[styles.deleteAllText, { color: colors.red }]}>Alle</Text>
          </Pressable>
        )}
      </View>
    </>
  ), [insets.top, colors, places.length, openCreate, handleDeleteAll, router]);

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MapPin size={48} color={colors.tertiaryText} />
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Keine Orte vorhanden</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                {editingId ? 'Ort bearbeiten' : 'Neuer Ort'}
              </Text>
              <Pressable onPress={() => { setModalVisible(false); resetForm(); }} hitSlop={10}>
                <X size={22} color={colors.tertiaryText} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Titel</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Name des Ortes..."
                placeholderTextColor={colors.tertiaryText}
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Beschreibung</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Beschreibung..."
                placeholderTextColor={colors.tertiaryText}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Stadt</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={city}
                onChangeText={setCity}
                placeholder="Stadt..."
                placeholderTextColor={colors.tertiaryText}
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Kategorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PLACE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, category === cat ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: category === cat ? '#1c1c1e' : colors.primaryText }]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Bild-URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                placeholderTextColor={colors.tertiaryText}
                autoCapitalize="none"
              />
              {imageUrl.trim().length > 0 && (
                <Image source={{ uri: imageUrl }} style={styles.preview} />
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingId ? 'Speichern' : 'Erstellen'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  heroPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
    marginLeft: 4,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  toolbar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: { color: '#1c1c1e', fontSize: 15, fontWeight: '700' as const },
  deleteAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  deleteAllText: { fontSize: 13, fontWeight: '600' as const },
  list: { paddingBottom: 30 },
  card: { borderRadius: 14, marginBottom: 8, padding: 12, marginHorizontal: 16 },
  cardRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardActions: { flexDirection: 'row' as const, gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  empty: { alignItems: 'center' as const, paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' as const, paddingTop: 10 },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center' as const,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const },
  modalBody: { paddingHorizontal: 20, maxHeight: 450 },
  inputLabel: { fontSize: 12, fontWeight: '600' as const, marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 100 },
  chipRow: { marginTop: 4, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600' as const },
  preview: { height: 120, borderRadius: 12, marginTop: 10, resizeMode: 'cover' as const },
  saveBtn: { margin: 20, paddingVertical: 14, borderRadius: 14, alignItems: 'center' as const },
  saveBtnText: { color: '#1c1c1e', fontSize: 16, fontWeight: '700' as const },
});
