import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Gavel,
  MessageSquare,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useModeration } from '@/providers/ModerationProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import { useAlert } from '@/providers/AlertProvider';
import * as Haptics from 'expo-haptics';
import type { ModerationAction, ModerationAppeal } from '@/constants/types';

type FilterTab = 'pending_appeals' | 'active' | 'resolved' | 'all';

function formatStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'active': return { label: 'Aktiv (entfernt)', color: '#C06060' };
    case 'restored': return { label: 'Wiederhergestellt', color: '#4CAF50' };
    case 'permanently_deleted': return { label: 'Endgültig gelöscht', color: '#8e8e93' };
    default: return { label: status, color: '#8e8e93' };
  }
}

function formatAppealStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending': return { label: 'Offen', color: '#E8A44E' };
    case 'accepted': return { label: 'Stattgegeben', color: '#4CAF50' };
    case 'rejected': return { label: 'Abgelehnt', color: '#C06060' };
    default: return { label: status, color: '#8e8e93' };
  }
}

export default function ModerationActionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const {
    moderationActions,
    pendingAppeals,
    activeModActions,
    loadModerationActions,
    reviewAppeal,
    getAppealsForAction,
  } = useModeration();

  const [filter, setFilter] = useState<FilterTab>('pending_appeals');
  const [selectedAppeal, setSelectedAppeal] = useState<ModerationAppeal | null>(null);
  const [reviewerNote, setReviewerNote] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadModerationActions();
    Animated.timing(headerFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [loadModerationActions, headerFadeAnim]);

  const resolvedActions = useMemo(
    () => moderationActions.filter((a) => a.status === 'restored' || a.status === 'permanently_deleted'),
    [moderationActions],
  );

  const handleAcceptAppeal = useCallback(async () => {
    if (!selectedAppeal || isReviewing) return;
    setIsReviewing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const success = await reviewAppeal(selectedAppeal.id, 'admin', true, reviewerNote);
    setIsReviewing(false);
    if (success) {
      showAlert('Widerspruch stattgegeben', 'Der Beitrag wurde wiederhergestellt und der Nutzer benachrichtigt.');
      setSelectedAppeal(null);
      setReviewerNote('');
    } else {
      showAlert('Fehler', 'Der Widerspruch konnte nicht bearbeitet werden.');
    }
  }, [selectedAppeal, isReviewing, reviewAppeal, reviewerNote, showAlert]);

  const handleRejectAppeal = useCallback(async () => {
    if (!selectedAppeal || isReviewing) return;
    setIsReviewing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const success = await reviewAppeal(selectedAppeal.id, 'admin', false, reviewerNote);
    setIsReviewing(false);
    if (success) {
      showAlert('Widerspruch abgelehnt', 'Der Beitrag bleibt endgültig gelöscht. Der Nutzer wurde benachrichtigt.');
      setSelectedAppeal(null);
      setReviewerNote('');
    } else {
      showAlert('Fehler', 'Der Widerspruch konnte nicht bearbeitet werden.');
    }
  }, [selectedAppeal, isReviewing, reviewAppeal, reviewerNote, showAlert]);

  const renderAppealCard = useCallback(({ item }: { item: ModerationAppeal }) => {
    const action = moderationActions.find((a) => a.id === item.actionId);
    const targetUser = action ? getUserById(action.targetUserId) : null;
    const displayName = targetUser?.displayName ?? 'Unbekannt';
    const appealStatus = formatAppealStatus(item.status);

    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedAppeal(item);
        }}
        testID={`appeal-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeRow}>
            <Gavel size={14} color="rgba(191,163,93,0.5)" />
            <Text style={styles.cardType}>Widerspruch</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${appealStatus.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: appealStatus.color }]} />
            <Text style={[styles.statusText, { color: appealStatus.color }]}>{appealStatus.label}</Text>
          </View>
        </View>

        <View style={styles.userRow}>
          <View style={[styles.miniAvatar, { backgroundColor: 'rgba(191,163,93,0.15)' }]}>
            <Text style={styles.miniAvatarText}>{displayName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            {action && (
              <Text style={styles.reasonText}>Entfernt wegen: {action.reason}</Text>
            )}
          </View>
          <ChevronRight size={16} color="rgba(191,163,93,0.3)" />
        </View>

        <Text style={styles.appealPreview} numberOfLines={2}>
          {`"${item.appealText}"`}
        </Text>

        <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
      </Pressable>
    );
  }, [moderationActions]);

  const renderActionCard = useCallback(({ item }: { item: ModerationAction }) => {
    const targetUser = getUserById(item.targetUserId);
    const displayName = targetUser?.displayName ?? 'Unbekannt';
    const actionStatus = formatStatus(item.status);
    const appeals = getAppealsForAction(item.id);
    const hasPendingAppeal = appeals.some((a) => a.status === 'pending');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeRow}>
            <ShieldAlert size={14} color="rgba(191,163,93,0.5)" />
            <Text style={styles.cardType}>Moderation</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${actionStatus.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: actionStatus.color }]} />
            <Text style={[styles.statusText, { color: actionStatus.color }]}>{actionStatus.label}</Text>
          </View>
        </View>

        <View style={styles.userRow}>
          <View style={[styles.miniAvatar, { backgroundColor: 'rgba(191,163,93,0.15)' }]}>
            <Text style={styles.miniAvatarText}>{displayName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.reasonText}>Grund: {item.reason}</Text>
          </View>
        </View>

        {item.details.length > 0 && (
          <Text style={styles.detailsText} numberOfLines={2}>Details: {item.details}</Text>
        )}

        {hasPendingAppeal && (
          <View style={styles.pendingAppealBadge}>
            <AlertTriangle size={12} color="#E8A44E" />
            <Text style={styles.pendingAppealText}>Offener Widerspruch</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
          {appeals.length > 0 && (
            <Text style={styles.appealCountText}>{appeals.length} Widerspruch/Widersprüche</Text>
          )}
        </View>

        {item.status === 'restored' && item.restoredAt && (
          <View style={styles.restoredBadge}>
            <RotateCcw size={12} color="#4CAF50" />
            <Text style={styles.restoredText}>Wiederhergestellt {formatTimeAgo(item.restoredAt)}</Text>
          </View>
        )}
      </View>
    );
  }, [getAppealsForAction]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending_appeals', label: 'Widersprüche' },
    { key: 'active', label: 'Aktiv' },
    { key: 'resolved', label: 'Erledigt' },
    { key: 'all', label: 'Alle' },
  ];

  const tabCounts = useMemo(() => ({
    pending_appeals: pendingAppeals.length,
    active: activeModActions.length,
    resolved: resolvedActions.length,
    all: moderationActions.length,
  }), [pendingAppeals, activeModActions, resolvedActions, moderationActions]);

  const listData: any[] = useMemo(() => {
    switch (filter) {
      case 'pending_appeals': return pendingAppeals;
      case 'active': return activeModActions;
      case 'resolved': return resolvedActions;
      case 'all': return moderationActions;
      default: return [];
    }
  }, [filter, pendingAppeals, activeModActions, resolvedActions, moderationActions]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (filter === 'pending_appeals') return renderAppealCard({ item });
    return renderActionCard({ item });
  }, [filter, renderAppealCard, renderActionCard]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderHeader = useCallback(() => (
    <View>
      <Animated.View style={{ opacity: headerFadeAnim }}>
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
            <View style={styles.heroIconInner}>
              <Gavel size={28} color="#BFA35D" />
            </View>
          </View>
          <Text style={styles.heroTitle}>Moderations-Aktionen</Text>
          <Text style={styles.heroSub}>Widersprüche prüfen & Aktionen verwalten</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, pendingAppeals.length > 0 ? { color: '#E8A44E' } : undefined]}>
                {pendingAppeals.length}
              </Text>
              <Text style={styles.heroStatLabel}>Widersprüche</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{activeModActions.length}</Text>
              <Text style={styles.heroStatLabel}>Aktive</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{moderationActions.length}</Text>
              <Text style={styles.heroStatLabel}>Gesamt</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} style={styles.tabsWrap}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          const count = tabCounts[tab.key];
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.tabText, { color: active ? '#BFA35D' : 'rgba(191,163,93,0.45)' }]}>
                {tab.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ), [headerFadeAnim, insets.top, pendingAppeals.length, activeModActions.length, moderationActions.length, filter, tabCounts]);

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Gavel size={48} color="rgba(191,163,93,0.3)" />
      <Text style={styles.emptyTitle}>
        {filter === 'pending_appeals' ? 'Keine offenen Widersprüche' : 'Keine Aktionen'}
      </Text>
      <Text style={styles.emptyText}>
        {filter === 'pending_appeals'
          ? 'Es liegen keine Widersprüche zur Prüfung vor.'
          : 'Keine Moderations-Aktionen in dieser Kategorie.'}
      </Text>
    </View>
  ), [filter]);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 8 }]}>
        <ArrowLeft size={20} color="#BFA35D" />
      </Pressable>

      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!selectedAppeal} transparent animationType="slide" onRequestClose={() => setSelectedAppeal(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedAppeal(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {selectedAppeal && (() => {
              const action = moderationActions.find((a) => a.id === selectedAppeal.actionId);
              const targetUser = action ? getUserById(action.targetUserId) : null;
              const displayName = targetUser?.displayName ?? 'Unbekannt';

              return (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>Widerspruch prüfen</Text>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Nutzer</Text>
                    <Text style={styles.modalValue}>{displayName}</Text>
                  </View>

                  {action && (
                    <>
                      <View style={styles.modalSection}>
                        <Text style={styles.modalLabel}>Entfernungsgrund</Text>
                        <Text style={styles.modalValue}>{action.reason}</Text>
                      </View>
                      {action.details.length > 0 && (
                        <View style={styles.modalSection}>
                          <Text style={styles.modalLabel}>Details</Text>
                          <Text style={styles.modalValue}>{action.details}</Text>
                        </View>
                      )}
                      {action.postSnapshot && (
                        <View style={styles.snapshotBox}>
                          <Text style={styles.modalLabel}>Beitragsvorschau</Text>
                          <Text style={styles.snapshotText} numberOfLines={4}>
                            {`"${(action.postSnapshot as any).content ?? ''}"`}
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.appealBox}>
                    <MessageSquare size={16} color="#E8A44E" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appealBoxTitle}>Widerspruch des Nutzers</Text>
                      <Text style={styles.appealBoxText}>{selectedAppeal.appealText}</Text>
                      <Text style={styles.appealBoxTime}>{formatTimeAgo(selectedAppeal.createdAt)}</Text>
                    </View>
                  </View>

                  <Text style={styles.noteLabel}>Anmerkung zur Entscheidung</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Begründung für den Nutzer (optional)..."
                    placeholderTextColor="rgba(191,163,93,0.3)"
                    multiline
                    value={reviewerNote}
                    onChangeText={setReviewerNote}
                    textAlignVertical="top"
                  />

                  <View style={styles.decisionRow}>
                    <Pressable
                      style={[styles.decisionBtn, styles.acceptBtn]}
                      onPress={handleAcceptAppeal}
                      disabled={isReviewing}
                    >
                      <CheckCircle size={18} color="#fff" />
                      <Text style={styles.decisionBtnText}>Stattgeben</Text>
                      <Text style={styles.decisionBtnSub}>Beitrag wiederherstellen</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.decisionBtn, styles.rejectBtn]}
                      onPress={handleRejectAppeal}
                      disabled={isReviewing}
                    >
                      <XCircle size={18} color="#fff" />
                      <Text style={styles.decisionBtnText}>Ablehnen</Text>
                      <Text style={styles.decisionBtnSub}>Endgültig löschen</Text>
                    </Pressable>
                  </View>

                  <View style={{ height: 40 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#141416' },
  backButton: {
    position: 'absolute', left: 16, zIndex: 10, width: 40, height: 40,
    borderRadius: 12, backgroundColor: '#1e1e20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(191,163,93,0.1)',
  },
  heroSection: { paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroPattern: { ...StyleSheet.absoluteFillObject },
  heroLine: { position: 'absolute', left: -40, right: -40, height: 1, backgroundColor: '#BFA35D' },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1, borderColor: 'rgba(191,163,93,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroIconInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '800' as const, color: '#E8DCC8', letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontSize: 14, color: 'rgba(191,163,93,0.5)', fontWeight: '500' as const },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 20 },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 24, fontWeight: '800' as const, color: '#E8DCC8', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 11, fontWeight: '600' as const, color: 'rgba(191,163,93,0.45)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(191,163,93,0.1)' },
  tabsWrap: { marginBottom: 4 },
  tabsScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(191,163,93,0.06)', borderWidth: 1, borderColor: 'rgba(191,163,93,0.08)' },
  tabActive: { backgroundColor: 'rgba(191,163,93,0.15)', borderColor: 'rgba(191,163,93,0.25)' },
  tabText: { fontSize: 13, fontWeight: '600' as const },
  list: { paddingBottom: 40 },
  card: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: '#1e1e20', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardType: { fontSize: 12, fontWeight: '600' as const, color: 'rgba(191,163,93,0.5)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  miniAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(191,163,93,0.15)' },
  miniAvatarText: { color: '#BFA35D', fontSize: 14, fontWeight: '700' as const },
  userName: { fontSize: 14, fontWeight: '600' as const, color: '#E8DCC8' },
  reasonText: { fontSize: 12, color: 'rgba(191,163,93,0.5)', marginTop: 2 },
  detailsText: { fontSize: 13, color: 'rgba(232,220,200,0.6)', marginBottom: 8, lineHeight: 18 },
  appealPreview: { fontSize: 13, color: 'rgba(232,220,200,0.7)', lineHeight: 18, fontStyle: 'italic' as const, marginBottom: 8 },
  timeText: { fontSize: 11, color: 'rgba(191,163,93,0.35)' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appealCountText: { fontSize: 11, color: 'rgba(191,163,93,0.45)', fontWeight: '600' as const },
  pendingAppealBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(232,164,78,0.1)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, alignSelf: 'flex-start',
  },
  pendingAppealText: { fontSize: 12, fontWeight: '600' as const, color: '#E8A44E' },
  restoredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: 'rgba(76,175,80,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  restoredText: { fontSize: 12, fontWeight: '600' as const, color: '#4CAF50' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: '#E8DCC8', marginTop: 16, marginBottom: 6 },
  emptyText: { fontSize: 14, color: 'rgba(191,163,93,0.45)', textAlign: 'center' as const, lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1a1918', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', borderWidth: 1, borderColor: 'rgba(191,163,93,0.1)', borderBottomWidth: 0 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(191,163,93,0.2)', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  modalBody: { paddingHorizontal: 20, paddingTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#E8DCC8', marginBottom: 20 },
  modalSection: { marginBottom: 14 },
  modalLabel: { fontSize: 11, fontWeight: '600' as const, color: 'rgba(191,163,93,0.5)', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  modalValue: { fontSize: 15, color: '#E8DCC8', lineHeight: 22 },
  snapshotBox: { backgroundColor: 'rgba(191,163,93,0.06)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(191,163,93,0.08)' },
  snapshotText: { fontSize: 14, color: 'rgba(232,220,200,0.7)', lineHeight: 20, fontStyle: 'italic' as const, marginTop: 4 },
  appealBox: {
    flexDirection: 'row', gap: 12, backgroundColor: 'rgba(232,164,78,0.08)', borderRadius: 14,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(232,164,78,0.15)',
  },
  appealBoxTitle: { fontSize: 13, fontWeight: '700' as const, color: '#E8A44E', marginBottom: 4 },
  appealBoxText: { fontSize: 14, color: '#E8DCC8', lineHeight: 20 },
  appealBoxTime: { fontSize: 11, color: 'rgba(191,163,93,0.4)', marginTop: 6 },
  noteLabel: { fontSize: 13, fontWeight: '700' as const, color: '#E8DCC8', marginBottom: 8 },
  noteInput: {
    backgroundColor: 'rgba(191,163,93,0.06)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)', color: '#E8DCC8', fontSize: 14, padding: 14, minHeight: 80, marginBottom: 20,
  },
  decisionRow: { flexDirection: 'row', gap: 10 },
  decisionBtn: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 16, gap: 4 },
  acceptBtn: { backgroundColor: '#2a6a2a' },
  rejectBtn: { backgroundColor: '#8B0000' },
  decisionBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },
  decisionBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
});
