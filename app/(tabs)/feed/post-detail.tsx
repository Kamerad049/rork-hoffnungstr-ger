import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Send, CornerDownRight, ChevronDown, MapPin, Share2, Bookmark, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import OptimizedImage, { OptimizedAvatar } from '@/components/OptimizedImage';
import RankIcon from '@/components/RankIcon';
import FloatingReactions from '@/components/FloatingReactions';
import { RespektIcon, AnerkennungIcon, ZuspruchIcon, VerbundenheitIcon, EhreIcon } from '@/components/ReactionIcons';
import { usePosts } from '@/providers/PostsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { PostComment } from '@/constants/types';

type PostReactionType = 'respekt' | 'anerkennung' | 'zuspruch' | 'verbundenheit' | 'ehre';

type ReactionSvgComponent = React.FC<{ size?: number; color?: string; fill?: string }>;

const REACTION_CONFIG: { type: PostReactionType; SvgIcon: ReactionSvgComponent; emoji: string; label: string }[] = [
  { type: 'respekt', SvgIcon: RespektIcon, emoji: '🛡️', label: 'Respekt' },
  { type: 'anerkennung', SvgIcon: AnerkennungIcon, emoji: '⭐', label: 'Anerkennung' },
  { type: 'zuspruch', SvgIcon: ZuspruchIcon, emoji: '💪', label: 'Zuspruch' },
  { type: 'verbundenheit', SvgIcon: VerbundenheitIcon, emoji: '🤝', label: 'Verbundenheit' },
  { type: 'ehre', SvgIcon: EhreIcon, emoji: '🏆', label: 'Ehre' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CommentThread {
  comment: PostComment;
  replies: PostComment[];
}

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { allPosts, getComments, addComment, loadCommentsForPost, toggleLike, isLiked, isPostSaved, savePost } = usePosts();
  const { profile: socialProfile } = useSocial();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [input, setInput] = useState<string>('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [defendedComments, setDefendedComments] = useState<string[]>([]);
  const [localDefendCounts, setLocalDefendCounts] = useState<Record<string, number>>({});
  const [collapsedThreads, setCollapsedThreads] = useState<string[]>([]);
  const [reaction, setReaction] = useState<PostReactionType | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<boolean>(false);
  const [floatingTrigger, setFloatingTrigger] = useState<number>(0);
  const [floatingEmoji, setFloatingEmoji] = useState<string>('🛡️');

  const inputRef = useRef<TextInput>(null);
  const defendAnims = useRef<Record<string, Animated.Value>>({}).current;
  const reactionPickerAnim = useRef(new Animated.Value(0)).current;
  const reactionItemAnims = useRef(REACTION_CONFIG.map(() => new Animated.Value(0))).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;

  const post = useMemo(() => allPosts.find((p) => p.id === postId), [allPosts, postId]);

  useEffect(() => {
    if (postId) {
      loadCommentsForPost(postId);
    }
  }, [postId, loadCommentsForPost]);

  const comments = useMemo(() => getComments(postId ?? ''), [getComments, postId]);

  const threads = useMemo((): CommentThread[] => {
    const topLevel: PostComment[] = [];
    const replyMap: Record<string, PostComment[]> = {};
    for (const c of comments) {
      if (c.replyToId) {
        if (!replyMap[c.replyToId]) replyMap[c.replyToId] = [];
        replyMap[c.replyToId].push(c);
      } else {
        topLevel.push(c);
      }
    }
    return topLevel.map((c) => {
      const directReplies = replyMap[c.id] ?? [];
      const allReplies: PostComment[] = [...directReplies];
      for (const r of directReplies) {
        allReplies.push(...(replyMap[r.id] ?? []));
      }
      allReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return { comment: c, replies: allReplies };
    });
  }, [comments]);

  const author = useMemo(() => {
    if (!post) return null;
    if (post.userId === 'me') {
      return {
        displayName: socialProfile?.displayName || user?.name || 'Ich',
        username: user?.name?.toLowerCase().replace(/\s/g, '_') ?? 'ich',
        rankIcon: 'Compass',
        avatarUrl: socialProfile?.avatarUrl ?? null,
      };
    }
    const u = getUserById(post.userId);
    return u
      ? { displayName: u.displayName, username: u.username, rankIcon: u.rankIcon, avatarUrl: u.avatarUrl }
      : { displayName: 'Unbekannt', username: 'unknown', rankIcon: 'Search', avatarUrl: null as string | null };
  }, [post, socialProfile, user]);

  const liked = isLiked(postId ?? '');
  const saved = isPostSaved(postId ?? '');

  const handleSend = useCallback(() => {
    if (!input.trim() || !postId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addComment(postId, input.trim());
    setInput('');
    setReplyTo(null);
  }, [input, postId, addComment]);

  const handleReply = useCallback((comment: PostComment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyTo(comment);
    const commentUser = comment.userId === 'me' ? null : getUserById(comment.userId);
    const username = comment.userId === 'me' ? 'ich' : (commentUser?.username ?? 'unknown');
    setInput(`@${username} `);
    inputRef.current?.focus();
  }, []);

  const handleDefend = useCallback((commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const alreadyDefended = defendedComments.includes(commentId);
    if (!defendAnims[commentId]) {
      defendAnims[commentId] = new Animated.Value(1);
    }
    Animated.sequence([
      Animated.spring(defendAnims[commentId], { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(defendAnims[commentId], { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    if (alreadyDefended) {
      setDefendedComments((prev) => prev.filter((id) => id !== commentId));
      setLocalDefendCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] ?? 0) - 1 }));
    } else {
      setDefendedComments((prev) => [...prev, commentId]);
      setLocalDefendCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] ?? 0) + 1 }));
    }
  }, [defendedComments, defendAnims]);

  const handleUserPress = useCallback((userId: string) => {
    if (userId === 'me') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/user-profile', params: { userId } } as any);
  }, [router]);

  const toggleThread = useCallback((commentId: string) => {
    setCollapsedThreads((prev) =>
      prev.includes(commentId) ? prev.filter((id) => id !== commentId) : [...prev, commentId]
    );
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setInput('');
  }, []);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (postId) toggleLike(postId);
    Animated.sequence([
      Animated.spring(likeScaleAnim, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(likeScaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }, [postId, toggleLike, likeScaleAnim]);

  const handleLongPressLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowReactionPicker(true);
    Animated.spring(reactionPickerAnim, {
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
  }, [reactionPickerAnim, reactionItemAnims]);

  const closeReactionPicker = useCallback(() => {
    Animated.timing(reactionPickerAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowReactionPicker(false);
      reactionItemAnims.forEach((a) => a.setValue(0));
    });
  }, [reactionPickerAnim, reactionItemAnims]);

  const handleReaction = useCallback((type: PostReactionType, emoji: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReaction((prev) => prev === type ? null : type);
    if (postId && !liked) toggleLike(postId);
    setFloatingEmoji(emoji);
    setFloatingTrigger((prev) => prev + 1);
    closeReactionPicker();
    Animated.sequence([
      Animated.spring(likeScaleAnim, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(likeScaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }, [postId, liked, toggleLike, closeReactionPicker, likeScaleAnim]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (postId) savePost(postId);
  }, [postId, savePost]);

  if (!post || !author) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Beitrag nicht gefunden</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Zurück</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasImage = post.mediaUrls.length > 0;
  const initial = author.displayName.charAt(0).toUpperCase();
  const activeReaction = reaction ? REACTION_CONFIG.find((r) => r.type === reaction) : null;
  const imageContainerRef = useRef<View>(null);

  const renderComment = (item: PostComment, isReply: boolean) => {
    const isMe = item.userId === 'me';
    const commentUser = isMe ? null : getUserById(item.userId);
    const name = isMe ? (user?.name ?? 'Ich') : (commentUser?.displayName ?? 'Unbekannt');
    const avatarUrl = isMe ? null : (commentUser?.avatarUrl ?? null);
    const commentInitial = name.charAt(0).toUpperCase();
    const isDefended = defendedComments.includes(item.id);
    const defendCount = (item.defendCount ?? 0) + (localDefendCounts[item.id] ?? 0);

    if (!defendAnims[item.id]) {
      defendAnims[item.id] = new Animated.Value(1);
    }

    return (
      <View key={item.id} style={[styles.commentRow, isReply && styles.replyRow]}>
        {isReply && <View style={styles.replyLine} />}
        <Pressable style={styles.commentAvatar} onPress={() => handleUserPress(item.userId)}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.commentAvatarImg} />
          ) : (
            <Text style={styles.commentAvatarText}>{commentInitial}</Text>
          )}
        </Pressable>
        <View style={styles.commentBody}>
          <View style={styles.commentBubble}>
            <View style={styles.commentHeader}>
              <Pressable onPress={() => handleUserPress(item.userId)} hitSlop={6}>
                <Text style={styles.commentName}>{name}</Text>
              </Pressable>
              <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
          <View style={styles.commentActions}>
            <Pressable style={styles.commentActionBtn} onPress={() => handleReply(item)} hitSlop={8}>
              <CornerDownRight size={13} color="rgba(191,163,93,0.5)" />
              <Text style={styles.commentActionText}>Antworten</Text>
            </Pressable>
            <Pressable style={styles.commentActionBtn} onPress={() => handleDefend(item.id)} hitSlop={8}>
              <Animated.View style={{ transform: [{ scale: defendAnims[item.id] }] }}>
                <Shield
                  size={13}
                  color={isDefended ? '#BFA35D' : 'rgba(191,163,93,0.5)'}
                  fill={isDefended ? 'rgba(191,163,93,0.25)' : 'transparent'}
                />
              </Animated.View>
              <Text style={[styles.commentActionText, isDefended && styles.commentActionTextActive]}>
                Verteidigen{defendCount > 0 ? ` · ${defendCount}` : ''}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <FloatingReactions emoji={floatingEmoji} trigger={floatingTrigger} />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={22} color="#E8DCC8" />
        </Pressable>
        <Text style={styles.headerTitle}>Beitrag</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.authorSection} onPress={() => handleUserPress(post.userId)}>
            <View style={styles.authorAvatar}>
              {author.avatarUrl ? (
                <OptimizedAvatar uri={author.avatarUrl} size={44} borderRadius={12} />
              ) : (
                <View style={styles.authorAvatarFallback}>
                  <Text style={styles.authorAvatarText}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={styles.authorInfo}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{author.displayName}</Text>
                <RankIcon icon={author.rankIcon} size={12} color="rgba(191,163,93,0.7)" />
              </View>
              <Text style={styles.authorTime}>{formatTimeAgo(post.createdAt)}</Text>
            </View>
          </Pressable>

          {hasImage && (
            <View ref={imageContainerRef} style={styles.imageContainer}>
              <OptimizedImage
                source={{ uri: post.mediaUrls[0] }}
                style={styles.postImage}
                contentFit="cover"
                variant="dark"
              />
              <Pressable
                style={StyleSheet.absoluteFill}
                onLongPress={handleLongPressLike}
                delayLongPress={400}
              />
              {showReactionPicker && (
                <Animated.View
                  style={[
                    styles.reactionOverlay,
                    { opacity: reactionPickerAnim },
                  ]}
                >
                  <Pressable style={StyleSheet.absoluteFill} onPress={closeReactionPicker} />
                  <Animated.View
                    style={[
                      styles.reactionBubble,
                      {
                        transform: [{
                          scale: reactionPickerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          }),
                        }],
                      },
                    ]}
                  >
                    <Text style={styles.reactionTitle}>Bewertung wählen</Text>
                    <View style={styles.reactionRow}>
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
                                styles.reactionBtn,
                                isChosen && styles.reactionBtnActive,
                              ]}
                              onPress={() => handleReaction(r.type, r.emoji)}
                            >
                              <r.SvgIcon
                                size={28}
                                color={isChosen ? '#BFA35D' : 'rgba(232,220,200,0.7)'}
                                fill={isChosen ? 'rgba(191,163,93,0.15)' : 'none'}
                              />
                              <Text style={[
                                styles.reactionLabel,
                                isChosen && styles.reactionLabelActive,
                              ]}>{r.label}</Text>
                            </Pressable>
                          </Animated.View>
                        );
                      })}
                    </View>
                  </Animated.View>
                </Animated.View>
              )}
            </View>
          )}

          {post.content.length > 0 && (
            <Text style={styles.postContent}>{post.content}</Text>
          )}

          {post.location && (
            <View style={styles.locationRow}>
              <MapPin size={12} color="#BFA35D" />
              <Text style={styles.locationText}>{post.location}</Text>
            </View>
          )}

          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionBar}>
            <View style={styles.actionBarLeft}>
              <Pressable
                style={styles.actionBtn}
                onPress={handleLike}
                onLongPress={handleLongPressLike}
                delayLongPress={400}
              >
                <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
                  {activeReaction ? (
                    <activeReaction.SvgIcon
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
                  <Text style={[styles.actionCount, liked && styles.actionCountActive]}>
                    {post.likeCount + (liked ? 1 : 0)}
                  </Text>
                )}
              </Pressable>
              <Pressable style={styles.actionBtn}>
                <Share2 size={20} color="rgba(232,220,200,0.5)" />
              </Pressable>
            </View>
            <Pressable style={styles.actionBtn} onPress={handleSave}>
              <Bookmark
                size={20}
                color={saved ? '#BFA35D' : 'rgba(232,220,200,0.5)'}
                fill={saved ? 'rgba(191,163,93,0.3)' : 'transparent'}
              />
            </Pressable>
          </View>

          {!hasImage && showReactionPicker && (
            <Animated.View
              style={[
                styles.noImageReactionOverlay,
                {
                  opacity: reactionPickerAnim,
                  transform: [{
                    scale: reactionPickerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.reactionTitle}>Bewertung wählen</Text>
              <View style={styles.reactionRow}>
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
                          styles.reactionBtn,
                          isChosen && styles.reactionBtnActive,
                        ]}
                        onPress={() => handleReaction(r.type, r.emoji)}
                      >
                        <r.SvgIcon
                          size={28}
                          color={isChosen ? '#BFA35D' : 'rgba(232,220,200,0.7)'}
                          fill={isChosen ? 'rgba(191,163,93,0.15)' : 'none'}
                        />
                        <Text style={[
                          styles.reactionLabel,
                          isChosen && styles.reactionLabelActive,
                        ]}>{r.label}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {reaction && activeReaction && (
            <View style={styles.reactionIndicator}>
              <activeReaction.SvgIcon size={14} color="#BFA35D" fill="rgba(191,163,93,0.15)" />
              <Text style={styles.reactionIndicatorLabel}>{activeReaction.label}</Text>
            </View>
          )}

          <View style={styles.commentsSectionHeader}>
            <Text style={styles.commentsSectionTitle}>
              Kommentare {comments.length > 0 ? `(${comments.length})` : ''}
            </Text>
          </View>

          {threads.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>Noch keine Kommentare. Sei der Erste!</Text>
            </View>
          ) : (
            threads.map((thread) => {
              const isCollapsed = collapsedThreads.includes(thread.comment.id);
              const replyCount = thread.replies.length;
              return (
                <View key={thread.comment.id} style={styles.threadContainer}>
                  {renderComment(thread.comment, false)}
                  {replyCount > 0 && (
                    <>
                      {!isCollapsed ? (
                        <>
                          {thread.replies.map((reply) => renderComment(reply, true))}
                          {replyCount > 2 && (
                            <Pressable
                              style={styles.collapseBtn}
                              onPress={() => toggleThread(thread.comment.id)}
                              hitSlop={8}
                            >
                              <ChevronDown size={12} color="rgba(191,163,93,0.5)" style={{ transform: [{ rotate: '180deg' }] }} />
                              <Text style={styles.collapseText}>Antworten ausblenden</Text>
                            </Pressable>
                          )}
                        </>
                      ) : (
                        <Pressable
                          style={styles.collapseBtn}
                          onPress={() => toggleThread(thread.comment.id)}
                          hitSlop={8}
                        >
                          <ChevronDown size={12} color="rgba(191,163,93,0.5)" />
                          <Text style={styles.collapseText}>
                            {replyCount} {replyCount === 1 ? 'Antwort' : 'Antworten'} anzeigen
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.inputSection, { paddingBottom: insets.bottom + 8 }]}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <CornerDownRight size={12} color="#BFA35D" />
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Antwort an {replyTo.userId === 'me' ? 'dich' : (getUserById(replyTo.userId)?.displayName ?? 'Unbekannt')}
              </Text>
              <Pressable onPress={cancelReply} hitSlop={8}>
                <Text style={styles.replyCancel}>Abbrechen</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Kommentar schreiben..."
              placeholderTextColor="rgba(191,163,93,0.35)"
              value={input}
              onChangeText={setInput}
              maxLength={1000}
              testID="comment-input"
            />
            <Pressable
              style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : undefined]}
              onPress={handleSend}
              disabled={!input.trim()}
              testID="send-comment-btn"
            >
              <Send size={18} color={input.trim() ? '#0f0e0b' : 'rgba(191,163,93,0.3)'} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.08)',
    backgroundColor: '#161514',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingTop: 0,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  authorAvatar: {
    marginRight: 12,
  },
  authorAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  authorAvatarText: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  authorName: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  authorTime: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: '#0f0e0b',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postContent: {
    color: '#E8DCC8',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  locationText: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  tagPillText: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.06)',
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
  reactionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reactionBubble: {
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
  reactionTitle: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reactionBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    minWidth: 58,
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.18)',
    borderColor: 'rgba(191,163,93,0.35)',
  },
  reactionLabel: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  reactionLabelActive: {
    color: '#BFA35D',
  },
  noImageReactionOverlay: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(20,18,16,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 24 }
      : {}),
    elevation: 20,
  },
  reactionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  reactionIndicatorLabel: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  commentsSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  commentsSectionTitle: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCommentsText: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 14,
  },
  threadContainer: {
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  replyRow: {
    paddingLeft: 28,
    position: 'relative' as const,
  },
  replyLine: {
    position: 'absolute' as const,
    left: 16,
    top: 0,
    bottom: 8,
    width: 1.5,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderRadius: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  commentAvatarText: {
    color: '#BFA35D',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  commentAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: 'rgba(42,42,46,0.7)',
    borderRadius: 14,
    padding: 12,
    paddingBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  commentTime: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.4)',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(232,220,200,0.8)',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: 4,
    paddingTop: 6,
    paddingBottom: 6,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  commentActionTextActive: {
    color: '#BFA35D',
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 42,
    paddingVertical: 6,
  },
  collapseText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  inputSection: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(191,163,93,0.1)',
    backgroundColor: '#1c1c1e',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(191,163,93,0.6)',
    fontWeight: '500' as const,
  },
  replyCancel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#E8DCC8',
    backgroundColor: 'rgba(42,42,46,0.6)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  sendBtnActive: {
    backgroundColor: '#BFA35D',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  backBtnText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
