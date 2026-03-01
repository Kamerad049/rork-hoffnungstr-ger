import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { usePosts } from '@/providers/PostsProvider';
import FeedCardComponent from '@/components/FeedCard';
import type { PostReactionType } from '@/components/FeedCard';
import StoryBar from '@/components/StoryBar';
import type { FeedPost, StoryGroup } from '@/constants/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = 24;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
const CARD_GAP = 14;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const STORY_BAR_HEIGHT = 100;
const CARD_HEIGHT = Math.min(CARD_WIDTH * 1.45, SCREEN_HEIGHT - 240);

export default function FeedScreen() {
  const { allPosts } = usePosts();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [postReactions, setPostReactions] = useState<Record<string, PostReactionType>>({});
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sortedPosts = useMemo(() => {
    return [...allPosts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allPosts]);

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

  const onScrollEnd = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SNAP_INTERVAL);
      if (index !== activeIndex && index >= 0 && index < sortedPosts.length) {
        setActiveIndex(index);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [activeIndex, sortedPosts.length]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: FeedPost; index: number }) => {
      const position = index * SNAP_INTERVAL;
      const inputRange = [
        position - SNAP_INTERVAL,
        position,
        position + SNAP_INTERVAL,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.9, 1, 0.9],
        extrapolate: 'clamp',
      });
      const rotateY = scrollX.interpolate({
        inputRange,
        outputRange: ['4deg', '0deg', '-4deg'],
        extrapolate: 'clamp',
      });
      const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [12, 0, 12],
        extrapolate: 'clamp',
      });
      const cardOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.55, 1, 0.55],
        extrapolate: 'clamp',
      });

      return (
        <View style={{ width: CARD_WIDTH + CARD_GAP, alignItems: 'center' }}>
          <Animated.View
            style={{
              width: CARD_WIDTH,
              transform: [{ scale }, { perspective: 1000 }, { rotateY }, { translateY }],
              opacity: cardOpacity,
            }}
          >
            <View style={styles.cardShadowWrap}>
              <FeedCardComponent
                post={item}
                cardWidth={CARD_WIDTH}
                cardHeight={CARD_HEIGHT}
                onCommentPress={handleCommentPress}
                onUserPress={handleUserPress}
                onImagePress={handleImagePress}
                reaction={postReactions[item.id] ?? null}
                onReaction={handleReaction}
                isActive={index === activeIndex}
              />
            </View>
          </Animated.View>
        </View>
      );
    },
    [scrollX, handleCommentPress, handleUserPress, handleImagePress, postReactions, handleReaction, activeIndex]
  );

  const renderPagination = () => {
    if (sortedPosts.length <= 1) return null;
    const maxDots = Math.min(sortedPosts.length, 7);
    return (
      <View style={styles.pagination}>
        {sortedPosts.slice(0, maxDots).map((_, i) => {
          const dotScale = scrollX.interpolate({
            inputRange: [
              (i - 1) * SNAP_INTERVAL,
              i * SNAP_INTERVAL,
              (i + 1) * SNAP_INTERVAL,
            ],
            outputRange: [0.7, 1.2, 0.7],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (i - 1) * SNAP_INTERVAL,
              i * SNAP_INTERVAL,
              (i + 1) * SNAP_INTERVAL,
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
        {sortedPosts.length > maxDots && (
          <Text style={styles.moreDots}>+{sortedPosts.length - maxDots}</Text>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={[styles.emptyContainer, { width: SCREEN_WIDTH - 48 }]}>
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
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#171618', '#151416', '#141416']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={styles.heroGradient}
      >
        <View style={styles.bgPattern}>
          {[...Array(16)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.bgLine,
                {
                  top: 20 + i * 32,
                  opacity: 0.04 + i * 0.006,
                  transform: [{ rotate: '-12deg' }],
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <View style={[styles.storySection, { paddingTop: insets.top }]}>
        <StoryBar onStoryPress={handleStoryPress} onAddStory={handleAddStory} onCreatePost={handleCreatePost} />
      </View>

      <View style={styles.storyGap} />
      <View style={styles.carouselSection}>
        {!ready ? (
          <View style={styles.loadingPlaceholder}>
            <View style={[styles.placeholderCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]} />
          </View>
        ) : (
        sortedPosts.length > 0 ? (
          <Animated.FlatList
            data={sortedPosts}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: CARD_HORIZONTAL_PADDING - CARD_GAP / 2,
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={onScrollEnd}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH + CARD_GAP,
              offset: (CARD_WIDTH + CARD_GAP) * index,
              index,
            })}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={Platform.OS !== 'web'}
            testID="feed-carousel"
          />
        ) : (
          renderEmpty()
        )
        )}
      </View>

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
    height: SCREEN_HEIGHT * 0.55,
    zIndex: 0,
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  bgLine: {
    position: 'absolute' as const,
    left: -60,
    right: -60,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  storySection: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.12)',
  },
  storyGap: {
    height: 8,
  },
  carouselSection: {
    flex: 1,
    justifyContent: 'center',
  },
  cardShadowWrap: {
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
        }
      : {}),
    elevation: 12,
    borderRadius: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BFA35D',
  },
  moreDots: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 10,
    fontWeight: '600' as const,
    marginLeft: 4,
  },

  emptyContainer: {
    alignSelf: 'center',
    height: CARD_HEIGHT,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    height: CARD_HEIGHT,
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
