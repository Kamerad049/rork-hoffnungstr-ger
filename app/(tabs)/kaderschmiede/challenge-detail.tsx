import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Users,
  Swords,
  Flame,
  Trophy,
  UserPlus,
  Check,
  ChevronRight,
  Dumbbell,
  Timer,
  Snowflake,
  Waves,
  Mountain,
  Leaf,
  Activity,
  Clock,
  Plus,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { SportCategory, ChallengeType } from '@/constants/kaderschmiede';


const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Schwimmen: Waves,
  Wandern: Mountain,
  Yoga: Leaf,
  Sonstiges: Activity,
};

const TYPE_LABELS: Record<ChallengeType, string> = {
  '1v1': '1 gegen 1',
  'Gruppe': 'Gruppen-Challenge',
  'Stadt': 'Stadt-Duell',
  'Bundesland': 'Bundesland-Duell',
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getChallengeById, joinChallenge, getMemberName } = useKaderschmiede();

  const challenge = getChallengeById(id ?? '');
  const userId = user?.id ?? '';
  const isParticipant = challenge?.participantIds.includes(userId) ?? false;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const totalProgress = challenge?.results.reduce((sum, r) => sum + r.value, 0) ?? 0;
  const progressPct = challenge ? Math.min((totalProgress / challenge.goal) * 100, 100) : 0;
  const daysLeft = challenge ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000)) : 0;
  const totalDays = challenge ? Math.ceil((new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / 86400000) : 0;
  const daysPassed = totalDays - daysLeft;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: progressPct, duration: 1200, useNativeDriver: false }),
    ]).start();
  }, [progressPct]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const SportIcon = challenge ? (SPORT_ICON_MAP[challenge.sport] ?? Activity) : Activity;
  const sortedResults = challenge ? [...challenge.results].sort((a, b) => b.value - a.value) : [];

  const handleMemberPress = useCallback((memberId: string) => {
    console.log('[CHALLENGE-DETAIL] Navigate to user profile:', memberId);
    router.push({ pathname: '/user-profile', params: { userId: memberId } } as any);
  }, [router]);

  if (!challenge) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color="#BFA35D" />
          </Pressable>
          <Text style={styles.headerTitle}>Challenge</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.emptyState}>
          <Swords size={40} color="rgba(191,163,93,0.2)" />
          <Text style={styles.emptyText}>Challenge nicht gefunden</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#1e1d1a', '#191817', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft size={22} color="#BFA35D" />
            </Pressable>
            <View style={styles.backBtn} />
          </View>

          <Animated.View style={[styles.heroContent, { opacity: fadeAnim }]}>
            <View style={styles.sportIconLarge}>
              <SportIcon size={28} color="#BFA35D" />
            </View>

            <View style={styles.typeBadge}>
              <Swords size={11} color="#BFA35D" />
              <Text style={styles.typeBadgeText}>{TYPE_LABELS[challenge.type]}</Text>
            </View>

            <Text style={styles.challengeTitle}>{challenge.title}</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatNum}>{daysLeft}</Text>
                <Text style={styles.heroStatLabel}>Tage übrig</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatNum}>{challenge.participantIds.length}</Text>
                <Text style={styles.heroStatLabel}>Teilnehmer</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatNum}>{Math.round(progressPct)}%</Text>
                <Text style={styles.heroStatLabel}>Fortschritt</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.descriptionText}>{challenge.description}</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Gesamtfortschritt</Text>
            <Text style={styles.progressValue}>
              {totalProgress.toLocaleString()} / {challenge.goal.toLocaleString()} {challenge.unit}
            </Text>
          </View>
          <View style={styles.progressBarOuter}>
            <Animated.View style={[styles.progressBarInner, { width: barWidth }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaText}>Tag {daysPassed} von {totalDays}</Text>
            <Text style={styles.progressMetaText}>
              {new Date(challenge.startDate).toLocaleDateString('de-DE')} - {new Date(challenge.endDate).toLocaleDateString('de-DE')}
            </Text>
          </View>
        </View>

        {!isParticipant && (
          <View style={styles.joinSection}>
            <Pressable style={styles.joinBtn} onPress={() => joinChallenge(challenge.id)}>
              <UserPlus size={18} color="#141416" />
              <Text style={styles.joinBtnText}>Challenge beitreten</Text>
            </Pressable>
          </View>
        )}

        {isParticipant && (
          <View style={styles.joinSection}>
            <View style={styles.participatingBadge}>
              <Check size={16} color="#BFA35D" />
              <Text style={styles.participatingText}>Du nimmst teil</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RANGLISTE</Text>
          {sortedResults.length === 0 ? (
            <View style={styles.noResults}>
              <Trophy size={24} color="rgba(191,163,93,0.2)" />
              <Text style={styles.noResultsText}>Noch keine Ergebnisse</Text>
            </View>
          ) : (
            sortedResults.map((result, idx) => {
              const name = getMemberName(result.userId);
              const pct = Math.round((result.value / challenge.goal) * 100);
              const isTop3 = idx < 3;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <Pressable
                  key={result.userId}
                  style={[styles.leaderRow, idx === 0 && styles.leaderRowFirst]}
                  onPress={() => handleMemberPress(result.userId)}
                >
                  <View style={[styles.positionBadge, idx === 0 && styles.positionBadgeGold]}>
                    {isTop3 ? (
                      <Text style={styles.medalText}>{medals[idx]}</Text>
                    ) : (
                      <Text style={styles.positionText}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={styles.leaderAvatar}>
                    <Text style={styles.leaderAvatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderName}>{name}</Text>
                    <View style={styles.leaderBarOuter}>
                      <View style={[styles.leaderBarInner, { width: `${Math.min(pct, 100)}%` }]} />
                    </View>
                  </View>
                  <View style={styles.leaderValueWrap}>
                    <Text style={[styles.leaderValue, idx === 0 && styles.leaderValueGold]}>
                      {result.value.toLocaleString()}
                    </Text>
                    <Text style={styles.leaderUnit}>{challenge.unit}</Text>
                  </View>
                  <ChevronRight size={14} color="rgba(191,163,93,0.2)" />
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ALLE TEILNEHMER ({challenge.participantIds.length})</Text>
          <View style={styles.participantsGrid}>
            {challenge.participantIds.map((pId) => {
              const name = getMemberName(pId);
              const hasResult = challenge.results.some(r => r.userId === pId);
              return (
                <Pressable
                  key={pId}
                  style={styles.participantChip}
                  onPress={() => handleMemberPress(pId)}
                >
                  <View style={styles.participantChipAvatar}>
                    <Text style={styles.participantChipAvatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.participantChipName} numberOfLines={1}>{name}</Text>
                  {hasResult && <Check size={10} color="#BFA35D" />}
                </Pressable>
              );
            })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#141416',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: 1,
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
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  sportIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  challengeTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,46,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  heroStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(191,163,93,0.1)',
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
    marginTop: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 23,
    paddingTop: 16,
  },
  progressSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  progressBarOuter: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 5,
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
  joinSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  participatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  participatingText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.04)',
    gap: 10,
  },
  leaderRowFirst: {
    borderColor: 'rgba(191,163,93,0.15)',
    backgroundColor: 'rgba(191,163,93,0.04)',
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(42,42,46,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadgeGold: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  medalText: {
    fontSize: 14,
  },
  positionText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
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
  leaderValueWrap: {
    alignItems: 'flex-end',
  },
  leaderValue: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  leaderValueGold: {
    color: '#BFA35D',
  },
  leaderUnit: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.35)',
    marginTop: -1,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.3)',
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.04)',
  },
  participantChipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantChipAvatarText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  participantChipName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
    maxWidth: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
  },
});
