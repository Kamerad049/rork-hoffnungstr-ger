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
  Zap,
} from 'lucide-react-native';
import { useConnectFour, type CellValue } from '@/providers/ConnectFourEngine';
import { useLobbyEngine } from '@/providers/LobbyEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_MARGIN = 12;
const BOARD_PADDING = 10;
const CELL_GAP = 4;
const BOARD_WIDTH = SCREEN_WIDTH - BOARD_MARGIN * 2;
const CELL_SIZE = Math.floor((BOARD_WIDTH - BOARD_PADDING * 2 - CELL_GAP * 6) / 7);
const COIN_SIZE = CELL_SIZE - 6;

const C = {
  bg: '#141416',
  bgDeep: '#0f0f10',
  surface: '#1c1c1e',
  surfaceRaised: '#242428',
  surfaceInset: '#111113',
  gold: '#BFA35D',
  goldLight: '#D4BA74',
  goldDark: '#9A8344',
  goldGlow: 'rgba(191,163,93,0.35)',
  goldSubtle: 'rgba(191,163,93,0.08)',
  goldMuted: 'rgba(191,163,93,0.18)',
  cream: '#E8DCC8',
  creamMuted: 'rgba(232,220,200,0.5)',
  creamDim: 'rgba(232,220,200,0.2)',
  creamFaint: 'rgba(232,220,200,0.08)',
  p1: '#C46B4F',
  p1Light: '#DB8A6E',
  p1Dark: '#8F4A35',
  p1Glow: 'rgba(196,107,79,0.4)',
  p1Surface: 'rgba(196,107,79,0.08)',
  p2: '#BFA35D',
  p2Light: '#D4BA74',
  p2Dark: '#9A8344',
  p2Glow: 'rgba(191,163,93,0.4)',
  p2Surface: 'rgba(191,163,93,0.08)',
  neuLight: '#2a2a2e',
  neuDark: '#0a0a0c',
  neuBorder: 'rgba(255,255,255,0.04)',
  neuHighlight: 'rgba(255,255,255,0.07)',
  neuShadow: 'rgba(0,0,0,0.6)',
  boardFace: '#1a1a1e',
  boardBorder: 'rgba(191,163,93,0.12)',
  cellEmpty: '#111113',
  cellBorder: 'rgba(191,163,93,0.06)',
  winGlow: 'rgba(255,255,255,0.7)',
  winRing: 'rgba(191,163,93,0.8)',
} as const;

