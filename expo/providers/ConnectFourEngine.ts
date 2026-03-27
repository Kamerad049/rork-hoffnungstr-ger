import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/providers/AuthProvider';
import { useLobbyEngine } from '@/providers/LobbyEngine';

export type CellValue = 0 | 1 | 2;
export type ConnectFourPhase = 'playing' | 'finished' | 'draw';

export interface ConnectFourState {
  board: CellValue[][];
  currentPlayer: 1 | 2;
  currentUserId: string;
  phase: ConnectFourPhase;
  winnerUserId: string | null;
  winningCells: [number, number][] | null;
  lastMove: { row: number; col: number } | null;
  moveCount: number;
}

const ROWS = 6;
const COLS = 7;

function createEmptyBoard(): CellValue[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as CellValue[]);
}

function findLowestEmptyRow(board: CellValue[][], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

function checkWin(board: CellValue[][], row: number, col: number, player: CellValue): [number, number][] | null {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const cells: [number, number][] = [[row, col]];

    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push([r, c]);
    }

    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push([r, c]);
    }

    if (cells.length >= 4) return cells;
  }

  return null;
}

function isBoardFull(board: CellValue[][]): boolean {
  return board[0].every(cell => cell !== 0);
}

function getBotMove(board: CellValue[][], botPlayer: CellValue, humanPlayer: CellValue): number {
  const validCols = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) validCols.push(c);
  }
  if (validCols.length === 0) return -1;

  for (const col of validCols) {
    const row = findLowestEmptyRow(board, col);
    if (row === -1) continue;
    const testBoard = board.map(r => [...r]);
    testBoard[row][col] = botPlayer;
    if (checkWin(testBoard, row, col, botPlayer)) return col;
  }

  for (const col of validCols) {
    const row = findLowestEmptyRow(board, col);
    if (row === -1) continue;
    const testBoard = board.map(r => [...r]);
    testBoard[row][col] = humanPlayer;
    if (checkWin(testBoard, row, col, humanPlayer)) return col;
  }

  if (validCols.includes(3)) return 3;

  const centerish = validCols.filter(c => c >= 2 && c <= 4);
  if (centerish.length > 0) return centerish[Math.floor(Math.random() * centerish.length)];

  return validCols[Math.floor(Math.random() * validCols.length)];
}

export const [ConnectFourProvider, useConnectFour] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { currentSession, members, endSession } = useLobbyEngine();

  const [gameState, setGameState] = useState<ConnectFourState | null>(null);
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [dropAnimation, setDropAnimation] = useState<{ col: number; row: number; player: 1 | 2 } | null>(null);

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  const playerMap = useMemo(() => {
    if (!members || members.length < 2) return { player1: '', player2: '' };
    const humanIdx = members.findIndex(m => !m.userId.startsWith('bot_'));
    const otherIdx = humanIdx === 0 ? 1 : 0;
    return {
      player1: members[humanIdx]?.userId ?? members[0].userId,
      player2: members[otherIdx]?.userId ?? members[1].userId,
    };
  }, [members]);

  const getPlayerNumber = useCallback((uid: string): 1 | 2 => {
    return uid === playerMap.player1 ? 1 : 2;
  }, [playerMap]);

  const getUserIdForPlayer = useCallback((p: 1 | 2): string => {
    return p === 1 ? playerMap.player1 : playerMap.player2;
  }, [playerMap]);

  const initGame = useCallback(() => {
    if (!currentSession || members.length < 2) return;
    console.log('[C4] Initializing Connect Four with players:', members.map(m => m.displayName));

    const firstPlayer = playerMap.player1;

    const state: ConnectFourState = {
      board: createEmptyBoard(),
      currentPlayer: 1,
      currentUserId: firstPlayer,
      phase: 'playing',
      winnerUserId: null,
      winningCells: null,
      lastMove: null,
      moveCount: 0,
    };

    setGameState(state);
    setIsDropping(false);
    setDropAnimation(null);
    console.log('[C4] Game initialized, first player:', firstPlayer);
  }, [currentSession, members, playerMap]);

  const makeMove = useCallback((col: number): boolean => {
    if (!gameState || gameState.phase !== 'playing' || isDropping) return false;

    const row = findLowestEmptyRow(gameState.board, col);
    if (row === -1) return false;

    console.log('[C4] Move: player', gameState.currentPlayer, 'col:', col, 'row:', row);

    setIsDropping(true);
    setDropAnimation({ col, row, player: gameState.currentPlayer });

    return true;
  }, [gameState, isDropping]);

  const confirmDrop = useCallback(() => {
    if (!gameState || !dropAnimation) return;

    const { col, row, player } = dropAnimation;
    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = player;

    const winCells = checkWin(newBoard, row, col, player);
    const currentUserId = getUserIdForPlayer(player);

    if (winCells) {
      console.log('[C4] Winner:', currentUserId);
      const loserPlayer: 1 | 2 = player === 1 ? 2 : 1;
      const loserUserId = getUserIdForPlayer(loserPlayer);

      setGameState({
        ...gameState,
        board: newBoard,
        phase: 'finished',
        winnerUserId: currentUserId,
        winningCells: winCells,
        lastMove: { row, col },
        moveCount: gameState.moveCount + 1,
      });

      endSession(currentUserId, loserUserId, {
        board: newBoard,
        moveCount: gameState.moveCount + 1,
      });
    } else if (isBoardFull(newBoard)) {
      console.log('[C4] Draw!');
      setGameState({
        ...gameState,
        board: newBoard,
        phase: 'draw',
        winnerUserId: null,
        winningCells: null,
        lastMove: { row, col },
        moveCount: gameState.moveCount + 1,
      });

      endSession(null, null, { board: newBoard, draw: true });
    } else {
      const nextPlayer: 1 | 2 = player === 1 ? 2 : 1;
      const nextUserId = getUserIdForPlayer(nextPlayer);

      setGameState({
        ...gameState,
        board: newBoard,
        currentPlayer: nextPlayer,
        currentUserId: nextUserId,
        lastMove: { row, col },
        moveCount: gameState.moveCount + 1,
      });
    }

    setIsDropping(false);
    setDropAnimation(null);
  }, [gameState, dropAnimation, getUserIdForPlayer, endSession]);

  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing' || isDropping) return;

    const currentUid = gameState.currentUserId;
    const isBot = currentUid.startsWith('bot_');

    if (isBot) {
      const humanPlayer = getPlayerNumber(userId);
      const botPlayer = gameState.currentPlayer;

      botTimerRef.current = setTimeout(() => {
        const col = getBotMove(gameState.board, botPlayer, humanPlayer);
        if (col >= 0) {
          makeMove(col);
        }
      }, 800 + Math.random() * 600);

      return () => {
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
      };
    }
  }, [gameState?.currentUserId, gameState?.phase, isDropping]);

  const isMyTurn = gameState?.currentUserId === userId && gameState?.phase === 'playing' && !isDropping;
  const myPlayerNumber = getPlayerNumber(userId);

  return {
    gameState,
    isDropping,
    dropAnimation,
    isMyTurn,
    myPlayerNumber,
    playerMap,
    initGame,
    makeMove,
    confirmDrop,
    getPlayerNumber,
    getUserIdForPlayer,
    ROWS,
    COLS,
  };
});
