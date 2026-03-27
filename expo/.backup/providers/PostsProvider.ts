import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { FeedPost, PostComment } from '@/constants/types';

export const [PostsProvider, usePosts] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { blockedUsers } = useFriends();

  const [allPostsState, setAllPostsState] = useState<FeedPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [commentsCache, setCommentsCache] = useState<Record<string, PostComment[]>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        console.log('[POSTS] Loading posts for user:', userId);
        const [postsRes, likesRes] = await Promise.all([
          supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('post_likes').select('post_id').eq('user_id', userId),
        ]);

        const dbPosts = (postsRes.data ?? []).map((p: any) => ({
          id: p.id,
          userId: p.user_id === userId ? 'me' : p.user_id,
          content: p.content ?? '',
          mediaUrls: p.media_urls ?? [],
          mediaType: p.media_type ?? 'none',
          likeCount: p.like_count ?? 0,
          commentCount: p.comment_count ?? 0,
          createdAt: p.created_at,
        }));
        setAllPostsState(dbPosts);
        setLikedPosts((likesRes.data ?? []).map((l: any) => l.post_id));
        console.log('[POSTS] Loaded', dbPosts.length, 'posts');
      } catch (e) {
        console.log('[POSTS] Load error:', e);
      }
    };
    load();
  }, [user]);

  const allPosts = useMemo((): FeedPost[] => {
    return allPostsState
      .filter((p) => !blockedUsers.includes(p.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPostsState, blockedUsers]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const liked = likedPosts.includes(postId);
      setLikedPosts((prev) => (liked ? prev.filter((id) => id !== postId) : [...prev, postId]));
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      }
    },
    [userId, likedPosts],
  );

  const isLiked = useCallback((postId: string) => likedPosts.includes(postId), [likedPosts]);

  const createPost = useCallback(
    async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content,
          media_urls: mediaUrl ? [mediaUrl] : [],
          media_type: mediaUrl ? (mediaType ?? 'image') : 'none',
        })
        .select('*')
        .single();
      if (error || !data) {
        console.log('[POSTS] Create post error:', error?.message);
        return null;
      }
      const post: FeedPost = {
        id: data.id,
        userId: 'me',
        content: data.content,
        mediaUrls: data.media_urls ?? [],
        mediaType: data.media_type ?? 'none',
        likeCount: 0,
        commentCount: 0,
        createdAt: data.created_at,
      };
      setAllPostsState((prev) => [post, ...prev]);
      return post;
    },
    [userId],
  );

  const addComment = useCallback(
    async (postId: string, content: string) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: userId, content })
        .select('id, created_at')
        .single();
      if (error || !data) {
        console.log('[POSTS] Add comment error:', error?.message);
        return null;
      }
      const comment: PostComment = {
        id: data.id,
        postId,
        userId: 'me',
        content,
        createdAt: data.created_at,
      };
      setCommentsCache((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), comment],
      }));
      return comment;
    },
    [userId],
  );

  const getComments = useCallback(
    (postId: string): PostComment[] => {
      return (commentsCache[postId] ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    },
    [commentsCache],
  );

  const loadCommentsForPost = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const { data } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (data) {
        setCommentsCache((prev) => ({
          ...prev,
          [postId]: data.map((c: any) => ({
            id: c.id,
            postId: c.post_id,
            userId: c.user_id === userId ? 'me' : c.user_id,
            content: c.content,
            createdAt: c.created_at,
          })),
        }));
      }
    },
    [userId],
  );

  const getPostsForUser = useCallback(
    (uid: string): FeedPost[] => {
      if (uid === 'me') return allPosts.filter((p) => p.userId === 'me');
      return allPosts.filter((p) => p.userId === uid);
    },
    [allPosts],
  );

  const loadMorePosts = useCallback(async () => {
    if (!userId) return;
    const currentCount = allPostsState.length;
    console.log('[POSTS] Loading more posts, offset:', currentCount);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(currentCount, currentCount + 49);
    if (data && data.length > 0) {
      const newPosts = data.map((p: any) => ({
        id: p.id,
        userId: p.user_id === userId ? 'me' : p.user_id,
        content: p.content ?? '',
        mediaUrls: p.media_urls ?? [],
        mediaType: p.media_type ?? 'none',
        likeCount: p.like_count ?? 0,
        commentCount: p.comment_count ?? 0,
        createdAt: p.created_at,
      }));
      setAllPostsState((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = newPosts.filter((p: FeedPost) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
      console.log('[POSTS] Loaded', newPosts.length, 'more posts');
    }
  }, [userId, allPostsState.length]);

  return {
    allPosts,
    allPostsState,
    createPost,
    toggleLike,
    isLiked,
    getComments,
    addComment,
    loadCommentsForPost,
    getPostsForUser,
    loadMorePosts,
  };
});
