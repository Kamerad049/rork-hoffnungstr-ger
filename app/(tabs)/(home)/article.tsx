import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Calendar, User, Pencil, X, ImageOff } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useContent } from '@/providers/ContentProvider';
import { useCanEditContent } from '@/hooks/useCanEditContent';

import * as Haptics from 'expo-haptics';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const { news: adminNews, updateNews } = useContent();
  const canEdit = useCanEditContent();
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editText, setEditText] = useState<string>('');
  const [editImage, setEditImage] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');

  const article = useMemo(() => adminNews.find((a: any) => a.id === id), [id, adminNews]);

  const openEditModal = useCallback(() => {
    if (!article) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditTitle(article.title);
    setEditText(article.text);
    setEditImage(article.image);
    setEditAuthor(article.author);
    setEditModalVisible(true);
  }, [article]);

  const handleSaveEdit = useCallback(() => {
    if (!article) return;
    if (!editTitle.trim() || !editText.trim()) {
      Alert.alert('Fehler', 'Titel und Text sind erforderlich.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateNews(article.id, {
      title: editTitle.trim(),
      text: editText.trim(),
      image: editImage.trim(),
      author: editAuthor.trim(),
    });
    setEditModalVisible(false);
  }, [article, editTitle, editText, editImage, editAuthor, updateNews]);

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.primaryText }]}>Artikel nicht gefunden</Text>
      </View>
    );
  }

  const formattedDate = new Date(article.publishDate).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.imageWrapper} onPress={() => Keyboard.dismiss()}>
        {article.image && article.image.trim().length > 0 ? (
          <Image source={{ uri: article.image }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholderImage, { backgroundColor: colors.surfaceSecondary }]}> 
            <ImageOff size={40} color={colors.tertiaryText} />
            <Text style={[styles.placeholderText, { color: colors.tertiaryText }]}>Bild folgt in Kürze</Text>
          </View>
        )}
        {canEdit && (
          <Pressable style={styles.editBtn} onPress={openEditModal} hitSlop={8} testID="news-edit-btn">
            <Pencil size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </Pressable>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primaryText }]}>{article.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.tertiaryText} />
            <Text style={[styles.metaText, { color: colors.tertiaryText }]}>{formattedDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <User size={14} color={colors.tertiaryText} />
            <Text style={[styles.metaText, { color: colors.tertiaryText }]}>{article.author}</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: colors.secondaryText }]}>{article.text}</Text>
      </View>
    </ScrollView>

    <Modal visible={editModalVisible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); }}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>News bearbeiten</Text>
              <Pressable onPress={() => { Keyboard.dismiss(); setEditModalVisible(false); }} hitSlop={10}>
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
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Titel der News..."
                placeholderTextColor={colors.tertiaryText}
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Text</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editText}
                onChangeText={setEditText}
                placeholder="Nachrichtentext..."
                placeholderTextColor={colors.tertiaryText}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Bild-URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editImage}
                onChangeText={setEditImage}
                placeholder="https://..."
                placeholderTextColor={colors.tertiaryText}
                autoCapitalize="none"
              />
              <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Autor</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                value={editAuthor}
                onChangeText={setEditAuthor}
                placeholder="Redaktion"
                placeholderTextColor={colors.tertiaryText}
              />
              <View style={{ height: 20 }} />
            </ScrollView>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveEdit}>
              <Text style={styles.saveBtnText}>Speichern</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
    height: 240,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  editBtn: {
    position: 'absolute',
    top: 54,
    right: 16,
    backgroundColor: 'rgba(191,163,93,0.7)',
    borderRadius: 20,
    padding: 10,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 30,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center',
    marginBottom: 10,
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
