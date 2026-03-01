import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Check, Lock, MapPin, Stamp, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useStampPass } from '@/providers/StampPassProvider';
import RankIcon from '@/components/RankIcon';
import { getUserById } from '@/lib/utils';
import { useAdmin } from '@/providers/AdminProvider';

export default function UserStampsScreen() {
  const { colors } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { isFriend } = useFriends();
  const { privacy, canViewContent } = useSocial();
  const { stamps, hasStamp, rank, nextRank, progress, totalPlaces } = useStampPass();
  const { places } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(0)).current;

  const profile = useMemo(() => getUserById(userId ?? ''), [userId]);
  const isOwnProfile = userId === 'me';

  const canView = useMemo(() => {
    if (isOwnProfile) return true;
    return canViewContent(privacy.showStamps, userId ?? '');
  }, [isOwnProfile, canViewContent, privacy.showStamps, userId]);

  const title = isOwnProfile ? 'Meine Stempel' : `${profile?.displayName ?? ''} – Stempel`;

  const stampCount = isOwnProfile ? stamps.length : (profile?.stampCount ?? 0);

  // TODO: Replace with real user_stamps table query when stamps migration is done
  const mockStampedPlaceIds = useMemo(() => {
    if (isOwnProfile) return stamps.map((s) => s.placeId);
    const count = profile?.stampCount ?? 0;
    return places.slice(0, count).map((p: any) => p.id);
  }, [isOwnProfile, stamps, profile?.stampCount]);

  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => {
      const aStamped = mockStampedPlaceIds.includes(a.id);
      const bStamped = mockStampedPlaceIds.includes(b.id);
      if (aStamped && !bStamped) return -1;
      if (!aStamped && bStamped) return 1;
      return 0;
    });
  }, [mockStampedPlaceIds, places]);

  useEffect(() => {
    const val = places.length > 0 ? stampCount / places.length : 0;
    Animated.timing(progressAnim, {
      toValue: val,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [stampCount, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        {!canView ? (
          <View style={styles.lockedContainer}>
            <LinearGradient
              colors={['#2a2a2e', '#1c1c1e']}
              style={styles.lockedCard}
            >
              <View style={styles.lockedIconWrap}>
                <Lock size={28} color="rgba(191,163,93,0.5)" />
              </View>
              <Text style={styles.lockedTitle}>Stempelkarte ist privat</Text>
              <Text style={styles.lockedSub}>
                {profile?.displayName} hat die Sichtbarkeit eingeschränkt.
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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

              <View style={styles.heroIconWrap}>
                <Stamp size={28} color="#BFA35D" />
              </View>
              <Text style={styles.heroTitle}>
                {isOwnProfile ? 'Meine Stempel' : `${profile?.displayName ?? ''}`}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isOwnProfile
                  ? 'Deine gesammelten Stempel an besonderen Orten.'
                  : 'Gesammelte Stempel an besonderen Orten.'}
              </Text>

              <View style={styles.statsCard}>
                <View style={styles.statsTop}>
                  {isOwnProfile && (
                    <View style={styles.rankDisplay}>
                      <RankIcon icon={rank.icon} size={28} color="#BFA35D" />
                      <View>
                        <Text style={styles.rankLabel}>Rang</Text>
                        <Text style={styles.rankName}>{rank.name}</Text>
                      </View>
                    </View>
                  )}
                  <View style={[styles.stampCountWrap, !isOwnProfile && { flex: 1, alignItems: 'center' as const }]}>
                    <Text style={styles.stampNumber}>{stampCount}</Text>
                    <Text style={styles.stampTotal}>/ {places.length}</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>

                {isOwnProfile && nextRank && (
                  <Text style={styles.nextRankText}>
                    Noch {nextRank.minStamps - stamps.length} Stempel bis zum Rang „{nextRank.name}"
                  </Text>
                )}
                {!isOwnProfile && (
                  <Text style={styles.nextRankText}>
                    {stampCount} von {places.length} Orten besucht
                  </Text>
                )}
              </View>
            </LinearGradient>

            <View style={styles.contentArea}>
              <Text style={styles.sectionTitle}>
                {isOwnProfile ? 'Deine Stempel' : 'Stempelkarte'}
              </Text>

              <View style={styles.grid}>
                {sortedPlaces.map((place) => {
                  const visited = mockStampedPlaceIds.includes(place.id);
                  return (
                    <Pressable
                      key={place.id}
                      style={styles.stampTile}
                      onPress={() => router.push(`/places/${place.id}` as any)}
                      testID={`stamp-tile-${place.id}`}
                    >
                      <View style={styles.imageWrapper}>
                        <Image
                          source={{ uri: place.images[0] }}
                          style={[styles.stampImage, !visited && styles.stampImageLocked]}
                          contentFit="cover"
                        />
                        {visited ? (
                          <View style={styles.stampCheck}>
                            <Check size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View style={styles.stampLock}>
                            <Lock size={16} color="rgba(255,255,255,0.7)" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.stampName, visited && styles.stampNameActive]}
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
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  heroSection: {
    paddingTop: 20,
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
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 19,
    marginBottom: 18,
  },
  statsCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  rankName: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  stampCountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stampNumber: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  stampTotal: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
    fontSize: 18,
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
  imageWrapper: {
    position: 'relative',
  },
  stampImage: {
    width: '100%',
    height: 100,
  },
  stampImageLocked: {
    opacity: 0.4,
  },
  stampCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFA35D',
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
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  lockedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 8,
  },
  lockedSub: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
    color: 'rgba(232,220,200,0.5)',
  },
});
