import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Shield,
  Flame,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Target,
  MapPin,
  Dumbbell,
  Swords,
  Timer,
  Snowflake,
  Mountain,
  ChevronLeft,
  Plus,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { Trupp, SportCategory } from '@/constants/kaderschmiede';

const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Wandern: Mountain,
};

function TruppCard({ trupp, isMember, onJoin, onLeave, onPress }: {
  trupp: Trupp;
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onPress: () => void;
}) {
  const SportIcon = SPORT_ICON_MAP[trupp.sport] ?? Dumbbell;
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
        style={[styles.truppCard, isMember && styles.truppCardMember]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.truppHeader}>
          {trupp.logoUrl ? (
            <Image source={{ uri: trupp.logoUrl }} style={styles.truppLogo} />
          ) : (
            <View style={styles.truppIconWrap}>
              <SportIcon size={22} color="#BFA35D" />
            </View>
          )}
          <View style={styles.truppHeaderInfo}>
            <View style={styles.truppNameRow}>
              <Text style={styles.truppName} numberOfLines={1}>{trupp.name}</Text>
              {trupp.isOpen ? (
                <Unlock size={12} color="rgba(191,163,93,0.4)" />
              ) : (
                <Lock size={12} color="rgba(192,96,96,0.6)" />
              )}
            </View>
            <Text style={styles.truppMotto} numberOfLines={1}>„{trupp.motto}"</Text>
          </View>
        </View>

        <View style={styles.truppStats}>
          <View style={styles.truppStatItem}>
            <Users size={13} color="rgba(191,163,93,0.5)" />
            <Text style={styles.truppStatText}>{trupp.memberIds.length} Mitglieder</Text>
          </View>
          <View style={styles.truppStatItem}>
            <MapPin size={13} color="rgba(191,163,93,0.5)" />
            <Text style={styles.truppStatText}>{trupp.city}</Text>
          </View>
          <View style={styles.truppStatItem}>
            <Flame size={13} color="#BFA35D" />
            <Text style={[styles.truppStatText, { color: '#BFA35D' }]}>{trupp.streak} Wochen Streak</Text>
          </View>
        </View>

        <View style={styles.truppGoal}>
          <Target size={13} color="rgba(191,163,93,0.6)" />
          <Text style={styles.truppGoalText}>Wochenziel: {trupp.weeklyGoal}</Text>
        </View>

        <View style={styles.truppMembersPreview}>
          {trupp.memberIds.slice(0, 5).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.memberDot,
                { marginLeft: idx > 0 ? -6 : 0, zIndex: 5 - idx },
              ]}
            >
              <Text style={styles.memberDotText}>
                {String.fromCharCode(65 + idx)}
              </Text>
            </View>
          ))}
          {trupp.memberIds.length > 5 && (
            <Text style={styles.moreMembers}>+{trupp.memberIds.length - 5}</Text>
          )}
          <View style={styles.truppAction}>
            {isMember ? (
              <Pressable style={styles.leaveTruppBtn} onPress={onLeave} hitSlop={8}>
                <UserMinus size={14} color="#C06060" />
                <Text style={styles.leaveTruppText}>Verlassen</Text>
              </Pressable>
            ) : trupp.isOpen ? (
              <Pressable style={styles.joinTruppBtn} onPress={onJoin} hitSlop={8}>
                <UserPlus size={14} color="#BFA35D" />
                <Text style={styles.joinTruppText}>Beitreten</Text>
              </Pressable>
            ) : (
              <View style={styles.closedBadge}>
                <Lock size={12} color="rgba(232,220,200,0.3)" />
                <Text style={styles.closedText}>Geschlossen</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function TruppsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trupps, myTrupps, joinTrupp, leaveTrupp } = useKaderschmiede();
  const [tab, setTab] = useState<'alle' | 'meine'>('alle');

  const displayTrupps = tab === 'meine' ? myTrupps : trupps;

  return (
    <View style={styles.container}>
      <View style={[styles.customHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Trupps</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(tabs)/kaderschmiede/create-trupp' as any)} hitSlop={12}>
          <Plus size={20} color="#BFA35D" />
        </Pressable>
      </View>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, tab === 'alle' && styles.tabActive]}
          onPress={() => setTab('alle')}
        >
          <Shield size={14} color={tab === 'alle' ? '#1c1c1e' : 'rgba(191,163,93,0.5)'} />
          <Text style={[styles.tabText, tab === 'alle' && styles.tabTextActive]}>Alle Trupps</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'meine' && styles.tabActive]}
          onPress={() => setTab('meine')}
        >
          <Users size={14} color={tab === 'meine' ? '#1c1c1e' : 'rgba(191,163,93,0.5)'} />
          <Text style={[styles.tabText, tab === 'meine' && styles.tabTextActive]}>
            Meine ({myTrupps.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayTrupps.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={40} color="rgba(191,163,93,0.2)" />
            <Text style={styles.emptyTitle}>
              {tab === 'meine' ? 'Du bist noch in keinem Trupp' : 'Keine Trupps gefunden'}
            </Text>
            <Text style={styles.emptySubtext}>
              {tab === 'meine'
                ? 'Tritt einem offenen Trupp bei oder gründe deinen eigenen!'
                : 'Gründe den ersten Trupp in deiner Region.'}
            </Text>
          </View>
        ) : (
          displayTrupps.map(trupp => (
            <TruppCard
              key={trupp.id}
              trupp={trupp}
              isMember={trupp.memberIds.includes(user?.id ?? '')}
              onJoin={() => joinTrupp(trupp.id)}
              onLeave={() => leaveTrupp(trupp.id)}
              onPress={() => router.push({ pathname: '/(tabs)/kaderschmiede/trupp-detail', params: { id: trupp.id } } as any)}
            />
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
  addBtn: {
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
  truppCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  truppCardMember: {
    borderColor: 'rgba(191,163,93,0.2)',
    borderWidth: 1.5,
  },
  truppHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  truppIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  truppLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  truppHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  truppNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  truppName: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    flex: 1,
  },
  truppMotto: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 2,
  },
  truppStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  truppStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  truppStatText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  truppGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.05)',
    marginBottom: 12,
  },
  truppGoalText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.6)',
  },
  truppMembersPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 2,
    borderColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDotText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  moreMembers: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
    marginLeft: 6,
  },
  truppAction: {
    marginLeft: 'auto',
  },
  joinTruppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  joinTruppText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  leaveTruppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  leaveTruppText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#C06060',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(42,42,46,0.5)',
  },
  closedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.3)',
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
