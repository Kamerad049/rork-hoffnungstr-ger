import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { queryKeys } from '@/constants/queryKeys';
import type { FeedPost, PostComment } from '@/constants/types';

function mapDbPost(p: any, userId: string): FeedPost {
  return {
    id: p.id,
    userId: p.user_id === userId ? 'me' : p.user_id,
    content: p.content ?? '',
    mediaUrls: p.media_urls ?? [],
    mediaType: p.media_type ?? 'none',
    likeCount: p.like_count ?? 0,
    commentCount: p.comment_count ?? 0,
    createdAt: p.created_at,
    location: p.location ?? undefined,
    taggedUserIds: p.tagged_user_ids ?? undefined,
  };
}

export const [PostsProvider, usePosts] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { blockedUsers } = useFriends();
  const queryClient = useQueryClient();

  const [commentsCache, setCommentsCache] = useState<Record<string, PostComment[]>>({});

  const postsQuery = useQuery({
    queryKey: queryKeys.posts(userId),
    queryFn: async () => {
      console.log('[POSTS] Loading posts for user:', userId);
      const [postsRes, likesRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('post_likes').select('post_id').eq('user_id', userId),
      ]);
      const posts = (postsRes.data ?? []).map((p: any) => mapDbPost(p, userId));
      const liked = (likesRes.data ?? []).map((l: any) => l.post_id as string);
      console.log('[POSTS] Loaded', posts.length, 'posts');
      return { posts, likedPosts: liked };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const allPostsState = useMemo(() => postsQuery.data?.posts ?? [], [postsQuery.data]);
  const likedPosts = useMemo(() => postsQuery.data?.likedPosts ?? [], [postsQuery.data]);

  const allPosts = useMemo((): FeedPost[] => {
    return allPostsState
      .filter((p) => !blockedUsers.includes(p.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPostsState, blockedUsers]);

  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) return;
      const liked = likedPosts.includes(postId);
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      }
      return { postId, wasLiked: liked };
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts(userId) });
      const prev = queryClient.getQueryData<{ posts: FeedPost[]; likedPosts: string[] }>(queryKeys.posts(userId));
      if (prev) {
        const liked = prev.likedPosts.includes(postId);
        queryClient.setQueryData(queryKeys.posts(userId), {
          ...prev,
          likedPosts: liked
            ? prev.likedPosts.filter((id) => id !== postId)
            : [...prev.likedPosts, postId],
        });
      }
      return { prev };
    },
    onError: (_err, _postId, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKeys.posts(userId), context.prev);
      }
    },
  });

  const { mutate: doToggleLike } = toggleLikeMutation;

  const toggleLike = useCallback(
    async (postId: string) => {
      doToggleLike(postId);
    },
    [doToggleLike],
  );

  const isLiked = useCallback((postId: string) => likedPosts.includes(postId), [likedPosts]);

  const createPostMutation = useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType, location, taggedUserIds }: { content: string; mediaUrl?: string; mediaType?: 'image' | 'video'; location?: string; taggedUserIds?: string[] }) => {
      if (!userId) return null;
      const insertData: Record<string, unknown> = {
        user_id: userId,
        content,
        media_urls: mediaUrl ? [mediaUrl] : [],
        media_type: mediaUrl ? (mediaType ?? 'image') : 'none',
      };
      if (location) insertData.location = location;
      if (taggedUserIds && taggedUserIds.length > 0) insertData.tagged_user_ids = taggedUserIds;
      const { data, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select('*')
        .single();
      if (error || !data) {
        console.log('[POSTS] Create post error:', error?.message);
        return null;
      }
      return mapDbPost(data, userId);
    },
    onSuccess: (newPost) => {
      if (!newPost) return;
      queryClient.setQueryData<{ posts: FeedPost[]; likedPosts: string[] }>(
        queryKeys.posts(userId),
        (old) => ({
          posts: [newPost, ...(old?.posts ?? [])],
          likedPosts: old?.likedPosts ?? [],
        }),
      );
    },
  });

  const { mutateAsync: doCreatePost } = createPostMutation;

  const createPost = useCallback(
    async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video', location?: string, taggedUserIds?: string[]) => {
      const result = await doCreatePost({ content, mediaUrl, mediaType, location, taggedUserIds });
      return result;
    },
    [doCreatePost],
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
      const newPosts = data.map((p: any) => mapDbPost(p, userId));
      queryClient.setQueryData<{ posts: FeedPost[]; likedPosts: string[] }>(
        queryKeys.posts(userId),
        (old) => {
          const existingIds = new Set((old?.posts ?? []).map((p) => p.id));
          const unique = newPosts.filter((p) => !existingIds.has(p.id));
          return {
            posts: [...(old?.posts ?? []), ...unique],
            likedPosts: old?.likedPosts ?? [],
          };
        },
      );
      console.log('[POSTS] Loaded', newPosts.length, 'more posts');
    }
  }, [userId, allPostsState.length, queryClient]);

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
