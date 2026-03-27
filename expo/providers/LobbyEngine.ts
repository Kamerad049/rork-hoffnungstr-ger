import { useState, useCallback, useRef, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type {
  GameType,
  LobbyRoom,
  LobbyMember,
  GameSession,
  GameSettings,
} from '@/constants/games';
import { DEFAULT_GAME_SETTINGS } from '@/constants/games';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const [LobbyEngineProvider, useLobbyEngine] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const userName = user?.name ?? 'Spieler';

  const [currentRoom, setCurrentRoom] = useState<LobbyRoom | null>(null);
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [countdownValue, setCountdownValue] = useState<number>(0);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setIsCountingDown(false);
    setCountdownValue(0);
  }, []);

  useEffect(() => {
    const countdownInterval = countdownRef.current;
    const botTimer = botTimerRef.current;
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (botTimer) clearTimeout(botTimer);
    };
  }, []);

  const createRoom = useCallback(async (
    gameType: GameType,
    maxPlayers: number,
    isPrivate: boolean,
    settings?: Partial<GameSettings>,
  ): Promise<LobbyRoom> => {
    if (!userId) throw new Error('Nicht eingeloggt');
    console.log('[LOBBY] Creating room:', gameType, maxPlayers);

    const room: LobbyRoom = {
      id: generateId(),
      gameType,
      hostUserId: userId,
      maxPlayers,
      isPrivate,
      settings: { ...DEFAULT_GAME_SETTINGS, ...settings },
      status: 'waiting',
      inviteCode: generateInviteCode(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    const hostMember: LobbyMember = {
      userId,
      displayName: userName,
      avatarUrl: null,
      isReady: false,
      isHost: true,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    try {
      await supabase.from('game_rooms').insert({
        id: room.id,
        game_type: room.gameType,
        host_user_id: room.hostUserId,
        max_players: room.maxPlayers,
        is_private: room.isPrivate,
        settings_json: room.settings,
        status: room.status,
        invite_code: room.inviteCode,
        expires_at: room.expiresAt,
      });

      await supabase.from('game_room_members').insert({
        room_id: room.id,
        user_id: userId,
        is_ready: false,
        is_host: true,
      });
    } catch (e: any) {
      console.log('[LOBBY] DB insert error (continuing locally):', e?.message);
    }

    setCurrentRoom(room);
    setMembers([hostMember]);
    setError(null);
    console.log('[LOBBY] Room created:', room.id, 'Code:', room.inviteCode);
    return room;
  }, [userId, userName]);

  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!userId) return false;
    console.log('[LOBBY] Joining room:', roomId);

    let room = currentRoom;

    if (!room || room.id !== roomId) {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) {
          console.log('[LOBBY] Room not found in DB:', roomId, roomError?.message);
          setError('Raum nicht gefunden');
          return false;
        }

        if (roomData.status === 'cancelled' || roomData.status === 'finished') {
          setError('Raum ist nicht mehr aktiv');
          return false;
        }

        room = {
          id: roomData.id,
          gameType: roomData.game_type,
          hostUserId: roomData.host_user_id,
          maxPlayers: roomData.max_players,
          isPrivate: roomData.is_private,
          settings: roomData.settings_json ?? { ...DEFAULT_GAME_SETTINGS },
          status: roomData.status,
          inviteCode: roomData.invite_code,
          createdAt: roomData.created_at,
          expiresAt: roomData.expires_at,
        };

        const { data: memberData } = await supabase
          .from('game_room_members')
          .select('*')
          .eq('room_id', roomId);

        const existingMembers: LobbyMember[] = (memberData ?? []).map((m: any) => ({
          userId: m.user_id,
          displayName: m.display_name ?? 'Spieler',
          avatarUrl: null,
          isReady: m.is_ready ?? false,
          isHost: m.is_host ?? false,
          joinedAt: m.created_at ?? new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        }));

        setCurrentRoom(room);
        setMembers(existingMembers);

        if (existingMembers.some(m => m.userId === userId)) {
          console.log('[LOBBY] Already in room');
          setError(null);
          return true;
        }

        if (existingMembers.length >= room.maxPlayers) {
          setError('Raum ist voll');
          return false;
        }
      } catch (e: any) {
        console.log('[LOBBY] Join room DB lookup error:', e?.message);
        setError('Fehler beim Beitreten');
        return false;
      }
    } else {
      if (members.some(m => m.userId === userId)) {
        console.log('[LOBBY] Already in room');
        return true;
      }

      if (members.length >= room.maxPlayers) {
        setError('Raum ist voll');
        return false;
      }
    }

    const newMember: LobbyMember = {
      userId,
      displayName: userName,
      avatarUrl: null,
      isReady: false,
      isHost: false,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    setMembers(prev => [...prev, newMember]);

    try {
      await supabase.from('game_room_members').insert({
        room_id: roomId,
        user_id: userId,
        is_ready: false,
        is_host: false,
      });
    } catch (e: any) {
      console.log('[LOBBY] Join DB error (continuing locally):', e?.message);
    }

    setError(null);
    return true;
  }, [userId, userName, currentRoom, members]);

  const leaveRoom = useCallback(async () => {
    if (!currentRoom || !userId) return;
    console.log('[LOBBY] Leaving room:', currentRoom.id);

    clearCountdown();

    const wasHost = currentRoom.hostUserId === userId;

    try {
      await supabase.from('game_room_members')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', userId);

      if (wasHost) {
        await supabase.from('game_rooms')
          .update({ status: 'cancelled' })
          .eq('id', currentRoom.id);
      }
    } catch (e: any) {
      console.log('[LOBBY] Leave DB error:', e?.message);
    }

    setCurrentRoom(null);
    setMembers([]);
    setCurrentSession(null);
    setError(null);
  }, [currentRoom, userId, clearCountdown]);

  const toggleReady = useCallback(async () => {
    if (!currentRoom || !userId) return;
    console.log('[LOBBY] Toggling ready for:', userId);

    setMembers(prev => prev.map(m =>
      m.userId === userId ? { ...m, isReady: !m.isReady } : m,
    ));

    try {
      const member = members.find(m => m.userId === userId);
      await supabase.from('game_room_members')
        .update({ is_ready: !(member?.isReady ?? false) })
        .eq('room_id', currentRoom.id)
        .eq('user_id', userId);
    } catch (e: any) {
      console.log('[LOBBY] Toggle ready DB error:', e?.message);
    }
  }, [currentRoom, userId, members]);

  const canStart = useCallback((): boolean => {
    if (!currentRoom || currentRoom.hostUserId !== userId) return false;
    const def = { shadow_cards: 3, vier_gewinnt: 2, schiffe_versenken: 2 };
    const minPlayers = def[currentRoom.gameType] ?? 2;
    if (members.length < minPlayers) return false;
    return members.every(m => m.isReady || m.isHost);
  }, [currentRoom, userId, members]);

  const startGame = useCallback(async (): Promise<GameSession | null> => {
    if (!currentRoom || !userId || currentRoom.hostUserId !== userId) return null;
    if (!canStart()) {
      setError('Nicht alle Spieler sind bereit');
      return null;
    }

    console.log('[LOBBY] Starting game countdown');

    setCurrentRoom(prev => prev ? { ...prev, status: 'countdown' } : prev);
    setIsCountingDown(true);
    setCountdownValue(3);

    return new Promise((resolve) => {
      let count = 3;
      countdownRef.current = setInterval(() => {
        count -= 1;
        setCountdownValue(count);
        if (count <= 0) {
          clearCountdown();

          const session: GameSession = {
            id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            roomId: currentRoom.id,
            gameType: currentRoom.gameType,
            startedAt: new Date().toISOString(),
            endedAt: null,
            winnerUserId: null,
            loserUserId: null,
            resultJson: null,
            playerIds: members.map(m => m.userId),
          };

          setCurrentSession(session);
          setCurrentRoom(prev => prev ? { ...prev, status: 'in_game' } : prev);

          supabase.from('game_sessions').insert({
            id: session.id,
            room_id: session.roomId,
            game_type: session.gameType,
            started_at: session.startedAt,
            player_ids: session.playerIds,
          }).then(res => {
            if (res.error) console.log('[LOBBY] Session DB error:', res.error.message);
          });

          console.log('[LOBBY] Game session started:', session.id);
          resolve(session);
        }
      }, 1000);
    });
  }, [currentRoom, userId, canStart, members, clearCountdown]);

  const endSession = useCallback(async (
    winnerUserId: string | null,
    loserUserId: string | null,
    resultJson?: Record<string, unknown>,
  ) => {
    if (!currentSession) return;
    console.log('[LOBBY] Ending session:', currentSession.id, 'winner:', winnerUserId);

    const updatedSession: GameSession = {
      ...currentSession,
      endedAt: new Date().toISOString(),
      winnerUserId,
      loserUserId,
      resultJson: resultJson ?? null,
    };

    setCurrentSession(updatedSession);
    setCurrentRoom(prev => prev ? { ...prev, status: 'finished' } : prev);

    try {
      await supabase.from('game_sessions')
        .update({
          ended_at: updatedSession.endedAt,
          winner_user_id: winnerUserId,
          loser_user_id: loserUserId,
          result_json: resultJson ?? null,
        })
        .eq('id', currentSession.id);
    } catch (e: any) {
      console.log('[LOBBY] End session DB error:', e?.message);
    }
  }, [currentSession]);

  const addBot = useCallback((name: string) => {
    if (!currentRoom) return;
    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`;
    const bot: LobbyMember = {
      userId: botId,
      displayName: name,
      avatarUrl: null,
      isReady: true,
      isHost: false,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    setMembers(prev => {
      if (prev.length >= currentRoom.maxPlayers) return prev;
      return [...prev, bot];
    });
    console.log('[LOBBY] Bot added:', botId, name);
  }, [currentRoom]);

  const fillWithBots = useCallback(() => {
    if (!currentRoom) return;
    const botNames = ['Schatten-AI', 'Kartenkönig', 'Meister Fuchs', 'Der Stratege'];
    const slotsToFill = currentRoom.maxPlayers - members.length;
    for (let i = 0; i < slotsToFill; i++) {
      const name = botNames[i % botNames.length];
      addBot(name);
    }
  }, [currentRoom, members, addBot]);

  const rematch = useCallback(async () => {
    if (!currentRoom) return;
    console.log('[LOBBY] Rematch requested');

    setCurrentSession(null);
    setCurrentRoom(prev => prev ? { ...prev, status: 'waiting' } : prev);
    setMembers(prev => prev.map(m => ({ ...m, isReady: m.isHost ? false : m.userId.startsWith('bot_') })));
    setError(null);
  }, [currentRoom]);

  const isHost = currentRoom?.hostUserId === userId;
  const isMember = members.some(m => m.userId === userId);
  const myMember = members.find(m => m.userId === userId) ?? null;
  const allReady = members.length > 0 && members.every(m => m.isReady || m.isHost);

  return {
    currentRoom,
    members,
    currentSession,
    countdownValue,
    isCountingDown,
    error,
    isHost,
    isMember,
    myMember,
    allReady,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    canStart,
    startGame,
    endSession,
    addBot,
    fillWithBots,
    rematch,
    setError,
  };
});
