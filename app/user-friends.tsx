import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Platform, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Lock, ChevronLeft, Users, Radio, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RankIcon from '@/components/RankIcon';
import { useFriends } from '@/providers/FriendsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useLiveLocation } from '@/providers/LiveLocationProvider';
import { getUserById } from '@/lib/utils';
import type { SocialUser } from '@/constants/types';

export default function UserFriendsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { getFriendsForUser } = useFriends();
  const { privacy, canViewContent } = useSocial();
  const { friendLocations } = useLiveLocation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  const profile = useMemo(() => getUserById(userId ?? ''), [userId]);
  const isOwnProfile = userId === 'me';

  const canView = useMemo(() => {
    if (isOwnProfile) return true;
    return canViewContent(privacy.showFriends, userId ?? '');
  }, [isOwnProfile, canViewContent, privacy.showFriends, userId]);

  const friends = useMemo(() => {
    if (!canView) return [];
    return getFriendsForUser(userId ?? '');
  }, [canView, getFriendsForUser, userId]);

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const liveSharingUserIds = useMemo(() => {
    return new Set(friendLocations.map((loc) => loc.userId));
  }, [friendLocations]);

  const handleUserPress = useCallback(
    (uid: string) => {
      if (uid === 'me') return;
      router.push({ pathname: '/user-profile', params: { userId: uid } } as any);
    },
    [router],
  );

  const handleLivePress = useCallback(
    (uid: string) => {
      router.push('/(tabs)/livemap' as any);
    },
    [router],
  );

  const renderFriend = useCallback(
    ({ item }: { item: SocialUser }) => {
      const initial = item.displayName.charAt(0).toUpperCase();
      const isLive = liveSharingUserIds.has(item.id);
      return (
        <Pressable
          style={({ pressed }) => [
            styles.userItem,
            isLive && styles.userItemLive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleUserPress(item.id)}
        >
          <View style={styles.avatarWrap}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={[styles.avatar, isLive && styles.avatarLive]} />
            ) : (
              <View style={[styles.avatar, isLive && styles.avatarLive]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            {isLive && (
              <View style={styles.liveDotBadge} />
            )}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.displayName}</Text>
              {isLive && (
                <View style={styles.liveTagInline}>
                  <Radio size={9} color="#4CAF50" />
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.userMetaRow}>
              <RankIcon icon={item.rankIcon} size={12} color="rgba(191,163,93,0.6)" />
              <Text style={styles.userMeta}>
                {item.rank} · {item.ep.toLocaleString()} EP
              </Text>
            </View>
          </View>
          {isLive ? (
            <Pressable
              style={({ pressed }) => [
                styles.liveMapBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() => handleLivePress(item.id)}
              hitSlop={8}
            >
              <MapPin size={14} color="#4CAF50" />
              <Text style={styles.liveMapBtnText}>Karte</Text>
            </Pressable>
          ) : (
            <ChevronLeft size={16} color="rgba(191,163,93,0.3)" style={{ transform: [{ rotate: '180deg' }] }} />
          )}
        </Pressable>
      );
    },
    [handleUserPress, handleLivePress, liveSharingUserIds],
  );

  const renderHeader = () => (
    <Animated.View style={{ opacity: headerFadeAnim }}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
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
          <Users size={28} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>
          {isOwnProfile ? 'Meine Freunde' : `${profile?.displayName ?? ''}`}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isOwnProfile
            ? 'Deine Verbindungen in der Gemeinschaft.'
            : 'Freunde und Verbindungen.'}
        </Text>

        <View style={styles.countCard}>
          <Text style={styles.countNumber}>{friends.length}</Text>
          <Text style={styles.countLabel}>Freunde</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        {!canView ? (
          <>
            {renderHeader()}
            <View style={styles.lockedContainer}>
              <LinearGradient
                colors={['#2a2a2e', '#1c1c1e']}
                style={styles.lockedCard}
              >
                <View style={styles.lockedIconWrap}>
                  <Lock size={28} color="rgba(191,163,93,0.5)" />
                </View>
                <Text style={styles.lockedTitle}>Freundesliste ist privat</Text>
                <Text style={styles.lockedSub}>
                  {profile?.displayName} hat die Sichtbarkeit eingeschränkt.
                </Text>
              </LinearGradient>
            </View>
          </>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Keine Freunde gefunden.
                </Text>
              </View>
            }
          />
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
  listContent: {
    paddingBottom: 30,
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
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  countCard: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  countNumber: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
    marginTop: 2,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.04)',
    marginTop: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  avatarLive: {
    borderColor: 'rgba(76,175,80,0.5)',
    borderWidth: 2,
  },
  liveDotBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#1e1e20',
    zIndex: 2,
  },
  userItemLive: {
    borderColor: 'rgba(76,175,80,0.12)',
    backgroundColor: 'rgba(76,175,80,0.04)',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveTagInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#4CAF50',
    letterSpacing: 0.8,
  },
  liveMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  liveMapBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#4CAF50',
  },
  avatarText: {
    color: '#E8DCC8',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  userMeta: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.5)',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
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
    textAlign: 'center',
    lineHeight: 20,
    color: 'rgba(232,220,200,0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.4)',
  },
});
