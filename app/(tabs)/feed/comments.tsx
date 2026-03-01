import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Shield, CornerDownRight, ChevronDown, X } from 'lucide-react-native';
import { usePosts } from '@/providers/PostsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { PostComment } from '@/constants/types';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

interface CommentThread {
  comment: PostComment;
  replies: PostComment[];
}

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { getComments, addComment } = usePosts();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState<string>('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [defendedComments, setDefendedComments] = useState<string[]>([]);
  const [localDefendCounts, setLocalDefendCounts] = useState<Record<string, number>>({});
  const [collapsedThreads, setCollapsedThreads] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const defendAnims = useRef<Record<string, Animated.Value>>({}).current;
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  }, [router, slideAnim, backdropAnim]);

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

    const result: CommentThread[] = [];
    for (const c of topLevel) {
      const directReplies = replyMap[c.id] ?? [];
      const allReplies: PostComment[] = [...directReplies];
      for (const r of directReplies) {
        const nested = replyMap[r.id] ?? [];
        allReplies.push(...nested);
      }
      allReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      result.push({ comment: c, replies: allReplies });
    }
    return result;
  }, [comments]);

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
      setDefendedComments(prev => prev.filter(id => id !== commentId));
      setLocalDefendCounts(prev => ({ ...prev, [commentId]: (prev[commentId] ?? 0) - 1 }));
    } else {
      setDefendedComments(prev => [...prev, commentId]);
      setLocalDefendCounts(prev => ({ ...prev, [commentId]: (prev[commentId] ?? 0) + 1 }));
    }
  }, [defendedComments, defendAnims]);

  const handleUserPress = useCallback((userId: string) => {
    if (userId === 'me') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/user-profile', params: { userId } } as any);
  }, [router]);

  const toggleThread = useCallback((commentId: string) => {
    setCollapsedThreads(prev =>
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setInput('');
  }, []);

  const getDefendCount = useCallback((comment: PostComment): number => {
    return (comment.defendCount ?? 0) + (localDefendCounts[comment.id] ?? 0);
  }, [localDefendCounts]);

  const renderSingleComment = useCallback(
    (item: PostComment, isReply: boolean) => {
      const isMe = item.userId === 'me';
      const commentUser = isMe ? null : getUserById(item.userId);
      const name = isMe ? (user?.name ?? 'Ich') : (commentUser?.displayName ?? 'Unbekannt');
      const avatarUrl = isMe ? null : (commentUser?.avatarUrl ?? null);
      const initial = name.charAt(0).toUpperCase();
      const isDefended = defendedComments.includes(item.id);
      const defendCount = getDefendCount(item);

      if (!defendAnims[item.id]) {
        defendAnims[item.id] = new Animated.Value(1);
      }

      return (
        <View
          key={item.id}
          style={[styles.commentRow, isReply && styles.replyRow]}
        >
          {isReply && (
            <View style={styles.replyLine} />
          )}
          <Pressable
            style={styles.commentAvatar}
            onPress={() => handleUserPress(item.userId)}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.commentAvatarImg} />
            ) : (
              <Text style={styles.commentAvatarText}>{initial}</Text>
            )}
          </Pressable>
          <View style={styles.commentBody}>
            <View style={styles.commentBubble}>
              <View style={styles.commentHeader}>
                <Pressable onPress={() => handleUserPress(item.userId)} hitSlop={6}>
                  <Text style={styles.commentName}>{name}</Text>
                </Pressable>
                <Text style={styles.commentTime}>
                  {formatTimeAgo(item.createdAt)}
                </Text>
              </View>
              <Text style={styles.commentText}>
                {item.content}
              </Text>
            </View>

            <View style={styles.commentActions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleReply(item)}
                hitSlop={8}
              >
                <CornerDownRight size={13} color="rgba(191,163,93,0.5)" />
                <Text style={styles.actionText}>Antworten</Text>
              </Pressable>

              <Pressable
                style={styles.actionBtn}
                onPress={() => handleDefend(item.id)}
                hitSlop={8}
              >
                <Animated.View style={{ transform: [{ scale: defendAnims[item.id] }] }}>
                  <Shield
                    size={13}
                    color={isDefended ? '#BFA35D' : 'rgba(191,163,93,0.5)'}
                    fill={isDefended ? 'rgba(191,163,93,0.25)' : 'transparent'}
                  />
                </Animated.View>
                <Text style={[styles.actionText, isDefended && styles.actionTextActive]}>
                  Verteidigen{defendCount > 0 ? ` · ${defendCount}` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [user, defendedComments, defendAnims, handleUserPress, handleReply, handleDefend, getDefendCount]
  );

  const renderThread = useCallback(
    ({ item }: { item: CommentThread }) => {
      const isCollapsed = collapsedThreads.includes(item.comment.id);
      const replyCount = item.replies.length;

      return (
        <View style={styles.threadContainer}>
          {renderSingleComment(item.comment, false)}

          {replyCount > 0 && (
            <>
              {!isCollapsed ? (
                <>
                  {item.replies.map(reply => renderSingleComment(reply, true))}
                  {replyCount > 2 && (
                    <Pressable
                      style={styles.collapseBtn}
                      onPress={() => toggleThread(item.comment.id)}
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
                  onPress={() => toggleThread(item.comment.id)}
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
    },
    [renderSingleComment, collapsedThreads, toggleThread]
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Noch keine Kommentare. Sei der Erste!
        </Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            height: SHEET_HEIGHT,
            paddingBottom: insets.bottom,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.sheetInner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={SCREEN_HEIGHT - SHEET_HEIGHT + 20}
        >
          <View style={styles.customHeader}>
            <View style={styles.handleBar} />
            <View style={styles.headerRow}>
              <Pressable onPress={handleClose} hitSlop={12} style={styles.headerCloseBtn}>
                <X size={22} color="#E8DCC8" />
              </Pressable>
              <Text style={styles.headerTitle}>Kommentare</Text>
              <View style={styles.headerBackBtn} />
            </View>
          </View>

          <FlatList
            data={threads}
            renderItem={renderThread}
            keyExtractor={(item) => item.comment.id}
            ListEmptyComponent={ListEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.list}
          />

          <View style={styles.inputSection}>
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    backgroundColor: '#141416',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetInner: {
    flex: 1,
  },
  customHeader: {
    backgroundColor: '#141416',
    paddingTop: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.25)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.1)',
  },
  headerBackBtn: {
    width: 40,
  },
  headerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  threadContainer: {
    marginBottom: 6,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
    paddingLeft: 0,
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  actionTextActive: {
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
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.4)',
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
});
