import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions, Platform } from 'react-native';
import { useAlert } from '@/providers/AlertProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { UserPlus, UserCheck, UserX, MessageCircle, Award, FileText, Users, ChevronLeft, ChevronRight, Ban, ShieldOff, MapPin, Home, Heart, ChevronDown, ChevronUp, UserMinus, Trophy, ShieldHalf, Mountain, Flame, Scale, Flag, Swords, Crown, Anchor, Church, HandHeart, TreePine, Handshake, Eye, Shield, Radio, Grid3x3, AtSign, Film, ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { usePosts } from '@/providers/PostsProvider';
import { useStories } from '@/providers/StoriesProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useLiveLocation } from '@/providers/LiveLocationProvider';
import { getUserById } from '@/lib/utils';
import type { SocialUser, Reel, FeedPost, Gender, Religion, CrossStyle } from '@/constants/types';
import { GENDER_OPTIONS, RELIGION_OPTIONS } from '@/constants/types';
import type { OrdenDefinition } from '@/constants/orden';

import RankIcon from '@/components/RankIcon';
import WavingFlag from '@/components/WavingFlag';
import OrdenBadge from '@/components/OrdenBadge';
import LatinCrossIcon from '@/components/LatinCrossIcon';
import OrthodoxCrossIcon from '@/components/OrthodoxCrossIcon';
import GenderIcon from '@/components/GenderIcon';
import NowPlayingWidget from '@/components/NowPlayingWidget';
import { useSpotify } from '@/providers/SpotifyProvider';
import { useUserOrdenQuery } from '@/hooks/useOrden';
import * as Haptics from 'expo-haptics';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 3;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

type ProfileTab = 'posts' | 'tagged';

const VALUE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'Familie': Heart,
  'Ehre': ShieldHalf,
  'Heimat': Mountain,
  'Glaube': Flame,
  'Verantwortung': Scale,
  'Treue': Anchor,
  'Freiheit': Flag,
  'Stärke': Swords,
  'Disziplin': Crown,
  'Mut': Shield,
  'Tradition': Church,
  'Zusammenhalt': Handshake,
  'Respekt': HandHeart,
  'Aufrichtigkeit': Eye,
  'Demut': TreePine,
};



function PostGridItem({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }, [scaleAnim]);

  const hasImage = post.mediaUrls.length > 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.gridTile}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {hasImage ? (
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={styles.gridTileImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.gridTileTextBg}>
            <Text style={styles.gridTileTextPreview} numberOfLines={4}>
              {post.content}
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
      </Pressable>
    </Animated.View>
  );
}

