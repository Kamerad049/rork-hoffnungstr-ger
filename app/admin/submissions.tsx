import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import {
  MapPin,
  UtensilsCrossed,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Filter,
  Trash2,
  ArrowLeft,
  Inbox,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { queryKeys } from '@/constants/queryKeys';
import type { Submission, SubmissionStatus, SubmissionCategory } from '@/constants/types';

function mapDbSubmission(s: any): Submission {
  return {
    id: s.id,
    category: s.category,
    submittedBy: s.submitted_by,
    submitterName: s.submitter_name ?? 'Unbekannt',
    status: s.status,
    createdAt: s.created_at,
    reviewedAt: s.reviewed_at ?? null,
    reviewedBy: s.reviewed_by ?? null,
    rejectionReason: s.rejection_reason ?? null,
    name: s.name,
    description: s.description ?? '',
    city: s.city,
    bundesland: s.bundesland,
    images: s.images ?? [],
    placeCategory: s.place_category ?? undefined,
    cuisineTypes: s.cuisine_types ?? undefined,
    priceRange: s.price_range ?? undefined,
    address: s.address ?? undefined,
    latitude: s.latitude ?? undefined,
    longitude: s.longitude ?? undefined,
    whyRecommend: s.why_recommend ?? '',
  };
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'pending', label: 'Offen' },
  { key: 'approved', label: 'Genehmigt' },
  { key: 'rejected', label: 'Abgelehnt' },
];

