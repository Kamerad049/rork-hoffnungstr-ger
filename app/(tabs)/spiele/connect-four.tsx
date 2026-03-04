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
  CircleDot,
} from 'lucide-react-native';
import { useConnectFour, type CellValue } from '@/providers/ConnectFourEngine';
import { useLobbyEngine } from '@/providers/LobbyEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_PADDING = 12;
const BOARD_MARGIN = 16;
const CELL_GAP = 4;
const BOARD_WIDTH = SCREEN_WIDTH - BOARD_MARGIN * 2;
const CELL_SIZE = Math.floor((BOARD_WIDTH - BOARD_PADDING * 2 - CELL_GAP * 6) / 7);
const COIN_SIZE = CELL_SIZE - 6;

const PLAYER_COLORS = {
  1: '#E8443A',
  2: '#F5C842',
} as const;

const PLAYER_GLOW = {
  1: 'rgba(232,68,58,0.35)',
  2: 'rgba(245,200,66,0.35)',
} as const;

const PLAYER_LABELS = {
  1: 'Rot',
  2: 'Gold',
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
  const dropAnim = useRef(new Animated.Value(-CELL_SIZE - 20)).current;
  const bounceScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const targetY = targetRow * (CELL_SIZE + CELL_GAP);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(dropAnim, {
        toValue: targetY,
        duration: 250 + targetRow * 60,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bounceScale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
          Animated.spring(bounceScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
        ]),
        Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onComplete();
    });
  }, []);

  const left = col * (CELL_SIZE + CELL_GAP) + 3;

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
      <Animated.View
        style={[
          styles.coinGlow,
          {
            backgroundColor: PLAYER_GLOW[player],
            opacity: glowAnim,
            borderRadius: COIN_SIZE / 2 + 4,
          },
        ]}
      />
      <LinearGradient
        colors={
          player === 1
            ? ['#FF6B5E', '#E8443A', '#C43530']
            : ['#FFE066', '#F5C842', '#D4A832']
        }
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 0.9 }}
        style={[styles.coinGradient, { borderRadius: COIN_SIZE / 2 }]}
      >
        <View style={[styles.coinInnerHighlight, { borderRadius: (COIN_SIZE - 12) / 2 }]} />
      </LinearGradient>
    </Animated.View>
  );
}

