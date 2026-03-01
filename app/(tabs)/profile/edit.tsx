import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Check, ImageIcon, Trash2, MapPin, Home, Sparkles, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';

import { PERSONAL_VALUES } from '@/constants/types';
import { BUNDESLAENDER } from '@/constants/types';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, Paths, Directory } from 'expo-file-system';

const BUNDESLAND_MAP: Record<string, string> = {
  'berlin': 'Berlin',
  'münchen': 'Bayern',
  'munich': 'Bayern',
  'hamburg': 'Hamburg',
  'köln': 'Nordrhein-Westfalen',
  'cologne': 'Nordrhein-Westfalen',
  'düsseldorf': 'Nordrhein-Westfalen',
  'dortmund': 'Nordrhein-Westfalen',
  'essen': 'Nordrhein-Westfalen',
  'bonn': 'Nordrhein-Westfalen',
  'frankfurt': 'Hessen',
  'frankfurt am main': 'Hessen',
  'wiesbaden': 'Hessen',
  'stuttgart': 'Baden-Württemberg',
  'karlsruhe': 'Baden-Württemberg',
  'freiburg': 'Baden-Württemberg',
  'heidelberg': 'Baden-Württemberg',
  'mannheim': 'Baden-Württemberg',
  'dresden': 'Sachsen',
  'leipzig': 'Sachsen',
  'chemnitz': 'Sachsen',
  'nürnberg': 'Bayern',
  'augsburg': 'Bayern',
  'regensburg': 'Bayern',
  'hannover': 'Niedersachsen',
  'braunschweig': 'Niedersachsen',
  'bremen': 'Bremen',
  'kiel': 'Schleswig-Holstein',
  'lübeck': 'Schleswig-Holstein',
  'rostock': 'Mecklenburg-Vorpommern',
  'schwerin': 'Mecklenburg-Vorpommern',
  'potsdam': 'Brandenburg',
  'magdeburg': 'Sachsen-Anhalt',
  'halle': 'Sachsen-Anhalt',
  'erfurt': 'Thüringen',
  'jena': 'Thüringen',
  'weimar': 'Thüringen',
  'mainz': 'Rheinland-Pfalz',
  'trier': 'Rheinland-Pfalz',
  'saarbrücken': 'Saarland',
};

