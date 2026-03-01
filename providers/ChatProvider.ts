import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { ChatMessage, Conversation } from '@/constants/types';

export const [ChatProvider, useChat] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { friends, blockedUsers, acceptedMessageUsers, setAcceptedMessageUsers } = useFriends();

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        console.log('[CHAT] Loading messages for user:', userId);
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(500);

        const msgMap: Record<string, ChatMessage[]> = {};
        for (const m of (data ?? [])) {
          const partnerId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
          if (!msgMap[partnerId]) msgMap[partnerId] = [];
          msgMap[partnerId].push({
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
          });
        }
        setMessages(msgMap);
        console.log('[CHAT] Loaded messages for', Object.keys(msgMap).length, 'conversations');
      } catch (e) {
        console.log('[CHAT] Load error:', e);
      }
    };
    load();
  }, [user]);

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
      console.log('[CHAT] Loading full conversation with:', partnerId);
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(from_user_id.eq.${userId},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages((prev) => ({
          ...prev,
          [partnerId]: data.map((m: any) => ({
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
        console.log('[CHAT] Loaded', data.length, 'messages for conversation');
      }
    },
    [userId],
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
  };
});
