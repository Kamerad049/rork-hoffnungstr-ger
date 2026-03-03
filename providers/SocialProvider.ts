import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { addToUserCache } from '@/lib/userCache';
import { useFriends } from '@/providers/FriendsProvider';
import { queryKeys } from '@/constants/queryKeys';
import type { Gender, Religion, CrossStyle } from '@/constants/types';


const FLAG_EXPIRY_HOURS = 24;

export type PrivacyLevel = 'everyone' | 'friends' | 'private';

export interface PrivacySettings {
  showPosts: PrivacyLevel;
  showFriends: PrivacyLevel;
  showStamps: PrivacyLevel;
  feedPostVisibility: PrivacyLevel;
  storyVisibility: PrivacyLevel;
  showBirthplace: PrivacyLevel;
  showResidence: PrivacyLevel;
  showBundesland: PrivacyLevel;
  showValues: PrivacyLevel;
  allowTagging: PrivacyLevel;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  showPosts: 'everyone',
  showFriends: 'everyone',
  showStamps: 'everyone',
  feedPostVisibility: 'everyone',
  storyVisibility: 'everyone',
  showBirthplace: 'friends',
  showResidence: 'friends',
  showBundesland: 'everyone',
  showValues: 'everyone',
  allowTagging: 'friends',
};

interface SocialProfile {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  values: string[];
  birthplace: string;
  birthplacePlz: string;
  residence: string;
  residencePlz: string;
  bundesland: string;
  gender: Gender;
  religion: Religion;
  crossStyle: CrossStyle;
  showGender: boolean;
  showReligion: boolean;
  showSunDial: boolean;
}

interface ProfileQueryData {
  profile: SocialProfile;
  privacy: PrivacySettings;
  flagHoistedAt: string | null;
}

