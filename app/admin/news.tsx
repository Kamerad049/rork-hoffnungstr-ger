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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Trash2, Plus, Edit3, X, ImageOff, Newspaper, ArrowLeft } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import type { NewsArticle } from '@/constants/types';
import { AdminImagePicker } from '@/components/AdminImagePicker';
import * as Haptics from 'expo-haptics';

export default function AdminNewsScreen() {
  const { colors } = useTheme();
  const { news, addNews, updateNews, deleteNews, deleteAllNews } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [author, setAuthor] = useState<string>('Redaktion');

  const resetForm = useCallback(() => {
    setTitle('');
    setText('');
    setImageUrls([]);
    setAuthor('Redaktion');
    setEditingId(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEdit = useCallback((article: NewsArticle) => {
    setEditingId(article.id);
    setTitle(article.title);
    setText(article.text);
    setImageUrls(article.image ? [article.image] : []);
    setAuthor(article.author);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim() || !text.trim()) {
      Alert.alert('Fehler', 'Titel und Text sind erforderlich.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (editingId) {
      updateNews(editingId, {
        title: title.trim(),
        text: text.trim(),
        image: imageUrls[0] || '',
        author: author.trim(),
      });
    } else {
      addNews({
        title: title.trim(),
        text: text.trim(),
        image: imageUrls[0] || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800',
        publishDate: new Date().toISOString().split('T')[0],
        author: author.trim() || 'Redaktion',
      });
    }
    setModalVisible(false);
    resetForm();
  }, [editingId, title, text, imageUrls, author, addNews, updateNews, resetForm]);

  const handleDelete = useCallback((id: string, itemTitle: string) => {
    Alert.alert('Löschen', `"${itemTitle}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteNews(id);
        },
      },
    ]);
  }, [deleteNews]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert('Alle löschen', 'Wirklich ALLE News löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Alle löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteAllNews();
        },
      },
    ]);
  }, [deleteAllNews]);

  const renderItem = useCallback(({ item }: { item: NewsArticle }) => (
    <View style={[styles.card, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: colors.surfaceSecondary }]}>
          <ImageOff size={24} color={colors.tertiaryText} />
          <Text style={[styles.placeholderText, { color: colors.tertiaryText }]}>Bild folgt in Kürze</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.tertiaryText }]}>
          {item.author} · {item.publishDate}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: 'rgba(191,163,93,0.12)' }]}
          onPress={() => openEdit(item)}
          hitSlop={8}
        >
          <Edit3 size={16} color={colors.accent} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: 'rgba(192,96,96,0.12)' }]}
          onPress={() => handleDelete(item.id, item.title)}
          hitSlop={8}
        >
          <Trash2 size={16} color={colors.red} />
        </Pressable>
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
          <Newspaper size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>News verwalten</Text>
        <Text style={styles.heroSubtitle}>
          Erstelle und verwalte Nachrichten für deine Nutzer.
        </Text>
      </LinearGradient>

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={openCreate}
        >
          <Plus size={18} color="#1c1c1e" />
          <Text style={styles.addBtnText}>Neu erstellen</Text>
        </Pressable>
        {news.length > 0 && (
          <Pressable
            style={[styles.deleteAllBtn, { borderColor: colors.red }]}
            onPress={handleDeleteAll}
          >
            <Trash2 size={14} color={colors.red} />
            <Text style={[styles.deleteAllText, { color: colors.red }]}>Alle</Text>
          </Pressable>
        )}
      </View>
    </>
  ), [insets.top, colors, news.length, openCreate, handleDeleteAll, router]);

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={news}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={news}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Newspaper size={48} color={colors.tertiaryText} />
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Keine News vorhanden</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); }}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                  {editingId ? 'News bearbeiten' : 'Neue News'}
                </Text>
                <Pressable onPress={() => { Keyboard.dismiss(); setModalVisible(false); resetForm(); }} hitSlop={10}>
                  <X size={22} color={colors.tertiaryText} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Titel</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Titel der News..."
                  placeholderTextColor={colors.tertiaryText}
                  onBlur={Keyboard.dismiss}
                />
                <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Text</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                  value={text}
                  onChangeText={setText}
                  placeholder="Nachrichtentext..."
                  placeholderTextColor={colors.tertiaryText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <AdminImagePicker
                  images={imageUrls}
                  onImagesChange={setImageUrls}
                  maxImages={3}
                  bucket="admin-uploads"
                  folder="news"
                  label="Titelbild"
                />
                <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Autor</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                  value={author}
                  onChangeText={setAuthor}
                  placeholder="Redaktion"
                  placeholderTextColor={colors.tertiaryText}
                />
                <View style={{ height: 20 }} />
              </ScrollView>
              <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingId ? 'Speichern' : 'Erstellen'}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  addBtnText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  deleteAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  deleteAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  list: {
    paddingBottom: 30,
  },
  card: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden' as const,
    marginHorizontal: 16,
  },
  cardImage: {
    height: 120,
    resizeMode: 'cover' as const,
  },
  placeholderImage: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  cardContent: {
    padding: 14,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  empty: {
    alignItems: 'center' as const,
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end' as const,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%' as const,
    paddingTop: 10,
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalBody: {
    paddingHorizontal: 20,
    flexGrow: 0,
  },
  modalBodyContent: {
    paddingBottom: 10,
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
    minHeight: 120,
  },
  preview: {
    height: 120,
    borderRadius: 12,
    marginTop: 10,
    resizeMode: 'cover' as const,
  },
  saveBtn: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center' as const,
  },
  saveBtnText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
