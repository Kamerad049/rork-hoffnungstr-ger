import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Image,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  FlatList,
  Modal,
  GestureResponderEvent,
  PanResponderGestureState,
  PanResponder,
} from 'react-native';
import { cleanPanHandlers } from '@/lib/utils';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  MapPin,
  Music,
  UserPlus,
  X,
  Send,
  RotateCcw,
  Type,
  Sliders,
  Check,
  Search,
  ChevronRight,
  Move,
  ZoomIn,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/providers/ThemeProvider';
import { usePosts } from '@/providers/PostsProvider';

import { useFriends } from '@/providers/FriendsProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { SocialUser } from '@/constants/types';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { useAlert } from '@/providers/AlertProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_LENGTH = 2000;
const IMAGE_ASPECT = 4 / 5;
const FRAME_MARGIN = 16;
const FRAME_WIDTH = SCREEN_WIDTH - FRAME_MARGIN * 2;
const FRAME_HEIGHT = FRAME_WIDTH / IMAGE_ASPECT;
const GOLD = '#BFA35D';
const ONBOARDING_KEY = '@editor_gesture_hint_dismissed';
const FILTER_THUMB = 64;

interface FilterLayer {
  type: 'solid' | 'gradient-v' | 'gradient-h' | 'gradient-d' | 'gradient-r' | 'vignette';
  colors: string[];
  opacity: number;
  locations?: number[];
  blendHint?: 'darken' | 'lighten' | 'contrast';
}

