import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Newspaper,
  MapPin,
  UtensilsCrossed,
  FileText,
  Users,
  Bell,
  History,
  ChevronRight,
  Shield,
  Flag,
  ShieldCheck,
  Inbox,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { useModeration } from '@/providers/ModerationProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/constants/queryKeys';
import { ArrowLeft } from 'lucide-react-native';

interface AdminMenuItem {
  icon: React.ReactNode;
  label: string;
  count: number;
  route: string;
}

export default function AdminDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { news, places, restaurants, posts, pushHistory, allUsers } = useAdmin();
  const { pendingReports, moderators } = useModeration();

  const submissionsQuery = useQuery({
    queryKey: queryKeys.submissions(),
    queryFn: async () => {
      const { data } = await supabase.from('submissions').select('id, status');
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
  const pendingSubmissions = (submissionsQuery.data ?? []).filter((s: any) => s.status === 'pending').length;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const statScaleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.stagger(100, statScaleAnims.map(anim =>
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      })
    )).start();
  }, []);

  useEffect(() => {
    if (pendingReports.length > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pendingReports.length]);

  const menuItems: AdminMenuItem[] = [
    {
      icon: <Newspaper size={20} color="#BFA35D" />,
      label: 'News',
      count: news.length,
      route: '/admin/news',
    },
    {
      icon: <MapPin size={20} color="#BFA35D" />,
      label: 'Orte',
      count: places.length,
      route: '/admin/places',
    },
    {
      icon: <UtensilsCrossed size={20} color="#BFA35D" />,
      label: 'Restaurants',
      count: restaurants.length,
      route: '/admin/restaurants',
    },
    {
      icon: <FileText size={20} color="#BFA35D" />,
      label: 'Beiträge',
      count: posts.length,
      route: '/admin/posts',
    },
    {
      icon: <Users size={20} color="#BFA35D" />,
      label: 'Nutzer',
      count: allUsers.length,
      route: '/admin/users',
    },
  ];

  const statItems = [
    { label: 'Inhalte', value: news.length + places.length + restaurants.length },
    { label: 'Nutzer', value: allUsers.length },
    { label: 'Meldungen', value: pendingReports.length, isAlert: pendingReports.length > 0 },
    { label: 'Einsend.', value: pendingSubmissions, isAlert: pendingSubmissions > 0 },
  ];

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={[
          styles.backButton,
          { top: insets.top + 8 },
        ]}
      >
        <ArrowLeft size={20} color="#BFA35D" />
      </Pressable>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View style={{ opacity: headerFadeAnim }}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={styles.heroSection}
        >
          <View style={styles.heroPattern}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heroLine,
                  {
                    top: 20 + i * 28,
                    opacity: 0.03 + i * 0.005,
                    transform: [{ rotate: '-12deg' }],
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.heroIconWrap}>
            <View style={styles.heroIconInner}>
              <Shield size={30} color="#BFA35D" />
            </View>
          </View>
          <Text style={styles.heroTitle}>Admin Panel</Text>
          <Text style={styles.heroSub}>Verwalte alle Inhalte deiner App</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statsBar}>
        {statItems.map((stat, idx) => (
          <Animated.View
            key={stat.label}
            style={[
              styles.statItem,
              { transform: [{ scale: statScaleAnims[idx] }] },
            ]}
          >
            <View style={styles.statItemInner}>
              <Text style={[
                styles.statValue,
                stat.isAlert ? { color: '#C06060' } : undefined,
              ]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
            {idx < statItems.length - 1 && <View style={styles.statDivider} />}
          </Animated.View>
        ))}
      </View>

      <View style={styles.cardsSection}>
        <Pressable
          onPress={() => router.push('/admin/reports' as any)}
          testID="admin-reports-btn"
        >
          <Animated.View
            style={[
              styles.reportCard,
              pendingReports.length > 0
                ? { backgroundColor: '#C06060', transform: [{ scale: pulseAnim }] }
                : { backgroundColor: '#1e1e20' },
            ]}
          >
            <View style={styles.cardInner}>
              <View style={[
                styles.cardIconWrap,
                { backgroundColor: pendingReports.length > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(192,96,96,0.15)' },
              ]}>
                <Flag size={22} color={pendingReports.length > 0 ? '#fff' : '#C06060'} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={[
                  styles.cardTitle,
                  { color: pendingReports.length > 0 ? '#fff' : '#E8DCC8' },
                ]}>
                  Meldungen
                </Text>
                <Text style={[
                  styles.cardSub,
                  { color: pendingReports.length > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(191,163,93,0.5)' },
                ]}>
                  {pendingReports.length > 0 ? `${pendingReports.length} offene Meldungen` : 'Keine offenen Meldungen'}
                </Text>
              </View>
              <ChevronRight size={18} color={pendingReports.length > 0 ? '#fff' : 'rgba(191,163,93,0.4)'} />
            </View>
          </Animated.View>
        </Pressable>

        <Pressable
          style={styles.modCard}
          onPress={() => router.push('/admin/moderators' as any)}
          testID="admin-moderators-btn"
        >
          <ShieldCheck size={18} color="#E8A44E" />
          <Text style={styles.modCardText}>Moderatoren verwalten</Text>
          <Text style={styles.modCardCount}>{moderators.length}</Text>
          <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
        </Pressable>

        <Pressable
          onPress={() => router.push('/admin/submissions' as any)}
          testID="admin-submissions-btn"
        >
          <View
            style={[
              styles.reportCard,
              pendingSubmissions > 0
                ? { backgroundColor: '#2a5a2a', borderColor: 'rgba(76,175,80,0.3)' }
                : { backgroundColor: '#1e1e20' },
            ]}
          >
            <View style={styles.cardInner}>
              <View style={[styles.cardIconWrap, { backgroundColor: pendingSubmissions > 0 ? 'rgba(76,175,80,0.2)' : 'rgba(191,163,93,0.1)' }]}>
                <Inbox size={22} color={pendingSubmissions > 0 ? '#4CAF50' : '#BFA35D'} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={[styles.cardTitle, { color: '#E8DCC8' }]}>Einsendungen</Text>
                <Text style={[styles.cardSub, { color: pendingSubmissions > 0 ? 'rgba(76,175,80,0.7)' : 'rgba(191,163,93,0.5)' }]}>
                  {pendingSubmissions > 0 ? `${pendingSubmissions} offene Empfehlungen` : 'Keine offenen Empfehlungen'}
                </Text>
              </View>
              <ChevronRight size={18} color={pendingSubmissions > 0 ? 'rgba(76,175,80,0.6)' : 'rgba(191,163,93,0.4)'} />
            </View>
          </View>
        </Pressable>

        <Pressable
          style={styles.pushCard}
          onPress={() => router.push('/admin/push' as any)}
          testID="admin-push-btn"
        >
          <View style={styles.cardInner}>
            <View style={styles.pushIconWrap}>
              <Bell size={22} color="#1c1c1e" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.pushTitle}>Push-Nachricht senden</Text>
              <Text style={styles.pushSub}>Audio aufnehmen & an Nutzer senden</Text>
            </View>
            <ChevronRight size={18} color="#1c1c1e" />
          </View>
        </Pressable>

        <Pressable
          style={styles.historyCard}
          onPress={() => router.push('/admin/push-history' as any)}
        >
          <History size={18} color="#BFA35D" />
          <Text style={styles.historyText}>Push-Verlauf anzeigen</Text>
          <Text style={styles.historyCount}>{pushHistory.length}</Text>
          <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Inhalte verwalten</Text>

      {menuItems.map((item) => (
        <Pressable
          key={item.label}
          style={styles.menuItem}
          onPress={() => router.push(item.route as any)}
        >
          <View style={styles.menuIconWrap}>
            {item.icon}
          </View>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{item.count}</Text>
          </View>
          <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
        </Pressable>
      ))}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  content: {
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
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
    paddingTop: 120,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
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
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.5)',
    fontWeight: '500' as const,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -1,
    backgroundColor: '#1e1e20',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItemInner: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statLabel: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statDivider: {
    position: 'absolute',
    right: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  cardsSection: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  reportCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  modCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  modCardCount: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.5)',
  },
  pushCard: {
    backgroundColor: '#BFA35D',
    borderRadius: 16,
    padding: 16,
  },
  pushIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(28,28,30,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  pushSub: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.65)',
    marginTop: 2,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  historyCount: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.5)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
});