function NeuCard({ children, style, active, activeColor }: {
  children: React.ReactNode;
  style?: any;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <View style={[
      styles.neuCard,
      active && {
        shadowColor: activeColor ?? C.gold,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        borderColor: activeColor ? `${activeColor}30` : C.goldMuted,
      },
      style,
    ]}>
      <View style={styles.neuCardInner}>
        {children}
      </View>
    </View>
  );
}

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
  const glowAnim = useRef(new Animated.Value(0)).current;

  const targetY = targetRow * (CELL_SIZE + CELL_GAP);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(dropAnim, {
        toValue: targetY,
        duration: 200 + targetRow * 55,
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
  const isP1 = player === 1;

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
      <View style={[styles.coinNeuOuter, { borderRadius: COIN_SIZE / 2 }]}>
        <LinearGradient
          colors={isP1
            ? [C.p1Light, C.p1, C.p1Dark]
            : [C.p2Light, C.p2, C.p2Dark]
          }
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.coinGradient, { borderRadius: COIN_SIZE / 2 }]}
        >
          <View style={[styles.coinInnerRing, { borderRadius: (COIN_SIZE - 12) / 2 }]} />
          <View style={[styles.coinHighlight, { borderRadius: (COIN_SIZE - 6) / 2 }]} />
        </LinearGradient>
      </View>
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
  const winGlow = useRef(new Animated.Value(0)).current;
  const hasAppeared = useRef(value !== 0);

  useEffect(() => {
    if (value !== 0 && !hasAppeared.current) {
      hasAppeared.current = true;
      scaleAnim.setValue(0.5);
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
    }
  }, [value]);

  useEffect(() => {
    if (isWinning) {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(winPulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
            Animated.timing(winPulse, { toValue: 0.95, duration: 600, useNativeDriver: true }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(winGlow, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(winGlow, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          ]),
        ),
      ]).start();
      return () => {
        winPulse.stopAnimation();
        winGlow.stopAnimation();
      };
    }
  }, [isWinning]);

  const isP1 = value === 1;

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
            <View style={[styles.coinNeuOuter, { borderRadius: COIN_SIZE / 2 }]}>
              <LinearGradient
                colors={isP1
                  ? [C.p1Light, C.p1, C.p1Dark]
                  : [C.p2Light, C.p2, C.p2Dark]
                }
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={[styles.coinGradient, { borderRadius: COIN_SIZE / 2 }]}
              >
                <View style={[styles.coinInnerRing, { borderRadius: (COIN_SIZE - 12) / 2 }]} />
                <View style={[styles.coinHighlight, { borderRadius: (COIN_SIZE - 6) / 2 }]} />
              </LinearGradient>
            </View>
            {isWinning && (
              <Animated.View style={[
                styles.winGlowRing,
                {
                  borderRadius: COIN_SIZE / 2 + 3,
                  borderColor: isP1 ? C.p1Light : C.p2Light,
                  opacity: winGlow,
                  shadowColor: isP1 ? C.p1 : C.p2,
                },
              ]} />
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
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      ).start();
      return () => {
        pulseAnim.stopAnimation();
        glowAnim.stopAnimation();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isActive]);

  const color = playerNumber === 1 ? C.p1 : C.p2;
  const colorLight = playerNumber === 1 ? C.p1Light : C.p2Light;
  const isRight = align === 'right';

  return (
    <Animated.View
      style={[{ transform: [{ scale: isActive ? pulseAnim : 1 as any }] }]}
    >
      <NeuCard
        active={isActive}
        activeColor={color}
        style={[
          styles.playerBadge,
          isRight && { flexDirection: 'row-reverse' as const },
        ]}
      >
        <View style={[
          styles.playerCoinIndicator,
          {
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: isActive ? 0.5 : 0.2,
            shadowRadius: isActive ? 8 : 3,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}>
          {isWinner ? (
            <Crown size={14} color="#fff" strokeWidth={2.5} />
          ) : (
            <View style={styles.playerCoinInner}>
              <View style={[styles.playerCoinShine, { backgroundColor: colorLight }]} />
            </View>
          )}
        </View>
        <View style={isRight ? { alignItems: 'flex-end' as const } : undefined}>
          <Text style={[
            styles.playerName,
            isActive && { color: C.cream },
            isWinner && { color: C.gold },
          ]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[
            styles.playerRole,
            { color: playerNumber === 1 ? C.p1 : C.p2 },
            isActive && { opacity: 0.8 },
          ]}>
            {playerNumber === 1 ? 'KUPFER' : 'GOLD'}
          </Text>
        </View>
      </NeuCard>
    </Animated.View>
  );
}

function GameOverOverlay({
  winnerName,
  isDraw,
  winnerPlayer,
  onRematch,
  onExit,
}: {
  winnerName: string | null;
  isDraw: boolean;
  winnerPlayer: 1 | 2 | null;
  onRematch: () => void;
  onExit: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        isDraw ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
      );
    }
  }, []);

  const accentColor = isDraw ? C.cream : (winnerPlayer === 1 ? C.p1Light : C.goldLight);

  return (
    <Animated.View style={[styles.overlayBg, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.overlayCard, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.overlayCardInner}>
          <Animated.View style={[
            styles.overlayIconWrap,
            {
              transform: [{ scale: iconScale }],
              shadowColor: accentColor,
              shadowOpacity: 0.4,
              shadowRadius: 20,
            },
          ]}>
            <LinearGradient
              colors={isDraw ? [C.surfaceRaised, C.surface] : [C.goldMuted, C.goldSubtle]}
              style={styles.overlayIconGrad}
            >
              {isDraw ? (
                <Minus size={30} color={C.cream} />
              ) : (
                <Trophy size={30} color={C.gold} />
              )}
            </LinearGradient>
          </Animated.View>

          <Text style={styles.overlayTitle}>
            {isDraw ? 'UNENTSCHIEDEN' : 'SIEG!'}
          </Text>
          {!isDraw && winnerName && (
            <Text style={[styles.overlaySubtitle, { color: accentColor }]}>
              {winnerName} gewinnt die Partie
            </Text>
          )}

          <View style={styles.overlayDivider} />

          <View style={styles.overlayActions}>
            <Pressable
              style={({ pressed }) => [styles.rematchBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={onRematch}
              testID="rematch-btn"
            >
              <LinearGradient
                colors={[C.goldLight, C.gold, C.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rematchGrad}
              >
                <RotateCcw size={16} color={C.bgDeep} strokeWidth={2.5} />
                <Text style={styles.rematchText}>REVANCHE</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.7 }]}
              onPress={onExit}
              testID="exit-btn"
            >
              <Text style={styles.exitText}>ZURÜCK ZUR LOBBY</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function ColumnIndicators({ cols, columnHasSpace, isMyTurn, currentPlayer, phase }: {
  cols: number;
  columnHasSpace: boolean[];
  isMyTurn: boolean;
  currentPlayer: 1 | 2;
  phase: string;
}) {
  const color = currentPlayer === 1 ? C.p1 : C.p2;
  if (phase !== 'playing' || !isMyTurn) return null;

  return (
    <View style={styles.columnIndicators}>
      {Array.from({ length: cols }, (_, c) => (
        <View key={c} style={[styles.colDot, { width: CELL_SIZE, opacity: columnHasSpace[c] ? 1 : 0.15 }]}>
          <View style={[styles.colDotInner, { backgroundColor: columnHasSpace[c] ? color : C.creamDim }]} />
        </View>
      ))}
    </View>
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
      Animated.spring(boardScaleAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
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

  const winnerPlayer = useMemo(() => {
    if (!gameState?.winnerUserId) return null;
    if (gameState.winnerUserId === playerMap.player1) return 1 as const;
    return 2 as const;
  }, [gameState?.winnerUserId, playerMap]);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <Zap size={24} color={C.goldMuted} />
          <Text style={styles.loadingText}>Spiel wird geladen...</Text>
        </View>
      </View>
    );
  }

  const currentColor = gameState.currentPlayer === 1 ? C.p1 : C.p2;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[C.bgDeep, C.bg, C.bgDeep]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.ambientGlow} />

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          onPress={handleClose}
          testID="close-game-btn"
        >
          <X size={18} color={C.creamMuted} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <View style={styles.titlePill}>
            <Text style={styles.topBarTitle}>VIER GEWINNT</Text>
          </View>
        </View>

        <View style={styles.moveChip}>
          <Text style={styles.moveChipLabel}>ZUG</Text>
          <Text style={styles.moveChipValue}>{gameState.moveCount + 1}</Text>
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
          <View style={styles.vsDiamond}>
            <Text style={styles.vsText}>VS</Text>
          </View>
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
          <View style={[styles.turnDot, { backgroundColor: currentColor, shadowColor: currentColor }]} />
          <Text style={[styles.turnLabel, { color: currentColor }]}>
            {isMyTurn ? 'DU BIST DRAN' : `${gameState.currentPlayer === 1
              ? (player1Member?.displayName?.split(' ')[0] ?? 'Spieler 1')
              : (player2Member?.displayName?.split(' ')[0] ?? 'Spieler 2')} ist dran`}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <ColumnIndicators
        cols={cols}
        columnHasSpace={columnHasSpace}
        isMyTurn={isMyTurn}
        currentPlayer={gameState.currentPlayer}
        phase={gameState.phase}
      />

      <Animated.View
        style={[
          styles.boardOuter,
          {
            opacity: boardEnterAnim,
            transform: [{ scale: boardScaleAnim }],
          },
        ]}
      >
        <View style={styles.boardShadow}>
          <View style={styles.boardFrame}>
            <View style={styles.boardInnerBevel}>
              <LinearGradient
                colors={[C.surfaceRaised, C.boardFace, C.surfaceInset]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boardGrad}
              >
                <View style={styles.boardEdgeHighlight} />
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
          </View>
        </View>

        <View style={styles.boardBase}>
          <LinearGradient
            colors={[C.surfaceRaised, C.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.boardBaseGrad}
          />
          <View style={styles.boardBaseAccent} />
        </View>
      </Animated.View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {gameState.phase === 'playing' && isMyTurn && (
          <View style={styles.hintWrap}>
            <View style={[styles.hintDot, { backgroundColor: currentColor }]} />
            <Text style={styles.hintText}>Tippe auf eine Spalte</Text>
          </View>
        )}
      </View>

      {isGameOver && (
        <GameOverOverlay
          winnerName={winnerMember?.displayName ?? null}
          isDraw={gameState.phase === 'draw'}
          winnerPlayer={winnerPlayer}
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
    backgroundColor: C.bg,
  },
  ambientGlow: {
    position: 'absolute' as const,
    top: -80,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: C.goldSubtle,
    opacity: 0.5,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.creamDim,
    letterSpacing: 1,
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.neuBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titlePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.goldSubtle,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: C.gold,
    letterSpacing: 3,
  },
  moveChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.neuBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  moveChipLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: C.creamDim,
    letterSpacing: 1.5,
  },
  moveChipValue: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: C.cream,
    marginTop: -1,
  },
  playersSection: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 6,
  },
  neuCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.neuBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  neuCardInner: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: C.neuHighlight,
  },
  playerBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  playerCoinIndicator: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 4,
  },
  playerCoinInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerCoinShine: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '60%',
    height: '60%',
    borderRadius: 9,
    opacity: 0.4,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: C.creamMuted,
  },
  playerRole: {
    fontSize: 9,
    fontWeight: '900' as const,
    letterSpacing: 2,
    marginTop: 2,
    opacity: 0.6,
  },
  vsWrap: {
    paddingHorizontal: 2,
  },
  vsDiamond: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.surfaceInset,
    borderWidth: 1,
    borderColor: C.neuBorder,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  vsText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: C.creamDim,
    letterSpacing: 1,
    transform: [{ rotate: '-45deg' }],
  },
  turnIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  turnLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  columnIndicators: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    paddingHorizontal: BOARD_MARGIN + BOARD_PADDING,
    gap: CELL_GAP,
    marginBottom: 6,
  },
  colDot: {
    alignItems: 'center',
  },
  colDotInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  boardOuter: {
    marginHorizontal: BOARD_MARGIN,
    marginBottom: 8,
  },
  boardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  boardFrame: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.boardBorder,
    backgroundColor: C.boardFace,
  },
  boardInnerBevel: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.neuHighlight,
  },
  boardGrad: {
    padding: BOARD_PADDING,
    borderRadius: 17,
    position: 'relative' as const,
  },
  boardEdgeHighlight: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: C.cellEmpty,
    borderWidth: 1.5,
    borderColor: C.cellBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  placedCoin: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  coinNeuOuter: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  coinGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerRing: {
    width: '55%',
    height: '55%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  coinHighlight: {
    position: 'absolute' as const,
    top: 2,
    left: 2,
    width: '50%',
    height: '35%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  winGlowRing: {
    position: 'absolute' as const,
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
  droppingCoin: {
    position: 'absolute' as const,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardBase: {
    height: 12,
    marginTop: -2,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  boardBaseGrad: {
    flex: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  boardBaseAccent: {
    position: 'absolute' as const,
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: C.goldSubtle,
    borderRadius: 1,
  },
  bottomBar: {
    alignItems: 'center',
    paddingTop: 14,
  },
  hintWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.creamFaint,
  },
  hintDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.creamDim,
    letterSpacing: 0.5,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,12,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  overlayCard: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.goldMuted,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  overlayCardInner: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    borderWidth: 0.5,
    borderColor: C.neuHighlight,
    borderRadius: 23,
  },
  overlayIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.goldMuted,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  overlayIconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitle: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: C.cream,
    letterSpacing: 3,
    marginBottom: 6,
  },
  overlaySubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  overlayDivider: {
    width: 40,
    height: 2,
    backgroundColor: C.goldMuted,
    borderRadius: 1,
    marginVertical: 20,
  },
  overlayActions: {
    width: '100%',
    gap: 10,
  },
  rematchBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  rematchGrad: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  rematchText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: C.bgDeep,
    letterSpacing: 2,
  },
  exitBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: C.creamFaint,
    borderWidth: 1,
    borderColor: C.neuBorder,
  },
  exitText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: C.creamDim,
    letterSpacing: 1.5,
  },
});
