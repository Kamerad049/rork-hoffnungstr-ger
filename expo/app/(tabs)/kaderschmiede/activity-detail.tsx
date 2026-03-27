import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Users,
  MapPin,
  Clock,
  Calendar,
  UserPlus,
  UserMinus,
  ChevronRight,
  Dumbbell,
  Swords,
  Timer,
  Snowflake,
  Mountain,
  Repeat,
  Zap,
  Shield,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { SportCategory } from '@/constants/kaderschmiede';


const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Wandern: Mountain,
};

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} um ${hours}:${mins} Uhr`;
}

function formatRelative(iso: string): string {
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

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getActivityById, joinActivity, leaveActivity, getMemberName } = useKaderschmiede();

  const activity = getActivityById(id ?? '');
  const userId = user?.id ?? '';
  const isJoined = activity?.participants.includes(userId) ?? false;
  const isFull = activity ? activity.participants.length >= activity.maxParticipants : false;
  const spotsLeft = activity ? activity.maxParticipants - activity.participants.length : 0;
  const isPast = activity ? new Date(activity.dateTime).getTime() < Date.now() : false;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const SportIcon = activity ? (SPORT_ICON_MAP[activity.type] ?? Dumbbell) : Dumbbell;

  const handleMemberPress = useCallback((memberId: string) => {
    console.log('[ACTIVITY-DETAIL] Navigate to user profile:', memberId);
    router.push({ pathname: '/user-profile', params: { userId: memberId } } as any);
  }, [router]);

  if (!activity) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color="#BFA35D" />
          </Pressable>
          <Text style={styles.headerTitle}>Aktivität</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.emptyState}>
          <Zap size={40} color="rgba(191,163,93,0.2)" />
          <Text style={styles.emptyText}>Aktivität nicht gefunden</Text>
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

            <View style={styles.badgeRow}>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>{activity.type}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{activity.level}</Text>
              </View>
              {activity.isRecurring && (
                <View style={styles.recurBadge}>
                  <Repeat size={10} color="rgba(191,163,93,0.6)" />
                  <Text style={styles.recurBadgeText}>Wiederkehrend</Text>
                </View>
              )}
            </View>

            <Text style={styles.activityTitle}>{activity.title}</Text>

            <View style={styles.relativeTime}>
              <Text style={styles.relativeTimeText}>{formatRelative(activity.dateTime)}</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.descriptionText}>{activity.description}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Calendar size={18} color="#BFA35D" />
            <Text style={styles.infoLabel}>Wann</Text>
            <Text style={styles.infoValue}>{formatFullDate(activity.dateTime)}</Text>
          </View>
          <View style={styles.infoCard}>
            <MapPin size={18} color="#BFA35D" />
            <Text style={styles.infoLabel}>Wo</Text>
            <Text style={styles.infoValue}>{activity.city}, {activity.bundesland}</Text>
          </View>
          <View style={styles.infoCard}>
            <Users size={18} color="#BFA35D" />
            <Text style={styles.infoLabel}>Plätze</Text>
            <Text style={styles.infoValue}>
              {activity.participants.length}/{activity.maxParticipants}
              {spotsLeft <= 2 && spotsLeft > 0 ? ' (fast voll!)' : ''}
            </Text>
          </View>
        </View>

        {!isPast && (
          <View style={styles.joinSection}>
            {isJoined ? (
              <View style={styles.joinActionColumn}>
                <Pressable
                  style={styles.checkInBtn}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/kaderschmiede/checkin',
                      params: {
                        type: 'activity',
                        sessionId: activity.id,
                        participantIds: JSON.stringify(activity.participants),
                      },
                    } as any);
                  }}
                >
                  <Shield size={18} color="#141416" />
                  <Text style={styles.checkInBtnText}>Teilnehmer Check-In</Text>
                </Pressable>
                <Pressable
                  style={styles.leaveActivityBtn}
                  onPress={() => leaveActivity(activity.id)}
                >
                  <UserMinus size={18} color="#C06060" />
                  <Text style={styles.leaveActivityBtnText}>Abmelden</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.joinActivityBtn, isFull && styles.joinActivityBtnDisabled]}
                onPress={isFull ? undefined : () => joinActivity(activity.id)}
              >
                <UserPlus size={18} color={isFull ? 'rgba(20,20,22,0.4)' : '#141416'} />
                <Text style={[styles.joinActivityBtnText, isFull && styles.joinActivityBtnTextDisabled]}>
                  {isFull ? 'Ausgebucht' : 'Teilnehmen'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEILNEHMER ({activity.participants.length})</Text>
          {activity.participants.map((pId, idx) => {
            const name = getMemberName(pId);
            const isCreator = pId === activity.userId;
            return (
              <Pressable
                key={pId}
                style={styles.participantRow}
                onPress={() => handleMemberPress(pId)}
              >
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <View style={styles.participantNameRow}>
                    <Text style={styles.participantName}>{name}</Text>
                    {isCreator && (
                      <View style={styles.creatorBadge}>
                        <Text style={styles.creatorBadgeText}>Ersteller</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={16} color="rgba(191,163,93,0.3)" />
              </Pressable>
            );
          })}
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
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  sportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(232,220,200,0.06)',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  recurBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  recurBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 10,
  },
  relativeTime: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  relativeTimeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
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
  infoGrid: {
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    width: 48,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  joinSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  joinActionColumn: {
    gap: 10,
  },
  checkInBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  checkInBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  joinActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  joinActivityBtnDisabled: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  joinActivityBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  joinActivityBtnTextDisabled: {
    color: 'rgba(20,20,22,0.4)',
  },
  leaveActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  leaveActivityBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#C06060',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.04)',
    gap: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  participantInfo: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  creatorBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#BFA35D',
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
