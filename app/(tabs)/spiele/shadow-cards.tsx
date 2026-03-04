import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  PanResponder,
  Dimensions,
  LayoutAnimation,
  UIManager,
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
  Sparkles,
} from 'lucide-react-native';
import { useShadowCards } from '@/providers/ShadowCardsEngine';
import { useLobbyEngine } from '@/providers/LobbyEngine';
import { useAuth } from '@/providers/AuthProvider';
import type { ShadowCard, CardSuit } from '@/constants/games';
import { SHADOW_CARD_SYMBOL } from '@/constants/games';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

const CARD_W = 82;
const CARD_H = 118;
const CARD_SMALL_W = 50;
const CARD_SMALL_H = 72;
const CARD_BACK_W = 52;
const CARD_BACK_H = 76;

const GOLD = '#BFA35D';
const GOLD_DIM = 'rgba(191,163,93,0.4)';
const GOLD_FAINT = 'rgba(191,163,93,0.08)';
const CREAM = '#E8DCC8';
const CREAM_DIM = 'rgba(232,220,200,0.5)';
const CREAM_FAINT = 'rgba(232,220,200,0.15)';
const BG_DARK = '#0c0b09';

const RED_ACCENT = '#C06050';
const GREEN_ACCENT = '#4CAF50';

const SUIT_COLORS: Record<CardSuit | 'shadow', string> = {
  swords: '#7B8FB8',
  shields: '#6B9B6B',
  crowns: '#C9A94E',
  flames: '#C06050',
  mountains: '#8B7D6B',
  eagles: '#A08860',
  shadow: '#3a1a40',
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

function CardBack({ style }: { style?: any }) {
  return (
    <View style={[cardStyles.back, style]}>
      <LinearGradient
        colors={['#1e1c17', '#16140f', '#1a1814']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyles.backGradient}
      />
      <View style={cardStyles.backInner}>
        <View style={cardStyles.backBorderFrame}>
          <View style={cardStyles.backOrnamentOuter}>
            <View style={cardStyles.backOrnamentRing} />
            <View style={cardStyles.backOrnamentInner}>
              <View style={cardStyles.backDiamond} />
            </View>
          </View>
          <View style={cardStyles.backLineTop} />
          <View style={cardStyles.backLineBottom} />
          <View style={cardStyles.backLineLeft} />
          <View style={cardStyles.backLineRight} />
        </View>
        <View style={cardStyles.backCornerTL} />
        <View style={cardStyles.backCornerTR} />
        <View style={cardStyles.backCornerBL} />
        <View style={cardStyles.backCornerBR} />
        <View style={cardStyles.backCornerDotTL} />
        <View style={cardStyles.backCornerDotTR} />
        <View style={cardStyles.backCornerDotBL} />
        <View style={cardStyles.backCornerDotBR} />
      </View>
      <View style={cardStyles.backShineTop} />
      <View style={cardStyles.backEdgeTop} />
      <View style={cardStyles.backEdgeBottom} />
    </View>
  );
}

function CardFace({ card, size = 'normal' }: { card: ShadowCard; size?: 'normal' | 'small' }) {
  const w = size === 'small' ? CARD_SMALL_W : CARD_W;
  const h = size === 'small' ? CARD_SMALL_H : CARD_H;
  const isShadow = card.isShadow;
  const suitColor = isShadow ? '#6B3A7D' : SUIT_COLORS[card.suit];
  const bgBase = isShadow ? '#140a1a' : '#12110e';
  const borderColor = isShadow ? 'rgba(107,58,125,0.5)' : 'rgba(191,163,93,0.2)';
  const symbolSize = size === 'small' ? 24 : 34;
  const valueSize = size === 'small' ? 11 : 15;
  const cornerSize = size === 'small' ? 8 : 10;

  return (
    <View style={[cardStyles.face, { width: w, height: h, borderColor }]}>
      <LinearGradient
        colors={[bgBase, isShadow ? '#1c0f24' : '#1a1814', isShadow ? '#0e0612' : '#14120e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={cardStyles.faceShine} />
      <View style={[cardStyles.faceSuitStripe, { backgroundColor: suitColor }]} />
      <View style={cardStyles.faceInnerBorder} />
      <View style={cardStyles.faceContent}>
        <Text style={[cardStyles.faceSymbol, { fontSize: symbolSize }]}>
          {isShadow ? SHADOW_CARD_SYMBOL : SUIT_SYMBOLS[card.suit]}
        </Text>
        {!isShadow && (
          <Text style={[cardStyles.faceValue, { fontSize: valueSize, color: suitColor }]}>{card.value}</Text>
        )}
        {isShadow && (
          <Text style={[cardStyles.faceShadowLabel, size === 'small' && { fontSize: 7 }]}>SCHATTEN</Text>
        )}
      </View>
      <View style={cardStyles.faceCornerTL}>
        <Text style={[cardStyles.faceCornerSymbol, { fontSize: cornerSize }]}>
          {isShadow ? '✦' : SUIT_SYMBOLS[card.suit]}
        </Text>
        <Text style={[cardStyles.faceCornerText, { fontSize: cornerSize, color: isShadow ? '#8B5AA0' : suitColor }]}>
          {isShadow ? '?' : card.value}
        </Text>
      </View>
      <View style={cardStyles.faceCornerBR}>
        <Text style={[cardStyles.faceCornerSymbol, { fontSize: cornerSize, transform: [{ rotate: '180deg' }] }]}>
          {isShadow ? '✦' : SUIT_SYMBOLS[card.suit]}
        </Text>
        <Text style={[cardStyles.faceCornerText, { fontSize: cornerSize, color: isShadow ? '#8B5AA0' : suitColor, transform: [{ rotate: '180deg' }] }]}>
          {isShadow ? '?' : card.value}
        </Text>
      </View>
      <View style={[cardStyles.faceEdgeAccent, { backgroundColor: suitColor }]} />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  back: {
    width: CARD_BACK_W,
    height: CARD_BACK_H,
    borderRadius: 8,
    backgroundColor: '#1c1a16',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.22)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  backGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 7,
  },
  backInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backBorderFrame: {
    width: '78%',
    height: '78%',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOrnamentOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOrnamentRing: {
    position: 'absolute' as const,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  backOrnamentInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.03)',
  },
  backDiamond: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(191,163,93,0.2)',
    transform: [{ rotate: '45deg' }],
  },
  backLineTop: {
    position: 'absolute' as const,
    top: 0,
    left: '20%' as any,
    right: '20%' as any,
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  backLineBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%' as any,
    right: '20%' as any,
    height: 0.5,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  backLineLeft: {
    position: 'absolute' as const,
    left: 0,
    top: '20%' as any,
    bottom: '20%' as any,
    width: 0.5,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  backLineRight: {
    position: 'absolute' as const,
    right: 0,
    top: '20%' as any,
    bottom: '20%' as any,
    width: 0.5,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  backCornerTL: {
    position: 'absolute' as const,
    top: 3,
    left: 3,
    width: 7,
    height: 7,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  backCornerTR: {
    position: 'absolute' as const,
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderTopWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  backCornerBL: {
    position: 'absolute' as const,
    bottom: 3,
    left: 3,
    width: 7,
    height: 7,
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  backCornerBR: {
    position: 'absolute' as const,
    bottom: 3,
    right: 3,
    width: 7,
    height: 7,
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  backCornerDotTL: {
    position: 'absolute' as const,
    top: 5,
    left: 5,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  backCornerDotTR: {
    position: 'absolute' as const,
    top: 5,
    right: 5,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  backCornerDotBL: {
    position: 'absolute' as const,
    bottom: 5,
    left: 5,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  backCornerDotBR: {
    position: 'absolute' as const,
    bottom: 5,
    right: 5,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  backShineTop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '35%' as any,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  backEdgeTop: {
    position: 'absolute' as const,
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  backEdgeBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  face: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  faceShine: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '45%' as any,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  faceSuitStripe: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.5,
  },
  faceInnerBorder: {
    position: 'absolute' as const,
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  faceContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  faceSymbol: {
    fontSize: 34,
  },
  faceValue: {
    fontSize: 15,
    fontWeight: '900' as const,
    marginTop: 3,
    letterSpacing: 1,
  },
  faceShadowLabel: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#8B5AA0',
    letterSpacing: 2,
    marginTop: 3,
  },
  faceCornerTL: {
    position: 'absolute' as const,
    top: 7,
    left: 7,
    alignItems: 'center',
  },
  faceCornerBR: {
    position: 'absolute' as const,
    bottom: 7,
    right: 7,
    alignItems: 'center',
  },
  faceCornerSymbol: {
    fontSize: 10,
    marginBottom: 1,
  },
  faceCornerText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  faceEdgeAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 10,
    right: 10,
    height: 2,
    opacity: 0.3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

function FannedCardBacks({ count, maxFan, interactive, onTapCard }: { count: number; maxFan?: number; interactive?: boolean; onTapCard?: (index: number) => void }) {
  const displayCount = Math.min(count, maxFan ?? 8);
  const fanAngle = displayCount <= 1 ? 0 : Math.min(displayCount * 5, 36);
  const halfAngle = fanAngle / 2;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const overlap = -18;

  return (
    <View style={fannedStyles.container}>
      {Array.from({ length: displayCount }).map((_, i) => {
        const angle = displayCount <= 1 ? 0 : -halfAngle + (i / (displayCount - 1)) * fanAngle;
        const yOff = Math.abs(angle) * 0.3;
        const isHovered = hoveredIdx === i;
        const liftY = isHovered ? -10 : 0;

        if (interactive && onTapCard) {
          return (
            <Pressable
              key={i}
              onPressIn={() => {
                setHoveredIdx(i);
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }}
              onPressOut={() => setHoveredIdx(null)}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onTapCard(i);
              }}
              style={[
                fannedStyles.cardWrap,
                {
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateY: yOff + liftY },
                    { scale: isHovered ? 1.12 : 1 },
                  ],
                  marginLeft: i === 0 ? 0 : overlap,
                  zIndex: isHovered ? 100 : i,
                },
              ]}
              testID={`opponent-card-${i}`}
            >
              <CardBack style={isHovered ? fannedStyles.cardBackHighlight : undefined} />
              {isHovered && <View style={fannedStyles.cardHoverGlow} />}
            </Pressable>
          );
        }

        return (
          <View
            key={i}
            style={[
              fannedStyles.cardWrap,
              {
                transform: [{ rotate: `${angle}deg` }, { translateY: yOff }],
                marginLeft: i === 0 ? 0 : overlap,
                zIndex: i,
              },
            ]}
          >
            <CardBack />
          </View>
        );
      })}
    </View>
  );
}

const fannedStyles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  cardBackHighlight: {
    borderColor: 'rgba(191,163,93,0.55)',
  },
  cardHoverGlow: {
    position: 'absolute' as const,
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.45)',
    backgroundColor: 'rgba(191,163,93,0.06)',
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
  onDrawFrom: (cardIndex: number) => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDrawTarget) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
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
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
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
          <View style={opStyles.eliminatedCheck}>
            <Text style={opStyles.eliminatedCheckText}>✓</Text>
          </View>
          <Text style={opStyles.eliminatedName} numberOfLines={1}>{displayName.split(' ')[0]}</Text>
          <Text style={opStyles.eliminatedLabel}>RAUS</Text>
        </View>
      </View>
    );
  }

  const rotationForPosition = position === 'left' ? '90deg' : position === 'right' ? '-90deg' : '180deg';

  return (
    <Animated.View style={[opStyles.container, opStyles[position], { transform: [{ scale: pulseAnim }] }]}>
      <View
        style={[opStyles.handWrap, isDrawTarget && opStyles.handWrapTarget]}
        testID={`opponent-${position}`}
      >
        {isDrawTarget && (
          <Animated.View style={[opStyles.targetGlow, { opacity: glowAnim }]} />
        )}

        <View style={opStyles.nameRow}>
          {isCurrentTurn && <View style={opStyles.turnDot} />}
          <Text style={[opStyles.name, isCurrentTurn && opStyles.nameActive]} numberOfLines={1}>
            {displayName.split(' ')[0]}
          </Text>
          <View style={opStyles.countBadge}>
            <Text style={opStyles.countText}>{playerState.handCount}</Text>
          </View>
        </View>

        <Animated.View style={[
          { transform: [{ rotate: rotationForPosition }, { scale: scaleAnim }] },
        ]}>
          <FannedCardBacks
            count={playerState.handCount}
            maxFan={7}
            interactive={isDrawTarget}
            onTapCard={isDrawTarget ? (cardIndex) => onDrawFrom(cardIndex) : undefined}
          />
        </Animated.View>

        {isDrawTarget && (
          <View style={opStyles.drawHintWrap}>
            <Sparkles size={10} color={GOLD} />
            <Text style={opStyles.drawHint}>WÄHLE EINE KARTE</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const opStyles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    zIndex: 10,
  },
  left: {
    left: 4,
    top: '25%' as any,
  },
  top: {
    top: 4,
    alignSelf: 'center' as const,
    left: '50%' as any,
    marginLeft: -80,
  },
  right: {
    right: 4,
    top: '25%' as any,
  },
  handWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(26,25,22,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    minWidth: 100,
  },
  handWrapTarget: {
    borderColor: 'rgba(191,163,93,0.3)',
    backgroundColor: 'rgba(191,163,93,0.04)',
  },
  targetGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  nameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  name: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: CREAM_DIM,
    maxWidth: 70,
  },
  nameActive: {
    color: GOLD,
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: GOLD,
  },
  drawHintWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  drawHint: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: GOLD,
    letterSpacing: 1.5,
  },
  eliminatedWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(26,25,22,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.04)',
    opacity: 0.45,
  },
  eliminatedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eliminatedCheckText: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.3)',
  },
  eliminatedName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.2)',
  },
  eliminatedLabel: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: CREAM_FAINT,
    letterSpacing: 1,
    marginTop: 2,
  },
});

