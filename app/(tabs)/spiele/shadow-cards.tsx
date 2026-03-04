import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Ghost,
  Shuffle,
  Timer,
  Trophy,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react-native';
import { useShadowCards } from '@/providers/ShadowCardsEngine';
import { useLobbyEngine } from '@/providers/LobbyEngine';
import { useAuth } from '@/providers/AuthProvider';
import type { ShadowCard, CardSuit } from '@/constants/games';
import { SHADOW_CARD_SYMBOL } from '@/constants/games';

const CARD_WIDTH = 52;
const CARD_HEIGHT = 74;

const SUIT_COLORS: Record<CardSuit | 'shadow', string> = {
  swords: '#8B9DC3',
  shields: '#7BA37B',
  crowns: '#C9A94E',
  flames: '#C06050',
  mountains: '#8B7D6B',
  eagles: '#A08860',
  shadow: '#2a1a2e',
};

const SUIT_SYMBOLS: Record<CardSuit | 'shadow', string> = {
  swords: '⚔️',
  shields: '🛡️',
  crowns: '👑',
  flames: '🔥',
  mountains: '⛰️',
  eagles: '🦅',
  shadow: '🌑',
};

function CardFaceUp({ card, size = 'normal' }: { card: ShadowCard; size?: 'normal' | 'small' }) {
  const w = size === 'small' ? 40 : CARD_WIDTH;
  const h = size === 'small' ? 56 : CARD_HEIGHT;
  const bgColor = card.isShadow ? '#1a0e1e' : SUIT_COLORS[card.suit];
  const borderColor = card.isShadow ? '#6B3A7D' : 'rgba(232,220,200,0.15)';

  return (
    <View style={[cardStyles.card, { width: w, height: h, backgroundColor: bgColor, borderColor }]}>
      <Text style={[cardStyles.symbol, size === 'small' && { fontSize: 16 }]}>
        {card.isShadow ? SHADOW_CARD_SYMBOL : SUIT_SYMBOLS[card.suit]}
      </Text>
      {!card.isShadow && (
        <Text style={[cardStyles.value, size === 'small' && { fontSize: 8 }]}>{card.value}</Text>
      )}
      {card.isShadow && (
        <Text style={[cardStyles.shadowLabel, size === 'small' && { fontSize: 6 }]}>SCHATTEN</Text>
      )}
    </View>
  );
}

function CardFaceDown({ count, size = 'normal' }: { count: number; size?: 'normal' | 'small' }) {
  const w = size === 'small' ? 32 : 42;
  const h = size === 'small' ? 44 : 58;

  return (
    <View style={[cardStyles.faceDown, { width: w, height: h }]}>
      <View style={cardStyles.faceDownPattern}>
        <View style={cardStyles.faceDownDiamond} />
      </View>
      {count > 1 && (
        <View style={cardStyles.countBadge}>
          <Text style={cardStyles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  symbol: {
    fontSize: 20,
  },
  value: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  shadowLabel: {
    fontSize: 7,
    fontWeight: '800' as const,
    color: '#6B3A7D',
    letterSpacing: 1,
    marginTop: 2,
  },
  faceDown: {
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    backgroundColor: '#1c1a18',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  faceDownPattern: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceDownDiamond: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  countBadge: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#BFA35D',
  },
});

function OpponentHand({
  playerState,
  displayName,
  isCurrentTurn,
  isDrawTarget,
  position,
  onDrawFrom,
}: {
  playerState: { userId: string; handCount: number; isEliminated: boolean };
  displayName: string;
  isCurrentTurn: boolean;
  isDrawTarget: boolean;
  position: 'left' | 'top' | 'right';
  onDrawFrom: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDrawTarget) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [isDrawTarget]);

  useEffect(() => {
    if (isCurrentTurn) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCurrentTurn]);

  if (playerState.isEliminated) {
    return (
      <View style={[opStyles.container, opStyles[position]]}>
        <View style={opStyles.eliminatedWrap}>
          <Text style={opStyles.eliminatedIcon}>✓</Text>
          <Text style={opStyles.eliminatedName} numberOfLines={1}>{displayName.split(' ')[0]}</Text>
          <Text style={opStyles.eliminatedLabel}>RAUS</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[opStyles.container, opStyles[position], { transform: [{ scale: pulseAnim }] }]}>
      <Pressable
        style={[opStyles.handWrap, isDrawTarget && opStyles.handWrapTarget]}
        onPress={isDrawTarget ? onDrawFrom : undefined}
        disabled={!isDrawTarget}
        testID={`opponent-${position}`}
      >
        {isDrawTarget && (
          <Animated.View style={[opStyles.targetGlow, { opacity: glowAnim }]} />
        )}
        <View style={opStyles.nameRow}>
          <Text style={[opStyles.name, isCurrentTurn && opStyles.nameActive]} numberOfLines={1}>
            {displayName.split(' ')[0]}
          </Text>
          {isCurrentTurn && <View style={opStyles.turnDot} />}
        </View>
        <View style={opStyles.cardsRow}>
          <CardFaceDown count={playerState.handCount} size="small" />
        </View>
        {isDrawTarget && (
          <Text style={opStyles.drawHint}>ZIEHEN</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const opStyles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    zIndex: 10,
  },
  left: {
    left: 8,
    top: '35%' as any,
  },
  top: {
    top: 8,
    alignSelf: 'center' as const,
    left: '50%' as any,
    marginLeft: -50,
  },
  right: {
    right: 8,
    top: '35%' as any,
  },
  handWrap: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(28,28,30,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    minWidth: 80,
  },
  handWrapTarget: {
    borderColor: 'rgba(191,163,93,0.35)',
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  targetGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  nameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  name: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.5)',
    maxWidth: 60,
  },
  nameActive: {
    color: '#BFA35D',
  },
  turnDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#BFA35D',
  },
  cardsRow: {
    flexDirection: 'row' as const,
    gap: -8,
  },
  drawHint: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#BFA35D',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  eliminatedWrap: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(28,28,30,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.04)',
    opacity: 0.5,
  },
  eliminatedIcon: {
    fontSize: 18,
    color: 'rgba(191,163,93,0.3)',
  },
  eliminatedName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.25)',
    marginTop: 2,
  },
  eliminatedLabel: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.15)',
    letterSpacing: 1,
    marginTop: 2,
  },
});

