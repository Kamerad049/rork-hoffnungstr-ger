import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  Radio,
  X,
  Users,
  Globe,
  UserCheck,
  RefreshCw,
  Navigation,
  Shield,
  Zap,
  MapPinOff,
  AlertTriangle,
  ChevronLeft,
  Search,
  Check,
  Crosshair,
  CircleDashed,
} from 'lucide-react-native';
import Svg, { Path, G, Circle as SvgCircle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BUNDESLAENDER, MAP_VIEWBOX } from '@/constants/germany_map_data';
import {
  useLiveLocation,
  latLngToSvg,
  haversineDistance,
  formatDistance,
  DURATION_LABELS,
  type SharingAudience,
  type SharingDuration,
  type SharingPrecision,
} from '@/providers/LiveLocationProvider';
import * as LocationAPI from 'expo-location';
import { useFriends } from '@/providers/FriendsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { SocialUser } from '@/constants/types';

const SVG_WIDTH = 586;
const SVG_HEIGHT = 793;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_DISPLAY_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const MAP_DISPLAY_HEIGHT = MAP_DISPLAY_WIDTH * (SVG_HEIGHT / SVG_WIDTH);

function PulsingMarker({
  svgX,
  svgY,
  markerUser,
  onPress,
  isMe,
}: {
  svgX: number;
  svgY: number;
  markerUser: SocialUser | null;
  onPress?: () => void;
  isMe?: boolean;
}) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(pulse2, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ]),
    );
    anim1.start();
    anim2.start();
    glowAnim.start();
    return () => {
      anim1.stop();
      anim2.stop();
      glowAnim.stop();
    };
  }, []);

  const xRatio = svgX / SVG_WIDTH;
  const yRatio = svgY / SVG_HEIGHT;
  const left = xRatio * MAP_DISPLAY_WIDTH;
  const top = yRatio * MAP_DISPLAY_HEIGHT;

  const markerColor = isMe ? '#BFA35D' : '#E8DCC8';
  const ringColor = isMe ? 'rgba(191,163,93,0.5)' : 'rgba(232,220,200,0.4)';

  const pulseScale1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 3] });
  const pulseOpacity1 = pulse1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.15, 0] });
  const pulseScale2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const pulseOpacity2 = pulse2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

  const avatarUrl = markerUser?.avatarUrl;
  const initials = (markerUser?.displayName ?? '?').charAt(0).toUpperCase();

  return (
    <Pressable
      style={[styles.markerContainer, { left: left - 22, top: top - 22 }]}
      onPress={onPress}
      hitSlop={12}
    >
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: ringColor,
            transform: [{ scale: pulseScale1 }],
            opacity: pulseOpacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: ringColor,
            transform: [{ scale: pulseScale2 }],
            opacity: pulseOpacity2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.markerOuter,
          {
            borderColor: markerColor,
            opacity: glow,
          },
        ]}
      />
      <View style={[styles.markerInner, { borderColor: markerColor }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.markerAvatar} />
        ) : (
          <View style={[styles.markerInitials, { backgroundColor: isMe ? '#BFA35D' : '#3a3a3c' }]}>
            <Text style={[styles.markerInitialsText, { color: isMe ? '#1c1c1e' : '#E8DCC8' }]}>
              {initials}
            </Text>
          </View>
        )}
      </View>
      {!isMe && markerUser && (
        <View style={styles.markerLabel}>
          <Text style={styles.markerLabelText} numberOfLines={1}>
            {markerUser.displayName.split(' ')[0]}
          </Text>
        </View>
      )}
      {isMe && (
        <View style={[styles.markerLabel, styles.markerLabelMe]}>
          <Text style={[styles.markerLabelText, styles.markerLabelTextMe]}>Du</Text>
        </View>
      )}
    </Pressable>
  );
}

