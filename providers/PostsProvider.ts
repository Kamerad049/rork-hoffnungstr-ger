import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { queryKeys } from '@/constants/queryKeys';
import type { FeedPost, PostComment } from '@/constants/types';

const STORAGE_KEY_SAVED = 'posts_saved_ids';
const STORAGE_KEY_ARCHIVED = 'posts_archived_ids';
const STORAGE_KEY_DISABLED_COMMENTS = 'posts_disabled_comments_ids';

function mapDbPost(p: any, userId: string): FeedPost {
  const location = p.location ?? undefined;
  const taggedUserIds = p.tagged_user_ids ?? undefined;
  const tags = p.tags ?? undefined;
  if (location || taggedUserIds) {
    console.log('[POSTS] mapDbPost id:', p.id, 'location:', location, 'taggedUserIds:', taggedUserIds, 'tags:', tags);
  }
  return {
    id: p.id,
    userId: p.user_id === userId ? 'me' : p.user_id,
    content: p.content ?? '',
    mediaUrls: p.media_urls ?? [],
    mediaType: p.media_type ?? 'none',
    likeCount: p.like_count ?? 0,
    commentCount: p.comment_count ?? 0,
    createdAt: p.created_at,
    location,
    taggedUserIds,
    tags,
    isArchived: p.is_archived ?? false,
    commentsDisabled: p.comments_disabled ?? false,
  };
}

