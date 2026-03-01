import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { SocialUser } from '@/constants/types';

function mapDbUser(u: any): SocialUser {
  return {
    id: u.id,
    username: u.username ?? '',
    displayName: u.display_name ?? '',
    bio: u.bio ?? '',
    avatarUrl: u.avatar_url ?? null,
    rank: u.rank ?? 'Neuling',
    rankIcon: u.rank_icon ?? 'Eye',
    xp: u.xp ?? 0,
    stampCount: u.stamp_count ?? 0,
    postCount: u.post_count ?? 0,
    friendCount: u.friend_count ?? 0,
    flagHoistedAt: u.flag_hoisted_at ?? null,
    values: [],
    birthplace: u.birthplace ?? '',
    residence: u.residence ?? '',
    bundesland: u.bundesland ?? '',
  };
}

export { mapDbUser };

export function useUserLookup(userId: string | null) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId || userId === 'me') return null;
      console.log('[USER-LOOKUP] Fetching user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) {
        console.log('[USER-LOOKUP] Not found:', userId, error?.message);
        return null;
      }
      return mapDbUser(data);
    },
    enabled: !!userId && userId !== 'me',
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUsersLookup(userIds: string[]) {
  const stableKey = userIds.length > 0 ? userIds.slice().sort().join(',') : '';
  return useQuery({
    queryKey: ['users-batch', stableKey],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      console.log('[USER-LOOKUP] Batch fetching', userIds.length, 'users');
      const batches: string[][] = [];
      for (let i = 0; i < userIds.length; i += 50) {
        batches.push(userIds.slice(i, i + 50));
      }
      const results = await Promise.all(
        batches.map((batch) =>
          supabase.from('users').select('*').in('id', batch),
        ),
      );
      const users = results.flatMap((r: any) => (r.data ?? []).map(mapDbUser));
      console.log('[USER-LOOKUP] Batch loaded:', users.length);
      return users;
    },
    enabled: userIds.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLeaderboard(limit: number = 100) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      console.log('[USER-LOOKUP] Fetching leaderboard, limit:', limit);
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('xp', { ascending: false })
        .limit(limit);
      return (data ?? []).map(mapDbUser);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePrefetchUsers() {
  const queryClient = useQueryClient();

  return useCallback(
    (users: SocialUser[]) => {
      for (const user of users) {
        queryClient.setQueryData(['user-profile', user.id], user);
      }
      console.log('[USER-LOOKUP] Prefetched', users.length, 'users into cache');
    },
    [queryClient],
  );
}
