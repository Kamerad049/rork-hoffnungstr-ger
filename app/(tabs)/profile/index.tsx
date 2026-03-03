import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAlert } from '@/providers/AlertProvider';
import {
  LogOut,
  Award,
  MapPin,
  ChevronRight,
  Users,
  FileText,
  Shield,
  Flag,
  Settings,
  ShieldHalf,
  Mountain,
  Flame,
  Scale,
  Heart,
  Home,
  Swords,
  Crown,
  Anchor,
  Church,
  HandHeart,
  TreePine,
  Handshake,
  Eye,
  Grid3x3,
  AtSign,
  Archive,
  MoreHorizontal,
  ArchiveRestore,
  Trash2,
  ImageIcon,
  Film,
  Bookmark,
  Lock,
  Globe,
  Pencil,
  MessageCircleOff,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { trackRender, measureSinceBoot } from '@/lib/perf';
import { useStampPass } from '@/hooks/useStampPass';
import { useLiveLocation } from '@/providers/LiveLocationProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { useChat } from '@/providers/ChatProvider';
import { usePosts } from '@/providers/PostsProvider';
import { useStories } from '@/providers/StoriesProvider';
import { useReels } from '@/providers/ReelsProvider';

import RankIcon from '@/components/RankIcon';
import WavingFlag from '@/components/WavingFlag';
import SunDial from '@/components/SunDial';
import NowPlayingWidget from '@/components/NowPlayingWidget';
import { useSpotify } from '@/providers/SpotifyProvider';
import { Radio, Trophy as TrophyIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Reel, FeedPost, Gender, Religion, CrossStyle } from '@/constants/types';
import { GENDER_OPTIONS, RELIGION_OPTIONS } from '@/constants/types';
import OrdenBadge from '@/components/OrdenBadge';
import LatinCrossIcon from '@/components/LatinCrossIcon';
import OrthodoxCrossIcon from '@/components/OrthodoxCrossIcon';
import GenderIcon from '@/components/GenderIcon';
import { TIER_COLORS, TIER_NAMES, type OrdenDefinition } from '@/constants/orden';
import { useOrden } from '@/hooks/useOrden';
import { Trophy } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 3;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

type ProfileTab = 'posts' | 'tagged' | 'archive' | 'saved';

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

function PostGridItem({ post, onPress, onLongPress }: {
  post: FeedPost;
  onPress: () => void;
  onLongPress?: () => void;
}) {
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
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={400}
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

function ReelGridItem({ reel, onPress, onLongPress, showArchiveBadge }: {
  reel: Reel;
  onPress: () => void;
  onLongPress?: () => void;
  showArchiveBadge?: boolean;
}) {
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
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={400}
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
        {showArchiveBadge && (
          <View style={styles.archiveBadge}>
            <Archive size={10} color="rgba(232,220,200,0.8)" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  trackRender('ProfileScreen');
  measureSinceBoot('ProfileScreen_render');
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user, isLoggedIn, isLoading: authLoading, logout } = useAuth();
  const { stamps, rank, nextRank, progress } = useStampPass();
  const { profile, hoistFlag, isFlagActive, flagCount } = useSocial();
  const { friends, friendRequestUsers } = useFriends();
  const { conversations } = useChat();
  const { allPosts, archivedPosts, savedPosts, savedVisibility, setSavedVisibility, archivePost, unarchivePost, deletePost, editPost, toggleCommentsDisabled } = usePosts();
  const { activeOwnStories, isStoryViewed, stories } = useStories();
  const { savedReels, userReels, getOwnReels, getArchivedReels, getTaggedReels, archiveReel, unarchiveReel, deleteReel } = useReels();
  const { ordenDefinitions, earnedIds: ordenEarnedIds } = useOrden();
  const { isSharing: isLiveSharing } = useLiveLocation();
  const { currentTrack, settings: spotifySettings } = useSpotify();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [showRankProgress, setShowRankProgress] = useState<boolean>(false);
  const rankExpandAnim = useRef(new Animated.Value(0)).current;

  const hasActiveStory = activeOwnStories.length > 0;

  const flagWaveAnim = useRef(new Animated.Value(0)).current;
  const flagScaleAnim = useRef(new Animated.Value(0)).current;
  const flagGlowAnim = useRef(new Animated.Value(0)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const statScaleAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (isFlagActive) {
      Animated.spring(flagScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
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
      flagScaleAnim.setValue(0);
      flagWaveAnim.setValue(0);
      flagGlowAnim.setValue(0);
    }
  }, [isFlagActive]);

  const handleHoistFlag = useCallback(() => {
    if (isFlagActive) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    hoistFlag();
  }, [isFlagActive, hoistFlag]);

  const flagRotate = flagWaveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-4deg', '4deg'],
  });

  const glowBorderColor = flagGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(191,163,93,0.3)', 'rgba(191,163,93,0.8)'],
  });

  const hasUnviewedOwnStories = useMemo(
    () => activeOwnStories.some((s) => !isStoryViewed(s.id)),
    [activeOwnStories, isStoryViewed],
  );

  const handleAvatarPress = useCallback(() => {
    if (!hasActiveStory) return;
    const meIndex = stories.findIndex((g) => g.userId === 'me');
    if (meIndex >= 0) {
      router.push({ pathname: '/story-viewer', params: { groupIndex: String(meIndex) } } as any);
    }
  }, [hasActiveStory, stories, router]);

  const ownFeedPosts = useMemo(
    () => allPosts.filter((p) => p.userId === 'me').sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [allPosts],
  );

  const ownPostCount = ownFeedPosts.length;

  const ownReels = useMemo(() => getOwnReels(), [getOwnReels, userReels]);
  const archivedReels = useMemo(() => getArchivedReels(), [getArchivedReels, userReels]);
  const taggedReels = useMemo(() => getTaggedReels(), [getTaggedReels, userReels]);

  const allOwnContent = useMemo((): Reel[] => {
    return [...ownReels].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [ownReels]);

  const recentOrden = useMemo(() => {
    return ordenDefinitions.filter(o => ordenEarnedIds.has(o.id)).slice(0, 5);
  }, [ordenDefinitions, ordenEarnedIds]);

  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoggingOut(true);
    router.replace('/login?direct=1' as any);
    setTimeout(() => {
      logout();
    }, 100);
  }, [logout, router]);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    const val = tab === 'posts' ? 0 : tab === 'tagged' ? 1 : tab === 'archive' ? 2 : 3;
    Animated.spring(tabIndicatorAnim, {
      toValue: val,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [activeTab, tabIndicatorAnim]);

  const handleReelPress = useCallback((reel: Reel) => {
    console.log('[PROFILE] Reel tapped:', reel.id);
  }, []);

  const handlePostLongPress = useCallback((post: FeedPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeTab === 'archive') {
      showAlert(
        'Archivierter Beitrag',
        'Was möchtest du tun?',
        [
          {
            text: 'Wiederherstellen',
            onPress: () => {
              unarchivePost(post.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: 'Endgültig löschen',
            style: 'destructive',
            onPress: () => {
              showAlert('Löschen?', 'Beitrag kann nicht wiederhergestellt werden.', [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: () => {
                    deletePost(post.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  },
                },
              ]);
            },
          },
          { text: 'Abbrechen', style: 'cancel' },
        ],
      );
    } else if (activeTab === 'posts') {
      showAlert(
        'Beitrag',
        'Was möchtest du tun?',
        [
          {
            text: 'Archivieren',
            onPress: () => {
              archivePost(post.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: 'Endgültig löschen',
            style: 'destructive',
            onPress: () => {
              showAlert('Löschen?', 'Beitrag kann nicht wiederhergestellt werden.', [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: () => {
                    deletePost(post.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  },
                },
              ]);
            },
          },
          { text: 'Abbrechen', style: 'cancel' },
        ],
      );
    }
  }, [activeTab, archivePost, unarchivePost, deletePost]);

  const handleReelLongPress = useCallback((reel: Reel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeTab === 'archive') {
      showAlert(
        'Archivierter Beitrag',
        'Was möchtest du tun?',
        [
          {
            text: 'Wiederherstellen',
            onPress: () => {
              unarchiveReel(reel.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: 'Endgültig löschen',
            style: 'destructive',
            onPress: () => {
              deleteReel(reel.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
          { text: 'Abbrechen', style: 'cancel' },
        ],
      );
    } else if (activeTab === 'posts') {
      showAlert(
        'Beitrag',
        'Was möchtest du tun?',
        [
          {
            text: 'Archivieren',
            onPress: () => {
              archiveReel(reel.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: 'Endgültig löschen',
            style: 'destructive',
            onPress: () => {
              showAlert('Löschen?', 'Beitrag kann nicht wiederhergestellt werden.', [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: () => {
                    deleteReel(reel.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  },
                },
              ]);
            },
          },
          { text: 'Abbrechen', style: 'cancel' },
        ],
      );
    }
  }, [activeTab, archiveReel, unarchiveReel, deleteReel]);

  const currentReelTabData = useMemo((): Reel[] => {
    switch (activeTab) {
      case 'tagged': return taggedReels;
      case 'archive': return archivedReels;
      default: return [];
    }
  }, [activeTab, taggedReels, archivedReels]);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: '#141416' }]}>
        <ActivityIndicator size="small" color="#BFA35D" />
        <Text style={{ color: 'rgba(232,220,200,0.4)', fontSize: 14, marginTop: 12 }}>Profil wird geladen...</Text>
      </View>
    );
  }

  if (!isLoggedIn || loggingOut || !user) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: '#141416' }]}>
        <Text style={{ color: 'rgba(232,220,200,0.4)', fontSize: 14 }}>Weiterleitung zum Login...</Text>
      </View>
    );
  }

  const displayName = profile.displayName || user?.name || 'Entdecker';
  const initial = displayName.charAt(0).toUpperCase();
  const username = user?.name?.toLowerCase().replace(/\s/g, '') ?? 'user';

  const renderAvatar = () => {
    const avatarContent = profile.avatarUrl ? (
      <Image
        source={{ uri: profile.avatarUrl }}
        style={styles.avatarImageInner}
        contentFit="cover"
        transition={200}
      />
    ) : (
      <View style={styles.avatarCircleInner}>
        <Text style={styles.avatarInitial}>{initial}</Text>
      </View>
    );

    if (hasActiveStory) {
      return (
        <Pressable onPress={handleAvatarPress} testID="profile-avatar-story">
          <View style={[styles.avatarRingDefault, { borderColor: 'rgba(191,163,93,0.45)', borderWidth: 2.5 }]}>
            {avatarContent}
          </View>
        </Pressable>
      );
    }

    if (isFlagActive) {
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

  const renderEmptyTab = () => {
    let icon: React.ReactNode;
    let title: string;
    let subtitle: string;

    switch (activeTab) {
      case 'posts':
        icon = <Grid3x3 size={40} color="rgba(191,163,93,0.25)" />;
        title = 'Noch keine Beiträge';
        subtitle = 'Erstelle dein erstes Reel und teile es mit der Community.';
        break;
      case 'tagged':
        icon = <AtSign size={40} color="rgba(191,163,93,0.25)" />;
        title = 'Keine Markierungen';
        subtitle = 'Beiträge, in denen du markiert wirst, erscheinen hier.';
        break;
      case 'archive':
        icon = <Archive size={40} color="rgba(191,163,93,0.25)" />;
        title = 'Archiv ist leer';
        subtitle = 'Archivierte Beiträge sind nur für dich sichtbar. Halte einen Beitrag gedrückt zum Archivieren.';
        break;
      case 'saved':
        icon = <Bookmark size={40} color="rgba(191,163,93,0.25)" />;
        title = 'Keine gespeicherten Beiträge';
        subtitle = 'Beiträge, die du speicherst, erscheinen hier.';
        break;
    }

    return (
      <View style={styles.emptyTabContainer}>
        {icon}
        <Text style={styles.emptyTabTitle}>{title}</Text>
        <Text style={styles.emptyTabSubtitle}>{subtitle}</Text>
        {activeTab === 'posts' && (
          <Pressable
            style={styles.emptyTabBtn}
            onPress={() => router.push('/(tabs)/feed/create' as any)}
          >
            <Text style={styles.emptyTabBtnText}>Reel erstellen</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const TAB_COUNT = 4;
  const TAB_WIDTH = (SCREEN_WIDTH - 32) / TAB_COUNT;
  const tabIndicatorTranslateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, TAB_WIDTH, TAB_WIDTH * 2, TAB_WIDTH * 3],
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: '#141416' }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Animated.View style={{ opacity: headerFadeAnim }}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={styles.heroSection}
        >
          <View style={styles.heroPattern}>
            {[...Array(8)].map((_, i) => (
              <View
                key={`line-${i}`}
                style={[
                  styles.heroLine,
                  {
                    top: 14 + i * 22,
                    opacity: 0.04 + i * 0.006,
                  },
                ]}
              />
            ))}
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.85)']}
              start={{ x: 0.3, y: 0.5 }}
              end={{ x: 0.85, y: 0.5 }}
              style={[
                styles.heroFlagBand,
                { top: 14 + 5 * 22 + 1 + 1 },
              ]}
            />
            <LinearGradient
              colors={['transparent', 'rgba(180,30,30,0.65)']}
              start={{ x: 0.35, y: 0.5 }}
              end={{ x: 0.9, y: 0.5 }}
              style={[
                styles.heroFlagBand,
                { top: 14 + 6 * 22 + 1 + 1 },
              ]}
            />
            <LinearGradient
              colors={['transparent', 'rgba(212,175,55,0.55)']}
              start={{ x: 0.4, y: 0.5 }}
              end={{ x: 0.95, y: 0.5 }}
              style={[
                styles.heroFlagBand,
                { top: 14 + 7 * 22 + 1 + 1 },
              ]}
            />
          </View>

          <View style={styles.headerTopRow}>
            <View style={{ width: 36 }} />
            <Pressable
              style={styles.settingsBtn}
              onPress={() => router.push('/(tabs)/profile/settings' as any)}
              hitSlop={10}
            >
              <Settings size={20} color="rgba(232,220,200,0.6)" />
            </Pressable>
          </View>

          <View style={styles.avatarArea}>
            {profile.showSunDial !== false ? (
              <SunDial residence={profile.residence}>
                <View style={styles.avatarWrapper}>
                  {isFlagActive && (
                    <Animated.View
                      style={[
                        styles.flagBadge,
                        {
                          transform: [
                            { scale: flagScaleAnim },
                            { rotate: flagRotate },
                          ],
                        },
                      ]}
                    >
                      <WavingFlag width={18} height={12} borderRadius={3} />
                    </Animated.View>
                  )}
                  {renderAvatar()}
                </View>
              </SunDial>
            ) : (
              <View style={styles.avatarWrapper}>
                {isFlagActive && (
                  <Animated.View
                    style={[
                      styles.flagBadge,
                      {
                        transform: [
                          { scale: flagScaleAnim },
                          { rotate: flagRotate },
                        ],
                      },
                    ]}
                  >
                    <WavingFlag width={18} height={12} borderRadius={3} />
                  </Animated.View>
                )}
                {renderAvatar()}
              </View>
            )}
          </View>

          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroUsername}>@{username}</Text>

          {(profile.showGender && profile.gender) || (profile.showReligion && profile.religion) || (profile.crossStyle && profile.crossStyle !== 'none') ? (
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

          <Pressable
            style={styles.rankPill}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const next = !showRankProgress;
              setShowRankProgress(next);
              Animated.spring(rankExpandAnim, {
                toValue: next ? 1 : 0,
                useNativeDriver: false,
                friction: 8,
                tension: 100,
              }).start();
            }}
            testID="rank-pill-toggle"
          >
            <RankIcon icon={rank.icon} size={14} color="#BFA35D" />
            <Text style={styles.rankPillText}>{rank.name}</Text>
            <View style={styles.rankDot} />
            <Text style={styles.rankXp}>{stamps.length * 50} EP</Text>
            {nextRank && (
              <View style={styles.rankPillChevron}>
                <Animated.View style={{ transform: [{ rotate: rankExpandAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                  <ChevronRight size={12} color="rgba(191,163,93,0.4)" style={{ transform: [{ rotate: '90deg' }] }} />
                </Animated.View>
              </View>
            )}
          </Pressable>

          {nextRank && (
            <Animated.View
              style={[
                styles.rankProgressInline,
                {
                  maxHeight: rankExpandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }),
                  opacity: rankExpandAnim,
                  marginTop: rankExpandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
                },
              ]}
            >
              <View style={styles.rankProgressInlineTop}>
                <Text style={styles.rankProgressInlineLabel}>
                  {Math.round(((stamps.length - rank.minStamps) / (nextRank.minStamps - rank.minStamps)) * 100)}% bis {nextRank.name}
                </Text>
                <RankIcon icon={nextRank.icon} size={12} color="rgba(191,163,93,0.4)" />
              </View>
              <View style={styles.rankProgressBarBg}>
                <View
                  style={[
                    styles.rankProgressBarFill,
                    { width: `${Math.min(Math.max(((stamps.length - rank.minStamps) / (nextRank.minStamps - rank.minStamps)) * 100, 0), 100)}%` },
                  ]}
                />
              </View>
            </Animated.View>
          )}

          {profile.bio && profile.bio.length > 0 && (
            <Text style={styles.heroBio}>{profile.bio}</Text>
          )}

          {(profile.values && profile.values.length > 0) && (
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
            const showBirth = !!profile.birthplace;
            const showRes = !!profile.residence;
            const showBl = !!profile.bundesland;
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

          {isLiveSharing && (
            <Pressable
              style={styles.liveLocationStrip}
              onPress={() => router.push('/(tabs)/livemap?from=profile' as any)}
              testID="profile-live-banner"
            >
              <View style={styles.liveStripDot} />
              <Radio size={14} color="#4CAF50" />
              <Text style={styles.liveStripText}>Du teilst deinen Live-Standort</Text>
            </Pressable>
          )}

          {isFlagActive ? (
            <View style={styles.flagActiveStrip}>
              <WavingFlag width={18} height={12} borderRadius={2} />
              <Text style={styles.flagActiveStripText}>
                Heute aktiv mit <Text style={styles.flagCountHighlight}>{flagCount > 0 ? flagCount.toLocaleString('de-DE') : '0'}</Text> Patrioten
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.flagBtnBanner}
              onPress={handleHoistFlag}
              testID="hoist-flag-btn"
            >
              <Flag size={16} color="#E8DCC8" />
              <Text style={styles.flagBtnBannerText}>Heute Flagge zeigen</Text>
            </Pressable>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Spotify widget hidden for now */}
      {false && spotifySettings.enabled && currentTrack !== null ? (
        <NowPlayingWidget track={currentTrack!} isOwnProfile />
      ) : null}

      <View style={styles.statsBar}>
        {[
          { label: 'Beiträge', value: ownPostCount, icon: FileText, onPress: () => handleTabChange('posts') },
          { label: 'Freunde', value: friends.length, icon: Users, onPress: () => router.push('/(tabs)/profile/friends' as any) },
          { label: 'Stempel', value: stamps.length, icon: Award, onPress: () => router.push({ pathname: '/user-stamps', params: { userId: 'me' } } as any) },
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
              onPress={stat.onPress}
              testID={`own-${stat.label.toLowerCase()}-stat`}
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

      <Pressable
        style={styles.ordenPreview}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(tabs)/profile/ordenshalle' as any);
        }}
        testID="profile-orden-preview"
      >
        <View style={styles.ordenPreviewHeader}>
          <View style={styles.ordenPreviewLeft}>
            <View style={styles.ordenPreviewIcon}>
              <Trophy size={14} color="#BFA35D" />
            </View>
            <View>
              <Text style={styles.ordenPreviewTitle}>Ordenshalle</Text>
              <Text style={styles.ordenPreviewSub}>{ordenEarnedIds.size} Orden errungen</Text>
            </View>
          </View>
          <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ordenPreviewScroll}
          scrollEnabled={false}
        >
          {recentOrden.map(orden => (
            <View key={orden.id} style={styles.ordenPreviewItem}>
              <OrdenBadge orden={orden} earned size="small" showName={false} animate={false} />
            </View>
          ))}
          {ordenEarnedIds.size > 5 && (
            <View style={styles.ordenMoreBadge}>
              <Text style={styles.ordenMoreText}>+{ordenEarnedIds.size - 5}</Text>
            </View>
          )}
        </ScrollView>
      </Pressable>

      <View style={styles.tabBar}>
        <Pressable
          style={styles.tabBtn}
          onPress={() => handleTabChange('posts')}
          testID="profile-tab-posts"
        >
          <Grid3x3 size={20} color={activeTab === 'posts' ? '#BFA35D' : 'rgba(232,220,200,0.35)'} />
          <Text style={[styles.tabBtnText, activeTab === 'posts' && styles.tabBtnTextActive]}>Beiträge</Text>
        </Pressable>

        <Pressable
          style={styles.tabBtn}
          onPress={() => handleTabChange('tagged')}
          testID="profile-tab-tagged"
        >
          <AtSign size={20} color={activeTab === 'tagged' ? '#BFA35D' : 'rgba(232,220,200,0.35)'} />
          <Text style={[styles.tabBtnText, activeTab === 'tagged' && styles.tabBtnTextActive]}>Markiert</Text>
        </Pressable>

        <Pressable
          style={styles.tabBtn}
          onPress={() => handleTabChange('archive')}
          testID="profile-tab-archive"
        >
          <Archive size={18} color={activeTab === 'archive' ? '#BFA35D' : 'rgba(232,220,200,0.35)'} />
          <Text style={[styles.tabBtnText, activeTab === 'archive' && styles.tabBtnTextActive]}>Archiv</Text>
        </Pressable>

        <Pressable
          style={styles.tabBtn}
          onPress={() => handleTabChange('saved')}
          testID="profile-tab-saved"
        >
          <Bookmark size={18} color={activeTab === 'saved' ? '#BFA35D' : 'rgba(232,220,200,0.35)'} />
          <Text style={[styles.tabBtnText, activeTab === 'saved' && styles.tabBtnTextActive]}>Gespeichert</Text>
        </Pressable>

        <Animated.View
          style={[
            styles.tabIndicator,
            { width: TAB_WIDTH, transform: [{ translateX: tabIndicatorTranslateX }] },
          ]}
        />
      </View>

      {activeTab === 'saved' && (
        <View style={styles.savedVisibilityBar}>
          <Text style={styles.savedVisibilityLabel}>Sichtbarkeit:</Text>
          {(['public', 'friends', 'private'] as const).map((vis) => {
            const isActive = savedVisibility === vis;
            const IconComp = vis === 'public' ? Globe : vis === 'friends' ? Users : Lock;
            const label = vis === 'public' ? 'Alle' : vis === 'friends' ? 'Freunde' : 'Nur ich';
            return (
              <Pressable
                key={vis}
                style={[styles.savedVisibilityBtn, isActive && styles.savedVisibilityBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSavedVisibility(vis);
                }}
              >
                <IconComp size={12} color={isActive ? '#0f0e0b' : 'rgba(232,220,200,0.5)'} />
                <Text style={[styles.savedVisibilityBtnText, isActive && styles.savedVisibilityBtnTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {activeTab === 'posts' ? (
        ownFeedPosts.length === 0 ? (
          renderEmptyTab()
        ) : (
          <View style={styles.gridContainer}>
            {ownFeedPosts.map((post) => (
              <PostGridItem
                key={post.id}
                post={post}
                onPress={() => router.push({ pathname: '/user-reel-feed', params: { userId: 'me', initialPostId: post.id } } as any)}
                onLongPress={() => handlePostLongPress(post)}
              />
            ))}
          </View>
        )
      ) : activeTab === 'archive' ? (
        archivedPosts.length === 0 ? (
          renderEmptyTab()
        ) : (
          <View style={styles.gridContainer}>
            {archivedPosts.map((post) => (
              <PostGridItem
                key={post.id}
                post={post}
                onPress={() => router.push({ pathname: '/user-reel-feed', params: { userId: 'me', initialPostId: post.id } } as any)}
                onLongPress={() => handlePostLongPress(post)}
              />
            ))}
          </View>
        )
      ) : activeTab === 'saved' ? (
        savedPosts.length === 0 ? (
          renderEmptyTab()
        ) : (
          <View style={styles.gridContainer}>
            {savedPosts.map((post) => (
              <PostGridItem
                key={post.id}
                post={post}
                onPress={() => router.push({ pathname: '/user-reel-feed', params: { userId: 'me', initialPostId: post.id } } as any)}
              />
            ))}
          </View>
        )
      ) : currentReelTabData.length === 0 ? (
        renderEmptyTab()
      ) : (
        <View style={styles.gridContainer}>
          {currentReelTabData.map((reel) => (
            <ReelGridItem
              key={reel.id}
              reel={reel}
              onPress={() => handleReelPress(reel)}
              onLongPress={() => handleReelLongPress(reel)}
              showArchiveBadge={false}
            />
          ))}
        </View>
      )}


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    paddingTop: 90,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroFlagBand: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 19,
    transform: [{ rotate: '-12deg' }],
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
    transform: [{ rotate: '-12deg' }],
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    top: 90,
    right: 16,
    left: 16,
    zIndex: 10,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarArea: {
    marginBottom: 16,
    overflow: 'visible',
    zIndex: 10,
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
  avatarImageInner: {
    width: 104,
    height: 120,
    borderRadius: 22,
    borderWidth: 0,
  },
  avatarCircleInner: {
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
  },
  rankPillChevron: {
    marginLeft: 2,
  },
  rankProgressInline: {
    width: '80%',
    overflow: 'hidden',
    marginBottom: 12,
  },
  rankProgressInlineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rankProgressInlineLabel: {
    color: 'rgba(191,163,93,0.55)',
    fontSize: 11,
    fontWeight: '600' as const,
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
  flagCountHighlight: {
    color: '#BFA35D',
    fontWeight: '800' as const,
  },
  flagBtnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  flagBtnBannerText: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -1,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItemInner: {
    alignItems: 'center',
    gap: 2,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statValue: {
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '800' as const,
  },
  statLabel: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 10,
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

  rankProgressBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  rankProgressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#BFA35D',
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#BFA35D',
  },
  adminIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(28,28,30,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTextWrap: {
    flex: 1,
  },
  adminTitle: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  adminSub: {
    color: 'rgba(28,28,30,0.6)',
    fontSize: 12,
    marginTop: 2,
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
  archiveBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  emptyTabBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  emptyTabBtnText: {
    color: '#BFA35D',
    fontSize: 14,
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
  liveStripDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveStripText: {
    color: 'rgba(76,175,80,0.8)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  ordenPreview: {
    marginHorizontal: 16,
    marginTop: 10,
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
  savedVisibilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  savedVisibilityLabel: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 12,
    fontWeight: '600' as const,
    marginRight: 4,
  },
  savedVisibilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  savedVisibilityBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  savedVisibilityBtnText: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  savedVisibilityBtnTextActive: {
    color: '#0f0e0b',
  },
});
