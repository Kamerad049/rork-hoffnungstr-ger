import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/constants/queryKeys';

export interface InboxNotification {
  id: string;
  title: string;
  message: string;
  audioUri: string | null;
  audioDuration: number;
  sentAt: string;
  read: boolean;
  readAt: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(user?.id ?? ''),
    queryFn: async () => {
      console.log('[NOTIFICATIONS] Loading for user:', user!.id);
      const { data, error } = await supabase
        .from('inbox_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('sent_at', { ascending: false });
      if (error) {
        console.log('[NOTIFICATIONS] Load error:', error.message);
        return [];
      }
      const mapped = (data ?? []).map((n: any): InboxNotification => ({
        id: n.id,
        title: n.title,
        message: n.message,
        audioUri: n.audio_uri ?? null,
        audioDuration: n.audio_duration ?? 0,
        sentAt: n.sent_at,
        read: n.read ?? false,
        readAt: n.read_at ?? null,
      }));
      console.log('[NOTIFICATIONS] Loaded', mapped.length);
      return mapped;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const notifications: InboxNotification[] = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const isLoading = notificationsQuery.isLoading;

  const addNotification = useCallback(
    async (notification: Omit<InboxNotification, 'read' | 'readAt'>) => {
      if (!user) return;
      const exists = notifications.some((n) => n.id === notification.id);
      if (exists) return;
      const item: InboxNotification = { ...notification, read: false, readAt: null };
      queryClient.setQueryData<InboxNotification[]>(
        queryKeys.notifications(user.id),
        (old) => [item, ...(old ?? [])],
      );
      const { error } = await supabase.from('inbox_notifications').insert({
        id: notification.id,
        user_id: user.id,
        title: notification.title,
        message: notification.message,
        audio_uri: notification.audioUri,
        audio_duration: notification.audioDuration,
        sent_at: notification.sentAt,
      });
      if (error) {
        console.log('[NOTIFICATIONS] Insert error:', error.message);
      }
    },
    [user, notifications, queryClient],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      queryClient.setQueryData<InboxNotification[]>(
        queryKeys.notifications(user?.id ?? ''),
        (old) => (old ?? []).map((n) => (n.id === id && !n.read ? { ...n, read: true, readAt: now } : n)),
      );
      await supabase
        .from('inbox_notifications')
        .update({ read: true, read_at: now })
        .eq('id', id);
    },
    [user, queryClient],
  );

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    queryClient.setQueryData<InboxNotification[]>(
      queryKeys.notifications(user?.id ?? ''),
      (old) => (old ?? []).map((n) => (n.read ? n : { ...n, read: true, readAt: now })),
    );
    if (!user) return;
    await supabase
      .from('inbox_notifications')
      .update({ read: true, read_at: now })
      .eq('user_id', user.id)
      .eq('read', false);
  }, [user, queryClient]);

  const deleteNotification = useCallback(async (id: string) => {
    queryClient.setQueryData<InboxNotification[]>(
      queryKeys.notifications(user?.id ?? ''),
      (old) => (old ?? []).filter((n) => n.id !== id),
    );
    await supabase.from('inbox_notifications').delete().eq('id', id);
  }, [user, queryClient]);

  const clearAll = useCallback(async () => {
    queryClient.setQueryData<InboxNotification[]>(
      queryKeys.notifications(user?.id ?? ''),
      [],
    );
    if (!user) return;
    await supabase.from('inbox_notifications').delete().eq('user_id', user.id);
  }, [user, queryClient]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
