import { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { Reel, ReelComment, ReactionType, ReelMediaType } from '@/constants/types';

export const [ReelsProvider, useReels] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [savedReels, setSavedReels] = useState<string[]>([]);
  const [reelCommentsCache, setReelCommentsCache] = useState<Record<string, ReelComment[]>>({});
  const [likedReelComments, setLikedReelComments] = useState<string[]>([]);
  const [reelReactions, setReelReactions] = useState<Record<string, ReactionType>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        console.log('[REELS] Loading reel data for user:', userId);
        const [savedRes, likedRcRes, reelsRes] = await Promise.all([
          supabase.from('reel_bookmarks').select('reel_id').eq('user_id', userId),
          supabase.from('reel_comment_likes').select('reel_comment_id').eq('user_id', userId),
          supabase.from('reels').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        ]);
        if (cancelled) return;
        setSavedReels((savedRes.data ?? []).map((r: any) => r.reel_id));
        setLikedReelComments((likedRcRes.data ?? []).map((l: any) => l.reel_comment_id));
        const loadedReels: Reel[] = (reelsRes.data ?? []).map((r: any) => ({
          id: r.id,
          userId: r.user_id === userId ? 'me' : r.user_id,
          mediaType: r.media_type ?? 'video',
          caption: r.caption ?? '',
          videoUrl: r.video_url ?? '',
          thumbnailUrl: r.thumbnail_url ?? '',
          imageUrl: r.image_url ?? undefined,
          reactionCounts: r.reaction_counts ?? { respekt: 0, anerkennung: 0, zuspruch: 0, verbundenheit: 0 },
          totalReactions: r.total_reactions ?? 0,
          commentCount: r.comment_count ?? 0,
          shareCount: r.share_count ?? 0,
          bookmarkCount: r.bookmark_count ?? 0,
          createdAt: r.created_at,
          location: r.location ?? undefined,
          tags: r.tags ?? undefined,
          duration: r.duration ?? undefined,
          isUserUpload: true,
          aspectRatio: r.aspect_ratio ?? undefined,
          taggedUsers: r.tagged_users ?? undefined,
          isArchived: r.is_archived ?? false,
        }));
        setUserReels(loadedReels);
        console.log('[REELS] Loaded', loadedReels.length, 'reels, bookmarks:', (savedRes.data ?? []).length);
      } catch (e) {
        console.log('[REELS] Load error:', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user, userId]);

  const toggleSaveReel = useCallback(
    async (reelId: string) => {
      if (!userId) return;
      const saved = savedReels.includes(reelId);
      setSavedReels((prev) => (saved ? prev.filter((id) => id !== reelId) : [...prev, reelId]));
      if (saved) {
        await supabase.from('reel_bookmarks').delete().eq('reel_id', reelId).eq('user_id', userId);
      } else {
        await supabase.from('reel_bookmarks').insert({ reel_id: reelId, user_id: userId });
      }
    },
    [userId, savedReels],
  );

  const isReelSaved = useCallback((reelId: string) => savedReels.includes(reelId), [savedReels]);

  const addReelComment = useCallback(
    async (reelId: string, content: string) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('reel_comments')
        .insert({ reel_id: reelId, user_id: userId, content })
        .select('id, created_at')
        .single();
      if (error || !data) {
        console.log('[REELS] Add reel comment error:', error?.message);
        return null;
      }
      const comment: ReelComment = {
        id: data.id,
        reelId,
        userId: 'me',
        content,
        createdAt: data.created_at,
        likeCount: 0,
      };
      setReelCommentsCache((prev) => ({
        ...prev,
        [reelId]: [...(prev[reelId] ?? []), comment],
      }));
      return comment;
    },
    [userId],
  );

  const toggleReelCommentLike = useCallback(
    async (commentId: string) => {
      if (!userId) return;
      const liked = likedReelComments.includes(commentId);
      setLikedReelComments((prev) => (liked ? prev.filter((id) => id !== commentId) : [...prev, commentId]));
      if (liked) {
        await supabase.from('reel_comment_likes').delete().eq('reel_comment_id', commentId).eq('user_id', userId);
      } else {
        await supabase.from('reel_comment_likes').insert({ reel_comment_id: commentId, user_id: userId });
      }
    },
    [userId, likedReelComments],
  );

  const isReelCommentLiked = useCallback(
    (commentId: string) => likedReelComments.includes(commentId),
    [likedReelComments],
  );

  const getReelComments = useCallback(
    (reelId: string): ReelComment[] => {
      return (reelCommentsCache[reelId] ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    },
    [reelCommentsCache],
  );

  const loadReelComments = useCallback(
    async (reelId: string) => {
      const { data } = await supabase
        .from('reel_comments')
        .select('*')
        .eq('reel_id', reelId)
        .order('created_at', { ascending: true });
      if (data) {
        setReelCommentsCache((prev) => ({
          ...prev,
          [reelId]: data.map((c: any) => ({
            id: c.id,
            reelId: c.reel_id,
            userId: c.user_id === userId ? 'me' : c.user_id,
            content: c.content,
            createdAt: c.created_at,
            likeCount: c.like_count ?? 0,
          })),
        }));
      }
    },
    [userId],
  );

  const addReelReaction = useCallback(
    (reelId: string, reaction: ReactionType) => {
      setReelReactions((prev) => {
        const existing = prev[reelId];
        if (existing === reaction) {
          const next = { ...prev };
          delete next[reelId];
          return next;
        }
        return { ...prev, [reelId]: reaction };
      });
      console.log('[REELS] Reel reaction set:', reelId, reaction);
    },
    [],
  );

  const getReelReaction = useCallback(
    (reelId: string): ReactionType | null => reelReactions[reelId] ?? null,
    [reelReactions],
  );

  const hasReelReaction = useCallback(
    (reelId: string): boolean => reelId in reelReactions,
    [reelReactions],
  );

  const archiveReel = useCallback(async (reelId: string) => {
    setUserReels((prev) => prev.map((r) => (r.id === reelId ? { ...r, isArchived: true } : r)));
    try {
      await supabase.from('reels').update({ is_archived: true }).eq('id', reelId);
      console.log('[REELS] Reel archived:', reelId);
    } catch (e) {
      console.log('[REELS] Archive reel DB error:', e);
    }
  }, []);

  const unarchiveReel = useCallback(async (reelId: string) => {
    setUserReels((prev) => prev.map((r) => (r.id === reelId ? { ...r, isArchived: false } : r)));
    try {
      await supabase.from('reels').update({ is_archived: false }).eq('id', reelId);
      console.log('[REELS] Reel unarchived:', reelId);
    } catch (e) {
      console.log('[REELS] Unarchive reel DB error:', e);
    }
  }, []);

  const deleteReel = useCallback(async (reelId: string) => {
    setUserReels((prev) => prev.filter((r) => r.id !== reelId));
    try {
      await supabase.from('reels').delete().eq('id', reelId).eq('user_id', userId);
      console.log('[REELS] Reel deleted:', reelId);
    } catch (e) {
      console.log('[REELS] Delete reel DB error:', e);
    }
  }, [userId]);

  const getOwnReels = useCallback(
    (): Reel[] => userReels.filter((r) => r.userId === 'me' && !r.isArchived),
    [userReels],
  );

  const getArchivedReels = useCallback(
    (): Reel[] => userReels.filter((r) => r.userId === 'me' && r.isArchived),
    [userReels],
  );

  const getTaggedReels = useCallback(
    (): Reel[] => userReels.filter((r) => r.taggedUsers?.includes('me') && !r.isArchived),
    [userReels],
  );

  const createReel = useCallback(
    async (params: {
      mediaUri: string;
      mediaType: ReelMediaType;
      thumbnailUri?: string;
      caption: string;
      location?: string;
      tags?: string[];
      duration?: number;
      aspectRatio?: number;
      taggedUsers?: string[];
    }): Promise<Reel | null> => {
      if (!userId) return null;
      try {
        console.log('[REELS] Creating reel:', params.mediaType);
        const caption = params.caption + (params.tags?.length ? `\n\n${params.tags.map(t => `#${t.trim()}`).join(' ')}` : '');
        const insertData: Record<string, unknown> = {
          user_id: userId,
          media_type: params.mediaType,
          caption,
          video_url: params.mediaType === 'video' ? params.mediaUri : '',
          thumbnail_url: params.thumbnailUri || params.mediaUri,
          image_url: params.mediaType === 'photo' ? params.mediaUri : null,
          location: params.location ?? null,
          tags: params.tags ?? null,
          duration: params.duration ?? null,
          aspect_ratio: params.aspectRatio ?? null,
          tagged_users: params.taggedUsers ?? null,
          is_archived: false,
        };
        const { data: dbData, error: dbError } = await supabase
          .from('reels')
          .insert(insertData)
          .select('id, created_at')
          .single();

        const reelId = dbData?.id ?? `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const createdAt = dbData?.created_at ?? new Date().toISOString();
        if (dbError) {
          console.log('[REELS] DB insert error (continuing locally):', dbError.message);
        }

        const newReel: Reel = {
          id: reelId,
          userId: 'me',
          mediaType: params.mediaType,
          caption,
          videoUrl: params.mediaType === 'video' ? params.mediaUri : '',
          thumbnailUrl: params.thumbnailUri || params.mediaUri,
          imageUrl: params.mediaType === 'photo' ? params.mediaUri : undefined,
          reactionCounts: { respekt: 0, anerkennung: 0, zuspruch: 0, verbundenheit: 0 },
          totalReactions: 0,
          commentCount: 0,
          shareCount: 0,
          bookmarkCount: 0,
          createdAt,
          location: params.location,
          tags: params.tags,
          duration: params.duration,
          isUserUpload: true,
          aspectRatio: params.aspectRatio,
          taggedUsers: params.taggedUsers,
          isArchived: false,
        };
        setUserReels((prev) => [newReel, ...prev]);
        console.log('[REELS] Reel created:', newReel.id);
        return newReel;
      } catch (e) {
        console.log('[REELS] Create reel error:', e);
        return null;
      }
    },
    [userId],
  );

  return {
    userReels,
    savedReels,
    toggleSaveReel,
    isReelSaved,
    addReelComment,
    getReelComments,
    toggleReelCommentLike,
    isReelCommentLiked,
    loadReelComments,
    addReelReaction,
    getReelReaction,
    hasReelReaction,
    archiveReel,
    unarchiveReel,
    deleteReel,
    getOwnReels,
    getArchivedReels,
    getTaggedReels,
    createReel,
  };
});
