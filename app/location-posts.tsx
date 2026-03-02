import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, MapPin, TrendingUp, Clock, ImageIcon, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { usePosts } from '@/providers/PostsProvider';
import { formatTimeAgo } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 12;
const GRID_GAP = 3;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

type SortMode = 'recent' | 'popular';

export default function LocationPostsScreen() {
  const { location } = useLocalSearchParams<{ location: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getPostsByLocation } = usePosts();
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const locationName = location ?? '';

  const posts = useMemo(() => {
    const all = getPostsByLocation(locationName);
    if (sortMode === 'popular') {
      return [...all].sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount));
    }
    return all;
  }, [getPostsByLocation, locationName, sortMode]);

  const handlePostPress = useCallback((post: FeedPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (post.userId === 'me') {
      console.log('[LOCATION] Own post tapped:', post.id);
    } else {
      router.push({ pathname: '/user-profile', params: { userId: post.userId } } as any);
    }
  }, [router]);

  const handleToggleSort = useCallback((mode: SortMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortMode(mode);
  }, []);

  const renderPost = useCallback(({ item }: { item: FeedPost }) => {
    const hasImage = item.mediaUrls.length > 0;
    return (
      <Pressable
        style={styles.gridTile}
        onPress={() => handlePostPress(item)}
        testID={`location-post-${item.id}`}
      >
        {hasImage ? (
          <Image
            source={{ uri: item.mediaUrls[0] }}
            style={styles.gridTileImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.gridTileTextBg}>
            <Text style={styles.gridTileTextPreview} numberOfLines={4}>
              {item.content}
            </Text>
          </View>
        )}
        <View style={styles.gridTileOverlay}>
          <View style={styles.gridTileBadge}>
            {hasImage ? (
              <ImageIcon size={10} color="#fff" />
            ) : (
              <FileText size={10} color="#fff" />
            )}
          </View>
        </View>
        <View style={styles.gridTileTime}>
          <Text style={styles.gridTileTimeText}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
      </Pressable>
    );
  }, [handlePostPress]);

  const renderHeader = () => (
    <View>
      <View style={styles.locationInfo}>
        <View style={styles.locationIconWrap}>
          <MapPin size={24} color="#BFA35D" />
        </View>
        <Text style={styles.locationName} numberOfLines={2}>{locationName}</Text>
        <Text style={styles.postCount}>
          {posts.length} {posts.length === 1 ? 'Beitrag' : 'Beiträge'}
        </Text>
      </View>

      <View style={styles.sortBar}>
        <Pressable
          style={[styles.sortBtn, sortMode === 'recent' && styles.sortBtnActive]}
          onPress={() => handleToggleSort('recent')}
        >
          <Clock size={14} color={sortMode === 'recent' ? '#0f0e0b' : 'rgba(232,220,200,0.5)'} />
          <Text style={[styles.sortBtnText, sortMode === 'recent' && styles.sortBtnTextActive]}>Neueste</Text>
        </Pressable>
        <Pressable
          style={[styles.sortBtn, sortMode === 'popular' && styles.sortBtnActive]}
          onPress={() => handleToggleSort('popular')}
        >
          <TrendingUp size={14} color={sortMode === 'popular' ? '#0f0e0b' : 'rgba(232,220,200,0.5)'} />
          <Text style={[styles.sortBtnText, sortMode === 'popular' && styles.sortBtnTextActive]}>Beliebteste</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MapPin size={40} color="rgba(191,163,93,0.25)" />
      <Text style={styles.emptyTitle}>Keine Beiträge</Text>
      <Text style={styles.emptySubtitle}>An diesem Ort wurden noch keine öffentlichen Beiträge geteilt.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={20} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Ort</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(15,14,11,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '700' as const,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  locationInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  locationIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  locationName: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  postCount: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  sortBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'center',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  sortBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  sortBtnText: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sortBtnTextActive: {
    color: '#0f0e0b',
  },
  gridRow: {
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: GRID_GAP,
  },
  gridTileImage: {
    width: '100%',
    height: '100%',
  },
  gridTileTextBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1710',
    padding: 8,
    justifyContent: 'center',
  },
  gridTileTextPreview: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500' as const,
  },
  gridTileOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  gridTileBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  gridTileTime: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  gridTileTimeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600' as const,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emptySubtitle: {
    color: 'rgba(232,220,200,0.3)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
