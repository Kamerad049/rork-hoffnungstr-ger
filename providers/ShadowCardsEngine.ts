import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/providers/AuthProvider';
import { useLobbyEngine } from '@/providers/LobbyEngine';
import type {
  ShadowCard,
  ShadowGameState,
  ShadowPlayerState,
  GameSettings,
} from '@/constants/games';
import {
  generateDeck,
  shuffleDeck,
  findPairs,
} from '@/constants/games';

function getNextActivePlayer(players: ShadowPlayerState[], currentUserId: string, direction: 'left' | 'right'): string {
  const activePlayerIds = players.filter(p => !p.isEliminated).map(p => p.userId);
  if (activePlayerIds.length <= 1) return activePlayerIds[0] ?? currentUserId;

  const currentIdx = activePlayerIds.indexOf(currentUserId);
  if (currentIdx === -1) return activePlayerIds[0];

  const step = direction === 'left' ? 1 : -1;
  const nextIdx = (currentIdx + step + activePlayerIds.length) % activePlayerIds.length;
  return activePlayerIds[nextIdx];
}

function getDrawTarget(players: ShadowPlayerState[], currentUserId: string, direction: 'left' | 'right'): string {
  const activePlayers = players.filter(p => !p.isEliminated && p.hand.length > 0);
  if (activePlayers.length <= 1) return currentUserId;

  const currentIdx = activePlayers.findIndex(p => p.userId === currentUserId);
  if (currentIdx === -1) return activePlayers[0]?.userId ?? currentUserId;

  const step = direction === 'left' ? 1 : -1;
  let nextIdx = (currentIdx + step + activePlayers.length) % activePlayers.length;
  if (activePlayers[nextIdx].userId === currentUserId) {
    nextIdx = (nextIdx + step + activePlayers.length) % activePlayers.length;
  }
  return activePlayers[nextIdx].userId;
}

