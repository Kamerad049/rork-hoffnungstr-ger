import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Lock, Stamp } from 'lucide-react-native';
import WaxSealStamp from '@/components/WaxSealStamp';
import { LinearGradient } from 'expo-linear-gradient';
import RankIcon from '@/components/RankIcon';
import { useTheme } from '@/providers/ThemeProvider';
import { useStampPass } from '@/providers/StampPassProvider';
import { useContent } from '@/providers/ContentProvider';

export default function StampsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stamps, hasStamp, rank, nextRank, progress, totalPlaces } = useStampPass();
  const { places } = useContent();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => {
      const aStamped = stamps.some((s) => s.placeId === a.id);
      const bStamped = stamps.some((s) => s.placeId === b.id);
      if (aStamped && !bStamped) return -1;
      if (!aStamped && bStamped) return 1;
      return 0;
    });
  }, [stamps, places]);

  const handlePlacePress = useCallback(
    (placeId: string) => {
      router.push(`/places/${placeId}` as any);
    },
    [router],
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 50 }]}
      >
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

        <View style={styles.heroIconWrap}>
          <Stamp size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Stempelpass</Text>
        <Text style={styles.heroSubtitle}>
          Sammle Stempel an besonderen Orten und steige im Rang auf.
        </Text>

        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View style={styles.rankDisplay}>
              <RankIcon icon={rank.icon} size={32} color="#BFA35D" />
              <View>
                <Text style={styles.rankLabel}>Dein Rang</Text>
                <Text style={styles.rankName}>{rank.name}</Text>
              </View>
            </View>
            <View style={styles.stampCount}>
              <Text style={styles.stampNumber}>{stamps.length}</Text>
              <Text style={styles.stampTotal}>/ {totalPlaces}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          {nextRank && (
            <Text style={styles.nextRankText}>
              Noch {nextRank.minStamps - stamps.length} Stempel bis zum Rang „{nextRank.name}"
            </Text>
          )}
        </View>
      </LinearGradient>

      <View style={styles.contentArea}>
        <Text style={styles.sectionTitle}>Deine Stempel</Text>

        <View style={styles.grid}>
          {sortedPlaces.map((place) => {
            const stamped = hasStamp(place.id);
            return (
              <Pressable
                key={place.id}
                style={styles.stampTile}
                onPress={() => handlePlacePress(place.id)}
                testID={`stamp-tile-${place.id}`}
              >
                <View style={styles.stampImageWrapper}>
                  <Image
                    source={{ uri: place.images[0] }}
                    style={[styles.stampImage, !stamped && styles.stampImageLocked]}
                    contentFit="cover"
                  />
                  {stamped ? (
                    <View style={styles.sealOverlay}>
                      <WaxSealStamp size={48} color="red" showShine />
                    </View>
                  ) : (
                    <View style={styles.stampLock}>
                      <Lock size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.stampName, stamped && styles.stampNameActive]}
                  numberOfLines={2}
                >
                  {place.title}
                </Text>
                <Text style={styles.stampCity} numberOfLines={1}>
                  {place.city}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroTitle: {
    color: '#E8DCC8',
    fontSize: 24,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  rankName: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  stampCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stampNumber: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  stampTotal: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#BFA35D',
  },
  nextRankText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  contentArea: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 14,
    color: '#E8DCC8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stampTile: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 10,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  stampImageWrapper: {
    position: 'relative',
  },
  stampImage: {
    width: '100%',
    height: 100,
  },
  stampImageLocked: {
    opacity: 0.4,
  },
  sealOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  stampLock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  stampName: {
    fontSize: 13,
    fontWeight: '700' as const,
    paddingHorizontal: 8,
    marginTop: 8,
    color: 'rgba(191,163,93,0.4)',
  },
  stampNameActive: {
    color: '#E8DCC8',
  },
  stampCity: {
    fontSize: 11,
    paddingHorizontal: 8,
    marginTop: 2,
    color: 'rgba(191,163,93,0.3)',
  },
});
