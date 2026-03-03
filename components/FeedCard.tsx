import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import OptimizedImage, { OptimizedAvatar } from '@/components/OptimizedImage';
import { Shield, Star, Heart, Users, MessageCircle, Share2, MoreHorizontal, MapPin, X, ChevronRight, Pencil, MessageCircleOff, Archive, Bookmark, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import RankIcon from '@/components/RankIcon';

import { usePosts } from '@/providers/PostsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';
import ReportModal from '@/components/ReportModal';

export type PostReactionType = 'respekt' | 'anerkennung' | 'zuspruch' | 'verbundenheit';

const REACTION_CONFIG: { type: PostReactionType; icon: typeof Shield; label: string; emoji: string }[] = [
  { type: 'respekt', icon: Shield, label: 'Respekt', emoji: '🛡' },
  { type: 'anerkennung', icon: Star, label: 'Anerkennung', emoji: '⭐' },
  { type: 'zuspruch', icon: Heart, label: 'Zuspruch', emoji: '💪' },
  { type: 'verbundenheit', icon: Users, label: 'Verbundenheit', emoji: '🤝' },
];

const TEXT_GRADIENTS: [string, string, ...string[]][] = [
  ['#1a1510', '#0f0e0b', '#12100d'],
  ['#151210', '#0d0b0a', '#110f0d'],
  ['#13110f', '#0e0c0a', '#100e0c'],
];

interface FeedCardProps {
  post: FeedPost;
  cardWidth: number;
  cardHeight: number;
  onCommentPress: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onImagePress?: (imageUrl: string) => void;
  onLocationPress?: (location: string) => void;
  onEditPress?: (post: FeedPost) => void;
  onArchivePress?: (postId: string) => void;
  onDeletePress?: (postId: string) => void;
  onToggleCommentsPress?: (postId: string) => void;
  reaction: PostReactionType | null;
  onReaction: (postId: string, type: PostReactionType) => void;
  isActive?: boolean;
}

function FeedCardInner({
  post,
  cardWidth,
  cardHeight,
  onCommentPress,
  onUserPress,
  onImagePress,
  onLocationPress,
  onEditPress,
  onArchivePress,
  onDeletePress,
  onToggleCommentsPress,
  reaction,
  onReaction,
  isActive = true,
}: FeedCardProps) {
  const { toggleLike, isLiked, isCommentsDisabled } = usePosts();
  const { isUserFlagActive, profile: socialProfile } = useSocial();
  const { user } = useAuth();

  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showTaggedPeople, setShowTaggedPeople] = useState<boolean>(false);
  const [showOwnMenu, setShowOwnMenu] = useState<boolean>(false);
  const ownMenuAnim = useRef(new Animated.Value(0)).current;

  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const reactionScales = useRef(
    REACTION_CONFIG.map(() => new Animated.Value(1))
  ).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const taggedPeopleAnim = useRef(new Animated.Value(0)).current;

  const author = post.userId === 'me'
    ? {
        displayName: socialProfile?.displayName || user?.name || 'Ich',
        username: user?.name?.toLowerCase().replace(/\s/g, '_') ?? 'ich',
        rankIcon: 'Compass',
        rank: 'Entdecker',
        avatarUrl: socialProfile?.avatarUrl ?? null,
      }
    : (() => {
        const u = getUserById(post.userId);
        return u
          ? { displayName: u.displayName, username: u.username, rankIcon: u.rankIcon, rank: u.rank, avatarUrl: u.avatarUrl }
          : { displayName: 'Unbekannt', username: 'unknown', rankIcon: 'Search', rank: 'Sucher', avatarUrl: null as string | null };
      })();

  const liked = isLiked(post.id);
  const hasImage = post.mediaUrls.length > 0;
  const initial = author.displayName.charAt(0).toUpperCase();
  const hasFlag = post.userId !== 'me' && isUserFlagActive(post.userId);
  const gradientIndex = Math.abs(post.id.charCodeAt(1) ?? 0) % TEXT_GRADIENTS.length;

  useEffect(() => {
    if (post.location || (post.taggedUserIds && post.taggedUserIds.length > 0)) {
      console.log('[FEEDCARD] Post', post.id, '- location:', post.location, '- taggedUserIds:', post.taggedUserIds);
    }
  }, [post.id, post.location, post.taggedUserIds]);

  useEffect(() => {
    if (!isActive) {
      if (showTaggedPeople) {
        setShowTaggedPeople(false);
        taggedPeopleAnim.setValue(0);
      }
      if (showOwnMenu) {
        setShowOwnMenu(false);
        ownMenuAnim.setValue(0);
      }
    }
  }, [isActive]);

  const taggedUsers = useMemo(() => {
    if (!post.taggedUserIds || post.taggedUserIds.length === 0) return [];
    return post.taggedUserIds
      .map((id) => getUserById(id))
      .filter((u): u is NonNullable<typeof u> => u !== null && u !== undefined);
  }, [post.taggedUserIds]);

  useEffect(() => {
    if (!hasImage || imageLoaded) return;
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [hasImage, imageLoaded, shimmerAnim]);



  const lastTap = useRef<number>(0);
  const handleCardPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (!liked) toggleLike(post.id);
      Animated.sequence([
        Animated.spring(doubleTapAnim, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 12 }),
        Animated.timing(doubleTapAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    } else {
      if (hasImage && onImagePress) {
        onImagePress(post.mediaUrls[0]);
      }
    }
    lastTap.current = now;
  }, [liked, post.id, toggleLike, doubleTapAnim, hasImage, onImagePress]);

  const handleReaction = useCallback(
    (type: PostReactionType, index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReaction(post.id, type);
      if (!liked) toggleLike(post.id);
      Animated.sequence([
        Animated.spring(reactionScales[index], { toValue: 1.4, useNativeDriver: true, speed: 50 }),
        Animated.spring(reactionScales[index], { toValue: 1, useNativeDriver: true, speed: 50 }),
      ]).start();
    },
    [post.id, onReaction, liked, toggleLike, reactionScales]
  );

  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCommentPress(post.id);
  }, [post.id, onCommentPress]);

  const handleUserTap = useCallback(() => {
    if (post.userId !== 'me') {
      onUserPress(post.userId);
    }
  }, [post.userId, onUserPress]);

  const handleTaggedUserTap = useCallback((userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTaggedPeople(false);
    onUserPress(userId);
  }, [onUserPress]);

  const toggleTaggedPeople = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const show = !showTaggedPeople;
    setShowTaggedPeople(show);
    if (showOwnMenu) {
      setShowOwnMenu(false);
      ownMenuAnim.setValue(0);
    }
    Animated.spring(taggedPeopleAnim, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [showTaggedPeople, taggedPeopleAnim, showOwnMenu, ownMenuAnim]);

  const isOwnPost = post.userId === 'me';
  const commentsOff = isCommentsDisabled(post.id);

  const toggleOwnMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const show = !showOwnMenu;
    setShowOwnMenu(show);
    if (showTaggedPeople) {
      setShowTaggedPeople(false);
      taggedPeopleAnim.setValue(0);
    }
    Animated.spring(ownMenuAnim, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [showOwnMenu, ownMenuAnim, showTaggedPeople, taggedPeopleAnim]);

  const handleLocationPress = useCallback(() => {
    if (post.location && onLocationPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onLocationPress(post.location);
    }
  }, [post.location, onLocationPress]);

  const renderShimmer = () => {
    if (imageLoaded || !hasImage) return null;
    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-cardWidth, cardWidth],
    });
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1710' }]}>
        <Animated.View
          style={[
            shimmerStyles.shimmerBar,
            {
              transform: [{ translateX }],
              width: cardWidth * 0.4,
              height: cardHeight,
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(191,163,93,0.08)', 'rgba(191,163,93,0.15)', 'rgba(191,163,93,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    );
  };

  const cleanContent = useMemo(() => {
    let text = post.content;
    if (taggedUsers.length > 0) {
      text = text.replace(/@\w+/g, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    return text;
  }, [post.content, taggedUsers]);

  const highlightHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Text key={i} style={cardStyles.hashtag}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <View style={[cardStyles.card, { width: cardWidth, height: cardHeight }]}>
      {hasImage ? (
        <>
          {renderShimmer()}
          <OptimizedImage
            source={{ uri: post.mediaUrls[0] }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            variant="dark"
            onLoad={() => setImageLoaded(true)}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.22, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={TEXT_GRADIENTS[gradientIndex]}
          style={StyleSheet.absoluteFill}
        >
          <View style={cardStyles.textOnlyPattern}>
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  cardStyles.patternLine,
                  {
                    top: 30 + i * 45,
                    opacity: 0.04 + i * 0.003,
                    transform: [{ rotate: '-8deg' }],
                  },
                ]}
              />
            ))}
          </View>
          <View style={cardStyles.textOnlyQuoteMark}>
            <Text style={cardStyles.quoteMark}>{'"'}</Text>
          </View>
        </LinearGradient>
      )}

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (showOwnMenu) {
            setShowOwnMenu(false);
            ownMenuAnim.setValue(0);
            return;
          }
          if (showTaggedPeople) {
            setShowTaggedPeople(false);
            taggedPeopleAnim.setValue(0);
            return;
          }
          handleCardPress();
        }}

        testID={`feed-card-${post.id}`}
      />

      <Animated.View
        style={[
          doubleTapStyles.container,
          {
            opacity: doubleTapAnim,
            transform: [
              {
                scale: doubleTapAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1.2, 1],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <Heart size={72} color="#BFA35D" fill="#BFA35D" />
      </Animated.View>

      <View style={cardStyles.overlayContent} pointerEvents="box-none">
        <View style={cardStyles.topSection}>
          <View style={cardStyles.topRow}>
            <Pressable style={cardStyles.authorRow} onPress={handleUserTap}>
              <View style={cardStyles.avatarWrap}>
                {author.avatarUrl ? (
                  <OptimizedAvatar uri={author.avatarUrl} size={40} borderRadius={10} />
                ) : (
                  <View style={cardStyles.avatarInner}>
                    <Text style={cardStyles.avatarText}>{initial}</Text>
                  </View>
                )}
              </View>
              <View style={cardStyles.authorInfo}>
                <View style={cardStyles.nameRow}>
                  <Text style={cardStyles.authorName} numberOfLines={1}>
                    {author.displayName}
                  </Text>
                  <RankIcon icon={author.rankIcon} size={11} color="rgba(191,163,93,0.7)" />
                </View>
                <Text style={cardStyles.timeText}>{formatTimeAgo(post.createdAt)}</Text>
              </View>
            </Pressable>

            {taggedUsers.length > 0 && (
              <Pressable
                style={cardStyles.taggedIndicator}
                onPress={toggleTaggedPeople}
                hitSlop={8}
                testID={`tagged-people-${post.id}`}
              >
                <Users size={12} color="#BFA35D" />
                <Text style={cardStyles.taggedIndicatorText}>+{taggedUsers.length}</Text>
              </Pressable>
            )}

            <Pressable
              style={cardStyles.moreBtn}
              hitSlop={12}
              onPress={isOwnPost ? toggleOwnMenu : () => setShowReport(true)}
              testID={`card-more-${post.id}`}
            >
              <MoreHorizontal size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {showOwnMenu && isOwnPost && (
            <Animated.View
              style={[
                cardStyles.ownMenuDropdown,
                {
                  opacity: ownMenuAnim,
                  transform: [{
                    translateY: ownMenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  }],
                },
              ]}
            >
              <Pressable
                style={cardStyles.ownMenuItem}
                onPress={() => {
                  setShowOwnMenu(false);
                  ownMenuAnim.setValue(0);
                  onEditPress?.(post);
                }}
              >
                <Pencil size={15} color="#E8DCC8" />
                <Text style={cardStyles.ownMenuItemText}>Bearbeiten</Text>
              </Pressable>
              <View style={cardStyles.ownMenuDivider} />
              <Pressable
                style={cardStyles.ownMenuItem}
                onPress={() => {
                  setShowOwnMenu(false);
                  ownMenuAnim.setValue(0);
                  onToggleCommentsPress?.(post.id);
                }}
              >
                <MessageCircleOff size={15} color={commentsOff ? '#BFA35D' : '#E8DCC8'} />
                <Text style={[cardStyles.ownMenuItemText, commentsOff && { color: '#BFA35D' }]}>
                  {commentsOff ? 'Kommentare aktivieren' : 'Kommentare deaktivieren'}
                </Text>
              </Pressable>
              <View style={cardStyles.ownMenuDivider} />
              <Pressable
                style={cardStyles.ownMenuItem}
                onPress={() => {
                  setShowOwnMenu(false);
                  ownMenuAnim.setValue(0);
                  onArchivePress?.(post.id);
                }}
              >
                <Archive size={15} color="#E8DCC8" />
                <Text style={cardStyles.ownMenuItemText}>Archivieren</Text>
              </Pressable>
              <View style={cardStyles.ownMenuDivider} />
              <Pressable
                style={cardStyles.ownMenuItem}
                onPress={() => {
                  setShowOwnMenu(false);
                  ownMenuAnim.setValue(0);
                  Alert.alert(
                    'Beitrag löschen?',
                    'Dieser Beitrag wird endgültig und unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
                    [
                      { text: 'Abbrechen', style: 'cancel' },
                      {
                        text: 'Endgültig löschen',
                        style: 'destructive',
                        onPress: () => onDeletePress?.(post.id),
                      },
                    ],
                  );
                }}
              >
                <Trash2 size={15} color="#C0392B" />
                <Text style={[cardStyles.ownMenuItemText, { color: '#C0392B' }]}>Löschen</Text>
              </Pressable>
            </Animated.View>
          )}

          {showTaggedPeople && taggedUsers.length > 0 && (
            <Animated.View
              style={[
                cardStyles.taggedDropdown,
                {
                  opacity: taggedPeopleAnim,
                  transform: [{
                    translateY: taggedPeopleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={cardStyles.taggedDropdownHeader}>
                <Text style={cardStyles.taggedDropdownTitle}>Markiert</Text>
                <Pressable onPress={toggleTaggedPeople} hitSlop={8}>
                  <X size={14} color="rgba(232,220,200,0.5)" />
                </Pressable>
              </View>
              {taggedUsers.map((tu) => {
                const tagInitial = tu.displayName.charAt(0).toUpperCase();
                return (
                  <Pressable
                    key={tu.id}
                    style={cardStyles.taggedUserRow}
                    onPress={() => handleTaggedUserTap(tu.id)}
                  >
                    {tu.avatarUrl ? (
                      <OptimizedAvatar uri={tu.avatarUrl} size={28} borderRadius={7} />
                    ) : (
                      <View style={cardStyles.taggedUserAvatar}>
                        <Text style={cardStyles.taggedUserAvatarText}>{tagInitial}</Text>
                      </View>
                    )}
                    <View style={cardStyles.taggedUserInfo}>
                      <Text style={cardStyles.taggedUserName} numberOfLines={1}>{tu.displayName}</Text>
                      <Text style={cardStyles.taggedUserHandle}>@{tu.username}</Text>
                    </View>
                    <ChevronRight size={14} color="rgba(191,163,93,0.4)" />
                  </Pressable>
                );
              })}
            </Animated.View>
          )}
        </View>

        <View style={cardStyles.reactionBar} pointerEvents="box-none">
          <View style={cardStyles.reactionBarInner}>
            {REACTION_CONFIG.map((r, idx) => {
              const isActive = reaction === r.type;
              const IconComp = r.icon;
              return (
                <Pressable
                  key={r.type}
                  style={[
                    cardStyles.reactionBtn,
                    isActive && cardStyles.reactionBtnActive,
                  ]}
                  onPress={() => handleReaction(r.type, idx)}
                  testID={`reaction-${r.type}-${post.id}`}
                >
                  <Animated.View style={{ transform: [{ scale: reactionScales[idx] }] }}>
                    <IconComp
                      size={20}
                      color={isActive ? '#BFA35D' : 'rgba(255,255,255,0.7)'}
                      fill={isActive ? 'rgba(191,163,93,0.3)' : 'transparent'}
                    />
                  </Animated.View>
                </Pressable>
              );
            })}

            <View style={cardStyles.reactionDivider} />

            <Pressable style={cardStyles.reactionBtn} onPress={handleComment} testID={`card-comment-${post.id}`}>
              <MessageCircle size={20} color="rgba(255,255,255,0.7)" />
              {post.commentCount > 0 && (
                <Text style={cardStyles.reactionCount}>{post.commentCount}</Text>
              )}
            </Pressable>

            <Pressable style={cardStyles.reactionBtn}>
              <Share2 size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>

        <View style={cardStyles.bottomSection}>
          {post.location && (
            <Pressable
              style={cardStyles.locationPill}
              onPress={handleLocationPress}
              hitSlop={6}
            >
              <MapPin size={10} color="#BFA35D" />
              <Text style={cardStyles.locationPillText} numberOfLines={1}>{post.location}</Text>
            </Pressable>
          )}
          {post.tags && post.tags.length > 0 && (
            <View style={cardStyles.tagsRow}>
              {post.tags.slice(0, 4).map((tag) => (
                <View key={tag} style={cardStyles.tagPill}>
                  <Text style={cardStyles.tagPillText}>#{tag}</Text>
                </View>
              ))}
              {post.tags.length > 4 && (
                <View style={cardStyles.tagPill}>
                  <Text style={cardStyles.tagPillText}>+{post.tags.length - 4}</Text>
                </View>
              )}
            </View>
          )}
          {!hasImage && cleanContent.length > 0 && (
            <Text style={cardStyles.textOnlyContent} numberOfLines={8}>
              {highlightHashtags(cleanContent)}
            </Text>
          )}
          {hasImage && cleanContent.length > 0 && (
            <Text style={cardStyles.contentText} numberOfLines={3}>
              {highlightHashtags(cleanContent)}
            </Text>
          )}

        </View>
      </View>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        contentType="post"
        contentId={post.id}
        contentPreview={post.content}
        reportedUserId={post.userId}
      />
    </View>
  );
}

export default React.memo(FeedCardInner);

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0f0e0b',
    position: 'relative' as const,
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingTop: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrap: {
    marginRight: 8,
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  avatarText: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timeText: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  taggedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(15,14,11,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.2)',
    marginRight: 6,
  },
  taggedIndicatorText: {
    color: '#BFA35D',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  taggedDropdown: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: 'rgba(15,14,11,0.85)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        }
      : {}),
    elevation: 10,
  },
  taggedDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  taggedDropdownTitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  taggedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taggedUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  taggedUserAvatarText: {
    color: '#E8DCC8',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  taggedUserInfo: {
    flex: 1,
  },
  taggedUserName: {
    color: '#E8DCC8',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  taggedUserHandle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 10,
    marginTop: 1,
  },
  moreBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownMenuDropdown: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: 'rgba(15,14,11,0.9)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        }
      : {}),
    elevation: 10,
  },
  ownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ownMenuItemText: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  ownMenuDivider: {
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.1)',
    marginHorizontal: 14,
  },
  reactionBar: {
    position: 'absolute' as const,
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  reactionBarInner: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,14,11,0.55)',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.12)',
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        }
      : {}),
    elevation: 8,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  reactionDivider: {
    width: 20,
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.2)',
    marginVertical: 2,
  },
  reactionCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(15,14,11,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    marginBottom: 8,
  },
  locationPillText: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 11,
    fontWeight: '500' as const,
    maxWidth: 180,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.18)',
  },
  tagPillText: {
    color: 'rgba(191,163,93,0.8)',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  contentText: {
    color: '#E8DCC8',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  textOnlyContent: {
    color: '#E8DCC8',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600' as const,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  hashtag: {
    color: '#BFA35D',
    fontWeight: '700' as const,
  },
  flagIndicator: {
    marginTop: 8,
  },
  textOnlyPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  textOnlyQuoteMark: {
    position: 'absolute' as const,
    top: 60,
    left: 20,
    opacity: 0.06,
  },
  quoteMark: {
    fontSize: 120,
    color: '#BFA35D',
    fontWeight: '900' as const,
    lineHeight: 120,
  },
});

const doubleTapStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});

const shimmerStyles = StyleSheet.create({
  shimmerBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
});
