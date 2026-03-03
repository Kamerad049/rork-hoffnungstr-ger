import React, { useRef, useEffect, useCallback } from 'react';
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
  Megaphone,
  Building2,
  ArrowLeft,
  BarChart3,

} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin } from '@/providers/AdminProvider';
import { useModeration } from '@/providers/ModerationProvider';
import { usePromotions } from '@/providers/PromotionProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/constants/queryKeys';

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { news, places, restaurants, posts, pushHistory, allUsers } = useAdmin();
  const { pendingReports, moderators } = useModeration();
  const { promotions, sponsors } = usePromotions();

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
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.stagger(80, statScaleAnims.map(anim =>
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      })
    )).start();
  }, [headerFadeAnim, statScaleAnims]);

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
  }, [pendingReports.length, pulseAnim]);

  const activePromotions = promotions.filter(p => p.status === 'active').length;
  const totalContent = news.length + places.length + restaurants.length + posts.length;

  const dashboardStats = [
    { label: 'Nutzer', value: allUsers.length, icon: Users, color: '#5DA0E8' },
    { label: 'Inhalte', value: totalContent, icon: FileText, color: '#BFA35D' },
    { label: 'Meldungen', value: pendingReports.length, icon: Flag, color: pendingReports.length > 0 ? '#C06060' : '#6B6B6B' },
    { label: 'Einsend.', value: pendingSubmissions, icon: Inbox, color: pendingSubmissions > 0 ? '#4CAF50' : '#6B6B6B' },
    { label: 'Aktive Ads', value: activePromotions, icon: Megaphone, color: '#FF9800' },
    { label: 'Sponsoren', value: sponsors.length, icon: Building2, color: '#9C7BDB' },
  ];

  const navigateTo = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 8 }]}
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

        <Text style={styles.sectionTitle}>
          <BarChart3 size={14} color="#BFA35D" /> Dashboard
        </Text>

        <View style={styles.dashboardGrid}>
          {dashboardStats.map((stat, idx) => {
            const IconComp = stat.icon;
            const animIdx = Math.min(idx, statScaleAnims.length - 1);
            return (
              <Animated.View
                key={stat.label}
                style={[
                  styles.dashCard,
                  { transform: [{ scale: statScaleAnims[animIdx] }] },
                ]}
              >
                <View style={[styles.dashIconWrap, { backgroundColor: `${stat.color}18` }]}>
                  <IconComp size={18} color={stat.color} />
                </View>
                <Text style={[
                  styles.dashValue,
                  stat.value > 0 && (stat.label === 'Meldungen' || stat.label === 'Einsend.')
                    ? { color: stat.color }
                    : undefined,
                ]}>
                  {stat.value}
                </Text>
                <Text style={styles.dashLabel}>{stat.label}</Text>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Schnellzugriff</Text>

        <View style={styles.cardsSection}>
          <Pressable
            onPress={() => navigateTo('/admin/reports')}
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
            onPress={() => navigateTo('/admin/submissions')}
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
            onPress={() => navigateTo('/admin/push')}
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
            style={styles.linkCard}
            onPress={() => navigateTo('/admin/push-history')}
          >
            <History size={18} color="#BFA35D" />
            <Text style={styles.linkCardText}>Push-Verlauf anzeigen</Text>
            <Text style={styles.linkCardCount}>{pushHistory.length}</Text>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Nutzer verwalten</Text>

        <View style={styles.cardsSection}>
          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/users')}
            testID="admin-users-btn"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(93,160,232,0.12)' }]}>
              <Users size={20} color="#5DA0E8" />
            </View>
            <Text style={styles.menuLabel}>Nutzer</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{allUsers.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/moderators')}
            testID="admin-moderators-btn"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(232,164,78,0.12)' }]}>
              <ShieldCheck size={20} color="#E8A44E" />
            </View>
            <Text style={styles.menuLabel}>Moderatoren</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{moderators.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/sponsors')}
            testID="admin-sponsors-btn"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(156,123,219,0.12)' }]}>
              <Building2 size={20} color="#9C7BDB" />
            </View>
            <Text style={styles.menuLabel}>Sponsoren</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{sponsors.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/promotions')}
            testID="admin-promotions-btn"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(255,152,0,0.12)' }]}>
              <Megaphone size={20} color="#FF9800" />
            </View>
            <Text style={styles.menuLabel}>Promotions & Anzeigen</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{promotions.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Inhalte verwalten</Text>

        <View style={styles.cardsSection}>
          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/news')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
              <Newspaper size={20} color="#BFA35D" />
            </View>
            <Text style={styles.menuLabel}>News</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{news.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/places')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
              <MapPin size={20} color="#BFA35D" />
            </View>
            <Text style={styles.menuLabel}>Orte</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{places.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/restaurants')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
              <UtensilsCrossed size={20} color="#BFA35D" />
            </View>
            <Text style={styles.menuLabel}>Restaurants</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{restaurants.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => navigateTo('/admin/posts')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
              <FileText size={20} color="#BFA35D" />
            </View>
            <Text style={styles.menuLabel}>Beiträge</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{posts.length}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
          </Pressable>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  dashCard: {
    width: '30%' as any,
    flexGrow: 1,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
  },
  dashIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dashValue: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  dashLabel: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
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
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  linkCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  linkCardCount: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.5)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
