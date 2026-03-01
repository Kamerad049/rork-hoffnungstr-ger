import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Clock,
  Users,
  Filter,
  X,
  Dumbbell,
  Swords,
  Timer,
  Snowflake,
  Waves,
  Mountain,
  Leaf,
  Activity,
  ChevronDown,
  UserPlus,
  UserMinus,
  ChevronLeft,
  Plus,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import GermanyMap from '@/components/GermanyMap';
import { SPORT_CATEGORIES, SKILL_LEVELS } from '@/constants/kaderschmiede';
import type { TrainingActivity, SportCategory, SkillLevel } from '@/constants/kaderschmiede';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}. ${hours}:${mins}`;
}

function ActivityListItem({ activity, onJoin, onLeave, isJoined, onPress }: {
  activity: TrainingActivity;
  onJoin: () => void;
  onLeave: () => void;
  isJoined: boolean;
  onPress: () => void;
}) {
  const SportIcon = SPORT_ICON_MAP[activity.type] ?? Activity;
  const spotsLeft = activity.maxParticipants - activity.participants.length;
  const isFull = spotsLeft <= 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.listCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.listCardLeft}>
          <View style={styles.sportIcon}>
            <SportIcon size={18} color="#BFA35D" />
          </View>
        </View>
        <View style={styles.listCardCenter}>
          <View style={styles.listCardTopRow}>
            <Text style={styles.listCardSport}>{activity.type}</Text>
            <View style={[
              styles.levelPill,
              activity.level === 'Profi' && styles.levelPillProfi,
            ]}>
              <Text style={[
                styles.levelPillText,
                activity.level === 'Profi' && styles.levelPillTextProfi,
              ]}>{activity.level}</Text>
            </View>
          </View>
          <Text style={styles.listCardTitle} numberOfLines={1}>{activity.title}</Text>
          <View style={styles.listCardMeta}>
            <View style={styles.metaChip}>
              <Clock size={10} color="rgba(191,163,93,0.5)" />
              <Text style={styles.metaChipText}>{formatDateTime(activity.dateTime)}</Text>
            </View>
            <View style={styles.metaChip}>
              <MapPin size={10} color="rgba(191,163,93,0.5)" />
              <Text style={styles.metaChipText}>{activity.city}</Text>
            </View>
            <View style={styles.metaChip}>
              <Users size={10} color="rgba(191,163,93,0.5)" />
              <Text style={styles.metaChipText}>{activity.participants.length}/{activity.maxParticipants}</Text>
            </View>
          </View>
        </View>
        <View style={styles.listCardRight}>
          {isJoined ? (
            <Pressable style={styles.leaveBtn} onPress={onLeave} hitSlop={8}>
              <UserMinus size={16} color="#C06060" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
              onPress={isFull ? undefined : onJoin}
              hitSlop={8}
            >
              <UserPlus size={16} color={isFull ? 'rgba(191,163,93,0.3)' : '#BFA35D'} />
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams<{ bundesland?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    activities,
    activitiesByBundesland,
    joinActivity,
    leaveActivity,
    selectedSport,
    selectedLevel,
    setSelectedSport,
    setSelectedLevel,
  } = useKaderschmiede();

  const [selectedBundesland, setSelectedBundesland] = useState<string | null>(
    params.bundesland ?? null
  );
  const [showFilters, setShowFilters] = useState(false);

  const filteredActivities = useMemo(() => {
    let result = [...activities].filter(a => new Date(a.dateTime).getTime() > Date.now());
    if (selectedBundesland) {
      result = result.filter(a => a.bundesland === selectedBundesland);
    }
    if (selectedSport) {
      result = result.filter(a => a.type === selectedSport);
    }
    if (selectedLevel) {
      result = result.filter(a => a.level === selectedLevel);
    }
    return result.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [activities, selectedBundesland, selectedSport, selectedLevel]);

  const handleBundeslandPress = useCallback((name: string) => {
    setSelectedBundesland(prev => prev === name ? null : name);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBundesland) count++;
    if (selectedSport) count++;
    if (selectedLevel) count++;
    return count;
  }, [selectedBundesland, selectedSport, selectedLevel]);

  const clearFilters = useCallback(() => {
    setSelectedBundesland(null);
    setSelectedSport(null);
    setSelectedLevel(null);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.customHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Karte</Text>
        <Pressable style={styles.backBtn} onPress={() => router.push('/(tabs)/kaderschmiede/create-activity' as any)} hitSlop={12}>
          <Plus size={20} color="#BFA35D" />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapSection}>
          <GermanyMap
            activitiesByBundesland={activitiesByBundesland}
            onBundeslandPress={handleBundeslandPress}
            selectedBundesland={selectedBundesland}
            width={Math.min(SCREEN_WIDTH - 40, 320)}
            height={Math.min((SCREEN_WIDTH - 40) * 1.1, 360)}
          />
        </View>

        {selectedBundesland && (
          <View style={styles.selectionBanner}>
            <MapPin size={14} color="#BFA35D" />
            <Text style={styles.selectionText}>{selectedBundesland}</Text>
            <Pressable onPress={() => setSelectedBundesland(null)} hitSlop={8}>
              <X size={16} color="rgba(232,220,200,0.5)" />
            </Pressable>
          </View>
        )}

        <View style={styles.filterBar}>
          <Pressable
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} color={showFilters ? '#1c1c1e' : '#BFA35D'} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
            <ChevronDown
              size={14}
              color={showFilters ? '#1c1c1e' : '#BFA35D'}
              style={showFilters ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </Pressable>

          {activeFilterCount > 0 && (
            <Pressable style={styles.clearBtn} onPress={clearFilters} hitSlop={8}>
              <X size={12} color="rgba(232,220,200,0.5)" />
              <Text style={styles.clearText}>Zurücksetzen</Text>
            </Pressable>
          )}
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Sportart</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
              <View style={styles.filterChips}>
                {SPORT_CATEGORIES.map(sport => {
                  const isActive = selectedSport === sport;
                  const Icon = SPORT_ICON_MAP[sport] ?? Activity;
                  return (
                    <Pressable
                      key={sport}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setSelectedSport(isActive ? null : sport)}
                    >
                      <Icon size={12} color={isActive ? '#1c1c1e' : '#BFA35D'} />
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{sport}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Level</Text>
            <View style={styles.filterChips}>
              {SKILL_LEVELS.map(level => {
                const isActive = selectedLevel === level;
                return (
                  <Pressable
                    key={level}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setSelectedLevel(isActive ? null : level)}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{level}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredActivities.length} Aktivität{filteredActivities.length !== 1 ? 'en' : ''}
          </Text>
        </View>

        {filteredActivities.map(act => (
          <View key={act.id} style={styles.listPadding}>
            <ActivityListItem
              activity={act}
              isJoined={act.participants.includes(user?.id ?? '')}
              onJoin={() => joinActivity(act.id)}
              onLeave={() => leaveActivity(act.id)}
              onPress={() => router.push({ pathname: '/(tabs)/kaderschmiede/activity-detail', params: { id: act.id } } as any)}
            />
          </View>
        ))}

        {filteredActivities.length === 0 && (
          <View style={styles.emptyState}>
            <MapPin size={32} color="rgba(191,163,93,0.2)" />
            <Text style={styles.emptyText}>Keine Aktivitäten gefunden</Text>
            <Text style={styles.emptySubtext}>Ändere die Filter oder wähle ein anderes Bundesland</Text>
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
  scrollContent: {
    paddingBottom: 20,
  },
  mapSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  selectionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 10,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  filterToggleActive: {
    backgroundColor: '#BFA35D',
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  filterToggleTextActive: {
    color: '#1c1c1e',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.4)',
  },
  filterPanel: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  filterScrollRow: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(42,42,46,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.7)',
  },
  filterChipTextActive: {
    color: '#1c1c1e',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  listPadding: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    gap: 12,
  },
  listCardLeft: {
    justifyContent: 'center',
  },
  sportIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardCenter: {
    flex: 1,
  },
  listCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  listCardSport: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  levelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(232,220,200,0.06)',
  },
  levelPillProfi: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  levelPillTextProfi: {
    color: '#BFA35D',
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 6,
  },
  listCardMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  listCardRight: {
    justifyContent: 'center',
  },
  joinBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  joinBtnDisabled: {
    opacity: 0.4,
  },
  leaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(192,96,96,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