export const [PostsProvider, usePosts] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { blockedUsers } = useFriends();
  const queryClient = useQueryClient();

  const [commentsCache, setCommentsCache] = useState<Record<string, PostComment[]>>({});
  const [archivedPostIds, setArchivedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const loadPersisted = async () => {
      try {
        const [savedRaw, archivedRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SAVED),
          AsyncStorage.getItem(STORAGE_KEY_ARCHIVED),
        ]);
        if (savedRaw) {
          const parsed: string[] = JSON.parse(savedRaw);
          setSavedPostIds(new Set(parsed));
          console.log('[POSTS] Loaded', parsed.length, 'saved post IDs from storage');
        }
        if (archivedRaw) {
          const parsed: string[] = JSON.parse(archivedRaw);
          setArchivedPostIds(new Set(parsed));
          console.log('[POSTS] Loaded', parsed.length, 'archived post IDs from storage');
        }
      } catch (e) {
        console.log('[POSTS] Error loading persisted IDs:', e);
      }
    };
    loadPersisted();
  }, []);

  const persistSaved = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify([...ids])).catch((e) =>
      console.log('[POSTS] Error persisting saved IDs:', e),
    );
  }, []);

  const persistArchived = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY_ARCHIVED, JSON.stringify([...ids])).catch((e) =>
      console.log('[POSTS] Error persisting archived IDs:', e),
    );
  }, []);
  const [savedVisibility, setSavedVisibility] = useState<'public' | 'friends' | 'private'>('private');
  const [disabledCommentsIds, setDisabledCommentsIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_DISABLED_COMMENTS).then((raw) => {
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setDisabledCommentsIds(new Set(parsed));
        console.log('[POSTS] Loaded', parsed.length, 'disabled comment IDs from storage');
      }
    }).catch((e) => console.log('[POSTS] Error loading disabled comments:', e));
  }, []);

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
      const withLoc = posts.filter((p: FeedPost) => !!p.location).length;
      const withTags = posts.filter((p: FeedPost) => p.taggedUserIds && p.taggedUserIds.length > 0).length;
      console.log('[POSTS] Loaded', posts.length, 'posts,', withLoc, 'with location,', withTags, 'with tagged users');
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
      .filter((p) => !blockedUsers.includes(p.userId) && !archivedPostIds.has(p.id))
      .map((p) => ({
        ...p,
        isArchived: archivedPostIds.has(p.id),
        commentsDisabled: disabledCommentsIds.has(p.id),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPostsState, blockedUsers, archivedPostIds, disabledCommentsIds]);

  const archivedPosts = useMemo((): FeedPost[] => {
    return allPostsState
      .filter((p) => p.userId === 'me' && archivedPostIds.has(p.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPostsState, archivedPostIds]);

  const savedPosts = useMemo((): FeedPost[] => {
    return allPostsState
      .filter((p) => savedPostIds.has(p.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPostsState, savedPostIds]);

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
        console.log('[POSTS] Create post error:', error?.message, 'code:', error?.code, 'details:', error?.details);
        return null;
      }
      console.log('[POSTS] Created post raw data:', JSON.stringify({ id: data.id, location: data.location, tagged_user_ids: data.tagged_user_ids }));
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

  const archivePost = useCallback((postId: string) => {
    console.log('[POSTS] Archiving post:', postId);
    setArchivedPostIds((prev) => {
      const next = new Set([...prev, postId]);
      persistArchived(next);
      return next;
    });
  }, [persistArchived]);

  const unarchivePost = useCallback((postId: string) => {
    console.log('[POSTS] Unarchiving post:', postId);
    setArchivedPostIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      persistArchived(next);
      return next;
    });
  }, [persistArchived]);

  const deletePost = useCallback(async (postId: string) => {
    console.log('[POSTS] Deleting post:', postId);
    if (userId) {
      await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId);
    }
    queryClient.setQueryData<{ posts: FeedPost[]; likedPosts: string[] }>(
      queryKeys.posts(userId),
      (old) => ({
        posts: (old?.posts ?? []).filter((p) => p.id !== postId),
        likedPosts: old?.likedPosts ?? [],
      }),
    );
    setArchivedPostIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      persistArchived(next);
      return next;
    });
  }, [userId, queryClient, persistArchived]);

  const editPost = useCallback(async (
    postId: string,
    newContent: string,
    newLocation?: string,
    newTaggedUserIds?: string[],
    newTags?: string[],
  ) => {
    console.log('[POSTS] Editing post:', postId, 'location:', newLocation, 'taggedUserIds:', newTaggedUserIds, 'tags:', newTags);
    if (userId) {
      const updateData: Record<string, unknown> = { content: newContent };
      if (newLocation !== undefined) updateData.location = newLocation || null;
      if (newTaggedUserIds !== undefined) updateData.tagged_user_ids = newTaggedUserIds.length > 0 ? newTaggedUserIds : null;
      if (newTags !== undefined) updateData.tags = newTags.length > 0 ? newTags : null;
      const { error } = await supabase.from('posts').update(updateData).eq('id', postId).eq('user_id', userId);
      if (error) {
        console.log('[POSTS] Edit post error:', error.message, 'code:', error.code);
        throw new Error(error.message);
      }
      console.log('[POSTS] Post updated in DB successfully:', postId);
    }
    queryClient.setQueryData<{ posts: FeedPost[]; likedPosts: string[] }>(
      queryKeys.posts(userId),
      (old) => ({
        posts: (old?.posts ?? []).map((p) =>
          p.id === postId ? {
            ...p,
            content: newContent,
            location: newLocation !== undefined ? (newLocation || undefined) : p.location,
            taggedUserIds: newTaggedUserIds !== undefined ? (newTaggedUserIds.length > 0 ? newTaggedUserIds : undefined) : p.taggedUserIds,
            tags: newTags !== undefined ? (newTags.length > 0 ? newTags : undefined) : p.tags,
          } : p
        ),
        likedPosts: old?.likedPosts ?? [],
      }),
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.posts(userId) });
  }, [userId, queryClient]);

  const persistDisabledComments = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY_DISABLED_COMMENTS, JSON.stringify([...ids])).catch((e) =>
      console.log('[POSTS] Error persisting disabled comments:', e),
    );
  }, []);

  const toggleCommentsDisabled = useCallback((postId: string) => {
    console.log('[POSTS] Toggling comments for post:', postId);
    setDisabledCommentsIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      persistDisabledComments(next);
      return next;
    });
  }, [persistDisabledComments]);

  const savePost = useCallback((postId: string) => {
    console.log('[POSTS] Saving post:', postId);
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      persistSaved(next);
      return next;
    });
  }, [persistSaved]);

  const isPostSaved = useCallback((postId: string) => savedPostIds.has(postId), [savedPostIds]);

  const isCommentsDisabled = useCallback((postId: string) => disabledCommentsIds.has(postId), [disabledCommentsIds]);

  const getPostsByLocation = useCallback((location: string): FeedPost[] => {
    return allPostsState
      .filter((p) => p.location === location && !archivedPostIds.has(p.id) && !blockedUsers.includes(p.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPostsState, archivedPostIds, blockedUsers]);

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
    archivedPosts,
    savedPosts,
    savedVisibility,
    setSavedVisibility,
    createPost,
    toggleLike,
    isLiked,
    getComments,
    addComment,
    loadCommentsForPost,
    getPostsForUser,
    getPostsByLocation,
    loadMorePosts,
    archivePost,
    unarchivePost,
    deletePost,
    editPost,
    toggleCommentsDisabled,
    isCommentsDisabled,
    savePost,
    isPostSaved,
  };
});
