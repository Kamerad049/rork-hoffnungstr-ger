import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  RotateCcw,
  Trophy,
  Minus,
  Crown,
} from 'lucide-react-native';
import { useConnectFour, type CellValue } from '@/providers/ConnectFourEngine';
import { useLobbyEngine } from '@/providers/LobbyEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_MARGIN = 10;
const BOARD_PADDING = 8;
const CELL_GAP = 3;
const BOARD_WIDTH = SCREEN_WIDTH - BOARD_MARGIN * 2;
const CELL_SIZE = Math.floor((BOARD_WIDTH - BOARD_PADDING * 2 - CELL_GAP * 6) / 7);
const COIN_SIZE = CELL_SIZE - 4;

const COLORS = {
  bg: '#0C0C0E',
  surface: '#141418',
  boardFace: '#0F1628',
  boardBorder: '#1C2548',
  boardHighlight: 'rgba(80,100,180,0.12)',
  p1: '#E84040',
  p1Light: '#FF6B5E',
  p1Dark: '#B82E2E',
  p1Glow: 'rgba(232,64,64,0.3)',
  p2: '#EDBE3E',
  p2Light: '#FFD666',
  p2Dark: '#C49A28',
  p2Glow: 'rgba(237,190,62,0.3)',
  gold: '#BFA35D',
  goldMuted: 'rgba(191,163,93,0.5)',
  text: '#E8DCC8',
  textMuted: 'rgba(232,220,200,0.45)',
  textDim: 'rgba(232,220,200,0.2)',
  cellEmpty: 'rgba(6,6,14,0.75)',
  cellBorder: 'rgba(50,65,120,0.2)',
} as const;

function CoinDrop({
  col,
  targetRow,
  player,
  onComplete,
}: {
  col: number;
  targetRow: number;
  player: 1 | 2;
  onComplete: () => void;
}) {
  const dropAnim = useRef(new Animated.Value(-CELL_SIZE - 16)).current;
  const bounceScale = useRef(new Animated.Value(1)).current;

  const targetY = targetRow * (CELL_SIZE + CELL_GAP);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(dropAnim, {
        toValue: targetY,
        duration: 200 + targetRow * 55,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bounceScale, { toValue: 1.12, duration: 70, useNativeDriver: true }),
        Animated.spring(bounceScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onComplete();
    });
  }, []);

  const left = col * (CELL_SIZE + CELL_GAP) + 2;
  const color = player === 1 ? COLORS.p1 : COLORS.p2;

  return (
    <Animated.View
      style={[
        styles.droppingCoin,
        {
          width: COIN_SIZE,
          height: COIN_SIZE,
          borderRadius: COIN_SIZE / 2,
          left,
          transform: [{ translateY: dropAnim }, { scale: bounceScale }],
        },
      ]}
    >
      <LinearGradient
        colors={
          player === 1
            ? [COLORS.p1Light, COLORS.p1, COLORS.p1Dark]
            : [COLORS.p2Light, COLORS.p2, COLORS.p2Dark]
        }
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 0.9 }}
        style={[styles.coinGradient, { borderRadius: COIN_SIZE / 2 }]}
      >
        <View style={[styles.coinShine, { borderRadius: (COIN_SIZE - 10) / 2 }]} />
      </LinearGradient>
      <View style={[styles.coinShadowRing, { borderRadius: COIN_SIZE / 2, borderColor: color }]} />
    </Animated.View>
  );
}