function MyHand({
  cards,
  isMyTurn,
  onShuffle,
}: {
  cards: ShadowCard[];
  isMyTurn: boolean;
  onShuffle: () => void;
}) {


  return (
    <View style={myHandStyles.container}>
      <View style={myHandStyles.header}>
        <Text style={myHandStyles.label}>DEINE HAND ({cards.length})</Text>
        <Pressable
          style={myHandStyles.shuffleBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onShuffle();
          }}
          testID="shuffle-btn"
        >
          <Shuffle size={14} color="#BFA35D" />
          <Text style={myHandStyles.shuffleText}>Mischen</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={myHandStyles.cardsScroll}
      >
        {cards.map((card, i) => {
          const rotation = cards.length > 1
            ? ((i - (cards.length - 1) / 2) / Math.max(cards.length - 1, 1)) * 12
            : 0;
          const yOffset = Math.abs(i - (cards.length - 1) / 2) * 2;

          return (
            <Animated.View
              key={card.id}
              style={[
                myHandStyles.cardWrap,
                {
                  transform: [
                    { rotate: `${rotation}deg` },
                    { translateY: yOffset },
                  ],
                  zIndex: i,
                  marginLeft: i === 0 ? 0 : -8,
                },
              ]}
            >
              <CardFaceUp card={card} />
            </Animated.View>
          );
        })}
      </ScrollView>

      {isMyTurn && (
        <View style={myHandStyles.turnIndicator}>
          <Text style={myHandStyles.turnText}>DU BIST DRAN!</Text>
        </View>
      )}
    </View>
  );
}

const myHandStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
  },
  shuffleBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  shuffleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  cardsScroll: {
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: CARD_HEIGHT + 20,
  },
  cardWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  turnIndicator: {
    alignItems: 'center',
    marginTop: 6,
  },
  turnText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#BFA35D',
    letterSpacing: 2,
  },
});

