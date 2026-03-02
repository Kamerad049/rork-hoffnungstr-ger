import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions, Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Flame, Users, Compass, Feather, Sparkles, ChevronDown, ChevronLeft, X, Shield, Zap,
  Trophy, Lock,
} from 'lucide-react-native';
import OrdenBadge from '@/components/OrdenBadge';
import OrdenCeremony from '@/components/OrdenCeremony';
import RadarChart from '@/components/RadarChart';
import {
  TIER_COLORS, TIER_NAMES, CATEGORY_NAMES,
  type OrdenDefinition, type OrdenTier, type OrdenCategory,
} from '@/constants/orden';
import { useOrden } from '@/hooks/useOrden';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  aktivitaet: Flame,
  gemeinschaft: Users,
  entdecker: Compass,
  inhalt: Feather,
  selten: Sparkles,
};

type FilterType = 'alle' | OrdenCategory;
type TierFilter = 'alle' | OrdenTier;

export default function OrdenshalleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ordenDefinitions, earnedIds, earnedOrdenMap, characterValues, tierCounts: providerTierCounts, isLoading: ordenLoading } = useOrden();
  const [categoryFilter, setCategoryFilter] = useState<FilterType>('alle');
  const [tierFilter, setTierFilter] = useState<TierFilter>('alle');
  const [selectedOrden, setSelectedOrden] = useState<OrdenDefinition | null>(null);
  const [showCeremony, setShowCeremony] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const earnedCount = earnedIds.size;
  const totalCount = ordenDefinitions.length;

  const filteredOrden = useMemo(() => {
    let list = ordenDefinitions;
    if (categoryFilter !== 'alle') {
      list = list.filter(o => o.category === categoryFilter);
    }
    if (tierFilter !== 'alle') {
      list = list.filter(o => o.tier === tierFilter);
    }
    return list.sort((a, b) => {
      const aEarned = earnedIds.has(a.id) ? 0 : 1;
      const bEarned = earnedIds.has(b.id) ? 0 : 1;
      if (aEarned !== bEarned) return aEarned - bEarned;
      const tierOrder: OrdenTier[] = ['legendaer', 'gold', 'silber', 'bronze'];
      return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    });
  }, [categoryFilter, tierFilter, earnedIds, ordenDefinitions]);

  const tierCounts = providerTierCounts;

  const handleOrdenPress = useCallback((orden: OrdenDefinition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOrden(orden);
    setShowDetail(true);
  }, []);

  const handleTestCeremony = useCallback(() => {
    const earned = ordenDefinitions.filter(o => earnedIds.has(o.id));
    const random = earned[Math.floor(Math.random() * earned.length)];
    if (random) {
      setSelectedOrden(random);
      setShowDetail(false);
      setShowCeremony(true);
    }
  }, [earnedIds, ordenDefinitions]);

  const categories: FilterType[] = ['alle', 'aktivitaet', 'gemeinschaft', 'entdecker', 'inhalt', 'selten'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={['#1e1d1a', '#1a1918', '#141416']} style={styles.heroSection}>
            <View style={styles.heroPattern}>
              {[...Array(4)].map((_, i) => (
                <View key={i} style={[styles.heroLine, { top: 30 + i * 24, opacity: 0.03 + i * 0.005, transform: [{ rotate: '-8deg' }] }]} />
              ))}
            </View>
            <View style={[styles.customHeader, { paddingTop: insets.top + 8, zIndex: 10 }]}>
              <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
                <ChevronLeft size={22} color="#BFA35D" />
              </Pressable>
              <Text style={styles.headerTitle}>Ordenshalle</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.heroIcon}>
              <Trophy size={32} color="#BFA35D" />
            </View>
            <Text style={styles.heroSubtitle}>Deine Auszeichnungen & Errungenschaften</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{earnedCount}</Text>
                <Text style={styles.statSub}>Errungen</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalCount}</Text>
                <Text style={styles.statSub}>Gesamt</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{Math.round((earnedCount / totalCount) * 100)}%</Text>
                <Text style={styles.statSub}>Komplett</Text>
              </View>
            </View>

            <View style={styles.tierSummary}>
              {(['legendaer', 'gold', 'silber', 'bronze'] as OrdenTier[]).map(tier => (
                <View key={tier} style={[styles.tierChip, { borderColor: TIER_COLORS[tier].border, backgroundColor: TIER_COLORS[tier].bg }]}>
                  <View style={[styles.tierChipDot, { backgroundColor: TIER_COLORS[tier].primary }]} />
                  <Text style={[styles.tierChipText, { color: TIER_COLORS[tier].text }]}>{tierCounts[tier]}</Text>
                  <Text style={[styles.tierChipLabel, { color: TIER_COLORS[tier].text }]}>{TIER_NAMES[tier]}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.radarSection}>
          <Text style={styles.sectionTitle}>Charakter-Profil</Text>
          <Text style={styles.sectionSubtitle}>Deine Stärken auf einen Blick</Text>
          <RadarChart values={characterValues} size={SCREEN_WIDTH - 60} />
        </View>

        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {categories.map(cat => {
              const active = categoryFilter === cat;
              const IconComp = cat === 'alle' ? Shield : CATEGORY_ICON_MAP[cat] ?? Shield;
              return (
                <Pressable
                  key={cat}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategoryFilter(cat);
                  }}
                >
                  <IconComp size={13} color={active ? '#BFA35D' : 'rgba(232,220,200,0.3)'} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {cat === 'alle' ? 'Alle' : CATEGORY_NAMES[cat as OrdenCategory]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(['alle', 'legendaer', 'gold', 'silber', 'bronze'] as TierFilter[]).map(tier => {
              const active = tierFilter === tier;
              return (
                <Pressable
                  key={tier}
                  style={[
                    styles.tierFilterChip,
                    active && {
                      backgroundColor: tier === 'alle' ? 'rgba(191,163,93,0.12)' : TIER_COLORS[tier as OrdenTier]?.bg,
                      borderColor: tier === 'alle' ? 'rgba(191,163,93,0.25)' : TIER_COLORS[tier as OrdenTier]?.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTierFilter(tier);
                  }}
                >
                  {tier !== 'alle' && (
                    <View style={[styles.tierFilterDot, { backgroundColor: TIER_COLORS[tier as OrdenTier].primary }]} />
                  )}
                  <Text style={[
                    styles.tierFilterText,
                    active && { color: tier === 'alle' ? '#BFA35D' : TIER_COLORS[tier as OrdenTier].text },
                  ]}>
                    {tier === 'alle' ? 'Alle Stufen' : TIER_NAMES[tier as OrdenTier]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.ordenGrid}>
          {filteredOrden.map(orden => (
            <View key={orden.id} style={styles.ordenCell}>
              <OrdenBadge
                orden={orden}
                earned={earnedIds.has(orden.id)}
                size="medium"
                onPress={() => handleOrdenPress(orden)}
                showName
              />
            </View>
          ))}
        </View>

        <Pressable style={styles.testCeremonyBtn} onPress={handleTestCeremony} testID="test-ceremony-btn">
          <Sparkles size={16} color="#BFA35D" />
          <Text style={styles.testCeremonyText}>Zeremonie testen</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <OrdenCeremony
        visible={showCeremony}
        orden={selectedOrden}
        onClose={() => setShowCeremony(false)}
      />

      <Modal visible={showDetail} transparent animationType="fade">
        <Pressable style={styles.detailOverlay} onPress={() => setShowDetail(false)}>
          <Pressable style={styles.detailCard} onPress={() => {}}>
            {selectedOrden && (
              <>
                <Pressable style={styles.detailClose} onPress={() => setShowDetail(false)} hitSlop={20}>
                  <X size={20} color="rgba(232,220,200,0.4)" />
                </Pressable>

                <View style={styles.detailBadgeWrap}>
                  <OrdenBadge orden={selectedOrden} earned={earnedIds.has(selectedOrden.id)} size="large" showName={false} animate={false} />
                </View>

                <Text style={[styles.detailName, { color: earnedIds.has(selectedOrden.id) ? TIER_COLORS[selectedOrden.tier].primary : 'rgba(232,220,200,0.4)' }]}>
                  {selectedOrden.name}
                </Text>

                <View style={[styles.detailTierPill, { backgroundColor: TIER_COLORS[selectedOrden.tier].bg, borderColor: TIER_COLORS[selectedOrden.tier].border }]}>
                  <Text style={[styles.detailTierText, { color: TIER_COLORS[selectedOrden.tier].text }]}>
                    {TIER_NAMES[selectedOrden.tier]} · {CATEGORY_NAMES[selectedOrden.category]}
                  </Text>
                </View>

                <Text style={styles.detailDesc}>{selectedOrden.description}</Text>

                <View style={styles.detailRequirement}>
                  <Text style={styles.detailReqLabel}>Voraussetzung</Text>
                  <Text style={styles.detailReqValue}>{selectedOrden.requirement}</Text>
                </View>

                <View style={styles.detailXpRow}>
                  <Zap size={16} color="#FFD700" />
                  <Text style={styles.detailXpText}>+{selectedOrden.epReward} EP</Text>
                </View>

                {earnedIds.has(selectedOrden.id) ? (
                  <View style={styles.detailEarnedBadge}>
                    <Text style={styles.detailEarnedText}>Errungen ✓</Text>
                    <Text style={styles.detailEarnedDate}>
                      {new Date(earnedOrdenMap.get(selectedOrden.id)?.earned_at ?? '').toLocaleDateString('de-DE')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.detailLockedBadge}>
                    <Lock size={14} color="rgba(232,220,200,0.3)" />
                    <Text style={styles.detailLockedText}>Noch nicht freigeschaltet</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 16,
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
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  heroSubtitle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,32,0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 4,
    width: '100%',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statSub: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  tierSummary: {
    flexDirection: 'row',
    gap: 8,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierChipText: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  tierChipLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    opacity: 0.6,
  },
  radarSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#E8DCC8',
    fontSize: 18,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  filterSection: {
    paddingTop: 8,
    gap: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(30,30,32,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(60,60,60,0.2)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderColor: 'rgba(191,163,93,0.2)',
  },
  filterChipText: {
    color: 'rgba(232,220,200,0.3)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  filterChipTextActive: {
    color: '#BFA35D',
  },
  tierFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(30,30,32,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(60,60,60,0.15)',
  },
  tierFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierFilterText: {
    color: 'rgba(232,220,200,0.3)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  ordenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 4,
  },
  ordenCell: {
    width: (SCREEN_WIDTH - 24) / 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  testCeremonyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  testCeremonyText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,8,10,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e1e20',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  detailClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  detailBadgeWrap: {
    marginBottom: 16,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '900' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  detailTierPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailTierText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  detailDesc: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailRequirement: {
    alignItems: 'center',
    marginBottom: 12,
  },
  detailReqLabel: {
    color: 'rgba(191,163,93,0.35)',
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  detailReqValue: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  detailXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  detailXpText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  detailEarnedBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  detailEarnedText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  detailEarnedDate: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  detailLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(60,60,60,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(60,60,60,0.2)',
  },
  detailLockedText: {
    color: 'rgba(232,220,200,0.3)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
