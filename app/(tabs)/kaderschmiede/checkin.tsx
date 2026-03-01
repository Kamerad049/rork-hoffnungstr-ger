import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import {
  ChevronLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Check,
  Zap,
  Users,
  Clock,
  X,
  RefreshCw,
  MapPin,
  Crosshair,
  Radar,
  Lock,
  Eye,
  ScanLine,
  AlertTriangle,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { CheckInEntry } from '@/constants/kaderschmiede';
import {
  CHECKIN_PROXIMITY_RADIUS_M,
  CHECKIN_TOKEN_ROTATION_S,
} from '@/constants/kaderschmiede';

const SLOT_SIZE = 72;
const SLOT_GAP = 14;

let CameraViewComponent: any = null;
let useCameraPermissionsHook: any = null;

try {
  const cam = require('expo-camera');
  CameraViewComponent = cam.CameraView;
  useCameraPermissionsHook = cam.useCameraPermissions;
} catch {
  console.log('[CHECKIN] expo-camera not available');
}

function CheckInSlot({
  entry,
  index,
  isEmpty,
}: {
  entry: CheckInEntry | null;
  index: number;
  isEmpty: boolean;
  totalSlots: number;
}) {
  const scaleAnim = useRef(new Animated.Value(isEmpty ? 1 : 0)).current;
  const bounceAnim = useRef(new Animated.Value(isEmpty ? 0 : -80)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isEmpty && !hasAnimated.current) {
      hasAnimated.current = true;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      Animated.sequence([
        Animated.delay(index * 120),
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
          Animated.spring(bounceAnim, { toValue: 0, friction: 5, tension: 180, useNativeDriver: true }),
        ]),
      ]).start(() => {
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [isEmpty]);

  useEffect(() => {
    if (isEmpty) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.92, duration: 1500 + index * 200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500 + index * 200, useNativeDriver: true }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isEmpty]);

  const initial = entry?.userName?.charAt(0)?.toUpperCase() ?? '?';

  if (isEmpty) {
    return (
      <Animated.View style={[styles.slotContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.slotEmpty}>
          <View style={styles.slotInnerShadow}>
            <View style={styles.slotInnerDeep}>
              <View style={styles.slotDottedCircle}>
                <Text style={styles.slotQuestionMark}>?</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.slotLabel} numberOfLines={1}>Frei</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.slotContainer, { transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] }]}>
      <Animated.View style={[styles.slotGlow, { opacity: glowAnim }]} />
      <View style={styles.slotFilled}>
        {entry?.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.slotAvatar} />
        ) : (
          <LinearGradient colors={['#BFA35D', '#8B7340']} style={styles.slotAvatarGradient}>
            <Text style={styles.slotAvatarText}>{initial}</Text>
          </LinearGradient>
        )}
        <View style={styles.slotCheckMark}>
          <Check size={10} color="#141416" strokeWidth={3} />
        </View>
      </View>
      <Text style={styles.slotLabelFilled} numberOfLines={1}>
        {entry?.userName?.split(' ')[0] ?? 'User'}
      </Text>
      {entry?.distanceToHost != null && (
        <Text style={styles.slotDistance}>{Math.round(entry.distanceToHost)}m</Text>
      )}
    </Animated.View>
  );
}

