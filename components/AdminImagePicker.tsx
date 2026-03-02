import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { ImagePlus, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/ThemeProvider';

interface AdminImagePickerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  bucket?: string;
  folder?: string;
  label?: string;
}

function AdminImagePickerComponent({
  images,
  onImagesChange,
  maxImages = 5,
  bucket = 'admin-uploads',
  folder = 'images',
  label = 'Bilder',
}: AdminImagePickerProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const pickImages = useCallback(async () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum erreicht', `Du kannst maximal ${maxImages} Bilder hochladen.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: maxImages - images.length,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploading(true);

      const newUrls: string[] = [];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        setUploadProgress(`${i + 1}/${result.assets.length}`);
        console.log('[IMAGE_PICKER] Uploading image:', asset.uri);

        try {
          const url = await uploadToSupabase(asset.uri, asset.mimeType ?? 'image/jpeg', bucket, folder);
          if (url) {
            newUrls.push(url);
            console.log('[IMAGE_PICKER] Upload success:', url);
          }
        } catch (err) {
          console.log('[IMAGE_PICKER] Upload error for asset:', err);
        }
      }

      if (newUrls.length > 0) {
        onImagesChange([...images, ...newUrls]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Upload fehlgeschlagen', 'Bilder konnten nicht hochgeladen werden. Prüfe deine Verbindung.');
      }
    } catch (err) {
      console.log('[IMAGE_PICKER] Pick error:', err);
      Alert.alert('Fehler', 'Bilder konnten nicht ausgewählt werden.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [images, maxImages, onImagesChange, bucket, folder]);

  const takePhoto = useCallback(async () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum erreicht', `Du kannst maximal ${maxImages} Bilder hochladen.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf deine Kamera in den Einstellungen.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets?.length) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploading(true);
      setUploadProgress('1/1');

      const asset = result.assets[0];
      const url = await uploadToSupabase(asset.uri, asset.mimeType ?? 'image/jpeg', bucket, folder);

      if (url) {
        onImagesChange([...images, url]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Upload fehlgeschlagen', 'Foto konnte nicht hochgeladen werden.');
      }
    } catch (err) {
      console.log('[IMAGE_PICKER] Camera error:', err);
      Alert.alert('Fehler', 'Foto konnte nicht aufgenommen werden.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [images, maxImages, onImagesChange, bucket, folder]);

  const removeImage = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  }, [images, onImagesChange]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.tertiaryText }]}>{label}</Text>
        <Text style={[styles.counter, { color: colors.tertiaryText }]}>
          {images.length}/{maxImages}
        </Text>
      </View>

      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.previewScroll}
          contentContainerStyle={styles.previewContent}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.previewWrap}>
              <Image source={{ uri }} style={styles.previewImage} />
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeImage(index)}
                hitSlop={6}
              >
                <X size={12} color="#fff" />
              </Pressable>
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Haupt</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.pickButton,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            uploading && styles.pickButtonDisabled,
          ]}
          onPress={pickImages}
          disabled={uploading || images.length >= maxImages}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.pickButtonText, { color: colors.accent }]}>
                Lädt {uploadProgress}...
              </Text>
            </View>
          ) : (
            <>
              <ImagePlus size={18} color={colors.accent} />
              <Text style={[styles.pickButtonText, { color: colors.primaryText }]}>
                Aus Galerie
              </Text>
            </>
          )}
        </Pressable>

        {Platform.OS !== 'web' && (
          <Pressable
            style={[
              styles.cameraButton,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              uploading && styles.pickButtonDisabled,
            ]}
            onPress={takePhoto}
            disabled={uploading || images.length >= maxImages}
          >
            <Camera size={18} color={colors.accent} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

async function uploadToSupabase(
  uri: string,
  mimeType: string,
  bucket: string,
  folder: string,
): Promise<string | null> {
  try {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    console.log('[UPLOAD] Starting upload:', fileName, 'mimeType:', mimeType);

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: mimeType, upsert: false });

      if (error) {
        console.log('[UPLOAD] Supabase error:', error.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
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
      .from(bucket)
      .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: false });

    if (error) {
      console.log('[UPLOAD] Supabase error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    console.log('[UPLOAD] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.log('[UPLOAD] Exception:', err);
    return null;
  }
}

export const AdminImagePicker = React.memo(AdminImagePickerComponent);

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  counter: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  previewScroll: {
    marginBottom: 10,
  },
  previewContent: {
    gap: 8,
  },
  previewWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mainBadge: {
    position: 'absolute' as const,
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(191,163,93,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  buttonRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  pickButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
  },
  pickButtonDisabled: {
    opacity: 0.5,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cameraButton: {
    width: 46,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
  },
  uploadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
});
