import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Bookmark, ImageIcon, Film, MapPin, ChevronLeft } from 'lucide-react-native';
import { useReels } from '@/providers/ReelsProvider';
import { getUserById, formatReelCount } from '@/lib/utils';
import type { Reel } from '@/constants/types';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP) / COLUMN_COUNT;
const CARD_HEIGHT = CARD_WIDTH * 1.45;

function SavedReelCard({ reel, onPress, onUnsave }: { reel: Reel; onPress: () => void; onUnsave: () => void }) {
  const author = useMemo(() => {
    const u = getUserById(reel.userId);
    return u ? { displayName: u.displayName, username: u.username } : { displayName: 'Unbekannt', username: 'unknown' };
  }, [reel.userId]);

  const imageSource = reel.mediaType === 'photo' && reel.imageUrl
    ? { uri: reel.imageUrl }
    : { uri: reel.thumbnailUrl };

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`saved-reel-${reel.id}`}>
      <Image source={imageSource} style={styles.cardImage} contentFit="cover" transition={200} />
      <View style={styles.cardOverlay}>
        <View style={styles.cardTopRow}>
          <View style={styles.mediaTag}>
            {reel.mediaType === 'photo' ? (
              <ImageIcon size={10} color="#fff" />
            ) : (
              <Film size={10} color="#fff" />
            )}
          </View>
          <Pressable
            style={styles.unsaveBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onUnsave();
            }}
            hitSlop={8}
          >
            <Bookmark size={14} color="#F5C518" fill="#F5C518" />
          </Pressable>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardCaption} numberOfLines={2}>{reel.caption}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardAuthor}>@{author.username}</Text>
            {reel.location && (
              <View style={styles.cardLocation}>
                <MapPin size={9} color="rgba(255,255,255,0.6)" />
                <Text style={styles.cardLocationText} numberOfLines={1}>{reel.location}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardReactions}>{formatReelCount(reel.totalReactions)} Reaktionen</Text>
        </View>
      </View>
    </Pressable>
  );
}

const MemoizedSavedReelCard = React.memo(SavedReelCard);

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { savedReels, toggleSaveReel, userReels } = useReels();

  const allReels = useMemo((): Reel[] => {
    return [...userReels];
  }, [userReels]);

  const savedReelItems = useMemo((): Reel[] => {
    return savedReels
      .map((id) => allReels.find((r) => r.id === id))
      .filter((r): r is Reel => r !== undefined);
  }, [savedReels, allReels]);

  const handlePress = useCallback((reel: Reel) => {
    router.push({ pathname: '/user-profile', params: { userId: reel.userId } } as any);
  }, [router]);

  const handleUnsave = useCallback((reelId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveReel(reelId);
  }, [toggleSaveReel]);

  const renderItem = useCallback(({ item }: { item: Reel }) => (
    <MemoizedSavedReelCard
      reel={item}
      onPress={() => handlePress(item)}
      onUnsave={() => handleUnsave(item.id)}
    />
  ), [handlePress, handleUnsave]);

  const heroSection = (
    <LinearGradient
      colors={['#1e1d1a', '#1a1918', '#141416']}
      style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <ChevronLeft size={20} color="#BFA35D" />
      </Pressable>
      <View style={styles.heroPattern}>
        {[...Array(6)].map((_, i) => (
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
      </View>
      <Text style={styles.heroTitle}>Gespeicherte Beiträge</Text>
      {savedReelItems.length > 0 && (
        <Text style={styles.heroCount}>{savedReelItems.length} Beiträge</Text>
      )}
    </LinearGradient>
  );

  if (savedReelItems.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {heroSection}
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Bookmark size={40} color="rgba(191,163,93,0.4)" />
          </View>
          <Text style={styles.emptyTitle}>Noch nichts gespeichert</Text>
          <Text style={styles.emptySub}>
            Tippe auf das Lesezeichen-Symbol bei Reels, um Beiträge hier zu speichern.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={savedReelItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={heroSection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  heroSection: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'flex-start' as const,
    marginBottom: 20,
    zIndex: 10,
  },
  heroTitle: {
    color: '#E8DCC8',
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  heroCount: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 30,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1e1e20',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 8,
  },
  mediaTag: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  unsaveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    padding: 8,
    paddingTop: 16,
  },
  cardCaption: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardAuthor: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500' as const,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardLocationText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    maxWidth: 60,
  },
  cardReactions: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#E8DCC8',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptySub: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
