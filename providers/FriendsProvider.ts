import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { setUserCache, addToUserCache } from '@/lib/userCache';
import type { SocialUser } from '@/constants/types';
import { useQuery } from '@tanstack/react-query';

function mapDbUser(u: any): SocialUser {
  return {
    id: u.id,
    username: u.username ?? '',
    displayName: u.display_name ?? '',
    bio: u.bio ?? '',
    avatarUrl: u.avatar_url ?? null,
    rank: u.rank ?? 'Neuling',
    rankIcon: u.rank_icon ?? 'Eye',
    ep: u.xp ?? 0,
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

export const [FriendsProvider, useFriends] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [friends, setFriends] = useState<string[]>([]);
  const [friendRequestsSent, setFriendRequestsSent] = useState<string[]>([]);
  const [friendRequestsReceived, setFriendRequestsReceived] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockedAt, setBlockedAt] = useState<Record<string, string>>({});
  const [allUsersState, setAllUsersState] = useState<SocialUser[]>([]);
  const [acceptedMessageUsers, setAcceptedMessageUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        console.log('[FRIENDS] Loading friends data for:', userId);
        const [friendsRes, sentReqRes, recvReqRes, blockedRes] = await Promise.all([
          supabase.from('friendships').select('user_id, friend_id').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
          supabase.from('friend_requests').select('to_user_id').eq('from_user_id', userId).eq('status', 'pending'),
          supabase.from('friend_requests').select('from_user_id').eq('to_user_id', userId).eq('status', 'pending'),
          supabase.from('blocked_users').select('blocked_id, created_at').eq('blocker_id', userId),
        ]);

        const computedFriendIds = (friendsRes.data ?? []).map((f: any) =>
          f.user_id === userId ? f.friend_id : f.user_id,
        );
        const computedSentIds = (sentReqRes.data ?? []).map((r: any) => r.to_user_id);
        const computedRecvIds = (recvReqRes.data ?? []).map((r: any) => r.from_user_id);

        setFriends(computedFriendIds);
        setFriendRequestsSent(computedSentIds);
        setFriendRequestsReceived(computedRecvIds);

        const bd = blockedRes.data ?? [];
        setBlockedUsers(bd.map((b: any) => b.blocked_id));
        setBlockedAt(Object.fromEntries(bd.map((b: any) => [b.blocked_id, b.created_at])));

        const relevantUserIds = [...new Set([
          ...computedFriendIds, ...computedSentIds, ...computedRecvIds,
        ])].filter((id: string) => id !== userId);

        let relevantUsersData: any[] = [];
        if (relevantUserIds.length > 0) {
          const batches: string[][] = [];
          for (let i = 0; i < relevantUserIds.length; i += 50) {
            batches.push(relevantUserIds.slice(i, i + 50));
          }
          const batchResults = await Promise.all(
            batches.map((batch) => supabase.from('users').select('*').in('id', batch)),
          );
          relevantUsersData = batchResults.flatMap((r: any) => r.data ?? []);
        }

        const dbUsers = relevantUsersData.map(mapDbUser);
        setAllUsersState(dbUsers);
        setUserCache(dbUsers);
        console.log('[FRIENDS] Loaded', dbUsers.length, 'relevant users');
      } catch (e) {
        console.log('[FRIENDS] Load error:', e);
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const sendFriendRequest = useCallback(
    async (targetUserId: string) => {
      if (!userId || friends.includes(targetUserId) || friendRequestsSent.includes(targetUserId)) return;
      setFriendRequestsSent((prev) => [...prev, targetUserId]);
      await supabase.from('friend_requests').insert({ from_user_id: userId, to_user_id: targetUserId });
    },
    [userId, friends, friendRequestsSent],
  );

  const cancelFriendRequest = useCallback(
    async (targetUserId: string) => {
      setFriendRequestsSent((prev) => prev.filter((id) => id !== targetUserId));
      await supabase.from('friend_requests').delete().eq('from_user_id', userId).eq('to_user_id', targetUserId);
    },
    [userId],
  );

  const acceptFriendRequest = useCallback(
    async (fromUserId: string) => {
      setFriends((prev) => [...prev, fromUserId]);
      setFriendRequestsReceived((prev) => prev.filter((id) => id !== fromUserId));
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('from_user_id', fromUserId).eq('to_user_id', userId);
      await supabase.from('friendships').insert({ user_id: userId, friend_id: fromUserId });
    },
    [userId],
  );

  const rejectFriendRequest = useCallback(
    async (fromUserId: string) => {
      setFriendRequestsReceived((prev) => prev.filter((id) => id !== fromUserId));
      await supabase.from('friend_requests').update({ status: 'rejected' }).eq('from_user_id', fromUserId).eq('to_user_id', userId);
    },
    [userId],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      setFriends((prev) => prev.filter((id) => id !== friendId));
      await supabase.from('friendships').delete().or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
    },
    [userId],
  );

  const blockUser = useCallback(
    async (targetId: string) => {
      if (blockedUsers.includes(targetId)) return;
      const now = new Date().toISOString();
      setBlockedUsers((prev) => [...prev, targetId]);
      setBlockedAt((prev) => ({ ...prev, [targetId]: now }));
      setFriends((prev) => prev.filter((id) => id !== targetId));
      setFriendRequestsSent((prev) => prev.filter((id) => id !== targetId));
      setFriendRequestsReceived((prev) => prev.filter((id) => id !== targetId));
      setAcceptedMessageUsers((prev) => prev.filter((id) => id !== targetId));
      await supabase.from('blocked_users').insert({ blocker_id: userId, blocked_id: targetId });
      await supabase.from('friendships').delete().or(`and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`);
    },
    [userId, blockedUsers],
  );

  const unblockUser = useCallback(
    async (targetId: string) => {
      setBlockedUsers((prev) => prev.filter((id) => id !== targetId));
      setBlockedAt((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      await supabase.from('blocked_users').delete().eq('blocker_id', userId).eq('blocked_id', targetId);
    },
    [userId],
  );

  const isFriend = useCallback((uid: string) => friends.includes(uid), [friends]);
  const hasSentRequest = useCallback((uid: string) => friendRequestsSent.includes(uid), [friendRequestsSent]);
  const hasReceivedRequest = useCallback((uid: string) => friendRequestsReceived.includes(uid), [friendRequestsReceived]);
  const isBlocked = useCallback((uid: string) => blockedUsers.includes(uid), [blockedUsers]);

  const friendUsers = useMemo((): SocialUser[] => {
    return allUsersState.filter((u) => friends.includes(u.id));
  }, [allUsersState, friends]);

  const friendRequestUsers = useMemo((): SocialUser[] => {
    return allUsersState.filter((u) => friendRequestsReceived.includes(u.id));
  }, [allUsersState, friendRequestsReceived]);

  const getFriendsForUser = useCallback(
    (uid: string): SocialUser[] => {
      if (uid === 'me') return friendUsers;
      return allUsersState.filter((u) => u.id !== uid).slice(0, 10);
    },
    [friendUsers, allUsersState],
  );

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard-users'],
    queryFn: async () => {
      console.log('[FRIENDS] Fetching leaderboard (top 100)');
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('xp', { ascending: false })
        .limit(100);
      return (data ?? []).map(mapDbUser);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!user,
  });

  const leaderboard = useMemo(() => {
    const topUsers = leaderboardQuery.data ?? allUsersState;
    return [...topUsers.filter((u: SocialUser) => !blockedUsers.includes(u.id))]
      .sort((a, b) => b.ep - a.ep)
      .map((u, i) => ({ ...u, position: i + 1 }));
  }, [leaderboardQuery.data, allUsersState, blockedUsers]);

  const addUserToCache = useCallback((u: SocialUser) => {
    addToUserCache(u);
    setAllUsersState((prev) => {
      if (prev.some((x) => x.id === u.id)) return prev;
      return [...prev, u];
    });
  }, []);

  return {
    friends,
    friendUsers,
    friendRequestUsers,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    isFriend,
    hasSentRequest,
    hasReceivedRequest,
    blockUser,
    unblockUser,
    isBlocked,
    blockedUsers,
    blockedAt,
    getFriendsForUser,
    leaderboard,
    allUsersState,
    addUserToCache,
    acceptedMessageUsers,
    setAcceptedMessageUsers,
    isLoading,
  };
});