const BoardCell = React.memo(function BoardCell({
  value,
  row,
  col,
  isWinning,
  isLastMove,
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
      scaleAnim.setValue(0.5);
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
  }, [value]);

  useEffect(() => {
    if (isWinning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(winPulse, { toValue: 1.12, duration: 400, useNativeDriver: true }),
          Animated.timing(winPulse, { toValue: 0.95, duration: 400, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isWinning]);

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
              colors={
                value === 1
                  ? ['#FF6B5E', '#E8443A', '#C43530']
                  : ['#FFE066', '#F5C842', '#D4A832']
              }
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.8, y: 0.9 }}
              style={[styles.coinGradient, { borderRadius: COIN_SIZE / 2 }]}
            >
              <View style={[styles.coinInnerHighlight, { borderRadius: (COIN_SIZE - 12) / 2 }]} />
            </LinearGradient>
            {isWinning && (
              <View style={[styles.winRing, { borderRadius: COIN_SIZE / 2 + 2 }]} />
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
});

function ColumnSelector({
  col,
  isMyTurn,
  currentPlayer,
  onPress,
  hasSpace,
}: {
  col: number;
  isMyTurn: boolean;
  currentPlayer: 1 | 2;
  onPress: (col: number) => void;
  hasSpace: boolean;
}) {
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!isMyTurn || !hasSpace) return;
    Animated.parallel([
      Animated.timing(hoverAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(pressScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [isMyTurn, hasSpace]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(hoverAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = useCallback(() => {
    if (!isMyTurn || !hasSpace) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(col);
  }, [col, isMyTurn, hasSpace, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.colSelector, { width: CELL_SIZE + CELL_GAP }]}
      testID={`col-selector-${col}`}
    >
      <Animated.View
        style={[
          styles.colHoverIndicator,
          {
            opacity: hoverAnim,
            backgroundColor: isMyTurn ? PLAYER_GLOW[currentPlayer] : 'transparent',
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        <View
          style={[
            styles.hoverCoinPreview,
            {
              width: COIN_SIZE * 0.5,
              height: COIN_SIZE * 0.5,
              borderRadius: COIN_SIZE * 0.25,
              backgroundColor: isMyTurn ? PLAYER_COLORS[currentPlayer] : 'transparent',
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function PlayerIndicator({
  playerNumber,
  displayName,
  isActive,
  isWinner,
  side,
}: {
  playerNumber: 1 | 2;
  displayName: string;
  isActive: boolean;
  isWinner: boolean;
  side: 'left' | 'right';
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [isActive]);

  const color = PLAYER_COLORS[playerNumber];

  return (
    <Animated.View
      style={[
        styles.playerIndicator,
        side === 'right' && styles.playerIndicatorRight,
        { transform: [{ scale: isActive ? pulseAnim : new Animated.Value(1) }] },
      ]}
    >
      <Animated.View
        style={[
          styles.playerDot,
          {
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: isActive ? 0.8 : 0.2,
            shadowRadius: isActive ? 12 : 4,
            elevation: isActive ? 8 : 2,
          },
        ]}
      >
        {isWinner && <Crown size={14} color="#141416" strokeWidth={3} />}
      </Animated.View>
      <View style={side === 'right' ? styles.playerInfoRight : undefined}>
        <Text style={[styles.playerName, isActive && { color }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.playerLabel, isActive && { color, opacity: 0.7 }]}>
          {PLAYER_LABELS[playerNumber]}
        </Text>
      </View>
      {isActive && !isWinner && (
        <Animated.View style={[styles.turnArrow, { opacity: glowAnim }]}>
          <CircleDot size={14} color={color} />
        </Animated.View>
      )}
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
  const slideAnim = useRef(new Animated.Value(40)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(trophyScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        isDraw ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
      );
    }
  }, []);

  return (
    <Animated.View style={[styles.gameOverOverlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.gameOverCard, { transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.gameOverIcon, { transform: [{ scale: trophyScale }] }]}>
          {isDraw ? (
            <Minus size={36} color="#BFA35D" />
          ) : (
            <Trophy size={36} color="#BFA35D" />
          )}
        </Animated.View>

        <Text style={styles.gameOverTitle}>
          {isDraw ? 'UNENTSCHIEDEN' : 'GEWONNEN!'}
        </Text>
        {!isDraw && winnerName && (
          <Text style={styles.gameOverSubtitle}>{winnerName} hat gewonnen</Text>
        )}

        <View style={styles.gameOverActions}>
          <Pressable style={styles.rematchBtn} onPress={onRematch} testID="rematch-btn">
            <LinearGradient
              colors={['#BFA35D', '#A08A45']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rematchBtnGrad}
            >
              <RotateCcw size={18} color="#141416" />
              <Text style={styles.rematchBtnText}>REMATCH</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.exitBtn} onPress={onExit} testID="exit-btn">
            <Text style={styles.exitBtnText}>ZUR LOBBY</Text>
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
  const boardScaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(boardEnterAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(boardScaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleColumnPress = useCallback((col: number) => {
    if (!isMyTurn) return;
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Lade Spiel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0D10', '#111118', '#0D0D10']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.bgPattern}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.bgLine,
              {
                top: 60 + i * 90,
                opacity: 0.015 + (i % 3) * 0.005,
                transform: [{ rotate: `${-8 + i * 3}deg` }],
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={handleClose} testID="close-game-btn">
          <X size={20} color="rgba(232,220,200,0.6)" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>VIER GEWINNT</Text>
          <View style={styles.moveCounter}>
            <Text style={styles.moveCounterText}>Zug {gameState.moveCount + 1}</Text>
          </View>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <View style={styles.playersRow}>
        <PlayerIndicator
          playerNumber={1}
          displayName={player1Member?.displayName?.split(' ')[0] ?? 'Spieler 1'}
          isActive={gameState.currentPlayer === 1 && gameState.phase === 'playing'}
          isWinner={gameState.winnerUserId === playerMap.player1}
          side="left"
        />
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <PlayerIndicator
          playerNumber={2}
          displayName={player2Member?.displayName?.split(' ')[0] ?? 'Spieler 2'}
          isActive={gameState.currentPlayer === 2 && gameState.phase === 'playing'}
          isWinner={gameState.winnerUserId === playerMap.player2}
          side="right"
        />
      </View>

      {gameState.phase === 'playing' && (
        <View style={styles.turnBanner}>
          <View
            style={[
              styles.turnDot,
              { backgroundColor: PLAYER_COLORS[gameState.currentPlayer] },
            ]}
          />
          <Text style={[styles.turnText, { color: PLAYER_COLORS[gameState.currentPlayer] }]}>
            {isMyTurn
              ? 'DU BIST DRAN'
              : `${gameState.currentPlayer === 1 ? player1Member?.displayName?.split(' ')[0] : player2Member?.displayName?.split(' ')[0]} ist dran`}
          </Text>
        </View>
      )}

      <View style={styles.colSelectorsRow}>
        {Array.from({ length: cols }, (_, c) => (
          <ColumnSelector
            key={c}
            col={c}
            isMyTurn={isMyTurn}
            currentPlayer={gameState.currentPlayer}
            onPress={handleColumnPress}
            hasSpace={columnHasSpace[c]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.boardContainer,
          {
            opacity: boardEnterAnim,
            transform: [{ scale: boardScaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#1A2040', '#162050', '#1A2040']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.boardGradient}
        >
          <View style={styles.boardEdgeTop} />

          <View style={styles.boardInner}>
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
                  <BoardCell
                    key={`${r}-${c}`}
                    value={gameState.board[r][c]}
                    row={r}
                    col={c}
                    isWinning={winningCellSet.has(`${r}-${c}`)}
                    isLastMove={gameState.lastMove?.row === r && gameState.lastMove?.col === c}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.boardEdgeBottom} />
        </LinearGradient>

        <View style={styles.boardShadow} />
      </Animated.View>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 12 }]}>
        {gameState.phase === 'playing' && isMyTurn && (
          <Text style={styles.hintText}>Tippe auf eine Spalte um deinen Stein zu werfen</Text>
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
    backgroundColor: '#0D0D10',
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  bgLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 3,
  },
  moveCounter: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  moveCounterText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  playersRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  playerIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  playerIndicatorRight: {
    flexDirection: 'row-reverse' as const,
    justifyContent: 'flex-start',
  },
  playerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfoRight: {
    alignItems: 'flex-end' as const,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.7)',
  },
  playerLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.3)',
    letterSpacing: 1,
    marginTop: 1,
  },
  turnArrow: {
    marginLeft: 4,
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: 'rgba(232,220,200,0.15)',
    letterSpacing: 2,
  },
  turnBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  colSelectorsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    paddingHorizontal: BOARD_MARGIN + BOARD_PADDING - CELL_GAP / 2,
    height: 36,
    alignItems: 'flex-end',
  },
  colSelector: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  colHoverIndicator: {
    width: COIN_SIZE * 0.6,
    height: COIN_SIZE * 0.6,
    borderRadius: COIN_SIZE * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoverCoinPreview: {
    opacity: 0.9,
  },
  boardContainer: {
    marginHorizontal: BOARD_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  boardGradient: {
    borderRadius: 20,
    padding: BOARD_PADDING,
    borderWidth: 2,
    borderColor: 'rgba(26,32,64,0.8)',
  },
  boardEdgeTop: {
    height: 3,
    backgroundColor: 'rgba(100,120,200,0.15)',
    borderRadius: 2,
    marginBottom: 6,
    marginHorizontal: 4,
  },
  boardEdgeBottom: {
    height: 3,
    backgroundColor: 'rgba(100,120,200,0.1)',
    borderRadius: 2,
    marginTop: 6,
    marginHorizontal: 4,
  },
  boardInner: {
    position: 'relative' as const,
  },
  boardRow: {
    flexDirection: 'row' as const,
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  boardShadow: {
    position: 'absolute' as const,
    bottom: -8,
    left: 10,
    right: 10,
    height: 16,
    backgroundColor: 'rgba(10,10,20,0.4)',
    borderRadius: 20,
    zIndex: -1,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellHole: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    backgroundColor: 'rgba(8,8,16,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(60,80,140,0.2)',
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
  coinInnerHighlight: {
    width: '70%',
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  winRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  droppingCoin: {
    position: 'absolute' as const,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.25)',
    textAlign: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,8,12,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  gameOverCard: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 36,
    borderRadius: 28,
    backgroundColor: 'rgba(26,26,32,0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.15)',
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
  },
  gameOverIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gameOverTitle: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 3,
    marginBottom: 6,
  },
  gameOverSubtitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.6)',
    marginBottom: 28,
  },
  gameOverActions: {
    width: '100%',
    gap: 10,
  },
  rematchBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  rematchBtnGrad: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  rematchBtnText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#141416',
    letterSpacing: 2,
  },
  exitBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.08)',
  },
  exitBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
    letterSpacing: 1,
  },
});
