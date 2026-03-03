import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useAlert } from '@/providers/AlertProvider';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Heart, MessageCircle, Share2, MapPin, ChevronLeft, Play, Users, MoreHorizontal, Pencil, Archive, MessageCircleOff, X, ChevronRight, Bookmark, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '@/providers/PostsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';
import RankIcon from '@/components/RankIcon';
import OptimizedImage, { OptimizedAvatar } from '@/components/OptimizedImage';
import EditPostModal from '@/components/EditPostModal';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostFeedItemProps {
  post: FeedPost;
  onUserPress: (userId: string) => void;
  onCommentPress: (postId: string) => void;
  onLocationPress: (location: string) => void;
  onEditPress: (post: FeedPost) => void;
  isOwnPost: boolean;
  menuResetKey: number;
}

const PostFeedItem = React.memo(function PostFeedItem({
  post,
  onUserPress,
  onCommentPress,
  onLocationPress,
  onEditPress,
  isOwnPost,
  menuResetKey,
}: PostFeedItemProps) {
  const { toggleLike, isLiked, isPostSaved, savePost, isCommentsDisabled, archivePost, toggleCommentsDisabled, deletePost } = usePosts();
  const { showAlert } = useAlert();
  const router = useRouter();
  const { profile: socialProfile } = useSocial();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showTaggedPeople, setShowTaggedPeople] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const taggedPeopleAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const prevResetKey = useRef<number>(menuResetKey);

  React.useEffect(() => {
    if (prevResetKey.current !== menuResetKey) {
      prevResetKey.current = menuResetKey;
      if (showMenu) {
        setShowMenu(false);
        menuAnim.setValue(0);
      }
      if (showTaggedPeople) {
        setShowTaggedPeople(false);
        taggedPeopleAnim.setValue(0);
      }
    }
  }, [menuResetKey]);

  const author = post.userId === 'me'
    ? {
        displayName: socialProfile?.displayName || user?.name || 'Ich',
        username: user?.name?.toLowerCase().replace(/\s/g, '_') ?? 'ich',
        rankIcon: 'Compass',
        rank: 'Entdecker',
        avatarUrl: socialProfile?.avatarUrl ?? null,
      }
    : (() => {
        const u = getUserById(post.userId);
        return u
          ? { displayName: u.displayName, username: u.username, rankIcon: u.rankIcon, rank: u.rank, avatarUrl: u.avatarUrl }
          : { displayName: 'Unbekannt', username: 'unknown', rankIcon: 'Search', rank: 'Sucher', avatarUrl: null as string | null };
      })();

  const liked = isLiked(post.id);
  const saved = isPostSaved(post.id);
  const commentsOff = isCommentsDisabled(post.id);
  const likeCount = post.likeCount + (liked ? 1 : 0);
  const initial = author.displayName.charAt(0).toUpperCase();
  const hasImage = post.mediaUrls.length > 0;

  const taggedUsers = useMemo(() => {
    if (!post.taggedUserIds || post.taggedUserIds.length === 0) return [];
    return post.taggedUserIds
      .map((id) => getUserById(id))
      .filter((u): u is NonNullable<typeof u> => u !== null && u !== undefined);
  }, [post.taggedUserIds]);

  const captionText = useMemo(() => {
    let text = post.content;
    if (taggedUsers.length > 0) {
      text = text.replace(/@\w+/g, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    return text;
  }, [post.content, taggedUsers]);

  const hasMore = captionText.length > 120;
  const displayCaption = expanded ? captionText : captionText.slice(0, 120);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }, [heartScale, post.id, toggleLike]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    savePost(post.id);
  }, [post.id, savePost]);

  const toggleTaggedPeople = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const show = !showTaggedPeople;
    setShowTaggedPeople(show);
    if (showMenu) {
      setShowMenu(false);
      menuAnim.setValue(0);
    }
    Animated.spring(taggedPeopleAnim, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [showTaggedPeople, taggedPeopleAnim, showMenu, menuAnim]);

  const toggleMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const show = !showMenu;
    setShowMenu(show);
    if (showTaggedPeople) {
      setShowTaggedPeople(false);
      taggedPeopleAnim.setValue(0);
    }
    Animated.spring(menuAnim, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [showMenu, menuAnim, showTaggedPeople, taggedPeopleAnim]);

  const handleTaggedUserTap = useCallback((userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTaggedPeople(false);
    taggedPeopleAnim.setValue(0);
    onUserPress(userId);
  }, [onUserPress, taggedPeopleAnim]);

  const lastTap = useRef<number>(0);
  const doubleTapAnim = useRef(new Animated.Value(0)).current;

  const handleImagePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (!liked) toggleLike(post.id);
      Animated.sequence([
        Animated.spring(doubleTapAnim, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 12 }),
        Animated.timing(doubleTapAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
    lastTap.current = now;
  }, [liked, post.id, toggleLike, doubleTapAnim]);

  const handleOutsidePress = useCallback(() => {
    if (showMenu) {
      setShowMenu(false);
      menuAnim.setValue(0);
    }
    if (showTaggedPeople) {
      setShowTaggedPeople(false);
      taggedPeopleAnim.setValue(0);
    }
  }, [showMenu, showTaggedPeople, menuAnim, taggedPeopleAnim]);

  return (
    <Pressable style={itemStyles.container} onPress={handleOutsidePress}>
      <View style={itemStyles.header}>
        <Pressable style={itemStyles.authorRow} onPress={() => onUserPress(post.userId)}>
          <View style={itemStyles.avatarWrap}>
            {author.avatarUrl ? (
              <OptimizedAvatar uri={author.avatarUrl} size={38} borderRadius={10} />
            ) : (
              <View style={itemStyles.avatarFallback}>
                <Text style={itemStyles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={itemStyles.authorInfo}>
            <View style={itemStyles.nameRow}>
              <Text style={itemStyles.displayName} numberOfLines={1}>{author.displayName}</Text>
              <View style={itemStyles.rankBadge}>
                <RankIcon icon={author.rankIcon} size={11} color="#BFA35D" />
              </View>
            </View>
            <Text style={itemStyles.timeText}>{formatTimeAgo(post.createdAt)}</Text>
          </View>
        </Pressable>

        <View style={itemStyles.headerRight}>
          {taggedUsers.length > 0 && (
            <Pressable
              style={itemStyles.taggedIndicator}
              onPress={toggleTaggedPeople}
              hitSlop={8}
            >
              <Users size={12} color="#BFA35D" />
              <Text style={itemStyles.taggedIndicatorText}>+{taggedUsers.length}</Text>
            </Pressable>
          )}
          {isOwnPost && (
            <Pressable style={itemStyles.moreBtn} hitSlop={12} onPress={toggleMenu}>
              <MoreHorizontal size={18} color="rgba(232,220,200,0.5)" />
            </Pressable>
          )}
        </View>
      </View>

      {showMenu && isOwnPost && (
        <Animated.View
          style={[
            itemStyles.menuDropdown,
            {
              opacity: menuAnim,
              transform: [{
                translateY: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              }],
            },
          ]}
          pointerEvents="auto"
        >
          <Pressable
            style={itemStyles.menuItem}
            onPress={() => {
              setShowMenu(false);
              menuAnim.setValue(0);
              onEditPress(post);
            }}
          >
            <Pencil size={15} color="#E8DCC8" />
            <Text style={itemStyles.menuItemText}>Bearbeiten</Text>
          </Pressable>
          <View style={itemStyles.menuDivider} />
          <Pressable
            style={itemStyles.menuItem}
            onPress={() => {
              setShowMenu(false);
              menuAnim.setValue(0);
              toggleCommentsDisabled(post.id);
            }}
          >
            <MessageCircleOff size={15} color={commentsOff ? '#BFA35D' : '#E8DCC8'} />
            <Text style={[itemStyles.menuItemText, commentsOff && { color: '#BFA35D' }]}>
              {commentsOff ? 'Kommentare aktivieren' : 'Kommentare deaktivieren'}
            </Text>
          </Pressable>
          <View style={itemStyles.menuDivider} />
          <Pressable
            style={itemStyles.menuItem}
            onPress={() => {
              setShowMenu(false);
              menuAnim.setValue(0);
              archivePost(post.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          >
            <Archive size={15} color="#E8DCC8" />
            <Text style={itemStyles.menuItemText}>Archivieren</Text>
          </Pressable>
          <View style={itemStyles.menuDivider} />
          <Pressable
            style={itemStyles.menuItem}
            onPress={() => {
              setShowMenu(false);
              menuAnim.setValue(0);
              showAlert(
                'Beitrag löschen?',
                'Dieser Beitrag wird endgültig und unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  {
                    text: 'Endgültig löschen',
                    style: 'destructive',
                    onPress: () => {
                      deletePost(post.id);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    },
                  },
                ],
                'warning',
              );
            }}
          >
            <Trash2 size={15} color="#C0392B" />
            <Text style={[itemStyles.menuItemText, { color: '#C0392B' }]}>Löschen</Text>
          </Pressable>
        </Animated.View>
      )}

      {showTaggedPeople && taggedUsers.length > 0 && (
        <Animated.View
          style={[
            itemStyles.taggedDropdown,
            {
              opacity: taggedPeopleAnim,
              transform: [{
                translateY: taggedPeopleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              }],
            },
          ]}
          pointerEvents="auto"
        >
          <View style={itemStyles.taggedDropdownHeader}>
            <Text style={itemStyles.taggedDropdownTitle}>Markiert</Text>
            <Pressable onPress={toggleTaggedPeople} hitSlop={8}>
              <X size={14} color="rgba(232,220,200,0.5)" />
            </Pressable>
          </View>
          {taggedUsers.map((tu) => {
            const tagInitial = tu.displayName.charAt(0).toUpperCase();
            return (
              <Pressable
                key={tu.id}
                style={itemStyles.taggedUserRow}
                onPress={() => handleTaggedUserTap(tu.id)}
              >
                {tu.avatarUrl ? (
                  <OptimizedAvatar uri={tu.avatarUrl} size={28} borderRadius={7} />
                ) : (
                  <View style={itemStyles.taggedUserAvatar}>
                    <Text style={itemStyles.taggedUserAvatarText}>{tagInitial}</Text>
                  </View>
                )}
                <View style={itemStyles.taggedUserInfo}>
                  <Text style={itemStyles.taggedUserName} numberOfLines={1}>{tu.displayName}</Text>
                  <Text style={itemStyles.taggedUserHandle}>@{tu.username}</Text>
                </View>
                <ChevronRight size={14} color="rgba(191,163,93,0.4)" />
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {hasImage ? (
        <Pressable onPress={handleImagePress} style={itemStyles.imageContainer}>
          <OptimizedImage
            source={{ uri: post.mediaUrls[0] }}
            style={itemStyles.image}
            contentFit="cover"
            variant="dark"
          />
          {post.mediaType === 'video' && (
            <View style={itemStyles.videoOverlay}>
              <View style={itemStyles.playButton}>
                <Play size={24} color="#fff" fill="#fff" />
              </View>
            </View>
          )}
          <Animated.View
            style={[
              itemStyles.doubleTapHeart,
              {
                opacity: doubleTapAnim,
                transform: [{
                  scale: doubleTapAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1.2, 1],
                  }),
                }],
              },
            ]}
            pointerEvents="none"
          >
            <Heart size={64} color="#BFA35D" fill="#BFA35D" />
          </Animated.View>
        </Pressable>
      ) : null}

      <View style={itemStyles.actionsRow}>
        <View style={itemStyles.actionsLeft}>
          <Pressable onPress={handleLike} style={itemStyles.actionBtn} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={24}
                color={liked ? '#E25555' : '#E8DCC8'}
                fill={liked ? '#E25555' : 'transparent'}
              />
            </Animated.View>
            {likeCount > 0 && (
              <Text style={[itemStyles.actionCount, liked && { color: '#E25555' }]}>{likeCount}</Text>
            )}
          </Pressable>
          <Pressable style={itemStyles.actionBtn} hitSlop={8} onPress={() => onCommentPress(post.id)}>
            <MessageCircle size={22} color="#E8DCC8" />
            {post.commentCount > 0 && (
              <Text style={itemStyles.actionCount}>{post.commentCount}</Text>
            )}
          </Pressable>
          <Pressable style={itemStyles.actionBtn} hitSlop={8}>
            <Share2 size={21} color="#E8DCC8" />
          </Pressable>
        </View>
        <Pressable onPress={handleSave} style={itemStyles.actionBtn} hitSlop={8}>
          <Bookmark
            size={22}
            color={saved ? '#BFA35D' : '#E8DCC8'}
            fill={saved ? '#BFA35D' : 'transparent'}
          />
        </Pressable>
      </View>

      {captionText.length > 0 && (
        <View style={itemStyles.captionArea}>
          <Text style={itemStyles.captionAuthor}>{author.username}</Text>
          <Text style={itemStyles.captionText}>
            {displayCaption}
            {hasMore && !expanded && (
              <Text style={itemStyles.moreText} onPress={() => setExpanded(true)}> ...mehr</Text>
            )}
          </Text>
        </View>
      )}

      {post.commentCount > 0 && !commentsOff && (
        <Pressable style={itemStyles.commentsLink} onPress={() => onCommentPress(post.id)}>
          <Text style={itemStyles.commentsText}>
            Alle {post.commentCount} Kommentare ansehen
          </Text>
        </Pressable>
      )}

      {post.location && (
        <Pressable style={itemStyles.locationRow} onPress={() => onLocationPress(post.location!)}>
          <MapPin size={11} color="rgba(191,163,93,0.5)" />
          <Text style={itemStyles.locationText}>{post.location}</Text>
        </Pressable>
      )}
    </Pressable>
  );
});

export default function UserReelFeedScreen() {
  const { userId, initialPostId } = useLocalSearchParams<{ userId: string; initialPostId?: string; initialReelId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<FeedPost>>(null);
  const { getPostsForUser, allPosts } = usePosts();
  const { user } = useAuth();

  const isOwnProfile = userId === 'me' || (user && userId === user.id);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  const userPosts = useMemo((): FeedPost[] => {
    if (!userId) return [];
    const uid = (user && userId === user.id) ? 'me' : userId;
    return getPostsForUser(uid);
  }, [userId, getPostsForUser, allPosts, user]);

  const initialIndex = useMemo(() => {
    if (!initialPostId) return 0;
    const idx = userPosts.findIndex(p => p.id === initialPostId);
    return idx >= 0 ? idx : 0;
  }, [initialPostId, userPosts]);

  const hasScrolledToInitial = useRef<boolean>(false);

  useEffect(() => {
    if (hasScrolledToInitial.current) return;
    if (initialIndex > 0 && userPosts.length > initialIndex && flatListRef.current) {
      hasScrolledToInitial.current = true;
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialIndex, userPosts.length]);

  const author = useMemo(() => {
    if (!userId || userId === 'me') return null;
    return getUserById(userId);
  }, [userId]);

  const handleUserPress = useCallback((uid: string) => {
    if (uid === 'me') return;
    router.push({ pathname: '/user-profile', params: { userId: uid } } as any);
  }, [router]);

  const handleCommentPress = useCallback((postId: string) => {
    router.push({ pathname: '/(tabs)/feed/comments', params: { postId } } as any);
  }, [router]);

  const handleLocationPress = useCallback((location: string) => {
    router.push({ pathname: '/location-posts', params: { location } } as any);
  }, [router]);

  const [menuResetKey, setMenuResetKey] = useState<number>(0);

  const handleEditPress = useCallback((post: FeedPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[REEL-FEED] Edit post:', post.id);
    setEditingPost(post);
  }, []);

  const handleScrollBegin = useCallback(() => {
    setMenuResetKey((k) => k + 1);
  }, []);

  const renderItem = useCallback(({ item }: { item: FeedPost }) => (
    <PostFeedItem
      post={item}
      onUserPress={handleUserPress}
      onCommentPress={handleCommentPress}
      onLocationPress={handleLocationPress}
      onEditPress={handleEditPress}
      isOwnPost={item.userId === 'me'}
      menuResetKey={menuResetKey}
    />
  ), [handleUserPress, handleCommentPress, handleLocationPress, handleEditPress, menuResetKey]);

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  const headerTitle = isOwnProfile ? 'Meine Beiträge' : (author?.displayName ?? 'Beiträge');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
            hitSlop={12}
            style={styles.backBtn}
          >
            <View style={styles.backCircle}>
              <ChevronLeft size={20} color="#BFA35D" />
            </View>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.headerSubtitle}>Beiträge</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={userPosts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleScrollBegin}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => {
            console.log('[POST-FEED] scrollToIndex failed, retrying...', info);
            const offset = info.averageItemLength * info.index;
            flatListRef.current?.scrollToOffset({ offset, animated: false });
            setTimeout(() => {
              if (info.index < userPosts.length) {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
              }
            }, 200);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Keine Beiträge vorhanden.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
      <EditPostModal
        visible={editingPost !== null}
        post={editingPost}
        onClose={() => setEditingPost(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.08)',
  },
  backBtn: {},
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.06)',
    marginHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 14,
  },
});

const itemStyles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    position: 'relative' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#BFA35D',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: 'rgba(232,220,200,0.35)',
    fontSize: 12,
    fontWeight: '400' as const,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taggedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  taggedIndicatorText: {
    color: '#BFA35D',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  moreBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDropdown: {
    position: 'absolute' as const,
    top: 58,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        }
      : {}),
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.1)',
    marginHorizontal: 14,
  },
  taggedDropdown: {
    position: 'absolute' as const,
    top: 58,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        }
      : {}),
    elevation: 10,
  },
  taggedDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  taggedDropdownTitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  taggedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taggedUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  taggedUserAvatarText: {
    color: '#E8DCC8',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  taggedUserInfo: {
    flex: 1,
    marginLeft: 8,
  },
  taggedUserName: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  taggedUserHandle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 10,
    marginTop: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 4 / 5,
    backgroundColor: '#1a1a1c',
    position: 'relative' as const,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  doubleTapHeart: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 2,
  },
  actionCount: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  captionArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  captionAuthor: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '700' as const,
    marginRight: 6,
  },
  captionText: {
    color: 'rgba(232,220,200,0.8)',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  moreText: {
    color: 'rgba(191,163,93,0.5)',
    fontWeight: '500' as const,
  },
  commentsLink: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  commentsText: {
    color: 'rgba(232,220,200,0.35)',
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  locationText: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