const BoardCell = React.memo(function BoardCell({
  value,
  isWinning,
}: {
  value: CellValue;
  row: number;
  col: number;
  isWinning: boolean;
  isLastMove: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const winPulse = useRef(new Animated.Value(1)).current;
  const hasAppeared = useRef(value !== 0);

  useEffect(() => {
    if (value !== 0 && !hasAppeared.current) {
      hasAppeared.current = true;
      scaleAnim.setValue(0.6);
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
    }
  }, [value]);

  useEffect(() => {
    if (isWinning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(winPulse, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(winPulse, { toValue: 0.95, duration: 500, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isWinning]);

  const coinColors = value === 1
    ? [COLORS.p1Light, COLORS.p1, COLORS.p1Dark] as const
    : [COLORS.p2Light, COLORS.p2, COLORS.p2Dark] as const;

  return (
    <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
      <View style={[styles.cellHole, { borderRadius: COIN_SIZE / 2 }]}>
        {value !== 0 && (
          <Animated.View
            style={[
              styles.placedCoin,
              {
                width: COIN_SIZE,
                height: COIN_SIZE,
                borderRadius: COIN_SIZE / 2,
                transform: [{ scale: isWinning ? winPulse : scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={coinColors}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.8, y: 0.9 }}
              style={[styles.coinGradient, { borderRadius: COIN_SIZE / 2 }]}
            >
              <View style={[styles.coinShine, { borderRadius: (COIN_SIZE - 10) / 2 }]} />
            </LinearGradient>
            {isWinning && (
              <View style={[styles.winRing, { borderRadius: COIN_SIZE / 2 + 1 }]} />
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
});

function PlayerBadge({
  playerNumber,
  displayName,
  isActive,
  isWinner,
  align,
}: {
  playerNumber: 1 | 2;
  displayName: string;
  isActive: boolean;
  isWinner: boolean;
  align: 'left' | 'right';
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const color = playerNumber === 1 ? COLORS.p1 : COLORS.p2;
  const isRight = align === 'right';

  return (
    <Animated.View
      style={[
        styles.playerBadge,
        isActive && { borderColor: color, backgroundColor: `${color}08` },
        isRight && { flexDirection: 'row-reverse' as const },
        { transform: [{ scale: isActive ? pulseAnim : 1 as any }] },
      ]}
    >
      <View style={[styles.playerDot, { backgroundColor: color }]}>
        {isWinner && <Crown size={12} color="#fff" strokeWidth={3} />}
      </View>
      <View style={isRight ? { alignItems: 'flex-end' as const } : undefined}>
        <Text style={[styles.playerName, isActive && { color }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.playerRole, isActive && { color, opacity: 0.6 }]}>
          {playerNumber === 1 ? 'ROT' : 'GOLD'}
        </Text>
      </View>
    </Animated.View>
  );
}

function GameOverOverlay({
  winnerName,
  isDraw,
  onRematch,
  onExit,
}: {
  winnerName: string | null;
  isDraw: boolean;
  onRematch: () => void;
  onExit: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        isDraw ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
      );
    }
  }, []);

  return (
    <Animated.View style={[styles.overlayBg, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.overlayCard, { transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.overlayIcon, { transform: [{ scale: iconScale }] }]}>
          {isDraw ? <Minus size={32} color={COLORS.gold} /> : <Trophy size={32} color={COLORS.gold} />}
        </Animated.View>

        <Text style={styles.overlayTitle}>{isDraw ? 'UNENTSCHIEDEN' : 'GEWONNEN!'}</Text>
        {!isDraw && winnerName && (
          <Text style={styles.overlaySubtitle}>{winnerName} gewinnt die Partie</Text>
        )}

        <View style={styles.overlayActions}>
          <Pressable style={styles.rematchBtn} onPress={onRematch} testID="rematch-btn">
            <LinearGradient
              colors={[COLORS.gold, '#A08A45']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rematchGrad}
            >
              <RotateCcw size={16} color={COLORS.bg} />
              <Text style={styles.rematchText}>REVANCHE</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.exitBtn} onPress={onExit} testID="exit-btn">
            <Text style={styles.exitText}>ZURÜCK ZUR LOBBY</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function ConnectFourScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    gameState,
    dropAnimation,
    isMyTurn,
    playerMap,
    makeMove,
    confirmDrop,
    initGame,
    ROWS: rows,
    COLS: cols,
  } = useConnectFour();
  const { members, leaveRoom, rematch } = useLobbyEngine();

  const boardEnterAnim = useRef(new Animated.Value(0)).current;
  const boardScaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(boardEnterAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(boardScaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleColumnPress = useCallback((col: number) => {
    if (!isMyTurn) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    makeMove(col);
  }, [isMyTurn, makeMove]);

  const handleRematch = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await rematch();
    initGame();
  }, [rematch, initGame]);

  const handleExit = useCallback(async () => {
    await leaveRoom();
    router.back();
    router.back();
  }, [leaveRoom, router]);

  const handleClose = useCallback(async () => {
    await leaveRoom();
    router.back();
    router.back();
  }, [leaveRoom, router]);

  const player1Member = useMemo(() => members.find(m => m.userId === playerMap.player1), [members, playerMap]);
  const player2Member = useMemo(() => members.find(m => m.userId === playerMap.player2), [members, playerMap]);

  const winningCellSet = useMemo(() => {
    if (!gameState?.winningCells) return new Set<string>();
    return new Set(gameState.winningCells.map(([r, c]) => `${r}-${c}`));
  }, [gameState?.winningCells]);

  const columnHasSpace = useMemo(() => {
    if (!gameState) return Array(cols).fill(false);
    return Array.from({ length: cols }, (_, c) => gameState.board[0][c] === 0);
  }, [gameState]);

  const isGameOver = gameState?.phase === 'finished' || gameState?.phase === 'draw';

  const winnerMember = useMemo(() => {
    if (!gameState?.winnerUserId) return null;
    return members.find(m => m.userId === gameState.winnerUserId) ?? null;
  }, [gameState?.winnerUserId, members]);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.bg, '#101014', COLORS.bg]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Spiel wird geladen...</Text>
        </View>
      </View>
    );
  }

  const currentColor = gameState.currentPlayer === 1 ? COLORS.p1 : COLORS.p2;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.bg, '#0E0E14', COLORS.bg]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Pressable style={styles.closeBtn} onPress={handleClose} testID="close-game-btn">
          <X size={18} color={COLORS.textMuted} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>VIER GEWINNT</Text>
        </View>
        <View style={styles.moveChip}>
          <Text style={styles.moveChipText}>ZUG {gameState.moveCount + 1}</Text>
        </View>
      </View>

      <View style={styles.playersSection}>
        <PlayerBadge
          playerNumber={1}
          displayName={player1Member?.displayName?.split(' ')[0] ?? 'Spieler 1'}
          isActive={gameState.currentPlayer === 1 && gameState.phase === 'playing'}
          isWinner={gameState.winnerUserId === playerMap.player1}
          align="left"
        />
        <View style={styles.vsWrap}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <PlayerBadge
          playerNumber={2}
          displayName={player2Member?.displayName?.split(' ')[0] ?? 'Spieler 2'}
          isActive={gameState.currentPlayer === 2 && gameState.phase === 'playing'}
          isWinner={gameState.winnerUserId === playerMap.player2}
          align="right"
        />
      </View>

      {gameState.phase === 'playing' && (
        <View style={styles.turnIndicator}>
          <View style={[styles.turnDot, { backgroundColor: currentColor }]} />
          <Text style={[styles.turnLabel, { color: currentColor }]}>
            {isMyTurn ? 'DU BIST DRAN' : `${gameState.currentPlayer === 1
              ? (player1Member?.displayName?.split(' ')[0] ?? 'Spieler 1')
              : (player2Member?.displayName?.split(' ')[0] ?? 'Spieler 2')} ist dran`}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <Animated.View
        style={[
          styles.boardOuter,
          {
            opacity: boardEnterAnim,
            transform: [{ scale: boardScaleAnim }],
          },
        ]}
      >
        <View style={styles.boardFrame}>
          <LinearGradient
            colors={['#162040', '#0F1830', '#162040']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.boardGrad}
          >
            <View style={styles.boardGrid}>
              {dropAnimation && (
                <CoinDrop
                  col={dropAnimation.col}
                  targetRow={dropAnimation.row}
                  player={dropAnimation.player}
                  onComplete={confirmDrop}
                />
              )}

              {Array.from({ length: rows }, (_, r) => (
                <View key={r} style={styles.boardRow}>
                  {Array.from({ length: cols }, (_, c) => (
                    <Pressable
                      key={`${r}-${c}`}
                      onPress={() => {
                        if (columnHasSpace[c] && isMyTurn && gameState.phase === 'playing') {
                          handleColumnPress(c);
                        }
                      }}
                      testID={`cell-${r}-${c}`}
                      style={styles.cellPressable}
                    >
                      <BoardCell
                        value={gameState.board[r][c]}
                        row={r}
                        col={c}
                        isWinning={winningCellSet.has(`${r}-${c}`)}
                        isLastMove={gameState.lastMove?.row === r && gameState.lastMove?.col === c}
                      />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.boardBase}>
          <LinearGradient
            colors={['#1A2550', '#141C3A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.boardBaseGrad}
          />
        </View>
      </Animated.View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {gameState.phase === 'playing' && isMyTurn && (
          <Text style={styles.hintText}>Tippe auf eine Spalte</Text>
        )}
      </View>

      {isGameOver && (
        <GameOverOverlay
          winnerName={winnerMember?.displayName ?? null}
          isDraw={gameState.phase === 'draw'}
          onRematch={handleRematch}
          onExit={handleExit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.textDim,
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: COLORS.text,
    letterSpacing: 2.5,
  },
  moveChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  moveChipText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: COLORS.goldMuted,
    letterSpacing: 1,
  },
  playersSection: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
  },
  playerBadge: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  playerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
  },
  playerRole: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: COLORS.textDim,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  vsWrap: {
    paddingHorizontal: 6,
  },
  vsText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: 'rgba(232,220,200,0.12)',
    letterSpacing: 2,
  },
  turnIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
  },
  turnDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  turnLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  boardOuter: {
    marginHorizontal: BOARD_MARGIN,
    marginBottom: 6,
  },
  boardFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.boardBorder,
  },
  boardGrad: {
    padding: BOARD_PADDING,
    borderRadius: 14,
  },
  boardGrid: {
    position: 'relative' as const,
  },
  boardRow: {
    flexDirection: 'row' as const,
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  cellPressable: {
    flex: 0,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellHole: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    backgroundColor: COLORS.cellEmpty,
    borderWidth: 1,
    borderColor: COLORS.cellBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placedCoin: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  coinGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinShine: {
    width: '65%',
    height: '65%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  coinShadowRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    opacity: 0.25,
  },
  winRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  droppingCoin: {
    position: 'absolute' as const,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardBase: {
    height: 10,
    marginTop: -2,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  boardBaseGrad: {
    flex: 1,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  bottomBar: {
    alignItems: 'center',
    paddingTop: 12,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textDim,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,6,10,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  overlayCard: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(20,20,26,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
  },
  overlayIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: COLORS.text,
    letterSpacing: 2,
    marginBottom: 4,
  },
  overlaySubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.goldMuted,
    marginBottom: 24,
  },
  overlayActions: {
    width: '100%',
    gap: 8,
  },
  rematchBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  rematchGrad: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  rematchText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
  exitBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.06)',
  },
  exitText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.textDim,
    letterSpacing: 1,
  },
});