export default function SubmissionsScreen() {
  const { user } = useAuth();
  const { addPlace, addRestaurant } = useAdmin();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [categoryFilter, setCategoryFilter] = useState<SubmissionCategory | 'all'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  const submissionsQuery = useQuery({
    queryKey: queryKeys.submissions(),
    queryFn: async () => {
      console.log('[SUBMISSIONS] Loading submissions...');
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.log('[SUBMISSIONS] Load error:', error.message);
        return [];
      }
      return (data ?? []).map(mapDbSubmission);
    },
    staleTime: 2 * 60 * 1000,
  });

  const submissions = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery.data]);

  const filtered = useMemo(() => {
    let result = submissions;
    if (filterTab !== 'all') {
      result = result.filter((s) => s.status === filterTab);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((s) => s.category === categoryFilter);
    }
    return result;
  }, [submissions, filterTab, categoryFilter]);

  const pendingCount = useMemo(() => submissions.filter((s) => s.status === 'pending').length, [submissions]);

  const approveMutation = useMutation({
    mutationFn: async (submission: Submission) => {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? 'admin',
        })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      if (submission.category === 'place') {
        await addPlace({
          title: submission.name,
          description: submission.description,
          city: submission.city,
          bundesland: submission.bundesland,
          images: submission.images,
          category: submission.placeCategory ?? 'Historische Stätte',
          latitude: submission.latitude ?? 0,
          longitude: submission.longitude ?? 0,
          rating: 0,
          reviewCount: 0,
        });
      } else {
        await addRestaurant({
          name: submission.name,
          description: submission.description,
          city: submission.city,
          bundesland: submission.bundesland,
          images: submission.images,
          cuisine: submission.cuisineTypes ?? ['Deutsche Küche'],
          priceRange: submission.priceRange ?? 2,
          latitude: submission.latitude ?? 0,
          longitude: submission.longitude ?? 0,
          rating: 0,
          reviewCount: 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions() });
      setSelectedSubmission(null);
      Alert.alert('Genehmigt', 'Die Empfehlung wurde genehmigt und veröffentlicht.');
    },
    onError: (err: Error) => {
      Alert.alert('Fehler', err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? 'admin',
          rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions() });
      setSelectedSubmission(null);
      setShowRejectModal(false);
      setRejectionReason('');
      Alert.alert('Abgelehnt', 'Die Empfehlung wurde abgelehnt.');
    },
    onError: (err: Error) => {
      Alert.alert('Fehler', err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions() });
      setSelectedSubmission(null);
    },
  });

  const { mutate: approveSubmission } = approveMutation;
  const { mutate: rejectSubmission } = rejectMutation;
  const { mutate: deleteSubmission } = deleteMutation;

  const handleApprove = useCallback((submission: Submission) => {
    Alert.alert(
      'Empfehlung genehmigen?',
      `"${submission.name}" wird als ${submission.category === 'place' ? 'Ort' : 'Restaurant'} veröffentlicht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Genehmigen', onPress: () => approveSubmission(submission) },
      ],
    );
  }, [approveSubmission]);

  const handleReject = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setRejectionReason('');
    setShowRejectModal(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Löschen?', 'Diese Einsendung wird endgültig gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteSubmission(id) },
    ]);
  }, [deleteSubmission]);

  const confirmReject = useCallback(() => {
    if (!selectedSubmission) return;
    rejectSubmission({
      id: selectedSubmission.id,
      reason: rejectionReason.trim() || 'Entspricht nicht den Kriterien',
    });
  }, [selectedSubmission, rejectionReason, rejectSubmission]);

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  }, []);

  const getStatusConfig = useCallback((status: SubmissionStatus) => {
    switch (status) {
      case 'pending':
        return { color: '#E8A44E', bg: 'rgba(232,164,78,0.12)', label: 'Offen', icon: Clock };
      case 'approved':
        return { color: '#4CAF50', bg: 'rgba(76,175,80,0.12)', label: 'Genehmigt', icon: CheckCircle };
      case 'rejected':
        return { color: '#C06060', bg: 'rgba(192,96,96,0.12)', label: 'Abgelehnt', icon: XCircle };
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: Submission }) => {
    const statusCfg = getStatusConfig(item.status);
    const StatusIcon = statusCfg.icon;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: item.category === 'place' ? 'rgba(93,160,232,0.12)' : 'rgba(191,163,93,0.12)' }]}>
            {item.category === 'place' ? (
              <MapPin size={14} color="#5DA0E8" />
            ) : (
              <UtensilsCrossed size={14} color="#BFA35D" />
            )}
            <Text style={[styles.categoryText, { color: item.category === 'place' ? '#5DA0E8' : '#BFA35D' }]}>
              {item.category === 'place' ? 'Ort' : 'Restaurant'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <StatusIcon size={12} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <Text style={styles.cardName}>{item.name}</Text>

        <View style={styles.cardMeta}>
          <MapPin size={13} color="#888" />
          <Text style={styles.cardMetaText}>{item.city}, {item.bundesland}</Text>
        </View>

        {item.placeCategory && (
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaLabel}>Kategorie:</Text>
            <Text style={styles.cardMetaText}>{item.placeCategory}</Text>
          </View>
        )}

        {item.priceRange && (
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaLabel}>Preis:</Text>
            <Text style={styles.cardMetaText}>{'€'.repeat(item.priceRange)}</Text>
          </View>
        )}

        <View style={styles.cardMeta}>
          <User size={13} color="#888" />
          <Text style={styles.cardMetaText}>
            {item.submitterName} · {formatDate(item.createdAt)}
          </Text>
        </View>

        {item.whyRecommend ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Begründung:</Text>
            <Text style={styles.reasonText}>{item.whyRecommend}</Text>
          </View>
        ) : null}

        {item.description ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Beschreibung:</Text>
            <Text style={styles.reasonText} numberOfLines={3}>{item.description}</Text>
          </View>
        ) : null}

        {item.address ? (
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaLabel}>Adresse:</Text>
            <Text style={styles.cardMetaText}>{item.address}</Text>
          </View>
        ) : null}

        {item.rejectionReason && item.status === 'rejected' ? (
          <View style={[styles.reasonBox, { backgroundColor: 'rgba(192,96,96,0.08)', borderColor: 'rgba(192,96,96,0.2)' }]}>
            <Text style={[styles.reasonLabel, { color: '#C06060' }]}>Ablehnungsgrund:</Text>
            <Text style={[styles.reasonText, { color: '#C06060' }]}>{item.rejectionReason}</Text>
          </View>
        ) : null}

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApprove(item)}
              disabled={approveMutation.isPending}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Freischalten</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
              disabled={rejectMutation.isPending}
            >
              <XCircle size={16} color="#C06060" />
              <Text style={[styles.actionBtnText, { color: '#C06060' }]}>Ablehnen</Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
            >
              <Trash2 size={16} color="#888" />
            </Pressable>
          </View>
        )}

        {item.status !== 'pending' && (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
            >
              <Trash2 size={16} color="#888" />
            </Pressable>
            {item.reviewedAt && (
              <Text style={styles.reviewedText}>
                Geprüft am {formatDate(item.reviewedAt)}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }, [getStatusConfig, formatDate, handleApprove, handleReject, handleDelete, approveMutation.isPending, rejectMutation.isPending]);

  const renderListHeader = useCallback(() => (
    <View>
      <Animated.View style={{ opacity: headerFadeAnim }}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 56 }]}
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
              <Inbox size={28} color="#BFA35D" />
            </View>
          </View>
          <Text style={styles.heroTitle}>Einsendungen</Text>
          <Text style={styles.heroSub}>Empfehlungen prüfen & freischalten</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, pendingCount > 0 ? { color: '#E8A44E' } : undefined]}>{pendingCount}</Text>
              <Text style={styles.heroStatLabel}>Offen</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{submissions.filter((s) => s.status === 'approved').length}</Text>
              <Text style={styles.heroStatLabel}>Genehmigt</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{submissions.length}</Text>
              <Text style={styles.heroStatLabel}>Gesamt</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.filterChip,
              filterTab === tab.key && styles.filterChipActive,
            ]}
            onPress={() => setFilterTab(tab.key)}
          >
            <Text style={[styles.filterChipText, filterTab === tab.key && styles.filterChipTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.categoryFilterRow}>
        {(['all', 'place', 'restaurant'] as const).map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.catChip,
              categoryFilter === cat && styles.catChipActive,
            ]}
            onPress={() => setCategoryFilter(cat)}
          >
            {cat === 'place' && <MapPin size={13} color={categoryFilter === cat ? '#fff' : '#5DA0E8'} />}
            {cat === 'restaurant' && <UtensilsCrossed size={13} color={categoryFilter === cat ? '#fff' : '#BFA35D'} />}
            {cat === 'all' && <Filter size={13} color={categoryFilter === cat ? '#fff' : '#888'} />}
            <Text style={[styles.catChipText, categoryFilter === cat && { color: '#fff' }]}>
              {cat === 'all' ? 'Alle' : cat === 'place' ? 'Orte' : 'Restaurants'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  ), [headerFadeAnim, insets.top, pendingCount, submissions, filterTab, categoryFilter]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ArrowLeft size={20} color="#BFA35D" />
      </Pressable>

      {submissionsQuery.isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#BFA35D" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Keine Einsendungen</Text>
              <Text style={styles.emptySubText}>
                {filterTab === 'pending'
                  ? 'Aktuell gibt es keine offenen Empfehlungen.'
                  : 'Keine Einsendungen in dieser Kategorie.'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Empfehlung ablehnen</Text>
            <Text style={styles.modalSubtitle}>
              {selectedSubmission?.name ?? ''} — {selectedSubmission?.city ?? ''}
            </Text>
            <Text style={styles.modalLabel}>Ablehnungsgrund (optional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="z.B. Kein Schwerpunkt auf deutscher Küche"
              placeholderTextColor="#666"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                style={styles.modalRejectBtn}
                onPress={confirmReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalRejectText}>Ablehnen</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 20,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    color: '#E8DCC8',
    fontSize: 20,
    fontWeight: '800' as const,
  },
  heroStatLabel: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e20',
  },
  filterChipActive: {
    backgroundColor: '#BFA35D',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  filterChipTextActive: {
    color: '#1c1c1e',
  },
  categoryFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  catChipActive: {
    backgroundColor: 'rgba(191,163,93,0.25)',
    borderColor: 'rgba(191,163,93,0.4)',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#888',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardMetaLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#888',
  },
  cardMetaText: {
    fontSize: 13,
    color: '#999',
  },
  reasonBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#BFA35D',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: 'rgba(192,96,96,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.3)',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(136,136,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewedText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#1e1e20',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#141416',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#141416',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#888',
  },
  modalRejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#C06060',
  },
  modalRejectText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
