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
import { Trash2, Plus, Edit3, X, UtensilsCrossed, ArrowLeft } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import type { Restaurant } from '@/constants/types';
import * as Haptics from 'expo-haptics';

export default function AdminRestaurantsScreen() {
  const { colors } = useTheme();
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant, deleteAllRestaurants } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [cuisineText, setCuisineText] = useState<string>('');
  const [priceRange, setPriceRange] = useState<1 | 2 | 3>(2);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setCity('');
    setImageUrl('');
    setCuisineText('');
    setPriceRange(2);
    setEditingId(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEdit = useCallback((r: Restaurant) => {
    setEditingId(r.id);
    setName(r.name);
    setDescription(r.description);
    setCity(r.city);
    setImageUrl(r.images[0] || '');
    setCuisineText(r.cuisine.join(', '));
    setPriceRange(r.priceRange);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim() || !city.trim()) {
      Alert.alert('Fehler', 'Name und Stadt sind erforderlich.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cuisine = cuisineText.split(',').map((c) => c.trim()).filter(Boolean);
    if (editingId) {
      updateRestaurant(editingId, {
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        cuisine,
        priceRange,
      });
    } else {
      addRestaurant({
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        bundesland: 'Bayern',
        images: imageUrl.trim() ? [imageUrl.trim()] : ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'],
        cuisine,
        priceRange,
        latitude: 51.1657,
        longitude: 10.4515,
        rating: 0,
        reviewCount: 0,
      });
    }
    setModalVisible(false);
    resetForm();
  }, [editingId, name, description, city, imageUrl, cuisineText, priceRange, addRestaurant, updateRestaurant, resetForm]);

  const handleDelete = useCallback((id: string, itemName: string) => {
    Alert.alert('Löschen', `"${itemName}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteRestaurant(id);
        },
      },
    ]);
  }, [deleteRestaurant]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert('Alle löschen', 'Wirklich ALLE Restaurants löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Alle löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteAllRestaurants();
        },
      },
    ]);
  }, [deleteAllRestaurants]);

  const renderItem = useCallback(({ item }: { item: Restaurant }) => (
    <View style={[styles.card, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}>
      <View style={styles.cardRow}>
        {item.images[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <UtensilsCrossed size={20} color={colors.tertiaryText} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardMeta, { color: colors.tertiaryText }]}>
            {item.city} · {'€'.repeat(item.priceRange)}
          </Text>
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
            onPress={() => handleDelete(item.id, item.name)}
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
          <UtensilsCrossed size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Restaurants verwalten</Text>
        <Text style={styles.heroSubtitle}>
          Erstelle und verwalte Restaurants und Gasthäuser.
        </Text>
      </LinearGradient>

      <View style={styles.toolbar}>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={openCreate}>
          <Plus size={18} color="#1c1c1e" />
          <Text style={styles.addBtnText}>Neues Restaurant</Text>
        </Pressable>
        {restaurants.length > 0 && (
          <Pressable style={[styles.deleteAllBtn, { borderColor: colors.red }]} onPress={handleDeleteAll}>
            <Trash2 size={14} color={colors.red} />
            <Text style={[styles.deleteAllText, { color: colors.red }]}>Alle</Text>
          </Pressable>
        )}
      </View>
    </>
  ), [insets.top, colors, restaurants.length, openCreate, handleDeleteAll, router]);

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <UtensilsCrossed size={48} color={colors.tertiaryText} />
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Keine Restaurants vorhanden</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                {editingId ? 'Restaurant bearbeiten' : 'Neues Restaurant'}
              </Text>
              <Pressable onPress={() => { setModalVisible(false); resetForm(); }} hitSlop={10}>
                <X size={22} color={colors.tertiaryText} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Restaurant Name..."
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
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Preisklasse</Text>
              <View style={styles.priceRow}>
                {([1, 2, 3] as const).map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.priceChip, priceRange === p ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => setPriceRange(p)}
                  >
                    <Text style={[styles.priceText, { color: priceRange === p ? '#1c1c1e' : colors.primaryText }]}>
                      {'€'.repeat(p)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Küche (kommagetrennt)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={cuisineText}
                onChangeText={setCuisineText}
                placeholder="Bayerisch, Schweinshaxe, Bier..."
                placeholderTextColor={colors.tertiaryText}
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Bild-URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                placeholderTextColor={colors.tertiaryText}
                autoCapitalize="none"
              />
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
  priceRow: { flexDirection: 'row' as const, gap: 10, marginTop: 4 },
  priceChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  priceText: { fontSize: 15, fontWeight: '700' as const },
  saveBtn: { margin: 20, paddingVertical: 14, borderRadius: 14, alignItems: 'center' as const },
  saveBtnText: { color: '#1c1c1e', fontSize: 16, fontWeight: '700' as const },
});
