import React, { useState, useCallback } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Trash2, Edit3, Building2, X, Globe, Mail, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePromotions } from '@/providers/PromotionProvider';
import { useAlert } from '@/providers/AlertProvider';
import { AdminImagePicker } from '@/components/AdminImagePicker';
import OptimizedImage from '@/components/OptimizedImage';
import type { Sponsor } from '@/constants/types';

export default function SponsorsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sponsors, addSponsor, updateSponsor, deleteSponsor, isSavingSponsor } = usePromotions();
  const { showAlert } = useAlert();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [logoUrls, setLogoUrls] = useState<string[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');

  const resetForm = useCallback(() => {
    setName('');
    setLogoUrls([]);
    setWebsiteUrl('');
    setContactEmail('');
    setEditingId(null);
    setModalVisible(false);
  }, []);

  const loadForEdit = useCallback((s: Sponsor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(s.name);
    setLogoUrls(s.logoUrl ? [s.logoUrl] : []);
    setWebsiteUrl(s.websiteUrl);
    setContactEmail(s.contactEmail);
    setEditingId(s.id);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showAlert('Fehler', 'Bitte Name eingeben', [{ text: 'OK' }]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = {
        name: name.trim(),
        logoUrl: logoUrls[0] || '',
        websiteUrl: websiteUrl.trim(),
        contactEmail: contactEmail.trim(),
      };
      if (editingId) {
        await updateSponsor(editingId, data);
        console.log('[ADMIN] Sponsor updated:', editingId);
      } else {
        await addSponsor(data);
        console.log('[ADMIN] Sponsor created');
      }
      resetForm();
    } catch (e: any) {
      console.log('[ADMIN] Sponsor save error:', e);
      showAlert('Fehler', e.message ?? 'Speichern fehlgeschlagen', [{ text: 'OK' }]);
    }
  }, [name, logoUrls, websiteUrl, contactEmail, editingId, addSponsor, updateSponsor, resetForm, showAlert]);

  const handleDelete = useCallback((id: string, sponsorName: string) => {
    showAlert(
      `"${sponsorName}" löschen?`,
      'Sponsor und zugehörige Daten werden gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSponsor(id);
              console.log('[ADMIN] Sponsor deleted:', id);
            } catch (e) {
              console.log('[ADMIN] Delete error:', e);
            }
          },
        },
      ],
      'warning',
    );
  }, [deleteSponsor, showAlert]);

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
            <Building2 size={32} color="#BFA35D" />
          </View>
          <Text style={styles.heroTitle}>Sponsoren</Text>
          <Text style={styles.heroSubtitle}>
            Verwalte deine Sponsoren und Partner.
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
            testID="add-sponsor-btn"
          >
            <Plus size={18} color="#1c1c1e" />
            <Text style={styles.addBtnText}>Neu erstellen</Text>
          </Pressable>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{sponsors.length}</Text>
          </View>
        </View>

        {sponsors.map((s) => (
          <View key={s.id} style={styles.sponsorCard}>
            <View style={styles.sponsorRow}>
              {s.logoUrl ? (
                <View style={styles.logoWrap}>
                  <OptimizedImage
                    source={{ uri: s.logoUrl }}
                    style={styles.logo}
                    contentFit="contain"
                    variant="dark"
                  />
                </View>
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Building2 size={20} color="rgba(191,163,93,0.4)" />
                </View>
              )}
              <View style={styles.sponsorInfo}>
                <Text style={styles.sponsorName}>{s.name}</Text>
                <View style={styles.sponsorMeta}>
                  {s.websiteUrl ? (
                    <View style={styles.metaItem}>
                      <Globe size={10} color="rgba(191,163,93,0.4)" />
                      <Text style={styles.metaText} numberOfLines={1}>{s.websiteUrl.replace('https://', '')}</Text>
                    </View>
                  ) : null}
                  {s.contactEmail ? (
                    <View style={styles.metaItem}>
                      <Mail size={10} color="rgba(191,163,93,0.4)" />
                      <Text style={styles.metaText} numberOfLines={1}>{s.contactEmail}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.sponsorActions}>
                <Pressable style={styles.iconBtn} onPress={() => loadForEdit(s)}>
                  <Edit3 size={15} color="#BFA35D" />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => handleDelete(s.id, s.name)}>
                  <Trash2 size={15} color="#C06060" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {sponsors.length === 0 && (
          <View style={styles.emptyState}>
            <Building2 size={40} color="rgba(191,163,93,0.3)" />
            <Text style={styles.emptyTitle}>Keine Sponsoren</Text>
            <Text style={styles.emptySub}>Registriere deinen ersten Sponsor</Text>
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
                  {editingId ? 'Sponsor bearbeiten' : 'Neuer Sponsor'}
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
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Firmenname"
                  placeholderTextColor="rgba(191,163,93,0.3)"
                />

                <AdminImagePicker
                  images={logoUrls}
                  onImagesChange={setLogoUrls}
                  maxImages={1}
                  bucket="admin-uploads"
                  folder="sponsors"
                  label="Logo"
                />

                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://..."
                  placeholderTextColor="rgba(191,163,93,0.3)"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Kontakt E-Mail</Text>
                <TextInput
                  style={styles.input}
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  placeholder="kontakt@firma.de"
                  placeholderTextColor="rgba(191,163,93,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={{ height: 20 }} />
              </ScrollView>

              <Pressable
                style={[styles.saveBtn, isSavingSponsor && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSavingSponsor}
                testID="save-sponsor-btn"
              >
                {isSavingSponsor ? (
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
  sponsorCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  logo: {
    width: 44,
    height: 44,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorName: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sponsorMeta: {
    marginTop: 3,
    gap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    maxWidth: 180,
  },
  sponsorActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.1)',
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
