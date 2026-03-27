import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  FlatList,
  Share,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { X, Send, Globe, MessageCircle, Camera, Search, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import OptimizedImage, { OptimizedAvatar } from '@/components/OptimizedImage';
import { useFriends } from '@/providers/FriendsProvider';
import { useChat } from '@/providers/ChatProvider';
import { useAlert } from '@/providers/AlertProvider';
import type { FeedPost, SocialUser } from '@/constants/types';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  post: FeedPost | null;
  authorName?: string;
}

function ShareModalInner({ visible, onClose, post, authorName }: ShareModalProps) {
  const { friendUsers } = useFriends();
  const { sendMessage } = useChat();
  const { showAlert } = useAlert();
  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friendUsers;
    const q = searchQuery.toLowerCase();
    return friendUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [friendUsers, searchQuery]);

  useEffect(() => {
    if (visible) {
      setSelectedFriends([]);
      setSearchQuery('');
      setSending(false);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 22,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, backdropAnim, onClose]);

  const toggleFriend = useCallback((userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleSendToFriends = useCallback(async () => {
    if (!post || selectedFriends.length === 0) return;
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const postPreview = post.content.length > 80 ? post.content.slice(0, 80) + '...' : post.content;
    const shareText = post.mediaUrls.length > 0
      ? `📸 Hat einen Beitrag mit dir geteilt:\n"${postPreview}"\n\n[Beitrag von ${authorName ?? 'Unbekannt'}]`
      : `📝 Hat einen Beitrag mit dir geteilt:\n"${postPreview}"\n\n[Beitrag von ${authorName ?? 'Unbekannt'}]`;

    try {
      for (const friendId of selectedFriends) {
        await sendMessage(friendId, shareText);
      }
      console.log('[SHARE] Sent post to', selectedFriends.length, 'friends');
      handleClose();
      setTimeout(() => {
        showAlert(
          'Geteilt!',
          `Beitrag an ${selectedFriends.length} ${selectedFriends.length === 1 ? 'Person' : 'Personen'} gesendet.`,
          [{ text: 'OK' }],
          'success'
        );
      }, 300);
    } catch (e) {
      console.log('[SHARE] Error sending to friends:', e);
      showAlert('Fehler', 'Beitrag konnte nicht gesendet werden.', [{ text: 'OK' }], 'error');
    } finally {
      setSending(false);
    }
  }, [post, selectedFriends, sendMessage, authorName, handleClose, showAlert]);

  const handleShareToStory = useCallback(() => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleClose();
    setTimeout(() => {
      router.push({
        pathname: '/(tabs)/feed/create-story',
        params: {
          sharedPostId: post.id,
          sharedPostImage: post.mediaUrls[0] ?? '',
          sharedPostAuthor: authorName ?? 'Unbekannt',
          sharedPostContent: post.content.slice(0, 100),
        },
      } as any);
    }, 300);
  }, [post, authorName, handleClose, router]);

  const handleExternalShare = useCallback(async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const postText = post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content;
    const message = authorName
      ? `${authorName}: "${postText}"\n\nGeteilt über Heimat App`
      : `"${postText}"\n\nGeteilt über Heimat App`;

    try {
      await Share.share({
        message,
        ...(Platform.OS === 'ios' ? { url: post.mediaUrls[0] ?? '' } : {}),
      });
      console.log('[SHARE] External share triggered');
    } catch (e) {
      console.log('[SHARE] External share error:', e);
    }
  }, [post, authorName]);

  const renderFriendItem = useCallback(
    ({ item }: { item: SocialUser }) => {
      const isSelected = selectedFriends.includes(item.id);
      const initial = item.displayName.charAt(0).toUpperCase();
      return (
        <Pressable
          style={[s.friendItem, isSelected && s.friendItemSelected]}
          onPress={() => toggleFriend(item.id)}
          testID={`share-friend-${item.id}`}
        >
          <View style={s.friendAvatarWrap}>
            {item.avatarUrl ? (
              <OptimizedAvatar uri={item.avatarUrl} size={44} borderRadius={12} />
            ) : (
              <View style={s.friendAvatarFallback}>
                <Text style={s.friendAvatarText}>{initial}</Text>
              </View>
            )}
            {isSelected && (
              <View style={s.friendCheckBadge}>
                <Check size={10} color="#0f0e0b" strokeWidth={3} />
              </View>
            )}
          </View>
          <View style={s.friendInfo}>
            <Text style={s.friendName} numberOfLines={1}>{item.displayName}</Text>
            <Text style={s.friendUsername} numberOfLines={1}>@{item.username}</Text>
          </View>
        </Pressable>
      );
    },
    [selectedFriends, toggleFriend]
  );

  if (!visible || !post) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <Animated.View
          style={[s.backdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            s.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={s.handleBar} />

          <View style={s.header}>
            <Text style={s.headerTitle}>Teilen</Text>
            <Pressable style={s.closeBtn} onPress={handleClose} hitSlop={12}>
              <X size={18} color="rgba(232,220,200,0.6)" />
            </Pressable>
          </View>

          <View style={s.postPreview}>
            {post.mediaUrls.length > 0 && (
              <OptimizedImage
                source={{ uri: post.mediaUrls[0] }}
                style={s.previewImage}
                contentFit="cover"
                variant="dark"
              />
            )}
            <View style={s.previewInfo}>
              <Text style={s.previewAuthor}>{authorName ?? 'Beitrag'}</Text>
              <Text style={s.previewText} numberOfLines={2}>
                {post.content || 'Foto'}
              </Text>
            </View>
          </View>

          <View style={s.shareActions}>
            <Pressable style={s.shareActionBtn} onPress={handleShareToStory} testID="share-to-story">
              <View style={[s.shareActionIcon, { backgroundColor: 'rgba(191,163,93,0.15)' }]}>
                <Camera size={22} color="#BFA35D" />
              </View>
              <Text style={s.shareActionLabel}>In Story</Text>
            </Pressable>

            <Pressable style={s.shareActionBtn} onPress={handleExternalShare} testID="share-external">
              <View style={[s.shareActionIcon, { backgroundColor: 'rgba(93,160,232,0.15)' }]}>
                <Globe size={22} color="#5DA0E8" />
              </View>
              <Text style={s.shareActionLabel}>Extern</Text>
            </Pressable>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionTitle}>An Freunde senden</Text>

          {friendUsers.length > 5 && (
            <View style={s.searchWrap}>
              <Search size={16} color="rgba(191,163,93,0.4)" />
              <TextInput
                style={s.searchInput}
                placeholder="Freund suchen..."
                placeholderTextColor="rgba(191,163,93,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="share-search-input"
              />
            </View>
          )}

          {filteredFriends.length === 0 ? (
            <View style={s.emptyFriends}>
              <MessageCircle size={28} color="rgba(191,163,93,0.2)" />
              <Text style={s.emptyFriendsText}>
                {friendUsers.length === 0
                  ? 'Noch keine Freunde hinzugefügt'
                  : 'Kein Ergebnis'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item.id}
              style={s.friendsList}
              contentContainerStyle={s.friendsListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {selectedFriends.length > 0 && (
            <View style={s.sendBarWrap}>
              <Pressable
                style={[s.sendBar, sending && s.sendBarDisabled]}
                onPress={handleSendToFriends}
                disabled={sending}
                testID="share-send-btn"
              >
                <Send size={18} color="#0f0e0b" />
                <Text style={s.sendBarText}>
                  {sending
                    ? 'Wird gesendet...'
                    : `An ${selectedFriends.length} ${selectedFriends.length === 1 ? 'Person' : 'Personen'} senden`}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default React.memo(ShareModalInner);

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1a1918',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.78,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
    borderBottomWidth: 0,
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.4, shadowRadius: 20 }
      : {}),
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
    gap: 12,
  },
  previewImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  previewInfo: {
    flex: 1,
  },
  previewAuthor: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.5)',
    lineHeight: 16,
  },
  shareActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  shareActionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shareActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  shareActionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.7)',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.1)',
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#E8DCC8',
    paddingVertical: 0,
  },
  friendsList: {
    maxHeight: 240,
  },
  friendsListContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 2,
  },
  friendItemSelected: {
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  friendAvatarWrap: {
    position: 'relative' as const,
    marginRight: 12,
  },
  friendAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  friendAvatarText: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  friendCheckBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1918',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  friendUsername: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 1,
  },
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyFriendsText: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.4)',
  },
  sendBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#BFA35D',
  },
  sendBarDisabled: {
    opacity: 0.6,
  },
  sendBarText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f0e0b',
  },
});
