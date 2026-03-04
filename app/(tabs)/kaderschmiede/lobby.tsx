import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Swords,
  Users,
  Zap,
  Flag,
  Play,
  X,
  Crown,
  Shield,
  Timer,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Flame,
  Trophy,
  Eye,
  EyeOff,
  Radio,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type {
  RacerPosition,
  SpectatorInfo,
  CheerMessage,
} from '@/constants/kaderschmiede';
import {
  CHEER_TYPES,
  RACE_GPS_INTERVAL_MS,
  CHEER_DISPLAY_DURATION_MS,
} from '@/constants/kaderschmiede';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LobbyPhase = 'setup' | 'waiting' | 'countdown' | 'go' | 'racing' | 'surrendered' | 'victory_by_surrender' | 'race_won' | 'race_lost' | 'finished';
type SpectatorRole = 'racer' | 'spectator';
type ChallengeMode = '1v1' | 'team';
type DistanceOption = 1000 | 2000 | 5000;

interface LobbyPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  isReady: boolean;
  isHost: boolean;
  joinedAt: number;
}

const DISTANCE_OPTIONS: { value: DistanceOption; label: string; sublabel: string }[] = [
  { value: 1000, label: '1K', sublabel: '1.000m' },
  { value: 2000, label: '2K', sublabel: '2.000m' },
  { value: 5000, label: '5K', sublabel: '5.000m' },
];

