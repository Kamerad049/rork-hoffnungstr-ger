import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Heart, MessageCircle, Share2, MapPin, ChevronLeft, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserById } from '@/lib/utils';
import { REACTION_CONFIG, type Reel, type ReactionType } from '@/constants/types';
import RankIcon from '@/components/RankIcon';
import WavingFlag from '@/components/WavingFlag';
import { useReels } from '@/providers/ReelsProvider';
import { useAuth } from '@/providers/AuthProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} T.`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `vor ${weeks} Wo.`;
  return `vor ${Math.floor(days / 30)} Mon.`;
}

interface ReelFeedItemProps {
  reel: Reel;
  onUserPress: (userId: string) => void;
}

const ReelFeedItem = React.memo(function ReelFeedItem({ reel, onUserPress }: ReelFeedItemProps) {
  const author = getUserById(reel.userId);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  const displayName = author?.displayName ?? 'Unbekannt';
  const username = author?.username ?? 'unknown';
  const avatarUrl = author?.avatarUrl ?? null;
  const rankIcon = author?.rankIcon ?? 'Compass';
  const rank = author?.rank ?? 'Entdecker';
  const initial = displayName.charAt(0).toUpperCase();

  const imageUri = reel.mediaType === 'photo' && reel.imageUrl ? reel.imageUrl : reel.thumbnailUrl;

  const captionLines = reel.caption.split('\n');
  const firstLine = captionLines[0] ?? '';
  const hasMore = reel.caption.length > 100 || captionLines.length > 2;
  const displayCaption = expanded ? reel.caption : firstLine.slice(0, 100);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(prev => !prev);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }, [heartScale]);

  const topReactions = useMemo(() => {
    return Object.entries(reel.reactionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => REACTION_CONFIG[type as ReactionType]);
  }, [reel.reactionCounts]);

  return (
    <View style={itemStyles.container}>
      <View style={itemStyles.header}>
        <Pressable style={itemStyles.authorRow} onPress={() => onUserPress(reel.userId)}>
          <View style={itemStyles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={itemStyles.avatar} contentFit="cover" />
            ) : (
              <View style={itemStyles.avatarFallback}>
                <Text style={itemStyles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={itemStyles.authorInfo}>
            <View style={itemStyles.nameRow}>
              <Text style={itemStyles.displayName} numberOfLines={1}>{displayName}</Text>
              <View style={itemStyles.rankBadge}>
                <RankIcon icon={rankIcon} size={11} color="#BFA35D" />
              </View>
            </View>
            <Text style={itemStyles.timeText}>{formatTimeAgo(reel.createdAt)}</Text>
          </View>
        </Pressable>
      </View>

      <View style={itemStyles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={itemStyles.image}
          contentFit="cover"
          transition={300}
        />
        {reel.mediaType === 'video' && (
          <View style={itemStyles.videoOverlay}>
            <View style={itemStyles.playButton}>
              <Play size={24} color="#fff" fill="#fff" />
            </View>
          </View>
        )}
      </View>

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
          </Pressable>
          <Pressable style={itemStyles.actionBtn} hitSlop={8}>
            <MessageCircle size={22} color="#E8DCC8" />
          </Pressable>
          <Pressable style={itemStyles.actionBtn} hitSlop={8}>
            <Share2 size={21} color="#E8DCC8" />
          </Pressable>
        </View>
      </View>

      <View style={itemStyles.reactionSummary}>
        <View style={itemStyles.reactionEmojis}>
          {topReactions.map((r, i) => (
            <Text key={i} style={itemStyles.reactionEmoji}>{r.emoji}</Text>
          ))}
        </View>
        <Text style={itemStyles.reactionCount}>
          {formatCount(reel.totalReactions + (liked ? 1 : 0))} Reaktionen
        </Text>
      </View>

      <View style={itemStyles.captionArea}>
        <Text style={itemStyles.captionAuthor}>{username}</Text>
        <Text style={itemStyles.captionText}>
          {displayCaption}
          {hasMore && !expanded && (
            <Text style={itemStyles.moreText} onPress={() => setExpanded(true)}> ...mehr</Text>
          )}
        </Text>
      </View>

      {reel.commentCount > 0 && (
        <Pressable style={itemStyles.commentsLink}>
          <Text style={itemStyles.commentsText}>
            Alle {reel.commentCount} Kommentare ansehen
          </Text>
        </Pressable>
      )}

      {reel.location && (
        <View style={itemStyles.locationRow}>
          <MapPin size={11} color="rgba(191,163,93,0.5)" />
          <Text style={itemStyles.locationText}>{reel.location}</Text>
        </View>
      )}
    </View>
  );
});

export default function UserReelFeedScreen() {
  const { userId, initialReelId } = useLocalSearchParams<{ userId: string; initialReelId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Reel>>(null);
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);

  const userReels = useMemo((): Reel[] => {
    return [];
  }, [userId]);

  const initialIndex = useMemo(() => {
    if (!initialReelId) return 0;
    const idx = userReels.findIndex(r => r.id === initialReelId);
    return idx >= 0 ? idx : 0;
  }, [initialReelId, userReels]);

  const author = useMemo(() => getUserById(userId ?? ''), [userId]);

  const handleUserPress = useCallback((uid: string) => {
    if (uid !== 'me') {
      router.push({ pathname: '/user-profile', params: { userId: uid } } as any);
    }
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Reel }) => (
    <ReelFeedItem reel={item} onUserPress={handleUserPress} />
  ), [handleUserPress]);

  const keyExtractor = useCallback((item: Reel) => item.id, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 600,
    offset: 600 * index,
    index,
  }), []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
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
              {author?.displayName ?? 'Beiträge'}
            </Text>
            <Text style={styles.headerSubtitle}>Beiträge</Text>
          </View>
          <View style={styles.backCircle} />
        </View>

        <FlatList
          ref={flatListRef}
          data={userReels}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={(info) => {
            console.log('[REEL-FEED] scrollToIndex failed, retrying...', info);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 100);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Keine Beiträge vorhanden.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
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
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
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
  imageContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: '#1a1a1c',
    position: 'relative',
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
    padding: 2,
  },
  reactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  reactionEmojis: {
    flexDirection: 'row',
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  captionArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
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