function GameOverScreen({
  finishOrder,
  loserUserId,
  memberNames,
  amILoser,
  onRematch,
  onLeave,
}: {
  finishOrder: string[];
  loserUserId: string | null;
  memberNames: Record<string, string>;
  amILoser: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(50)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (amILoser) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 3, tension: 150, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(textSlide, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(listOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const accentColor = amILoser ? '#C06060' : '#BFA35D';

  return (
    <Animated.View style={[goStyles.overlay, { opacity: bgAnim }]}>
      <Animated.View style={[goStyles.iconWrap, { transform: [{ scale: iconScale }] }]}>
        <View style={[goStyles.iconInner, { borderColor: amILoser ? 'rgba(192,96,96,0.3)' : 'rgba(191,163,93,0.3)' }]}>
          {amILoser ? (
            <Ghost size={52} color="#C06060" />
          ) : (
            <Trophy size={52} color="#BFA35D" strokeWidth={2.5} />
          )}
        </View>
      </Animated.View>

      <Animated.View style={[goStyles.textWrap, { transform: [{ translateY: textSlide }], opacity: textOpacity }]}>
        <Text style={[goStyles.mainLabel, { color: accentColor }]}>
          {amILoser ? 'DER SCHATTEN' : 'GESCHAFFT!'}
        </Text>
        <Text style={goStyles.subLabel}>
          {amILoser ? 'Du hast den Schatten...' : 'Du bist dem Schatten entkommen!'}
        </Text>
      </Animated.View>

      <Animated.View style={[goStyles.resultList, { opacity: listOpacity }]}>
        {finishOrder.map((uid, i) => {
          const isLoser = uid === loserUserId;
          const place = i + 1;
          return (
            <View key={uid} style={[goStyles.resultRow, isLoser && goStyles.resultRowLoser]}>
              <Text style={[goStyles.resultPlace, isLoser && goStyles.resultPlaceLoser]}>
                {isLoser ? '💀' : place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'}
              </Text>
              <Text style={[goStyles.resultName, isLoser && goStyles.resultNameLoser]} numberOfLines={1}>
                {memberNames[uid] ?? uid.slice(0, 8)}
              </Text>
              {isLoser && <Ghost size={14} color="#C06060" />}
            </View>
          );
        })}
      </Animated.View>

      <Animated.View style={[goStyles.btnRow, { opacity: btnOpacity }]}>
        <Pressable style={goStyles.rematchBtn} onPress={onRematch}>
          <LinearGradient
            colors={['#BFA35D', '#A08A45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={goStyles.rematchBtnGrad}
          >
            <RotateCcw size={16} color="#141416" />
            <Text style={goStyles.rematchBtnText}>REMATCH</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={goStyles.leaveBtn} onPress={onLeave}>
          <ArrowLeft size={16} color="rgba(232,220,200,0.5)" />
          <Text style={goStyles.leaveBtnText}>ZUR LOBBY</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const goStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: '#0a0a0c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrap: {
    marginBottom: 20,
  },
  iconInner: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainLabel: {
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: 4,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.4)',
    marginTop: 6,
  },
  resultList: {
    width: '100%',
    maxWidth: 320,
    gap: 6,
    marginBottom: 28,
  },
  resultRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(42,42,46,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  resultRowLoser: {
    backgroundColor: 'rgba(192,96,96,0.06)',
    borderColor: 'rgba(192,96,96,0.15)',
  },
  resultPlace: {
    fontSize: 20,
    width: 32,
    textAlign: 'center' as const,
  },
  resultPlaceLoser: {},
  resultName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  resultNameLoser: {
    color: '#C06060',
  },
  btnRow: {
    width: '100%',
    maxWidth: 320,
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
    gap: 8,
    paddingVertical: 18,
  },
  rematchBtnText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#141416',
    letterSpacing: 2,
  },
  leaveBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(42,42,46,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.5)',
    letterSpacing: 1,
  },
});

export default function ShadowCardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const {
    gameState,
    isMyTurn,
    isFinished,
    amILoser,
    turnTimeLeft,
    drawCard,
    shuffleMyHand,
    getMyHand,
  } = useShadowCards();

  const { members, rematch, leaveRoom, currentRoom } = useLobbyEngine();

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      map[m.userId] = m.displayName;
    }
    return map;
  }, [members]);

  const myHand = getMyHand();

  const opponents = useMemo(() => {
    if (!gameState) return [];
    return gameState.players.filter(p => p.userId !== userId);
  }, [gameState, userId]);

  const positions: ('left' | 'top' | 'right')[] = ['left', 'top', 'right'];

  const handleDrawFromOpponent = useCallback(() => {
    if (!isMyTurn) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    drawCard();
  }, [isMyTurn, drawCard]);

  const handleRematch = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await rematch();
    router.back();
  }, [rematch, router]);

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    router.navigate('/(tabs)/spiele' as any);
  }, [leaveRoom, router]);

  const timerProgress = useMemo(() => {
    const total = currentRoom?.settings?.turnTimerSeconds ?? 20;
    return Math.max(0, turnTimeLeft / total);
  }, [turnTimeLeft, currentRoom]);

  const timerColor = turnTimeLeft <= 5 ? '#FF4444' : turnTimeLeft <= 10 ? '#E8A040' : '#BFA35D';

  const removedPairsCount = gameState?.removedPairs.length ?? 0;
  const turnNumber = gameState?.turnNumber ?? 0;

  if (!gameState) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ghost size={40} color="rgba(191,163,93,0.3)" />
        <Text style={styles.loadingText}>Spiel wird geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFinished && gameState.finishOrder.length > 0 && (
        <GameOverScreen
          finishOrder={gameState.finishOrder}
          loserUserId={gameState.loserUserId}
          memberNames={memberNames}
          amILoser={amILoser}
          onRematch={handleRematch}
          onLeave={handleLeave}
        />
      )}

      <LinearGradient
        colors={['#141210', '#161414', '#141416']}
        style={[styles.topBar, { paddingTop: insets.top + 4 }]}
      >
        <View style={styles.topBarRow}>
          <View style={styles.turnInfo}>
            <View style={styles.turnBadge}>
              <Text style={styles.turnBadgeText}>ZUG {turnNumber}</Text>
            </View>
            <View style={[styles.timerBar, { backgroundColor: 'rgba(191,163,93,0.08)' }]}>
              <View style={[styles.timerFill, { width: `${timerProgress * 100}%`, backgroundColor: timerColor }]} />
            </View>
            <View style={styles.timerTextWrap}>
              <Timer size={11} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{turnTimeLeft}s</Text>
            </View>
          </View>

          <View style={styles.topRight}>
            <View style={styles.pairsBadge}>
              <Text style={styles.pairsText}>{removedPairsCount} Paare</Text>
            </View>
            <View style={styles.syncDot} />
          </View>
        </View>

        {gameState.currentTurnUserId !== userId && !isFinished && (
          <View style={styles.waitingBanner}>
            <Text style={styles.waitingText}>
              {memberNames[gameState.currentTurnUserId]?.split(' ')[0] ?? 'Gegner'} ist am Zug...
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.gameArea}>
        {opponents.map((opp, i) => (
          <OpponentHand
            key={opp.userId}
            playerState={{ userId: opp.userId, handCount: opp.handCount, isEliminated: opp.isEliminated }}
            displayName={memberNames[opp.userId] ?? 'Spieler'}
            isCurrentTurn={gameState.currentTurnUserId === opp.userId}
            isDrawTarget={isMyTurn && gameState.drawFromUserId === opp.userId}
            position={positions[i % positions.length]}
            onDrawFrom={handleDrawFromOpponent}
          />
        ))}

        <View style={styles.centerArea}>
          {removedPairsCount > 0 && (
            <View style={styles.pileWrap}>
              <View style={styles.pile}>
                {gameState.removedPairs.slice(-3).map((rp, i) => (
                  <View key={i} style={[styles.pileCard, { transform: [{ rotate: `${(i - 1) * 8}deg` }] }]}>
                    <Text style={styles.pileCardSymbol}>
                      {SUIT_SYMBOLS[rp.pair[0].suit]}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.pileLabel}>ABLAGE</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 8 }]}>
        <MyHand
          cards={myHand}
          isMyTurn={isMyTurn}
          onShuffle={shuffleMyHand}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d0b',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.04)',
  },
  topBarRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  turnInfo: {
    flex: 1,
    gap: 4,
  },
  turnBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  turnBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
  },
  timerBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 180,
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerTextWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 3,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'] as any,
  },
  topRight: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  pairsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  pairsText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  waitingBanner: {
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.04)',
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.35)',
  },
  gameArea: {
    flex: 1,
    position: 'relative' as const,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pileWrap: {
    alignItems: 'center',
  },
  pile: {
    flexDirection: 'row' as const,
    gap: -20,
  },
  pileCard: {
    width: 40,
    height: 56,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pileCardSymbol: {
    fontSize: 16,
  },
  pileLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.25)',
    letterSpacing: 2,
    marginTop: 6,
  },
  bottomArea: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.04)',
    backgroundColor: 'rgba(14,13,11,0.95)',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.3)',
    marginTop: 12,
  },
});
