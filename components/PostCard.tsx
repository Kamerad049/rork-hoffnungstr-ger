import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { Heart, MessageCircle, Share2, MoreHorizontal, Flag, Play } from 'lucide-react-native';
import RankIcon from '@/components/RankIcon';
import WavingFlag from '@/components/WavingFlag';
import { useTheme } from '@/providers/ThemeProvider';
import { usePosts } from '@/providers/PostsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';
import * as Haptics from 'expo-haptics';
import ReportModal from '@/components/ReportModal';

interface PostCardProps {
  post: FeedPost;
  onCommentPress?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
}

function PostCardInner({ post, onCommentPress, onUserPress }: PostCardProps) {
  const { colors } = useTheme();
  const { toggleLike, isLiked } = usePosts();
  const { user } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const author = post.userId === 'me'
    ? {
        displayName: user?.name ?? 'Ich',
        username: user?.name?.toLowerCase().replace(/\s/g, '_') ?? 'ich',
        rankIcon: 'Compass',
        rank: 'Entdecker',
        avatarUrl: null as string | null,
      }
    : (() => {
        const u = getUserById(post.userId);
        return u
          ? { displayName: u.displayName, username: u.username, rankIcon: u.rankIcon, rank: u.rank, avatarUrl: u.avatarUrl }
          : { displayName: 'Unbekannt', username: 'unknown', rankIcon: 'Search', rank: 'Sucher', avatarUrl: null as string | null };
      })();

  const liked = isLiked(post.id);
  const likeCount = post.likeCount + (liked ? 1 : 0);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }, [post.id, toggleLike, scaleAnim]);

  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);

  const handleMorePress = useCallback(() => {
    if (post.userId === 'me') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu((prev) => !prev);
  }, [post.userId]);

  const handleReportPress = useCallback(() => {
    setShowMenu(false);
    setShowReport(true);
  }, []);

  const initial = author.displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.authorRow}
          onPress={() => post.userId !== 'me' && onUserPress?.(post.userId)}
        >
          <View style={styles.avatarWrapper}>
            {author.avatarUrl ? (
              <Image source={{ uri: author.avatarUrl }} style={[styles.avatar, { backgroundColor: colors.accent }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: colors.primaryText }]} numberOfLines={1}>
                {author.displayName}
              </Text>
              <RankIcon icon={author.rankIcon} size={13} color="#8e8e93" />
            </View>
            <Text style={[styles.timeText, { color: colors.tertiaryText }]}>
              {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </Pressable>
        {post.userId !== 'me' && (
          <Pressable hitSlop={10} onPress={handleMorePress} testID={`post-more-${post.id}`}>
            <MoreHorizontal size={18} color={colors.tertiaryText} />
          </Pressable>
        )}
      </View>

      {showMenu && (
        <Pressable
          style={[styles.menuOverlay]}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuPopup, { backgroundColor: colors.surfaceSecondary }]}>
            <Pressable
              style={styles.menuItem}
              onPress={handleReportPress}
              testID={`post-report-${post.id}`}
            >
              <Flag size={16} color="#C06060" />
              <Text style={[styles.menuText, { color: '#C06060' }]}>Melden</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {post.content.length > 0 && (
        <Text style={[styles.content, { color: colors.primaryText }]}>{post.content}</Text>
      )}

      {post.mediaUrls.length > 0 && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
          {post.mediaType === 'video' && (
            <View style={styles.videoOverlay}>
              <View style={styles.playButton}>
                <Play size={28} color="#fff" fill="#fff" />
              </View>
            </View>
          )}
        </View>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable style={styles.actionBtn} onPress={handleLike} testID={`like-${post.id}`}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Heart
              size={20}
              color={liked ? '#E05555' : colors.tertiaryText}
              fill={liked ? '#E05555' : 'transparent'}
            />
          </Animated.View>
          <Text style={[styles.actionCount, { color: liked ? '#E05555' : colors.tertiaryText }]}>
            {likeCount > 0 ? likeCount : ''}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => onCommentPress?.(post.id)}
          testID={`comment-${post.id}`}
        >
          <MessageCircle size={20} color={colors.tertiaryText} />
          <Text style={[styles.actionCount, { color: colors.tertiaryText }]}>
            {post.commentCount > 0 ? post.commentCount : ''}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Share2 size={18} color={colors.tertiaryText} />
        </Pressable>
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

export default React.memo(PostCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative' as const,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  flagBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -4,
    zIndex: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  rankEmoji: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  mediaContainer: {
    position: 'relative' as const,
  },
  postImage: {
    width: '100%',
    height: 240,
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
    paddingLeft: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  menuOverlay: {
    position: 'absolute',
    top: 48,
    right: 14,
    zIndex: 10,
  },
  menuPopup: {
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