interface FilterPreset {
  id: string;
  name: string;
  category: 'film' | 'cinema' | 'mood' | 'classic';
  layers: FilterLayer[];
}

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'original',
    name: 'Original',
    category: 'classic',
    layers: [],
  },
  {
    id: 'portra',
    name: 'Portra 400',
    category: 'film',
    layers: [
      { type: 'solid', colors: ['rgba(40,30,20,0.18)'], opacity: 1, blendHint: 'darken' },
      { type: 'gradient-v', colors: ['rgba(255,200,140,0.28)', 'rgba(220,180,140,0.12)', 'rgba(80,60,50,0.22)'], opacity: 1, locations: [0, 0.45, 1] },
      { type: 'solid', colors: ['rgba(255,235,200,0.15)'], opacity: 1, blendHint: 'lighten' },
      { type: 'gradient-v', colors: ['rgba(255,240,210,0.12)', 'transparent', 'rgba(60,40,30,0.18)'], opacity: 1, locations: [0, 0.6, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(40,25,15,0.45)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
  {
    id: 'velvia',
    name: 'Velvia 50',
    category: 'film',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.12)'], opacity: 1, blendHint: 'contrast' },
      { type: 'gradient-v', colors: ['rgba(30,10,80,0.22)', 'rgba(0,0,0,0)', 'rgba(20,8,0,0.28)'], opacity: 1, locations: [0, 0.35, 1] },
      { type: 'solid', colors: ['rgba(0,10,50,0.18)'], opacity: 1 },
      { type: 'gradient-d', colors: ['rgba(255,200,50,0.14)', 'transparent'], opacity: 1 },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,0,0,0.5)'], opacity: 1, locations: [0, 0.45, 1] },
    ],
  },
  {
    id: 'cinestill',
    name: 'CineStill 800',
    category: 'cinema',
    layers: [
      { type: 'solid', colors: ['rgba(10,8,25,0.15)'], opacity: 1, blendHint: 'contrast' },
      { type: 'gradient-v', colors: ['rgba(255,160,60,0.25)', 'rgba(0,0,0,0)', 'rgba(30,50,120,0.35)'], opacity: 1, locations: [0, 0.3, 1] },
      { type: 'gradient-h', colors: ['rgba(255,80,40,0.15)', 'transparent', 'rgba(40,70,200,0.15)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(255,140,60,0.08)'], opacity: 1, blendHint: 'lighten' },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(10,15,50,0.5)'], opacity: 1, locations: [0, 0.45, 1] },
    ],
  },
  {
    id: 'tealOrange',
    name: 'Kino',
    category: 'cinema',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.1)'], opacity: 1, blendHint: 'contrast' },
      { type: 'gradient-v', colors: ['rgba(255,160,50,0.3)', 'rgba(0,0,0,0)', 'rgba(0,100,120,0.35)'], opacity: 1, locations: [0, 0.4, 1] },
      { type: 'gradient-h', colors: ['rgba(0,80,90,0.12)', 'transparent', 'rgba(255,140,40,0.1)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(0,50,60,0.1)'], opacity: 1 },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,20,30,0.5)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
  {
    id: 'noir',
    name: 'Noir',
    category: 'mood',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.42)'], opacity: 1, blendHint: 'darken' },
      { type: 'gradient-v', colors: ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)'], opacity: 1, locations: [0, 0.35, 1] },
      { type: 'solid', colors: ['rgba(180,180,200,0.06)'], opacity: 1, blendHint: 'lighten' },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,0,0,0.55)'], opacity: 1, locations: [0, 0.35, 1] },
    ],
  },
  {
    id: 'goldenHour',
    name: 'Golden Hour',
    category: 'mood',
    layers: [
      { type: 'gradient-v', colors: ['rgba(255,170,40,0.35)', 'rgba(255,130,30,0.15)', 'rgba(200,70,20,0.25)'], opacity: 1, locations: [0, 0.45, 1] },
      { type: 'gradient-d', colors: ['rgba(255,220,100,0.22)', 'transparent'], opacity: 1 },
      { type: 'solid', colors: ['rgba(255,200,80,0.1)'], opacity: 1, blendHint: 'lighten' },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(100,30,0,0.4)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
  {
    id: 'nordic',
    name: 'Nordisch',
    category: 'mood',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.08)'], opacity: 1, blendHint: 'contrast' },
      { type: 'solid', colors: ['rgba(160,190,220,0.22)'], opacity: 1 },
      { type: 'gradient-v', colors: ['rgba(200,220,240,0.2)', 'rgba(180,200,220,0.08)', 'rgba(80,100,130,0.22)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(220,230,240,0.1)'], opacity: 1, blendHint: 'lighten' },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(20,35,55,0.4)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    category: 'classic',
    layers: [
      { type: 'solid', colors: ['rgba(255,250,230,0.18)'], opacity: 1, blendHint: 'lighten' },
      { type: 'gradient-v', colors: ['rgba(255,230,170,0.22)', 'rgba(230,210,180,0.1)', 'rgba(180,150,120,0.2)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(220,195,150,0.14)'], opacity: 1 },
      { type: 'gradient-v', colors: ['rgba(255,255,240,0.1)', 'transparent', 'rgba(140,110,80,0.12)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(70,45,20,0.35)'], opacity: 1, locations: [0, 0.55, 1] },
    ],
  },
  {
    id: 'agfa',
    name: 'Agfa Vista',
    category: 'film',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.08)'], opacity: 1, blendHint: 'contrast' },
      { type: 'gradient-v', colors: ['rgba(220,170,50,0.25)', 'rgba(0,0,0,0)', 'rgba(40,100,50,0.22)'], opacity: 1, locations: [0, 0.35, 1] },
      { type: 'solid', colors: ['rgba(200,160,40,0.14)'], opacity: 1 },
      { type: 'gradient-h', colors: ['rgba(180,140,30,0.1)', 'transparent', 'rgba(30,80,40,0.1)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(30,20,5,0.45)'], opacity: 1, locations: [0, 0.45, 1] },
    ],
  },
  {
    id: 'moody',
    name: 'Moody',
    category: 'mood',
    layers: [
      { type: 'solid', colors: ['rgba(10,15,35,0.32)'], opacity: 1, blendHint: 'darken' },
      { type: 'gradient-v', colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,10,40,0.35)'], opacity: 1, locations: [0, 0.25, 1] },
      { type: 'gradient-h', colors: ['rgba(20,40,90,0.18)', 'transparent', 'rgba(20,40,90,0.18)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(30,40,80,0.08)'], opacity: 1, blendHint: 'lighten' },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,5,25,0.55)'], opacity: 1, locations: [0, 0.4, 1] },
    ],
  },
  {
    id: 'vintageFade',
    name: 'Verblasst',
    category: 'classic',
    layers: [
      { type: 'solid', colors: ['rgba(240,220,180,0.25)'], opacity: 1, blendHint: 'lighten' },
      { type: 'gradient-v', colors: ['rgba(250,230,190,0.2)', 'rgba(220,200,170,0.1)', 'rgba(170,150,120,0.22)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(255,255,240,0.12)'], opacity: 1 },
      { type: 'gradient-v', colors: ['rgba(200,180,140,0.08)', 'transparent', 'rgba(120,100,70,0.15)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(80,60,35,0.3)'], opacity: 1, locations: [0, 0.55, 1] },
    ],
  },
  {
    id: 'darkFilm',
    name: 'Dark Film',
    category: 'cinema',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.35)'], opacity: 1, blendHint: 'darken' },
      { type: 'gradient-v', colors: ['rgba(50,35,65,0.2)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'], opacity: 1, locations: [0, 0.3, 1] },
      { type: 'solid', colors: ['rgba(90,60,120,0.1)'], opacity: 1 },
      { type: 'gradient-v', colors: ['rgba(140,100,160,0.06)', 'transparent'], opacity: 1 },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,0,0,0.6)'], opacity: 1, locations: [0, 0.35, 1] },
    ],
  },
  {
    id: 'bleachBypass',
    name: 'Bleach',
    category: 'cinema',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.2)'], opacity: 1, blendHint: 'contrast' },
      { type: 'solid', colors: ['rgba(200,200,210,0.2)'], opacity: 1, blendHint: 'lighten' },
      { type: 'gradient-v', colors: ['rgba(220,220,230,0.12)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.2)'], opacity: 1, locations: [0, 0.4, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,0,0,0.5)'], opacity: 1, locations: [0, 0.45, 1] },
    ],
  },
  {
    id: 'kodakGold',
    name: 'Kodak Gold',
    category: 'film',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.06)'], opacity: 1, blendHint: 'contrast' },
      { type: 'gradient-v', colors: ['rgba(255,200,80,0.3)', 'rgba(240,180,60,0.12)', 'rgba(180,100,30,0.2)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'solid', colors: ['rgba(255,210,100,0.12)'], opacity: 1 },
      { type: 'gradient-d', colors: ['rgba(255,230,140,0.15)', 'transparent'], opacity: 1 },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(60,30,0,0.4)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
  {
    id: 'fujiClassic',
    name: 'Fuji Classic',
    category: 'film',
    layers: [
      { type: 'solid', colors: ['rgba(0,20,10,0.12)'], opacity: 1 },
      { type: 'gradient-v', colors: ['rgba(100,200,180,0.18)', 'rgba(0,0,0,0)', 'rgba(0,40,30,0.2)'], opacity: 1, locations: [0, 0.4, 1] },
      { type: 'solid', colors: ['rgba(40,120,100,0.1)'], opacity: 1 },
      { type: 'gradient-h', colors: ['rgba(0,80,60,0.08)', 'transparent', 'rgba(0,80,60,0.08)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,20,15,0.4)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
  {
    id: 'dusk',
    name: 'Dämmerung',
    category: 'mood',
    layers: [
      { type: 'solid', colors: ['rgba(0,0,0,0.15)'], opacity: 1, blendHint: 'darken' },
      { type: 'gradient-v', colors: ['rgba(180,80,120,0.25)', 'rgba(60,40,100,0.15)', 'rgba(20,20,60,0.3)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'gradient-h', colors: ['rgba(200,100,140,0.1)', 'transparent', 'rgba(60,40,120,0.12)'], opacity: 1, locations: [0, 0.5, 1] },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(15,10,40,0.5)'], opacity: 1, locations: [0, 0.45, 1] },
    ],
  },
  {
    id: 'crossProcess',
    name: 'Cross',
    category: 'classic',
    layers: [
      { type: 'gradient-v', colors: ['rgba(0,200,180,0.2)', 'rgba(0,0,0,0)', 'rgba(200,50,100,0.22)'], opacity: 1, locations: [0, 0.4, 1] },
      { type: 'solid', colors: ['rgba(0,120,100,0.1)'], opacity: 1 },
      { type: 'gradient-d', colors: ['rgba(255,255,0,0.08)', 'rgba(0,100,200,0.08)'], opacity: 1 },
      { type: 'solid', colors: ['rgba(255,255,220,0.08)'], opacity: 1, blendHint: 'lighten' },
      { type: 'vignette', colors: ['transparent', 'transparent', 'rgba(0,30,20,0.4)'], opacity: 1, locations: [0, 0.5, 1] },
    ],
  },
];

const FILTER_CATEGORIES = [
  { id: 'all', name: 'Alle' },
  { id: 'film', name: 'Film' },
  { id: 'cinema', name: 'Kino' },
  { id: 'mood', name: 'Stimmung' },
  { id: 'classic', name: 'Klassisch' },
];

interface FontOption {
  id: string;
  name: string;
  family: string;
  weight: '400' | '500' | '600' | '700' | '800' | '900';
  style?: 'italic' | 'normal';
}

const FONT_OPTIONS: FontOption[] = [
  { id: 'system', name: 'Standard', family: 'System', weight: '400' },
  { id: 'system-bold', name: 'Fett', family: 'System', weight: '700' },
  { id: 'serif', name: 'Serif', family: Platform.OS === 'ios' ? 'Georgia' : 'serif', weight: '400' },
  { id: 'serif-bold', name: 'Serif Fett', family: Platform.OS === 'ios' ? 'Georgia' : 'serif', weight: '700' },
  { id: 'mono', name: 'Mono', family: Platform.OS === 'ios' ? 'Menlo' : 'monospace', weight: '400' },
  { id: 'condensed', name: 'Schmal', family: Platform.OS === 'ios' ? 'AvenirNextCondensed-Medium' : 'sans-serif-condensed', weight: '500' },
  { id: 'rounded', name: 'Rund', family: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium', weight: '500' },
  { id: 'elegant', name: 'Elegant', family: Platform.OS === 'ios' ? 'Didot' : 'serif', weight: '400' },
  { id: 'italic', name: 'Kursiv', family: Platform.OS === 'ios' ? 'Georgia' : 'serif', weight: '400', style: 'italic' },
  { id: 'display', name: 'Display', family: Platform.OS === 'ios' ? 'Copperplate' : 'serif', weight: '700' },
];



export default function CreatePostScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { createPost } = usePosts();

  const { friendUsers } = useFriends();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [locationText, setLocationText] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('original');
  const [selectedFont, setSelectedFont] = useState<string>('system');
  const [taggedUsers, setTaggedUsers] = useState<SocialUser[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [showFontPanel, setShowFontPanel] = useState<boolean>(false);
  const [showTagModal, setShowTagModal] = useState<boolean>(false);
  const [tagSearch, setTagSearch] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const locationSearchHook = useLocationSearch();
  const [showGestureHint, setShowGestureHint] = useState<boolean>(false);
  const [gestureHintDismissedPermanently, setGestureHintDismissedPermanently] = useState<boolean>(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState<boolean>(false);

  const [imgScaleState, setImgScaleState] = useState<number>(1);
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const animScale = useRef(new Animated.Value(1)).current;
  const animTransX = useRef(new Animated.Value(0)).current;
  const animTransY = useRef(new Animated.Value(0)).current;

  const lastPanX = useRef(0);
  const lastPanY = useRef(0);
  const lastScale = useRef(1);
  const pinchStartDist = useRef(0);
  const isPinching = useRef(false);
  const gestureActive = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gestureHintOpacity = useRef(new Animated.Value(0)).current;
  const fingerAnim = useRef(new Animated.Value(0)).current;
  const imageEntryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (val === 'true') {
        setGestureHintDismissedPermanently(true);
      }
    });
  }, []);

  useEffect(() => {
    if (showGestureHint) {
      Animated.timing(gestureHintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(fingerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(fingerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showGestureHint, gestureHintOpacity, fingerAnim]);

  const canPost = content.trim().length > 0 || imageUri !== null;
  const initial = (user?.name ?? 'I').charAt(0).toUpperCase();

  const [filterCategory, setFilterCategory] = useState<string>('all');

  const currentFilter = useMemo(
    () => FILTER_PRESETS.find((f) => f.id === selectedFilter) ?? FILTER_PRESETS[0],
    [selectedFilter],
  );

  const filteredPresets = useMemo(() => {
    if (filterCategory === 'all') return FILTER_PRESETS;
    return FILTER_PRESETS.filter((f) => f.id === 'original' || f.category === filterCategory);
  }, [filterCategory]);

  const currentFont = useMemo(
    () => FONT_OPTIONS.find((f) => f.id === selectedFont) ?? FONT_OPTIONS[0],
    [selectedFont],
  );

  const filteredTagUsers = useMemo(() => {
    const alreadyTagged = new Set(taggedUsers.map((u) => u.id));
    const available = friendUsers.filter((u) => !alreadyTagged.has(u.id));
    if (!tagSearch.trim()) return available;
    const q = tagSearch.toLowerCase();
    return available.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [friendUsers, taggedUsers, tagSearch]);



  const dismissGestureHint = useCallback(() => {
    Animated.timing(gestureHintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setShowGestureHint(false);
      if (dontShowAgainChecked) {
        AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setGestureHintDismissedPermanently(true);
      }
    });
  }, [gestureHintOpacity, dontShowAgainChecked]);

  const showGestureHintRef = useRef(false);
  const dismissRef = useRef(dismissGestureHint);
  useEffect(() => { showGestureHintRef.current = showGestureHint; }, [showGestureHint]);
  useEffect(() => { dismissRef.current = dismissGestureHint; }, [dismissGestureHint]);

  const scaleRef = useRef(1);
  const transXRef = useRef(0);
  const transYRef = useRef(0);
  const lastHapticTime = useRef(0);

  const imgNaturalSizeRef = useRef<{ width: number; height: number } | null>(null);

  const clampPan = (tx: number, ty: number, s: number) => {
    const nat = imgNaturalSizeRef.current;
    let maxX = (FRAME_WIDTH * (s - 1)) / 2;
    let maxY = (FRAME_HEIGHT * (s - 1)) / 2;

    if (nat && nat.width > 0 && nat.height > 0) {
      const imgAspect = nat.width / nat.height;
      const frameAspect = FRAME_WIDTH / FRAME_HEIGHT;

      if (imgAspect < frameAspect) {
        const displayedH = (FRAME_WIDTH / imgAspect) * s;
        const overflowY = Math.max(0, (displayedH - FRAME_HEIGHT) / 2);
        maxY = overflowY;
      } else if (imgAspect > frameAspect) {
        const displayedW = (FRAME_HEIGHT * imgAspect) * s;
        const overflowX = Math.max(0, (displayedW - FRAME_WIDTH) / 2);
        maxX = overflowX;
      }
    }

    const cx = Math.max(-maxX, Math.min(maxX, tx));
    const cy = Math.max(-maxY, Math.min(maxY, ty));
    return { cx, cy };
  };

  const getDistance = (touches: any[]): number => {
    if (touches.length < 2) return 0;
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const imagePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_evt, gs) => {
      return Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2;
    },
    onMoveShouldSetPanResponderCapture: (_evt, gs) => {
      return Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      console.log('[PAN] Grant, touches:', evt.nativeEvent.touches?.length);
      if (showGestureHintRef.current && dismissRef.current) {
        dismissRef.current();
      }
      gestureActive.current = true;
      setScrollEnabled(false);
      lastPanX.current = transXRef.current;
      lastPanY.current = transYRef.current;
      lastScale.current = scaleRef.current;
      isPinching.current = false;
      pinchStartDist.current = 0;

      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        isPinching.current = true;
        pinchStartDist.current = getDistance(Array.from(touches));
      }
    },
    onPanResponderMove: (evt, gs) => {
      const touches = evt.nativeEvent.touches;

      if (touches && touches.length >= 2) {
        if (pinchStartDist.current === 0) {
          isPinching.current = true;
          pinchStartDist.current = getDistance(Array.from(touches));
          lastScale.current = scaleRef.current;
          return;
        }
        isPinching.current = true;
        const dist = getDistance(Array.from(touches));
        if (dist === 0) return;
        let newScale = lastScale.current * (dist / pinchStartDist.current);
        newScale = Math.max(1, Math.min(4, newScale));
        scaleRef.current = newScale;
        const { cx, cy } = clampPan(transXRef.current, transYRef.current, newScale);
        transXRef.current = cx;
        transYRef.current = cy;
        animScale.setValue(newScale);
        animTransX.setValue(cx);
        animTransY.setValue(cy);
        setImgScaleState(newScale);
        return;
      }

      if (isPinching.current) {
        isPinching.current = false;
        pinchStartDist.current = 0;
        lastPanX.current = transXRef.current;
        lastPanY.current = transYRef.current;
        lastScale.current = scaleRef.current;
        return;
      }

      const newTx = lastPanX.current + gs.dx;
      const newTy = lastPanY.current + gs.dy;
      const { cx, cy } = clampPan(newTx, newTy, scaleRef.current);

      const canPan = scaleRef.current > 1 || (imgNaturalSizeRef.current !== null && imgNaturalSizeRef.current.width > 0);
      const hitEdge = canPan && (Math.abs(cx - newTx) > 0.5 || Math.abs(cy - newTy) > 0.5);
      if (hitEdge) {
        const now = Date.now();
        if (now - lastHapticTime.current > 200) {
          lastHapticTime.current = now;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      transXRef.current = cx;
      transYRef.current = cy;
      animTransX.setValue(cx);
      animTransY.setValue(cy);
    },
    onPanResponderRelease: () => {
      console.log('[PAN] Release, scale:', scaleRef.current, 'tx:', transXRef.current, 'ty:', transYRef.current);
      gestureActive.current = false;
      setScrollEnabled(true);
      isPinching.current = false;
      pinchStartDist.current = 0;
    },
    onPanResponderTerminate: () => {
      gestureActive.current = false;
      setScrollEnabled(true);
      isPinching.current = false;
      pinchStartDist.current = 0;
    },
  })).current;

  const onImageSelected = useCallback((uri: string) => {
    setImageUri(uri);
    setImgScaleState(1);
    scaleRef.current = 1;
    transXRef.current = 0;
    transYRef.current = 0;
    animScale.setValue(1);
    animTransX.setValue(0);
    animTransY.setValue(0);

    Image.getSize(
      uri,
      (w, h) => {
        console.log('[CREATE] Image size:', w, 'x', h);
        const size = { width: w, height: h };
        imgNaturalSizeRef.current = size;
        setImgNaturalSize(size);
      },
      (err) => {
        console.log('[CREATE] getSize error:', err);
        imgNaturalSizeRef.current = null;
        setImgNaturalSize(null);
      },
    );

    imageEntryAnim.setValue(0);
    Animated.spring(imageEntryAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();

    if (!gestureHintDismissedPermanently) {
      setShowGestureHint(true);
    }
    console.log('[CREATE] Image selected:', uri);
  }, [gestureHintDismissedPermanently, imageEntryAnim]);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.log('[CREATE] Gallery error:', err);
      showAlert('Fehler', 'Bild konnte nicht geladen werden.');
    }
  }, [onImageSelected]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Berechtigung', 'Kamerazugriff wird benötigt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.95,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.log('[CREATE] Camera error:', err);
      showAlert('Fehler', 'Foto konnte nicht aufgenommen werden.');
    }
  }, [onImageSelected]);

  const removeImage = useCallback(() => {
    setImageUri(null);
    setSelectedFilter('original');
    setShowFilterPanel(false);
    setImgScaleState(1);
    scaleRef.current = 1;
    transXRef.current = 0;
    transYRef.current = 0;
    animScale.setValue(1);
    animTransX.setValue(0);
    animTransY.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const togglePanel = useCallback((panel: 'filter' | 'font' | null) => {
    if (panel === 'filter') {
      setShowFontPanel(false);
      setShowFilterPanel((p) => !p);
    } else if (panel === 'font') {
      setShowFilterPanel(false);
      setShowFontPanel((p) => !p);
    } else {
      setShowFilterPanel(false);
      setShowFontPanel(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePost = useCallback(async () => {
    if (!canPost || isPublishing) return;
    setIsPublishing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const cleanContent = content.trim();
      const taggedIds = taggedUsers.map((u) => u.id);
      const loc = locationText || undefined;
      await createPost(cleanContent, imageUri ?? undefined, 'image', loc, taggedIds.length > 0 ? taggedIds : undefined);
      console.log('[CREATE] Post created');
      router.back();
    } catch (err) {
      console.log('[CREATE] Post error:', err);
      showAlert('Fehler', 'Beitrag konnte nicht erstellt werden.');
      setIsPublishing(false);
    }
  }, [canPost, isPublishing, content, imageUri, taggedUsers, createPost, router]);

  const handleClose = useCallback(() => {
    if (content.trim().length > 0 || imageUri) {
      showAlert('Verwerfen?', 'Dein Beitrag geht verloren.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [content, imageUri, router]);

  const addTaggedUser = useCallback((u: SocialUser) => {
    setTaggedUsers((prev) => [...prev, u]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const removeTaggedUser = useCallback((userId: string) => {
    setTaggedUsers((prev) => prev.filter((u) => u.id !== userId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const fingerSpread = fingerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const fingerSpreadNeg = fingerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  const renderFilterLayers = useCallback((layers: FilterLayer[], isThumb: boolean) => {
    return layers.map((layer, idx) => {
      if (layer.type === 'solid') {
        return (
          <View
            key={`solid-${idx}`}
            style={[StyleSheet.absoluteFill, { backgroundColor: layer.colors[0], opacity: layer.opacity }]}
            pointerEvents="none"
          />
        );
      }
      if (layer.type === 'vignette') {
        return (
          <LinearGradient
            key={`vig-${idx}`}
            colors={layer.colors as any}
            locations={layer.locations as any}
            style={[StyleSheet.absoluteFill, { opacity: layer.opacity }]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0, y: 0 }}
            pointerEvents="none"
          />
        );
      }
      const startPt = layer.type === 'gradient-h' ? { x: 0, y: 0.5 } : layer.type === 'gradient-d' ? { x: 0, y: 0 } : { x: 0.5, y: 0 };
      const endPt = layer.type === 'gradient-h' ? { x: 1, y: 0.5 } : layer.type === 'gradient-d' ? { x: 1, y: 1 } : { x: 0.5, y: 1 };
      return (
        <LinearGradient
          key={`grad-${idx}`}
          colors={layer.colors as any}
          locations={layer.locations as any}
          start={startPt}
          end={endPt}
          style={[StyleSheet.absoluteFill, { opacity: layer.opacity }]}
          pointerEvents="none"
        />
      );
    });
  }, []);

  const renderFilterThumb = useCallback(({ item }: { item: FilterPreset }) => {
    const isActive = item.id === selectedFilter;
    return (
      <Pressable
        style={[styles.filterThumb, isActive && styles.filterThumbActive]}
        onPress={() => { setSelectedFilter(item.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <View style={[styles.filterThumbImageWrap, isActive && styles.filterThumbImageWrapActive]}>
          {imageUri && <Image source={{ uri: imageUri }} style={styles.filterThumbImage} resizeMode="cover" />}
          {item.layers.length > 0 && renderFilterLayers(item.layers, true)}
          {isActive && (
            <View style={styles.filterThumbCheck}>
              <Check size={12} color="#0f0e0b" strokeWidth={3} />
            </View>
          )}
        </View>
        <Text style={[styles.filterThumbName, isActive && styles.filterThumbNameActive]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    );
  }, [selectedFilter, imageUri, renderFilterLayers]);

  const renderFontOption = useCallback(({ item }: { item: FontOption }) => {
    const isActive = item.id === selectedFont;
    return (
      <Pressable
        style={[styles.fontOption, isActive && styles.fontOptionActive]}
        onPress={() => { setSelectedFont(item.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <Text
          style={[
            styles.fontOptionPreview,
            {
              fontFamily: item.id === 'system' || item.id === 'system-bold' ? undefined : item.family,
              fontWeight: item.weight,
              fontStyle: item.style ?? 'normal',
            },
            isActive && styles.fontOptionPreviewActive,
          ]}
        >
          Aa
        </Text>
        <Text style={[styles.fontOptionName, isActive && styles.fontOptionNameActive]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    );
  }, [selectedFont]);

  const renderTagUser = useCallback(({ item }: { item: SocialUser }) => {
    const initChar = item.displayName.charAt(0).toUpperCase();
    return (
      <Pressable style={styles.tagUserRow} onPress={() => addTaggedUser(item)}>
        <View style={styles.tagUserAvatar}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.tagUserAvatarImg} />
          ) : (
            <LinearGradient colors={['#BFA35D', '#DAA520']} style={styles.tagUserAvatarGrad}>
              <Text style={styles.tagUserAvatarText}>{initChar}</Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.tagUserInfo}>
          <Text style={styles.tagUserName}>{item.displayName}</Text>
          <Text style={styles.tagUserHandle}>@{item.username}</Text>
        </View>
        <View style={styles.tagUserAddBtn}>
          <UserPlus size={16} color="#BFA35D" />
        </View>
      </Pressable>
    );
  }, [addTaggedUser]);

  const hasImage = imageUri !== null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#141312', '#0e0e10', '#0a0a0c']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.backBtn} onPress={handleClose} hitSlop={12} testID="close-create">
              <ArrowLeft size={20} color="#BFA35D" />
            </Pressable>
            <Text style={styles.headerTitle}>Neuer Beitrag</Text>
            <Pressable
              style={[styles.publishBtn, canPost && !isPublishing && styles.publishBtnActive]}
              onPress={handlePost}
              disabled={!canPost || isPublishing}
              testID="submit-post-btn"
            >
              <Send size={16} color={canPost && !isPublishing ? '#0f0e0b' : '#636366'} />
              <Text style={[styles.publishText, canPost && !isPublishing && styles.publishTextActive]}>
                {isPublishing ? 'Wird gepostet...' : 'Posten'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {!hasImage && (
              <View style={styles.photoFirstPrompt}>
                <View style={styles.photoFirstIconWrap}>
                  <ImagePlus size={36} color="#BFA35D" />
                </View>
                <Text style={styles.photoFirstTitle}>Wähle zuerst ein Foto</Text>
                <Text style={styles.photoFirstSub}>Dein Beitrag beginnt mit einem Bild</Text>
              </View>
            )}

            {hasImage && (
              <View style={styles.composerCard}>
                <View style={styles.authorRow}>
                  <View style={styles.avatar}>
                    <LinearGradient colors={['#BFA35D', '#DAA520']} style={styles.avatarGradient}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{user?.name ?? 'Ich'}</Text>
                    <Text style={styles.authorSubtext}>Öffentlich</Text>
                  </View>
                </View>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      fontFamily: currentFont.id === 'system' || currentFont.id === 'system-bold' ? undefined : currentFont.family,
                      fontWeight: currentFont.weight,
                      fontStyle: currentFont.style ?? 'normal',
                    },
                  ]}
                  placeholder="Was hast du entdeckt? Teile deine Geschichte..."
                  placeholderTextColor="rgba(142,142,147,0.5)"
                  multiline
                  maxLength={MAX_LENGTH}
                  value={content}
                  onChangeText={setContent}
                  testID="create-post-input"
                  scrollEnabled={false}
                />

                {content.length > 100 && (
                  <Text style={styles.charCount}>{content.length}/{MAX_LENGTH}</Text>
                )}

                {taggedUsers.length > 0 && (
                  <View style={styles.taggedSection}>
                    <View style={styles.taggedRow}>
                      <UserPlus size={12} color="#BFA35D" />
                      <Text style={styles.taggedLabel}>Mit:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taggedScroll}>
                        {taggedUsers.map((u) => (
                          <Pressable key={u.id} style={styles.taggedChip} onPress={() => removeTaggedUser(u.id)}>
                            <Text style={styles.taggedChipText}>@{u.username}</Text>
                            <X size={10} color="rgba(191,163,93,0.7)" />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}

                {locationText.length > 0 && (
                  <View style={styles.locationBadge}>
                    <MapPin size={12} color="#BFA35D" />
                    <Text style={styles.locationBadgeText}>{locationText}</Text>
                    <Pressable onPress={() => setLocationText('')} hitSlop={6}>
                      <X size={12} color="rgba(191,163,93,0.6)" />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {hasImage && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.toolbarScroll}
                contentContainerStyle={styles.toolbarScrollInner}
              >
                <Pressable
                  style={[styles.editToolBtn, showFilterPanel && styles.editToolBtnActive]}
                  onPress={() => togglePanel('filter')}
                >
                  <Sliders size={13} color={showFilterPanel ? '#0f0e0b' : '#BFA35D'} />
                  <Text style={[styles.editToolLabel, showFilterPanel && styles.editToolLabelActive]}>Filter</Text>
                </Pressable>
                <Pressable
                  style={[styles.editToolBtn, showFontPanel && styles.editToolBtnActive]}
                  onPress={() => togglePanel('font')}
                >
                  <Type size={13} color={showFontPanel ? '#0f0e0b' : '#BFA35D'} />
                  <Text style={[styles.editToolLabel, showFontPanel && styles.editToolLabelActive]}>Schrift</Text>
                </Pressable>
                <Pressable
                  style={[styles.editToolBtn, taggedUsers.length > 0 && styles.editToolBtnActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTagModal(true); }}
                >
                  <UserPlus size={13} color={taggedUsers.length > 0 ? '#0f0e0b' : '#BFA35D'} />
                  <Text style={[styles.editToolLabel, taggedUsers.length > 0 && styles.editToolLabelActive]}>
                    {taggedUsers.length > 0 ? `${taggedUsers.length} Person${taggedUsers.length > 1 ? 'en' : ''}` : 'Personen'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.editToolBtn, locationText.length > 0 && styles.editToolBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (locationText) { setLocationText(''); } else { setShowLocationModal(true); }
                  }}
                >
                  <MapPin size={13} color={locationText.length > 0 ? '#0f0e0b' : '#BFA35D'} />
                  <Text style={[styles.editToolLabel, locationText.length > 0 && styles.editToolLabelActive]}>
                    {locationText || 'Ort'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.editToolBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); showAlert('Hintergrundmusik', 'Der Musikkatalog wird bald verfügbar sein.'); }}
                >
                  <Music size={13} color="#BFA35D" />
                  <Text style={styles.editToolLabel}>Musik</Text>
                </Pressable>
              </ScrollView>
            )}

            {showFilterPanel && hasImage && (
              <View style={styles.filterPanel}>
                <FlatList
                  data={FILTER_PRESETS}
                  renderItem={renderFilterThumb}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterList}
                />
              </View>
            )}

            {showFontPanel && hasImage && (
              <View style={styles.fontPanel}>
                <FlatList
                  data={FONT_OPTIONS}
                  renderItem={renderFontOption}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fontList}
                />
              </View>
            )}

            {hasImage ? (
              <View style={styles.imageSection}>
                <View style={styles.imageFrame} {...cleanPanHandlers(imagePanResponder.panHandlers)}>
                  <Animated.View
                    style={[
                      styles.imageInner,
                      {
                        transform: [
                          { scale: animScale },
                          { translateX: animTransX },
                          { translateY: animTransY },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.frameImage}
                      resizeMode="cover"
                    />
                  </Animated.View>

                  {currentFilter.layers.length > 0 && (
                    <View style={styles.filterOverlayFull} pointerEvents="none">
                      {renderFilterLayers(currentFilter.layers, false)}
                    </View>
                  )}

                  <View style={styles.imageActions} pointerEvents="box-none">
                    <Pressable style={styles.imageActionBtn} onPress={() => { pickFromGallery(); }} hitSlop={8}>
                      <RotateCcw size={16} color="#E8DCC8" />
                    </Pressable>
                    <Pressable style={[styles.imageActionBtn, styles.imageRemoveAction]} onPress={removeImage} hitSlop={8}>
                      <X size={16} color="#ff453a" />
                    </Pressable>
                  </View>

                  <View style={styles.imageFormatBadge} pointerEvents="none">
                    <Text style={styles.imageFormatText}>4:5</Text>
                  </View>

                  {imgScaleState > 1 && (
                    <View style={styles.zoomIndicator} pointerEvents="none">
                      <ZoomIn size={12} color="#E8DCC8" />
                      <Text style={styles.zoomIndicatorText}>{imgScaleState.toFixed(1)}x</Text>
                    </View>
                  )}

                  {showGestureHint && (
                    <Animated.View style={[styles.gestureHintOverlay, { opacity: gestureHintOpacity }]} pointerEvents="box-none">
                      <Pressable style={styles.gestureHintTouchable} onPress={dismissGestureHint}>
                        <View style={styles.gestureHintContent}>
                          <View style={styles.gestureFingers}>
                            <Animated.View style={[styles.gestureFinger, { transform: [{ translateX: fingerSpreadNeg }, { translateY: fingerSpreadNeg }] }]}>
                              <View style={styles.gestureFingerDot} />
                            </Animated.View>
                            <Animated.View style={[styles.gestureFinger, { transform: [{ translateX: fingerSpread }, { translateY: fingerSpread }] }]}>
                              <View style={styles.gestureFingerDot} />
                            </Animated.View>
                          </View>
                          <View style={styles.gestureArrows}>
                            <Move size={28} color={GOLD} />
                          </View>
                          <Text style={styles.gestureHintTitle}>Bild positionieren</Text>
                          <Text style={styles.gestureHintSub}>Verschieben mit einem Finger{'\n'}Skalieren mit zwei Fingern</Text>
                          <Pressable
                            style={styles.dontShowAgainRow}
                            onPress={() => { setDontShowAgainChecked((p) => !p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                          >
                            <View style={[styles.checkbox, dontShowAgainChecked && styles.checkboxChecked]}>
                              {dontShowAgainChecked && <Check size={12} color="#0f0e0b" strokeWidth={3} />}
                            </View>
                            <Text style={styles.dontShowText}>Nicht mehr anzeigen</Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Animated.View>
                  )}
                </View>

                <View style={styles.cropHintRow}>
                  <ZoomIn size={13} color="rgba(232,220,200,0.35)" />
                  <Text style={styles.cropHintText}>Pinch zum Zoomen · Wischen zum Verschieben</Text>
                </View>
              </View>
            ) : (
              <View style={styles.mediaPrompt}>
                <Pressable style={styles.mediaBtn} onPress={pickFromGallery} testID="pick-gallery">
                  <View style={styles.mediaBtnIconWrap}>
                    <ImagePlus size={26} color="#BFA35D" />
                  </View>
                  <View style={styles.mediaBtnTextWrap}>
                    <Text style={styles.mediaBtnTitle}>Foto aus Galerie</Text>
                    <Text style={styles.mediaBtnSub}>Wähle ein Bild aus deinen Fotos</Text>
                  </View>
                  <ChevronRight size={18} color="rgba(191,163,93,0.3)" />
                </Pressable>

                <Pressable style={styles.mediaBtn} onPress={takePhoto} testID="take-photo">
                  <View style={styles.mediaBtnIconWrap}>
                    <Camera size={26} color="#BFA35D" />
                  </View>
                  <View style={styles.mediaBtnTextWrap}>
                    <Text style={styles.mediaBtnTitle}>Foto aufnehmen</Text>
                    <Text style={styles.mediaBtnSub}>Direkt mit der Kamera fotografieren</Text>
                  </View>
                  <ChevronRight size={18} color="rgba(191,163,93,0.3)" />
                </Pressable>
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal visible={showLocationModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLocationModal(false)}>
        <View style={styles.tagModalContainer}>
          <View style={[styles.tagModalHeader, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
            <Pressable style={styles.tagModalClose} onPress={() => { setShowLocationModal(false); locationSearchHook.reset(); }}>
              <X size={20} color="#E8DCC8" />
            </Pressable>
            <Text style={styles.tagModalTitle}>Ort hinzufügen</Text>
            <Pressable style={styles.tagModalDone} onPress={() => { setShowLocationModal(false); locationSearchHook.reset(); }}>
              <Text style={styles.tagModalDoneText}>Fertig</Text>
            </Pressable>
          </View>
          <View style={styles.tagSearchWrap}>
            <Search size={16} color="rgba(142,142,147,0.5)" />
            <TextInput
              style={styles.tagSearchInput}
              placeholder="Ort suchen..."
              placeholderTextColor="rgba(142,142,147,0.5)"
              value={locationSearchHook.query}
              onChangeText={locationSearchHook.onChangeQuery}
              autoFocus
            />
            {locationSearchHook.query.length > 0 && (
              <Pressable onPress={() => locationSearchHook.onChangeQuery('')}><X size={14} color="rgba(142,142,147,0.5)" /></Pressable>
            )}
          </View>
          {locationSearchHook.isSearching && (
            <View style={styles.locationSearchingRow}>
              <Text style={styles.locationSearchingText}>Suche...</Text>
            </View>
          )}
          <ScrollView style={styles.locationList} contentContainerStyle={styles.locationListInner} keyboardShouldPersistTaps="handled">
            {!locationSearchHook.isSearching && locationSearchHook.results.length === 0 && locationSearchHook.query.trim().length >= 2 && (
              <Pressable
                style={styles.locationRow}
                onPress={() => { setLocationText(locationSearchHook.query.trim()); setShowLocationModal(false); locationSearchHook.reset(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <View style={styles.locationRowIcon}><MapPin size={16} color="#BFA35D" /></View>
                <Text style={styles.locationRowText}>"{locationSearchHook.query.trim()}" verwenden</Text>
              </Pressable>
            )}
            {locationSearchHook.results.map((loc) => (
              <Pressable
                key={loc.id}
                style={styles.locationRow}
                onPress={() => { setLocationText(loc.name); setShowLocationModal(false); locationSearchHook.reset(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <View style={styles.locationRowIcon}><MapPin size={16} color="#BFA35D" /></View>
                <Text style={styles.locationRowText} numberOfLines={2}>{loc.name}</Text>
                {locationText === loc.name && <Check size={16} color="#BFA35D" />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showTagModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.tagModalContainer}>
          <View style={[styles.tagModalHeader, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
            <Pressable style={styles.tagModalClose} onPress={() => { setShowTagModal(false); setTagSearch(''); }}>
              <X size={20} color="#E8DCC8" />
            </Pressable>
            <Text style={styles.tagModalTitle}>Personen verlinken</Text>
            <Pressable style={styles.tagModalDone} onPress={() => { setShowTagModal(false); setTagSearch(''); }}>
              <Text style={styles.tagModalDoneText}>Fertig</Text>
            </Pressable>
          </View>
          {taggedUsers.length > 0 && (
            <View style={styles.tagModalSelected}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagModalSelectedInner}>
                {taggedUsers.map((u) => (
                  <Pressable key={u.id} style={styles.tagModalChip} onPress={() => removeTaggedUser(u.id)}>
                    <Text style={styles.tagModalChipText}>@{u.username}</Text>
                    <X size={12} color="#BFA35D" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.tagSearchWrap}>
            <Search size={16} color="rgba(142,142,147,0.5)" />
            <TextInput
              style={styles.tagSearchInput}
              placeholder="Freunde suchen..."
              placeholderTextColor="rgba(142,142,147,0.5)"
              value={tagSearch}
              onChangeText={setTagSearch}
              autoFocus
            />
            {tagSearch.length > 0 && (
              <Pressable onPress={() => setTagSearch('')}><X size={14} color="rgba(142,142,147,0.5)" /></Pressable>
            )}
          </View>
          {filteredTagUsers.length === 0 ? (
            <View style={styles.tagEmptyState}>
              <UserPlus size={40} color="rgba(142,142,147,0.2)" />
              <Text style={styles.tagEmptyText}>{friendUsers.length === 0 ? 'Noch keine Freunde hinzugefügt' : 'Keine Ergebnisse'}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTagUsers}
              renderItem={renderTagUser}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tagList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e10',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.08)',
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
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  publishBtnActive: {
    backgroundColor: '#BFA35D',
  },
  publishText: {
    color: '#636366',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  publishTextActive: {
    color: '#0f0e0b',
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  composerCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0f0e0b',
    fontSize: 18,
    fontWeight: '800' as const,
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  authorSubtext: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  textInput: {
    color: '#E8DCC8',
    fontSize: 17,
    lineHeight: 26,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    color: 'rgba(142,142,147,0.4)',
    fontSize: 11,
    textAlign: 'right' as const,
    marginTop: 8,
  },
  taggedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  taggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taggedLabel: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  taggedScroll: {
    flex: 1,
  },
  taggedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
    marginRight: 6,
  },
  taggedChipText: {
    color: '#BFA35D',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(191,163,93,0.06)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  locationBadgeText: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  toolbarScroll: {
    marginTop: 16,
    flexGrow: 0,
  },
  toolbarScrollInner: {
    gap: 6,
    paddingHorizontal: 2,
  },
  editToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  editToolBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  editToolLabel: {
    color: '#BFA35D',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  editToolLabelActive: {
    color: '#0f0e0b',
  },
  filterPanel: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  filterList: {
    paddingHorizontal: 8,
    gap: 8,
  },
  filterThumb: {
    alignItems: 'center',
    width: FILTER_THUMB + 12,
  },
  filterThumbActive: {},
  filterThumbImageWrap: {
    width: FILTER_THUMB,
    height: FILTER_THUMB,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1710',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterThumbImageWrapActive: {
    borderColor: '#BFA35D',
  },
  filterThumbImage: {
    width: '100%',
    height: '100%',
  },

  filterThumbCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterThumbName: {
    color: 'rgba(232,220,200,0.4)',
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 5,
    textAlign: 'center' as const,
  },
  filterThumbNameActive: {
    color: '#BFA35D',
    fontWeight: '700' as const,
  },
  fontPanel: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  fontList: {
    paddingHorizontal: 8,
    gap: 8,
  },
  fontOption: {
    alignItems: 'center',
    width: 68,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fontOptionActive: {
    borderColor: '#BFA35D',
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  fontOptionPreview: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 22,
    marginBottom: 4,
  },
  fontOptionPreviewActive: {
    color: '#BFA35D',
  },
  fontOptionName: {
    color: 'rgba(232,220,200,0.35)',
    fontSize: 9,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  fontOptionNameActive: {
    color: '#BFA35D',
    fontWeight: '700' as const,
  },
  imageSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  imageFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  imageInner: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  filterOverlayFull: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterCategoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  filterCategoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterCategoryBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  filterCategoryText: {
    color: 'rgba(232,220,200,0.35)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  filterCategoryTextActive: {
    color: '#BFA35D',
  },
  imageActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  imageActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  imageRemoveAction: {
    borderColor: 'rgba(255,69,58,0.3)',
  },
  imageFormatBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageFormatText: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  zoomIndicatorText: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  cropHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    opacity: 0.7,
  },
  cropHintText: {
    color: 'rgba(232,220,200,0.35)',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  gestureHintOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
  },
  gestureHintTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gestureHintContent: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  gestureFingers: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gestureFinger: {
    position: 'absolute',
  },
  gestureFingerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD,
    opacity: 0.8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gestureArrows: {
    marginTop: 2,
    opacity: 0.7,
  },
  gestureHintTitle: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  gestureHintSub: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 13,
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  dontShowAgainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  checkboxChecked: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  dontShowText: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  photoFirstPrompt: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 28,
    gap: 10,
  },
  photoFirstIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  photoFirstTitle: {
    color: '#E8DCC8',
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  photoFirstSub: {
    color: 'rgba(142,142,147,0.45)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  mediaPrompt: {
    marginTop: 16,
    gap: 10,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
    gap: 14,
  },
  mediaBtnIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnTextWrap: {
    flex: 1,
  },
  mediaBtnTitle: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  mediaBtnSub: {
    color: 'rgba(142,142,147,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  locationList: {
    flex: 1,
  },
  locationListInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.04)',
  },
  locationRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationRowText: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  locationSearchingRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  locationSearchingText: {
    color: 'rgba(142,142,147,0.5)',
    fontSize: 13,
  },
  tagModalContainer: {
    flex: 1,
    backgroundColor: '#0e0e10',
  },
  tagModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.08)',
  },
  tagModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagModalTitle: {
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  tagModalDone: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#BFA35D',
  },
  tagModalDoneText: {
    color: '#0f0e0b',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  tagModalSelected: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.06)',
  },
  tagModalSelectedInner: {
    gap: 8,
  },
  tagModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  tagModalChipText: {
    color: '#BFA35D',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tagSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  tagSearchInput: {
    flex: 1,
    color: '#E8DCC8',
    fontSize: 15,
  },
  tagList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  tagUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.04)',
  },
  tagUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  tagUserAvatarImg: {
    width: '100%',
    height: '100%',
  },
  tagUserAvatarGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagUserAvatarText: {
    color: '#0f0e0b',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  tagUserInfo: {
    flex: 1,
  },
  tagUserName: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tagUserHandle: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 12,
    marginTop: 1,
  },
  tagUserAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
    gap: 12,
  },
  tagEmptyText: {
    color: 'rgba(142,142,147,0.4)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
