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
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LobbyPhase = 'setup' | 'waiting' | 'countdown' | 'go' | 'racing' | 'finished';
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
    console.log('[LOBBY] Race started! Distance:', distance);
  }, [distance]);

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

  if (phase === 'racing') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1a1917', '#141416']} style={styles.racingScreen}>
          <View style={styles.racingHeader}>
            <View style={styles.racingLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.racingTitle}>{(distance / 1000).toFixed(0)}K CHALLENGE</Text>
          </View>

          <RoutePreview distance={distance} isActive={true} />

          <View style={styles.racingPlayers}>
            {players.map((p, i) => (
              <View key={p.id} style={styles.racingPlayerRow}>
                <View style={styles.racingPlayerAvatar}>
                  <Text style={styles.racingPlayerInitial}>
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.racingPlayerInfo}>
                  <Text style={styles.racingPlayerName}>{p.name}</Text>
                  <View style={styles.racingProgressOuter}>
                    <Animated.View style={[styles.racingProgressInner, { width: `${20 + i * 15}%` }]} />
                  </View>
                </View>
                <Text style={styles.racingPlayerDist}>{Math.round((20 + i * 15) / 100 * distance)}m</Text>
              </View>
            ))}
          </View>

          <View style={styles.racingFooter}>
            <Text style={styles.racingFooterText}>GPS-Tracking aktiv</Text>
            <MapPin size={14} color="rgba(191,163,93,0.5)" />
          </View>
        </LinearGradient>
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
    marginBottom: 24,
    paddingTop: 8,
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
});
