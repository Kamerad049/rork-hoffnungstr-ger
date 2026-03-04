import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Wand2, RefreshCw, Sparkles, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useMutation } from '@tanstack/react-query';
import { useAlert } from '@/providers/AlertProvider';
import { useSocial } from '@/providers/SocialProvider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

interface AvatarStyle {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

const AVATAR_STYLES: AvatarStyle[] = [
  {
    id: 'anime',
    label: 'Anime',
    prompt: 'Transform this portrait photo into a high-quality anime-style avatar. Keep the facial features recognizable but stylize them in a beautiful anime art style with vibrant colors, clean lines, and expressive eyes. Make it look like a professional anime character portrait with soft lighting and detailed shading.',
    icon: '🎨',
  },
  {
    id: '3d-render',
    label: '3D Charakter',
    prompt: 'Transform this portrait photo into a high-quality 3D rendered character avatar, similar to Pixar or Disney animation style. Keep the facial features recognizable. Make it look polished with soft studio lighting, smooth skin texture, and vibrant but natural colors. Professional quality 3D render.',
    icon: '🧊',
  },
  {
    id: 'oil-painting',
    label: 'Ölgemälde',
    prompt: 'Transform this portrait photo into a beautiful oil painting style avatar. Keep the facial features recognizable. Make it look like a classic Renaissance portrait with rich colors, dramatic lighting, visible brushstrokes, and a luxurious golden-warm atmosphere. Museum-quality fine art painting.',
    icon: '🖼️',
  },
  {
    id: 'comic',
    label: 'Comic',
    prompt: 'Transform this portrait photo into a bold comic book style avatar. Keep the facial features recognizable. Use strong outlines, cel-shading, dynamic colors, and halftone effects. Make it look like a professional superhero comic book character portrait.',
    icon: '💥',
  },
  {
    id: 'watercolor',
    label: 'Aquarell',
    prompt: 'Transform this portrait photo into a delicate watercolor painting avatar. Keep the facial features recognizable. Use soft washes of color, gentle blending, subtle paper texture, and an artistic ethereal quality. Make it look like a professional watercolor portrait with beautiful color bleeds.',
    icon: '💧',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    prompt: 'Transform this portrait photo into a futuristic cyberpunk style avatar. Keep the facial features recognizable. Add neon glows, holographic elements, tech enhancements, dark moody lighting with vibrant neon accents in pink, blue, and purple. High-tech sci-fi portrait.',
    icon: '🤖',
  },
  {
    id: 'medieval',
    label: 'Mittelalter',
    prompt: 'Transform this portrait photo into a medieval knight or noble portrait avatar. Keep the facial features recognizable. Add period-appropriate clothing (armor, crown, or noble attire), dramatic candlelit lighting, and a regal atmosphere. Old master painting style with Germanic medieval elements.',
    icon: '⚔️',
  },
  {
    id: 'pop-art',
    label: 'Pop Art',
    prompt: 'Transform this portrait photo into a bold Andy Warhol-inspired pop art avatar. Keep the facial features recognizable. Use flat bold colors, strong contrast, screen-print texture effect, and a vibrant graphic design aesthetic. High-impact pop art portrait.',
    icon: '🎯',
  },
];

export default function AvatarGeneratorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { updateProfile, profile } = useSocial();
  const { user } = useAuth();
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>();

