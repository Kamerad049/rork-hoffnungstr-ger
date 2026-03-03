import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Megaphone,
  Trash2,
  Edit3,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePromotions } from '@/providers/PromotionProvider';
import { useAlert } from '@/providers/AlertProvider';
import { AdminImagePicker } from '@/components/AdminImagePicker';
import type { Promotion, PromotionType, PromotionStatus } from '@/constants/types';

const PROMOTION_TYPES: { value: PromotionType; label: string }[] = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'internal', label: 'Intern' },
  { value: 'creator', label: 'Creator' },
  { value: 'event', label: 'Event' },
];

const STATUS_COLORS: Record<PromotionStatus, string> = {
  active: '#4CAF50',
  paused: '#FF9800',
  ended: '#9E9E9E',
  draft: '#5DA0E8',
};

export default function PromotionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { promotions, sponsors, addPromotion, updatePromotion, deletePromotion, isSavingPromotion } = usePromotions();
  const { showAlert } = useAlert();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [ctaLabel, setCtaLabel] = useState<string>('');
  const [ctaUrl, setCtaUrl] = useState<string>('');
  const [promoType, setPromoType] = useState<PromotionType>('sponsor');
  const [sponsorId, setSponsorId] = useState<string>('');
  const [feedPosition, setFeedPosition] = useState<string>('5');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setImageUrls([]);
    setCtaLabel('');
    setCtaUrl('');
    setPromoType('sponsor');
    setSponsorId('');
    setFeedPosition('5');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setEditingId(null);
    setModalVisible(false);
  }, []);

  const loadPromoForEdit = useCallback((promo: Promotion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTitle(promo.title);
    setContent(promo.content);
    setImageUrls(promo.mediaUrl ? [promo.mediaUrl] : []);
    setCtaLabel(promo.ctaLabel);
    setCtaUrl(promo.ctaUrl);
    setPromoType(promo.promotionType);
    setSponsorId(promo.sponsorId ?? '');
    setFeedPosition(String(promo.feedPosition));
    setStartDate(promo.startDate.split('T')[0]);
    setEndDate(promo.endDate.split('T')[0]);
    setEditingId(promo.id);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      showAlert('Fehler', 'Bitte Titel eingeben', [{ text: 'OK' }]);
      return;
    }
    if (!endDate) {
      showAlert('Fehler', 'Bitte Enddatum eingeben', [{ text: 'OK' }]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const promoData = {
        title: title.trim(),
        content: content.trim(),
        mediaUrl: imageUrls[0] || '',
        ctaLabel: ctaLabel.trim(),
        ctaUrl: ctaUrl.trim(),
        promotionType: promoType,
        sponsorId: sponsorId || null,
        feedPosition: parseInt(feedPosition, 10) || 5,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'draft' as PromotionStatus,
      };

      if (editingId) {
        await updatePromotion(editingId, promoData);
        console.log('[ADMIN] Promotion updated:', editingId);
      } else {
        await addPromotion(promoData);
        console.log('[ADMIN] Promotion created');
      }
      resetForm();
    } catch (e: any) {
      console.log('[ADMIN] Promotion save error:', e);
      showAlert('Fehler', e.message ?? 'Speichern fehlgeschlagen', [{ text: 'OK' }]);
    }
  }, [title, content, imageUrls, ctaLabel, ctaUrl, promoType, sponsorId, feedPosition, startDate, endDate, editingId, addPromotion, updatePromotion, resetForm, showAlert]);

  const handleDelete = useCallback((id: string) => {
    showAlert(
      'Promotion löschen?',
      'Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePromotion(id);
              console.log('[ADMIN] Promotion deleted:', id);
            } catch (e) {
              console.log('[ADMIN] Delete error:', e);
            }
          },
        },
      ],
      'warning',
    );
  }, [deletePromotion, showAlert]);

  const handleToggleStatus = useCallback(async (promo: Promotion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStatus: PromotionStatus = promo.status === 'active' ? 'paused' : 'active';
    try {
      await updatePromotion(promo.id, { status: newStatus });
      console.log('[ADMIN] Promotion status changed:', promo.id, '->', newStatus);
    } catch (e) {
      console.log('[ADMIN] Status toggle error:', e);
    }
  }, [updatePromotion]);

  const getSponsorName = useCallback((sid: string | null) => {
    if (!sid) return 'Kein Sponsor';
    return sponsors.find((s) => s.id === sid)?.name ?? 'Unbekannt';
  }, [sponsors]);

  const sortedPromotions = useMemo(() => {
    return [...promotions].sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 0, draft: 1, paused: 2, ended: 3 };
      return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    });
  }, [promotions]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={18} color="#BFA35D" />
          </Pressable>
          <View style={styles.heroIconWrap}>
            <Megaphone size={32} color="#BFA35D" />
          </View>
          <Text style={styles.heroTitle}>Promotions</Text>
          <Text style={styles.heroSubtitle}>
            Erstelle und verwalte Anzeigen für den Feed.
          </Text>
        </LinearGradient>

        <View style={styles.toolbar}>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              resetForm();
              setEditingId(null);
              setModalVisible(true);
            }}
            testID="add-promotion-btn"
          >
            <Plus size={18} color="#1c1c1e" />
            <Text style={styles.addBtnText}>Neu erstellen</Text>
          </Pressable>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{promotions.length}</Text>
          </View>
        </View>

        {sortedPromotions.map((promo) => {
          const isExpanded = expandedId === promo.id;
          return (
            <View key={promo.id} style={styles.promoCard}>
              <Pressable
                style={styles.promoHeader}
                onPress={() => {
                  setExpandedId(isExpanded ? null : promo.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={styles.promoLeft}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[promo.status] }]} />
                  <View style={styles.promoInfo}>
                    <Text style={styles.promoTitle} numberOfLines={1}>{promo.title}</Text>
                    <Text style={styles.promoMeta}>
                      {promo.promotionType.toUpperCase()} · {getSponsorName(promo.sponsorId)} · Pos {promo.feedPosition}
                    </Text>
                  </View>
                </View>
                <View style={styles.promoRight}>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[promo.status]}20` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[promo.status] }]}>
                      {promo.status}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color="rgba(191,163,93,0.4)" />
                  ) : (
                    <ChevronDown size={16} color="rgba(191,163,93,0.4)" />
                  )}
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.promoExpanded}>
                  <View style={styles.promoDetailRow}>
                    <Text style={styles.detailLabel}>Zeitraum</Text>
                    <Text style={styles.detailValue}>
                      {promo.startDate.split('T')[0]} → {promo.endDate.split('T')[0]}
                    </Text>
                  </View>
                  {promo.content.length > 0 && (
                    <View style={styles.promoDetailRow}>
                      <Text style={styles.detailLabel}>Inhalt</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>{promo.content}</Text>
                    </View>
                  )}
                  {promo.ctaLabel.length > 0 && (
                    <View style={styles.promoDetailRow}>
                      <Text style={styles.detailLabel}>CTA</Text>
                      <Text style={styles.detailValue}>{promo.ctaLabel} → {promo.ctaUrl}</Text>
                    </View>
                  )}

                  <View style={styles.promoActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleToggleStatus(promo)}
                    >
                      {promo.status === 'active' ? (
                        <Pause size={15} color="#FF9800" />
                      ) : (
                        <Play size={15} color="#4CAF50" />
                      )}
                      <Text style={styles.actionBtnText}>
                        {promo.status === 'active' ? 'Pausieren' : 'Aktivieren'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => router.push({ pathname: '/admin/promotion-analytics', params: { promotionId: promo.id } } as any)}
                    >
                      <BarChart3 size={15} color="#5DA0E8" />
                      <Text style={styles.actionBtnText}>Analytics</Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => loadPromoForEdit(promo)}
                    >
                      <Edit3 size={15} color="#BFA35D" />
                      <Text style={styles.actionBtnText}>Bearbeiten</Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(promo.id)}
                    >
                      <Trash2 size={15} color="#C06060" />
                      <Text style={[styles.actionBtnText, { color: '#C06060' }]}>Löschen</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {promotions.length === 0 && (
          <View style={styles.emptyState}>
            <Megaphone size={40} color="rgba(191,163,93,0.3)" />
            <Text style={styles.emptyTitle}>Keine Promotions</Text>
            <Text style={styles.emptySub}>Erstelle deine erste Promotion für den Feed</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); }}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Promotion bearbeiten' : 'Neue Promotion'}
                </Text>
                <Pressable onPress={() => { Keyboard.dismiss(); resetForm(); }} hitSlop={10}>
                  <X size={22} color="rgba(232,220,200,0.5)" />
                </Pressable>
              </View>
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={styles.label}>Typ</Text>
                <View style={styles.typeRow}>
                  {PROMOTION_TYPES.map((t) => (
                    <Pressable
                      key={t.value}
                      style={[styles.typeBtn, promoType === t.value && styles.typeBtnActive]}
                      onPress={() => setPromoType(t.value)}
                    >
                      <Text style={[styles.typeBtnText, promoType === t.value && styles.typeBtnTextActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {promoType === 'sponsor' && sponsors.length > 0 && (
                  <>
                    <Text style={styles.label}>Sponsor</Text>
                    <View style={styles.sponsorPicker}>
                      {sponsors.map((s) => (
                        <Pressable
                          key={s.id}
                          style={[styles.sponsorChip, sponsorId === s.id && styles.sponsorChipActive]}
                          onPress={() => setSponsorId(s.id)}
                        >
                          <Text style={[styles.sponsorChipText, sponsorId === s.id && styles.sponsorChipTextActive]}>
                            {s.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.label}>Titel *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Promotion Titel"
                  placeholderTextColor="rgba(191,163,93,0.3)"
                />

                <Text style={styles.label}>Beschreibung</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Beschreibung..."
                  placeholderTextColor="rgba(191,163,93,0.3)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <AdminImagePicker
                  images={imageUrls}
                  onImagesChange={setImageUrls}
                  maxImages={1}
                  bucket="admin-uploads"
                  folder="promotions"
                  label="Promotion Bild"
                />

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>CTA Label</Text>
                    <TextInput
                      style={styles.input}
                      value={ctaLabel}
                      onChangeText={setCtaLabel}
                      placeholder="Mehr erfahren"
                      placeholderTextColor="rgba(191,163,93,0.3)"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>CTA URL</Text>
                    <TextInput
                      style={styles.input}
                      value={ctaUrl}
                      onChangeText={setCtaUrl}
                      placeholder="https://..."
                      placeholderTextColor="rgba(191,163,93,0.3)"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Feed Position</Text>
                    <TextInput
                      style={styles.input}
                      value={feedPosition}
                      onChangeText={setFeedPosition}
                      placeholder="5"
                      placeholderTextColor="rgba(191,163,93,0.3)"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Startdatum</Text>
                    <TextInput
                      style={styles.input}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="rgba(191,163,93,0.3)"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Enddatum *</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(191,163,93,0.3)"
                />

                <View style={{ height: 20 }} />
              </ScrollView>

              <Pressable
                style={[styles.saveBtn, isSavingPromotion && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSavingPromotion}
                testID="save-promotion-btn"
              >
                {isSavingPromotion ? (
                  <ActivityIndicator size="small" color="#1c1c1e" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Aktualisieren' : 'Erstellen'}</Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  heroPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
    marginLeft: 4,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  toolbar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#BFA35D',
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  countBadge: {
    backgroundColor: 'rgba(191,163,93,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  countText: {
    color: '#BFA35D',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  promoCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    overflow: 'hidden',
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  promoInfo: {
    flex: 1,
  },
  promoTitle: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  promoMeta: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  promoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  promoExpanded: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(191,163,93,0.08)',
    padding: 14,
  },
  promoDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailValue: {
    color: '#E8DCC8',
    fontSize: 12,
    flex: 1,
    textAlign: 'right' as const,
    marginLeft: 12,
  },
  promoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  actionBtnText: {
    color: '#E8DCC8',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    color: '#E8DCC8',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptySub: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 13,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: '#1e1e20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%' as const,
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center' as const,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  modalBody: {
    paddingHorizontal: 20,
    flexGrow: 0,
  },
  modalBodyContent: {
    paddingBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.6)',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  typeBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderColor: '#BFA35D',
  },
  typeBtnText: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  typeBtnTextActive: {
    color: '#BFA35D',
  },
  sponsorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sponsorChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  sponsorChipActive: {
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderColor: '#BFA35D',
  },
  sponsorChipText: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sponsorChipTextActive: {
    color: '#BFA35D',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: '#BFA35D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center' as const,
    margin: 20,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