function ShareSettingsSheet({
  visible,
  onClose,
  onStart,
  isStarting,
}: {
  visible: boolean;
  onClose: () => void;
  onStart: (audience: SharingAudience, duration: SharingDuration, specificIds: string[], precision: SharingPrecision) => void;
  isStarting: boolean;
}) {
  const { friendUsers } = useFriends();
  const [audience, setAudience] = useState<SharingAudience>('friends');
  const [duration, setDuration] = useState<SharingDuration>('1h');
  const [precision, setPrecision] = useState<SharingPrecision>('exact');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState<string>('');

  const filteredFriends = useMemo(() => {
    if (!friendSearch.trim()) return friendUsers;
    const q = friendSearch.toLowerCase().trim();
    return friendUsers.filter((f) =>
      f.displayName.toLowerCase().includes(q) ||
      f.username.toLowerCase().includes(q)
    );
  }, [friendUsers, friendSearch]);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const toggleFriend = useCallback((id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  const audienceOptions: { key: SharingAudience; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'friends', label: 'Alle Freunde', icon: <Users size={20} color="#BFA35D" />, desc: 'Nur deine Freunde' },
    { key: 'specific', label: 'Bestimmte', icon: <UserCheck size={20} color="#BFA35D" />, desc: 'Wähle Personen' },
  ];

  const durationOptions: SharingDuration[] = ['15min', '1h', '3h', '1day'];

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Standort teilen</Text>
            <Text style={styles.sheetSubtitle}>
              Wähle wer deinen Live-Standort sehen darf
            </Text>

            <Text style={styles.sheetSectionLabel}>Sichtbar für</Text>
            <View style={styles.audienceGrid}>
              {audienceOptions.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.audienceCard,
                    audience === opt.key && styles.audienceCardActive,
                  ]}
                  onPress={() => setAudience(opt.key)}
                >
                  {opt.icon}
                  <Text
                    style={[
                      styles.audienceCardLabel,
                      audience === opt.key && styles.audienceCardLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.audienceCardDesc}>{opt.desc}</Text>
                </Pressable>
              ))}
            </View>

            {audience === 'specific' && (
              <View style={styles.friendSelectSection}>
                <Text style={styles.sheetSectionLabel}>Freunde auswählen</Text>
                {selectedFriends.length > 0 && (
                  <View style={styles.selectedBadgeRow}>
                    <Text style={styles.selectedBadgeText}>
                      {selectedFriends.length} ausgewählt
                    </Text>
                  </View>
                )}
                <View style={styles.friendSearchWrap}>
                  <Search size={16} color="rgba(191,163,93,0.4)" />
                  <TextInput
                    style={styles.friendSearchInput}
                    placeholder="Name suchen..."
                    placeholderTextColor="rgba(191,163,93,0.3)"
                    value={friendSearch}
                    onChangeText={setFriendSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="friend-search-input"
                  />
                  {friendSearch.length > 0 && (
                    <Pressable onPress={() => setFriendSearch('')} hitSlop={8}>
                      <X size={14} color="rgba(191,163,93,0.4)" />
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  style={styles.friendListScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {filteredFriends.map((f) => {
                    const isSelected = selectedFriends.includes(f.id);
                    return (
                      <Pressable
                        key={f.id}
                        style={[
                          styles.friendListItem,
                          isSelected && styles.friendListItemActive,
                        ]}
                        onPress={() => toggleFriend(f.id)}
                      >
                        {f.avatarUrl ? (
                          <Image source={{ uri: f.avatarUrl }} style={styles.friendListAvatar} />
                        ) : (
                          <View style={styles.friendListInitial}>
                            <Text style={styles.friendListInitialText}>
                              {f.displayName.charAt(0)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.friendListInfo}>
                          <Text
                            style={[
                              styles.friendListName,
                              isSelected && styles.friendListNameActive,
                            ]}
                            numberOfLines={1}
                          >
                            {f.displayName}
                          </Text>
                          {f.username ? (
                            <Text style={styles.friendListUsername} numberOfLines={1}>
                              @{f.username}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.friendCheckbox,
                            isSelected && styles.friendCheckboxActive,
                          ]}
                        >
                          {isSelected && <Check size={14} color="#1c1c1e" />}
                        </View>
                      </Pressable>
                    );
                  })}
                  {filteredFriends.length === 0 && friendSearch.length > 0 && (
                    <Text style={styles.noFriendsText}>Kein Ergebnis für "{friendSearch}"</Text>
                  )}
                  {friendUsers.length === 0 && (
                    <Text style={styles.noFriendsText}>Noch keine Freunde</Text>
                  )}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sheetSectionLabel}>Genauigkeit</Text>
            <View style={styles.precisionRow}>
              <Pressable
                style={[
                  styles.precisionCard,
                  precision === 'exact' && styles.precisionCardActive,
                ]}
                onPress={() => setPrecision('exact')}
              >
                <Crosshair size={18} color={precision === 'exact' ? '#BFA35D' : 'rgba(191,163,93,0.5)'} />
                <View style={styles.precisionCardTextWrap}>
                  <Text style={[styles.precisionCardLabel, precision === 'exact' && styles.precisionCardLabelActive]}>Genau</Text>
                  <Text style={styles.precisionCardDesc}>Straße & Stadtteil sichtbar (~5-10m)</Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  styles.precisionCard,
                  precision === 'approximate' && styles.precisionCardActive,
                ]}
                onPress={() => setPrecision('approximate')}
              >
                <CircleDashed size={18} color={precision === 'approximate' ? '#BFA35D' : 'rgba(191,163,93,0.5)'} />
                <View style={styles.precisionCardTextWrap}>
                  <Text style={[styles.precisionCardLabel, precision === 'approximate' && styles.precisionCardLabelActive]}>Ungefähr</Text>
                  <Text style={styles.precisionCardDesc}>Nur Stadtteil sichtbar (~1km)</Text>
                </View>
              </Pressable>
            </View>

            <Text style={styles.sheetSectionLabel}>Dauer</Text>
            <View style={styles.durationRow}>
              {durationOptions.map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.durationPill,
                    duration === d && styles.durationPillActive,
                  ]}
                  onPress={() => setDuration(d)}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      duration === d && styles.durationPillTextActive,
                    ]}
                  >
                    {DURATION_LABELS[d]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.startBtn, isStarting && styles.startBtnDisabled]}
              onPress={() => !isStarting && onStart(audience, duration, selectedFriends, precision)}
              disabled={isStarting}
            >
              <LinearGradient
                colors={isStarting ? ['#8B7535', '#6B5525'] : ['#BFA35D', '#8B7535']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startBtnGradient}
              >
                {isStarting ? (
                  <>
                    <ActivityIndicator size="small" color="#1c1c1e" />
                    <Text style={styles.startBtnText}>Standort wird ermittelt...</Text>
                  </>
                ) : (
                  <>
                    <Radio size={18} color="#1c1c1e" />
                    <Text style={styles.startBtnText}>Live gehen</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function LiveMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user } = useAuth();
  const { profile } = useSocial();
  const {
    isSharing,
    isAcquiringLocation,
    permissionStatus,
    shareSettings,
    myLocation,
    visibleLocationsWithUsers,
    isLoadingLocations,
    startSharing,
    stopSharing,
    fetchFriendLocations,
    remainingTime,
  } = useLiveLocation();

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<(SocialUser & { latitude: number; longitude: number; timestamp?: string }) | null>(null);
  const [selectedUserCity, setSelectedUserCity] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isStartingShare, setIsStartingShare] = useState<boolean>(false);
  const mapGlow = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const timerDisplay = isSharing ? formatRemainingTime(remainingTime) : '';

  useEffect(() => {
    if (isSharing) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(mapGlow, { toValue: 1, duration: 2500, useNativeDriver: false }),
          Animated.timing(mapGlow, { toValue: 0, duration: 2500, useNativeDriver: false }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    } else {
      mapGlow.setValue(0);
    }
  }, [isSharing]);

  const handleStartSharing = useCallback(
    async (audience: SharingAudience, duration: SharingDuration, specificIds: string[], selectedPrecision: SharingPrecision) => {
      setIsStartingShare(true);
      console.log('[LIVEMAP] Starting share with:', audience, duration, 'precision:', selectedPrecision);
      const success = await startSharing({ audience, duration, specificUserIds: specificIds, precision: selectedPrecision });
      setIsStartingShare(false);
      if (success) {
        setShowSettings(false);
        console.log('[LIVEMAP] Share started successfully');
      } else {
        console.log('[LIVEMAP] Share failed - permission or location issue');
      }
    },
    [startSharing],
  );

  const handleRefresh = useCallback(async () => {
    console.log('[LIVEMAP] Manual refresh triggered');
    const anim = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    );
    anim.start();
    await fetchFriendLocations();
    anim.stop();
    spinAnim.setValue(0);
  }, [fetchFriendLocations, spinAnim]);

  const handleMarkerPress = useCallback(async (pressedUser: SocialUser, lat: number, lng: number, timestamp?: string) => {
    setSelectedUser({ ...pressedUser, latitude: lat, longitude: lng, timestamp });
    setSelectedUserCity(null);
    setIsReverseGeocoding(true);
    try {
      if (Platform.OS === 'web') {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=de&zoom=18`);
        const data = await resp.json();
        const addr = data?.address;
        const street = addr?.road || addr?.pedestrian || addr?.footway || null;
        const houseNumber = addr?.house_number || null;
        const suburb = addr?.suburb || addr?.neighbourhood || addr?.quarter || addr?.city_district || null;
        const city = addr?.city || addr?.town || addr?.village || addr?.municipality || null;
        const state = addr?.state || null;
        const parts: string[] = [];
        if (street) {
          parts.push(houseNumber ? `${street} ${houseNumber}` : street);
        }
        if (suburb) parts.push(suburb);
        if (city) parts.push(city);
        if (state && state !== city) parts.push(state);
        setSelectedUserCity(parts.length > 0 ? parts.join(', ') : 'Unbekannter Ort');
      } else {
        const results = await LocationAPI.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results && results.length > 0) {
          const r = results[0];
          const parts: string[] = [];
          if (r.street) {
            parts.push(r.streetNumber ? `${r.street} ${r.streetNumber}` : r.street);
          }
          if (r.district && r.district !== r.city) parts.push(r.district);
          if (r.city) parts.push(r.city);
          if (r.region && r.region !== r.city) parts.push(r.region);
          setSelectedUserCity(parts.length > 0 ? parts.join(', ') : 'Unbekannter Ort');
        } else {
          setSelectedUserCity('Unbekannter Ort');
        }
      }
    } catch (e) {
      console.log('[LIVEMAP] Reverse geocode error:', e);
      setSelectedUserCity('Standort wird geladen...');
    }
    setIsReverseGeocoding(false);
  }, []);

  const meAsSocialUser: SocialUser | null = useMemo(() => {
    if (!user) return null;
    return {
      id: 'me',
      username: user.name?.toLowerCase().replace(/\s/g, '') ?? '',
      displayName: profile?.displayName || user.name || 'Ich',
      bio: '',
      avatarUrl: profile?.avatarUrl ?? null,
      rank: '',
      rankIcon: '',
      ep: 0,
      stampCount: 0,
      postCount: 0,
      friendCount: 0,
    };
  }, [user, profile]);

  const myMapPosition = useMemo(() => {
    if (!myLocation) return null;
    return latLngToSvg(myLocation.latitude, myLocation.longitude);
  }, [myLocation]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const showPermissionHint = permissionStatus === 'denied' || permissionStatus === 'unavailable';

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#1a1917', '#141416', '#111113']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                {from ? (
                  <Pressable
                    style={styles.backBtn}
                    onPress={() => {
                      if (from === 'profile') {
                        router.replace('/(tabs)/profile' as any);
                      } else {
                        router.back();
                      }
                    }}
                    hitSlop={12}
                    testID="livemap-back-btn"
                  >
                    <ChevronLeft size={20} color="#BFA35D" />
                  </Pressable>
                ) : null}
                <Text style={styles.screenTitle}>Live Karte</Text>
              </View>
              <Text style={styles.screenSubtitle}>
                {isSharing
                  ? 'Du bist live!'
                  : visibleLocationsWithUsers.length > 0
                  ? `${visibleLocationsWithUsers.length} ${visibleLocationsWithUsers.length === 1 ? 'Person' : 'Personen'} aktiv`
                  : 'Sieh wer gerade unterwegs ist'}
              </Text>
            </View>
            <Pressable
              style={styles.refreshBtn}
              onPress={handleRefresh}
              hitSlop={12}
              testID="refresh-btn"
            >
              {isLoadingLocations ? (
                <ActivityIndicator size="small" color="#BFA35D" />
              ) : (
                <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
                  <RefreshCw size={18} color="#BFA35D" />
                </Animated.View>
              )}
            </Pressable>
          </View>
        </View>

        {showPermissionHint && (
          <View style={styles.permissionHint}>
            <View style={styles.permissionHintIcon}>
              {permissionStatus === 'denied' ? (
                <MapPinOff size={18} color="#E8A44A" />
              ) : (
                <AlertTriangle size={18} color="#E8A44A" />
              )}
            </View>
            <View style={styles.permissionHintContent}>
              <Text style={styles.permissionHintTitle}>
                {permissionStatus === 'denied'
                  ? 'Standortzugriff verweigert'
                  : 'Ortungsdienste deaktiviert'}
              </Text>
              <Text style={styles.permissionHintDesc}>
                {permissionStatus === 'denied'
                  ? 'Erlaube den Standortzugriff in deinen Einstellungen, um deinen Live-Standort zu teilen.'
                  : 'Aktiviere GPS/Ortungsdienste in deinen Geräteeinstellungen.'}
              </Text>
            </View>
          </View>
        )}

        {isAcquiringLocation && !isSharing && (
          <View style={styles.acquiringBar}>
            <ActivityIndicator size="small" color="#BFA35D" />
            <Text style={styles.acquiringText}>Standort wird ermittelt...</Text>
          </View>
        )}

        {isSharing && (
          <View style={styles.liveStatusBar}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
              <Text style={styles.liveTimer}>{timerDisplay}</Text>
            </View>
            <View style={styles.liveInfoRow}>
              <Shield size={13} color="rgba(191,163,93,0.6)" />
              <Text style={styles.liveAudienceText}>
                {shareSettings.audience === 'friends'
                  ? 'Sichtbar für Freunde'
                  : `${shareSettings.specificUserIds.length} Personen`}
              </Text>
              <Text style={styles.liveAudienceText}>·</Text>
              <Text style={styles.liveAudienceText}>
                {shareSettings.precision === 'exact' ? 'Genau' : 'Ungefähr'}
              </Text>
            </View>
            <Pressable style={styles.stopBtn} onPress={stopSharing}>
              <X size={14} color="#C06060" />
              <Text style={styles.stopBtnText}>Beenden</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.mapWrapper}>
          <View style={styles.mapInner}>
            <View pointerEvents="none">
            <Svg
              width={MAP_DISPLAY_WIDTH}
              height={MAP_DISPLAY_HEIGHT}
              viewBox={MAP_VIEWBOX}
            >
              <Defs>
                <RadialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="rgba(191,163,93,0.06)" />
                  <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </RadialGradient>
              </Defs>
              {BUNDESLAENDER.map((bl) => (
                <G key={bl.id}>
                  <Path
                    d={bl.path}
                    fill="rgba(42,42,46,0.5)"
                    stroke="rgba(191,163,93,0.12)"
                    strokeWidth={0.8}
                    strokeLinejoin="round"
                  />
                </G>
              ))}
              {visibleLocationsWithUsers.map((loc) => {
                const pos = latLngToSvg(loc.latitude, loc.longitude);
                return (
                  <G key={`glow-${loc.userId}`}>
                    <SvgCircle
                      cx={pos.x}
                      cy={pos.y}
                      r={18}
                      fill="rgba(232,220,200,0.06)"
                    />
                    <SvgCircle
                      cx={pos.x}
                      cy={pos.y}
                      r={8}
                      fill="rgba(232,220,200,0.15)"
                    />
                  </G>
                );
              })}
              {isSharing && myLocation && myMapPosition && (
                <G>
                  <SvgCircle
                    cx={myMapPosition.x}
                    cy={myMapPosition.y}
                    r={22}
                    fill="rgba(191,163,93,0.08)"
                  />
                  <SvgCircle
                    cx={myMapPosition.x}
                    cy={myMapPosition.y}
                    r={10}
                    fill="rgba(191,163,93,0.2)"
                  />
                </G>
              )}
            </Svg>
            </View>

            {visibleLocationsWithUsers.map((loc) => {
              const pos = latLngToSvg(loc.latitude, loc.longitude);
              return (
                <PulsingMarker
                  key={`marker-${loc.userId}`}
                  svgX={pos.x}
                  svgY={pos.y}
                  markerUser={loc.user}
                  onPress={() => handleMarkerPress(loc.user, loc.latitude, loc.longitude, loc.timestamp)}
                />
              );
            })}

            {isSharing && myLocation && myMapPosition && (
              <PulsingMarker
                svgX={myMapPosition.x}
                svgY={myMapPosition.y}
                markerUser={meAsSocialUser}
                isMe
                onPress={() => {
                  if (meAsSocialUser && myLocation) {
                    handleMarkerPress(
                      meAsSocialUser,
                      myLocation.latitude,
                      myLocation.longitude,
                      new Date().toISOString(),
                    );
                  }
                }}
              />
            )}
          </View>
        </View>

        {!isSharing && (
          <Pressable
            style={styles.shareLocationBtn}
            onPress={() => setShowSettings(true)}
            testID="share-location-btn"
          >
            <LinearGradient
              colors={['#BFA35D', '#96803A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareLocationBtnInner}
            >
              <Navigation size={20} color="#1c1c1e" />
              <Text style={styles.shareLocationBtnText}>Standort teilen</Text>
            </LinearGradient>
          </Pressable>
        )}

        {visibleLocationsWithUsers.length > 0 && (
          <View style={styles.activeFriendsSection}>
            <Text style={styles.activeFriendsTitle}>Gerade aktiv</Text>
            {visibleLocationsWithUsers.map((loc) => {
              const timeAgo = Math.floor(
                (Date.now() - new Date(loc.timestamp).getTime()) / 60000,
              );
              const distKm = myLocation
                ? haversineDistance(myLocation.latitude, myLocation.longitude, loc.latitude, loc.longitude)
                : null;
              return (
                <Pressable
                  key={`friend-${loc.userId}`}
                  style={styles.activeFriendRow}
                  onPress={() => handleMarkerPress(loc.user, loc.latitude, loc.longitude, loc.timestamp)}
                >
                  <View style={styles.activeFriendAvatarWrap}>
                    <View style={styles.activeFriendLiveDot} />
                    {loc.user.avatarUrl ? (
                      <Image
                        source={{ uri: loc.user.avatarUrl }}
                        style={styles.activeFriendAvatar}
                      />
                    ) : (
                      <View style={styles.activeFriendInitial}>
                        <Text style={styles.activeFriendInitialText}>
                          {loc.user.displayName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.activeFriendInfo}>
                    <Text style={styles.activeFriendName}>
                      {loc.user.displayName}
                    </Text>
                    <View style={styles.activeFriendSubRow}>
                      <Text style={styles.activeFriendTime}>
                        {timeAgo < 1 ? 'Gerade eben' : `vor ${timeAgo} Min.`}
                      </Text>
                      {distKm !== null && (
                        <>
                          <Text style={styles.activeFriendDot}>·</Text>
                          <Text style={styles.activeFriendDistance}>
                            {formatDistance(distKm)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.activeFriendBadge}>
                    <Zap size={12} color="#BFA35D" />
                    <Text style={styles.activeFriendBadgeText}>Live</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {visibleLocationsWithUsers.length === 0 && !isSharing && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MapPin size={32} color="rgba(191,163,93,0.4)" />
            </View>
            <Text style={styles.emptyTitle}>Noch niemand unterwegs</Text>
            <Text style={styles.emptyDesc}>
              Teile deinen Live-Standort mit Freunden und sieh wo sie gerade sind — besser als WhatsApp & Instagram.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ShareSettingsSheet
        visible={showSettings}
        onClose={() => !isStartingShare && setShowSettings(false)}
        onStart={handleStartSharing}
        isStarting={isStartingShare}
      />

      {selectedUser && (() => {
        const distKm = myLocation
          ? haversineDistance(myLocation.latitude, myLocation.longitude, selectedUser.latitude, selectedUser.longitude)
          : null;
        const timeAgo = selectedUser.timestamp
          ? Math.floor((Date.now() - new Date(selectedUser.timestamp).getTime()) / 60000)
          : null;
        return (
          <Modal transparent animationType="fade" visible onRequestClose={() => setSelectedUser(null)}>
            <Pressable style={styles.profileOverlay} onPress={() => setSelectedUser(null)}>
              <Pressable style={styles.profileCard} onPress={(e) => e.stopPropagation()}>
                <View style={styles.profileCloseRow}>
                  <Pressable onPress={() => setSelectedUser(null)} hitSlop={12} style={styles.profileCloseBtn}>
                    <X size={18} color="rgba(232,220,200,0.5)" />
                  </Pressable>
                </View>

                <View style={styles.profileCardAvatarSection}>
                  <View style={styles.profileCardAvatarRing}>
                    <View style={styles.profileCardLiveBadge}>
                      <View style={styles.profileCardLiveDot} />
                    </View>
                    {selectedUser.avatarUrl ? (
                      <Image
                        source={{ uri: selectedUser.avatarUrl }}
                        style={styles.profileCardAvatarLarge}
                      />
                    ) : (
                      <View style={styles.profileCardInitialLarge}>
                        <Text style={styles.profileCardInitialTextLarge}>
                          {selectedUser.displayName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.profileCardName}>{selectedUser.displayName}</Text>
                  {selectedUser.rank ? (
                    <Text style={styles.profileCardRank}>{selectedUser.rank}</Text>
                  ) : null}
                </View>

                <View style={styles.profileCardDivider} />

                <View style={styles.profileCardDetailRow}>
                  <View style={styles.profileCardDetailIcon}>
                    <MapPin size={16} color="#BFA35D" />
                  </View>
                  <View style={styles.profileCardDetailContent}>
                    <Text style={styles.profileCardDetailLabel}>Standort</Text>
                    {isReverseGeocoding ? (
                      <ActivityIndicator size="small" color="#BFA35D" />
                    ) : (
                      <Text style={styles.profileCardDetailValue}>
                        {selectedUserCity ?? 'Wird ermittelt...'}
                      </Text>
                    )}
                  </View>
                </View>

                {distKm !== null && (
                  <View style={styles.profileCardDetailRow}>
                    <View style={styles.profileCardDetailIcon}>
                      <Navigation size={16} color="#BFA35D" />
                    </View>
                    <View style={styles.profileCardDetailContent}>
                      <Text style={styles.profileCardDetailLabel}>Entfernung</Text>
                      <Text style={styles.profileCardDetailValue}>
                        {formatDistance(distKm)} von dir entfernt
                      </Text>
                    </View>
                  </View>
                )}

                {!distKm && !isSharing && (
                  <View style={styles.profileCardDetailRow}>
                    <View style={styles.profileCardDetailIcon}>
                      <Navigation size={16} color="rgba(191,163,93,0.3)" />
                    </View>
                    <View style={styles.profileCardDetailContent}>
                      <Text style={styles.profileCardDetailLabel}>Entfernung</Text>
                      <Text style={[styles.profileCardDetailValue, { color: 'rgba(191,163,93,0.35)' }]}>
                        Teile deinen Standort um die Entfernung zu sehen
                      </Text>
                    </View>
                  </View>
                )}

                {timeAgo !== null && (
                  <View style={styles.profileCardDetailRow}>
                    <View style={styles.profileCardDetailIcon}>
                      <Zap size={16} color="#BFA35D" />
                    </View>
                    <View style={styles.profileCardDetailContent}>
                      <Text style={styles.profileCardDetailLabel}>Zuletzt aktiv</Text>
                      <Text style={styles.profileCardDetailValue}>
                        {timeAgo < 1 ? 'Gerade eben' : timeAgo < 60 ? `vor ${timeAgo} Min.` : `vor ${Math.floor(timeAgo / 60)} Std.`}
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  style={styles.profileCardBtn}
                  onPress={() => {
                    setSelectedUser(null);
                    if (selectedUser.id === 'me') {
                      router.push('/(tabs)/profile' as any);
                    } else {
                      router.push({
                        pathname: '/user-profile',
                        params: { userId: selectedUser.id },
                      } as any);
                    }
                  }}
                >
                  <Text style={styles.profileCardBtnText}>Profil ansehen</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    marginTop: 2,
  },
  permissionHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(232,164,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,164,74,0.2)',
    gap: 12,
  },
  permissionHintIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(232,164,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  permissionHintContent: {
    flex: 1,
  },
  permissionHintTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8A44A',
    marginBottom: 3,
  },
  permissionHintDesc: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(232,164,74,0.7)',
    lineHeight: 17,
  },
  acquiringBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  acquiringText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.7)',
  },
  liveStatusBar: {
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C06060',
  },
  liveText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#C06060',
    letterSpacing: 1.5,
  },
  liveTimer: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginLeft: 'auto' as const,
  },
  liveInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  liveAudienceText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.6)',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(192,96,96,0.1)',
    marginTop: 8,
  },
  stopBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#C06060',
  },
  mapWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    backgroundColor: 'rgba(20,20,22,0.9)',
    alignSelf: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  mapInner: {
    position: 'relative',
    width: MAP_DISPLAY_WIDTH,
    height: MAP_DISPLAY_HEIGHT,
  },
  markerContainer: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  markerOuter: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#2a2a2e',
  },
  markerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
  markerInitials: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInitialsText: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  markerLabel: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(42,42,46,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 70,
  },
  markerLabelMe: {
    backgroundColor: 'rgba(191,163,93,0.2)',
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
  },
  markerLabelTextMe: {
    color: '#BFA35D',
  },
  shareLocationBtn: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  shareLocationBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  shareLocationBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#1c1c1e',
  },
  activeFriendsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  activeFriendsTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 12,
  },
  activeFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(42,42,46,0.5)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  activeFriendAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  activeFriendLiveDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#2a2a2e',
    zIndex: 2,
  },
  activeFriendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  activeFriendInitial: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  activeFriendInitialText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  activeFriendInfo: {
    flex: 1,
  },
  activeFriendName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  activeFriendSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  activeFriendTime: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  activeFriendDot: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.3)',
  },
  activeFriendDistance: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.7)',
  },
  activeFriendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  activeFriendBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#BFA35D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.5)',
    textAlign: 'center' as const,
    lineHeight: 19,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.5)',
    marginBottom: 24,
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  audienceGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  audienceCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(42,42,46,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    gap: 6,
  },
  audienceCardActive: {
    borderColor: '#BFA35D',
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  audienceCardLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  audienceCardLabelActive: {
    color: '#BFA35D',
  },
  audienceCardDesc: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
    textAlign: 'center' as const,
  },
  friendSelectSection: {
    marginBottom: 20,
  },
  selectedBadgeRow: {
    marginBottom: 8,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  friendSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,46,0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    gap: 8,
  },
  friendSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#E8DCC8',
    padding: 0,
    margin: 0,
  },
  friendListScroll: {
    maxHeight: 180,
  },
  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(42,42,46,0.3)',
    gap: 10,
  },
  friendListItemActive: {
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  friendListAvatar: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  friendListInitial: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  friendListInitialText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  friendListInfo: {
    flex: 1,
  },
  friendListName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  friendListNameActive: {
    color: '#BFA35D',
  },
  friendListUsername: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
    marginTop: 1,
  },
  friendCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCheckboxActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  noFriendsText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
    paddingVertical: 8,
  },
  precisionRow: {
    gap: 8,
    marginBottom: 20,
  },
  precisionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(42,42,46,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.08)',
    gap: 12,
  },
  precisionCardActive: {
    borderColor: '#BFA35D',
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  precisionCardTextWrap: {
    flex: 1,
  },
  precisionCardLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  precisionCardLabelActive: {
    color: '#BFA35D',
  },
  precisionCardDesc: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
    marginTop: 1,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,46,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  durationPillActive: {
    borderColor: '#BFA35D',
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  durationPillTextActive: {
    color: '#BFA35D',
  },
  startBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  startBtnDisabled: {
    opacity: 0.8,
  },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#1c1c1e',
  },
  profileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  profileCloseRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  profileCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(232,220,200,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardAvatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileCardAvatarRing: {
    width: 76,
    height: 76,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  profileCardLiveBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  profileCardLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  profileCardAvatarLarge: {
    width: 66,
    height: 66,
    borderRadius: 15,
  },
  profileCardInitialLarge: {
    width: 66,
    height: 66,
    borderRadius: 15,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardInitialTextLarge: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  profileCardName: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
  },
  profileCardRank: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
    marginTop: 3,
    textAlign: 'center' as const,
  },
  profileCardDivider: {
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.08)',
    marginBottom: 14,
  },
  profileCardDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  profileCardDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  profileCardDetailContent: {
    flex: 1,
  },
  profileCardDetailLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.45)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  profileCardDetailValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E8DCC8',
    lineHeight: 20,
  },
  profileCardBtn: {
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    marginTop: 4,
  },
  profileCardBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
});
