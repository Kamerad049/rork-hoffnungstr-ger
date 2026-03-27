import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { usePosts } from '@/providers/PostsProvider';
import FeedCardComponent from '@/components/FeedCard';
import type { PostReactionType } from '@/components/FeedCard';
import SponsoredCard from '@/components/SponsoredCard';
import StoryBar from '@/components/StoryBar';
import EditPostModal from '@/components/EditPostModal';
import AdminDeleteModal from '@/components/AdminDeleteModal';
import type { FeedPost, StoryGroup, Promotion } from '@/constants/types';
import { trackRender, measureSinceBoot } from '@/lib/perf';
import { usePromotions } from '@/providers/PromotionProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useModeration } from '@/providers/ModerationProvider';
import { queryKeys } from '@/constants/queryKeys';

type FeedItem = 
  | { type: 'post'; data: FeedPost }
  | { type: 'promotion'; data: Promotion };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

export default function FeedScreen() {
  trackRender('FeedScreen');
  measureSinceBoot('FeedScreen_render');
  const { allPosts, archivePost, deletePost, toggleCommentsDisabled } = usePosts();
  const { activePromotions, trackImpression, trackClick, getSponsorById } = usePromotions();
  const { user } = useAuth();
  const { adminRemovePost, isPostModerated } = useModeration();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [postReactions, setPostReactions] = useState<Record<string, PostReactionType>>({});
  const [ready, setReady] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [adminDeletePost, setAdminDeletePost] = useState<FeedPost | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [feedMode, setFeedMode] = useState<'discover' | 'foryou'>('discover');
  const [headerHidden, setHeaderHidden] = useState<boolean>(false);
  const tabIndicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleFeedModeChange = useCallback((mode: 'discover' | 'foryou') => {
    if (mode === feedMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedMode(mode);
    Animated.spring(tabIndicatorX, {
      toValue: mode === 'discover' ? 0 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 25,
    }).start();
  }, [feedMode, tabIndicatorX]);

  const sortedPosts = useMemo(() => {
    return [...allPosts]
      .filter((p) => !isPostModerated(p.id))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [allPosts, isPostModerated]);

  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = sortedPosts.map((p) => ({ type: 'post' as const, data: p }));
    if (activePromotions.length === 0) return items;
    const result: FeedItem[] = [];
    let promoIdx = 0;
    for (let i = 0; i < items.length; i++) {
      if (promoIdx < activePromotions.length) {
        const promo = activePromotions[promoIdx];
        if (i > 0 && i === promo.feedPosition) {
          result.push({ type: 'promotion', data: promo });
          promoIdx++;
        }
      }
      result.push(items[i]);
    }
    while (promoIdx < activePromotions.length) {
      result.push({ type: 'promotion', data: activePromotions[promoIdx] });
      promoIdx++;
    }
    return result;
  }, [sortedPosts, activePromotions]);

  const handleCommentPress = useCallback(
    (postId: string) => {
      router.push({ pathname: '/(tabs)/feed/comments', params: { postId } } as any);
    },
    [router]
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push({ pathname: '/user-profile', params: { userId } } as any);
    },
    [router]
  );

  const handlePostPress = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/(tabs)/feed/post-detail', params: { postId } } as any);
    },
    [router]
  );

  const handleLocationPress = useCallback(
    (location: string) => {
      router.push({ pathname: '/location-posts', params: { location } } as any);
    },
    [router]
  );

  const handleEditPress = useCallback(
    (post: FeedPost) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('[FEED] Edit post:', post.id);
      setEditingPost(post);
    },
    []
  );

  const handleDeletePress = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      console.log('[FEED] Deleting post:', postId);
      deletePost(postId);
    },
    [deletePost]
  );

  const handleArchivePress = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      archivePost(postId);
    },
    [archivePost]
  );

  const handleToggleCommentsPress = useCallback(
    (postId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleCommentsDisabled(postId);
    },
    [toggleCommentsDisabled]
  );

  const handleAdminDeletePress = useCallback(
    (post: FeedPost) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      console.log('[FEED] Admin delete requested for post:', post.id);
      setAdminDeletePost(post);
    },
    []
  );

  const handleAdminDeleteConfirm = useCallback(
    async (post: FeedPost, reason: string, details: string) => {
      console.log('[FEED] Admin confirming delete:', post.id, reason);

      queryClient.setQueryData<{ posts: FeedPost[]; likedPosts: string[] }>(
        queryKeys.posts(user?.id ?? ''),
        (old) => ({
          posts: (old?.posts ?? []).filter((p) => p.id !== post.id),
          likedPosts: old?.likedPosts ?? [],
        }),
      );

      try {
        const action = await adminRemovePost(post, user?.id ?? 'admin', reason, details);
        if (action) {
          console.log('[FEED] Post removed by admin, action:', action.id);
        } else {
          console.log('[FEED] Admin remove returned null but post is locally removed');
        }
      } catch (e) {
        console.log('[FEED] Admin remove error:', e);
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.posts(user?.id ?? '') });
    },
    [adminRemovePost, user?.id, queryClient]
  );

  const handleCreatePost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/feed/create' as any);
  }, [router]);

  const handleStoryPress = useCallback(
    (_group: StoryGroup, index: number) => {
      router.push({ pathname: '/story-viewer', params: { groupIndex: String(index) } } as any);
    },
    [router]
  );

  const handleAddStory = useCallback(() => {
    router.push('/(tabs)/feed/create-story' as any);
  }, [router]);

  const handleReaction = useCallback((postId: string, type: PostReactionType) => {
    setPostReactions((prev) => {
      if (prev[postId] === type) {
        const next = { ...prev };
        delete next[postId];
        return next;
      }
      return { ...prev, [postId]: type };
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[FEED] Refreshing posts from server...');
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.posts(user?.id ?? '') });
      console.log('[FEED] Posts refreshed successfully');
    } catch (e) {
      console.log('[FEED] Error refreshing posts:', e);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user?.id]);

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.type === 'promotion') {
        const promo = item.data;
        const sponsor = promo.sponsorId ? getSponsorById(promo.sponsorId) : undefined;
        return (
          <View style={styles.cardWrapper}>
            <SponsoredCard
              promotion={promo}
              sponsor={sponsor}
              cardWidth={CARD_WIDTH}
              cardHeight={CARD_WIDTH * 1.25}
              isVisible={true}
              onImpression={trackImpression}
              onClick={trackClick}
            />
          </View>
        );
      }

      const post = item.data;
      return (
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadowWrap}>
            <FeedCardComponent
              post={post}
              cardWidth={CARD_WIDTH}
              onCommentPress={handleCommentPress}
              onUserPress={handleUserPress}
              onPostPress={handlePostPress}
              onLocationPress={handleLocationPress}
              onEditPress={handleEditPress}
              onDeletePress={handleDeletePress}
              onArchivePress={handleArchivePress}
              onToggleCommentsPress={handleToggleCommentsPress}
              onAdminDeletePress={handleAdminDeletePress}
              reaction={postReactions[post.id] ?? null}
              onReaction={handleReaction}
              isActive={true}
            />
          </View>
        </View>
      );
    },
    [handleCommentPress, handleUserPress, handlePostPress, handleLocationPress, handleEditPress, handleDeletePress, handleArchivePress, handleToggleCommentsPress, handleAdminDeletePress, postReactions, handleReaction, getSponsorById, trackImpression, trackClick]
  );

  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      <StoryBar onStoryPress={handleStoryPress} onAddStory={handleAddStory} onCreatePost={handleCreatePost} />
      <View style={styles.storyDivider} />
    </View>
  ), [handleStoryPress, handleAddStory, handleCreatePost]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCard}>
        <LinearGradient
          colors={['#1a1710', '#12100d']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.emptyIcon}>📸</Text>
        <Text style={styles.emptyTitle}>Noch keine Beiträge</Text>
        <Text style={styles.emptySubtitle}>
          Teile dein erstes Abenteuer mit der Community!
        </Text>
        <Pressable style={styles.emptyBtn} onPress={handleCreatePost}>
          <Text style={styles.emptyBtnText}>Beitrag erstellen</Text>
        </Pressable>
      </View>
    </View>
  ), [handleCreatePost]);

  const heroLineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroLineOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [heroLineOpacity]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#171618', '#151416', '#141416']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={styles.heroGradient}
      >
        <Animated.View style={[styles.heroPattern, { opacity: heroLineOpacity }]}>
          {[...Array(10)].map((_, i) => (
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
        </Animated.View>
      </LinearGradient>

      <Animated.View
        style={[
          styles.heroHeader,
          { paddingTop: insets.top + 12 },
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 60, 140],
              outputRange: [1, 0.6, 0],
              extrapolate: 'clamp',
            }),
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, 140],
                outputRange: [0, -20],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
        pointerEvents={headerHidden ? 'none' : 'auto'}
      >
        <View style={styles.heroLeft} />

        <View style={styles.feedToggleContainer}>
          <Animated.View
            style={[
              styles.feedToggleIndicator,
              {
                transform: [{
                  translateX: tabIndicatorX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 100],
                  }),
                }],
              },
            ]}
          />
          <Pressable
            style={styles.feedToggleTab}
            onPress={() => handleFeedModeChange('discover')}
            testID="feed-tab-discover"
          >
            <Text style={[
              styles.feedToggleText,
              feedMode === 'discover' && styles.feedToggleTextActive,
            ]}>ENTDECKEN</Text>
          </Pressable>
          <Pressable
            style={styles.feedToggleTab}
            onPress={() => handleFeedModeChange('foryou')}
            testID="feed-tab-foryou"
          >
            <Text style={[
              styles.feedToggleText,
              feedMode === 'foryou' && styles.feedToggleTextActive,
            ]}>FÜR DICH</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.heroIconWrap}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/feed/activity' as any);
          }}
          testID="feed-activity-btn"
        >
          <Bell size={20} color="#BFA35D" />
        </Pressable>
      </Animated.View>

      {!ready ? (
        <View style={styles.loadingPlaceholder}>
          <View style={[styles.placeholderCard, { width: CARD_WIDTH, height: CARD_WIDTH * 1.25 }]} />
        </View>
      ) : (
        <Animated.FlatList
          data={feedItems}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.type === 'promotion' ? `promo_${item.data.id}` : item.data.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 80 },
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: true,
              listener: (event: any) => {
                const y = event.nativeEvent.contentOffset.y;
                if (y > 100 && !headerHidden) setHeaderHidden(true);
                else if (y <= 100 && headerHidden) setHeaderHidden(false);
              },
            }
          )}
          scrollEventThrottle={16}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#BFA35D"
              colors={['#BFA35D']}
              progressBackgroundColor="#1a1710"
            />
          }
          testID="feed-list"
        />
      )}

      <EditPostModal
        visible={editingPost !== null}
        post={editingPost}
        onClose={() => setEditingPost(null)}
      />

      <AdminDeleteModal
        visible={adminDeletePost !== null}
        post={adminDeletePost}
        onClose={() => setAdminDeletePost(null)}
        onConfirm={handleAdminDeleteConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161514',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Dimensions.get('window').height * 0.45,
    zIndex: 0,
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  heroLeft: {
    width: 42,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  feedToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderRadius: 20,
    height: 36,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  feedToggleIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 98,
    height: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.18)',
  },
  feedToggleTab: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  feedToggleText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.35)',
    letterSpacing: 0.8,
  },
  feedToggleTextActive: {
    color: '#BFA35D',
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    borderBottomWidth: 0,
  },
  storyDivider: {
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.12)',
    marginTop: 4,
  },
  listContent: {
  },
  cardWrapper: {
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
    paddingTop: 14,
  },
  cardShadowWrap: {
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        }
      : {}),
    elevation: 10,
    borderRadius: 24,
  },

  emptyContainer: {
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
    paddingTop: 40,
  },
  emptyCard: {
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    height: 300,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#E8DCC8',
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  emptyBtnText: {
    color: '#BFA35D',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  loadingPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
});
