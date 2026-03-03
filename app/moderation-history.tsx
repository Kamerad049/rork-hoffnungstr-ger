import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  ShieldAlert,
  Scale,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Trash2,
  FileText,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useModeration } from '@/providers/ModerationProvider';
import AppealModal from '@/components/AppealModal';
import { formatTimeAgo } from '@/lib/utils';
import type { ModerationAction } from '@/constants/types';

function getStatusConfig(status: string): { label: string; color: string; icon: typeof Clock } {
  switch (status) {
    case 'active': return { label: 'Entfernt – Widerspruch möglich', color: '#E8A44E', icon: Clock };
    case 'restored': return { label: 'Wiederhergestellt', color: '#4CAF50', icon: RotateCcw };
    case 'permanently_deleted': return { label: 'Endgültig gelöscht', color: '#8e8e93', icon: Trash2 };
    default: return { label: status, color: '#8e8e93', icon: FileText };
  }
}

function getAppealStatusConfig(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending': return { label: 'In Prüfung', color: '#E8A44E' };
    case 'accepted': return { label: 'Stattgegeben', color: '#4CAF50' };
    case 'rejected': return { label: 'Abgelehnt', color: '#C06060' };
    default: return { label: status, color: '#8e8e93' };
  }
}

export default function ModerationHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    loadUserModerationData,
    getUserModerationActions,
    getAppealsForAction,
    canUserAppeal,
    submitAppeal,
  } = useModeration();

  const [appealAction, setAppealAction] = useState<ModerationAction | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    console.log('[MOD_HISTORY] Loading data for user:', user.id);
    loadUserModerationData(user.id).then(() => {
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  }, [user, loadUserModerationData, headerAnim]);

  const actions = useMemo(() => {
    if (!user) return [];
    return getUserModerationActions(user.id);
  }, [user, getUserModerationActions]);

  const handleSubmitAppeal = useCallback(async (actionId: string, appealText: string): Promise<boolean> => {
    if (!user) return false;
    console.log('[MOD_HISTORY] Submitting appeal for action:', actionId);
    const result = await submitAppeal(actionId, user.id, appealText);
    return result !== null;
  }, [user, submitAppeal]);

  const handleAcceptDecision = useCallback((_actionId: string) => {
    console.log('[MOD_HISTORY] User accepted moderation decision:', _actionId);
  }, []);

  const renderActionItem = useCallback(({ item }: { item: ModerationAction }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;
    const appeals = getAppealsForAction(item.id);
    const canAppeal = canUserAppeal(item.id);
    const latestAppeal = appeals.length > 0 ? appeals[0] : null;

    return (
      <View style={styles.actionCard}>
        <View style={styles.actionCardHeader}>
          <View style={[styles.statusIconWrap, { backgroundColor: `${statusConfig.color}15` }]}>
            <StatusIcon size={16} color={statusConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.reasonSection}>
          <Text style={styles.sectionLabel}>Grund</Text>
          <Text style={styles.sectionValue}>{item.reason}</Text>
          {item.details.length > 0 && (
            <Text style={styles.detailsValue}>{item.details}</Text>
          )}
        </View>

        {item.postSnapshot && (
          <View style={styles.snapshotBox}>
            <Text style={styles.sectionLabel}>Dein Beitrag</Text>
            <Text style={styles.snapshotText} numberOfLines={3}>
              {`"${(item.postSnapshot as any).content ?? ''}"`}
            </Text>
          </View>
        )}

        {latestAppeal && (
          <View style={styles.appealStatusBox}>
            <Scale size={14} color={getAppealStatusConfig(latestAppeal.status).color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.appealStatusTitle, { color: getAppealStatusConfig(latestAppeal.status).color }]}>
                Widerspruch: {getAppealStatusConfig(latestAppeal.status).label}
              </Text>
              {latestAppeal.reviewerNote && (
                <Text style={styles.appealReviewNote}>
                  Anmerkung: {latestAppeal.reviewerNote}
                </Text>
              )}
              {latestAppeal.reviewedAt && (
                <Text style={styles.appealReviewTime}>
                  Geprüft {formatTimeAgo(latestAppeal.reviewedAt)}
                </Text>
              )}
            </View>
          </View>
        )}

        {canAppeal && item.status === 'active' && (
          <Pressable
            style={styles.appealBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setAppealAction(item);
            }}
            testID={`appeal-btn-${item.id}`}
          >
            <Scale size={16} color="#E8A44E" />
            <Text style={styles.appealBtnText}>Widerspruch einlegen</Text>
          </Pressable>
        )}

        {item.status === 'restored' && (
          <View style={styles.restoredBanner}>
            <CheckCircle size={14} color="#4CAF50" />
            <Text style={styles.restoredText}>Dein Beitrag wurde wiederhergestellt</Text>
          </View>
        )}

        {item.status === 'permanently_deleted' && (
          <View style={styles.deletedBanner}>
            <XCircle size={14} color="#8e8e93" />
            <Text style={styles.deletedText}>Endgültig gelöscht</Text>
          </View>
        )}
      </View>
    );
  }, [getAppealsForAction, canUserAppeal]);

  const renderHeader = useCallback(() => (
    <Animated.View style={{ opacity: headerAnim }}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 56 }]}
      >
        <View style={styles.heroPattern}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.heroLine, { top: 20 + i * 28, opacity: 0.03 + i * 0.005, transform: [{ rotate: '-12deg' }] }]} />
          ))}
        </View>
        <View style={styles.heroIconWrap}>
          <ShieldAlert size={28} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Moderations-Verlauf</Text>
        <Text style={styles.heroSub}>Deine moderierten Beiträge & Widersprüche</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{actions.length}</Text>
            <Text style={styles.statLabel}>Aktionen</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {actions.filter((a) => a.status === 'restored').length}
            </Text>
            <Text style={styles.statLabel}>Wiederhergestellt</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#E8A44E' }]}>
              {actions.filter((a) => a.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Offen</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  ), [headerAnim, insets.top, actions]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <CheckCircle size={48} color="rgba(76,175,80,0.5)" />
      </View>
      <Text style={styles.emptyTitle}>Alles sauber!</Text>
      <Text style={styles.emptyText}>
        Keine deiner Beiträge wurde bisher moderiert. Weiter so!
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ArrowLeft size={20} color="#BFA35D" />
      </Pressable>

      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={renderActionItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <AppealModal
        visible={appealAction !== null}
        onClose={() => setAppealAction(null)}
        action={appealAction}
        onSubmitAppeal={handleSubmitAppeal}
        onAcceptDecision={handleAcceptDecision}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.5)',
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.45)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  listContent: {
    paddingBottom: 40,
  },
  actionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.35)',
    marginTop: 2,
  },
  reasonSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 14,
    color: '#E8DCC8',
    lineHeight: 20,
  },
  detailsValue: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 18,
    marginTop: 4,
  },
  snapshotBox: {
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  snapshotText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 2,
  },
  appealStatusBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  appealStatusTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  appealReviewNote: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.5)',
    lineHeight: 16,
    marginTop: 4,
  },
  appealReviewTime: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.35)',
    marginTop: 4,
  },
  appealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(232,164,78,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,164,78,0.2)',
  },
  appealBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8A44E',
  },
  restoredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restoredText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#4CAF50',
  },
  deletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(142,142,147,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deletedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(76,175,80,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.45)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
