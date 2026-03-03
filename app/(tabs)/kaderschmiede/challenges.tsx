import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Swords,
  Users,
  Clock,
  Flame,
  Trophy,
  Target,
  UserPlus,
  Check,
  MapPin,
  Dumbbell,
  Timer,
  Snowflake,
  Mountain,
  ChevronLeft,
  Plus,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { Challenge, ChallengeType, SportCategory } from '@/constants/kaderschmiede';

const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Wandern: Mountain,
};

const TYPE_LABELS: Record<ChallengeType, string> = {
  '1v1': '1 gegen 1',
  'Gruppe': 'Gruppen-Challenge',
  'Stadt': 'Stadt-Duell',
  'Bundesland': 'Bundesland-Duell',
};

function ChallengeDetailCard({ challenge, isParticipant, onJoin }: {
  challenge: Challenge;
  isParticipant: boolean;
  onJoin: () => void;
}) {
  const SportIcon = SPORT_ICON_MAP[challenge.sport] ?? Dumbbell;
  const totalProgress = challenge.results.reduce((sum, r) => sum + r.value, 0);
  const progressPct = Math.min((totalProgress / challenge.goal) * 100, 100);
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000));
  const totalDays = Math.ceil((new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / 86400000);
  const daysPassed = totalDays - daysLeft;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: progressPct, duration: 1200, useNativeDriver: false }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [progressPct]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const sortedResults = [...challenge.results].sort((a, b) => b.value - a.value);

  return (
    <Animated.View style={[styles.challengeCard, { opacity: fadeAnim }]}>
      <View style={styles.challengeTopRow}>
        <View style={styles.challengeSportWrap}>
          <SportIcon size={20} color="#BFA35D" />
        </View>
        <View style={styles.challengeTopInfo}>
          <View style={styles.challengeTypeBadge}>
            <Swords size={10} color="#BFA35D" />
            <Text style={styles.challengeTypeText}>{TYPE_LABELS[challenge.type]}</Text>
          </View>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
        </View>
        <View style={styles.daysLeftWrap}>
          <Text style={styles.daysLeftNum}>{daysLeft}</Text>
          <Text style={styles.daysLeftLabel}>Tage</Text>
        </View>
      </View>

      <Text style={styles.challengeDesc}>{challenge.description}</Text>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Fortschritt</Text>
          <Text style={styles.progressValue}>{Math.round(progressPct)}%</Text>
        </View>
        <View style={styles.progressBarOuter}>
          <Animated.View style={[styles.progressBarInner, { width: barWidth }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressMetaText}>
            {totalProgress.toLocaleString()} / {challenge.goal.toLocaleString()} {challenge.unit}
          </Text>
          <Text style={styles.progressMetaText}>
            Tag {daysPassed}/{totalDays}
          </Text>
        </View>
      </View>

      {sortedResults.length > 0 && (
        <View style={styles.leaderboard}>
          <Text style={styles.leaderboardTitle}>Rangliste</Text>
          {sortedResults.map((result, idx) => {
            const pct = Math.round((result.value / challenge.goal) * 100);
            const isTop = idx === 0;
            return (
              <View key={result.userId} style={styles.leaderRow}>
                <View style={[styles.positionBadge, isTop && styles.positionBadgeFirst]}>
                  <Text style={[styles.positionText, isTop && styles.positionTextFirst]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.leaderAvatar}>
                  <Text style={styles.leaderAvatarText}>
                    {result.userId.charAt(result.userId.length - 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.leaderInfo}>
                  <Text style={styles.leaderName}>Teilnehmer {idx + 1}</Text>
                  <View style={styles.leaderBarOuter}>
                    <View style={[styles.leaderBarInner, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                </View>
                <Text style={[styles.leaderValue, isTop && styles.leaderValueFirst]}>
                  {result.value.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.challengeFooter}>
        <View style={styles.participantInfo}>
          <Users size={13} color="rgba(191,163,93,0.5)" />
          <Text style={styles.participantText}>{challenge.participantIds.length} Teilnehmer</Text>
        </View>
        {isParticipant ? (
          <View style={styles.joinedBadge}>
            <Check size={14} color="#BFA35D" />
            <Text style={styles.joinedText}>Dabei</Text>
          </View>
        ) : (
          <Pressable style={styles.joinChallengeBtn} onPress={onJoin} hitSlop={8}>
            <UserPlus size={14} color="#BFA35D" />
            <Text style={styles.joinChallengeText}>Teilnehmen</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export default function ChallengesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChallenges, myChallenges, joinChallenge } = useKaderschmiede();
  const [tab, setTab] = useState<'aktiv' | 'meine'>('aktiv');

  const displayChallenges = tab === 'meine' ? myChallenges : activeChallenges;

  return (
    <View style={styles.container}>
      <View style={[styles.customHeader, { paddingTop: insets.top + 8 }]}> 
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenges</Text>
        <Pressable style={styles.backBtn} onPress={() => router.push('/(tabs)/kaderschmiede/create-challenge' as any)} hitSlop={12}>
          <Plus size={20} color="#BFA35D" />
        </Pressable>
      </View>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, tab === 'aktiv' && styles.tabActive]}
          onPress={() => setTab('aktiv')}
        >
          <Flame size={14} color={tab === 'aktiv' ? '#1c1c1e' : 'rgba(191,163,93,0.5)'} />
          <Text style={[styles.tabText, tab === 'aktiv' && styles.tabTextActive]}>
            Aktive ({activeChallenges.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'meine' && styles.tabActive]}
          onPress={() => setTab('meine')}
        >
          <Trophy size={14} color={tab === 'meine' ? '#1c1c1e' : 'rgba(191,163,93,0.5)'} />
          <Text style={[styles.tabText, tab === 'meine' && styles.tabTextActive]}>
            Meine ({myChallenges.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayChallenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Swords size={40} color="rgba(191,163,93,0.2)" />
            <Text style={styles.emptyTitle}>
              {tab === 'meine' ? 'Du nimmst an keiner Challenge teil' : 'Keine aktiven Challenges'}
            </Text>
            <Text style={styles.emptySubtext}>
              {tab === 'meine'
                ? 'Tritt einer Challenge bei und zeig was du drauf hast!'
                : 'Erstelle die erste Challenge und fordere andere heraus!'}
            </Text>
          </View>
        ) : (
          displayChallenges.map(ch => (
            <Pressable
              key={ch.id}
              onPress={() => router.push({ pathname: '/(tabs)/kaderschmiede/challenge-detail', params: { id: ch.id } } as any)}
            >
              <ChallengeDetailCard
                challenge={ch}
                isParticipant={ch.participantIds.includes(user?.id ?? '')}
                onJoin={() => joinChallenge(ch.id)}
              />
            </Pressable>
          ))
        )}
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#141416',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  tabActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  tabTextActive: {
    color: '#1c1c1e',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  challengeCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  challengeTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  challengeSportWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTopInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  challengeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.08)',
    marginBottom: 4,
  },
  challengeTypeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  challengeTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  daysLeftWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  daysLeftNum: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  daysLeftLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
    marginTop: -2,
  },
  challengeDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.5)',
    lineHeight: 19,
    marginBottom: 14,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#BFA35D',
  },
  progressBarOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#BFA35D',
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.35)',
  },
  leaderboard: {
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  leaderboardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.5)',
    marginBottom: 10,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  positionBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(42,42,46,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadgeFirst: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  positionText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  positionTextFirst: {
    color: '#BFA35D',
  },
  leaderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
    marginBottom: 3,
  },
  leaderBarOuter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.06)',
    overflow: 'hidden',
  },
  leaderBarInner: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.4)',
  },
  leaderValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.5)',
    minWidth: 45,
    textAlign: 'right',
  },
  leaderValueFirst: {
    color: '#BFA35D',
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  participantText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  joinChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  joinChallengeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  joinedText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.25)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
