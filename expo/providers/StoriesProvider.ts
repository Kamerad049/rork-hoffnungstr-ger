import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { StoryItem, StoryGroup, SocialUser, StoryMetadata } from '@/constants/types';

export const STORY_DURATION_SECONDS = 5;
const STORY_EXPIRY_HOURS = 24;

export const [StoriesProvider, useStories] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { blockedUsers, allUsersState } = useFriends();

  const [ownStories, setOwnStories] = useState<StoryItem[]>([]);
  const [externalStoryGroups, setExternalStoryGroups] = useState<StoryGroup[]>([]);
  const [viewedStories, setViewedStories] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        console.log('[STORIES] Loading stories for user:', userId);
        const [storiesRes, viewedRes] = await Promise.all([
          supabase.from('stories').select('*').gt('expires_at', new Date().toISOString()),
          supabase.from('story_viewers').select('story_id').eq('viewer_id', userId),
        ]);

        const storyData = storiesRes.data ?? [];
        const ownS: StoryItem[] = [];
        const extGroups: Record<string, StoryItem[]> = {};
        for (const s of storyData) {
          let parsedMeta: StoryMetadata | undefined;
          try {
            if (s.metadata) parsedMeta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
          } catch { parsedMeta = undefined; }
          const item: StoryItem = {
            id: s.id,
            mediaUrl: s.media_url ?? '',
            caption: s.caption ?? '',
            createdAt: s.created_at,
            bgColor: s.bg_color ?? undefined,
            fontFamily: s.font_family ?? undefined,
            imageScale: s.image_scale ?? undefined,
            imageOffsetX: s.image_offset_x ?? undefined,
            imageOffsetY: s.image_offset_y ?? undefined,
            textX: s.text_x ?? undefined,
            textY: s.text_y ?? undefined,
            textScale: s.text_scale ?? undefined,
            metadata: parsedMeta,
          };
          if (s.user_id === userId) {
            ownS.push(item);
          } else {
            if (!extGroups[s.user_id]) extGroups[s.user_id] = [];
            extGroups[s.user_id].push(item);
          }
        }
        setOwnStories(ownS);
        setExternalStoryGroups(Object.entries(extGroups).map(([uid, stories]) => ({ userId: uid, stories })));
        setViewedStories((viewedRes.data ?? []).map((v: any) => v.story_id));
        console.log('[STORIES] Loaded own:', ownS.length, 'external groups:', Object.keys(extGroups).length);
      } catch (e) {
        console.log('[STORIES] Load error:', e);
      }
    };
    load();
  }, [user]);

  const activeOwnStories = useMemo((): StoryItem[] => {
    const cutoff = Date.now() - STORY_EXPIRY_HOURS * 3600000;
    return ownStories.filter((s) => new Date(s.createdAt).getTime() > cutoff);
  }, [ownStories]);

  const stories = useMemo((): StoryGroup[] => {
    const groups: StoryGroup[] = [];
    if (activeOwnStories.length > 0) {
      groups.push({ userId: 'me', stories: activeOwnStories });
    }
    for (const group of externalStoryGroups) {
      if (!blockedUsers.includes(group.userId)) {
        groups.push(group);
      }
    }
    return groups;
  }, [activeOwnStories, externalStoryGroups, blockedUsers]);

  const markStoryViewed = useCallback(
    async (storyId: string) => {
      if (!userId || viewedStories.includes(storyId)) return;
      setViewedStories((prev) => [...prev, storyId]);
      await supabase.from('story_viewers').insert({ story_id: storyId, viewer_id: userId }).single();
    },
    [userId, viewedStories],
  );

  const isStoryViewed = useCallback((storyId: string) => viewedStories.includes(storyId), [viewedStories]);

  const createStory = useCallback(
    async (caption: string, bgColor: string, mediaUrl?: string, fontFamily?: string, textPos?: { x: number; y: number; scale: number }, metadata?: StoryMetadata) => {
      if (!userId) return null;
      const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 3600000).toISOString();
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        media_url: mediaUrl ?? '',
        caption,
        bg_color: bgColor,
        font_family: fontFamily,
        text_x: textPos?.x,
        text_y: textPos?.y,
        text_scale: textPos?.scale,
        expires_at: expiresAt,
      };
      if (metadata) {
        insertPayload.metadata = JSON.stringify(metadata);
      }
      const { data, error } = await supabase
        .from('stories')
        .insert(insertPayload)
        .select('id, created_at')
        .single();
      if (error || !data) {
        console.log('[STORIES] Create story error:', error?.message);
        return null;
      }
      const story: StoryItem = {
        id: data.id,
        mediaUrl: mediaUrl ?? '',
        caption,
        createdAt: data.created_at,
        bgColor,
        fontFamily,
        textX: textPos?.x,
        textY: textPos?.y,
        textScale: textPos?.scale,
        metadata,
      };
      setOwnStories((prev) => [...prev, story]);
      return story;
    },
    [userId],
  );

  const deleteStory = useCallback(
    async (storyId: string) => {
      setOwnStories((prev) => prev.filter((s) => s.id !== storyId));
      await supabase.from('stories').delete().eq('id', storyId);
    },
    [],
  );

  const getStoryViewers = useCallback(
    async (storyId: string): Promise<SocialUser[]> => {
      const { data } = await supabase
        .from('story_viewers')
        .select('viewer_id')
        .eq('story_id', storyId);
      if (!data) return [];
      const viewerIds = data.map((v: any) => v.viewer_id);
      return allUsersState.filter((u) => viewerIds.includes(u.id) && !blockedUsers.includes(u.id));
    },
    [allUsersState, blockedUsers],
  );

  return {
    stories,
    activeOwnStories,
    markStoryViewed,
    isStoryViewed,
    createStory,
    deleteStory,
    getStoryViewers,
  };
});
