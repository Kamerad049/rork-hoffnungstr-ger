import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  Keyboard,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  X,
  Send,
  ImagePlus,
  Type,
  Trash2,
  BarChart3,
  Clock,
  AtSign,
  MapPin,
  CloudSun,
  Palette,
  Plus,
  Check,
  Search,
} from 'lucide-react-native';
import { cleanPanHandlers } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useStories } from '@/providers/StoriesProvider';
import { useAlert } from '@/providers/AlertProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { StoryMetadata, StoryPoll, StoryWeather, SocialUser } from '@/constants/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_COLORS = [
  '#1c1c1e', '#2C3E50', '#8E44AD', '#C0392B',
  '#27AE60', '#2980B9', '#D35400', '#16A085',
  '#E74C3C', '#3498DB', '#F39C12', '#1ABC9C',
  '#9B59B6', '#34495E', '#E67E22', '#BFA35D',
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

const WEATHER_CODES: Record<number, string> = {
  0: 'Klar', 1: 'Heiter', 2: 'Bewölkt', 3: 'Bedeckt',
  45: 'Nebel', 48: 'Nebel', 51: 'Nieselregen', 53: 'Nieselregen',
  55: 'Nieselregen', 61: 'Regen', 63: 'Regen', 65: 'Starkregen',
  71: 'Schnee', 73: 'Schnee', 75: 'Schnee', 80: 'Schauer',
  81: 'Schauer', 82: 'Schauer', 95: 'Gewitter', 96: 'Gewitter',
};

function FlipClockDisplay({ time }: { time: string }) {
  const parts = time.split(':');
  const h = parts[0] ?? '00';
  const m = parts[1] ?? '00';

  const renderDigit = (digit: string) => (
    <View style={flipStyles.digitBox}>
      <View style={flipStyles.digitTop}>
        <Text style={flipStyles.digitText}>{digit}</Text>
      </View>
      <View style={flipStyles.digitLine} />
      <View style={flipStyles.digitBottom}>
        <Text style={flipStyles.digitText}>{digit}</Text>
      </View>
    </View>
  );

  return (
    <View style={flipStyles.container}>
      <View style={flipStyles.group}>
        {renderDigit(h[0] ?? '0')}
        {renderDigit(h[1] ?? '0')}
      </View>
      <Text style={flipStyles.colon}>:</Text>
      <View style={flipStyles.group}>
        {renderDigit(m[0] ?? '0')}
        {renderDigit(m[1] ?? '0')}
      </View>
    </View>
  );
}

const flipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  group: {
    flexDirection: 'row',
    gap: 2,
  },
  digitBox: {
    width: 32,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#111',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitTop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    width: '100%',
    paddingBottom: 0,
  },
  digitLine: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  digitBottom: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#141414',
    width: '100%',
    paddingTop: 0,
  },
  digitText: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#e0d5b0',
    fontVariant: ['tabular-nums'],
  },
  colon: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#e0d5b0',
    marginHorizontal: 2,
    marginTop: -4,
  },
});

