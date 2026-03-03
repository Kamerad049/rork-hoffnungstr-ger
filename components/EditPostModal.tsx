import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import { X, Check, MapPin, UserPlus, Hash, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePosts } from '@/providers/PostsProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { getUserById } from '@/lib/utils';
import type { FeedPost, SocialUser } from '@/constants/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '@/providers/AlertProvider';

const GOLD = '#BFA35D';
const MAX_LENGTH = 2000;

interface EditPostModalProps {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
}

type EditTab = 'text' | 'location' | 'people' | 'tags';

export default function EditPostModal({ visible, post, onClose }: EditPostModalProps) {
  const { editPost } = usePosts();
  const { friendUsers } = useFriends();
  const { showAlert } = useAlert();
  const [content, setContent] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>('');
  const [tagSearch, setTagSearch] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<EditTab>('text');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible && post) {
      setContent(post.content);
      setLocation(post.location ?? '');
      setTaggedUserIds(post.taggedUserIds ?? []);
      setTags(post.tags ?? []);
      setNewTag('');
      setTagSearch('');
      setActiveTab('text');
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }),
      ]).start();
    }
  }, [visible, post, fadeAnim, slideAnim]);

  const taggedUsers = useMemo(() => {
    return taggedUserIds
      .map((id) => getUserById(id))
      .filter((u): u is SocialUser => u !== null && u !== undefined);
  }, [taggedUserIds]);

  const filteredFriends = useMemo(() => {
    const alreadyTagged = new Set(taggedUserIds);
    const available = friendUsers.filter((u) => !alreadyTagged.has(u.id));
    if (!tagSearch.trim()) return available;
    const q = tagSearch.toLowerCase();
    return available.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [friendUsers, taggedUserIds, tagSearch]);

  const handleSave = useCallback(async () => {
    if (!post || saving) return;
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      showAlert('Fehler', 'Der Beitrag darf nicht leer sein.');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await editPost(
        post.id,
        trimmed,
        location.trim() || undefined,
        taggedUserIds,
        tags,
      );
      console.log('[EDIT] Post updated:', post.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      console.log('[EDIT] Error:', err);
      showAlert('Fehler', 'Beitrag konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }, [post, content, location, taggedUserIds, tags, saving, editPost, onClose]);

  const handleClose = useCallback(() => {
    if (!post) {
      onClose();
      return;
    }
    const contentChanged = content.trim() !== post.content;
    const locationChanged = (location.trim() || '') !== (post.location ?? '');
    const tagsChanged = JSON.stringify(tags) !== JSON.stringify(post.tags ?? []);
    const taggedChanged = JSON.stringify(taggedUserIds) !== JSON.stringify(post.taggedUserIds ?? []);
    if (contentChanged || locationChanged || tagsChanged || taggedChanged) {
      showAlert('Verwerfen?', 'Deine Änderungen gehen verloren.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  }, [post, content, location, tags, taggedUserIds, onClose]);

  const addTag = useCallback(() => {
    const cleaned = newTag.trim().replace(/^#/, '').trim();
    if (cleaned.length === 0) return;
    if (tags.includes(cleaned)) {
      setNewTag('');
      return;
    }
    setTags((prev) => [...prev, cleaned]);
    setNewTag('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newTag, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addTaggedUser = useCallback((userId: string) => {
    setTaggedUserIds((prev) => [...prev, userId]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const removeTaggedUser = useCallback((userId: string) => {
    setTaggedUserIds((prev) => prev.filter((id) => id !== userId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (!post) return null;

  const hasChanges =
    content.trim() !== post.content ||
    (location.trim() || '') !== (post.location ?? '') ||
    JSON.stringify(tags) !== JSON.stringify(post.tags ?? []) ||
    JSON.stringify(taggedUserIds) !== JSON.stringify(post.taggedUserIds ?? []);

  const hasImage = post.mediaUrls.length > 0;

  const LOCATION_SUGGESTIONS = [
    'Berlin, Deutschland',
    'München, Bayern',
    'Hamburg, Deutschland',
    'Dresden, Sachsen',
    'Köln, NRW',
    'Frankfurt, Hessen',
    'Stuttgart, Baden-Württemberg',
    'Düsseldorf, NRW',
    'Leipzig, Sachsen',
    'Nürnberg, Bayern',
  ];

  const filteredLocations = location.trim().length > 0
    ? LOCATION_SUGGESTIONS.filter((l) => l.toLowerCase().includes(location.toLowerCase()))
    : LOCATION_SUGGESTIONS;

  const TAB_CONFIG: { key: EditTab; label: string; icon: typeof MapPin }[] = [
    { key: 'text', label: 'Text', icon: Hash },
    { key: 'location', label: 'Ort', icon: MapPin },
    { key: 'people', label: 'Personen', icon: UserPlus },
    { key: 'tags', label: 'Schlagwörter', icon: Hash },
  ];

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
          <View style={styles.handle} />

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

          {hasImage && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: post.mediaUrls[0] }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(26,25,23,0.8)']}
                style={styles.previewGradient}
              />
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
            style={styles.tabBarWrap}
          >
            {TAB_CONFIG.map((tab) => {
              const isActive = activeTab === tab.key;
              const IconComp = tab.icon;
              let badge = '';
              if (tab.key === 'people' && taggedUserIds.length > 0) badge = String(taggedUserIds.length);
              if (tab.key === 'tags' && tags.length > 0) badge = String(tags.length);
              if (tab.key === 'location' && location.trim().length > 0) badge = '✓';
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => {
                    setActiveTab(tab.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <IconComp size={14} color={isActive ? '#0f0e0b' : 'rgba(232,220,200,0.6)'} />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                  {badge.length > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{badge}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.body}>
            {activeTab === 'text' && (
              <View>
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
              </View>
            )}

            {activeTab === 'location' && (
              <View>
                <View style={styles.locationRow}>
                  <MapPin size={16} color={GOLD} />
                  <TextInput
                    style={styles.locationInput}
                    placeholder="Ort suchen oder eingeben..."
                    placeholderTextColor="rgba(142,142,147,0.4)"
                    value={location}
                    onChangeText={setLocation}
                    autoFocus
                    testID="edit-post-location"
                  />
                  {location.length > 0 && (
                    <Pressable onPress={() => setLocation('')} hitSlop={8}>
                      <X size={16} color="rgba(191,163,93,0.6)" />
                    </Pressable>
                  )}
                </View>
                <ScrollView style={styles.suggestionList} showsVerticalScrollIndicator={false}>
                  {filteredLocations.map((loc) => (
                    <Pressable
                      key={loc}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setLocation(loc);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <MapPin size={13} color="rgba(191,163,93,0.5)" />
                      <Text style={styles.suggestionText}>{loc}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {activeTab === 'people' && (
              <View>
                {taggedUsers.length > 0 && (
                  <View style={styles.taggedSection}>
                    <Text style={styles.sectionLabel}>Markiert</Text>
                    {taggedUsers.map((u) => {
                      const initChar = u.displayName.charAt(0).toUpperCase();
                      return (
                        <View key={u.id} style={styles.taggedUserRow}>
                          <View style={styles.taggedUserAvatar}>
                            {u.avatarUrl ? (
                              <Image source={{ uri: u.avatarUrl }} style={styles.taggedAvatarImg} />
                            ) : (
                              <View style={styles.taggedAvatarFallback}>
                                <Text style={styles.taggedAvatarText}>{initChar}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.taggedUserInfo}>
                            <Text style={styles.taggedUserName}>{u.displayName}</Text>
                            <Text style={styles.taggedUserHandle}>@{u.username}</Text>
                          </View>
                          <Pressable
                            style={styles.removeTagBtn}
                            onPress={() => removeTaggedUser(u.id)}
                            hitSlop={8}
                          >
                            <X size={14} color="#C0392B" />
                          </Pressable>
                        </View>
                      );
                    })}
                    <View style={styles.sectionDivider} />
                  </View>
                )}

                <View style={styles.searchRow}>
                  <Search size={14} color="rgba(142,142,147,0.5)" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Freunde suchen..."
                    placeholderTextColor="rgba(142,142,147,0.4)"
                    value={tagSearch}
                    onChangeText={setTagSearch}
                    autoFocus
                  />
                </View>

                <ScrollView style={styles.friendList} showsVerticalScrollIndicator={false}>
                  {filteredFriends.length === 0 && (
                    <Text style={styles.emptyText}>
                      {friendUsers.length === 0
                        ? 'Noch keine Freunde hinzugefügt'
                        : 'Keine passenden Freunde gefunden'}
                    </Text>
                  )}
                  {filteredFriends.map((u) => {
                    const initChar = u.displayName.charAt(0).toUpperCase();
                    return (
                      <Pressable
                        key={u.id}
                        style={styles.friendRow}
                        onPress={() => addTaggedUser(u.id)}
                      >
                        <View style={styles.friendAvatar}>
                          {u.avatarUrl ? (
                            <Image source={{ uri: u.avatarUrl }} style={styles.friendAvatarImg} />
                          ) : (
                            <View style={styles.friendAvatarFallback}>
                              <Text style={styles.friendAvatarText}>{initChar}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{u.displayName}</Text>
                          <Text style={styles.friendHandle}>@{u.username}</Text>
                        </View>
                        <UserPlus size={16} color={GOLD} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {activeTab === 'tags' && (
              <View>
                <View style={styles.tagInputRow}>
                  <Hash size={16} color={GOLD} />
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Schlagwort eingeben..."
                    placeholderTextColor="rgba(142,142,147,0.4)"
                    value={newTag}
                    onChangeText={setNewTag}
                    autoFocus
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  {newTag.trim().length > 0 && (
                    <Pressable style={styles.addTagBtn} onPress={addTag} hitSlop={8}>
                      <Check size={14} color="#0f0e0b" />
                    </Pressable>
                  )}
                </View>

                {tags.length > 0 && (
                  <View style={styles.tagsWrap}>
                    {tags.map((tag) => (
                      <Pressable
                        key={tag}
                        style={styles.tagChip}
                        onPress={() => removeTag(tag)}
                      >
                        <Text style={styles.tagChipText}>#{tag}</Text>
                        <X size={10} color="rgba(191,163,93,0.7)" />
                      </Pressable>
                    ))}
                  </View>
                )}

                <Text style={styles.tagHint}>
                  Schlagwörter helfen anderen, deinen Beitrag zu entdecken. Tippe auf ein Schlagwort, um es zu entfernen.
                </Text>

                {tags.length === 0 && (
                  <View style={styles.tagSuggestions}>
                    <Text style={styles.sectionLabel}>Vorschläge</Text>
                    <View style={styles.tagsWrap}>
                      {['Heimat', 'Tradition', 'Natur', 'Kultur', 'Geschichte', 'Reise', 'Wandern', 'Denkmal', 'Gemeinschaft', 'Brauchtum'].map((s) => (
                        <Pressable
                          key={s}
                          style={styles.tagSuggestionChip}
                          onPress={() => {
                            setTags((prev) => prev.includes(s) ? prev : [...prev, s]);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Text style={styles.tagSuggestionText}>#{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
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
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(142,142,147,0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
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
  imagePreview: {
    height: 120,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  tabBarWrap: {
    maxHeight: 44,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  tabActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  tabTextActive: {
    color: '#0f0e0b',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(15,14,11,0.2)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: GOLD,
  },
  tabBadgeTextActive: {
    color: '#0f0e0b',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    minHeight: 200,
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
    textAlign: 'right' as const,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
    color: '#E8DCC8',
    padding: 0,
  },
  suggestionList: {
    maxHeight: 220,
    marginTop: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.08)',
  },
  suggestionText: {
    fontSize: 14,
    color: '#E8DCC8',
  },
  taggedSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  taggedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  taggedUserAvatar: {
    marginRight: 10,
  },
  taggedAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },
  taggedAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  taggedAvatarText: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  taggedUserInfo: {
    flex: 1,
  },
  taggedUserName: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  taggedUserHandle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 11,
    marginTop: 1,
  },
  removeTagBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192,57,43,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.1)',
    marginVertical: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#E8DCC8',
    padding: 0,
  },
  friendList: {
    maxHeight: 220,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  friendAvatar: {
    marginRight: 10,
  },
  friendAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },
  friendAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  friendAvatarText: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  friendHandle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 11,
    marginTop: 1,
  },
  emptyText: {
    color: 'rgba(142,142,147,0.5)',
    fontSize: 13,
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  tagInput: {
    flex: 1,
    fontSize: 15,
    color: '#E8DCC8',
    padding: 0,
  },
  addTagBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  tagChipText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tagHint: {
    color: 'rgba(142,142,147,0.4)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  tagSuggestions: {
    marginTop: 16,
  },
  tagSuggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  tagSuggestionText: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
