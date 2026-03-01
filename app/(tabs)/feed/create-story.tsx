import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { X, Send, ImagePlus, Type, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useStories } from '@/providers/StoriesProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_COLORS = [
  '#1c1c1e',
  '#2C3E50',
  '#8E44AD',
  '#C0392B',
  '#27AE60',
  '#2980B9',
  '#D35400',
  '#16A085',
  '#E74C3C',
  '#3498DB',
  '#F39C12',
  '#1ABC9C',
  '#9B59B6',
  '#34495E',
  '#E67E22',
  '#BFA35D',
];

interface FontOption {
  label: string;
  family: string;
  style: 'normal' | 'italic';
  weight: 'normal' | 'bold' | '300' | '600' | '700' | '900';
}

const FONT_OPTIONS: FontOption[] = [
  { label: 'Standard', family: Platform.OS === 'ios' ? 'System' : 'sans-serif', style: 'normal', weight: 'bold' },
  { label: 'Serif', family: Platform.OS === 'ios' ? 'Georgia' : 'serif', style: 'normal', weight: 'normal' },
  { label: 'Mono', family: Platform.OS === 'ios' ? 'Courier New' : 'monospace', style: 'normal', weight: 'bold' },
  { label: 'Leicht', family: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light', style: 'normal', weight: '300' },
  { label: 'Kursiv', family: Platform.OS === 'ios' ? 'Georgia' : 'serif', style: 'italic', weight: 'normal' },
  { label: 'Schwer', family: Platform.OS === 'ios' ? 'System' : 'sans-serif', style: 'normal', weight: '900' },
];

type StoryMode = 'text' | 'photo';

export default function CreateStoryScreen() {
  const { colors } = useTheme();
  const { createStory } = useStories();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<StoryMode>('text');
  const [text, setText] = useState<string>('');
  const [selectedBg, setSelectedBg] = useState<string>(BG_COLORS[0]);
  const [selectedFont, setSelectedFont] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showFontPicker, setShowFontPicker] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const imgScaleVal = useRef(new Animated.Value(1)).current;
  const imgTranslateX = useRef(new Animated.Value(0)).current;
  const imgTranslateY = useRef(new Animated.Value(0)).current;

  const imgBaseScale = useRef(1);
  const imgLastScale = useRef(1);
  const imgBaseTransX = useRef(0);
  const imgBaseTransY = useRef(0);
  const imgLastTransX = useRef(0);
  const imgLastTransY = useRef(0);
  const imgInitialPinchDist = useRef(0);
  const imgIsPinching = useRef(false);

  const textPanX = useRef(new Animated.Value(0)).current;
  const textPanY = useRef(new Animated.Value(0)).current;
  const textScaleVal = useRef(new Animated.Value(1)).current;

  const textLastX = useRef(0);
  const textLastY = useRef(0);
  const textLastScale = useRef(1);
  const textBaseScale = useRef(1);
  const textInitialDist = useRef(0);
  const textIsPinching = useRef(false);
  const textIsDragging = useRef(false);

  const getDistance = (touches: { pageX: number; pageY: number }[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const imagePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!imageUri) return false;
          return gestureState.numberActiveTouches === 2;
        },
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            imgIsPinching.current = true;
            imgInitialPinchDist.current = getDistance(touches as { pageX: number; pageY: number }[]);
            imgBaseScale.current = imgLastScale.current;
            imgBaseTransX.current = imgLastTransX.current;
            imgBaseTransY.current = imgLastTransY.current;
          }
        },
        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2 && imgIsPinching.current) {
            const dist = getDistance(touches as { pageX: number; pageY: number }[]);
            let newScale = imgBaseScale.current * (dist / imgInitialPinchDist.current);
            newScale = Math.max(0.3, Math.min(5, newScale));
            imgScaleVal.setValue(newScale);
            imgLastScale.current = newScale;
          }
        },
        onPanResponderRelease: () => {
          imgIsPinching.current = false;
        },
        onPanResponderTerminate: () => {
          imgIsPinching.current = false;
        },
      }),
    [imageUri, imgScaleVal]
  );

  const textPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          if (isEditing) return false;
          return text.trim().length > 0;
        },
        onMoveShouldSetPanResponder: (_, gs) => {
          if (isEditing) return false;
          if (text.trim().length === 0) return false;
          if (gs.numberActiveTouches === 2) return true;
          return Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3;
        },
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            textIsPinching.current = true;
            textIsDragging.current = false;
            textInitialDist.current = getDistance(touches as { pageX: number; pageY: number }[]);
            textBaseScale.current = textLastScale.current;
          } else {
            textIsDragging.current = true;
            textIsPinching.current = false;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (evt, gs) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            if (!textIsPinching.current) {
              textIsPinching.current = true;
              textInitialDist.current = getDistance(touches as { pageX: number; pageY: number }[]);
              textBaseScale.current = textLastScale.current;
            }
            const dist = getDistance(touches as { pageX: number; pageY: number }[]);
            let newScale = textBaseScale.current * (dist / textInitialDist.current);
            newScale = Math.max(0.3, Math.min(4, newScale));
            textScaleVal.setValue(newScale);
            textLastScale.current = newScale;

            const newX = textLastX.current + gs.dx;
            const newY = textLastY.current + gs.dy;
            textPanX.setValue(newX);
            textPanY.setValue(newY);
          } else if (textIsDragging.current) {
            const newX = textLastX.current + gs.dx;
            const newY = textLastY.current + gs.dy;
            textPanX.setValue(newX);
            textPanY.setValue(newY);
          }
        },
        onPanResponderRelease: (_, gs) => {
          if (textIsDragging.current || textIsPinching.current) {
            textLastX.current = textLastX.current + gs.dx;
            textLastY.current = textLastY.current + gs.dy;
          }
          textIsPinching.current = false;
          textIsDragging.current = false;
        },
        onPanResponderTerminate: (_, gs) => {
          if (textIsDragging.current || textIsPinching.current) {
            textLastX.current = textLastX.current + gs.dx;
            textLastY.current = textLastY.current + gs.dy;
          }
          textIsPinching.current = false;
          textIsDragging.current = false;
        },
      }),
    [isEditing, text, textPanX, textPanY, textScaleVal]
  );

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setMode('photo');

        imgScaleVal.setValue(1);
        imgTranslateX.setValue(0);
        imgTranslateY.setValue(0);
        imgLastScale.current = 1;
        imgLastTransX.current = 0;
        imgLastTransY.current = 0;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('[STORY] Image picked:', asset.uri);
      }
    } catch (err) {
      console.log('[STORY] Image picker error:', err);
      Alert.alert('Fehler', 'Bild konnte nicht geladen werden.');
    }
  }, [imgScaleVal, imgTranslateX, imgTranslateY]);

  const removeImage = useCallback(() => {
    setImageUri(null);
    setMode('text');
    imgScaleVal.setValue(1);
    imgTranslateX.setValue(0);
    imgTranslateY.setValue(0);
    imgLastScale.current = 1;
    imgLastTransX.current = 0;
    imgLastTransY.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [imgScaleVal, imgTranslateX, imgTranslateY]);

  const handlePublish = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !imageUri) {
      Alert.alert('Hinweis', 'Bitte schreibe etwas oder füge ein Foto hinzu.');
      return;
    }
    const font = FONT_OPTIONS[selectedFont];
    const fontId = `${font.family}|${font.weight}|${font.style}`;
    const textPos = trimmed ? {
      x: textLastX.current / SCREEN_WIDTH,
      y: textLastY.current / SCREEN_HEIGHT,
      scale: textLastScale.current,
    } : undefined;
    createStory(trimmed, selectedBg, imageUri || undefined, fontId, textPos);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[STORY] Published story, mode:', mode, 'font:', fontId, 'textPos:', textPos);
    router.back();
  }, [text, selectedBg, selectedFont, imageUri, createStory, router, mode]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const toggleFontPicker = useCallback(() => {
    Keyboard.dismiss();
    setIsEditing(false);
    setShowFontPicker((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleTextFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBackgroundPress = useCallback(() => {
    Keyboard.dismiss();
    setIsEditing(false);
  }, []);

  const currentFont = FONT_OPTIONS[selectedFont];

  const textStyle = {
    fontFamily: currentFont.family,
    fontWeight: currentFont.weight as 'normal' | 'bold' | '300' | '600' | '700' | '900',
    fontStyle: currentFont.style as 'normal' | 'italic',
  };

  const canPublish = text.trim().length > 0 || !!imageUri;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.preview, !imageUri && { backgroundColor: selectedBg }]}
          onPress={handleBackgroundPress}
          {...imagePanResponder.panHandlers}
        >
          {imageUri && (
            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                styles.fullImage,
                {
                  transform: [
                    { translateX: imgTranslateX },
                    { translateY: imgTranslateY },
                    { scale: imgScaleVal },
                  ],
                },
              ]}
              resizeMode="cover"
            />
          )}

          {imageUri && <View style={styles.imageOverlay} />}

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={handleClose} hitSlop={16} testID="close-story-create">
              <X size={28} color="#fff" />
            </Pressable>

            <View style={styles.topActions}>
              {imageUri && (
                <Pressable
                  onPress={removeImage}
                  style={styles.topActionBtn}
                  hitSlop={8}
                  testID="remove-image"
                >
                  <Trash2 size={20} color="#fff" />
                </Pressable>
              )}
              <Pressable
                onPress={toggleFontPicker}
                style={[
                  styles.topActionBtn,
                  showFontPicker && styles.topActionBtnActive,
                ]}
                hitSlop={8}
                testID="toggle-font"
              >
                <Type size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={pickImage}
                style={styles.topActionBtn}
                hitSlop={8}
                testID="pick-image"
              >
                <ImagePlus size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={handlePublish}
                style={[
                  styles.publishBtn,
                  { opacity: canPublish ? 1 : 0.4 },
                ]}
                testID="publish-story"
              >
                <Send size={18} color="#fff" />
                <Text style={styles.publishText}>Teilen</Text>
              </Pressable>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.textArea} pointerEvents="box-none">
              <TextInput
                style={[styles.storyInput, textStyle]}
                placeholder="Schreibe etwas..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={text}
                onChangeText={setText}
                onFocus={handleTextFocus}
                multiline
                maxLength={200}
                textAlignVertical="center"
                textAlign="center"
                autoFocus
                testID="story-text-input"
              />
            </View>
          ) : text.trim().length > 0 ? (
            <Animated.View
              style={[
                styles.draggableTextWrap,
                {
                  transform: [
                    { translateX: textPanX },
                    { translateY: textPanY },
                    { scale: textScaleVal },
                  ],
                },
              ]}
              {...textPanResponder.panHandlers}
            >
              <Pressable
                onPress={() => {
                  setIsEditing(true);
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={[styles.draggableText, textStyle]}>{text}</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.textArea} pointerEvents="box-none">
              <Pressable onPress={() => setIsEditing(true)}>
                <Text style={[styles.placeholderText, textStyle]}>Tippe zum Schreiben...</Text>
              </Pressable>
            </View>
          )}

          {imageUri && !isEditing && (
            <View style={styles.pinchHint}>
              <Text style={styles.pinchHintText}>Zwei Finger zum Zoomen</Text>
            </View>
          )}

          {text.trim().length > 0 && !isEditing && (
            <View style={styles.dragHint}>
              <Text style={styles.pinchHintText}>Text halten & verschieben</Text>
            </View>
          )}

          <Text style={styles.charCount}>{text.length}/200</Text>
        </Pressable>

        {showFontPicker && (
          <View style={[styles.fontPicker, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Schriftart</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fontList}
            >
              {FONT_OPTIONS.map((font, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setSelectedFont(i);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.fontOption,
                    { backgroundColor: i === selectedFont ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' },
                    i === selectedFont && styles.fontOptionActive,
                  ]}
                  testID={`font-${i}`}
                >
                  <Text
                    style={[
                      styles.fontPreview,
                      {
                        fontFamily: font.family,
                        fontWeight: font.weight as 'normal' | 'bold' | '300' | '600' | '700' | '900',
                        fontStyle: font.style as 'normal' | 'italic',
                      },
                    ]}
                  >
                    Aa
                  </Text>
                  <Text style={[styles.fontLabel, i === selectedFont && styles.fontLabelActive]}>
                    {font.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {!showFontPicker && !imageUri && (
          <View style={[styles.colorPicker, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Hintergrundfarbe</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorList}
            >
              {BG_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    setSelectedBg(c);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    selectedBg === c && styles.colorSelected,
                  ]}
                  testID={`color-${c}`}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {!showFontPicker && imageUri && (
          <View style={[styles.bottomSpacer, { paddingBottom: insets.bottom }]} />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  preview: {
    flex: 1,
    overflow: 'hidden',
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(191,163,93,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 4,
  },
  publishText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  textArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 5,
  },
  storyInput: {
    color: '#fff',
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 36,
    minHeight: 80,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  draggableTextWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  draggableText: {
    color: '#fff',
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    maxWidth: SCREEN_WIDTH - 40,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 36,
  },
  charCount: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 12,
    zIndex: 5,
  },
  pinchHint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  dragHint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  pinchHintText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fontPicker: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  colorPicker: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  fontList: {
    gap: 10,
    paddingBottom: 4,
  },
  fontOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  fontOptionActive: {
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.6)',
  },
  fontPreview: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 2,
  },
  fontLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '500' as const,
  },
  fontLabelActive: {
    color: '#BFA35D',
  },
  colorList: {
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  bottomSpacer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: 20,
  },
});