function detectBundesland(city: string): string {
  if (!city) return '';
  const lower = city.toLowerCase().trim();
  if (BUNDESLAND_MAP[lower]) return BUNDESLAND_MAP[lower];
  for (const [key, value] of Object.entries(BUNDESLAND_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return '';
}

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useSocial();
  const { user } = useAuth();


  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState<string>(profile.displayName || user?.name || '');
  const [bio, setBio] = useState<string>(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl ?? '');
  const [selectedValues, setSelectedValues] = useState<string[]>(profile.values ?? []);
  const [birthplace, setBirthplace] = useState<string>(profile.birthplace ?? '');
  const [residence, setResidence] = useState<string>(profile.residence ?? '');

  const detectedBundesland = useMemo(() => {
    const fromResidence = detectBundesland(residence);
    if (fromResidence) return fromResidence;
    return detectBundesland(birthplace);
  }, [residence, birthplace]);

  const toggleValue = useCallback((value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedValues((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= 5) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return prev;
      }
      return [...prev, value];
    });
  }, []);

  const saveImagePermanently = useCallback(async (tempUri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      return tempUri;
    }
    try {
      const avatarDir = new Directory(Paths.document, 'avatars');
      if (!avatarDir.exists) {
        avatarDir.create({ intermediates: true });
      }
      const ext = tempUri.split('.').pop() || 'jpg';
      const fileName = `avatar_${Date.now()}.${ext}`;
      const destFile = new ExpoFile(avatarDir, fileName);
      const srcFile = new ExpoFile(tempUri);
      srcFile.copy(destFile);
      console.log('[EDIT] Image saved permanently to:', destFile.uri);
      return destFile.uri;
    } catch (e) {
      console.log('[EDIT] Failed to save image permanently:', e);
      return tempUri;
    }
  }, []);

  const pickImageFromLibrary = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      console.log('[EDIT] Image picker result:', result.canceled);
      if (!result.canceled && result.assets[0]) {
        const permanentUri = await saveImagePermanently(result.assets[0].uri);
        setAvatarUrl(permanentUri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('[EDIT] Image picker error:', e);
      Alert.alert('Fehler', 'Bild konnte nicht geladen werden.');
    }
  }, [saveImagePermanently]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Kamerazugriff in den Einstellungen.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      console.log('[EDIT] Camera result:', result.canceled);
      if (!result.canceled && result.assets[0]) {
        const permanentUri = await saveImagePermanently(result.assets[0].uri);
        setAvatarUrl(permanentUri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('[EDIT] Camera error:', e);
      Alert.alert('Fehler', 'Foto konnte nicht aufgenommen werden.');
    }
  }, [saveImagePermanently]);

  const handleChangeAvatar = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options = avatarUrl
      ? ['Foto aufnehmen', 'Aus Galerie wählen', 'Profilbild entfernen', 'Abbrechen']
      : ['Foto aufnehmen', 'Aus Galerie wählen', 'Abbrechen'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = avatarUrl ? 2 : undefined;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
          title: 'Profilbild ändern',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          else if (buttonIndex === 1) pickImageFromLibrary();
          else if (avatarUrl && buttonIndex === 2) setAvatarUrl('');
        },
      );
    } else {
      Alert.alert('Profilbild ändern', undefined, [
        { text: 'Foto aufnehmen', onPress: takePhoto },
        { text: 'Aus Galerie wählen', onPress: pickImageFromLibrary },
        ...(avatarUrl ? [{ text: 'Profilbild entfernen', onPress: () => setAvatarUrl(''), style: 'destructive' as const }] : []),
        { text: 'Abbrechen', style: 'cancel' as const },
      ]);
    }
  }, [avatarUrl, takePhoto, pickImageFromLibrary]);

  const handleSave = useCallback(() => {
    if (!displayName.trim()) {
      Alert.alert('Fehler', 'Der Anzeigename darf nicht leer sein.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || null,
      values: selectedValues,
      birthplace: birthplace.trim(),
      residence: residence.trim(),
      bundesland: detectedBundesland,
    });
    router.back();
  }, [displayName, bio, avatarUrl, selectedValues, birthplace, residence, detectedBundesland, updateProfile, router]);

  const initial = (displayName || user?.name || 'U').charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ChevronLeft size={20} color="#BFA35D" />
        </Pressable>
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

        <Text style={styles.heroTitle}>Profil bearbeiten</Text>

      <View style={styles.avatarSection}>
        <Pressable onPress={handleChangeAvatar} style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Camera size={16} color="#FFFFFF" />
          </View>
        </Pressable>
        <Pressable
          style={styles.changeAvatarBtn}
          onPress={handleChangeAvatar}
          testID="change-avatar-btn"
        >
          <ImageIcon size={16} color="#BFA35D" />
          <Text style={styles.changeAvatarText}>Foto ändern</Text>
        </Pressable>
        {avatarUrl ? (
          <Pressable
            style={styles.removeAvatarBtn}
            onPress={() => { setAvatarUrl(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Trash2 size={14} color="#C06060" />
            <Text style={styles.removeAvatarText}>Entfernen</Text>
          </Pressable>
        ) : null}
      </View>
      </LinearGradient>

      <View style={styles.formSection}>
        <Text style={styles.editLabel}>Anzeigename</Text>
        <TextInput
          style={styles.editInput}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
          placeholder="Dein Name"
          placeholderTextColor="rgba(191,163,93,0.3)"
          testID="edit-displayname-input"
        />

        <Text style={styles.editLabel}>Bio</Text>
        <TextInput
          style={[styles.editInput, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          maxLength={200}
          multiline
          placeholder="Erzähle etwas über dich..."
          placeholderTextColor="rgba(191,163,93,0.3)"
          testID="edit-bio-input"
        />
        <Text style={styles.charCount}>
          {bio.length}/200
        </Text>
      </View>

      <View style={styles.locationSection}>
        <View style={styles.sectionHeader}>
          <MapPin size={18} color="#BFA35D" />
          <Text style={styles.sectionTitle}>Herkunft & Wohnort</Text>
        </View>

        <Text style={styles.editLabel}>Geburtsort</Text>
        <TextInput
          style={styles.editInput}
          value={birthplace}
          onChangeText={setBirthplace}
          maxLength={80}
          placeholder="z.B. München, Berlin..."
          placeholderTextColor="rgba(191,163,93,0.3)"
          testID="edit-birthplace-input"
        />

        <Text style={styles.editLabel}>Wohnort</Text>
        <TextInput
          style={styles.editInput}
          value={residence}
          onChangeText={setResidence}
          maxLength={80}
          placeholder="z.B. Hamburg, Köln..."
          placeholderTextColor="rgba(191,163,93,0.3)"
          testID="edit-residence-input"
        />

        {detectedBundesland ? (
          <View style={styles.bundeslandTag}>
            <Home size={14} color="#BFA35D" />
            <Text style={styles.bundeslandText}>
              {detectedBundesland}
            </Text>
          </View>
        ) : (residence.trim() || birthplace.trim()) ? (
          <Text style={styles.bundeslandHint}>
            Bundesland wird automatisch erkannt
          </Text>
        ) : null}
      </View>

      <View style={styles.valuesSection}>
        <View style={styles.sectionHeader}>
          <Sparkles size={18} color="#BFA35D" />
          <Text style={styles.sectionTitle}>Persönliche Werte</Text>
        </View>
        <Text style={styles.valuesHint}>
          Wähle 3–5 Werte, die dir wichtig sind. Sie werden als Badges in deinem Profil angezeigt.
        </Text>
        <Text style={[styles.valuesCount, { color: selectedValues.length >= 3 ? '#BFA35D' : 'rgba(191,163,93,0.3)' }]}>
          {selectedValues.length}/5 gewählt {selectedValues.length < 3 ? '(min. 3)' : ''}
        </Text>
        <View style={styles.valuesGrid}>
          {PERSONAL_VALUES.map((value) => {
            const isSelected = selectedValues.includes(value);
            return (
              <Pressable
                key={value}
                style={[
                  styles.valueChip,
                  isSelected ? styles.valueChipSelected : styles.valueChipDefault,
                ]}
                onPress={() => toggleValue(value)}
                testID={`value-chip-${value}`}
              >
                <Text
                  style={[
                    styles.valueChipText,
                    { color: isSelected ? '#1c1c1e' : '#E8DCC8' },
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={styles.saveBtn}
        onPress={handleSave}
        testID="save-profile-btn"
      >
        <Check size={20} color="#1c1c1e" />
        <Text style={styles.saveBtnText}>Speichern</Text>
      </Pressable>


    </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'flex-start' as const,
    marginBottom: 20,
    zIndex: 10,
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
  heroTitle: {
    color: '#E8DCC8',
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e1d1a',
    backgroundColor: '#BFA35D',
  },
  removeAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  removeAvatarText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#C06060',
  },
  avatarText: {
    color: '#E8DCC8',
    fontSize: 36,
    fontWeight: '800' as const,
  },
  changeAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  formSection: {
    gap: 4,
    paddingHorizontal: 20,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
    marginTop: 12,
    color: 'rgba(191,163,93,0.6)',
  },
  editInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E8DCC8',
    backgroundColor: '#1e1e20',
    borderColor: 'rgba(191,163,93,0.1)',
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    color: 'rgba(191,163,93,0.3)',
  },
  locationSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  bundeslandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  bundeslandText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  bundeslandHint: {
    fontSize: 12,
    marginTop: 8,
    color: 'rgba(191,163,93,0.3)',
  },
  valuesSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  valuesHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 4,
    color: 'rgba(232,220,200,0.5)',
  },
  valuesCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  valueChipSelected: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  valueChipDefault: {
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderColor: 'rgba(191,163,93,0.15)',
  },
  valueChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 28,
    marginHorizontal: 20,
    backgroundColor: '#BFA35D',
  },
  saveBtnText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700' as const,
  },

});