function DraggableCard({
  card,
  index,
  totalCards,
  onReorder,
}: {
  card: ShadowCard;
  index: number;
  totalCards: number;
  onReorder: (from: number, to: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleVal = useRef(new Animated.Value(1)).current;
  const zIndexVal = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startIndexRef = useRef<number>(index);

  useEffect(() => {
    startIndexRef.current = index;
  }, [index]);

  const cardSpacing = Math.min(CARD_W - 14, (SCREEN_W - 60) / Math.max(totalCards, 1));

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5,
    onPanResponderGrant: () => {
      setIsDragging(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.spring(scaleVal, { toValue: 1.15, friction: 6, useNativeDriver: true }),
        Animated.timing(zIndexVal, { toValue: 100, duration: 0, useNativeDriver: true }),
      ]).start();
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gs) => {
      setIsDragging(false);
      const movedSlots = Math.round(gs.dx / cardSpacing);
      const targetIndex = Math.max(0, Math.min(totalCards - 1, startIndexRef.current + movedSlots));

      if (targetIndex !== startIndexRef.current) {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onReorder(startIndexRef.current, targetIndex);
      }

      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }),
        Animated.spring(scaleVal, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(zIndexVal, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    },
    onPanResponderTerminate: () => {
      setIsDragging(false);
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }),
        Animated.spring(scaleVal, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(zIndexVal, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    },
  }), [totalCards, cardSpacing]);

  const rotation = totalCards > 1
    ? ((index - (totalCards - 1) / 2) / Math.max(totalCards - 1, 1)) * 16
    : 0;
  const yOffset = Math.abs(index - (totalCards - 1) / 2) * 3.5;
  const spacing = Math.min(-12, -(CARD_W - cardSpacing));

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        myCardStyles.cardWrap,
        {
          transform: [
            { translateX: pan.x },
            { translateY: Animated.add(pan.y, new Animated.Value(yOffset)) },
            { rotate: `${rotation}deg` },
            { scale: scaleVal },
          ],
          zIndex: isDragging ? 200 : index,
          marginLeft: index === 0 ? 0 : spacing,
        },
      ]}
    >
      {isDragging && <View style={myCardStyles.dragShadow} />}
      <CardFace card={card} />
    </Animated.View>
  );
}