export const [ShadowCardsProvider, useShadowCards] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { currentSession, members, currentRoom, endSession } = useLobbyEngine();

  const [gameState, setGameState] = useState<ShadowGameState | null>(null);
  const [animatingPair, setAnimatingPair] = useState<{ userId: string; pair: [ShadowCard, ShadowCard] } | null>(null);
  const [animatingDraw, setAnimatingDraw] = useState<{ fromUserId: string; toUserId: string; card: ShadowCard } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(0);
  const botActionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settings: GameSettings = useMemo(() => currentRoom?.settings ?? { turnTimerSeconds: 20, drawDirection: 'left', autoPairRemove: true }, [currentRoom?.settings]);

  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      if (botActionRef.current) clearTimeout(botActionRef.current);
    };
  }, []);

  const initGame = useCallback(() => {
    if (!currentSession || members.length < 2) return;
    console.log('[SHADOW] Initializing game with', members.length, 'players');

    const playerCount = members.length;
    const deck = shuffleDeck(generateDeck(playerCount));

    const playerStates: ShadowPlayerState[] = members.map(m => ({
      userId: m.userId,
      hand: [],
      handCount: 0,
      isEliminated: false,
      finishOrder: 0,
    }));

    let cardIdx = 0;
    while (cardIdx < deck.length) {
      for (const ps of playerStates) {
        if (cardIdx < deck.length) {
          ps.hand.push(deck[cardIdx]);
          cardIdx++;
        }
      }
    }

    for (const ps of playerStates) {
      const { pairs, remaining } = findPairs(ps.hand);
      ps.hand = remaining;
      ps.handCount = remaining.length;
      console.log('[SHADOW] Player', ps.userId.slice(0, 8), 'dealt', ps.hand.length + pairs.length * 2, 'cards, removed', pairs.length, 'pairs, hand:', remaining.length);
    }

    const firstPlayer = playerStates[0].userId;
    const drawTarget = getDrawTarget(playerStates, firstPlayer, settings.drawDirection);

    const initialState: ShadowGameState = {
      phase: 'playing',
      players: playerStates,
      currentTurnUserId: firstPlayer,
      turnStartedAt: Date.now(),
      drawFromUserId: drawTarget,
      removedPairs: [],
      turnNumber: 1,
      lastDrawnCard: null,
      lastDrawnByUserId: null,
      loserUserId: null,
      finishOrder: [],
    };

    setGameState(initialState);
    setTurnTimeLeft(settings.turnTimerSeconds);
    startTurnTimer(settings.turnTimerSeconds);

    if (firstPlayer.startsWith('bot_')) {
      scheduleBotAction(initialState);
    }

    console.log('[SHADOW] Game initialized, first turn:', firstPlayer);
  }, [currentSession, members, settings]);

  const startTurnTimer = useCallback((seconds: number) => {
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    setTurnTimeLeft(seconds);
    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          if (turnTimerRef.current) clearInterval(turnTimerRef.current);
          handleAutoPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleAutoPlay = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.phase !== 'playing') return prev;
      return performDraw(prev, prev.currentTurnUserId, settings, undefined);
    });
  }, [settings]);

  const scheduleBotAction = useCallback((state: ShadowGameState) => {
    if (botActionRef.current) clearTimeout(botActionRef.current);
    const delay = 1200 + Math.random() * 1500;
    botActionRef.current = setTimeout(() => {
      setGameState(prev => {
        if (!prev || prev.phase !== 'playing') return prev;
        if (!prev.currentTurnUserId.startsWith('bot_')) return prev;
        console.log('[SHADOW] Bot playing:', prev.currentTurnUserId);
        return performDraw(prev, prev.currentTurnUserId, settings, undefined);
      });
    }, delay);
  }, [settings]);

  const performDraw = useCallback((state: ShadowGameState, drawingUserId: string, gameSettings: GameSettings, chosenCardIndex?: number): ShadowGameState => {
    const drawFrom = state.players.find(p => p.userId === state.drawFromUserId);
    const drawingPlayer = state.players.find(p => p.userId === drawingUserId);
    if (!drawFrom || !drawingPlayer || drawFrom.hand.length === 0) {
      const nextTurn = getNextActivePlayer(state.players, drawingUserId, gameSettings.drawDirection);
      const nextDrawFrom = getDrawTarget(state.players, nextTurn, gameSettings.drawDirection);
      return {
        ...state,
        currentTurnUserId: nextTurn,
        turnStartedAt: Date.now(),
        drawFromUserId: nextDrawFrom,
        turnNumber: state.turnNumber + 1,
      };
    }

    const cardIdx = (chosenCardIndex !== undefined && chosenCardIndex >= 0 && chosenCardIndex < drawFrom.hand.length)
      ? chosenCardIndex
      : Math.floor(Math.random() * drawFrom.hand.length);
    const drawnCard = drawFrom.hand[cardIdx];
    console.log('[SHADOW] Card drawn at index', cardIdx, chosenCardIndex !== undefined ? '(player chose)' : '(random)');

    console.log('[SHADOW] Draw:', drawingUserId.slice(0, 8), 'draws from', state.drawFromUserId.slice(0, 8), '→', drawnCard.suit, drawnCard.value);

    const newFromHand = [...drawFrom.hand];
    newFromHand.splice(cardIdx, 1);

    const newDrawingHand = [...drawingPlayer.hand, drawnCard];

    let updatedPlayers = state.players.map(p => {
      if (p.userId === state.drawFromUserId) {
        return { ...p, hand: newFromHand, handCount: newFromHand.length };
      }
      if (p.userId === drawingUserId) {
        return { ...p, hand: newDrawingHand, handCount: newDrawingHand.length };
      }
      return p;
    });

    let newRemovedPairs = [...state.removedPairs];

    if (gameSettings.autoPairRemove) {
      const updatedDrawing = updatedPlayers.find(p => p.userId === drawingUserId);
      if (updatedDrawing) {
        const { pairs, remaining } = findPairs(updatedDrawing.hand);
        if (pairs.length > 0) {
          console.log('[SHADOW] Auto-removing', pairs.length, 'pairs from', drawingUserId.slice(0, 8));
          updatedPlayers = updatedPlayers.map(p => {
            if (p.userId === drawingUserId) {
              return { ...p, hand: remaining, handCount: remaining.length };
            }
            return p;
          });
          for (const pair of pairs) {
            newRemovedPairs.push({ userId: drawingUserId, pair });
          }
        }
      }
    }

    let finishOrder = [...state.finishOrder];
    let finishCount = finishOrder.length;
    updatedPlayers = updatedPlayers.map(p => {
      if (!p.isEliminated && p.hand.length === 0) {
        finishCount++;
        finishOrder.push(p.userId);
        console.log('[SHADOW] Player eliminated (no cards):', p.userId.slice(0, 8), 'finish:', finishCount);
        return { ...p, isEliminated: true, finishOrder: finishCount };
      }
      return p;
    });

    const activePlayers = updatedPlayers.filter(p => !p.isEliminated);

    if (activePlayers.length === 1) {
      const loser = activePlayers[0];
      finishOrder.push(loser.userId);
      console.log('[SHADOW] Game over! Loser:', loser.userId.slice(0, 8));
      return {
        ...state,
        phase: 'finished',
        players: updatedPlayers.map(p =>
          p.userId === loser.userId ? { ...p, finishOrder: finishOrder.length, isEliminated: true } : p,
        ),
        removedPairs: newRemovedPairs,
        lastDrawnCard: drawnCard,
        lastDrawnByUserId: drawingUserId,
        loserUserId: loser.userId,
        finishOrder,
      };
    }

    if (activePlayers.length === 0) {
      return { ...state, phase: 'finished', players: updatedPlayers, removedPairs: newRemovedPairs, finishOrder };
    }

    const nextTurn = getNextActivePlayer(updatedPlayers, drawingUserId, gameSettings.drawDirection);
    const nextDrawFrom = getDrawTarget(updatedPlayers, nextTurn, gameSettings.drawDirection);

    const newState: ShadowGameState = {
      ...state,
      players: updatedPlayers,
      currentTurnUserId: nextTurn,
      turnStartedAt: Date.now(),
      drawFromUserId: nextDrawFrom,
      removedPairs: newRemovedPairs,
      turnNumber: state.turnNumber + 1,
      lastDrawnCard: drawnCard,
      lastDrawnByUserId: drawingUserId,
      finishOrder,
    };

    startTurnTimer(gameSettings.turnTimerSeconds);

    if (nextTurn.startsWith('bot_')) {
      setTimeout(() => scheduleBotAction(newState), 100);
    }

    return newState;
  }, [startTurnTimer, scheduleBotAction]);

  const drawCard = useCallback((chosenCardIndex?: number) => {
    if (!gameState || gameState.phase !== 'playing' || isProcessing) return;
    if (gameState.currentTurnUserId !== userId) {
      console.log('[SHADOW] Not your turn');
      return;
    }

    setIsProcessing(true);
    console.log('[SHADOW] Player drawing card at index:', chosenCardIndex);

    setGameState(prev => {
      if (!prev) return prev;
      const newState = performDraw(prev, userId, settings, chosenCardIndex);

      if (newState.phase === 'finished' && newState.loserUserId) {
        const winnerIds = newState.finishOrder.filter(id => id !== newState.loserUserId);
        endSession(
          winnerIds[0] ?? null,
          newState.loserUserId,
          { finishOrder: newState.finishOrder, turnCount: newState.turnNumber },
        );
      }

      return newState;
    });

    setTimeout(() => setIsProcessing(false), 300);
  }, [gameState, userId, isProcessing, settings, performDraw, endSession]);

  const shuffleMyHand = useCallback(() => {
    if (!gameState) return;
    console.log('[SHADOW] Shuffling own hand (cosmetic)');
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.userId === userId) {
            return { ...p, hand: shuffleDeck(p.hand) };
          }
          return p;
        }),
      };
    });
  }, [gameState, userId]);

  const reorderMyHand = useCallback((fromIndex: number, toIndex: number) => {
    if (!gameState) return;
    console.log('[SHADOW] Reordering own hand:', fromIndex, '->', toIndex);
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.userId === userId) {
            const newHand = [...p.hand];
            const [moved] = newHand.splice(fromIndex, 1);
            newHand.splice(toIndex, 0, moved);
            return { ...p, hand: newHand };
          }
          return p;
        }),
      };
    });
  }, [gameState, userId]);

  const getMyHand = useCallback((): ShadowCard[] => {
    if (!gameState) return [];
    const me = gameState.players.find(p => p.userId === userId);
    return me?.hand ?? [];
  }, [gameState, userId]);

  const getPlayerHandCount = useCallback((playerId: string): number => {
    if (!gameState) return 0;
    const player = gameState.players.find(p => p.userId === playerId);
    return player?.handCount ?? player?.hand.length ?? 0;
  }, [gameState]);

  const isMyTurn = gameState?.currentTurnUserId === userId && gameState?.phase === 'playing';
  const isFinished = gameState?.phase === 'finished';
  const amILoser = gameState?.loserUserId === userId;

  useEffect(() => {
    if (gameState?.phase === 'finished' && gameState.loserUserId) {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      if (botActionRef.current) clearTimeout(botActionRef.current);
    }
  }, [gameState?.phase, gameState?.loserUserId]);

  return {
    gameState,
    animatingPair,
    animatingDraw,
    isProcessing,
    turnTimeLeft,
    isMyTurn,
    isFinished,
    amILoser,
    initGame,
    drawCard,
    shuffleMyHand,
    reorderMyHand,
    getMyHand,
    getPlayerHandCount,
    setAnimatingPair,
    setAnimatingDraw,
  };
});
