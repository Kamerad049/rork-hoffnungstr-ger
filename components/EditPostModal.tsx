import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { X, Check, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePosts } from '@/providers/PostsProvider';
import type { FeedPost } from '@/constants/types';

const GOLD = '#BFA35D';
const MAX_LENGTH = 2000;

interface EditPostModalProps {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
}

export default function EditPostModal({ visible, post, onClose }: EditPostModalProps) {
  const { editPost } = usePosts();
  const [content, setContent] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible && post) {
      setContent(post.content);
      setLocation(post.location ?? '');
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }),
      ]).start();
    }
  }, [visible, post, fadeAnim, slideAnim]);

  const handleSave = useCallback(async () => {
    if (!post || saving) return;
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      Alert.alert('Fehler', 'Der Beitrag darf nicht leer sein.');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await editPost(post.id, trimmed, location.trim() || undefined);
      console.log('[EDIT] Post updated:', post.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      console.log('[EDIT] Error:', err);
      Alert.alert('Fehler', 'Beitrag konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }, [post, content, location, saving, editPost, onClose]);

  const handleClose = useCallback(() => {
    if (!post) {
      onClose();
      return;
    }
    const changed = content.trim() !== post.content || (location.trim() || '') !== (post.location ?? '');
    if (changed) {
      Alert.alert('Verwerfen?', 'Deine Änderungen gehen verloren.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  }, [post, content, location, onClose]);

  if (!post) return null;

  const hasChanges = content.trim() !== post.content || (location.trim() || '') !== (post.location ?? '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Animated.View style={[styles.backdropInner, { opacity: fadeAnim }]} />
      </Pressable>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable style={styles.headerBtn} onPress={handleClose} hitSlop={12}>
              <X size={20} color="#8E8E93" />
            </Pressable>
            <Text style={styles.headerTitle}>Beitrag bearbeiten</Text>
            <Pressable
              style={[styles.saveBtn, hasChanges && !saving && styles.saveBtnActive]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
              hitSlop={12}
            >
              <Check size={18} color={hasChanges && !saving ? '#0f0e0b' : '#636366'} />
              <Text style={[styles.saveBtnText, hasChanges && !saving && styles.saveBtnTextActive]}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.handle} />

          <View style={styles.body}>
            <TextInput
              style={styles.textInput}
              placeholder="Beitragstext..."
              placeholderTextColor="rgba(142,142,147,0.5)"
              multiline
              maxLength={MAX_LENGTH}
              value={content}
              onChangeText={setContent}
              autoFocus
              testID="edit-post-input"
            />
            {content.length > 100 && (
              <Text style={styles.charCount}>{content.length}/{MAX_LENGTH}</Text>
            )}

            <View style={styles.locationRow}>
              <MapPin size={14} color={GOLD} />
              <TextInput
                style={styles.locationInput}
                placeholder="Ort hinzufügen..."
                placeholderTextColor="rgba(142,142,147,0.4)"
                value={location}
                onChangeText={setLocation}
                testID="edit-post-location"
              />
              {location.length > 0 && (
                <Pressable onPress={() => setLocation('')} hitSlop={8}>
                  <X size={14} color="rgba(191,163,93,0.6)" />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1917',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    minHeight: 280,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(142,142,147,0.3)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(142,142,147,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#E8DCC8',
    letterSpacing: 0.2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(142,142,147,0.12)',
  },
  saveBtnActive: {
    backgroundColor: GOLD,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#636366',
  },
  saveBtnTextActive: {
    color: '#0f0e0b',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#E8DCC8',
    minHeight: 120,
    maxHeight: 260,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(142,142,147,0.5)',
    textAlign: 'right',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: '#E8DCC8',
    padding: 0,
  },
});