export const [SocialProvider, useSocial] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { friends, allUsersState } = useFriends();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<SocialProfile>({
    displayName: user?.name ?? '',
    bio: '',
    avatarUrl: null,
    values: [],
    birthplace: '',
    birthplacePlz: '',
    residence: '',
    residencePlz: '',
    bundesland: '',
    gender: '',
    religion: '',
    crossStyle: 'none',
    showGender: false,
    showReligion: false,
    showSunDial: false,
  });
  const [privacy, setPrivacy] = useState<PrivacySettings>({ ...DEFAULT_PRIVACY });
  const [flagHoistedAtState, setFlagHoistedAt] = useState<string | null>(null);

  const profileQuery = useQuery<ProfileQueryData | null>({
    queryKey: [...queryKeys.socialProfile(userId), user?.name],
    queryFn: async () => {
      if (!userId) return null;
      console.log('[SOCIAL] Loading profile for user:', userId);
      const [profileRes, valuesRes, privacyRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('user_values').select('value').eq('user_id', userId),
        supabase.from('privacy_settings').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      let loadedProfile: SocialProfile = {
        displayName: user?.name ?? '',
        bio: '',
        avatarUrl: null,
        values: [],
        birthplace: '',
        birthplacePlz: '',
        residence: '',
        residencePlz: '',
        bundesland: '',
        gender: '',
        religion: '',
        crossStyle: 'none',
        showGender: false,
        showReligion: false,
        showSunDial: false,
      };
      let loadedPrivacy: PrivacySettings = { ...DEFAULT_PRIVACY };
      let loadedFlag: string | null = null;

      if (profileRes.data) {
        const p = profileRes.data;
        const vals = (valuesRes.data ?? []).map((v: any) => v.value);
        loadedProfile = {
          displayName: p.display_name ?? '',
          bio: p.bio ?? '',
          avatarUrl: p.avatar_url ?? null,
          values: vals,
          birthplace: p.birthplace ?? '',
          birthplacePlz: p.birthplace_plz ?? '',
          residence: p.residence ?? '',
          residencePlz: p.residence_plz ?? '',
          bundesland: p.bundesland ?? '',
          gender: (p.gender as Gender) ?? '',
          religion: (p.religion as Religion) ?? '',
          crossStyle: (p.cross_style as CrossStyle) ?? 'none',
          showGender: p.show_gender ?? false,
          showReligion: p.show_religion ?? false,
          showSunDial: p.show_sundial ?? false,
        };
        loadedFlag = p.flag_hoisted_at ?? null;
        addToUserCache({
          id: 'me',
          username: p.username ?? '',
          displayName: p.display_name ?? '',
          bio: p.bio ?? '',
          avatarUrl: p.avatar_url ?? null,
          rank: p.rank ?? 'Neuling',
          rankIcon: p.rank_icon ?? 'Eye',
          ep: p.xp ?? 0,
          stampCount: p.stamp_count ?? 0,
          postCount: p.post_count ?? 0,
          friendCount: p.friend_count ?? 0,
          flagHoistedAt: p.flag_hoisted_at ?? null,
          values: vals,
          birthplace: p.birthplace ?? '',
          birthplacePlz: p.birthplace_plz ?? '',
          residence: p.residence ?? '',
          residencePlz: p.residence_plz ?? '',
          bundesland: p.bundesland ?? '',
        });
      }

      if (privacyRes.data) {
        const ps = privacyRes.data;
        loadedPrivacy = {
          showPosts: ps.show_posts ?? 'everyone',
          showFriends: ps.show_friends ?? 'everyone',
          showStamps: ps.show_stamps ?? 'everyone',
          feedPostVisibility: ps.feed_post_visibility ?? 'everyone',
          storyVisibility: ps.story_visibility ?? 'everyone',
          showBirthplace: ps.show_birthplace ?? 'friends',
          showResidence: ps.show_residence ?? 'friends',
          showBundesland: ps.show_bundesland ?? 'everyone',
          showValues: ps.show_values ?? 'everyone',
          allowTagging: ps.allow_tagging ?? 'friends',
        };
      }

      console.log('[SOCIAL] Profile loaded');
      return { profile: loadedProfile, privacy: loadedPrivacy, flagHoistedAt: loadedFlag };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data.profile);
      setPrivacy(profileQuery.data.privacy);
      setFlagHoistedAt(profileQuery.data.flagHoistedAt);
    }
  }, [profileQuery.data]);

  const isLoading = profileQuery.isLoading;

  const updateProfile = useCallback(
    async (updates: Partial<SocialProfile>) => {
      setProfile((prev) => ({ ...prev, ...updates }));
      if (!userId) return;
      const dbUpdates: any = {};
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.birthplace !== undefined) dbUpdates.birthplace = updates.birthplace;
      if (updates.birthplacePlz !== undefined) dbUpdates.birthplace_plz = updates.birthplacePlz;
      if (updates.residence !== undefined) dbUpdates.residence = updates.residence;
      if (updates.residencePlz !== undefined) dbUpdates.residence_plz = updates.residencePlz;
      if (updates.bundesland !== undefined) dbUpdates.bundesland = updates.bundesland;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.religion !== undefined) dbUpdates.religion = updates.religion;
      if (updates.crossStyle !== undefined) dbUpdates.cross_style = updates.crossStyle;
      if (updates.showGender !== undefined) dbUpdates.show_gender = updates.showGender;
      if (updates.showReligion !== undefined) dbUpdates.show_religion = updates.showReligion;
      if (updates.showSunDial !== undefined) dbUpdates.show_sundial = updates.showSunDial;
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('users').update(dbUpdates).eq('id', userId);
      }
      if (updates.values !== undefined) {
        await supabase.from('user_values').delete().eq('user_id', userId);
        if (updates.values.length > 0) {
          await supabase.from('user_values').insert(
            updates.values.map((v) => ({ user_id: userId, value: v })),
          );
        }
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.socialProfile(userId) });
    },
    [userId, queryClient],
  );

  const updatePrivacy = useCallback(
    async (updates: Partial<PrivacySettings>) => {
      setPrivacy((prev) => ({ ...prev, ...updates }));
      if (!userId) return;
      const dbUpdates: any = {};
      if (updates.showPosts !== undefined) dbUpdates.show_posts = updates.showPosts;
      if (updates.showFriends !== undefined) dbUpdates.show_friends = updates.showFriends;
      if (updates.showStamps !== undefined) dbUpdates.show_stamps = updates.showStamps;
      if (updates.feedPostVisibility !== undefined) dbUpdates.feed_post_visibility = updates.feedPostVisibility;
      if (updates.storyVisibility !== undefined) dbUpdates.story_visibility = updates.storyVisibility;
      if (updates.showBirthplace !== undefined) dbUpdates.show_birthplace = updates.showBirthplace;
      if (updates.showResidence !== undefined) dbUpdates.show_residence = updates.showResidence;
      if (updates.showBundesland !== undefined) dbUpdates.show_bundesland = updates.showBundesland;
      if (updates.showValues !== undefined) dbUpdates.show_values = updates.showValues;
      if (updates.allowTagging !== undefined) dbUpdates.allow_tagging = updates.allowTagging;
      await supabase.from('privacy_settings').update(dbUpdates).eq('user_id', userId);
      queryClient.invalidateQueries({ queryKey: queryKeys.socialProfile(userId) });
    },
    [userId, queryClient],
  );

  const hoistFlag = useCallback(async () => {
    const now = new Date().toISOString();
    setFlagHoistedAt(now);
    if (!userId) return;
    await supabase.from('users').update({ flag_hoisted_at: now }).eq('id', userId);
  }, [userId]);

  const isFlagActive = useMemo((): boolean => {
    if (!flagHoistedAtState) return false;
    return Date.now() - new Date(flagHoistedAtState).getTime() < FLAG_EXPIRY_HOURS * 3600000;
  }, [flagHoistedAtState]);

  const isUserFlagActive = useCallback(
    (uid: string): boolean => {
      const u = allUsersState.find((x) => x.id === uid);
      if (!u?.flagHoistedAt) return false;
      return Date.now() - new Date(u.flagHoistedAt).getTime() < FLAG_EXPIRY_HOURS * 3600000;
    },
    [allUsersState],
  );

  const flagCountQuery = useQuery({
    queryKey: ['active-flag-count'],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - FLAG_EXPIRY_HOURS * 3600000).toISOString();
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gt('flag_hoisted_at', cutoff);
      return count ?? 0;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const flagCount = useMemo((): number => {
    const dbCount = flagCountQuery.data ?? 0;
    return dbCount + (isFlagActive ? 1 : 0);
  }, [isFlagActive, flagCountQuery.data]);

  const canViewContent = useCallback(
    (setting: PrivacyLevel, viewerUserId: string): boolean => {
      if (viewerUserId === 'me') return true;
      if (setting === 'everyone') return true;
      if (setting === 'friends') return friends.includes(viewerUserId);
      return false;
    },
    [friends],
  );

  return {
    profile,
    updateProfile,
    privacy,
    updatePrivacy,
    canViewContent,
    hoistFlag,
    isFlagActive,
    flagHoistedAt: flagHoistedAtState,
    isUserFlagActive,
    flagCount,
    isLoading,
  };
});
