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
import { Rss } from 'lucide-react-native';
import { usePosts } from '@/providers/PostsProvider';
import FeedCardComponent from '@/components/FeedCard';
import type { PostReactionType } from '@/components/FeedCard';
import SponsoredCard from '@/components/SponsoredCard';
import StoryBar from '@/components/StoryBar';
import EditPostModal from '@/components/EditPostModal';
import type { FeedPost, StoryGroup, Promotion } from '@/constants/types';
import { trackRender, measureSinceBoot } from '@/lib/perf';
import { usePromotions } from '@/providers/PromotionProvider';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/constants/queryKeys';

type FeedItem = 
  | { type: 'post'; data: FeedPost }
  | { type: 'promotion'; data: Promotion };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

export default function FeedScreen() {
  trackRender('FeedScreen');
  measureSinceBoot('FeedScreen_render');
  const { allPosts, archivePost, toggleCommentsDisabled } = usePosts();
  const { activePromotions, trackImpression, trackClick, getSponsorById } = usePromotions();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [postReactions, setPostReactions] = useState<Record<string, PostReactionType>>({});
  const [ready, setReady] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sortedPosts = useMemo(() => {
    return [...allPosts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allPosts]);

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

  const handleImagePress = useCallback(
    (imageUrl: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/(tabs)/feed/image-viewer', params: { imageUrl } } as any);
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
              cardHeight={CARD_HEIGHT}
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
              cardHeight={CARD_HEIGHT}
              onCommentPress={handleCommentPress}
              onUserPress={handleUserPress}
              onImagePress={handleImagePress}
              onLocationPress={handleLocationPress}
              onEditPress={handleEditPress}
              onArchivePress={handleArchivePress}
              onToggleCommentsPress={handleToggleCommentsPress}
              reaction={postReactions[post.id] ?? null}
              onReaction={handleReaction}
              isActive={true}
            />
          </View>
        </View>
      );
    },
    [handleCommentPress, handleUserPress, handleImagePress, handleLocationPress, handleEditPress, handleArchivePress, handleToggleCommentsPress, postReactions, handleReaction, getSponsorById, trackImpression, trackClick]
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

      <View style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.heroLabel}>Entdecken</Text>
          <Text style={styles.heroTitle}>Feed</Text>
        </View>
        <View style={styles.heroIconWrap}>
          <Rss size={20} color="#BFA35D" />
        </View>
      </View>

      {!ready ? (
        <View style={styles.loadingPlaceholder}>
          <View style={[styles.placeholderCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]} />
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
            { paddingBottom: insets.bottom + 80 },
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.5)',
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#E8DCC8',
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
    paddingTop: 0,
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
