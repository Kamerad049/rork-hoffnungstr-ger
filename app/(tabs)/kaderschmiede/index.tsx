import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Map,
  Users,
  Swords,
  Flame,
  ChevronRight,
  Clock,
  MapPin,
  Dumbbell,
  Snowflake,
  Timer,
  Mountain,
  Zap,
  Target,
  Play,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import GermanyMap from '@/components/GermanyMap';
import type { TrainingActivity, Challenge, SportCategory } from '@/constants/kaderschmiede';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Wandern: Mountain,
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffH < 0) return 'Vergangen';
  if (diffH < 1) return `In ${Math.floor(diffMs / 60000)} Min`;
  if (diffH < 24) return `In ${diffH}h`;
  if (diffD === 1) return 'Morgen';
  return `In ${diffD} Tagen`;
}

function AnimatedStatCard({ label, value, icon: Icon, delay }: { label: string; value: string; icon: React.ComponentType<any>; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.statIconWrap}>
        <Icon size={18} color="#BFA35D" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function ActivityCard({ activity, onPress }: { activity: TrainingActivity; onPress: () => void }) {
  const SportIcon = SPORT_ICON_MAP[activity.type] ?? Dumbbell;
  const spotsLeft = activity.maxParticipants - activity.participants.length;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.activityCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.activityHeader}>
          <View style={styles.sportBadge}>
            <SportIcon size={14} color="#BFA35D" />
            <Text style={styles.sportBadgeText}>{activity.type}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{activity.level}</Text>
          </View>
        </View>
        <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
        <Text style={styles.activityDesc} numberOfLines={2}>{activity.description}</Text>
        <View style={styles.activityMeta}>
          <View style={styles.metaItem}>
            <Clock size={12} color="rgba(191,163,93,0.6)" />
            <Text style={styles.metaText}>{formatDateTime(activity.dateTime)}</Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={12} color="rgba(191,163,93,0.6)" />
            <Text style={styles.metaText}>{activity.city}</Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={12} color="rgba(191,163,93,0.6)" />
            <Text style={styles.metaText}>
              {activity.participants.length}/{activity.maxParticipants}
              {spotsLeft <= 2 && spotsLeft > 0 ? ' 🔥' : ''}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const totalProgress = challenge.results.reduce((sum, r) => sum + r.value, 0);
  const progressPct = Math.min((totalProgress / challenge.goal) * 100, 100);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progressPct, duration: 1000, useNativeDriver: false }).start();
  }, [progressPct]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000));

  return (
    <View style={styles.challengeCard}>
      <View style={styles.challengeHeader}>
        <View style={styles.challengeTypeBadge}>
          <Swords size={12} color="#BFA35D" />
          <Text style={styles.challengeType}>{challenge.type}</Text>
        </View>
        <Text style={styles.challengeDays}>{daysLeft}d übrig</Text>
      </View>
      <Text style={styles.challengeTitle}>{challenge.title}</Text>
      <Text style={styles.challengeDesc} numberOfLines={2}>{challenge.description}</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: barWidth }]} />
        </View>
        <Text style={styles.progressText}>
          {totalProgress.toLocaleString()}/{challenge.goal.toLocaleString()} {challenge.unit}
        </Text>
      </View>
      <View style={styles.challengeFooter}>
        <Users size={12} color="rgba(191,163,93,0.5)" />
        <Text style={styles.challengeParticipants}>
          {challenge.participantIds.length} Teilnehmer
        </Text>
      </View>
    </View>
  );
}

