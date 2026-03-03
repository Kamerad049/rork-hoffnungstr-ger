import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Trash2, Edit3, Building2, X, Globe, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePromotions } from '@/providers/PromotionProvider';
import { useAlert } from '@/providers/AlertProvider';
import OptimizedImage from '@/components/OptimizedImage';
import type { Sponsor } from '@/constants/types';

export default function SponsorsScreen() {
  const { sponsors, addSponsor, updateSponsor, deleteSponsor, isSavingSponsor } = usePromotions();
  const { showAlert } = useAlert();

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');

  const resetForm = useCallback(() => {
    setName('');
    setLogoUrl('');
    setWebsiteUrl('');
    setContactEmail('');
    setEditingId(null);
    setShowForm(false);
  }, []);

  const loadForEdit = useCallback((s: Sponsor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(s.name);
    setLogoUrl(s.logoUrl);
    setWebsiteUrl(s.websiteUrl);
    setContactEmail(s.contactEmail);
    setEditingId(s.id);
    setShowForm(true);
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
        logoUrl: logoUrl.trim(),
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
  }, [name, logoUrl, websiteUrl, contactEmail, editingId, addSponsor, updateSponsor, resetForm, showAlert]);

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
      <Stack.Screen options={{ title: 'Sponsoren' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Sponsoren</Text>
            <Text style={styles.headerSub}>{sponsors.length} registriert</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              resetForm();
              setShowForm(true);
            }}
            testID="add-sponsor-btn"
          >
            <Plus size={18} color="#1c1c1e" />
            <Text style={styles.addBtnText}>Neu</Text>
          </Pressable>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{editingId ? 'Bearbeiten' : 'Neuer Sponsor'}</Text>
              <Pressable onPress={resetForm} hitSlop={8}>
                <X size={18} color="rgba(232,220,200,0.5)" />
              </Pressable>
            </View>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Firmenname"
              placeholderTextColor="rgba(191,163,93,0.3)"
            />

            <Text style={styles.label}>Logo URL</Text>
            <TextInput
              style={styles.input}
              value={logoUrl}
              onChangeText={setLogoUrl}
              placeholder="https://..."
              placeholderTextColor="rgba(191,163,93,0.3)"
              autoCapitalize="none"
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
          </View>
        )}

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

        {sponsors.length === 0 && !showForm && (
          <View style={styles.emptyState}>
            <Building2 size={40} color="rgba(191,163,93,0.3)" />
            <Text style={styles.emptyTitle}>Keine Sponsoren</Text>
            <Text style={styles.emptySub}>Registriere deinen ersten Sponsor</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#BFA35D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  formCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  sponsorCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
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
});