function ReelGridItem({ reel, onPress }: { reel: Reel; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }, [scaleAnim]);

  const thumbUri = reel.mediaType === 'photo' && reel.imageUrl ? reel.imageUrl : reel.thumbnailUrl;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.gridTile}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image
          source={{ uri: thumbUri }}
          style={styles.gridTileImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.gridTileOverlay}>
          <View style={styles.gridTileBadge}>
            {reel.mediaType === 'video' ? (
              <Film size={10} color="#fff" />
            ) : (
              <ImageIcon size={10} color="#fff" />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { isFriend, hasSentRequest, hasReceivedRequest, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, friends, leaderboard, blockUser, unblockUser, isBlocked } = useFriends();
  const { profile: socialProfile, isUserFlagActive, isFlagActive: isOwnFlagActive, privacy, canViewContent } = useSocial();
  const { allPosts } = usePosts();
  const { stories, isStoryViewed } = useStories();

  const [friendMenuOpen, setFriendMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const statScaleAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const { friendLocations, isSharing: isMeSharing } = useLiveLocation();
  const { canUserSeeMyMusic, getTrackForUser } = useSpotify();
  const myValues = socialProfile.values ?? [];
  const myBirthplace = socialProfile.birthplace ?? '';
  const myResidence = socialProfile.residence ?? '';
  const { user: authUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isOwnProfile = !!(authUser && userId && authUser.id === userId);

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.stagger(120, statScaleAnims.map(anim =>
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      })
    )).start();
  }, []);

  const userHasFlag = useMemo(() => {
    if (!userId) return false;
    if (isOwnProfile) return isOwnFlagActive;
    return isUserFlagActive(userId);
  }, [userId, isOwnProfile, isOwnFlagActive, isUserFlagActive]);

  const flagWaveAnim = useRef(new Animated.Value(0)).current;
  const flagGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userHasFlag) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flagWaveAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(flagWaveAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(flagGlowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(flagGlowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    } else {
      flagWaveAnim.setValue(0);
      flagGlowAnim.setValue(0);
    }
  }, [userHasFlag]);

  const flagRotate = flagWaveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-4deg', '4deg'],
  });

  const glowBorderColor = flagGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(191,163,93,0.3)', 'rgba(191,163,93,0.8)'],
  });

  const storyGroupIndex = useMemo(() => {
    if (!userId) return -1;
    const targetId = isOwnProfile ? 'me' : userId;
    return stories.findIndex((g) => g.userId === targetId && g.stories.length > 0);
  }, [userId, isOwnProfile, stories]);

  const hasActiveStory = storyGroupIndex >= 0;

  const hasUnviewedStories = useMemo(() => {
    if (storyGroupIndex < 0) return false;
    const group = stories[storyGroupIndex];
    return group.stories.some((s) => !isStoryViewed(s.id));
  }, [storyGroupIndex, stories, isStoryViewed]);

  const handleAvatarStoryPress = useCallback(() => {
    if (!hasActiveStory || storyGroupIndex < 0) return;
    router.push({ pathname: '/story-viewer', params: { groupIndex: String(storyGroupIndex) } } as any);
  }, [hasActiveStory, storyGroupIndex, router]);

  const profile = useMemo((): SocialUser | undefined => {
    if (!userId) return undefined;
    if (isOwnProfile) {
      const meEntry = leaderboard.find((u) => u.id === 'me');
      const ownPostCount = allPosts.filter((p) => p.userId === 'me').length;
      return {
        id: authUser!.id,
        username: authUser!.name.toLowerCase().replace(/\s+/g, ''),
        displayName: socialProfile.displayName || authUser!.name,
        bio: socialProfile.bio || '',
        avatarUrl: socialProfile.avatarUrl,
        rank: meEntry?.rank ?? 'Entdecker',
        rankIcon: meEntry?.rankIcon ?? 'Compass',
        ep: meEntry?.ep ?? 0,
        stampCount: meEntry?.stampCount ?? 0,
        postCount: ownPostCount,
        friendCount: friends.length,
        values: socialProfile.values ?? [],
        birthplace: socialProfile.birthplace ?? '',
        residence: socialProfile.residence ?? '',
        bundesland: socialProfile.bundesland ?? '',
        gender: socialProfile.gender,
        religion: socialProfile.religion,
        crossStyle: socialProfile.crossStyle,
        showGender: socialProfile.showGender,
        showReligion: socialProfile.showReligion,
      };
    }
    const mockUser = getUserById(userId);
    if (mockUser) return mockUser;
    return undefined;
  }, [userId, authUser, socialProfile, friends, allPosts, leaderboard]);

  const userReels = useMemo((): Reel[] => {
    return [];
  }, [userId]);

  const userFeedPosts = useMemo((): FeedPost[] => {
    if (!userId) return [];
    const uid = isOwnProfile ? 'me' : userId;
    return allPosts.filter((p) => p.userId === uid).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [userId, isOwnProfile, allPosts]);

  const taggedReels = useMemo((): Reel[] => {
    return [];
  }, [userId]);

  const { earnedIds: userOrdenIds, earnedOrden: userOrdenAll } = useUserOrdenQuery(userId);

  const userOrden = useMemo(() => {
    return userOrdenAll.slice(0, 5);
  }, [userOrdenAll]);

  const currentTabData = useMemo((): Reel[] => {
    switch (activeTab) {
      case 'posts': return userReels;
      case 'tagged': return taggedReels;
      default: return [];
    }
  }, [activeTab, userReels, taggedReels]);

  const connectionScore = useMemo(() => {
    if (!profile || isOwnProfile) return null;
    const theirValues = profile.values ?? [];
    const theirBirthplace = profile.birthplace ?? '';
    const theirResidence = profile.residence ?? '';
    const theirBundesland = profile.bundesland ?? '';

    if (myValues.length === 0 && !myBirthplace && !myResidence) return null;
    if (theirValues.length === 0 && !theirBirthplace && !theirResidence) return null;

    let score = 0;
    let maxScore = 0;

    if (myValues.length > 0 && theirValues.length > 0) {
      const overlap = myValues.filter((v) => theirValues.includes(v)).length;
      const maxPossible = Math.max(myValues.length, theirValues.length);
      score += (overlap / maxPossible) * 60;
      maxScore += 60;
    }

    if (myResidence && theirResidence) {
      if (myResidence.toLowerCase().trim() === theirResidence.toLowerCase().trim()) {
        score += 25;
      } else if (socialProfile.bundesland && theirBundesland && socialProfile.bundesland === theirBundesland) {
        score += 12;
      }
      maxScore += 25;
    }

    if (myBirthplace && theirBirthplace) {
      if (myBirthplace.toLowerCase().trim() === theirBirthplace.toLowerCase().trim()) {
        score += 15;
      }
      maxScore += 15;
    }

    if (maxScore === 0) return null;
    return Math.round((score / maxScore) * 100);
  }, [profile, isOwnProfile, myValues, myBirthplace, myResidence, socialProfile.bundesland]);

  const connectionLabel = useMemo(() => {
    if (connectionScore === null) return '';
    if (connectionScore >= 80) return 'Seelenverwandt';
    if (connectionScore >= 60) return 'Stark verbunden';
    if (connectionScore >= 40) return 'Guter Draht';
    if (connectionScore >= 20) return 'Einiges gemeinsam';
    if (connectionScore === 0) return 'Keine Gemeinsamkeiten';
    return 'Wenig Überschneidung';
  }, [connectionScore]);

  const connectionColor = useMemo(() => {
    if (connectionScore === null) return '#BFA35D';
    if (connectionScore >= 80) return '#D4AF37';
    if (connectionScore >= 60) return '#BFA35D';
    if (connectionScore >= 40) return '#9B8A5A';
    return '#6B6252';
  }, [connectionScore]);

  const friendStatus = useMemo(() => {
    if (!userId) return 'none';
    if (isFriend(userId)) return 'friend' as const;
    if (hasReceivedRequest(userId)) return 'received' as const;
    if (hasSentRequest(userId)) return 'sent' as const;
    return 'none' as const;
  }, [userId, isFriend, hasSentRequest, hasReceivedRequest]);

  const toggleFriendMenu = useCallback(() => {
    const opening = !friendMenuOpen;
    setFriendMenuOpen(opening);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(dropdownAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [friendMenuOpen, dropdownAnim]);

  const handleRemoveFriend = useCallback(() => {
    if (!userId) return;
    showAlert(
      'Person entfolgen',
      `Wenn du ${profile?.displayName ?? 'dieser Person'} entfolgst, siehst du keine Beiträge und Storys mehr von ihr.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfolgen',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeFriend(userId);
            setFriendMenuOpen(false);
            dropdownAnim.setValue(0);
          },
        },
      ]
    );
  }, [userId, profile, removeFriend, dropdownAnim]);

  const handleAddFriend = useCallback(() => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendFriendRequest(userId);
  }, [userId, sendFriendRequest]);

  const handleCancelRequest = useCallback(() => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cancelFriendRequest(userId);
  }, [userId, cancelFriendRequest]);

  const handleAcceptRequest = useCallback(() => {
    if (!userId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptFriendRequest(userId);
  }, [userId, acceptFriendRequest]);

  const handleRejectRequest = useCallback(() => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rejectFriendRequest(userId);
  }, [userId, rejectFriendRequest]);

  const handleMessage = useCallback(() => {
    if (!userId) return;
    router.push({ pathname: '/direct-chat', params: { partnerId: userId } } as any);
  }, [userId, router]);

  const userIsBlocked = userId ? isBlocked(userId) : false;

  const handleBlock = useCallback(() => {
    if (!userId) return;
    showAlert(
      'Person sperren',
      `${profile?.displayName ?? 'Diese Person'} wird gesperrt und komplett unsichtbar für dich.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperren',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            blockUser(userId);
          },
        },
      ]
    );
  }, [userId, profile, blockUser]);

  const handleUnblock = useCallback(() => {
    if (!userId) return;
    showAlert(
      'Sperre aufheben',
      `${profile?.displayName ?? 'Diese Person'} kann dich wieder finden und deine Inhalte sehen.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entsperren',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            unblockUser(userId);
          },
        },
      ]
    );
  }, [userId, profile, unblockUser]);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    const val = tab === 'posts' ? 0 : 1;
    Animated.spring(tabIndicatorAnim, {
      toValue: val,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [activeTab, tabIndicatorAnim]);

  const handleReelPress = useCallback((reel: Reel) => {
    console.log('[USER-PROFILE] Reel tapped:', reel.id);
    router.push({ pathname: '/user-reel-feed', params: { userId, initialReelId: reel.id } } as any);
  }, [userId, router]);

  const handlePostPress = useCallback((post: FeedPost) => {
    console.log('[USER-PROFILE] Post tapped:', post.id);
    router.push({ pathname: '/user-reel-feed', params: { userId, initialPostId: post.id } } as any);
  }, [userId, router]);

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: '#141416', paddingTop: insets.top + 12, paddingHorizontal: 20 }]}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
            hitSlop={12}
            style={styles.floatingBackBtn}
          >
            <ChevronLeft size={20} color="#BFA35D" />
          </Pressable>
          <View style={[styles.centered, { flex: 1 }]}>
            <Text style={[styles.errorText, { color: 'rgba(232,220,200,0.4)' }]}>
              Benutzer nicht gefunden
            </Text>
          </View>
        </View>
      </>
    );
  }

  const initial = profile.displayName.charAt(0).toUpperCase();

  const avatarContent = profile.avatarUrl ? (
    <Image source={{ uri: profile.avatarUrl }} style={styles.avatarInner} contentFit="cover" transition={200} />
  ) : (
    <View style={styles.avatarInner}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );

  const renderAvatar = () => {
    if (hasActiveStory) {
      return (
        <Pressable onPress={handleAvatarStoryPress} testID="user-avatar-story">
          <View style={[styles.avatarRingDefault, { borderColor: 'rgba(191,163,93,0.45)', borderWidth: 2.5 }]}>
            {avatarContent}
          </View>
        </Pressable>
      );
    }

    if (userHasFlag) {
      return (
        <Animated.View style={[styles.avatarRingGlow, { borderColor: glowBorderColor }]}>
          {avatarContent}
        </Animated.View>
      );
    }

    return (
      <View style={styles.avatarRingDefault}>
        {avatarContent}
      </View>
    );
  };

  const tabIndicatorTranslateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - 32) / 2],
  });

  const renderEmptyTab = () => {
    const isPostsTab = activeTab === 'posts';
    return (
      <View style={styles.emptyTabContainer}>
        {isPostsTab ? (
          <Grid3x3 size={40} color="rgba(191,163,93,0.25)" />
        ) : (
          <AtSign size={40} color="rgba(191,163,93,0.25)" />
        )}
        <Text style={styles.emptyTabTitle}>
          {isPostsTab ? 'Noch keine Beiträge' : 'Keine Markierungen'}
        </Text>
        <Text style={styles.emptyTabSubtitle}>
          {isPostsTab
            ? `${profile.displayName} hat noch keine Beiträge geteilt.`
            : `Beiträge, in denen ${profile.displayName} markiert wurde, erscheinen hier.`}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[styles.container, { backgroundColor: '#141416' }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: headerFadeAnim }}>
          <LinearGradient
            colors={['#1e1d1a', '#1a1918', '#141416']}
            style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
          >
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
              hitSlop={12}
              style={styles.floatingBackBtn}
            >
              <ChevronLeft size={20} color="#BFA35D" />
            </Pressable>
            <View style={styles.heroPattern}>
              <LinearGradient
                colors={['rgba(10,10,10,0.85)', 'rgba(10,10,10,0.5)', 'rgba(10,10,10,0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0.6 }}
                style={[styles.heroColorBand, styles.heroBandBlack]}
              />
              <LinearGradient
                colors={['rgba(180,30,30,0.65)', 'rgba(160,25,25,0.35)', 'rgba(140,20,20,0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0.6 }}
                style={[styles.heroColorBand, styles.heroBandRed]}
              />
              <LinearGradient
                colors={['rgba(212,175,55,0.55)', 'rgba(191,163,93,0.3)', 'rgba(170,140,50,0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0.6 }}
                style={[styles.heroColorBand, styles.heroBandGold]}
              />
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.heroLine,
                    {
                      top: 14 + i * 22,
                      opacity: 0.04 + i * 0.006,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.avatarArea}>
              <View style={styles.avatarWrapper}>
                {userHasFlag && (
                  <Animated.View
                    style={[
                      styles.flagBadge,
                      { transform: [{ rotate: flagRotate }] },
                    ]}
                  >
                    <WavingFlag width={18} height={12} borderRadius={3} />
                  </Animated.View>
                )}
                {renderAvatar()}
              </View>
            </View>

            <Text style={styles.heroName}>{profile.displayName}</Text>
            <Text style={styles.heroUsername}>@{profile.username}</Text>

            {((profile.showGender && profile.gender) || (profile.showReligion && profile.religion) || (profile.crossStyle && profile.crossStyle !== 'none')) ? (
              <View style={styles.faithGenderRow}>
                {profile.showGender && profile.gender ? (
                  <View style={styles.faithGenderChip}>
                    <GenderIcon gender={profile.gender} size={14} color="rgba(191,163,93,0.7)" />
                    <Text style={styles.faithGenderChipText}>
                      {GENDER_OPTIONS.find(g => g.value === profile.gender)?.label}
                    </Text>
                  </View>
                ) : null}
                {profile.showReligion && profile.religion ? (
                  <View style={styles.faithGenderChip}>
                    <Text style={styles.faithGenderChipText}>
                      {RELIGION_OPTIONS.find(r => r.value === profile.religion)?.label}
                    </Text>
                  </View>
                ) : null}
                {profile.crossStyle && profile.crossStyle !== 'none' ? (
                  <View style={styles.crossBadge}>
                    {profile.crossStyle === 'orthodox' ? (
                      <OrthodoxCrossIcon size={16} color="#BFA35D" />
                    ) : (
                      <LatinCrossIcon size={16} color="#BFA35D" />
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.rankPill}>
              <RankIcon icon={profile.rankIcon} size={14} color="#BFA35D" />
              <Text style={styles.rankPillText}>{profile.rank}</Text>
              <View style={styles.rankDot} />
              <Text style={styles.rankXp}>{profile.ep.toLocaleString()} EP</Text>
            </View>

            {profile.bio.length > 0 && (
              <Text style={styles.heroBio}>{profile.bio}</Text>
            )}

            {profile.values && profile.values.length > 0 && (isOwnProfile || canViewContent(privacy.showValues, userId ?? '')) && (
              <View style={styles.valuesRow}>
                {profile.values.slice(0, 5).map((v) => {
                  const IconComp = VALUE_ICONS[v] ?? Shield;
                  return (
                    <View key={v} style={styles.valueItem}>
                      <IconComp size={14} color="rgba(191,163,93,0.7)" />
                      <Text style={styles.valueItemText}>{v}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {(() => {
              const showBirth = profile.birthplace && (isOwnProfile || canViewContent(privacy.showBirthplace, userId ?? ''));
              const showRes = profile.residence && (isOwnProfile || canViewContent(privacy.showResidence, userId ?? ''));
              const showBl = profile.bundesland && (isOwnProfile || canViewContent(privacy.showBundesland, userId ?? ''));
              if (!showBirth && !showRes && !showBl) return null;
              return (
                <View style={styles.locationRow}>
                  {showBirth ? (
                    <View style={styles.locationChip}>
                      <MapPin size={11} color="rgba(191,163,93,0.6)" />
                      <Text style={styles.locationChipText}>{profile.birthplace}</Text>
                    </View>
                  ) : null}
                  {showRes ? (
                    <View style={styles.locationChip}>
                      <Home size={11} color="rgba(191,163,93,0.6)" />
                      <Text style={styles.locationChipText}>{profile.residence}</Text>
                    </View>
                  ) : null}
                  {showBl ? (
                    <View style={styles.blChip}>
                      <Text style={styles.blChipText}>{profile.bundesland}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })()}

            {userHasFlag && (
              <View style={styles.flagActiveStrip}>
                <WavingFlag width={18} height={12} borderRadius={2} />
                <Text style={styles.flagActiveStripText}>Zeigt heute Flagge</Text>
              </View>
            )}

            {(() => {
              const isLive = isOwnProfile
                ? isMeSharing
                : !!(userId && friendLocations.some((loc) => loc.userId === userId && new Date(loc.expiresAt).getTime() > Date.now()));
              if (!isLive) return null;
              return (
                <View style={styles.liveLocationStrip}>
                  <View style={styles.liveLocationDot} />
                  <Radio size={14} color="#4CAF50" />
                  <Text style={styles.liveLocationStripText}>
                    {isOwnProfile ? 'Du teilst deinen Live-Standort' : 'Teilt gerade Live-Standort'}
                  </Text>
                </View>
              );
            })()}
          </LinearGradient>
        </Animated.View>

        {/* Spotify widget hidden for now */}
        {false ? (() => {
          if (!userId || userIsBlocked) return null;
          const track = getTrackForUser(userId);
          if (!track) return null;
          return <NowPlayingWidget track={track!} />;
        })() : null}

        <View style={styles.statsBar}>
          {[
            { label: 'Beiträge', value: userFeedPosts.length || profile.postCount, icon: FileText, route: '/user-posts' },
            { label: 'Freunde', value: profile.friendCount, icon: Users, route: '/user-friends' },
            { label: 'Stempel', value: profile.stampCount, icon: Award, route: '/user-stamps' },
          ].map((stat, idx) => (
            <Animated.View
              key={stat.label}
              style={[
                styles.statItem,
                { transform: [{ scale: statScaleAnims[idx] }] },
              ]}
            >
              <Pressable
                style={styles.statItemInner}
                onPress={() => router.push({ pathname: stat.route, params: { userId } } as any)}
                testID={`user-${stat.label.toLowerCase()}-stat`}
              >
                <View style={styles.statIconWrap}>
                  <stat.icon size={16} color="#BFA35D" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Pressable>
              {idx < 2 && <View style={styles.statDivider} />}
            </Animated.View>
          ))}
        </View>

        {connectionScore !== null && !isOwnProfile && (
          <View style={styles.connectionCard}>
            <LinearGradient
              colors={['rgba(191,163,93,0.06)', 'rgba(191,163,93,0.02)']}
              style={styles.connectionGradient}
            >
              <View style={styles.connectionTop}>
                <View style={styles.connectionIconWrap}>
                  <Heart size={16} color={connectionColor} fill={connectionColor} />
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionTitle}>Verbundenheit</Text>
                  <Text style={[styles.connectionLabelText, { color: connectionColor }]}>{connectionLabel}</Text>
                </View>
                <Text style={[styles.connectionPercent, { color: connectionColor }]}>{connectionScore}%</Text>
              </View>
              <View style={styles.connectionBarBg}>
                <View style={[styles.connectionBarFill, { width: `${connectionScore}%`, backgroundColor: connectionColor }]} />
              </View>
              {(() => {
                const theirValues = profile.values ?? [];
                const shared = myValues.filter((v) => theirValues.includes(v));
                if (shared.length === 0) return null;
                return (
                  <View style={styles.sharedRow}>
                    <Text style={styles.sharedLabel}>Gemeinsam:</Text>
                    {shared.map((v) => (
                      <View key={v} style={styles.sharedChip}>
                        <Text style={[styles.sharedChipText, { color: connectionColor }]}>{v}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </LinearGradient>
          </View>
        )}

        {!isOwnProfile && !userIsBlocked && (
          <View style={styles.actionArea}>
            <View style={styles.actionButtons}>
              {friendStatus === 'friend' ? (
                <Pressable
                  style={styles.friendActiveBtn}
                  onPress={toggleFriendMenu}
                  testID="friend-dropdown-toggle"
                >
                  <UserCheck size={16} color="#BFA35D" />
                  <Text style={styles.friendActiveBtnText}>Freund</Text>
                  {friendMenuOpen ? (
                    <ChevronUp size={14} color="#BFA35D" />
                  ) : (
                    <ChevronDown size={14} color="#BFA35D" />
                  )}
                </Pressable>
              ) : friendStatus === 'received' ? (
                <>
                  <Pressable style={styles.acceptBtn} onPress={handleAcceptRequest}>
                    <UserCheck size={16} color="#141416" />
                    <Text style={styles.acceptBtnText}>Annehmen</Text>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={handleRejectRequest}>
                    <UserX size={16} color="rgba(232,220,200,0.5)" />
                    <Text style={styles.rejectBtnText}>Ablehnen</Text>
                  </Pressable>
                </>
              ) : friendStatus === 'sent' ? (
                <Pressable style={styles.sentBtn} onPress={handleCancelRequest} testID="cancel-request-btn">
                  <UserX size={16} color="rgba(232,220,200,0.4)" />
                  <Text style={styles.sentBtnText}>Angefragt</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.addBtn} onPress={handleAddFriend}>
                  <LinearGradient
                    colors={['#BFA35D', '#A08940']}
                    style={styles.addBtnGradient}
                  >
                    <UserPlus size={16} color="#141416" />
                    <Text style={styles.addBtnText}>Freund hinzufügen</Text>
                  </LinearGradient>
                </Pressable>
              )}
              <Pressable style={styles.msgBtn} onPress={handleMessage}>
                <MessageCircle size={16} color="#BFA35D" />
                <Text style={styles.msgBtnText}>Nachricht</Text>
              </Pressable>
            </View>

            {friendStatus === 'friend' && (
              <Animated.View
                style={[
                  styles.dropdown,
                  {
                    maxHeight: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 120],
                    }),
                    opacity: dropdownAnim,
                    marginTop: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 8],
                    }),
                  },
                ]}
              >
                <Pressable
                  style={styles.dropdownItem}
                  onPress={handleRemoveFriend}
                  testID="unfriend-btn"
                >
                  <UserMinus size={15} color="#E8DCC8" />
                  <Text style={styles.dropdownText}>Person entfolgen</Text>
                </Pressable>
                <View style={styles.dropdownDivider} />
                <Pressable
                  style={styles.dropdownItem}
                  onPress={handleBlock}
                  testID="block-user-btn"
                >
                  <Ban size={15} color="#C06060" />
                  <Text style={[styles.dropdownText, { color: '#C06060' }]}>Person sperren</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        )}

        {!isOwnProfile && userIsBlocked && (
          <View style={styles.blockedArea}>
            <View style={styles.blockedCard}>
              <Ban size={18} color="#C06060" />
              <View style={styles.blockedTextWrap}>
                <Text style={styles.blockedTitle}>Person gesperrt</Text>
                <Text style={styles.blockedSub}>
                  Diese Person kann dich nicht finden und deine Inhalte nicht sehen.
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.unblockBtn}
              onPress={handleUnblock}
              testID="unblock-user-btn"
            >
              <ShieldOff size={15} color="#BFA35D" />
              <Text style={styles.unblockBtnText}>Sperre aufheben</Text>
            </Pressable>
          </View>
        )}

        {userOrden.length > 0 && !userIsBlocked && (
          <View style={styles.ordenPreview}>
            <View style={styles.ordenPreviewHeader}>
              <View style={styles.ordenPreviewLeft}>
                <View style={styles.ordenPreviewIcon}>
                  <Trophy size={14} color="#BFA35D" />
                </View>
                <View>
                  <Text style={styles.ordenPreviewTitle}>Ordenshalle</Text>
                  <Text style={styles.ordenPreviewSub}>{userOrdenIds.size} Orden errungen</Text>
                </View>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ordenPreviewScroll}
              scrollEnabled={false}
            >
              {userOrden.map(orden => (
                <View key={orden.id} style={styles.ordenPreviewItem}>
                  <OrdenBadge orden={orden} earned size="small" showName={false} animate={false} />
                </View>
              ))}
              {userOrdenIds.size > 5 && (
                <View style={styles.ordenMoreBadge}>
                  <Text style={styles.ordenMoreText}>+{userOrdenIds.size - 5}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {!userIsBlocked && (
          <>
            <View style={styles.tabBar}>
              <Pressable
                style={styles.tabBtn}
                onPress={() => handleTabChange('posts')}
                testID="user-profile-tab-posts"
              >
                <Grid3x3 size={20} color={activeTab === 'posts' ? '#BFA35D' : 'rgba(232,220,200,0.35)'} />
                <Text style={[styles.tabBtnText, activeTab === 'posts' && styles.tabBtnTextActive]}>Beiträge</Text>
              </Pressable>

              <Pressable
                style={styles.tabBtn}
                onPress={() => handleTabChange('tagged')}
                testID="user-profile-tab-tagged"
              >
                <AtSign size={20} color={activeTab === 'tagged' ? '#BFA35D' : 'rgba(232,220,200,0.35)'} />
                <Text style={[styles.tabBtnText, activeTab === 'tagged' && styles.tabBtnTextActive]}>Markiert</Text>
              </Pressable>

              <Animated.View
                style={[
                  styles.tabIndicator,
                  { transform: [{ translateX: tabIndicatorTranslateX }] },
                ]}
              />
            </View>

            {activeTab === 'posts' ? (
              userFeedPosts.length === 0 ? (
                renderEmptyTab()
              ) : (
                <View style={styles.gridContainer}>
                  {userFeedPosts.map((post) => (
                    <PostGridItem
                      key={post.id}
                      post={post}
                      onPress={() => handlePostPress(post)}
                    />
                  ))}
                </View>
              )
            ) : currentTabData.length === 0 ? (
              renderEmptyTab()
            ) : (
              <View style={styles.gridContainer}>
                {currentTabData.map((reel) => (
                  <ReelGridItem
                    key={reel.id}
                    reel={reel}
                    onPress={() => handleReelPress(reel)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  errorText: {
    fontSize: 16,
  },
  floatingBackBtn: {
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
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroColorBand: {
    position: 'absolute',
    transform: [{ rotate: '-12deg' }],
  },
  heroBandBlack: {
    top: 10,
    left: -40,
    right: -40,
    height: 18,
  },
  heroBandRed: {
    top: 54,
    left: -40,
    right: -40,
    height: 18,
  },
  heroBandGold: {
    top: 98,
    left: -40,
    right: -40,
    height: 18,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
    transform: [{ rotate: '-12deg' }],
  },
  avatarArea: {
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  flagBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(20,20,22,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingGlow: {
    width: 108,
    height: 124,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  avatarRingDefault: {
    width: 108,
    height: 124,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInner: {
    width: 104,
    height: 120,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#E8DCC8',
    fontSize: 40,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  heroName: {
    color: '#E8DCC8',
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  heroUsername: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 12,
  },
  rankPillText: {
    color: '#BFA35D',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  rankDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(191,163,93,0.3)',
  },
  rankXp: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  heroBio: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  valuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  valueItem: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  valueItemText: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  locationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationChipText: {
    color: 'rgba(232,220,200,0.45)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  blChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  blChipText: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  faithGenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 2,
  },
  faithGenderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  faithGenderChipText: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  crossBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  flagActiveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  flagActiveStripText: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  liveLocationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.15)',
  },
  liveLocationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveLocationStripText: {
    color: 'rgba(76,175,80,0.8)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -1,
    backgroundColor: '#1e1e20',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItemInner: {
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    color: '#E8DCC8',
    fontSize: 20,
    fontWeight: '800' as const,
  },
  statLabel: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statDivider: {
    position: 'absolute',
    right: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  connectionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  connectionGradient: {
    padding: 16,
  },
  connectionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  connectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionTitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  connectionLabelText: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 1,
  },
  connectionPercent: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  connectionBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  connectionBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sharedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  sharedLabel: {
    color: 'rgba(232,220,200,0.35)',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  sharedChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  sharedChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  actionArea: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  friendActiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  friendActiveBtnText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  acceptBtnText: {
    color: '#141416',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.08)',
  },
  rejectBtnText: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.06)',
  },
  sentBtnText: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  addBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
  },
  addBtnText: {
    color: '#141416',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  msgBtnText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dropdown: {
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownText: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dropdownDivider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  blockedArea: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(192,96,96,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.12)',
  },
  blockedTextWrap: {
    flex: 1,
  },
  blockedTitle: {
    color: '#C06060',
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 3,
  },
  blockedSub: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 13,
    lineHeight: 18,
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  unblockBtnText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ordenPreview: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    padding: 12,
  },
  ordenPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ordenPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ordenPreviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordenPreviewTitle: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  ordenPreviewSub: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  ordenPreviewScroll: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  ordenPreviewItem: {
    alignItems: 'center',
  },
  ordenMoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordenMoreText: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
    zIndex: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.35)',
  },
  tabBtnTextActive: {
    color: '#BFA35D',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: (SCREEN_WIDTH - 32) / 2,
    height: 2.5,
    backgroundColor: '#BFA35D',
    borderRadius: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    marginTop: 4,
  },
  gridTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
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
  emptyTabContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTabTitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 16,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  emptyTabSubtitle: {
    color: 'rgba(232,220,200,0.3)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