export default function KaderschmiedeScreen() {
  const router = useRouter();
  const {
    upcomingActivities,
    activeChallenges,
    activitiesByBundesland,
    trupps,
    totalWorkouts,
    weeklyStreak,
    loadInitialData,
  } = useKaderschmiede();

  const insets = useSafeAreaInsets();
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInitialData();
    Animated.timing(heroAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const totalActivities = upcomingActivities.length;
  const totalTrupps = trupps.length;

  const handleBundeslandPress = useCallback((name: string) => {
    router.push({ pathname: '/(tabs)/kaderschmiede/map', params: { bundesland: name } } as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#1e1d1a', '#191817', '#141416']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroPattern}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heroLine,
                  { top: 10 + i * 22, opacity: 0.025 + i * 0.005, transform: [{ rotate: '-8deg' }] },
                ]}
              />
            ))}
          </View>

          <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
            <View style={styles.heroTitleRow}>
              <View style={styles.anvilIcon}>
                <Dumbbell size={24} color="#BFA35D" />
              </View>
              <View>
                <Text style={styles.heroTitle}>KADERSCHMIEDE</Text>
                <Text style={styles.heroSubtitle}>Gemeinsam stärker werden</Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.statsRow}>
            <AnimatedStatCard label="Aktivitäten" value={String(totalActivities)} icon={Zap} delay={100} />
            <AnimatedStatCard label="Trupps" value={String(totalTrupps)} icon={Users} delay={200} />
            <AnimatedStatCard label="Challenges" value={String(activeChallenges.length)} icon={Target} delay={300} />
            <AnimatedStatCard label="Streak" value={String(weeklyStreak)} icon={Flame} delay={400} />
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(tabs)/kaderschmiede/map' as any)}>
            <View style={styles.actionIconWrap}>
              <Map size={20} color="#BFA35D" />
            </View>
            <Text style={styles.actionText}>Karte</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(tabs)/kaderschmiede/trupps' as any)}>
            <View style={styles.actionIconWrap}>
              <Users size={20} color="#BFA35D" />
            </View>
            <Text style={styles.actionText}>Trupps</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(tabs)/kaderschmiede/challenges' as any)}>
            <View style={styles.actionIconWrap}>
              <Swords size={20} color="#BFA35D" />
            </View>
            <Text style={styles.actionText}>Challenges</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.lobbyBanner}
          onPress={() => router.push({ pathname: '/(tabs)/kaderschmiede/lobby', params: { mode: '1v1', distance: '1000' } } as any)}
        >
          <LinearGradient
            colors={['rgba(191,163,93,0.12)', 'rgba(191,163,93,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lobbyBannerGradient}
          >
            <View style={styles.lobbyBannerIcon}>
              <Play size={18} color="#BFA35D" />
            </View>
            <View style={styles.lobbyBannerContent}>
              <Text style={styles.lobbyBannerTitle}>1v1 CHALLENGE</Text>
              <Text style={styles.lobbyBannerSubtitle}>Fordere jemanden heraus – jetzt Lobby starten</Text>
            </View>
            <ChevronRight size={18} color="rgba(191,163,93,0.4)" />
          </LinearGradient>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AKTIVITÄTEN IN DEUTSCHLAND</Text>
          <View style={styles.mapContainer}>
            <GermanyMap
              activitiesByBundesland={activitiesByBundesland}
              onBundeslandPress={handleBundeslandPress}
              width={Math.min(SCREEN_WIDTH - 48, 320)}
              height={Math.min((SCREEN_WIDTH - 48) * 1.1, 360)}
            />
          </View>
          <Pressable
            style={styles.mapCta}
            onPress={() => router.push('/(tabs)/kaderschmiede/map' as any)}
          >
            <Text style={styles.mapCtaText}>Karte öffnen</Text>
            <ChevronRight size={16} color="#BFA35D" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nächste Aktivitäten</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/kaderschmiede/map' as any)}
              style={styles.seeAllBtn}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>Alle</Text>
              <ChevronRight size={16} color="#BFA35D" />
            </Pressable>
          </View>
          {upcomingActivities.slice(0, 4).map(act => (
            <ActivityCard key={act.id} activity={act} onPress={() => router.push({ pathname: '/(tabs)/kaderschmiede/activity-detail', params: { id: act.id } } as any)} />
          ))}
          {upcomingActivities.length === 0 && (
            <View style={styles.emptyState}>
              <Zap size={32} color="rgba(191,163,93,0.3)" />
              <Text style={styles.emptyText}>Noch keine Aktivitäten</Text>
              <Text style={styles.emptySubtext}>Erstelle die erste in deiner Region!</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktive Challenges</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/kaderschmiede/challenges' as any)}
              style={styles.seeAllBtn}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>Alle</Text>
              <ChevronRight size={16} color="#BFA35D" />
            </Pressable>
          </View>
          {activeChallenges.slice(0, 3).map(ch => (
            <Pressable key={ch.id} onPress={() => router.push({ pathname: '/(tabs)/kaderschmiede/challenge-detail', params: { id: ch.id } } as any)}>
              <ChallengeCard challenge={ch} />
            </Pressable>
          ))}
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
    paddingTop: 12,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroContent: {
    marginBottom: 20,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  anvilIcon: {
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
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.6)',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  lobbyBanner: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.15)',
    marginBottom: 4,
  },
  lobbyBannerGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  lobbyBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbyBannerContent: {
    flex: 1,
  },
  lobbyBannerTitle: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 1,
  },
  lobbyBannerSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(232,220,200,0.4)',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  mapContainer: {
    backgroundColor: 'rgba(28,28,30,0.8)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  mapCtaText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  activityCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(232,220,200,0.06)',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.5)',
    lineHeight: 18,
    marginBottom: 10,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.6)',
  },
  challengeCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  challengeType: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  challengeDays: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.5)',
    lineHeight: 18,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(191,163,93,0.1)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#BFA35D',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeParticipants: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.5)',
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.25)',
  },
});