function RotatingQRCode({ checkinId, generateToken }: { checkinId: string; generateToken: () => string | null }) {
  const [currentToken, setCurrentToken] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(CHECKIN_TOKEN_ROTATION_S);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const refreshToken = useCallback(() => {
    const token = generateToken();
    if (token) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setCurrentToken(token);
      setCountdown(CHECKIN_TOKEN_ROTATION_S);
      console.log('[CHECKIN] New QR token generated');
    }
  }, [generateToken]);

  useEffect(() => {
    refreshToken();
    const interval = setInterval(refreshToken, CHECKIN_TOKEN_ROTATION_S * 1000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentToken]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const qrUrl = currentToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(currentToken)}&bgcolor=14-14-16&color=BF-A3-5D&margin=2`
    : '';

  return (
    <View style={styles.qrSection}>
      <View style={styles.qrSecurityBadge}>
        <Lock size={12} color="#BFA35D" />
        <Text style={styles.qrSecurityText}>VERSCHLÜSSELTER QR-CODE</Text>
      </View>

      <Animated.View style={[styles.qrContainer, { transform: [{ scale: pulseAnim }], opacity: fadeAnim }]}>
        <LinearGradient
          colors={['rgba(191,163,93,0.12)', 'rgba(191,163,93,0.04)']}
          style={styles.qrGradientBorder}
        >
          {qrUrl ? (
            <Image
              source={{ uri: qrUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <ActivityIndicator color="#BFA35D" size="large" />
          )}
        </LinearGradient>
      </Animated.View>

      <View style={styles.qrTimerRow}>
        <RefreshCw size={12} color={countdown <= 5 ? '#C06060' : '#BFA35D'} />
        <Text style={[styles.qrTimerText, countdown <= 5 && styles.qrTimerTextUrgent]}>
          Neuer Code in {countdown}s
        </Text>
      </View>

      <View style={styles.qrSecurityInfo}>
        <View style={styles.securityFeature}>
          <Radar size={14} color="rgba(191,163,93,0.6)" />
          <Text style={styles.securityFeatureText}>Rotiert alle {CHECKIN_TOKEN_ROTATION_S}s</Text>
        </View>
        <View style={styles.securityFeature}>
          <MapPin size={14} color="rgba(191,163,93,0.6)" />
          <Text style={styles.securityFeatureText}>{CHECKIN_PROXIMITY_RADIUS_M}m Radius</Text>
        </View>
        <View style={styles.securityFeature}>
          <ShieldCheck size={14} color="rgba(191,163,93,0.6)" />
          <Text style={styles.securityFeatureText}>Anti-Spoofing</Text>
        </View>
      </View>
    </View>
  );
}

function QRScanner({
  onScan,
  onClose,
}: {
  onScan: (data: string) => void;
  onClose: () => void;
}) {
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const permission = useCameraPermissionsHook ? useCameraPermissionsHook() : [null, null, null];
  const [permissionResponse, requestPermission] = permission;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const handleBarcode = useCallback((result: any) => {
    if (hasScanned) return;
    const data = result?.data ?? result?.nativeEvent?.data ?? '';
    if (data && data.startsWith('KADER:')) {
      setHasScanned(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      onScan(data);
    }
  }, [hasScanned, onScan]);

  if (Platform.OS === 'web' || !CameraViewComponent) {
    return (
      <View style={styles.scannerFallback}>
        <AlertTriangle size={32} color="#BFA35D" />
        <Text style={styles.scannerFallbackTitle}>Kamera nicht verfügbar</Text>
        <Text style={styles.scannerFallbackDesc}>
          QR-Code Scanning ist nur auf dem Handy verfügbar.
        </Text>
        <Pressable style={styles.scannerCloseBtn} onPress={onClose}>
          <Text style={styles.scannerCloseBtnText}>Schließen</Text>
        </Pressable>
      </View>
    );
  }

  if (!permissionResponse) {
    return (
      <View style={styles.scannerLoading}>
        <ActivityIndicator color="#BFA35D" size="large" />
      </View>
    );
  }

  if (!permissionResponse.granted) {
    return (
      <View style={styles.scannerFallback}>
        <Eye size={32} color="#BFA35D" />
        <Text style={styles.scannerFallbackTitle}>Kamera-Zugriff benötigt</Text>
        <Text style={styles.scannerFallbackDesc}>
          Um den QR-Code zu scannen, benötigen wir Zugriff auf deine Kamera.
        </Text>
        <Pressable style={styles.scannerPermBtn} onPress={requestPermission}>
          <Text style={styles.scannerPermBtnText}>Kamera erlauben</Text>
        </Pressable>
        <Pressable style={styles.scannerCloseBtn} onPress={onClose}>
          <Text style={styles.scannerCloseBtnText}>Abbrechen</Text>
        </Pressable>
      </View>
    );
  }

  const CameraView = CameraViewComponent;

  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={hasScanned ? undefined : handleBarcode}
      />
      <View style={styles.scannerOverlay}>
        <View style={styles.scannerFrame}>
          <View style={[styles.scannerCorner, styles.cornerTL]} />
          <View style={[styles.scannerCorner, styles.cornerTR]} />
          <View style={[styles.scannerCorner, styles.cornerBL]} />
          <View style={[styles.scannerCorner, styles.cornerBR]} />
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 220],
                  }),
                }],
              },
            ]}
          />
        </View>
        <Text style={styles.scannerHint}>QR-Code des Gastgebers scannen</Text>
      </View>
      <Pressable style={styles.scannerTopClose} onPress={onClose} hitSlop={12}>
        <X size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

function GPSStatus({
  status,
  accuracy,
}: {
  status: 'loading' | 'locked' | 'error' | 'mocked';
  accuracy: number | null;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'loading') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [status]);

  const getIcon = () => {
    switch (status) {
      case 'loading': return <Crosshair size={16} color="#BFA35D" />;
      case 'locked': return <MapPin size={16} color="#4CAF50" />;
      case 'error': return <ShieldAlert size={16} color="#C06060" />;
      case 'mocked': return <AlertTriangle size={16} color="#C06060" />;
    }
  };

  const getText = () => {
    switch (status) {
      case 'loading': return 'GPS-Signal wird gesucht...';
      case 'locked': return `GPS gesperrt (±${Math.round(accuracy ?? 0)}m)`;
      case 'error': return 'GPS nicht verfügbar';
      case 'mocked': return 'WARNUNG: Gefälschter Standort!';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'loading': return 'rgba(191,163,93,0.15)';
      case 'locked': return 'rgba(76,175,80,0.1)';
      case 'error': return 'rgba(192,96,96,0.1)';
      case 'mocked': return 'rgba(192,96,96,0.15)';
    }
  };

  return (
    <Animated.View style={[styles.gpsStatusRow, { backgroundColor: getColor(), opacity: status === 'loading' ? pulseAnim : 1 }]}>
      {getIcon()}
      <Text style={[styles.gpsStatusText, (status === 'error' || status === 'mocked') && styles.gpsStatusError]}>
        {getText()}
      </Text>
    </Animated.View>
  );
}

function ProgressRing({ checked, total }: { checked: number; total: number }) {
  const progress = total > 0 ? checked / total : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, friction: 8, tension: 40, useNativeDriver: false }).start();
  }, [progress]);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRingOuter}>
        <View style={styles.progressRingInner}>
          <Text style={styles.progressNumber}>{checked}</Text>
          <Text style={styles.progressSlash}>/</Text>
          <Text style={styles.progressTotal}>{total}</Text>
        </View>
      </View>
      <Animated.View
        style={[styles.progressBar, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
      <View style={styles.progressBarBg} />
    </View>
  );
}

function AllCheckedInCelebration() {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.celebrationContainer, {
        transform: [
          { scale: scaleAnim },
          { rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] }) },
        ],
      }]}
    >
      <LinearGradient colors={['rgba(191,163,93,0.2)', 'rgba(191,163,93,0.05)']} style={styles.celebrationGradient}>
        <Zap size={32} color="#BFA35D" />
        <Text style={styles.celebrationTitle}>VOLLSTÄNDIG!</Text>
        <Text style={styles.celebrationSubtitle}>Alle Teilnehmer sind eingecheckt</Text>
      </LinearGradient>
    </Animated.View>
  );
}

export default function CheckInScreen() {
  const { type, sessionId, participantIds: participantIdsParam } = useLocalSearchParams<{
    type: string;
    sessionId: string;
    participantIds: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    activeCheckIn,
    startCheckIn,
    performCheckIn,
    endCheckIn,
    refreshCheckIn,
    generateCurrentToken,
    getMemberName,
    getMemberAvatar,
    getActivityById,
  } = useKaderschmiede();

  const [mode, setMode] = useState<'host' | 'scan'>('host');
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'locked' | 'error' | 'mocked'>('loading');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [hostLocation, setHostLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  const userId = user?.id ?? '';
  const checkInType = (type as 'activity' | 'meeting') ?? 'activity';
  const parsedParticipantIds: string[] = useMemo(() => {
    try { return participantIdsParam ? JSON.parse(participantIdsParam) : []; } catch { return []; }
  }, [participantIdsParam]);

  const sessionTitle = useMemo(() => {
    if (checkInType === 'activity' && sessionId) {
      const activity = getActivityById(sessionId);
      return activity?.title ?? 'Aktivität';
    }
    return 'Treffen';
  }, [checkInType, sessionId, getActivityById]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        if (Platform.OS === 'web') {
          setGpsStatus('locked');
          setGpsAccuracy(10);
          setHostLocation({ latitude: 52.52, longitude: 13.41, accuracy: 10 });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[CHECKIN] Location permission denied');
          if (isMounted) setGpsStatus('error');
          return;
        }

        console.log('[CHECKIN] Getting GPS position...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!isMounted) return;

        console.log('[CHECKIN] GPS fix:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
          mocked: (location as any).mocked,
        });

        if ((location as any).mocked) {
          setGpsStatus('mocked');
          console.log('[CHECKIN] SECURITY ALERT: Mocked GPS detected!');
          return;
        }

        setGpsAccuracy(location.coords.accuracy);
        setHostLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 0,
        });
        setGpsStatus('locked');
      } catch (err) {
        console.log('[CHECKIN] GPS error:', err);
        if (isMounted) setGpsStatus('error');
      }
    };

    getLocation();
    return () => { isMounted = false; };
  }, []);

  const handleStartCheckIn = useCallback(async () => {
    if (isStarting || !hostLocation) return;

    if (gpsStatus !== 'locked') {
      Alert.alert('GPS benötigt', 'Bitte warte bis das GPS-Signal verfügbar ist.');
      return;
    }

    setIsStarting(true);
    console.log('[CHECKIN] Starting secure check-in session');

    await startCheckIn(checkInType, sessionId ?? '', parsedParticipantIds, hostLocation);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsStarting(false);
  }, [checkInType, sessionId, parsedParticipantIds, startCheckIn, isStarting, hostLocation, gpsStatus]);

  const handleQRScanned = useCallback(async (tokenData: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    setShowScanner(false);
    console.log('[CHECKIN] QR scanned, getting participant GPS...');

    try {
      let participantLocation = { latitude: 0, longitude: 0, accuracy: 0, mocked: false };

      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setScanResult({ success: false, message: 'GPS-Berechtigung benötigt für Check-In' });
          setIsProcessingScan(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        participantLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? 0,
          mocked: (loc as any).mocked ?? false,
        };
      } else {
        participantLocation = { latitude: 52.52, longitude: 13.41, accuracy: 10, mocked: false };
      }

      console.log('[CHECKIN] Participant location:', participantLocation);
      const result = await performCheckIn(tokenData, participantLocation);
      setScanResult(result);

      if (Platform.OS !== 'web') {
        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch (err) {
      console.log('[CHECKIN] Scan processing error:', err);
      setScanResult({ success: false, message: 'Fehler beim Check-In. Bitte erneut versuchen.' });
    }

    setIsProcessingScan(false);
  }, [isProcessingScan, performCheckIn]);

  const handleEndCheckIn = useCallback(async () => {
    console.log('[CHECKIN] Ending check-in session');
    await endCheckIn();
    router.back();
  }, [endCheckIn, router]);

  const handleRefresh = useCallback(async () => {
    console.log('[CHECKIN] Refreshing check-in data');
    await refreshCheckIn();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [refreshCheckIn]);

  const checkedCount = activeCheckIn?.checkedInUsers.length ?? 0;
  const totalParticipants = activeCheckIn?.participantIds.length ?? parsedParticipantIds.length;
  const allCheckedIn = checkedCount > 0 && checkedCount >= totalParticipants;

  const slots = useMemo(() => {
    const maxSlots = Math.max(totalParticipants, 2);
    const result: Array<{ entry: CheckInEntry | null; isEmpty: boolean }> = [];
    for (let i = 0; i < maxSlots; i++) {
      const entry = activeCheckIn?.checkedInUsers[i] ?? null;
      result.push({ entry, isEmpty: !entry });
    }
    return result;
  }, [activeCheckIn, totalParticipants]);

  const isHost = activeCheckIn?.hostUserId === userId;

  if (showScanner) {
    return (
      <View style={styles.container}>
        <QRScanner
          onScan={handleQRScanned}
          onClose={() => setShowScanner(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#1a1917', '#171615', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.heroPattern}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[styles.heroRing, {
                  width: 80 + i * 60, height: 80 + i * 60,
                  borderRadius: 40 + i * 30, opacity: 0.015 + i * 0.003,
                }]}
              />
            ))}
          </View>

          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft size={22} color="#BFA35D" />
            </Pressable>
            {activeCheckIn && (
              <Pressable style={styles.refreshBtn} onPress={handleRefresh} hitSlop={12}>
                <RefreshCw size={18} color="#BFA35D" />
              </Pressable>
            )}
          </View>

          <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.checkInIconBox}>
              <Shield size={28} color="#BFA35D" />
            </View>
            <Text style={styles.heroTitle}>Sicherer Check-In</Text>
            <Text style={styles.heroSubtitle}>{sessionTitle}</Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.gpsSection}>
          <GPSStatus status={gpsStatus} accuracy={gpsAccuracy} />
        </View>

        {!activeCheckIn ? (
          <Animated.View style={[styles.modeSection, { opacity: fadeAnim }]}>
            <View style={styles.modeToggle}>
              <Pressable
                style={[styles.modeBtn, mode === 'host' && styles.modeBtnActive]}
                onPress={() => setMode('host')}
              >
                <Shield size={16} color={mode === 'host' ? '#141416' : '#BFA35D'} />
                <Text style={[styles.modeBtnText, mode === 'host' && styles.modeBtnTextActive]}>
                  Check-In starten
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === 'scan' && styles.modeBtnActive]}
                onPress={() => setMode('scan')}
              >
                <ScanLine size={16} color={mode === 'scan' ? '#141416' : '#BFA35D'} />
                <Text style={[styles.modeBtnText, mode === 'scan' && styles.modeBtnTextActive]}>
                  QR scannen
                </Text>
              </Pressable>
            </View>

            {mode === 'host' ? (
              <View style={styles.hostSection}>
                <View style={styles.infoCard}>
                  <Users size={18} color="#BFA35D" />
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoCardTitle}>
                      {parsedParticipantIds.length} Teilnehmer erwartet
                    </Text>
                    <Text style={styles.infoCardDesc}>
                      Dein GPS-Standort wird als Referenzpunkt gespeichert. Alle Teilnehmer müssen innerhalb von {CHECKIN_PROXIMITY_RADIUS_M}m sein.
                    </Text>
                  </View>
                </View>

                <View style={styles.securityCard}>
                  <Text style={styles.securityCardTitle}>Sicherheitsmaßnahmen</Text>
                  <View style={styles.securityList}>
                    <View style={styles.securityItem}>
                      <Radar size={14} color="#BFA35D" />
                      <Text style={styles.securityItemText}>QR-Code rotiert alle {CHECKIN_TOKEN_ROTATION_S}s</Text>
                    </View>
                    <View style={styles.securityItem}>
                      <MapPin size={14} color="#BFA35D" />
                      <Text style={styles.securityItemText}>GPS-Proximity ({CHECKIN_PROXIMITY_RADIUS_M}m Radius)</Text>
                    </View>
                    <View style={styles.securityItem}>
                      <ShieldCheck size={14} color="#BFA35D" />
                      <Text style={styles.securityItemText}>Anti-GPS-Spoofing Erkennung</Text>
                    </View>
                    <View style={styles.securityItem}>
                      <Lock size={14} color="#BFA35D" />
                      <Text style={styles.securityItemText}>Verschlüsselte Token-Validierung</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={[styles.startBtn, (isStarting || gpsStatus !== 'locked') && styles.startBtnDisabled]}
                  onPress={handleStartCheckIn}
                  disabled={isStarting || gpsStatus !== 'locked'}
                >
                  <LinearGradient
                    colors={['#BFA35D', '#A08A45']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.startBtnGradient}
                  >
                    <Shield size={20} color="#141416" />
                    <Text style={styles.startBtnText}>
                      {isStarting ? 'Wird gestartet...' : gpsStatus !== 'locked' ? 'GPS wird gesucht...' : 'Sicheren Check-In starten'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <View style={styles.joinSection}>
                <View style={styles.infoCard}>
                  <ScanLine size={18} color="#BFA35D" />
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoCardTitle}>QR-Code scannen</Text>
                    <Text style={styles.infoCardDesc}>
                      Scanne den QR-Code auf dem Handy des Gastgebers. Du musst innerhalb von {CHECKIN_PROXIMITY_RADIUS_M}m sein.
                    </Text>
                  </View>
                </View>

                {scanResult && (
                  <View style={[styles.resultCard, scanResult.success ? styles.resultCardSuccess : styles.resultCardError]}>
                    {scanResult.success ? (
                      <ShieldCheck size={20} color="#4CAF50" />
                    ) : (
                      <ShieldAlert size={20} color="#C06060" />
                    )}
                    <Text style={[styles.resultText, scanResult.success ? styles.resultTextSuccess : styles.resultTextError]}>
                      {scanResult.message}
                    </Text>
                  </View>
                )}

                {isProcessingScan ? (
                  <View style={styles.processingCard}>
                    <ActivityIndicator color="#BFA35D" size="small" />
                    <Text style={styles.processingText}>GPS wird überprüft...</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.scanBtn, gpsStatus !== 'locked' && styles.scanBtnDisabled]}
                    onPress={() => {
                      setScanResult(null);
                      setShowScanner(true);
                    }}
                    disabled={gpsStatus !== 'locked'}
                  >
                    <LinearGradient
                      colors={['#BFA35D', '#A08A45']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.scanBtnGradient}
                    >
                      <ScanLine size={22} color="#141416" />
                      <Text style={styles.scanBtnText}>
                        {gpsStatus !== 'locked' ? 'GPS wird gesucht...' : 'QR-Code scannen'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.activeCheckInSection}>
            <RotatingQRCode
              checkinId={activeCheckIn.id}
              generateToken={generateCurrentToken}
            />

            <ProgressRing checked={checkedCount} total={totalParticipants} />

            <View style={styles.slotsSection}>
              <View style={styles.slotsSectionHeader}>
                <Text style={styles.slotsSectionTitle}>TEILNEHMER</Text>
                <View style={styles.slotsBadge}>
                  <Text style={styles.slotsBadgeText}>{checkedCount}/{totalParticipants}</Text>
                </View>
              </View>
              <View style={styles.slotsGrid}>
                {slots.map((slot, i) => (
                  <CheckInSlot
                    key={i}
                    entry={slot.entry}
                    index={i}
                    isEmpty={slot.isEmpty}
                    totalSlots={slots.length}
                  />
                ))}
              </View>
            </View>

            {allCheckedIn && <AllCheckedInCelebration />}

            <View style={styles.checkinTimeline}>
              <Text style={styles.timelineTitle}>TIMELINE</Text>
              {activeCheckIn.checkedInUsers.map((entry) => (
                <View key={entry.userId} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineName}>{entry.userName}</Text>
                    <View style={styles.timelineMeta}>
                      <Text style={styles.timelineTime}>
                        {new Date(entry.checkedInAt).toLocaleTimeString('de-DE', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </Text>
                      {entry.distanceToHost != null && (
                        <View style={styles.timelineDistanceBadge}>
                          <MapPin size={10} color="#BFA35D" />
                          <Text style={styles.timelineDistanceText}>{Math.round(entry.distanceToHost)}m</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.timelineCheck}>
                    <Check size={12} color="#BFA35D" />
                  </View>
                </View>
              ))}
              {activeCheckIn.checkedInUsers.length === 0 && (
                <View style={styles.timelineEmpty}>
                  <Clock size={20} color="rgba(191,163,93,0.2)" />
                  <Text style={styles.timelineEmptyText}>Warte auf erste Check-Ins...</Text>
                </View>
              )}
            </View>

            {isHost && (
              <Pressable style={styles.endBtn} onPress={handleEndCheckIn}>
                <X size={18} color="#C06060" />
                <Text style={styles.endBtnText}>Check-In beenden</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    paddingBottom: 20,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    position: 'relative' as const,
    overflow: 'hidden',
    alignItems: 'center',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing: {
    position: 'absolute' as const,
    borderWidth: 1,
    borderColor: '#BFA35D',
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 16,
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  heroContent: {
    alignItems: 'center',
  },
  checkInIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 4,
  },
  gpsSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  gpsStatusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  gpsStatusText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  gpsStatusError: {
    color: '#C06060',
  },
  modeSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modeToggle: {
    flexDirection: 'row' as const,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  modeBtnActive: {
    backgroundColor: '#BFA35D',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  modeBtnTextActive: {
    color: '#141416',
  },
  hostSection: {
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.45)',
    lineHeight: 19,
  },
  securityCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  securityCardTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
  },
  securityList: {
    gap: 10,
  },
  securityItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
  },
  securityItemText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.6)',
  },
  startBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  joinSection: {
    gap: 16,
  },
  scanBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  scanBtnDisabled: {
    opacity: 0.5,
  },
  scanBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  scanBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#141416',
  },
  resultCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultCardSuccess: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderColor: 'rgba(76,175,80,0.2)',
  },
  resultCardError: {
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderColor: 'rgba(192,96,96,0.2)',
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resultTextSuccess: {
    color: '#4CAF50',
  },
  resultTextError: {
    color: '#C06060',
  },
  processingCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  processingText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  activeCheckInSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrSecurityBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
    marginBottom: 16,
  },
  qrSecurityText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.6)',
    letterSpacing: 1.5,
  },
  qrContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  qrGradientBorder: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 240,
    height: 240,
    borderRadius: 8,
  },
  qrTimerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  qrTimerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  qrTimerTextUrgent: {
    color: '#C06060',
  },
  qrSecurityInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  securityFeature: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
  },
  securityFeatureText: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.4)',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(191,163,93,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  progressRingInner: {
    flexDirection: 'row' as const,
    alignItems: 'baseline',
  },
  progressNumber: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  progressSlash: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.3)',
    marginHorizontal: 2,
  },
  progressTotal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#BFA35D',
    borderRadius: 2,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderRadius: 2,
    width: '100%',
  },
  slotsSection: {
    marginBottom: 24,
  },
  slotsSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  slotsSectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
  },
  slotsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  slotsBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  slotsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: SLOT_GAP,
  },
  slotContainer: {
    width: SLOT_SIZE + 10,
    alignItems: 'center',
    gap: 4,
  },
  slotEmpty: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: Math.round(SLOT_SIZE * 0.22),
    backgroundColor: '#0e0e10',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.06)',
    overflow: 'hidden',
  },
  slotInnerShadow: {
    flex: 1,
    borderRadius: Math.round(SLOT_SIZE * 0.22),
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 3,
  },
  slotInnerDeep: {
    flex: 1,
    borderRadius: Math.round(SLOT_SIZE * 0.22),
    backgroundColor: '#0a0a0c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.5)',
    borderLeftColor: 'rgba(0,0,0,0.4)',
    borderRightColor: 'rgba(191,163,93,0.04)',
    borderBottomColor: 'rgba(191,163,93,0.06)',
  },
  slotDottedCircle: {
    width: SLOT_SIZE - 22,
    height: SLOT_SIZE - 22,
    borderRadius: Math.round((SLOT_SIZE - 22) * 0.22),
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.08)',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotQuestionMark: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.12)',
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.2)',
    textAlign: 'center' as const,
  },
  slotFilled: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: Math.round(SLOT_SIZE * 0.22),
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#BFA35D',
  },
  slotAvatar: {
    width: '100%',
    height: '100%',
  },
  slotAvatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotAvatarText: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: '#141416',
  },
  slotCheckMark: {
    position: 'absolute' as const,
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#141416',
  },
  slotGlow: {
    position: 'absolute' as const,
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: (SLOT_SIZE + 12) / 2,
    backgroundColor: 'rgba(191,163,93,0.25)',
  },
  slotLabelFilled: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#BFA35D',
    textAlign: 'center' as const,
  },
  slotDistance: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  celebrationContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  celebrationGradient: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 3,
  },
  celebrationSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  checkinTimeline: {
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1e1e20',
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.04)',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BFA35D',
  },
  timelineContent: {
    flex: 1,
  },
  timelineName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  timelineMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.4)',
  },
  timelineDistanceBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  timelineDistanceText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  timelineCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEmpty: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.04)',
  },
  timelineEmptyText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.3)',
  },
  endBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  endBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#C06060',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 260,
    height: 260,
    position: 'relative' as const,
  },
  scannerCorner: {
    position: 'absolute' as const,
    width: 30,
    height: 30,
    borderColor: '#BFA35D',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute' as const,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#BFA35D',
    borderRadius: 1,
    opacity: 0.8,
  },
  scannerHint: {
    marginTop: 30,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scannerTopClose: {
    position: 'absolute' as const,
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    backgroundColor: '#141416',
  },
  scannerFallbackTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
  },
  scannerFallbackDesc: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  scannerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141416',
  },
  scannerPermBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
  },
  scannerPermBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#141416',
  },
  scannerCloseBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scannerCloseBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
});
