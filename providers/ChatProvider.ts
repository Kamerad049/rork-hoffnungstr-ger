import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { ChatMessage, Conversation } from '@/constants/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const [ChatProvider, useChat] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { friends, blockedUsers, acceptedMessageUsers, setAcceptedMessageUsers } = useFriends();

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});
  const [loadingMoreMap, setLoadingMoreMap] = useState<Record<string, boolean>>({});

  const PAGE_SIZE = 30;

  const mapRow = useCallback((m: any): { partnerId: string; msg: ChatMessage } => {
    const partnerId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
    return {
      partnerId,
      msg: {
        id: m.id,
        fromUserId: m.from_user_id === userId ? 'me' : m.from_user_id,
        toUserId: m.to_user_id === userId ? 'me' : m.to_user_id,
        content: m.content,
        createdAt: m.created_at,
        read: m.read ?? false,
        readAt: m.read_at ?? undefined,
        edited: m.edited ?? false,
        recalled: m.recalled ?? false,
        isSystem: m.is_system ?? false,
      },
    };
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    const loadInboxPreview = async () => {
      try {
        console.log('[CHAT] Loading inbox preview (latest per conversation) for user:', userId);
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE * 3);

        const msgMap: Record<string, ChatMessage[]> = {};
        for (const m of (data ?? [])) {
          const { partnerId, msg } = mapRow(m);
          if (!msgMap[partnerId]) msgMap[partnerId] = [];
          msgMap[partnerId].push(msg);
        }
        setMessages(msgMap);
        console.log('[CHAT] Inbox preview loaded for', Object.keys(msgMap).length, 'conversations,', (data ?? []).length, 'messages total');
      } catch (e) {
        console.log('[CHAT] Inbox preview load error:', e);
      }
    };
    loadInboxPreview();
  }, [user, userId, mapRow]);

  useEffect(() => {
    if (!userId) return;

    console.log('[CHAT-RT] Setting up Realtime subscription for user:', userId);

    const channel = supabase
      .channel(`chat_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[CHAT-RT] New message received:', payload.new?.id);
          const row = payload.new as any;
          if (!row) return;
          const { partnerId, msg } = mapRow(row);
          setMessages((prev) => {
            const convo = prev[partnerId] ?? [];
            if (convo.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [partnerId]: [...convo, msg] };
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[CHAT-RT] Message updated (incoming):', payload.new?.id);
          const row = payload.new as any;
          if (!row) return;
          const { partnerId, msg } = mapRow(row);
          setMessages((prev) => {
            const convo = prev[partnerId] ?? [];
            if (!convo.some((m) => m.id === msg.id)) return prev;
            return {
              ...prev,
              [partnerId]: convo.map((m) => (m.id === msg.id ? msg : m)),
            };
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `from_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[CHAT-RT] Message updated (outgoing):', payload.new?.id);
          const row = payload.new as any;
          if (!row) return;
          const partnerId = row.to_user_id;
          setMessages((prev) => {
            const convo = prev[partnerId] ?? [];
            const existing = convo.find((m) => m.id === row.id);
            if (!existing) return prev;
            return {
              ...prev,
              [partnerId]: convo.map((m) =>
                m.id === row.id
                  ? {
                      ...m,
                      read: row.read ?? m.read,
                      readAt: row.read_at ?? m.readAt,
                    }
                  : m,
              ),
            };
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[CHAT-RT] Message deleted:', payload.old?.id);
          const old = payload.old as any;
          if (!old?.id) return;
          setMessages((prev) => {
            const updated = { ...prev };
            for (const pid of Object.keys(updated)) {
              const filtered = updated[pid].filter((m) => m.id !== old.id);
              if (filtered.length !== updated[pid].length) {
                updated[pid] = filtered;
              }
            }
            return updated;
          });
        },
      )
      .subscribe((status) => {
        console.log('[CHAT-RT] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[CHAT-RT] Cleaning up Realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, mapRow]);

  const sendMessage = useCallback(
    async (toUserId: string, content: string) => {
      if (!userId || blockedUsers.includes(toUserId)) return null;
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ from_user_id: userId, to_user_id: toUserId, content })
        .select('id, created_at')
        .single();
      if (error || !data) {
        console.log('[CHAT] Send message error:', error?.message);
        return null;
      }
      const msg: ChatMessage = {
        id: data.id,
        fromUserId: 'me',
        toUserId,
        content,
        createdAt: data.created_at,
        read: false,
      };
      setMessages((prev) => ({
        ...prev,
        [toUserId]: [...(prev[toUserId] ?? []), msg],
      }));
      return msg;
    },
    [userId, blockedUsers],
  );

  const sendVoiceMessage = useCallback(
    async (toUserId: string, voiceUri: string, duration: number) => {
      if (!userId || blockedUsers.includes(toUserId)) return null;
      console.log('[CHAT] Sending voice message, duration:', duration);
      const content = `🎤 Sprachnachricht (${Math.ceil(duration)}s)`;
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ from_user_id: userId, to_user_id: toUserId, content })
        .select('id, created_at')
        .single();
      if (error || !data) {
        console.log('[CHAT] Send voice message error:', error?.message);
        return null;
      }
      const msg: ChatMessage = {
        id: data.id,
        fromUserId: 'me',
        toUserId,
        content,
        createdAt: data.created_at,
        read: false,
        isVoice: true,
        voiceUri,
        voiceDuration: duration,
      };
      setMessages((prev) => ({
        ...prev,
        [toUserId]: [...(prev[toUserId] ?? []), msg],
      }));
      return msg;
    },
    [userId, blockedUsers],
  );

  const addSystemMessage = useCallback(
    async (partnerId: string, content: string) => {
      if (!userId) return null;
      const { data } = await supabase
        .from('chat_messages')
        .insert({ from_user_id: userId, to_user_id: partnerId, content, is_system: true, read: true })
        .select('id, created_at')
        .single();
      const msg: ChatMessage = {
        id: data?.id ?? `sys_${Date.now()}`,
        fromUserId: 'system',
        toUserId: partnerId,
        content,
        createdAt: data?.created_at ?? new Date().toISOString(),
        read: true,
        isSystem: true,
      };
      setMessages((prev) => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] ?? []), msg],
      }));
      return msg;
    },
    [userId],
  );

  const editMessage = useCallback(
    async (partnerId: string, messageId: string, newContent: string) => {
      setMessages((prev) => {
        const convo = prev[partnerId] ?? [];
        const msg = convo.find((m) => m.id === messageId);
        if (!msg || msg.fromUserId !== 'me' || msg.read || msg.recalled) return prev;
        return {
          ...prev,
          [partnerId]: convo.map((m) => (m.id === messageId ? { ...m, content: newContent, edited: true } : m)),
        };
      });
      await supabase.from('chat_messages').update({ content: newContent, edited: true }).eq('id', messageId);
    },
    [],
  );

  const recallMessage = useCallback(
    async (partnerId: string, messageId: string) => {
      setMessages((prev) => {
        const convo = prev[partnerId] ?? [];
        const msg = convo.find((m) => m.id === messageId);
        if (!msg || msg.fromUserId !== 'me' || msg.read || msg.recalled) return prev;
        return {
          ...prev,
          [partnerId]: convo.map((m) => (m.id === messageId ? { ...m, recalled: true, content: '' } : m)),
        };
      });
      await supabase.from('chat_messages').update({ recalled: true, content: '' }).eq('id', messageId);
    },
    [],
  );

  const deleteConversation = useCallback(
    async (partnerId: string) => {
      setMessages((prev) => {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
      if (!userId) return;
      await supabase.from('chat_messages').delete().or(
        `and(from_user_id.eq.${userId},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${userId})`,
      );
    },
    [userId],
  );

  const markMessagesRead = useCallback(
    async (partnerId: string) => {
      setMessages((prev) => {
        const convo = prev[partnerId] ?? [];
        const hasUnread = convo.some((m) => m.toUserId === 'me' && !m.read);
        if (!hasUnread) return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          [partnerId]: convo.map((m) => (m.toUserId === 'me' && !m.read ? { ...m, read: true, readAt: now } : m)),
        };
      });
      if (!userId) return;
      await supabase
        .from('chat_messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('from_user_id', partnerId)
        .eq('to_user_id', userId)
        .eq('read', false);
    },
    [userId],
  );

  const simulatePartnerRead = useCallback(
    async (partnerId: string) => {
      const now = new Date().toISOString();
      setMessages((prev) => {
        const convo = prev[partnerId] ?? [];
        return {
          ...prev,
          [partnerId]: convo.map((m) => (m.fromUserId === 'me' && !m.read ? { ...m, read: true, readAt: now } : m)),
        };
      });
    },
    [],
  );

  const getMessages = useCallback(
    (partnerId: string): ChatMessage[] => {
      return (messages[partnerId] ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    },
    [messages],
  );

  const canSendMessage = useCallback(
    (toUserId: string): boolean => {
      if (blockedUsers.includes(toUserId)) return false;
      if (friends.includes(toUserId)) return true;
      if (acceptedMessageUsers.includes(toUserId)) return true;
      const convo = messages[toUserId] ?? [];
      const sentByMe = convo.filter((m) => m.fromUserId === 'me');
      return sentByMe.length < 1;
    },
    [friends, blockedUsers, acceptedMessageUsers, messages],
  );

  const isMessageRequest = useCallback(
    (partnerId: string): boolean => {
      if (friends.includes(partnerId)) return false;
      if (acceptedMessageUsers.includes(partnerId)) return false;
      const convo = messages[partnerId] ?? [];
      return convo.length > 0;
    },
    [friends, acceptedMessageUsers, messages],
  );

  const acceptMessageRequest = useCallback((uid: string) => {
    setAcceptedMessageUsers((prev: string[]) => (prev.includes(uid) ? prev : [...prev, uid]));
  }, [setAcceptedMessageUsers]);

  const declineMessageRequest = useCallback((uid: string) => {
    setMessages((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  }, []);

  const conversations = useMemo((): Conversation[] => {
    const convos: Conversation[] = [];
    for (const [partnerId, msgs] of Object.entries(messages)) {
      if (msgs.length === 0 || blockedUsers.includes(partnerId)) continue;
      if (!friends.includes(partnerId) && !acceptedMessageUsers.includes(partnerId)) continue;
      const sorted = [...msgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const last = sorted[0];
      convos.push({
        partnerId,
        lastMessage: last.recalled ? 'Nachricht zurückgezogen' : last.content,
        lastMessageTime: last.createdAt,
        unreadCount: msgs.filter((m) => m.toUserId === 'me' && !m.read).length,
        isFromMe: last.fromUserId === 'me',
        lastMessageRead: last.read,
        lastMessageRecalled: last.recalled ?? false,
      });
    }
    return convos.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }, [messages, blockedUsers, friends, acceptedMessageUsers]);

  const messageRequests = useMemo((): Conversation[] => {
    const convos: Conversation[] = [];
    for (const [partnerId, msgs] of Object.entries(messages)) {
      if (msgs.length === 0 || blockedUsers.includes(partnerId)) continue;
      if (friends.includes(partnerId) || acceptedMessageUsers.includes(partnerId)) continue;
      if (!msgs.some((m) => m.toUserId === 'me')) continue;
      const sorted = [...msgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const last = sorted[0];
      convos.push({
        partnerId,
        lastMessage: last.recalled ? 'Nachricht zurückgezogen' : last.content,
        lastMessageTime: last.createdAt,
        unreadCount: msgs.filter((m) => m.toUserId === 'me' && !m.read).length,
        isFromMe: last.fromUserId === 'me',
        lastMessageRead: last.read,
        lastMessageRecalled: last.recalled ?? false,
      });
    }
    return convos.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }, [messages, blockedUsers, friends, acceptedMessageUsers]);

  const loadConversation = useCallback(
    async (partnerId: string) => {
      if (!userId) return;
      console.log('[CHAT] Loading initial page for conversation with:', partnerId);
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(from_user_id.eq.${userId},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (data) {
        const reversed = [...data].reverse();
        setMessages((prev) => ({
          ...prev,
          [partnerId]: reversed.map((m: any) => ({
            id: m.id,
            fromUserId: m.from_user_id === userId ? 'me' : m.from_user_id,
            toUserId: m.to_user_id === userId ? 'me' : m.to_user_id,
            content: m.content,
            createdAt: m.created_at,
            read: m.read ?? false,
            readAt: m.read_at ?? undefined,
            edited: m.edited ?? false,
            recalled: m.recalled ?? false,
            isSystem: m.is_system ?? false,
          })),
        }));
        setHasMoreMap((prev) => ({ ...prev, [partnerId]: data.length >= PAGE_SIZE }));
        console.log('[CHAT] Loaded', data.length, 'messages, hasMore:', data.length >= PAGE_SIZE);
      }
    },
    [userId],
  );

  const loadOlderMessages = useCallback(
    async (partnerId: string) => {
      if (!userId) return;
      if (loadingMoreMap[partnerId]) return;
      if (hasMoreMap[partnerId] === false) return;

      const convo = messages[partnerId] ?? [];
      if (convo.length === 0) return;

      const oldestMsg = convo[0];
      const oldestDate = oldestMsg.createdAt;

      console.log('[CHAT] Loading older messages before:', oldestDate);
      setLoadingMoreMap((prev) => ({ ...prev, [partnerId]: true }));

      try {
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`and(from_user_id.eq.${userId},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${userId})`)
          .lt('created_at', oldestDate)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        if (data) {
          const olderMsgs: ChatMessage[] = data.reverse().map((m: any) => ({
            id: m.id,
            fromUserId: m.from_user_id === userId ? 'me' : m.from_user_id,
            toUserId: m.to_user_id === userId ? 'me' : m.to_user_id,
            content: m.content,
            createdAt: m.created_at,
            read: m.read ?? false,
            readAt: m.read_at ?? undefined,
            edited: m.edited ?? false,
            recalled: m.recalled ?? false,
            isSystem: m.is_system ?? false,
          }));

          setMessages((prev) => {
            const existing = prev[partnerId] ?? [];
            const existingIds = new Set(existing.map((m) => m.id));
            const newMsgs = olderMsgs.filter((m) => !existingIds.has(m.id));
            return { ...prev, [partnerId]: [...newMsgs, ...existing] };
          });
          setHasMoreMap((prev) => ({ ...prev, [partnerId]: data.length >= PAGE_SIZE }));
          console.log('[CHAT] Loaded', data.length, 'older messages, hasMore:', data.length >= PAGE_SIZE);
        }
      } catch (e) {
        console.log('[CHAT] Load older messages error:', e);
      } finally {
        setLoadingMoreMap((prev) => ({ ...prev, [partnerId]: false }));
      }
    },
    [userId, messages, hasMoreMap, loadingMoreMap],
  );

  const hasMoreMessages = useCallback(
    (partnerId: string): boolean => hasMoreMap[partnerId] ?? true,
    [hasMoreMap],
  );

  const isLoadingMore = useCallback(
    (partnerId: string): boolean => loadingMoreMap[partnerId] ?? false,
    [loadingMoreMap],
  );

  return {
    conversations,
    messageRequests,
    sendMessage,
    sendVoiceMessage,
    canSendMessage,
    isMessageRequest,
    acceptMessageRequest,
    declineMessageRequest,
    addSystemMessage,
    editMessage,
    recallMessage,
    markMessagesRead,
    simulatePartnerRead,
    getMessages,
    deleteConversation,
    loadConversation,
    loadOlderMessages,
    hasMoreMessages,
    isLoadingMore,
  };
});
