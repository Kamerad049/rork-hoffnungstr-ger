import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Gamepad2,
  Lock,
  Zap,
  Users,
  ChevronRight,
  Ghost,
  Grid3x3,
  Anchor,
  Clock,
  Star,
} from 'lucide-react-native';
import { GAME_DEFINITIONS } from '@/constants/games';
import type { GameDefinition } from '@/constants/games';

const GAME_ICONS: Record<string, React.ComponentType<any>> = {
  ghost: Ghost,
  grid: Grid3x3,
  anchor: Anchor,
};

function GameCard({ game, index }: { game: GameDefinition; index: number }) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: index * 120, useNativeDriver: true }),
    ]).start();
  }, []);

  const Icon = GAME_ICONS[game.icon] ?? Gamepad2;

  const handlePress = useCallback(() => {
    if (!game.available) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(tabs)/spiele/create-room', params: { gameType: game.type } } as any);
  }, [game]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
      <Pressable
        style={[styles.gameCard, !game.available && styles.gameCardDisabled]}
        onPress={handlePress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        testID={`game-card-${game.type}`}
      >
        <View style={styles.gameCardInner}>
          <View style={[styles.gameIconWrap, !game.available && styles.gameIconDisabled]}>
            <Icon size={28} color={game.available ? '#BFA35D' : 'rgba(232,220,200,0.25)'} />
          </View>
          <View style={styles.gameCardContent}>
            <View style={styles.gameCardHeader}>
              <Text style={[styles.gameCardTitle, !game.available && styles.textDisabled]}>{game.name}</Text>
              {!game.available && (
                <View style={styles.comingSoonBadge}>
                  <Lock size={10} color="rgba(232,220,200,0.4)" />
                  <Text style={styles.comingSoonText}>BALD</Text>
                </View>
              )}
            </View>
            <Text style={[styles.gameCardDesc, !game.available && styles.textDisabled]} numberOfLines={2}>
              {game.description}
            </Text>
            <View style={styles.gameCardMeta}>
              <View style={styles.metaChip}>
                <Users size={11} color="rgba(191,163,93,0.5)" />
                <Text style={styles.metaChipText}>{game.minPlayers}–{game.maxPlayers}</Text>
              </View>
              <View style={styles.metaChip}>
                <Clock size={11} color="rgba(191,163,93,0.5)" />
                <Text style={styles.metaChipText}>{game.estimatedDuration}</Text>
              </View>
            </View>
          </View>
          {game.available && <ChevronRight size={18} color="rgba(191,163,93,0.3)" />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function SpieleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#191816', '#16150f', '#141416']}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroPattern}>
            {[...Array(4)].map((_, i) => (
              <View
                key={i}
                style={[styles.heroLine, { top: 8 + i * 28, opacity: 0.02 + i * 0.008, transform: [{ rotate: '12deg' }] }]}
              />
            ))}
          </View>

          <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
            <View style={styles.heroTitleRow}>
              <View style={styles.heroIconWrap}>
                <Gamepad2 size={26} color="#BFA35D" />
              </View>
              <View>
                <Text style={styles.heroTitle}>SPIELE</Text>
                <Text style={styles.heroSubtitle}>Fordere deine Kameraden heraus</Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.modeCards}>
            <Pressable
              style={styles.modeCard}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/(tabs)/spiele/create-room', params: { gameType: 'shadow_cards' } } as any);
              }}
              testID="private-room-btn"
            >
              <LinearGradient
                colors={['rgba(191,163,93,0.14)', 'rgba(191,163,93,0.04)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeCardGradient}
              >
                <View style={styles.modeCardIcon}>
                  <Lock size={20} color="#BFA35D" />
                </View>
                <View style={styles.modeCardContent}>
                  <Text style={styles.modeCardTitle}>PRIVATER RAUM</Text>
                  <Text style={styles.modeCardSub}>Erstelle einen Raum und lade Freunde ein</Text>
                </View>
                <ChevronRight size={18} color="rgba(191,163,93,0.4)" />
              </LinearGradient>
            </Pressable>

            <Pressable style={[styles.modeCard, styles.modeCardDisabled]} disabled>
              <View style={styles.modeCardGradientDisabled}>
                <View style={[styles.modeCardIcon, styles.modeCardIconDisabled]}>
                  <Zap size={20} color="rgba(232,220,200,0.2)" />
                </View>
                <View style={styles.modeCardContent}>
                  <Text style={[styles.modeCardTitle, styles.textDisabled]}>SCHNELLSPIEL</Text>
                  <Text style={[styles.modeCardSub, styles.textDisabled]}>Matchmaking kommt bald</Text>
                </View>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>BALD</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Verfügbare Spiele</Text>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          </View>

          {GAME_DEFINITIONS.map((game, i) => (
            <GameCard key={game.type} game={game} index={i} />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Star size={18} color="rgba(191,163,93,0.5)" />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Neue Spiele folgen</Text>
              <Text style={styles.infoCardDesc}>
                Vier Gewinnt, Schiffe versenken und mehr – alle über dieselbe Lobby-Engine.
              </Text>
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
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroContent: {
    marginBottom: 20,
  },
  heroTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 14,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.6)',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  modeCards: {
    gap: 10,
  },
  modeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  modeCardDisabled: {
    borderColor: 'rgba(232,220,200,0.06)',
    opacity: 0.6,
  },
  modeCardGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  modeCardGradientDisabled: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: 'rgba(30,30,32,0.5)',
  },
  modeCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardIconDisabled: {
    backgroundColor: 'rgba(42,42,46,0.3)',
    borderColor: 'rgba(232,220,200,0.06)',
  },
  modeCardContent: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 1,
  },
  modeCardSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(232,220,200,0.4)',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BFA35D',
  },
  gameCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  gameCardDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(232,220,200,0.04)',
  },
  gameCardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  gameIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIconDisabled: {
    backgroundColor: 'rgba(42,42,46,0.3)',
    borderColor: 'rgba(232,220,200,0.04)',
  },
  gameCardContent: {
    flex: 1,
  },
  gameCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gameCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  gameCardDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.45)',
    lineHeight: 18,
    marginBottom: 8,
  },
  gameCardMeta: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  comingSoonBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(232,220,200,0.06)',
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.4)',
    letterSpacing: 1,
  },
  textDisabled: {
    color: 'rgba(232,220,200,0.2)',
  },
  infoCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.35)',
    lineHeight: 18,
  },
});