export default function CreateStoryScreen() {
  useTheme();
  const { showAlert } = useAlert();
  const { createStory } = useStories();
  const { allUsersState } = useFriends();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [text, setText] = useState<string>('');
  const [selectedBg, setSelectedBg] = useState<string>(BG_COLORS[0]);
  const [selectedFont, setSelectedFont] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showFontPicker, setShowFontPicker] = useState<boolean>(false);

  const [pollData, setPollData] = useState<StoryPoll | null>(null);
  const [showPollCreator, setShowPollCreator] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [showClock, setShowClock] = useState<boolean>(false);
  const [clockTime, setClockTime] = useState<string>('');

  const [mentions, setMentions] = useState<SocialUser[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState<boolean>(false);
  const [mentionSearch, setMentionSearch] = useState<string>('');

  const [locationName, setLocationName] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);

  const [weatherData, setWeatherData] = useState<StoryWeather | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

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
  const imgPinchCenterX = useRef(0);
  const imgPinchCenterY = useRef(0);

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

  const clockPanX = useRef(new Animated.Value(0)).current;
  const clockPanY = useRef(new Animated.Value(0)).current;
  const clockScaleVal = useRef(new Animated.Value(1)).current;
  const clockLastX = useRef(0);
  const clockLastY = useRef(0);
  const clockLastScale = useRef(1);
  const clockBaseScale = useRef(1);
  const clockInitialDist = useRef(0);
  const clockIsPinching = useRef(false);
  const clockIsDragging = useRef(false);

  useEffect(() => {
    if (showClock) {
      const now = new Date();
      setClockTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      const interval = setInterval(() => {
        const d = new Date();
        setClockTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [showClock]);

  const getDistance = (touches: { pageX: number; pageY: number }[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const imagePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          return evt.nativeEvent.touches.length >= 2 && !!imageUri;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          if (!imageUri) return false;
          if (evt.nativeEvent.touches.length >= 2) return true;
          return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            imgIsPinching.current = true;
            imgInitialPinchDist.current = getDistance(touches as { pageX: number; pageY: number }[]);
            imgBaseScale.current = imgLastScale.current;
            imgBaseTransX.current = imgLastTransX.current;
            imgBaseTransY.current = imgLastTransY.current;
            imgPinchCenterX.current = (touches[0].pageX + touches[1].pageX) / 2;
            imgPinchCenterY.current = (touches[0].pageY + touches[1].pageY) / 2;
          } else {
            imgBaseTransX.current = imgLastTransX.current;
            imgBaseTransY.current = imgLastTransY.current;
          }
        },
        onPanResponderMove: (evt, gs) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2 && imgIsPinching.current) {
            const dist = getDistance(touches as { pageX: number; pageY: number }[]);
            let newScale = imgBaseScale.current * (dist / imgInitialPinchDist.current);
            newScale = Math.max(0.3, Math.min(5, newScale));
            imgScaleVal.setValue(newScale);
            imgLastScale.current = newScale;

            const newCenterX = (touches[0].pageX + touches[1].pageX) / 2;
            const newCenterY = (touches[0].pageY + touches[1].pageY) / 2;
            const panX = imgBaseTransX.current + (newCenterX - imgPinchCenterX.current);
            const panY = imgBaseTransY.current + (newCenterY - imgPinchCenterY.current);
            imgTranslateX.setValue(panX);
            imgTranslateY.setValue(panY);
            imgLastTransX.current = panX;
            imgLastTransY.current = panY;
          } else if (!imgIsPinching.current) {
            const newX = imgBaseTransX.current + gs.dx;
            const newY = imgBaseTransY.current + gs.dy;
            imgTranslateX.setValue(newX);
            imgTranslateY.setValue(newY);
            imgLastTransX.current = newX;
            imgLastTransY.current = newY;
          }
        },
        onPanResponderRelease: () => {
          imgIsPinching.current = false;
        },
        onPanResponderTerminate: () => {
          imgIsPinching.current = false;
        },
      }),
    [imageUri, imgScaleVal, imgTranslateX, imgTranslateY]
  );

  const clockPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => showClock,
        onMoveShouldSetPanResponder: (_, gs) => {
          if (!showClock) return false;
          if (gs.numberActiveTouches === 2) return true;
          return Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3;
        },
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            clockIsPinching.current = true;
            clockIsDragging.current = false;
            clockInitialDist.current = getDistance(touches as { pageX: number; pageY: number }[]);
            clockBaseScale.current = clockLastScale.current;
          } else {
            clockIsDragging.current = true;
            clockIsPinching.current = false;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (evt, gs) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            if (!clockIsPinching.current) {
              clockIsPinching.current = true;
              clockInitialDist.current = getDistance(touches as { pageX: number; pageY: number }[]);
              clockBaseScale.current = clockLastScale.current;
            }
            const dist = getDistance(touches as { pageX: number; pageY: number }[]);
            let newScale = clockBaseScale.current * (dist / clockInitialDist.current);
            newScale = Math.max(0.5, Math.min(3, newScale));
            clockScaleVal.setValue(newScale);
            clockLastScale.current = newScale;
            const newX = clockLastX.current + gs.dx;
            const newY = clockLastY.current + gs.dy;
            clockPanX.setValue(newX);
            clockPanY.setValue(newY);
          } else if (clockIsDragging.current) {
            const newX = clockLastX.current + gs.dx;
            const newY = clockLastY.current + gs.dy;
            clockPanX.setValue(newX);
            clockPanY.setValue(newY);
          }
        },
        onPanResponderRelease: (_, gs) => {
          if (clockIsDragging.current || clockIsPinching.current) {
            clockLastX.current = clockLastX.current + gs.dx;
            clockLastY.current = clockLastY.current + gs.dy;
          }
          clockIsPinching.current = false;
          clockIsDragging.current = false;
        },
        onPanResponderTerminate: (_, gs) => {
          if (clockIsDragging.current || clockIsPinching.current) {
            clockLastX.current = clockLastX.current + gs.dx;
            clockLastY.current = clockLastY.current + gs.dy;
          }
          clockIsPinching.current = false;
          clockIsDragging.current = false;
        },
      }),
    [showClock, clockPanX, clockPanY, clockScaleVal]
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
        setImageUri(result.assets[0].uri);
        imgScaleVal.setValue(1);
        imgTranslateX.setValue(0);
        imgTranslateY.setValue(0);
        imgLastScale.current = 1;
        imgLastTransX.current = 0;
        imgLastTransY.current = 0;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('[STORY] Image picked:', result.assets[0].uri);
      }
    } catch (err) {
      console.log('[STORY] Image picker error:', err);
      showAlert('Fehler', 'Bild konnte nicht geladen werden.');
    }
  }, [imgScaleVal, imgTranslateX, imgTranslateY, showAlert]);

  const removeImage = useCallback(() => {
    setImageUri(null);
    imgScaleVal.setValue(1);
    imgTranslateX.setValue(0);
    imgTranslateY.setValue(0);
    imgLastScale.current = 1;
    imgLastTransX.current = 0;
    imgLastTransY.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [imgScaleVal, imgTranslateX, imgTranslateY]);

  const getCoordinates = useCallback(async (): Promise<{ lat: number; lon: number }> => {
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) throw new Error('No geolocation');
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        return { lat: pos.coords.latitude, lon: pos.coords.longitude };
      } else {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Permission denied');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { lat: loc.coords.latitude, lon: loc.coords.longitude };
      }
    } catch (err) {
      console.log('[STORY] Geolocation failed, using default (Berlin):', err);
      return { lat: 52.52, lon: 13.405 };
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const { lat, lon } = await getCoordinates();
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=de`,
        { headers: { 'User-Agent': 'RorkApp/1.0' } }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
      const state = data.address?.state || '';
      const name = city ? (state ? `${city}, ${state}` : city) : (state || 'Unbekannter Ort');
      setLocationName(name);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('[STORY] Location fetched:', name);
      return { lat, lon };
    } catch (err) {
      console.log('[STORY] Location error:', err);
      setLocationName('Berlin, Deutschland');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('[STORY] Using fallback location: Berlin');
      return { lat: 52.52, lon: 13.405 };
    } finally {
      setLoadingLocation(false);
    }
  }, [getCoordinates]);

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const { lat, lon } = await getCoordinates();
      const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const cw = data.current_weather;
      if (cw) {
        const condition = WEATHER_CODES[cw.weathercode] ?? 'Unbekannt';
        setWeatherData({ temp: Math.round(cw.temperature), condition });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('[STORY] Weather fetched:', cw.temperature, condition);
      } else {
        throw new Error('No current_weather in response');
      }
    } catch (err) {
      console.log('[STORY] Weather error:', err);
      setWeatherData({ temp: 12, condition: 'Bewölkt' });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('[STORY] Using fallback weather data');
    } finally {
      setLoadingWeather(false);
    }
  }, [getCoordinates]);

  const handleAddPoll = useCallback(() => {
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) {
      showAlert('Umfrage', 'Frage und mindestens 2 Antworten sind nötig.');
      return;
    }
    const poll: StoryPoll = {
      question: pollQuestion.trim(),
      options: pollOptions.filter((o) => o.trim()).map((o, i) => ({
        id: `opt_${i}`,
        text: o.trim(),
        votes: 0,
      })),
    };
    setPollData(poll);
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pollQuestion, pollOptions, showAlert]);

  const handlePublish = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !imageUri && !pollData && !showClock && !locationName && !weatherData) {
      showAlert('Hinweis', 'Bitte füge Inhalt hinzu.');
      return;
    }
    const font = FONT_OPTIONS[selectedFont];
    const fontId = `${font.family}|${font.weight}|${font.style}`;
    const textPos = trimmed ? {
      x: textLastX.current / SCREEN_WIDTH,
      y: textLastY.current / SCREEN_HEIGHT,
      scale: textLastScale.current,
    } : undefined;

    const metadata: StoryMetadata = {};
    if (pollData) metadata.poll = pollData;
    if (mentions.length > 0) metadata.mentions = mentions.map((m) => m.id);
    if (locationName) metadata.location = locationName;
    if (weatherData) metadata.weather = weatherData;
    if (showClock) {
      metadata.showClock = true;
      metadata.clockTime = clockTime;
    }

    const hasMetadata = Object.keys(metadata).length > 0;
    createStory(trimmed, selectedBg, imageUri || undefined, fontId, textPos, hasMetadata ? metadata : undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[STORY] Published story with metadata:', metadata);
    router.back();
  }, [text, selectedBg, selectedFont, imageUri, createStory, router, pollData, mentions, locationName, weatherData, showClock, clockTime, showAlert]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleBackgroundPress = useCallback(() => {
    Keyboard.dismiss();
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
  }, []);

  const toggleClock = useCallback(() => {
    setShowClock((prev) => {
      if (!prev) {
        clockPanX.setValue(0);
        clockPanY.setValue(0);
        clockScaleVal.setValue(1);
        clockLastX.current = 0;
        clockLastY.current = 0;
        clockLastScale.current = 1;
      }
      return !prev;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [clockPanX, clockPanY, clockScaleVal]);

  const handleAddMention = useCallback((user: SocialUser) => {
    if (!mentions.find((m) => m.id === user.id)) {
      setMentions((prev) => [...prev, user]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowMentionPicker(false);
    setMentionSearch('');
  }, [mentions]);

  const handleRemoveMention = useCallback((userId: string) => {
    setMentions((prev) => prev.filter((m) => m.id !== userId));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!mentionSearch.trim()) return allUsersState.slice(0, 20);
    const q = mentionSearch.toLowerCase();
    return allUsersState.filter((u) =>
      u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allUsersState, mentionSearch]);

  const currentFont = FONT_OPTIONS[selectedFont];
  const textStyle = {
    fontFamily: currentFont.family,
    fontWeight: currentFont.weight as 'normal' | 'bold' | '300' | '600' | '700' | '900',
    fontStyle: currentFont.style as 'normal' | 'italic',
  };

  const canPublish = text.trim().length > 0 || !!imageUri || !!pollData || showClock || !!locationName || !!weatherData;

  const hasStickers = !!pollData || showClock || mentions.length > 0 || !!locationName || !!weatherData;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[styles.preview, !imageUri && { backgroundColor: selectedBg }]}
          {...cleanPanHandlers(imagePanResponder.panHandlers as unknown as Record<string, unknown>)}
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

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <View style={styles.topBarRow} pointerEvents="box-none">
              <Pressable onPress={handleClose} hitSlop={16} testID="close-story-create" style={styles.circleBtn}>
                <X size={22} color="#fff" />
              </Pressable>

              <View style={styles.topCenter} pointerEvents="box-none">
                {!imageUri && (
                  <Pressable
                    onPress={() => { setShowColorPicker((p) => !p); setShowFontPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.circleBtn, { backgroundColor: selectedBg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }]}
                    testID="toggle-colors"
                  >
                    <Palette size={16} color="#fff" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => { setShowFontPicker((p) => !p); setShowColorPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.circleBtn, showFontPicker && styles.circleBtnActive]}
                  testID="toggle-font"
                >
                  <Type size={18} color="#fff" />
                </Pressable>
              </View>

              <Pressable
                onPress={handlePublish}
                style={[styles.publishBtn, { opacity: canPublish ? 1 : 0.4 }]}
                testID="publish-story"
              >
                <Send size={16} color="#fff" />
                <Text style={styles.publishText}>Teilen</Text>
              </Pressable>
            </View>

            {showColorPicker && !imageUri && (
              <View style={styles.colorPickerRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorListInline}>
                  {BG_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => { setSelectedBg(c); Haptics.selectionAsync(); }}
                      style={[styles.colorDot, { backgroundColor: c }, selectedBg === c && styles.colorDotSelected]}
                      testID={`color-${c}`}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {showFontPicker && (
              <View style={styles.fontPickerRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontListInline}>
                  {FONT_OPTIONS.map((font, i) => (
                    <Pressable
                      key={i}
                      onPress={() => { setSelectedFont(i); Haptics.selectionAsync(); }}
                      style={[styles.fontChip, i === selectedFont && styles.fontChipActive]}
                      testID={`font-${i}`}
                    >
                      <Text style={[styles.fontChipText, {
                        fontFamily: font.family,
                        fontWeight: font.weight as 'normal' | 'bold' | '300' | '600' | '700' | '900',
                        fontStyle: font.style as 'normal' | 'italic',
                      }, i === selectedFont && styles.fontChipTextActive]}>
                        {font.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Pressable style={styles.canvasCenter} onPress={handleBackgroundPress} pointerEvents={isEditing ? 'auto' : 'box-none'}>
            {isEditing ? (
              <View style={styles.textArea}>
                <TextInput
                  style={[styles.storyInput, textStyle]}
                  placeholder="Schreibe etwas..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={text}
                  onChangeText={setText}
                  onFocus={() => setIsEditing(true)}
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
                {...cleanPanHandlers(textPanResponder.panHandlers as unknown as Record<string, unknown>)}
              >
                <Pressable onPress={() => setIsEditing(true)} onLongPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
                  <Text style={[styles.draggableText, textStyle]}>{text}</Text>
                </Pressable>
              </Animated.View>
            ) : !hasStickers && !imageUri ? (
              <Pressable onPress={() => setIsEditing(true)} style={styles.textArea}>
                <Text style={[styles.placeholderText, textStyle]}>Tippe zum Schreiben...</Text>
              </Pressable>
            ) : null}
          </Pressable>

          <View style={styles.stickerOverlays} pointerEvents="box-none">
            {showClock && clockTime && (
              <Animated.View
                style={[
                  styles.stickerClock,
                  {
                    transform: [
                      { translateX: clockPanX },
                      { translateY: clockPanY },
                      { scale: clockScaleVal },
                    ],
                  },
                ]}
                {...cleanPanHandlers(clockPanResponder.panHandlers as unknown as Record<string, unknown>)}
              >
                <FlipClockDisplay time={clockTime} />
              </Animated.View>
            )}

            {weatherData && (
              <View style={styles.stickerWeather}>
                <CloudSun size={20} color="#e0d5b0" />
                <Text style={styles.stickerWeatherTemp}>{weatherData.temp}°C</Text>
                <Text style={styles.stickerWeatherCond}>{weatherData.condition}</Text>
              </View>
            )}

            {locationName && (
              <View style={styles.stickerLocation}>
                <MapPin size={14} color="#e0d5b0" />
                <Text style={styles.stickerLocationText}>{locationName}</Text>
              </View>
            )}

            {mentions.length > 0 && (
              <View style={styles.stickerMentions}>
                {mentions.map((m) => (
                  <Pressable key={m.id} onPress={() => handleRemoveMention(m.id)} style={styles.mentionTag}>
                    <AtSign size={12} color="#e0d5b0" />
                    <Text style={styles.mentionTagText}>{m.displayName}</Text>
                    <X size={10} color="rgba(224,213,176,0.6)" />
                  </Pressable>
                ))}
              </View>
            )}

            {pollData && (
              <View style={styles.stickerPoll}>
                <Text style={styles.pollQuestion}>{pollData.question}</Text>
                {pollData.options.map((opt) => (
                  <View key={opt.id} style={styles.pollOptionPreview}>
                    <Text style={styles.pollOptionText}>{opt.text}</Text>
                  </View>
                ))}
                <Pressable onPress={() => { setPollData(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.removeStickerBtn}>
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>

          {imageUri && (
            <Pressable onPress={removeImage} style={[styles.removeImageBtn, { top: insets.top + 56 }]} hitSlop={8} testID="remove-image">
              <Trash2 size={18} color="#fff" />
            </Pressable>
          )}

          {text.trim().length > 0 && (
            <Text style={styles.charCount}>{text.length}/200</Text>
          )}
        </View>

        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
            <Pressable onPress={pickImage} style={styles.toolItem} testID="pick-image">
              <View style={[styles.toolIcon, imageUri && styles.toolIconActive]}>
                <ImagePlus size={20} color={imageUri ? '#1c1c1e' : '#e0d5b0'} />
              </View>
              <Text style={styles.toolLabel}>Foto</Text>
            </Pressable>

            <Pressable onPress={() => { setIsEditing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.toolItem} testID="add-text">
              <View style={[styles.toolIcon, text.trim().length > 0 && styles.toolIconActive]}>
                <Type size={20} color={text.trim().length > 0 ? '#1c1c1e' : '#e0d5b0'} />
              </View>
              <Text style={styles.toolLabel}>Text</Text>
            </Pressable>

            <Pressable onPress={() => { setShowPollCreator(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.toolItem} testID="add-poll">
              <View style={[styles.toolIcon, !!pollData && styles.toolIconActive]}>
                <BarChart3 size={20} color={pollData ? '#1c1c1e' : '#e0d5b0'} />
              </View>
              <Text style={styles.toolLabel}>Umfrage</Text>
            </Pressable>

            <Pressable onPress={toggleClock} style={styles.toolItem} testID="add-clock">
              <View style={[styles.toolIcon, showClock && styles.toolIconActive]}>
                <Clock size={20} color={showClock ? '#1c1c1e' : '#e0d5b0'} />
              </View>
              <Text style={styles.toolLabel}>Uhrzeit</Text>
            </Pressable>

            <Pressable onPress={() => { setShowMentionPicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.toolItem} testID="add-mention">
              <View style={[styles.toolIcon, mentions.length > 0 && styles.toolIconActive]}>
                <AtSign size={20} color={mentions.length > 0 ? '#1c1c1e' : '#e0d5b0'} />
              </View>
              <Text style={styles.toolLabel}>Erwähnen</Text>
            </Pressable>

            <Pressable onPress={fetchLocation} style={styles.toolItem} testID="add-location">
              <View style={[styles.toolIcon, !!locationName && styles.toolIconActive]}>
                {loadingLocation ? <ActivityIndicator size="small" color="#e0d5b0" /> : <MapPin size={20} color={locationName ? '#1c1c1e' : '#e0d5b0'} />}
              </View>
              <Text style={styles.toolLabel}>Ort</Text>
            </Pressable>

            <Pressable onPress={fetchWeather} style={styles.toolItem} testID="add-weather">
              <View style={[styles.toolIcon, !!weatherData && styles.toolIconActive]}>
                {loadingWeather ? <ActivityIndicator size="small" color="#e0d5b0" /> : <CloudSun size={20} color={weatherData ? '#1c1c1e' : '#e0d5b0'} />}
              </View>
              <Text style={styles.toolLabel}>Wetter</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showPollCreator} animationType="slide" transparent testID="poll-modal">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPollCreator(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Umfrage erstellen</Text>

            <TextInput
              style={styles.pollInput}
              placeholder="Deine Frage..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={pollQuestion}
              onChangeText={setPollQuestion}
              maxLength={100}
              testID="poll-question-input"
            />

            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.pollOptionRow}>
                <TextInput
                  style={styles.pollOptionInput}
                  placeholder={`Antwort ${i + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={opt}
                  onChangeText={(val) => {
                    const updated = [...pollOptions];
                    updated[i] = val;
                    setPollOptions(updated);
                  }}
                  maxLength={50}
                  testID={`poll-option-${i}`}
                />
                {pollOptions.length > 2 && (
                  <Pressable onPress={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                    <X size={16} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                )}
              </View>
            ))}

            {pollOptions.length < 4 && (
              <Pressable
                onPress={() => setPollOptions((prev) => [...prev, ''])}
                style={styles.addOptionBtn}
              >
                <Plus size={16} color="#e0d5b0" />
                <Text style={styles.addOptionText}>Antwort hinzufügen</Text>
              </Pressable>
            )}

            <Pressable onPress={handleAddPoll} style={styles.modalDoneBtn} testID="poll-done">
              <Check size={18} color="#fff" />
              <Text style={styles.modalDoneText}>Fertig</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showMentionPicker} animationType="slide" transparent testID="mention-modal">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => { setShowMentionPicker(false); setMentionSearch(''); }} />
          <View style={[styles.modalSheet, styles.mentionSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Person erwähnen</Text>

            <View style={styles.searchRow}>
              <Search size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Suchen..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={mentionSearch}
                onChangeText={setMentionSearch}
                autoFocus
                testID="mention-search"
              />
            </View>

            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              style={styles.mentionList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const alreadyMentioned = mentions.find((m) => m.id === item.id);
                return (
                  <Pressable
                    onPress={() => handleAddMention(item)}
                    style={[styles.mentionRow, alreadyMentioned && styles.mentionRowActive]}
                    testID={`mention-user-${item.id}`}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.mentionAvatar} />
                    ) : (
                      <View style={styles.mentionAvatarPlaceholder}>
                        <Text style={styles.mentionAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.mentionInfo}>
                      <Text style={styles.mentionName}>{item.displayName}</Text>
                      {item.username ? <Text style={styles.mentionUsername}>@{item.username}</Text> : null}
                    </View>
                    {alreadyMentioned && <Check size={16} color="#e0d5b0" />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>Keine Nutzer gefunden</Text>}
            />
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 14,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(191,163,93,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  publishText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  colorPickerRow: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  colorListInline: {
    gap: 8,
    paddingHorizontal: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#fff',
    borderWidth: 2.5,
  },
  fontPickerRow: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  fontListInline: {
    gap: 8,
    paddingHorizontal: 8,
  },
  fontChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fontChipActive: {
    backgroundColor: 'rgba(191,163,93,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.5)',
  },
  fontChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  fontChipTextActive: {
    color: '#e0d5b0',
  },
  canvasCenter: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 5,
  },
  textArea: {
    justifyContent: 'center',
    paddingHorizontal: 28,
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
    color: 'rgba(255,255,255,0.35)',
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 36,
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    zIndex: 5,
  },
  stickerOverlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingBottom: 80,
    paddingHorizontal: 20,
  },
  stickerClock: {
    marginBottom: 16,
  },
  stickerWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.15)',
    marginBottom: 10,
  },
  stickerWeatherTemp: {
    color: '#e0d5b0',
    fontSize: 20,
    fontWeight: '800' as const,
  },
  stickerWeatherCond: {
    color: 'rgba(224,213,176,0.7)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  stickerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.12)',
    marginBottom: 10,
  },
  stickerLocationText: {
    color: '#e0d5b0',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stickerMentions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 10,
  },
  mentionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.15)',
  },
  mentionTagText: {
    color: '#e0d5b0',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  stickerPoll: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH - 80,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.15)',
    marginBottom: 10,
  },
  pollQuestion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
    textAlign: 'center',
  },
  pollOptionPreview: {
    backgroundColor: 'rgba(224,213,176,0.12)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.1)',
  },
  pollOptionText: {
    color: '#e0d5b0',
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  removeStickerBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(200,50,50,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageBtn: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200,50,50,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  toolbar: {
    backgroundColor: '#111',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(224,213,176,0.1)',
  },
  toolbarContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  toolItem: {
    alignItems: 'center',
    width: 62,
    gap: 4,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(224,213,176,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.1)',
  },
  toolIconActive: {
    backgroundColor: '#e0d5b0',
    borderColor: '#e0d5b0',
  },
  toolLabel: {
    color: 'rgba(224,213,176,0.6)',
    fontSize: 10,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: '#1a1a1c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  mentionSheet: {
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#e0d5b0',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
    textAlign: 'center',
  },
  pollInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.1)',
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.08)',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addOptionText: {
    color: 'rgba(224,213,176,0.6)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  modalDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(191,163,93,0.8)',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(224,213,176,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  mentionList: {
    flex: 1,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  mentionRowActive: {
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  mentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  mentionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(224,213,176,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: {
    color: '#e0d5b0',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  mentionInfo: {
    flex: 1,
    gap: 2,
  },
  mentionName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  mentionUsername: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