const myCardStyles = StyleSheet.create({
  cardWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  dragShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.12)',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    transform: [{ scale: 1.08 }],
  },
});

function MyHand({
  cards,
  isMyTurn,
  onShuffle,
  onReorder,
}: {
  cards: ShadowCard[];
  isMyTurn: boolean;
  onShuffle: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const turnGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMyTurn) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(turnGlowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(turnGlowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      turnGlowAnim.setValue(0);
    }
  }, [isMyTurn]);

  return (
    <View style={handStyles.container}>
      <View style={handStyles.header}>
        <View style={handStyles.headerLeft}>
          <Text style={handStyles.label}>DEINE HAND</Text>
          <View style={handStyles.cardCountBadge}>
            <Text style={handStyles.cardCountText}>{cards.length}</Text>
          </View>
        </View>
        <Pressable
          style={handStyles.shuffleBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onShuffle();
          }}
          testID="shuffle-btn"
        >
          <Shuffle size={13} color={GOLD_DIM} />
          <Text style={handStyles.shuffleText}>Mischen</Text>
        </Pressable>
      </View>

      <View style={handStyles.fanContainer}>
        <View style={handStyles.fan}>
          {cards.map((card, i) => (
            <DraggableCard
              key={card.id}
              card={card}
              index={i}
              totalCards={cards.length}
              onReorder={onReorder}
            />
          ))}
        </View>
        <Text style={handStyles.dragHint}>Halte & ziehe um Karten zu verschieben</Text>
      </View>

      {isMyTurn && (
        <Animated.View style={[handStyles.turnIndicator, { opacity: turnGlowAnim }]}>
          <LinearGradient
            colors={['rgba(191,163,93,0.15)', 'rgba(191,163,93,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={handStyles.turnGradient}
          >
            <Sparkles size={13} color={GOLD} />
            <Text style={handStyles.turnText}>DU BIST DRAN!</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const handStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: GOLD_DIM,
    letterSpacing: 1.5,
  },
  cardCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GOLD_FAINT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cardCountText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: GOLD,
  },
  shuffleBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: GOLD_FAINT,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  shuffleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: GOLD_DIM,
  },
  fanContainer: {
    alignItems: 'center',
    minHeight: CARD_H + 36,
    paddingVertical: 10,
  },
  fan: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dragHint: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: 'rgba(232,220,200,0.2)',
    marginTop: 8,
  },
  turnIndicator: {
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  turnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  turnText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: GOLD,
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

  const accentColor = amILoser ? RED_ACCENT : GOLD;

  return (
    <Animated.View style={[goStyles.overlay, { opacity: bgAnim }]}>
      <Animated.View style={[goStyles.iconWrap, { transform: [{ scale: iconScale }] }]}>
        <LinearGradient
          colors={amILoser ? ['rgba(192,96,80,0.12)', 'rgba(192,96,80,0.03)'] : ['rgba(191,163,93,0.12)', 'rgba(191,163,93,0.03)']}
          style={goStyles.iconGradient}
        >
          {amILoser ? (
            <Ghost size={56} color={RED_ACCENT} />
          ) : (
            <Trophy size={56} color={GOLD} strokeWidth={2.5} />
          )}
        </LinearGradient>
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
              <Text style={goStyles.resultPlace}>
                {isLoser ? '💀' : place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'}
              </Text>
              <Text style={[goStyles.resultName, isLoser && goStyles.resultNameLoser]} numberOfLines={1}>
                {memberNames[uid] ?? uid.slice(0, 8)}
              </Text>
              {isLoser && <Ghost size={14} color={RED_ACCENT} />}
            </View>
          );
        })}
      </Animated.View>

      <Animated.View style={[goStyles.btnRow, { opacity: btnOpacity }]}>
        <Pressable style={goStyles.rematchBtn} onPress={onRematch}>
          <LinearGradient
            colors={[GOLD, '#A08A45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={goStyles.rematchBtnGrad}
          >
            <RotateCcw size={16} color={BG_DARK} />
            <Text style={goStyles.rematchBtnText}>REMATCH</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={goStyles.leaveBtn} onPress={onLeave}>
          <ArrowLeft size={16} color={CREAM_DIM} />
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
    backgroundColor: 'rgba(10,10,12,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrap: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mainLabel: {
    fontSize: 38,
    fontWeight: '900' as const,
    letterSpacing: 4,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: CREAM_DIM,
    marginTop: 6,
  },
  resultList: {
    width: '100%',
    maxWidth: 320,
    gap: 8,
    marginBottom: 32,
  },
  resultRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(42,42,46,0.4)',
    borderWidth: 1,
    borderColor: GOLD_FAINT,
  },
  resultRowLoser: {
    backgroundColor: 'rgba(192,96,80,0.06)',
    borderColor: 'rgba(192,96,80,0.15)',
  },
  resultPlace: {
    fontSize: 22,
    width: 36,
    textAlign: 'center' as const,
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700' as const,
    color: CREAM,
  },
  resultNameLoser: {
    color: RED_ACCENT,
  },
  btnRow: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  rematchBtn: {
    borderRadius: 20,
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
    color: BG_DARK,
    letterSpacing: 2,
  },
  leaveBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(42,42,46,0.4)',
    borderWidth: 1,
    borderColor: GOLD_FAINT,
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: CREAM_DIM,
    letterSpacing: 1,
  },
});

