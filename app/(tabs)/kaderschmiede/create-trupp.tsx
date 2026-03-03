import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Dumbbell,
  Swords,
  Timer,
  Snowflake,
  Waves,
  Mountain,
  Leaf,
  Activity,
  Check,
  Lock,
  Unlock,
  Camera,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { SPORT_CATEGORIES, BUNDESLAND_COORDS } from '@/constants/kaderschmiede';
import { supabase } from '@/lib/supabase';
import type { SportCategory } from '@/constants/kaderschmiede';
import { useAlert } from '@/providers/AlertProvider';

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

const BUNDESLAENDER = Object.keys(BUNDESLAND_COORDS);

export default function CreateTruppScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { createTrupp } = useKaderschmiede();

  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<SportCategory | null>(null);
  const [city, setCity] = useState('');
  const [bundesland, setBundesland] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const canSubmit = name.trim() && motto.trim() && sport && city.trim() && bundesland && weeklyGoal.trim() && logoUrl;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf deine Fotos.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploadingLogo(true);
      const asset = result.assets[0];
      const url = await uploadLogo(asset.uri, asset.mimeType ?? 'image/jpeg');
      if (url) {
        setLogoUrl(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showAlert('Upload fehlgeschlagen', 'Logo konnte nicht hochgeladen werden.');
      }
    } catch (err) {
      console.log('[CREATE-TRUPP] Logo pick error:', err);
      showAlert('Fehler', 'Logo konnte nicht ausgewählt werden.');
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const takeLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf deine Kamera.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploadingLogo(true);
      const asset = result.assets[0];
      const url = await uploadLogo(asset.uri, asset.mimeType ?? 'image/jpeg');
      if (url) {
        setLogoUrl(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showAlert('Upload fehlgeschlagen', 'Logo konnte nicht hochgeladen werden.');
      }
    } catch (err) {
      console.log('[CREATE-TRUPP] Logo camera error:', err);
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!canSubmit || !sport || isSubmitting) return;
    setIsSubmitting(true);
    console.log('[CREATE-TRUPP] Creating trupp:', name);
    try {
      await createTrupp({
        name: name.trim(),
        motto: motto.trim(),
        description: description.trim(),
        sport,
        city: city.trim(),
        bundesland,
        isOpen,
        weeklyGoal: weeklyGoal.trim(),
        logoUrl,
      });
      showAlert('Trupp erstellt!', `"${name}" wurde erfolgreich gegründet.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.log('[CREATE-TRUPP] Error:', e);
      showAlert('Fehler', 'Trupp konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, name, motto, description, sport, city, bundesland, isOpen, weeklyGoal, logoUrl, createTrupp, router, isSubmitting]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Trupp gründen</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>TRUPP-LOGO *</Text>
            <View style={styles.logoSection}>
              {logoUrl ? (
                <View style={styles.logoPreviewWrap}>
                  <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
                  <Pressable
                    style={styles.logoRemoveBtn}
                    onPress={() => { setLogoUrl(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    hitSlop={8}
                  >
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              ) : uploadingLogo ? (
                <View style={styles.logoPlaceholder}>
                  <ActivityIndicator size="small" color="#BFA35D" />
                  <Text style={styles.logoPlaceholderText}>Wird hochgeladen...</Text>
                </View>
              ) : (
                <View style={styles.logoPlaceholder}>
                  <ImagePlus size={28} color="rgba(191,163,93,0.3)" />
                  <Text style={styles.logoPlaceholderText}>Logo hochladen</Text>
                </View>
              )}
              <View style={styles.logoButtons}>
                <Pressable
                  style={styles.logoPickBtn}
                  onPress={pickLogo}
                  disabled={uploadingLogo}
                >
                  <ImagePlus size={16} color="#BFA35D" />
                  <Text style={styles.logoPickBtnText}>Galerie</Text>
                </Pressable>
                {Platform.OS !== 'web' && (
                  <Pressable
                    style={styles.logoCameraBtn}
                    onPress={takeLogo}
                    disabled={uploadingLogo}
                  >
                    <Camera size={16} color="#BFA35D" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>NAME *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Eiserne Garde Berlin"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={40}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MOTTO *</Text>
            <TextInput
              style={styles.input}
              value={motto}
              onChangeText={setMotto}
              placeholder="z.B. Stahl formt Charakter"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={60}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BESCHREIBUNG</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Was macht euren Trupp aus?"
              placeholderTextColor="rgba(191,163,93,0.25)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SPORTART *</Text>
            <View style={styles.chipGrid}>
              {SPORT_CATEGORIES.map(s => {
                const Icon = SPORT_ICON_MAP[s] ?? Activity;
                const selected = sport === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.sportChip, selected && styles.sportChipActive]}
                    onPress={() => setSport(selected ? null : s)}
                  >
                    <Icon size={14} color={selected ? '#141416' : '#BFA35D'} />
                    <Text style={[styles.sportChipText, selected && styles.sportChipTextActive]}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>STADT *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="z.B. Berlin"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={30}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BUNDESLAND *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {BUNDESLAENDER.map(bl => {
                  const selected = bundesland === bl;
                  return (
                    <Pressable
                      key={bl}
                      style={[styles.blChip, selected && styles.blChipActive]}
                      onPress={() => setBundesland(selected ? '' : bl)}
                    >
                      <Text style={[styles.blChipText, selected && styles.blChipTextActive]}>
                        {bl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>WOCHENZIEL *</Text>
            <TextInput
              style={styles.input}
              value={weeklyGoal}
              onChangeText={setWeeklyGoal}
              placeholder="z.B. 500 Klimmzüge als Gruppe"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>STATUS</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, isOpen && styles.toggleBtnActive]}
                onPress={() => setIsOpen(true)}
              >
                <Unlock size={14} color={isOpen ? '#141416' : 'rgba(191,163,93,0.5)'} />
                <Text style={[styles.toggleText, isOpen && styles.toggleTextActive]}>Offen</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, !isOpen && styles.toggleBtnClosed]}
                onPress={() => setIsOpen(false)}
              >
                <Lock size={14} color={!isOpen ? '#141416' : 'rgba(191,163,93,0.5)'} />
                <Text style={[styles.toggleText, !isOpen && styles.toggleTextActive]}>Geschlossen</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit || isSubmitting}
          >
            <Check size={18} color={canSubmit ? '#141416' : 'rgba(20,20,22,0.4)'} />
            <Text style={[styles.createBtnText, !canSubmit && styles.createBtnTextDisabled]}>
              {isSubmitting ? 'Wird erstellt...' : 'Trupp gründen'}
            </Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  header: {
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1e20',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  sportChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  sportChipTextActive: {
    color: '#141416',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  blChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  blChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  blChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  blChipTextActive: {
    color: '#141416',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  toggleBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  toggleBtnClosed: {
    backgroundColor: '#C06060',
    borderColor: '#C06060',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  toggleTextActive: {
    color: '#141416',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
    marginTop: 12,
  },
  createBtnDisabled: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  createBtnTextDisabled: {
    color: 'rgba(20,20,22,0.4)',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoPreviewWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  logoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logoPlaceholderText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.3)',
    textAlign: 'center' as const,
  },
  logoButtons: {
    flex: 1,
    gap: 8,
  },
  logoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  logoPickBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  logoCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
});

async function uploadLogo(uri: string, mimeType: string): Promise<string | null> {
  try {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `trupp-logos/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    console.log('[CREATE-TRUPP] Uploading logo:', fileName);

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from('admin-uploads')
        .upload(fileName, blob, { contentType: mimeType, upsert: false });
      if (error) {
        console.log('[CREATE-TRUPP] Upload error:', error.message);
        return null;
      }
      const { data: urlData } = supabase.storage.from('admin-uploads').getPublicUrl(data.path);
      return urlData.publicUrl;
    }

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    const { data, error } = await supabase.storage
      .from('admin-uploads')
      .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: false });
    if (error) {
      console.log('[CREATE-TRUPP] Upload error:', error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from('admin-uploads').getPublicUrl(data.path);
    console.log('[CREATE-TRUPP] Logo URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.log('[CREATE-TRUPP] Upload exception:', err);
    return null;
  }
}
