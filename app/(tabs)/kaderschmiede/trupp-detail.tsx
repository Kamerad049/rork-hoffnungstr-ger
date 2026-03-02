import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Users,
  MapPin,
  Flame,
  Target,
  Clock,
  Calendar,
  Shield,
  Crown,
  UserPlus,
  UserMinus,
  Lock,
  ChevronRight,
  Dumbbell,
  Swords,
  Timer,
  Snowflake,
  Waves,
  Mountain,
  Leaf,
  Activity,
  Check,
  X,
  Scan,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { SportCategory, TruppMember, TruppMeeting } from '@/constants/kaderschmiede';

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const day = days[d.getDay()];
  const date = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day}, ${date}.${month}. um ${hours}:${mins}`;
}

function formatRelativeDate(iso: string): string {
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

function MemberRow({ member, onPress }: { member: TruppMember; onPress: () => void }) {
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
        style={styles.memberRow}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{member.name}</Text>
            {member.role === 'leader' && (
              <View style={styles.leaderBadge}>
                <Crown size={10} color="#BFA35D" />
                <Text style={styles.leaderBadgeText}>Anführer</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberSince}>
            Dabei seit {new Date(member.joinedAt).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <ChevronRight size={16} color="rgba(191,163,93,0.3)" />
      </Pressable>
    </Animated.View>
  );
}

function MeetingCard({ meeting, truppId, isAttending, onAttend, onLeave, onCheckIn }: {
  meeting: TruppMeeting;
  truppId: string;
  isAttending: boolean;
  onAttend: () => void;
  onLeave: () => void;
  onCheckIn: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const isPast = new Date(meeting.dateTime).getTime() < Date.now();

  return (
    <Animated.View style={[styles.meetingCard, isPast && styles.meetingCardPast, { opacity: fadeAnim }]}>
      <View style={styles.meetingDateStrip}>
        <Text style={styles.meetingDateDay}>
          {new Date(meeting.dateTime).getDate()}
        </Text>
        <Text style={styles.meetingDateMonth}>
          {new Date(meeting.dateTime).toLocaleDateString('de-DE', { month: 'short' }).toUpperCase()}
        </Text>
      </View>
      <View style={styles.meetingContent}>
        <Text style={styles.meetingTitle}>{meeting.title}</Text>
        <Text style={styles.meetingDesc} numberOfLines={2}>{meeting.description}</Text>
        <View style={styles.meetingMeta}>
          <View style={styles.metaChip}>
            <Clock size={10} color="rgba(191,163,93,0.5)" />
            <Text style={styles.metaChipText}>{formatRelativeDate(meeting.dateTime)}</Text>
          </View>
          <View style={styles.metaChip}>
            <MapPin size={10} color="rgba(191,163,93,0.5)" />
            <Text style={styles.metaChipText}>{meeting.location}</Text>
          </View>
          <View style={styles.metaChip}>
            <Users size={10} color="rgba(191,163,93,0.5)" />
            <Text style={styles.metaChipText}>{meeting.attendeeIds.length}</Text>
          </View>
        </View>
      </View>
      {!isPast && (
        <View style={styles.meetingAction}>
          {isAttending && (
            <Pressable style={styles.checkInSmallBtn} onPress={onCheckIn} hitSlop={8}>
              <Scan size={14} color="#BFA35D" />
            </Pressable>
          )}
          {isAttending ? (
            <Pressable style={styles.attendingBtn} onPress={onLeave} hitSlop={8}>
              <Check size={14} color="#BFA35D" />
            </Pressable>
          ) : (
            <Pressable style={styles.attendBtn} onPress={onAttend} hitSlop={8}>
              <UserPlus size={14} color="#BFA35D" />
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
}

export default function TruppDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getTruppById, joinTrupp, leaveTrupp, attendMeeting, leaveMeeting } = useKaderschmiede();

  const trupp = getTruppById(id ?? '');
  const userId = user?.id ?? '';
  const isMember = trupp?.memberIds.includes(userId) ?? false;
  const isLeader = trupp?.leaderId === userId;

  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const SportIcon = trupp ? (SPORT_ICON_MAP[trupp.sport] ?? Activity) : Activity;

  const upcomingMeetings = useMemo(() => {
    if (!trupp) return [];
    return [...trupp.meetings]
      .filter(m => new Date(m.dateTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [trupp]);

  const pastMeetings = useMemo(() => {
    if (!trupp) return [];
    return [...trupp.meetings]
      .filter(m => new Date(m.dateTime).getTime() <= Date.now())
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [trupp]);

  const handleJoin = useCallback(() => {
    if (!trupp) return;
    if (!trupp.isOpen) {
      Alert.alert('Geschlossen', 'Dieser Trupp nimmt aktuell keine neuen Mitglieder auf.');
      return;
    }
    joinTrupp(trupp.id);
  }, [trupp, joinTrupp]);

  const handleLeave = useCallback(() => {
    if (!trupp || isLeader) {
      Alert.alert('Hinweis', 'Als Anführer kannst du den Trupp nicht verlassen.');
      return;
    }
    Alert.alert('Trupp verlassen', `Möchtest du "${trupp.name}" wirklich verlassen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Verlassen', style: 'destructive', onPress: () => leaveTrupp(trupp.id) },
    ]);
  }, [trupp, isLeader, leaveTrupp]);

  const handleMemberPress = useCallback((memberId: string) => {
    console.log('[TRUPP-DETAIL] Navigate to user profile:', memberId);
    router.push({ pathname: '/user-profile', params: { userId: memberId } } as any);
  }, [router]);

  if (!trupp) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color="#BFA35D" />
          </Pressable>
          <Text style={styles.headerTitle}>Trupp</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.emptyState}>
          <Shield size={40} color="rgba(191,163,93,0.2)" />
          <Text style={styles.emptyText}>Trupp nicht gefunden</Text>
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
          <View style={styles.heroPattern}>
            {[...Array(4)].map((_, i) => (
              <View
                key={i}
                style={[styles.heroLine, { top: 8 + i * 28, opacity: 0.02 + i * 0.005 }]}
              />
            ))}
          </View>

          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft size={22} color="#BFA35D" />
            </Pressable>
            <View style={styles.backBtn} />
          </View>

          <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
            {trupp.logoUrl ? (
              <Image source={{ uri: trupp.logoUrl }} style={styles.truppLogoLarge} />
            ) : (
              <View style={styles.truppIconLarge}>
                <SportIcon size={32} color="#BFA35D" />
              </View>
            )}
            <Text style={styles.truppName}>{trupp.name}</Text>
            <Text style={styles.truppMotto}>„{trupp.motto}"</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Users size={14} color="#BFA35D" />
                <Text style={styles.heroStatText}>{trupp.memberIds.length} Mitglieder</Text>
              </View>
              <View style={styles.heroDot} />
              <View style={styles.heroStat}>
                <MapPin size={14} color="#BFA35D" />
                <Text style={styles.heroStatText}>{trupp.city}</Text>
              </View>
              <View style={styles.heroDot} />
              <View style={styles.heroStat}>
                <Flame size={14} color="#BFA35D" />
                <Text style={styles.heroStatText}>{trupp.streak}W Streak</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, trupp.isOpen ? styles.statusOpen : styles.statusClosed]}>
                {trupp.isOpen ? <Shield size={12} color="#BFA35D" /> : <Lock size={12} color="#C06060" />}
                <Text style={[styles.statusText, trupp.isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
                  {trupp.isOpen ? 'Offen' : 'Geschlossen'}
                </Text>
              </View>
              <View style={styles.sportBadge}>
                <SportIcon size={12} color="#BFA35D" />
                <Text style={styles.sportBadgeText}>{trupp.sport}</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {!isMember ? (
          <View style={styles.joinSection}>
            {trupp.isOpen ? (
              <Pressable style={styles.joinLargeBtn} onPress={handleJoin}>
                <UserPlus size={18} color="#141416" />
                <Text style={styles.joinLargeBtnText}>Trupp beitreten</Text>
              </Pressable>
            ) : (
              <View style={styles.closedNotice}>
                <Lock size={16} color="rgba(232,220,200,0.4)" />
                <Text style={styles.closedNoticeText}>
                  Dieser Trupp ist geschlossen. Kontaktiere den Anführer für eine Einladung.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.joinSection}>
            <View style={styles.memberNotice}>
              <Check size={16} color="#BFA35D" />
              <Text style={styles.memberNoticeText}>Du bist Mitglied</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ÜBER DEN TRUPP</Text>
          <Text style={styles.descriptionText}>{trupp.description}</Text>
          <View style={styles.goalRow}>
            <Target size={14} color="#BFA35D" />
            <Text style={styles.goalText}>Wochenziel: {trupp.weeklyGoal}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NÄCHSTE TREFFEN</Text>
          {upcomingMeetings.length === 0 ? (
            <View style={styles.noMeetings}>
              <Calendar size={24} color="rgba(191,163,93,0.2)" />
              <Text style={styles.noMeetingsText}>Keine Treffen geplant</Text>
            </View>
          ) : (
            upcomingMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                truppId={trupp.id}
                isAttending={meeting.attendeeIds.includes(userId)}
                onAttend={() => attendMeeting(trupp.id, meeting.id)}
                onLeave={() => leaveMeeting(trupp.id, meeting.id)}
                onCheckIn={() => {
                  router.push({
                    pathname: '/(tabs)/kaderschmiede/checkin',
                    params: {
                      type: 'meeting',
                      sessionId: meeting.id,
                      participantIds: JSON.stringify(meeting.attendeeIds),
                    },
                  } as any);
                }}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MITGLIEDER ({trupp.members.length})</Text>
          {trupp.members
            .sort((a, b) => (a.role === 'leader' ? -1 : b.role === 'leader' ? 1 : 0))
            .map(member => (
              <MemberRow
                key={member.id}
                member={member}
                onPress={() => handleMemberPress(member.id)}
              />
            ))}
        </View>

        {isMember && !isLeader && (
          <View style={styles.section}>
            <Pressable style={styles.leaveBtn} onPress={handleLeave}>
              <UserMinus size={16} color="#C06060" />
              <Text style={styles.leaveBtnText}>Trupp verlassen</Text>
            </Pressable>
          </View>
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
    transform: [{ rotate: '-6deg' }],
  },
  heroContent: {
    alignItems: 'center',
  },
  truppIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  truppLogoLarge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
    marginBottom: 14,
  },
  truppName: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  truppMotto: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 4,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroStatText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  heroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(191,163,93,0.3)',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOpen: {
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  statusClosed: {
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  statusTextOpen: {
    color: '#BFA35D',
  },
  statusTextClosed: {
    color: '#C06060',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  joinSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  joinLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  joinLargeBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(232,220,200,0.4)',
    lineHeight: 18,
  },
  memberNotice: {
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
  memberNoticeText: {
    fontSize: 14,
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
    fontSize: 14,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 22,
    marginBottom: 14,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.7)',
  },
  meetingCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    overflow: 'hidden',
  },
  meetingCardPast: {
    opacity: 0.5,
  },
  meetingDateStrip: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.08)',
    paddingVertical: 12,
  },
  meetingDateDay: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  meetingDateMonth: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: -2,
  },
  meetingContent: {
    flex: 1,
    padding: 12,
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  meetingDesc: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.45)',
    lineHeight: 17,
    marginBottom: 8,
  },
  meetingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  meetingAction: {
    justifyContent: 'center',
    paddingRight: 12,
  },
  checkInSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendingBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMeetings: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noMeetingsText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.3)',
  },
  memberRow: {
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
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  leaderBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.35)',
    marginTop: 2,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
    marginTop: 8,
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#C06060',
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