function BackgroundPattern() {
  return (
    <View style={bgStyles.container} pointerEvents="none">
      <LinearGradient
        colors={['rgba(191,163,93,0.03)', 'transparent', 'rgba(191,163,93,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {[...Array(6)].map((_, i) => (
        <View
          key={`h${i}`}
          style={[bgStyles.gridLine, { top: `${15 + i * 14}%` as any }]}
        />
      ))}
      {[...Array(4)].map((_, i) => (
        <View
          key={`v${i}`}
          style={[bgStyles.gridLineV, { left: `${20 + i * 20}%` as any }]}
        />
      ))}
      <View style={bgStyles.cornerOrnamentTL}>
        <View style={bgStyles.cornerLine} />
        <View style={[bgStyles.cornerLine, { transform: [{ rotate: '90deg' }] }]} />
      </View>
      <View style={bgStyles.cornerOrnamentBR}>
        <View style={bgStyles.cornerLine} />
        <View style={[bgStyles.cornerLine, { transform: [{ rotate: '90deg' }] }]} />
      </View>
    </View>
  );
}

const bgStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.02)',
  },
  gridLineV: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(191,163,93,0.02)',
  },
  cornerOrnamentTL: {
    position: 'absolute' as const,
    top: 60,
    left: 16,
    opacity: 0.1,
  },
  cornerOrnamentBR: {
    position: 'absolute' as const,
    bottom: 120,
    right: 16,
    opacity: 0.1,
  },
  cornerLine: {
    width: 20,
    height: 1,
    backgroundColor: GOLD,
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
    reorderMyHand,
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

  const handleDrawFromOpponent = useCallback((cardIndex: number) => {
    if (!isMyTurn) return;
    console.log('[SHADOW-UI] Player chose card at index:', cardIndex);
    drawCard(cardIndex);
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

  const handleReorder = useCallback((from: number, to: number) => {
    reorderMyHand(from, to);
  }, [reorderMyHand]);

  const timerProgress = useMemo(() => {
    const total = currentRoom?.settings?.turnTimerSeconds ?? 20;
    return Math.max(0, turnTimeLeft / total);
  }, [turnTimeLeft, currentRoom]);

  const timerColor = turnTimeLeft <= 5 ? '#FF4444' : turnTimeLeft <= 10 ? '#E8A040' : GOLD;
  const removedPairsCount = gameState?.removedPairs.length ?? 0;
  const turnNumber = gameState?.turnNumber ?? 0;

  if (!gameState) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <BackgroundPattern />
        <Ghost size={44} color="rgba(191,163,93,0.25)" />
        <Text style={styles.loadingText}>Spiel wird geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundPattern />

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
        colors={[BG_DARK, 'rgba(12,11,9,0.95)', 'transparent']}
        style={[styles.topBar, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.topBarRow}>
          <View style={styles.turnInfo}>
            <View style={styles.turnBadgeRow}>
              <View style={styles.turnBadge}>
                <Text style={styles.turnBadgeText}>ZUG {turnNumber}</Text>
              </View>
              <View style={styles.pairsBadge}>
                <Text style={styles.pairsEmoji}>♠</Text>
                <Text style={styles.pairsText}>{removedPairsCount} Paare</Text>
              </View>
            </View>
            <View style={styles.timerRow}>
              <View style={[styles.timerBar]}>
                <View style={[styles.timerFill, { width: `${timerProgress * 100}%`, backgroundColor: timerColor }]} />
              </View>
              <View style={styles.timerTextWrap}>
                <Timer size={11} color={timerColor} />
                <Text style={[styles.timerText, { color: timerColor }]}>{turnTimeLeft}s</Text>
              </View>
            </View>
          </View>

          <View style={styles.syncIndicator}>
            <View style={[styles.syncDot, { backgroundColor: GREEN_ACCENT }]} />
            <Text style={styles.syncText}>LIVE</Text>
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
          {removedPairsCount > 0 ? (
            <View style={styles.pileWrap}>
              <View style={styles.pileGlow} />
              <View style={styles.pile}>
                {gameState.removedPairs.slice(-4).map((rp, i) => (
                  <View key={i} style={[styles.pileCard, { transform: [{ rotate: `${(i - 1.5) * 10}deg` }] }]}>
                    <Text style={styles.pileCardSymbol}>
                      {SUIT_SYMBOLS[rp.pair[0].suit]}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.pileLabel}>ABLAGE</Text>
            </View>
          ) : (
            <View style={styles.centerEmpty}>
              <View style={styles.centerRing} />
              <Text style={styles.centerEmptyText}>ABLAGE</Text>
            </View>
          )}
        </View>
      </View>

      <LinearGradient
        colors={['transparent', BG_DARK, BG_DARK]}
        style={[styles.bottomArea, { paddingBottom: insets.bottom + 10 }]}
      >
        <View style={styles.bottomDivider} />
        <MyHand
          cards={myHand}
          isMyTurn={isMyTurn}
          onShuffle={shuffleMyHand}
          onReorder={handleReorder}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 20,
  },
  topBarRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  turnInfo: {
    flex: 1,
    gap: 6,
  },
  turnBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  turnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: GOLD_FAINT,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  turnBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: GOLD_DIM,
    letterSpacing: 1.5,
  },
  pairsBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: GOLD_FAINT,
  },
  pairsEmoji: {
    fontSize: 11,
    color: GOLD_DIM,
  },
  pairsText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: GOLD_DIM,
  },
  timerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  timerBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: GOLD_FAINT,
    maxWidth: 200,
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
    fontSize: 12,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'] as any,
  },
  syncIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(76,175,80,0.08)',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(76,175,80,0.6)',
    letterSpacing: 1,
  },
  waitingBanner: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: GOLD_FAINT,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
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
  centerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    borderStyle: 'dashed' as const,
    marginBottom: 8,
  },
  centerEmptyText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.15)',
    letterSpacing: 2,
  },
  pileWrap: {
    alignItems: 'center',
  },
  pileGlow: {
    position: 'absolute' as const,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(191,163,93,0.04)',
    top: -10,
  },
  pile: {
    flexDirection: 'row' as const,
    gap: -22,
  },
  pileCard: {
    width: 44,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pileCardSymbol: {
    fontSize: 18,
  },
  pileLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.2)',
    letterSpacing: 2,
    marginTop: 8,
  },
  bottomArea: {
    paddingTop: 4,
    zIndex: 20,
  },
  bottomDivider: {
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.04)',
    marginBottom: 8,
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.3)',
    marginTop: 14,
  },
});
