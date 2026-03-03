import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useAlert } from '@/providers/AlertProvider';
import OptimizedImage, { OptimizedAvatar } from '@/components/OptimizedImage';
import { Users, MessageCircle, Share2, MoreHorizontal, MapPin, X, ChevronRight, Pencil, MessageCircleOff, Archive, Trash2, Bookmark, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import RankIcon from '@/components/RankIcon';
import FloatingReactions from '@/components/FloatingReactions';
import { RespektIcon, AnerkennungIcon, ZuspruchIcon, VerbundenheitIcon, EhreIcon } from '@/components/ReactionIcons';

import { usePosts } from '@/providers/PostsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';
import ReportModal from '@/components/ReportModal';
import ShareModal from '@/components/ShareModal';

export type PostReactionType = 'respekt' | 'anerkennung' | 'zuspruch' | 'verbundenheit' | 'ehre';

type ReactionSvgComponent = React.FC<{ size?: number; color?: string; fill?: string }>;

const REACTION_CONFIG: { type: PostReactionType; SvgIcon: ReactionSvgComponent; label: string; emoji: string }[] = [
  { type: 'respekt', SvgIcon: RespektIcon, label: 'Respekt', emoji: '🛡️' },
  { type: 'anerkennung', SvgIcon: AnerkennungIcon, label: 'Anerkennung', emoji: '⭐' },
  { type: 'zuspruch', SvgIcon: ZuspruchIcon, label: 'Zuspruch', emoji: '💪' },
  { type: 'verbundenheit', SvgIcon: VerbundenheitIcon, label: 'Verbundenheit', emoji: '🤝' },
  { type: 'ehre', SvgIcon: EhreIcon, label: 'Ehre', emoji: '🏆' },
];

const TEXT_GRADIENTS: [string, string, ...string[]][] = [
  ['#1a1510', '#0f0e0b', '#12100d'],
  ['#151210', '#0d0b0a', '#110f0d'],
  ['#13110f', '#0e0c0a', '#100e0c'],
];

interface FeedCardProps {
  post: FeedPost;
  cardWidth: number;
  onCommentPress: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onPostPress: (postId: string) => void;
  onLocationPress?: (location: string) => void;
  onEditPress?: (post: FeedPost) => void;
  onArchivePress?: (postId: string) => void;
  onDeletePress?: (postId: string) => void;
  onToggleCommentsPress?: (postId: string) => void;
  onAdminDeletePress?: (post: FeedPost) => void;
  reaction: PostReactionType | null;
  onReaction: (postId: string, type: PostReactionType) => void;
  isActive?: boolean;
}

function FeedCardInner({
  post,
  cardWidth,
  onCommentPress,
  onUserPress,
  onPostPress,
  onLocationPress,
  onEditPress,
  onArchivePress,
  onDeletePress,
  onToggleCommentsPress,
  onAdminDeletePress,
  reaction,
  onReaction,
  isActive = true,
}: FeedCardProps) {
  const { toggleLike, isLiked, isCommentsDisabled } = usePosts();
  const { profile: socialProfile } = useSocial();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showTaggedPeople, setShowTaggedPeople] = useState<boolean>(false);
  const [showOwnMenu, setShowOwnMenu] = useState<boolean>(false);
  const [showReactionMenu, setShowReactionMenu] = useState<boolean>(false);
  const [floatingTrigger, setFloatingTrigger] = useState<number>(0);
  const [floatingEmoji, setFloatingEmoji] = useState<string>('🛡️');
  const [showShare, setShowShare] = useState<boolean>(false);

  const ownMenuAnim = useRef(new Animated.Value(0)).current;
  const reactionMenuAnim = useRef(new Animated.Value(0)).current;
  const reactionItemAnims = useRef(REACTION_CONFIG.map(() => new Animated.Value(0))).current;
  const [reactionIconSize] = useState(28);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const taggedPeopleAnim = useRef(new Animated.Value(0)).current;
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;

  const imageHeight = cardWidth * 1.1;

  const author = post.userId === 'me'
    ? {
        displayName: socialProfile?.displayName || user?.name || 'Ich',
        username: user?.name?.toLowerCase().replace(/\s/g, '_') ?? 'ich',
        rankIcon: 'Compass',
        rank: 'Neuling',
        avatarUrl: socialProfile?.avatarUrl ?? null,
      }
    : (() => {
        const u = getUserById(post.userId);
        return u
          ? { displayName: u.displayName, username: u.username, rankIcon: u.rankIcon, rank: u.rank, avatarUrl: u.avatarUrl }
          : { displayName: 'Unbekannt', username: 'unknown', rankIcon: 'Eye', rank: 'Neuling', avatarUrl: null as string | null };
      })();

  const liked = isLiked(post.id);
  const hasImage = post.mediaUrls.length > 0;
  const initial = author.displayName.charAt(0).toUpperCase();
  const gradientIndex = Math.abs(post.id.charCodeAt(1) ?? 0) % TEXT_GRADIENTS.length;

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
      if (showReactionMenu) {
        setShowReactionMenu(false);
        reactionMenuAnim.setValue(0);
        reactionItemAnims.forEach((a) => a.setValue(0));
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

  const handleCardPress = useCallback(() => {
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
    if (showReactionMenu) {
      closeReactionMenu();
      return;
    }
    onPostPress(post.id);
  }, [showOwnMenu, showTaggedPeople, showReactionMenu, post.id, onPostPress]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowReactionMenu(true);
    Animated.spring(reactionMenuAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 15,
    }).start();
    reactionItemAnims.forEach((anim, idx) => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 180,
        friction: 12,
        delay: idx * 60,
      }).start();
    });
  }, [reactionMenuAnim, reactionItemAnims]);

  const closeReactionMenu = useCallback(() => {
    Animated.timing(reactionMenuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowReactionMenu(false);
      reactionItemAnims.forEach((a) => a.setValue(0));
    });
  }, [reactionMenuAnim, reactionItemAnims]);

  const handleReaction = useCallback(
    (type: PostReactionType, emoji: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onReaction(post.id, type);
      if (!liked) toggleLike(post.id);
      setFloatingEmoji(emoji);
      setFloatingTrigger((prev) => prev + 1);
      closeReactionMenu();
      Animated.sequence([
        Animated.spring(likeScaleAnim, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
        Animated.spring(likeScaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
      ]).start();
    },
    [post.id, onReaction, liked, toggleLike, closeReactionMenu, likeScaleAnim]
  );

  const handleQuickLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLike(post.id);
    if (!liked) {
      setFloatingEmoji('🛡️');
      setFloatingTrigger((prev) => prev + 1);
    }
    Animated.sequence([
      Animated.spring(likeScaleAnim, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(likeScaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }, [post.id, toggleLike, liked, likeScaleAnim]);

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
  const isAdmin = user?.isAdmin === true;
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
              height: imageHeight,
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

  const activeReactionConfig = reaction ? REACTION_CONFIG.find((r) => r.type === reaction) : null;

  return (
    <View style={[cardStyles.card, { width: cardWidth }]}>
      <FloatingReactions emoji={floatingEmoji} trigger={floatingTrigger} />

      <View style={[cardStyles.imageContainer, { height: hasImage ? imageHeight : imageHeight * 0.6 }]}>
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
              colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.55)']}
              locations={[0, 0.2, 0.65, 1]}
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
          onPress={handleCardPress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          testID={`feed-card-${post.id}`}
        />

        <Animated.View
          style={[
            doubleTapStyles.container,
            {
              opacity: doubleTapAnim,
              transform: [{
                scale: doubleTapAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1.2, 1],
                }),
              }],
            },
          ]}
          pointerEvents="none"
        />

        <View style={cardStyles.overlayTop} pointerEvents="box-none">
          <View style={cardStyles.topRow}>
            <Pressable style={cardStyles.authorRow} onPress={handleUserTap}>
              <View style={cardStyles.avatarWrap}>
                {author.avatarUrl ? (
                  <OptimizedAvatar uri={author.avatarUrl} size={38} borderRadius={10} />
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
              onPress={isOwnPost || isAdmin ? toggleOwnMenu : () => setShowReport(true)}
              testID={`card-more-${post.id}`}
            >
              <MoreHorizontal size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
        </View>

        {showOwnMenu && (isOwnPost || isAdmin) && (
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
            {isOwnPost && (
              <>
                <Pressable
                  style={cardStyles.ownMenuItem}
                  onPress={() => { setShowOwnMenu(false); ownMenuAnim.setValue(0); onEditPress?.(post); }}
                >
                  <Pencil size={15} color="#E8DCC8" />
                  <Text style={cardStyles.ownMenuItemText}>Bearbeiten</Text>
                </Pressable>
                <View style={cardStyles.ownMenuDivider} />
                <Pressable
                  style={cardStyles.ownMenuItem}
                  onPress={() => { setShowOwnMenu(false); ownMenuAnim.setValue(0); onToggleCommentsPress?.(post.id); }}
                >
                  <MessageCircleOff size={15} color={commentsOff ? '#BFA35D' : '#E8DCC8'} />
                  <Text style={[cardStyles.ownMenuItemText, commentsOff && { color: '#BFA35D' }]}>
                    {commentsOff ? 'Kommentare aktivieren' : 'Kommentare deaktivieren'}
                  </Text>
                </Pressable>
                <View style={cardStyles.ownMenuDivider} />
                <Pressable
                  style={cardStyles.ownMenuItem}
                  onPress={() => { setShowOwnMenu(false); ownMenuAnim.setValue(0); onArchivePress?.(post.id); }}
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
                    showAlert(
                      'Beitrag löschen?',
                      'Dieser Beitrag wird endgültig gelöscht.',
                      [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Endgültig löschen', style: 'destructive', onPress: () => onDeletePress?.(post.id) },
                      ],
                      'warning',
                    );
                  }}
                >
                  <Trash2 size={15} color="#C0392B" />
                  <Text style={[cardStyles.ownMenuItemText, { color: '#C0392B' }]}>Löschen</Text>
                </Pressable>
              </>
            )}
            {!isOwnPost && isAdmin && (
              <>
                <Pressable
                  style={cardStyles.ownMenuItem}
                  onPress={() => {
                    setShowOwnMenu(false);
                    ownMenuAnim.setValue(0);
                    onAdminDeletePress?.(post);
                  }}
                >
                  <ShieldAlert size={15} color="#C0392B" />
                  <Text style={[cardStyles.ownMenuItemText, { color: '#C0392B' }]}>Admin: Beitrag entfernen</Text>
                </Pressable>
                <View style={cardStyles.ownMenuDivider} />
                <Pressable
                  style={cardStyles.ownMenuItem}
                  onPress={() => {
                    setShowOwnMenu(false);
                    ownMenuAnim.setValue(0);
                    setShowReport(true);
                  }}
                >
                  <Trash2 size={15} color="#E8DCC8" />
                  <Text style={cardStyles.ownMenuItemText}>Melden</Text>
                </Pressable>
              </>
            )}
            {isOwnPost && isAdmin && (
              <>
                <View style={cardStyles.ownMenuDivider} />
                <Pressable
                  style={cardStyles.ownMenuItem}
                  onPress={() => {
                    setShowOwnMenu(false);
                    ownMenuAnim.setValue(0);
                    onAdminDeletePress?.(post);
                  }}
                >
                  <ShieldAlert size={15} color="#BFA35D" />
                  <Text style={[cardStyles.ownMenuItemText, { color: '#BFA35D' }]}>Admin: Moderiert entfernen</Text>
                </Pressable>
              </>
            )}
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

        {showReactionMenu && (
          <Animated.View
            style={[
              cardStyles.reactionMenuOverlay,
              { opacity: reactionMenuAnim },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeReactionMenu} />
            <Animated.View
              style={[
                cardStyles.reactionMenuBubble,
                {
                  transform: [{
                    scale: reactionMenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  }],
                },
              ]}
            >
              <Text style={cardStyles.reactionMenuTitle}>Bewertung wählen</Text>
              <View style={cardStyles.reactionMenuRow}>
                {REACTION_CONFIG.map((r, idx) => {
                  const isChosen = reaction === r.type;
                  return (
                    <Animated.View
                      key={r.type}
                      style={{
                        opacity: reactionItemAnims[idx],
                        transform: [{
                          translateY: reactionItemAnims[idx].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        }, {
                          scale: reactionItemAnims[idx].interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.5, 1.1, 1],
                          }),
                        }],
                      }}
                    >
                      <Pressable
                        style={[
                          cardStyles.reactionMenuBtn,
                          isChosen && cardStyles.reactionMenuBtnActive,
                        ]}
                        onPress={() => handleReaction(r.type, r.emoji)}
                        testID={`reaction-${r.type}-${post.id}`}
                      >
                        <r.SvgIcon
                          size={reactionIconSize}
                          color={isChosen ? '#BFA35D' : 'rgba(232,220,200,0.7)'}
                          fill={isChosen ? 'rgba(191,163,93,0.15)' : 'none'}
                        />
                        <Text style={[
                          cardStyles.reactionMenuLabel,
                          isChosen && cardStyles.reactionMenuLabelActive,
                        ]}>{r.label}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {hasImage && post.location && (
          <View style={cardStyles.overlayBottom} pointerEvents="box-none">
            <Pressable style={cardStyles.locationPill} onPress={handleLocationPress} hitSlop={6}>
              <MapPin size={10} color="#BFA35D" />
              <Text style={cardStyles.locationPillText} numberOfLines={1}>{post.location}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={cardStyles.contentSection}>
        {cleanContent.length > 0 && (
          <Text
            style={hasImage ? cardStyles.contentText : cardStyles.textOnlyContent}
            numberOfLines={hasImage ? 3 : 8}
          >
            {highlightHashtags(cleanContent)}
          </Text>
        )}

        {!hasImage && post.location && (
          <Pressable style={cardStyles.locationPillBelow} onPress={handleLocationPress} hitSlop={6}>
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
      </View>

      <View style={cardStyles.actionBar}>
        <View style={cardStyles.actionBarLeft}>
          <Pressable
            style={cardStyles.actionBtn}
            onPress={handleQuickLike}
            onLongPress={handleLongPress}
            delayLongPress={400}
            testID={`like-btn-${post.id}`}
          >
            <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
              {activeReactionConfig ? (
                <activeReactionConfig.SvgIcon
                  size={22}
                  color={liked ? '#BFA35D' : 'rgba(232,220,200,0.5)'}
                  fill={liked ? 'rgba(191,163,93,0.2)' : 'none'}
                />
              ) : (
                <RespektIcon
                  size={22}
                  color={liked ? '#BFA35D' : 'rgba(232,220,200,0.5)'}
                  fill={liked ? 'rgba(191,163,93,0.2)' : 'none'}
                />
              )}
            </Animated.View>
            {(post.likeCount > 0 || liked) && (
              <Text style={[cardStyles.actionCount, liked && cardStyles.actionCountActive]}>
                {post.likeCount + (liked ? 1 : 0)}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={cardStyles.actionBtn}
            onPress={handleComment}
            testID={`card-comment-${post.id}`}
          >
            <MessageCircle size={22} color="rgba(232,220,200,0.5)" />
            {post.commentCount > 0 && (
              <Text style={cardStyles.actionCount}>{post.commentCount}</Text>
            )}
          </Pressable>

          <Pressable
            style={cardStyles.actionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowShare(true);
            }}
            testID={`share-btn-${post.id}`}
          >
            <Share2 size={20} color="rgba(232,220,200,0.5)" />
          </Pressable>
        </View>

        <Pressable style={cardStyles.actionBtn}>
          <Bookmark size={20} color="rgba(232,220,200,0.5)" />
        </Pressable>
      </View>

      {reaction && activeReactionConfig && (
        <View style={cardStyles.reactionIndicator}>
          <activeReactionConfig.SvgIcon size={14} color="#BFA35D" fill="rgba(191,163,93,0.15)" />
          <Text style={cardStyles.reactionIndicatorLabel}>
            {activeReactionConfig.label}
          </Text>
        </View>
      )}

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        contentType="post"
        contentId={post.id}
        contentPreview={post.content}
        reportedUserId={post.userId}
      />

      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        post={post}
        authorName={author.displayName}
      />
    </View>
  );
}

export default React.memo(FeedCardInner);

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1918',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  imageContainer: {
    position: 'relative' as const,
    overflow: 'hidden',
  },
  overlayTop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 12,
    zIndex: 30,
  },
  overlayBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  avatarText: {
    color: '#E8DCC8',
    fontSize: 14,
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
  moreBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownMenuDropdown: {
    position: 'absolute' as const,
    top: 56,
    left: 12,
    right: 12,
    zIndex: 50,
    backgroundColor: 'rgba(15,14,11,0.95)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16 }
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
  taggedDropdown: {
    position: 'absolute' as const,
    top: 56,
    left: 12,
    right: 12,
    zIndex: 50,
    backgroundColor: 'rgba(15,14,11,0.92)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16 }
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
  reactionMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reactionMenuBubble: {
    backgroundColor: 'rgba(20,18,16,0.97)',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 24 }
      : {}),
    elevation: 20,
  },
  reactionMenuTitle: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 16,
  },
  reactionMenuRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reactionMenuBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    minWidth: 58,
  },
  reactionMenuBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.18)',
    borderColor: 'rgba(191,163,93,0.35)',
  },
  reactionMenuIconWrap: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMenuLabel: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  reactionMenuLabelActive: {
    color: '#BFA35D',
  },
  contentSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  contentText: {
    color: '#E8DCC8',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  textOnlyContent: {
    color: '#E8DCC8',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  hashtag: {
    color: '#BFA35D',
    fontWeight: '700' as const,
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
  },
  locationPillBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.12)',
    marginTop: 6,
  },
  locationPillText: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 11,
    fontWeight: '500' as const,
    maxWidth: 180,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  tagPillText: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionCount: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionCountActive: {
    color: '#BFA35D',
  },
  reactionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  reactionIndicatorEmoji: {
    fontSize: 14,
  },
  reactionIndicatorLabel: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 11,
    fontWeight: '600' as const,
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
    top: 40,
    left: 20,
    opacity: 0.06,
  },
  quoteMark: {
    fontSize: 100,
    color: '#BFA35D',
    fontWeight: '900' as const,
    lineHeight: 100,
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