  const [sourceImage, setSourceImage] = useState<string>(imageUri || profile.avatarUrl || '');
  const [selectedStyle, setSelectedStyle] = useState<string>('anime');
  const [generatedAvatar, setGeneratedAvatar] = useState<string>('');
  const [generatedBase64, setGeneratedBase64] = useState<string>('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (generatedAvatar) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [generatedAvatar]);

  const pickSourceImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSourceImage(result.assets[0].uri);
        setGeneratedAvatar('');
        setGeneratedBase64('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('[AVATAR] Image picker error:', e);
      showAlert('Fehler', 'Bild konnte nicht geladen werden.', undefined, 'error');
    }
  }, [showAlert]);

  const convertImageToBase64 = useCallback(async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!sourceImage) throw new Error('Kein Bild ausgewählt');
      const style = AVATAR_STYLES.find(s => s.id === selectedStyle);
      if (!style) throw new Error('Kein Stil ausgewählt');

      console.log('[AVATAR] Converting image to base64...');
      const base64 = await convertImageToBase64(sourceImage);
      console.log('[AVATAR] Base64 length:', base64.length);

      console.log('[AVATAR] Sending to edit API with style:', style.id);
      const response = await fetch('https://toolkit.rork.com/images/edit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: style.prompt,
          images: [{ type: 'image', image: base64 }],
          aspectRatio: '1:1',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[AVATAR] API error:', errorText);
        throw new Error('Avatar konnte nicht generiert werden');
      }

      const data = await response.json();
      console.log('[AVATAR] Generation successful, mime:', data.image?.mimeType);
      return data;
    },
    onSuccess: (data) => {
      const base64Uri = `data:${data.image.mimeType};base64,${data.image.base64Data}`;
      setGeneratedAvatar(base64Uri);
      setGeneratedBase64(data.image.base64Data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.log('[AVATAR] Generation error:', error);
      showAlert('Fehler', 'Der Avatar konnte leider nicht erstellt werden. Bitte versuche es erneut.', undefined, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const saveAvatarMutation = useMutation({
    mutationFn: async () => {
      if (!generatedBase64) throw new Error('Kein Avatar vorhanden');

      const userId = user?.id;
      if (!userId) throw new Error('Nicht angemeldet');

      console.log('[AVATAR] Uploading to Supabase Storage...');
      const fileName = `avatars/${userId}/ai_avatar_${Date.now()}.png`;

      const mimeType = 'image/png';
      const dataUri = `data:${mimeType};base64,${generatedBase64}`;
      console.log('[AVATAR] Converting data URI to blob, base64 length:', generatedBase64.length);

      const response = await fetch(dataUri);
      const blob = await response.blob();
      console.log('[AVATAR] Blob created, size:', blob.size);

      const { data, error } = await supabase.storage
        .from('admin-uploads')
        .upload(fileName, blob, { contentType: mimeType, upsert: true });

      if (error) {
        console.log('[AVATAR] Upload error:', error.message);
        throw new Error('Upload fehlgeschlagen: ' + error.message);
      }

      const { data: urlData } = supabase.storage.from('admin-uploads').getPublicUrl(data.path);
      const publicUrl = urlData.publicUrl;
      console.log('[AVATAR] Uploaded, public URL:', publicUrl);

      await updateProfile({ avatarUrl: publicUrl });
      return publicUrl;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Gespeichert', 'Dein neuer Avatar wurde als Profilbild gesetzt!', [
        { text: 'Super!', onPress: () => router.back() },
      ], 'success');
    },
    onError: () => {
      showAlert('Fehler', 'Avatar konnte nicht gespeichert werden.', undefined, 'error');
    },
  });

  const { mutate: generate } = generateMutation;
  const handleGenerate = useCallback(() => {
    if (!sourceImage) {
      showAlert('Kein Bild', 'Bitte wähle zuerst ein Foto aus.', undefined, 'warning');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generate();
  }, [sourceImage, generate, showAlert]);

  const isGenerating = generateMutation.isPending;
  const currentStyle = AVATAR_STYLES.find(s => s.id === selectedStyle);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#1a1917', '#141416']}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <ChevronLeft size={20} color="#BFA35D" />
            </Pressable>
            <View style={styles.headerTitleRow}>
              <Wand2 size={20} color="#BFA35D" />
              <Text style={styles.headerTitle}>KI-Avatar</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={styles.headerSubtitle}>
            Verwandle dein Foto in einen einzigartigen Avatar
          </Text>
        </LinearGradient>

        <Animated.View style={[styles.previewSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.previewRow}>
            <Pressable onPress={pickSourceImage} style={styles.imageContainer}>
              {sourceImage ? (
                <Image source={{ uri: sourceImage }} style={styles.previewImage} contentFit="cover" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderIcon}>📷</Text>
                  <Text style={styles.placeholderText}>Foto wählen</Text>
                </View>
              )}
              <View style={styles.imageLabel}>
                <Text style={styles.imageLabelText}>Original</Text>
              </View>
            </Pressable>

            <View style={styles.arrowContainer}>
              <Sparkles size={24} color="#BFA35D" />
            </View>

            <Animated.View style={[styles.imageContainer, { transform: [{ scale: pulseAnim }] }]}>
              {isGenerating ? (
                <View style={styles.loadingImage}>
                  <ActivityIndicator size="large" color="#BFA35D" />
                  <Text style={styles.loadingText}>Erstelle...</Text>
                </View>
              ) : generatedAvatar ? (
                <Image source={{ uri: generatedAvatar }} style={styles.previewImage} contentFit="cover" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderIcon}>✨</Text>
                  <Text style={styles.placeholderText}>Avatar</Text>
                </View>
              )}
              <View style={styles.imageLabel}>
                <Text style={styles.imageLabelText}>{currentStyle?.label ?? 'Avatar'}</Text>
              </View>
            </Animated.View>
          </View>

          {!sourceImage && (
            <Pressable style={styles.selectPhotoBtn} onPress={pickSourceImage}>
              <Text style={styles.selectPhotoBtnText}>Foto auswählen</Text>
            </Pressable>
          )}
        </Animated.View>

        <View style={styles.stylesSection}>
          <Text style={styles.sectionTitle}>Stil wählen</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stylesRow}
          >
            {AVATAR_STYLES.map((style) => {
              const isActive = selectedStyle === style.id;
              return (
                <Pressable
                  key={style.id}
                  style={[styles.styleChip, isActive && styles.styleChipActive]}
                  onPress={() => {
                    setSelectedStyle(style.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  testID={`style-${style.id}`}
                >
                  <Text style={styles.styleIcon}>{style.icon}</Text>
                  <Text style={[styles.styleLabel, isActive && styles.styleLabelActive]}>
                    {style.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.actionsSection}>
          <Pressable
            style={[styles.generateBtn, (!sourceImage || isGenerating) && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={!sourceImage || isGenerating}
            testID="generate-avatar-btn"
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#1c1c1e" />
            ) : (
              <Wand2 size={20} color="#1c1c1e" />
            )}
            <Text style={styles.generateBtnText}>
              {isGenerating ? 'Wird erstellt...' : 'Avatar generieren'}
            </Text>
          </Pressable>

          {generatedAvatar ? (
            <View style={styles.resultActions}>
              <Pressable
                style={styles.retryBtn}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw size={18} color="#BFA35D" />
                <Text style={styles.retryBtnText}>Nochmal</Text>
              </Pressable>

              <Pressable
                style={styles.useAvatarBtn}
                onPress={() => saveAvatarMutation.mutate()}
                disabled={saveAvatarMutation.isPending}
                testID="use-avatar-btn"
              >
                {saveAvatarMutation.isPending ? (
                  <ActivityIndicator size="small" color="#1c1c1e" />
                ) : (
                  <Check size={18} color="#1c1c1e" />
                )}
                <Text style={styles.useAvatarBtnText}>Als Profilbild verwenden</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Die KI wandelt dein Foto in den gewählten Stil um. Du kannst verschiedene Stile ausprobieren und den besten als Profilbild speichern.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center',
  },
  previewSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 150,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.15)',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.04)',
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.4)',
    fontWeight: '500' as const,
  },
  loadingImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.04)',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.6)',
    fontWeight: '500' as const,
  },
  imageLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  imageLabelText: {
    fontSize: 11,
    color: '#E8DCC8',
    fontWeight: '600' as const,
  },
  arrowContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectPhotoBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  selectPhotoBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  stylesSection: {
    marginTop: 28,
    paddingLeft: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 14,
  },
  stylesRow: {
    gap: 10,
    paddingRight: 20,
  },
  styleChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.1)',
    minWidth: 85,
  },
  styleChipActive: {
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderColor: '#BFA35D',
  },
  styleIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  styleLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  styleLabelActive: {
    color: '#BFA35D',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 12,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#BFA35D',
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  useAvatarBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  useAvatarBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(232,220,200,0.35)',
    textAlign: 'center',
  },
});