function RoutePreview({ distance, isActive }: { distance: DistanceOption; isActive: boolean }) {
  const dotAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pathOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pathOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ]),
    );
    dotLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ]),
    );
    glowLoop.start();

    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.delay(500),
          Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    }

    return () => {
      dotLoop.stop();
      glowLoop.stop();
    };
  }, [isActive]);

  const pathWidth = SCREEN_WIDTH - 80;
  const pathPoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * pathWidth;
      const y = 40 + Math.sin(t * Math.PI * 3) * 18 + Math.cos(t * Math.PI * 1.5) * 12;
      points.push({ x, y });
    }
    return points;
  }, [pathWidth]);

  const dotTranslateX = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pathWidth],
  });

  const scanTranslateX = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, pathWidth + 20],
  });

  return (
    <Animated.View style={[styles.routeContainer, { opacity: pathOpacity }]}>
      <View style={styles.routeHeader}>
        <View style={styles.routeDistanceBadge}>
          <Zap size={12} color="#BFA35D" />
          <Text style={styles.routeDistanceText}>{(distance / 1000).toFixed(0)} KM STRECKE</Text>
        </View>
      </View>

      <View style={styles.routePathArea}>
        <View style={styles.routeStartMarker}>
          <View style={styles.startPinOuter}>
            <View style={styles.startPinInner}>
              <Play size={8} color="#141416" />
            </View>
          </View>
          <Text style={styles.routeMarkerLabel}>START</Text>
        </View>

        <View style={styles.routeFinishMarker}>
          <View style={styles.finishPinOuter}>
            <View style={styles.finishPinInner}>
              <Flag size={8} color="#141416" />
            </View>
          </View>
          <Text style={styles.routeMarkerLabel}>ZIEL</Text>
        </View>

        {pathPoints.map((point, i) => {
          if (i === 0) return null;
          const prev = pathPoints[i - 1];
          return (
            <View
              key={i}
              style={[
                styles.pathDot,
                {
                  left: prev.x + (point.x - prev.x) * 0.5,
                  top: prev.y + (point.y - prev.y) * 0.5,
                  opacity: 0.15 + (i / pathPoints.length) * 0.35,
                },
              ]}
            />
          );
        })}

        <Animated.View
          style={[
            styles.routePulseDot,
            {
              transform: [{ translateX: dotTranslateX }],
              top: 38,
              opacity: glowAnim,
            },
          ]}
        >
          <View style={styles.pulseDotInner} />
          <Animated.View style={[styles.pulseDotGlow, { opacity: glowAnim }]} />
        </Animated.View>

        {isActive && (
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateX: scanTranslateX }] },
            ]}
          />
        )}

        <View style={styles.distanceMarkers}>
          {[0.25, 0.5, 0.75].map((pct) => (
            <View key={pct} style={[styles.distanceMarkerLine, { left: pct * pathWidth }]}>
              <View style={styles.markerTick} />
              <Text style={styles.markerText}>{Math.round(distance * pct)}m</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function PlayerSlot({
  player,
  index,
  totalSlots,
  isEmpty,
}: {
  player: LobbyPlayer | null;
  index: number;
  totalSlots: number;
  isEmpty: boolean;
}) {
  const slamAnim = useRef(new Animated.Value(isEmpty ? 0 : -200)).current;
  const scaleAnim = useRef(new Animated.Value(isEmpty ? 1 : 0.3)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const crackAnim = useRef(new Animated.Value(0)).current;
  const readyPulse = useRef(new Animated.Value(1)).current;
  const emptyPulse = useRef(new Animated.Value(0.6)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isEmpty && !hasAnimated.current) {
      hasAnimated.current = true;

      Animated.sequence([
        Animated.delay(index * 200),
        Animated.parallel([
          Animated.spring(slamAnim, {
            toValue: 0,
            friction: 4,
            tension: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 5, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
        ]).start();

        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();

        Animated.timing(crackAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }
  }, [isEmpty]);

  useEffect(() => {
    if (player?.isReady) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(readyPulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(readyPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [player?.isReady]);

  useEffect(() => {
    if (isEmpty) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(emptyPulse, { toValue: 1, duration: 2000 + index * 300, useNativeDriver: true }),
          Animated.timing(emptyPulse, { toValue: 0.6, duration: 2000 + index * 300, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isEmpty]);

  const initial = player?.name?.charAt(0)?.toUpperCase() ?? '?';

  if (isEmpty) {
    return (
      <Animated.View style={[styles.playerSlot, { opacity: emptyPulse }]}>
        <View style={styles.emptySlotOuter}>
          <View style={styles.emptySlotBevel}>
            <View style={styles.emptySlotDeep}>
              <View style={styles.emptySlotDash}>
                <Text style={styles.emptySlotQ}>?</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.emptySlotLabel}>Warte...</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.playerSlot,
        {
          transform: [
            { translateY: slamAnim },
            { translateX: shakeAnim },
            { scale: Animated.multiply(scaleAnim, player?.isReady ? readyPulse : new Animated.Value(1)) },
          ],
        },
      ]}
    >
      <Animated.View style={[styles.slamGlow, { opacity: glowAnim }]} />

      <Animated.View style={[styles.crackRing1, { opacity: crackAnim, transform: [{ scale: crackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }] }]} />
      <Animated.View style={[styles.crackRing2, { opacity: Animated.multiply(crackAnim, new Animated.Value(0.5)), transform: [{ scale: crackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] }) }] }]} />

      <View style={[styles.filledSlotOuter, player?.isReady && styles.filledSlotReady]}>
        <View style={styles.filledSlotBevel}>
          {player?.avatarUrl ? (
            <Image source={{ uri: player.avatarUrl }} style={styles.playerAvatar} />
          ) : (
            <LinearGradient
              colors={player?.isReady ? ['#BFA35D', '#8B7340'] : ['#3a3a3e', '#2a2a2e']}
              style={styles.playerAvatarGradient}
            >
              <Text style={[styles.playerInitial, player?.isReady && styles.playerInitialReady]}>
                {initial}
              </Text>
            </LinearGradient>
          )}

          {player?.isHost && (
            <View style={styles.hostCrown}>
              <Crown size={10} color="#BFA35D" strokeWidth={3} />
            </View>
          )}

          {player?.isReady && (
            <View style={styles.readyCheckmark}>
              <CheckCircle size={16} color="#141416" strokeWidth={3} />
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.playerName, player?.isReady && styles.playerNameReady]} numberOfLines={1}>
        {player?.name?.split(' ')[0] ?? 'User'}
      </Text>
      <Text style={[styles.playerStatus, player?.isReady && styles.playerStatusReady]}>
        {player?.isReady ? 'BEREIT' : 'WARTET'}
      </Text>
    </Animated.View>
  );
}

function EpicCountdown({ count, onFinish }: { count: number; onFinish: () => void }) {
  const [current, setCurrent] = useState(count);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (current <= 0) {
      onFinish();
      return;
    }

    if (Platform.OS !== 'web') {
      if (current <= 3) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    scaleAnim.setValue(3);
    opacityAnim.setValue(1);
    bgPulse.setValue(current <= 3 ? 0.3 : 0.1);
    ringScale.setValue(0.5);
    ringOpacity.setValue(0.8);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bgPulse, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(ringScale, {
        toValue: 2.5,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrent(prev => prev - 1);
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [current]);

  const isUrgent = current <= 3;
  const numberColor = isUrgent ? '#FF4444' : '#BFA35D';

  return (
    <View style={styles.countdownOverlay}>
      <Animated.View
        style={[
          styles.countdownBgPulse,
          {
            opacity: bgPulse,
            backgroundColor: isUrgent ? '#FF4444' : '#BFA35D',
          },
        ]}
      />

      <Animated.View
        style={[
          styles.countdownRing,
          {
            opacity: ringOpacity,
            borderColor: isUrgent ? '#FF4444' : '#BFA35D',
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.countdownNumber,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={[styles.countdownText, { color: numberColor }]}>
          {current}
        </Text>
      </Animated.View>

      <Text style={styles.countdownLabel}>
        {current > 3 ? 'MACH DICH BEREIT' : current > 0 ? 'LOS GEHT\'S' : ''}
      </Text>
    </View>
  );
}

function SurrenderConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.surrenderOverlay, { opacity: bgAnim }]}>
      <Animated.View style={[styles.surrenderCard, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
        <Animated.View style={[styles.surrenderIconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.surrenderIconInner}>
            <Flag size={32} color="#FF4444" />
          </View>
        </Animated.View>

        <Text style={styles.surrenderTitle}>AUFGEBEN?</Text>
        <Text style={styles.surrenderDesc}>
          Wenn du aufgibst, wird die Challenge als{' '}
          <Text style={styles.surrenderDescBold}>Niederlage durch Abbruch</Text>{' '}
          gewertet. Dein Gegner gewinnt automatisch.
        </Text>

        <View style={styles.surrenderBtns}>
          <Pressable style={styles.surrenderCancelBtn} onPress={onCancel}>
            <Shield size={16} color="#BFA35D" />
            <Text style={styles.surrenderCancelText}>WEITERKÄMPFEN</Text>
          </Pressable>

          <Pressable style={styles.surrenderConfirmBtn} onPress={onConfirm}>
            <X size={16} color="#fff" />
            <Text style={styles.surrenderConfirmText}>AUFGEBEN</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function RaceResultScreen({
  isWinner,
  myTime,
  opponentTime,
  opponentName,
  distance,
  onDismiss,
}: {
  isWinner: boolean;
  myTime: number;
  opponentTime: number;
  opponentName: string;
  distance: DistanceOption;
  onDismiss: () => void;
}) {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(-0.1)).current;
  const textSlide = useRef(new Animated.Value(60)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(40)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  const formatRaceTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const cs = Math.floor((t % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  const timeDiff = Math.abs(myTime - opponentTime);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (isWinner) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, friction: 3, tension: 150, useNativeDriver: true }),
        Animated.spring(iconRotate, { toValue: 0, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 3, duration: 800, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(textSlide, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(statsSlide, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      ...(isWinner ? [Animated.stagger(150, [
        Animated.timing(sparkle1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(sparkle2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(sparkle3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ])] : []),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    if (isWinner) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      );
      glowLoop.start();
      return () => glowLoop.stop();
    }
  }, []);

  const accentColor = isWinner ? '#BFA35D' : '#C06060';

  return (
    <Animated.View style={[raceResultStyles.overlay, { opacity: bgAnim }]}>
      <Animated.View style={[raceResultStyles.ring, { opacity: ringOpacity, borderColor: accentColor, transform: [{ scale: ringScale }] }]} />

      {isWinner && <Animated.View style={[raceResultStyles.glow, { opacity: glowPulse }]} />}

      <Animated.View style={[
        raceResultStyles.iconWrap,
        { transform: [{ scale: iconScale }, { rotate: iconRotate.interpolate({ inputRange: [-0.1, 0], outputRange: ['-15deg', '0deg'] }) }] },
      ]}>
        <View style={[raceResultStyles.iconInner, { borderColor: isWinner ? 'rgba(191,163,93,0.4)' : 'rgba(192,96,96,0.3)' }]}>
          {isWinner ? (
            <Trophy size={56} color="#BFA35D" strokeWidth={2.5} />
          ) : (
            <Flag size={48} color="#C06060" strokeWidth={2} />
          )}
        </View>
      </Animated.View>

      {isWinner && (
        <View style={raceResultStyles.sparkles}>
          {[sparkle1, sparkle2, sparkle3].map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                raceResultStyles.sparkle,
                {
                  opacity: anim,
                  transform: [{ scale: anim }, { rotate: `${i * 45 + 15}deg` }],
                  left: i === 0 ? '20%' : i === 1 ? '50%' : '75%',
                  top: i === 0 ? '25%' : i === 1 ? '15%' : '28%',
                },
              ]}
            >
              <Text style={raceResultStyles.sparkleText}>{i === 1 ? '⭐' : '✦'}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      <Animated.View style={[raceResultStyles.textWrap, { transform: [{ translateY: textSlide }], opacity: textOpacity }]}>
        <Text style={[raceResultStyles.mainLabel, { color: accentColor }]}>
          {isWinner ? 'SIEG!' : 'NIEDERLAGE'}
        </Text>
        <Text style={raceResultStyles.subLabel}>
          {(distance / 1000).toFixed(0)}K CHALLENGE
        </Text>
      </Animated.View>

      <Animated.View style={[raceResultStyles.statsCard, { transform: [{ translateY: statsSlide }], opacity: statsOpacity }]}>
        <View style={raceResultStyles.statsRow}>
          <View style={raceResultStyles.statBlock}>
            <Text style={raceResultStyles.statLabel}>DEINE ZEIT</Text>
            <Text style={[raceResultStyles.statValue, { color: isWinner ? '#BFA35D' : '#E8DCC8' }]}>
              {formatRaceTime(myTime)}
            </Text>
          </View>
          <View style={raceResultStyles.statDivider} />
          <View style={raceResultStyles.statBlock}>
            <Text style={raceResultStyles.statLabel}>{opponentName.toUpperCase()}</Text>
            <Text style={[raceResultStyles.statValue, { color: !isWinner ? '#BFA35D' : '#E8DCC8' }]}>
              {formatRaceTime(opponentTime)}
            </Text>
          </View>
        </View>

        <View style={raceResultStyles.gapRow}>
          <Text style={raceResultStyles.gapLabel}>VORSPRUNG</Text>
          <Text style={[raceResultStyles.gapValue, { color: accentColor }]}>
            {isWinner ? '-' : '+'}{formatRaceTime(timeDiff)}
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[raceResultStyles.btnWrap, { opacity: btnOpacity }]}>
        <Pressable
          style={raceResultStyles.btn}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onDismiss();
          }}
        >
          <LinearGradient
            colors={isWinner ? ['#BFA35D', '#A08A45'] : ['#2a2a2e', '#222224']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={raceResultStyles.btnGradient}
          >
            <Text style={[raceResultStyles.btnText, { color: isWinner ? '#141416' : '#E8DCC8' }]}>WEITER</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const raceResultStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
    padding: 24,
  },
  ring: {
    position: 'absolute' as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  glow: {
    position: 'absolute' as const,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  iconWrap: {
    marginBottom: 24,
  },
  iconInner: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  sparkle: {
    position: 'absolute' as const,
  },
  sparkleText: {
    fontSize: 24,
    color: '#BFA35D',
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainLabel: {
    fontSize: 48,
    fontWeight: '900' as const,
    letterSpacing: 6,
  },
  subLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
    letterSpacing: 3,
    marginTop: 6,
  },
  statsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1c',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.35)',
    letterSpacing: 1.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900' as const,
    fontVariant: ['tabular-nums'] as any,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(191,163,93,0.12)',
    marginHorizontal: 12,
  },
  gapRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.08)',
  },
  gapLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.3)',
    letterSpacing: 1.5,
  },
  gapValue: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontVariant: ['tabular-nums'] as any,
  },
  btnWrap: {
    width: '100%',
    maxWidth: 340,
  },
  btn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  btnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  btnText: {
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: 3,
  },
});

function VictoryBySurrenderScreen({ opponentName, onDismiss }: { opponentName: string; onDismiss: () => void }) {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;
  const trophyRotate = useRef(new Animated.Value(-0.1)).current;
  const textSlide = useRef(new Animated.Value(60)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(trophyScale, { toValue: 1, friction: 3, tension: 150, useNativeDriver: true }),
        Animated.spring(trophyRotate, { toValue: 0, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 3, duration: 800, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(textSlide, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.stagger(150, [
        Animated.timing(sparkle1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(sparkle2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(sparkle3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ]),
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, []);

  return (
    <Animated.View style={[styles.victoryOverlay, { opacity: bgAnim }]}>
      <Animated.View style={[styles.victoryRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />

      <Animated.View style={[styles.victoryGlow, { opacity: glowPulse }]} />

      <Animated.View style={[
        styles.victoryTrophy,
        { transform: [{ scale: trophyScale }, { rotate: trophyRotate.interpolate({ inputRange: [-0.1, 0], outputRange: ['-15deg', '0deg'] }) }] },
      ]}>
        <View style={styles.victoryTrophyInner}>
          <Trophy size={56} color="#BFA35D" strokeWidth={2.5} />
        </View>
      </Animated.View>

      <View style={styles.victorySparkles}>
        {[sparkle1, sparkle2, sparkle3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.sparkle,
              {
                opacity: anim,
                transform: [{ scale: anim }, { rotate: `${i * 45 + 15}deg` }],
                left: i === 0 ? '20%' : i === 1 ? '50%' : '75%',
                top: i === 0 ? '25%' : i === 1 ? '15%' : '28%',
              },
            ]}
          >
            <Text style={styles.sparkleText}>{i === 1 ? '⭐' : '✦'}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.victoryTextWrap, { transform: [{ translateY: textSlide }], opacity: textOpacity }]}>
        <Text style={styles.victoryLabel}>SIEG</Text>
        <Text style={styles.victorySubLabel}>DURCH AUFGABE</Text>
        <View style={styles.victoryDivider} />
        <Text style={styles.victoryOpponent}>
          {opponentName} hat aufgegeben
        </Text>
      </Animated.View>

      <Animated.View style={[styles.victoryBtnWrap, { opacity: btnOpacity }]}>
        <Pressable
          style={styles.victoryBtn}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onDismiss();
          }}
        >
          <LinearGradient
            colors={['#BFA35D', '#A08A45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.victoryBtnGradient}
          >
            <Text style={styles.victoryBtnText}>WEITER</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function SurrenderDefeatScreen({ onDismiss }: { onDismiss: () => void }) {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(40)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(textSlide, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.defeatOverlay, { opacity: bgAnim }]}>
      <Animated.View style={[styles.defeatIcon, { transform: [{ scale: iconScale }] }]}>
        <View style={styles.defeatIconInner}>
          <Flag size={48} color="#C06060" strokeWidth={2} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.defeatTextWrap, { transform: [{ translateY: textSlide }], opacity: textOpacity }]}>
        <Text style={styles.defeatLabel}>NIEDERLAGE</Text>
        <Text style={styles.defeatSubLabel}>DURCH AUFGABE</Text>
        <View style={styles.defeatDivider} />
        <Text style={styles.defeatDesc}>
          Du hast die Challenge abgebrochen.
          Das Ergebnis wird in deiner Statistik vermerkt.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.defeatBtnWrap, { opacity: btnOpacity }]}>
        <Pressable
          style={styles.defeatBtn}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onDismiss();
          }}
        >
          <Text style={styles.defeatBtnText}>ZURÜCK ZUR LOBBY</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function GoScreen({ distance, onStart }: { distance: DistanceOption; onStart: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;
  const textSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(textSlide, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onStart, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.goOverlay}>
      <Animated.View
        style={[styles.goFlash, { opacity: flashAnim, backgroundColor: '#BFA35D' }]}
      />
      <Animated.View style={[styles.goContent, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.goText}>LOS!</Text>
        <Animated.View style={{ transform: [{ translateY: textSlide }], opacity: scaleAnim }}>
          <Text style={styles.goSubtext}>{(distance / 1000).toFixed(0)} KM CHALLENGE</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function CheerBubble({ cheer }: { cheer: CheerMessage }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
    ]).start();

    const fadeTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -40, duration: 400, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, CHEER_DISPLAY_DURATION_MS - 500);

    return () => clearTimeout(fadeTimer);
  }, []);

  const cheerData = CHEER_TYPES.find(c => c.type === cheer.type);
  const emoji = cheerData?.emoji ?? '\u{1F525}';

  return (
    <Animated.View
      style={[
        cheerBubbleStyles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Text style={cheerBubbleStyles.emoji}>{emoji}</Text>
      <Text style={cheerBubbleStyles.name} numberOfLines={1}>{cheer.fromName}</Text>
    </Animated.View>
  );
}

const cheerBubbleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    alignSelf: 'flex-start' as const,
  },
  emoji: {
    fontSize: 18,
  },
  name: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
    maxWidth: 80,
  },
});

function SpectatorBar({
  spectators,
  allowSpectators,
}: {
  spectators: SpectatorInfo[];
  allowSpectators: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (!allowSpectators) return null;

  return (
    <View style={spectatorBarStyles.container}>
      <Animated.View style={[spectatorBarStyles.liveDot, { opacity: pulseAnim }]} />
      <Eye size={12} color="rgba(191,163,93,0.5)" />
      <Text style={spectatorBarStyles.count}>
        {spectators.length} {spectators.length === 1 ? 'Zuschauer' : 'Zuschauer'}
      </Text>
      {spectators.slice(0, 3).map((s) => (
        <View key={s.userId} style={spectatorBarStyles.avatarDot}>
          <Text style={spectatorBarStyles.avatarInitial}>
            {s.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {spectators.length > 3 && (
        <Text style={spectatorBarStyles.more}>+{spectators.length - 3}</Text>
      )}
    </View>
  );
}

const spectatorBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#BFA35D',
  },
  count: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 0.5,
  },
  avatarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#BFA35D',
  },
  more: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
  },
});

function CheerBar({ onSendCheer }: { onSendCheer: (type: CheerMessage['type']) => void }) {
  return (
    <View style={cheerBarStyles.container}>
      <Text style={cheerBarStyles.label}>ANFEUERN</Text>
      <View style={cheerBarStyles.buttons}>
        {CHEER_TYPES.map((ct) => (
          <Pressable
            key={ct.type}
            style={cheerBarStyles.btn}
            onPress={() => onSendCheer(ct.type)}
          >
            <Text style={cheerBarStyles.emoji}>{ct.emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const cheerBarStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  label: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.35)',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  buttons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around',
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});

function LiveRaceTrack({
  distance,
  racerPositions,
  cheers,
}: {
  distance: DistanceOption;
  racerPositions: RacerPosition[];
  cheers: CheerMessage[];
}) {
  const pathWidth = SCREEN_WIDTH - 80;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const pathPoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * pathWidth;
      const y = 50 + Math.sin(t * Math.PI * 3) * 18 + Math.cos(t * Math.PI * 1.5) * 12;
      points.push({ x, y });
    }
    return points;
  }, [pathWidth]);

  const RACER_COLORS = ['#BFA35D', '#5DA3BF', '#BF5D5D', '#5DBF7A'];

  return (
    <View style={liveTrackStyles.container}>
      <View style={liveTrackStyles.header}>
        <Zap size={12} color="#BFA35D" />
        <Text style={liveTrackStyles.headerText}>LIVE STRECKE</Text>
      </View>

      <View style={liveTrackStyles.trackArea}>
        <View style={liveTrackStyles.startMarker}>
          <View style={liveTrackStyles.markerOuter}>
            <Play size={7} color="#141416" />
          </View>
          <Text style={liveTrackStyles.markerLabel}>START</Text>
        </View>

        <View style={liveTrackStyles.finishMarker}>
          <View style={liveTrackStyles.markerOuterFinish}>
            <Flag size={7} color="#141416" />
          </View>
          <Text style={liveTrackStyles.markerLabel}>ZIEL</Text>
        </View>

        {pathPoints.map((point, i) => {
          if (i === 0) return null;
          const prev = pathPoints[i - 1];
          return (
            <View
              key={i}
              style={[
                liveTrackStyles.pathDot,
                {
                  left: prev.x + (point.x - prev.x) * 0.5,
                  top: prev.y + (point.y - prev.y) * 0.5,
                  opacity: 0.1 + (i / pathPoints.length) * 0.2,
                },
              ]}
            />
          );
        })}

        {racerPositions.map((rp, idx) => {
          const progress = Math.min(rp.distanceCovered / distance, 1);
          const xPos = progress * pathWidth;
          const segIdx = Math.floor(progress * 40);
          const yPos = pathPoints[Math.min(segIdx, pathPoints.length - 1)]?.y ?? 50;
          const color = RACER_COLORS[idx % RACER_COLORS.length];

          return (
            <View
              key={rp.userId}
              style={[
                liveTrackStyles.racerDot,
                {
                  left: xPos - 14,
                  top: yPos - 14,
                },
              ]}
            >
              <Animated.View
                style={[
                  liveTrackStyles.racerGlow,
                  {
                    backgroundColor: color,
                    opacity: glowAnim.interpolate({
                      inputRange: [0.5, 1],
                      outputRange: [0.15, 0.35],
                    }),
                  },
                ]}
              />
              <View style={[liveTrackStyles.racerDotInner, { backgroundColor: color, borderColor: color }]}>
                <Text style={liveTrackStyles.racerInitial}>
                  {rp.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              {rp.isFinished && (
                <View style={liveTrackStyles.finishedBadge}>
                  <Text style={liveTrackStyles.finishedEmoji}>{"\ud83c\udfc1"}</Text>
                </View>
              )}
            </View>
          );
        })}

        {[0.25, 0.5, 0.75].map((pct) => (
          <View key={pct} style={[liveTrackStyles.distMark, { left: pct * pathWidth }]}>
            <View style={liveTrackStyles.distTick} />
            <Text style={liveTrackStyles.distText}>{Math.round(distance * pct)}m</Text>
          </View>
        ))}
      </View>

      {cheers.length > 0 && (
        <View style={liveTrackStyles.cheersOverlay}>
          {cheers.slice(-3).map((c) => (
            <CheerBubble key={c.id} cheer={c} />
          ))}
        </View>
      )}
    </View>
  );
}

const liveTrackStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0e0e10',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.6)',
    letterSpacing: 1.5,
  },
  trackArea: {
    height: 120,
    position: 'relative' as const,
  },
  startMarker: {
    position: 'absolute' as const,
    left: 0,
    top: 22,
    alignItems: 'center',
    zIndex: 10,
  },
  finishMarker: {
    position: 'absolute' as const,
    right: 0,
    top: 22,
    alignItems: 'center',
    zIndex: 10,
  },
  markerOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOuterFinish: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: {
    fontSize: 7,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1,
    marginTop: 3,
  },
  pathDot: {
    position: 'absolute' as const,
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#BFA35D',
  },
  racerDot: {
    position: 'absolute' as const,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  racerGlow: {
    position: 'absolute' as const,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  racerDotInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  racerInitial: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: '#141416',
  },
  finishedBadge: {
    position: 'absolute' as const,
    top: -6,
    right: -4,
  },
  finishedEmoji: {
    fontSize: 12,
  },
  distMark: {
    position: 'absolute' as const,
    top: 85,
    alignItems: 'center',
  },
  distTick: {
    width: 1,
    height: 6,
    backgroundColor: 'rgba(191,163,93,0.12)',
    marginBottom: 2,
  },
  distText: {
    fontSize: 7,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.2)',
  },
  cheersOverlay: {
    marginTop: 10,
    gap: 4,
  },
});

function InactivityWarning({ secondsLeft }: { secondsLeft: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.inactivityWarning, { opacity: pulseAnim }]}>
      <AlertTriangle size={16} color="#FF4444" />
      <Text style={styles.inactivityText}>
        Inaktivität erkannt! Lobby-Kick in {secondsLeft}s
      </Text>
    </Animated.View>
  );
}

export default function LobbyScreen() {
  const { mode: modeParam, distance: distanceParam } = useLocalSearchParams<{
    mode: string;
    distance: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getMemberName, getMemberAvatar } = useKaderschmiede();

  const userId = user?.id ?? '';
  const challengeMode: ChallengeMode = (modeParam as ChallengeMode) ?? '1v1';
  const selectedDistance: DistanceOption = (parseInt(distanceParam ?? '1000', 10) as DistanceOption) || 1000;

  const [phase, setPhase] = useState<LobbyPhase>('setup');
  const [distance, setDistance] = useState<DistanceOption>(selectedDistance);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [countdownValue] = useState(10);
  const [showInactivity] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [spectators, setSpectators] = useState<SpectatorInfo[]>([]);
  const [myRole] = useState<SpectatorRole>('racer');
  const [cheers, setCheers] = useState<CheerMessage[]>([]);
  const [racerPositions, setRacerPositions] = useState<RacerPosition[]>([]);
  const [raceElapsed, setRaceElapsed] = useState(0);
  const [finishTimes, setFinishTimes] = useState<Record<string, number>>({});
  const [winnerUserId, setWinnerUserId] = useState<string | null>(null);
  const [allFinished, setAllFinished] = useState(false);
  const raceStartTime = useRef<number>(0);
  const finishTimesRef = useRef<Record<string, number>>({});
  const raceEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cheerTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const readyBtnScale = useRef(new Animated.Value(1)).current;
  const readyBtnGlow = useRef(new Animated.Value(0)).current;

  const maxPlayers = challengeMode === '1v1' ? 2 : 10;

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    const hostPlayer: LobbyPlayer = {
      id: userId,
      name: user?.name ?? getMemberName(userId),
      avatarUrl: getMemberAvatar(userId),
      isReady: false,
      isHost: true,
      joinedAt: Date.now(),
    };
    setPlayers([hostPlayer]);
    setPhase('waiting');

    const joinTimer = setTimeout(() => {
      const mockPlayer: LobbyPlayer = {
        id: 'mock_player_1',
        name: 'Krieger_42',
        avatarUrl: null,
        isReady: false,
        isHost: false,
        joinedAt: Date.now(),
      };
      setPlayers(prev => [...prev, mockPlayer]);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 3000);

    return () => clearTimeout(joinTimer);
  }, []);

  useEffect(() => {
    if (isReady) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(readyBtnGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(readyBtnGlow, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isReady]);

  const handleReady = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    Animated.sequence([
      Animated.timing(readyBtnScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(readyBtnScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();

    const newReady = !isReady;
    setIsReady(newReady);

    setPlayers(prev =>
      prev.map(p => p.id === userId ? { ...p, isReady: newReady } : p),
    );

    if (newReady) {
      setTimeout(() => {
        setPlayers(prev =>
          prev.map(p => p.id === 'mock_player_1' ? { ...p, isReady: true } : p),
        );
      }, 2000);
    }
  }, [isReady, userId]);

  const allReady = players.length >= 2 && players.every(p => p.isReady);

  useEffect(() => {
    if (allReady && phase === 'waiting') {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => {
        setPhase('countdown');
      }, 1500);
    }
  }, [allReady, phase]);

  const handleCountdownFinish = useCallback(() => {
    setPhase('go');
  }, []);

  const handleGoStart = useCallback(() => {
    setPhase('racing');
    raceStartTime.current = Date.now();
    console.log('[LOBBY] Race started! Distance:', distance);

    const initialPositions: RacerPosition[] = players.map(p => ({
      userId: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      latitude: 0,
      longitude: 0,
      distanceCovered: 0,
      pace: 0,
      timestamp: Date.now(),
      isFinished: false,
      hasSurrendered: false,
    }));
    setRacerPositions(initialPositions);

    gpsIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - raceStartTime.current) / 1000;
      setRaceElapsed(elapsed);

      setRacerPositions(prev => {
        const updated = prev.map((rp, idx) => {
          if (rp.isFinished || rp.hasSurrendered) return rp;
          const baseSpeed = idx === 0 ? 3.2 : 2.8;
          const jitter = (Math.random() - 0.5) * 0.4;
          const speed = baseSpeed + jitter + Math.sin(elapsed * 0.1 + idx) * 0.3;
          const newDist = Math.min(rp.distanceCovered + speed, distance);
          const justFinished = newDist >= distance && !rp.isFinished;
          const pace = elapsed > 0 ? (elapsed / 60) / (newDist / 1000) : 0;

          if (justFinished) {
            const ft = elapsed;
            finishTimesRef.current[rp.userId] = ft;
            setFinishTimes(prev2 => ({ ...prev2, [rp.userId]: ft }));
            console.log('[LOBBY] Racer finished:', rp.name, 'Time:', ft.toFixed(2));

            if (!winnerUserId && Object.keys(finishTimesRef.current).length === 0) {
              setWinnerUserId(rp.userId);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          }

          return {
            ...rp,
            distanceCovered: newDist,
            pace: Math.round(pace * 10) / 10,
            timestamp: Date.now(),
            isFinished: newDist >= distance,
          };
        });

        const allDone = updated.every(rp => rp.isFinished || rp.hasSurrendered);
        if (allDone && !allFinished) {
          setAllFinished(true);
        }

        return updated;
      });
    }, RACE_GPS_INTERVAL_MS);

    if (allowSpectators) {
      setTimeout(() => {
        const mockSpec: SpectatorInfo = {
          userId: 'spec_1',
          name: 'Zuschauer_Max',
          avatarUrl: null,
          joinedAt: Date.now(),
        };
        setSpectators(prev => [...prev, mockSpec]);
        console.log('[LOBBY] Spectator joined:', mockSpec.name);
      }, 5000);
    }

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [distance, players, allowSpectators]);

  const handleSendCheer = useCallback((type: CheerMessage['type']) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const cheer: CheerMessage = {
      id: `cheer_${Date.now()}_${Math.random()}`,
      fromUserId: userId,
      fromName: user?.name ?? 'Zuschauer',
      fromAvatarUrl: null,
      type,
      timestamp: Date.now(),
    };
    setCheers(prev => [...prev, cheer]);
    console.log('[LOBBY] Cheer sent:', type);

    const timeout = setTimeout(() => {
      setCheers(prev => prev.filter(c => c.id !== cheer.id));
    }, CHEER_DISPLAY_DURATION_MS);
    cheerTimeoutRef.current.push(timeout);
  }, [userId, user]);

  useEffect(() => {
    if (allFinished && phase === 'racing') {
      console.log('[LOBBY] All racers finished! Showing results...');
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);

      raceEndTimerRef.current = setTimeout(() => {
        const myFinishTime = finishTimesRef.current[userId];
        const opponentId = players.find(p => p.id !== userId)?.id ?? '';
        const opFinishTime = finishTimesRef.current[opponentId];

        if (myFinishTime != null && opFinishTime != null) {
          if (myFinishTime <= opFinishTime) {
            setPhase('race_won');
          } else {
            setPhase('race_lost');
          }
        } else if (myFinishTime != null) {
          setPhase('race_won');
        } else {
          setPhase('race_lost');
        }
      }, 2000);
    }
  }, [allFinished, phase, userId, players]);

  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (raceEndTimerRef.current) clearTimeout(raceEndTimerRef.current);
      cheerTimeoutRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (phase === 'racing' && allowSpectators) {
      const cheerInterval = setInterval(() => {
        if (spectators.length > 0 && Math.random() > 0.6) {
          const spec = spectators[Math.floor(Math.random() * spectators.length)];
          const cheerType = CHEER_TYPES[Math.floor(Math.random() * CHEER_TYPES.length)];
          const cheer: CheerMessage = {
            id: `cheer_auto_${Date.now()}`,
            fromUserId: spec.userId,
            fromName: spec.name,
            fromAvatarUrl: spec.avatarUrl,
            type: cheerType.type,
            timestamp: Date.now(),
          };
          setCheers(prev => [...prev, cheer]);
          const timeout = setTimeout(() => {
            setCheers(prev => prev.filter(c => c.id !== cheer.id));
          }, CHEER_DISPLAY_DURATION_MS);
          cheerTimeoutRef.current.push(timeout);
        }
      }, 4000);
      return () => clearInterval(cheerInterval);
    }
  }, [phase, spectators, allowSpectators]);

  const handleSurrender = useCallback(() => {
    setShowSurrenderConfirm(false);
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    console.log('[LOBBY] Player surrendered!');
    setPhase('surrendered');

    setTimeout(() => {
      const opponent = players.find(p => p.id !== userId);
      if (opponent) {
        console.log('[LOBBY] Opponent', opponent.name, 'wins by surrender');
      }
    }, 500);
  }, [players, userId]);

  const handleSurrenderDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const handleVictoryDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const handleRaceResultDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const slots = useMemo(() => {
    const result: Array<{ player: LobbyPlayer | null; isEmpty: boolean }> = [];
    for (let i = 0; i < maxPlayers; i++) {
      const p = players[i] ?? null;
      result.push({ player: p, isEmpty: !p });
    }
    return result;
  }, [players, maxPlayers]);

  if (phase === 'countdown') {
    return (
      <View style={styles.fullScreenOverlay}>
        <EpicCountdown count={countdownValue} onFinish={handleCountdownFinish} />
      </View>
    );
  }

  if (phase === 'go') {
    return (
      <View style={styles.fullScreenOverlay}>
        <GoScreen distance={distance} onStart={handleGoStart} />
      </View>
    );
  }

  if (phase === 'surrendered') {
    return (
      <View style={styles.fullScreenOverlay}>
        <SurrenderDefeatScreen onDismiss={handleSurrenderDismiss} />
      </View>
    );
  }

  if (phase === 'victory_by_surrender') {
    const opponentName = players.find(p => p.id !== userId)?.name ?? 'Gegner';
    return (
      <View style={styles.fullScreenOverlay}>
        <VictoryBySurrenderScreen opponentName={opponentName} onDismiss={handleVictoryDismiss} />
      </View>
    );
  }

  if (phase === 'race_won' || phase === 'race_lost') {
    const opponent = players.find(p => p.id !== userId);
    const opponentName = opponent?.name ?? 'Gegner';
    const opponentId = opponent?.id ?? '';
    const myTime = finishTimes[userId] ?? raceElapsed;
    const opponentTime = finishTimes[opponentId] ?? raceElapsed;
    return (
      <View style={styles.fullScreenOverlay}>
        <RaceResultScreen
          isWinner={phase === 'race_won'}
          myTime={myTime}
          opponentTime={opponentTime}
          opponentName={opponentName}
          distance={distance}
          onDismiss={handleRaceResultDismiss}
        />
      </View>
    );
  }

  if (phase === 'racing') {
    const formatElapsed = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      const cs = Math.floor((s % 1) * 100);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    const firstFinisherId = Object.keys(finishTimes)[0] ?? null;
    const firstFinishTime = firstFinisherId ? finishTimes[firstFinisherId] : null;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#1a1917', '#141416']} style={styles.racingScreen}>
            <View style={styles.racingHeader}>
              <View style={styles.racingLiveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.racingTitle}>{(distance / 1000).toFixed(0)}K CHALLENGE</Text>
              <View style={styles.racingTimer}>
                <Timer size={12} color="rgba(232,220,200,0.5)" />
                <Text style={styles.racingTimerText}>{formatElapsed(raceElapsed)}</Text>
              </View>
            </View>

            <SpectatorBar spectators={spectators} allowSpectators={allowSpectators} />

            <View style={{ marginTop: 16 }}>
              <LiveRaceTrack
                distance={distance}
                racerPositions={racerPositions}
                cheers={cheers}
              />
            </View>

            <View style={styles.racingPlayers}>
              {racerPositions.map((rp, i) => {
                const progress = Math.min(rp.distanceCovered / distance, 1);
                const RACER_COLORS = ['#BFA35D', '#5DA3BF', '#BF5D5D', '#5DBF7A'];
                const color = RACER_COLORS[i % RACER_COLORS.length];
                return (
                  <View key={rp.userId} style={styles.racingPlayerRow}>
                    <View style={[styles.racingPlayerAvatar, { borderColor: color }]}>
                      {rp.avatarUrl ? (
                        <Image source={{ uri: rp.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 10 }} />
                      ) : (
                        <Text style={[styles.racingPlayerInitial, { color }]}>
                          {rp.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.racingPlayerInfo}>
                      <View style={styles.racingPlayerNameRow}>
                        <Text style={styles.racingPlayerName}>{rp.name}</Text>
                        {rp.isFinished && <Text style={styles.racingFinishedBadge}>{"\ud83c\udfc1"}</Text>}
                        {rp.hasSurrendered && <Text style={styles.racingSurrenderedBadge}>\u274C</Text>}
                        {rp.isFinished && finishTimes[rp.userId] != null && firstFinisherId === rp.userId && (
                          <View style={styles.winnerBadge}>
                            <Text style={styles.winnerBadgeText}>1.</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.racingProgressOuter}>
                        <View style={[styles.racingProgressInner, { width: `${progress * 100}%`, backgroundColor: color }]} />
                      </View>
                      <View style={styles.racingPlayerStats}>
                        {rp.isFinished && finishTimes[rp.userId] != null ? (
                          <Text style={[styles.racingTimeText, { color }]}>
                            {formatElapsed(finishTimes[rp.userId])}
                            {firstFinishTime != null && finishTimes[rp.userId] !== firstFinishTime && (
                              <Text style={styles.racingTimeDiff}>
                                {' +' + formatElapsed(finishTimes[rp.userId] - firstFinishTime)}
                              </Text>
                            )}
                          </Text>
                        ) : firstFinishTime != null && !rp.isFinished ? (
                          <Text style={styles.racingGapText}>
                            +{formatElapsed(raceElapsed - firstFinishTime)}
                          </Text>
                        ) : (
                          <Text style={styles.racingPaceText}>
                            {rp.pace > 0 ? `${rp.pace.toFixed(1)} min/km` : '--'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.racingPlayerDist, { color }]}>
                      {Math.round(rp.distanceCovered)}m
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.racingFooter}>
              <Radio size={12} color="rgba(191,163,93,0.4)" />
              <Text style={styles.racingFooterText}>GPS alle {RACE_GPS_INTERVAL_MS / 1000}s</Text>
              <MapPin size={12} color="rgba(191,163,93,0.4)" />
              <Text style={styles.racingFooterText}>Echtzeit</Text>
            </View>

            {(allowSpectators || myRole === 'spectator') && (
              <CheerBar onSendCheer={handleSendCheer} />
            )}

            <Pressable
              style={styles.surrenderBtn}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setShowSurrenderConfirm(true);
              }}
              testID="surrender-button"
            >
              <Flag size={16} color="#C06060" />
              <Text style={styles.surrenderBtnText}>AUFGEBEN</Text>
            </Pressable>
          </LinearGradient>
        </ScrollView>

        {showSurrenderConfirm && (
          <SurrenderConfirmModal
            onConfirm={handleSurrender}
            onCancel={() => setShowSurrenderConfirm(false)}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#1e1d1a', '#171615', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.heroPatternBg}>
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heroGridLine,
                  {
                    top: 20 + i * 30,
                    opacity: 0.015 + (i % 3) * 0.008,
                    transform: [{ rotate: `${-5 + i * 2}deg` }],
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft size={22} color="#BFA35D" />
            </Pressable>
            <View style={styles.lobbyModeBadge}>
              <Swords size={12} color="#BFA35D" />
              <Text style={styles.lobbyModeText}>
                {challengeMode === '1v1' ? '1 VS 1' : 'TEAM'}
              </Text>
            </View>
            <View style={styles.backBtn}>
              <Users size={18} color="rgba(191,163,93,0.5)" />
            </View>
          </View>

          <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
            <View style={styles.lobbyIconBox}>
              <Swords size={32} color="#BFA35D" />
            </View>
            <Text style={styles.lobbyTitle}>CHALLENGE LOBBY</Text>
            <Text style={styles.lobbySubtitle}>
              {phase === 'waiting' ? 'Warte auf Gegner...' : 'Lobby wird vorbereitet'}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.distanceSection}>
          <Text style={styles.sectionLabel}>DISTANZ WÄHLEN</Text>
          <View style={styles.distanceRow}>
            {DISTANCE_OPTIONS.map(opt => {
              const selected = distance === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.distanceChip, selected && styles.distanceChipActive]}
                  onPress={() => {
                    setDistance(opt.value);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Text style={[styles.distanceLabel, selected && styles.distanceLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.distanceSublabel, selected && styles.distanceSublabelActive]}>
                    {opt.sublabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.routeSection}>
          <RoutePreview distance={distance} isActive={false} />
        </View>

        <View style={styles.playersSection}>
          <View style={styles.playersSectionHeader}>
            <Text style={styles.sectionLabel}>TEILNEHMER</Text>
            <View style={styles.playerCountBadge}>
              <Text style={styles.playerCountText}>{players.length}/{maxPlayers}</Text>
            </View>
          </View>

          <View style={styles.playersGrid}>
            {slots.map((slot, i) => (
              <PlayerSlot
                key={i}
                player={slot.player}
                index={i}
                totalSlots={maxPlayers}
                isEmpty={slot.isEmpty}
              />
            ))}
          </View>
        </View>

        {showInactivity && <InactivityWarning secondsLeft={15} />}

        {allReady && (
          <View style={styles.allReadyBanner}>
            <Animated.View style={styles.allReadyContent}>
              <Flame size={20} color="#BFA35D" />
              <Text style={styles.allReadyText}>ALLE BEREIT!</Text>
              <Text style={styles.allReadySubtext}>Countdown startet...</Text>
            </Animated.View>
          </View>
        )}

        <View style={styles.readySection}>
          <Animated.View style={{ transform: [{ scale: readyBtnScale }] }}>
            <Pressable
              style={[styles.readyBtn, isReady && styles.readyBtnActive]}
              onPress={handleReady}
            >
              <LinearGradient
                colors={isReady ? ['#BFA35D', '#A08A45'] : ['#2a2a2e', '#222224']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.readyBtnGradient}
              >
                {isReady ? (
                  <>
                    <Shield size={22} color="#141416" />
                    <Text style={styles.readyBtnTextActive}>BEREIT!</Text>
                  </>
                ) : (
                  <>
                    <Zap size={22} color="#BFA35D" />
                    <Text style={styles.readyBtnText}>BEREIT MACHEN</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {isReady && (
            <Pressable style={styles.cancelReadyBtn} onPress={handleReady}>
              <X size={14} color="#C06060" />
              <Text style={styles.cancelReadyText}>Abbrechen</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.spectatorSection}>
          <Text style={styles.sectionLabel}>ZUSCHAUER</Text>
          <Pressable
            style={[styles.spectatorToggleBtn, allowSpectators && styles.spectatorToggleBtnActive]}
            onPress={() => {
              setAllowSpectators(prev => !prev);
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            {allowSpectators ? (
              <Eye size={18} color="#BFA35D" />
            ) : (
              <EyeOff size={18} color="rgba(232,220,200,0.3)" />
            )}
            <View style={styles.spectatorToggleInfo}>
              <Text style={[styles.spectatorToggleTitle, allowSpectators && styles.spectatorToggleTitleActive]}>
                {allowSpectators ? 'Zuschauer erlaubt' : 'Keine Zuschauer'}
              </Text>
              <Text style={styles.spectatorToggleDesc}>
                {allowSpectators
                  ? 'Freunde k\u00f6nnen live zuschauen & anfeuern'
                  : 'Nur Teilnehmer sehen den Wettkampf'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.rulesSection}>
          <Text style={styles.sectionLabel}>REGELN</Text>
          <View style={styles.ruleCard}>
            <View style={styles.ruleItem}>
              <Timer size={14} color="#BFA35D" />
              <Text style={styles.ruleText}>GPS-Tracking muss aktiv sein</Text>
            </View>
            <View style={styles.ruleItem}>
              <Shield size={14} color="#BFA35D" />
              <Text style={styles.ruleText}>Anti-Cheat: Geschwindigkeit wird geprüft</Text>
            </View>
            <View style={styles.ruleItem}>
              <Flag size={14} color="#BFA35D" />
              <Text style={styles.ruleText}>Aufgeben = Niederlage durch Abbruch</Text>
            </View>
            <View style={styles.ruleItem}>
              <AlertTriangle size={14} color="#C06060" />
              <Text style={styles.ruleText}>Inaktivität = Lobby-Kick nach 30s</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  heroPatternBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGridLine: {
    position: 'absolute' as const,
    left: -60,
    right: -60,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(30,30,32,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  lobbyModeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  lobbyModeText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 2,
  },
  heroContent: {
    alignItems: 'center',
  },
  lobbyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lobbyTitle: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 3,
    textAlign: 'center' as const,
  },
  lobbySubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 6,
  },
  distanceSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  distanceRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  distanceChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#1e1e20',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  distanceChipActive: {
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderColor: '#BFA35D',
  },
  distanceLabel: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: 'rgba(232,220,200,0.3)',
  },
  distanceLabelActive: {
    color: '#BFA35D',
  },
  distanceSublabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.2)',
    marginTop: 2,
  },
  distanceSublabelActive: {
    color: 'rgba(191,163,93,0.6)',
  },
  routeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  routeContainer: {
    backgroundColor: '#0e0e10',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  routeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    marginBottom: 12,
  },
  routeDistanceBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  routeDistanceText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.6)',
    letterSpacing: 1.5,
  },
  routePathArea: {
    height: 100,
    position: 'relative' as const,
  },
  routeStartMarker: {
    position: 'absolute' as const,
    left: 0,
    top: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  startPinOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPinInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeFinishMarker: {
    position: 'absolute' as const,
    right: 0,
    top: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  finishPinOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishPinInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeMarkerLabel: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 1,
    marginTop: 3,
  },
  pathDot: {
    position: 'absolute' as const,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#BFA35D',
  },
  routePulseDot: {
    position: 'absolute' as const,
    left: 0,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BFA35D',
  },
  pulseDotGlow: {
    position: 'absolute' as const,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.3)',
  },
  scanLine: {
    position: 'absolute' as const,
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(191,163,93,0.3)',
  },
  distanceMarkers: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  distanceMarkerLine: {
    position: 'absolute' as const,
    top: 70,
    alignItems: 'center',
  },
  markerTick: {
    width: 1,
    height: 8,
    backgroundColor: 'rgba(191,163,93,0.15)',
    marginBottom: 3,
  },
  markerText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.25)',
  },
  playersSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  playersSectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  playerCountText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#BFA35D',
  },
  playersGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: 20,
  },
  playerSlot: {
    width: 100,
    alignItems: 'center',
    gap: 6,
  },
  emptySlotOuter: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#0a0a0c',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.06)',
    overflow: 'hidden',
  },
  emptySlotBevel: {
    flex: 1,
    margin: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 2,
  },
  emptySlotDeep: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#080809',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.6)',
    borderLeftColor: 'rgba(0,0,0,0.5)',
    borderRightColor: 'rgba(191,163,93,0.03)',
    borderBottomColor: 'rgba(191,163,93,0.04)',
  },
  emptySlotDash: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.06)',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotQ: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.1)',
  },
  emptySlotLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.15)',
  },
  slamGlow: {
    position: 'absolute' as const,
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    backgroundColor: 'rgba(191,163,93,0.35)',
    zIndex: -1,
  },
  crackRing1: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.3)',
    zIndex: -1,
  },
  crackRing2: {
    position: 'absolute' as const,
    top: 5,
    left: 5,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    zIndex: -2,
  },
  filledSlotOuter: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(191,163,93,0.3)',
    overflow: 'hidden',
    backgroundColor: '#141416',
  },
  filledSlotReady: {
    borderColor: '#BFA35D',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  filledSlotBevel: {
    flex: 1,
    borderRadius: 19,
    overflow: 'hidden',
  },
  playerAvatar: {
    width: '100%',
    height: '100%',
  },
  playerAvatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitial: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  playerInitialReady: {
    color: '#141416',
  },
  hostCrown: {
    position: 'absolute' as const,
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(20,20,22,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  readyCheckmark: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#141416',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
    textAlign: 'center' as const,
  },
  playerNameReady: {
    color: '#BFA35D',
  },
  playerStatus: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.2)',
    letterSpacing: 1,
  },
  playerStatusReady: {
    color: 'rgba(191,163,93,0.7)',
  },
  allReadyBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    overflow: 'hidden',
  },
  allReadyContent: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  allReadyText: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 2,
  },
  allReadySubtext: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  inactivityWarning: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.2)',
  },
  inactivityText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FF4444',
  },
  readySection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  readyBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    width: SCREEN_WIDTH - 40,
  },
  readyBtnActive: {
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  readyBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  readyBtnText: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 2,
  },
  readyBtnTextActive: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: '#141416',
    letterSpacing: 2,
  },
  cancelReadyBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelReadyText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#C06060',
  },
  rulesSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  ruleCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  ruleItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
  },
  ruleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  countdownOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
  },
  countdownBgPulse: {
    ...StyleSheet.absoluteFillObject,
  },
  countdownRing: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  countdownNumber: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 140,
    fontWeight: '900' as const,
    letterSpacing: -5,
  },
  countdownLabel: {
    position: 'absolute' as const,
    bottom: 120,
    fontSize: 16,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.4)',
    letterSpacing: 4,
  },
  goOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
  },
  goFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  goContent: {
    alignItems: 'center',
    gap: 8,
  },
  goText: {
    fontSize: 120,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 10,
  },
  goSubtext: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.5)',
    letterSpacing: 4,
  },
  racingScreen: {
    flex: 1,
    padding: 20,
  },
  racingHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingTop: 8,
  },
  racingTimer: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto' as any,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(232,220,200,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232,220,200,0.08)',
  },
  racingTimerText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.6)',
    fontVariant: ['tabular-nums'] as any,
  },
  racingPlayerNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  racingFinishedBadge: {
    fontSize: 12,
  },
  racingSurrenderedBadge: {
    fontSize: 12,
  },
  racingPlayerStats: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    marginTop: 4,
  },
  racingPaceText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  racingTimeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'] as any,
  },
  racingTimeDiff: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(192,96,96,0.7)',
  },
  racingGapText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#C06060',
    fontVariant: ['tabular-nums'] as any,
  },
  winnerBadge: {
    backgroundColor: 'rgba(191,163,93,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  winnerBadgeText: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  racingLiveBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: '#FF4444',
    letterSpacing: 1,
  },
  racingTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 2,
  },
  racingPlayers: {
    marginTop: 24,
    gap: 10,
  },
  racingPlayerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  racingPlayerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  racingPlayerInitial: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  racingPlayerInfo: {
    flex: 1,
  },
  racingPlayerName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 6,
  },
  racingProgressOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  racingProgressInner: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#BFA35D',
  },
  racingPlayerDist: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#BFA35D',
    minWidth: 50,
    textAlign: 'right' as const,
  },
  racingFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 10,
  },
  racingFooterText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  spectatorSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  spectatorToggleBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#1e1e20',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  spectatorToggleBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderColor: 'rgba(191,163,93,0.2)',
  },
  spectatorToggleInfo: {
    flex: 1,
  },
  spectatorToggleTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  spectatorToggleTitleActive: {
    color: '#BFA35D',
  },
  spectatorToggleDesc: {
    fontSize: 11,
    color: 'rgba(232,220,200,0.2)',
    marginTop: 3,
  },
  surrenderBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(192,96,96,0.2)',
  },
  surrenderBtnText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#C06060',
    letterSpacing: 2,
  },
  surrenderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 24,
  },
  surrenderCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e1e20',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(192,96,96,0.2)',
  },
  surrenderIconWrap: {
    marginBottom: 20,
  },
  surrenderIconInner: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,68,68,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surrenderTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#FF4444',
    letterSpacing: 3,
    marginBottom: 12,
  },
  surrenderDesc: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 24,
  },
  surrenderDescBold: {
    fontWeight: '700' as const,
    color: '#C06060',
  },
  surrenderBtns: {
    width: '100%',
    gap: 10,
  },
  surrenderCancelBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  surrenderCancelText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 1,
  },
  surrenderConfirmBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(192,96,96,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.3)',
  },
  surrenderConfirmText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#C06060',
  },
  victoryOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
    padding: 24,
  },
  victoryRing: {
    position: 'absolute' as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#BFA35D',
  },
  victoryGlow: {
    position: 'absolute' as const,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  victoryTrophy: {
    marginBottom: 32,
  },
  victoryTrophyInner: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 3,
    borderColor: 'rgba(191,163,93,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  victorySparkles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  sparkle: {
    position: 'absolute' as const,
  },
  sparkleText: {
    fontSize: 24,
  },
  victoryTextWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  victoryLabel: {
    fontSize: 52,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 8,
  },
  victorySubLabel: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.6)',
    letterSpacing: 4,
    marginTop: 4,
  },
  victoryDivider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(191,163,93,0.2)',
    marginVertical: 16,
    borderRadius: 1,
  },
  victoryOpponent: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.4)',
    textAlign: 'center' as const,
  },
  victoryBtnWrap: {
    width: '100%',
    paddingHorizontal: 20,
  },
  victoryBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  victoryBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  victoryBtnText: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#141416',
    letterSpacing: 3,
  },
  defeatOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
    padding: 24,
  },
  defeatIcon: {
    marginBottom: 28,
  },
  defeatIconInner: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(192,96,96,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(192,96,96,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defeatTextWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  defeatLabel: {
    fontSize: 42,
    fontWeight: '900' as const,
    color: '#C06060',
    letterSpacing: 5,
  },
  defeatSubLabel: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: 'rgba(192,96,96,0.5)',
    letterSpacing: 3,
    marginTop: 4,
  },
  defeatDivider: {
    width: 50,
    height: 2,
    backgroundColor: 'rgba(192,96,96,0.15)',
    marginVertical: 16,
    borderRadius: 1,
  },
  defeatDesc: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(232,220,200,0.35)',
    textAlign: 'center' as const,
    lineHeight: 21,
  },
  defeatBtnWrap: {
    width: '100%',
    paddingHorizontal: 20,
  },
  defeatBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: '#1e1e20',
    borderWidth: 1.5,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  defeatBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.5)',
    letterSpacing: 2,
  },
});
