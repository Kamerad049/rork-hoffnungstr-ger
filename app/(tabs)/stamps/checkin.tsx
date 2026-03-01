import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, Animated, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Camera, MapPin, CheckCircle, Loader, ChevronLeft, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useStampPass } from '@/providers/StampPassProvider';
import { useAdmin } from '@/providers/AdminProvider';
import WaxSealCeremony from '@/components/WaxSealCeremony';
import WaxSealStamp from '@/components/WaxSealStamp';

const MAX_DISTANCE_KM = 0.5;

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type CheckinStep = 'info' | 'locating' | 'photo' | 'success' | 'error';

export default function CheckinScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { colors } = useTheme();
  const { places } = useAdmin();
  const router = useRouter();
  const { collectStamp, hasStamp } = useStampPass();

  const place = places.find((p: any) => p.id === placeId);
  const [step, setStep] = useState<CheckinStep>('info');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showCeremony, setShowCeremony] = useState<boolean>(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const alreadyStamped = place ? hasStamp(place.id) : false;

  useEffect(() => {
    if (step === 'success') {
      setShowCeremony(true);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'locating') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [step, pulseAnim]);

  const verifyLocation = useCallback(async () => {
    if (!place) return;
    setStep('locating');

    try {
      if (Platform.OS === 'web') {
        setStep('photo');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Standortzugriff wurde verweigert. Bitte aktiviere ihn in den Einstellungen.');
        setStep('error');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const distance = getDistanceKm(
        location.coords.latitude,
        location.coords.longitude,
        place.latitude,
        place.longitude,
      );

      console.log(`Distance to ${place.title}: ${distance.toFixed(2)} km`);

      if (distance > MAX_DISTANCE_KM) {
        setErrorMsg(
          `Du bist ${distance.toFixed(1)} km entfernt. Du musst innerhalb von ${MAX_DISTANCE_KM * 1000}m sein.`,
        );
        setStep('error');
        return;
      }

      setStep('photo');
    } catch (err) {
      console.log('Location error:', err);
      setErrorMsg('Standort konnte nicht ermittelt werden. Bitte versuche es erneut.');
      setStep('error');
    }
  }, [place]);

  const takePhoto = useCallback(async () => {
    if (!place) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        await collectStamp(place.id, result.assets[0].uri);
        setStep('success');
      }
    } catch {
      await collectStamp(place.id, null);
      setStep('success');
    }
  }, [place, collectStamp]);

  const skipPhoto = useCallback(async () => {
    if (!place) return;
    await collectStamp(place.id, null);
    setStep('success');
  }, [place, collectStamp]);

  const handleCeremonyClose = useCallback(() => {
    setShowCeremony(false);
    router.back();
  }, [router]);

  if (!place) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#1e1d1a', '#1a1918', '#141416']} style={styles.errorContainer}>
          <X size={48} color="rgba(191,163,93,0.4)" />
          <Text style={styles.notFoundText}>Ort nicht gefunden</Text>
          <Pressable style={styles.backBtnAlt} onPress={() => router.back()}>
            <Text style={styles.backBtnAltText}>Zurück</Text>
          </Pressable>
        </LinearGradient>
      </View>
    );
  }

  if (alreadyStamped) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#1e1d1a', '#1a1918', '#141416']} style={styles.flex}>
          <Image source={{ uri: place.images[0] }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(20,20,22,0.85)', '#141416']}
            style={styles.heroOverlay}
          />
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#BFA35D" />
          </Pressable>
          <View style={styles.alreadyContent}>
            <WaxSealStamp size={100} color="red" showShine />
            <Text style={styles.alreadyTitle}>Bereits gesammelt!</Text>
            <Text style={styles.alreadySub}>
              Du hast den Stempel für {place.title} bereits.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
              <Text style={styles.primaryBtnText}>Zurück</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.flex} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrapper}>
          <Image source={{ uri: place.images[0] }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(20,20,22,0.7)', '#141416']}
            style={styles.heroOverlay}
          />
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#BFA35D" />
          </Pressable>
          <View style={styles.heroTextOverlay}>
            <Text style={styles.heroPlaceTitle}>{place.title}</Text>
            <View style={styles.locationRow}>
              <MapPin size={14} color="#BFA35D" />
              <Text style={styles.locationText}>{place.city}, {place.bundesland}</Text>
            </View>
          </View>
        </View>

        <LinearGradient colors={['#141416', '#1a1918', '#141416']} style={styles.body}>
          <View style={styles.heroPattern}>
            {[...Array(4)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heroLine,
                  {
                    top: 20 + i * 40,
                    opacity: 0.025 + i * 0.005,
                    transform: [{ rotate: '-12deg' }],
                  },
                ]}
              />
            ))}
          </View>

          {step === 'info' && (
            <View style={styles.stepContent}>
              <View style={styles.stepCard}>
                <View style={styles.stepIconWrap}>
                  <MapPin size={28} color="#BFA35D" />
                </View>
                <Text style={styles.stepTitle}>Standort prüfen</Text>
                <Text style={styles.stepDescription}>
                  Besuche diesen Ort und checke ein, um deinen Stempel zu sammeln. Dein Standort wird überprüft.
                </Text>
              </View>
              <Pressable
                style={styles.primaryBtn}
                onPress={verifyLocation}
                testID="checkin-start-btn"
              >
                <MapPin size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Standort prüfen</Text>
              </Pressable>
            </View>
          )}

          {step === 'locating' && (
            <View style={styles.stepContent}>
              <View style={styles.stepCard}>
                <Animated.View style={[styles.pulseWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.stepIconWrap}>
                    <Loader size={28} color="#BFA35D" />
                  </View>
                </Animated.View>
                <Text style={styles.stepTitle}>Standort wird überprüft...</Text>
                <Text style={styles.stepDescription}>
                  Bitte warte einen Moment, wir überprüfen deinen Standort.
                </Text>
              </View>
            </View>
          )}

          {step === 'photo' && (
            <View style={styles.stepContent}>
              <View style={styles.stepCard}>
                <View style={styles.successBadge}>
                  <CheckCircle size={22} color="#BFA35D" />
                  <Text style={styles.successBadgeText}>Standort bestätigt</Text>
                </View>
                <View style={styles.stepIconWrap}>
                  <Camera size={28} color="#BFA35D" />
                </View>
                <Text style={styles.stepTitle}>Erinnerungsfoto</Text>
                <Text style={styles.stepDescription}>
                  Mache ein Foto als Erinnerung oder überspringe diesen Schritt.
                </Text>
              </View>
              <Pressable style={styles.primaryBtn} onPress={takePhoto}>
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Foto aufnehmen</Text>
              </Pressable>
              <Pressable style={styles.skipBtn} onPress={skipPhoto}>
                <Text style={styles.skipText}>Überspringen</Text>
              </Pressable>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.stepContent}>
              <View style={styles.successCard}>
                <View style={styles.successGlow} />
                <WaxSealStamp size={100} color="red" showShine />
                <Text style={styles.successTitle}>Gesiegelt!</Text>
                <Text style={styles.successSub}>
                  {place.title} wurde deinem Stempelpass hinzugefügt.
                </Text>
              </View>
              <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
                <Text style={styles.primaryBtnText}>Fertig</Text>
              </Pressable>
            </View>
          )}

          {step === 'error' && (
            <View style={styles.stepContent}>
              <View style={[styles.stepCard, styles.errorCard]}>
                <View style={[styles.stepIconWrap, styles.errorIconWrap]}>
                  <X size={28} color="#C06060" />
                </View>
                <Text style={styles.errorTitle}>Einchecken fehlgeschlagen</Text>
                <Text style={styles.stepDescription}>{errorMsg}</Text>
              </View>
              <Pressable style={styles.primaryBtn} onPress={() => setStep('info')}>
                <Text style={styles.primaryBtnText}>Erneut versuchen</Text>
              </Pressable>
            </View>
          )}
        </LinearGradient>
      </ScrollView>

      <WaxSealCeremony
        visible={showCeremony}
        placeName={place.title}
        onClose={handleCeremonyClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  flex: {
    flex: 1,
  },
  heroWrapper: {
    position: 'relative',
    height: 280,
  },
  heroImage: {
    width: '100%',
    height: 280,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  heroTextOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroPlaceTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.7)',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 400,
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
  stepContent: {
    alignItems: 'center',
  },
  stepCard: {
    width: '100%',
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  stepIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  pulseWrap: {
    marginBottom: 0,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(191,163,93,0.55)',
    textAlign: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    backgroundColor: '#BFA35D',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(191,163,93,0.4)',
  },
  successCard: {
    width: '100%',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  successGlow: {
    position: 'absolute',
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginTop: 16,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: 'rgba(191,163,93,0.55)',
  },
  errorCard: {
    borderColor: 'rgba(192,96,96,0.15)',
  },
  errorIconWrap: {
    backgroundColor: 'rgba(192,96,96,0.1)',
    borderColor: 'rgba(192,96,96,0.15)',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#C06060',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginTop: 16,
    marginBottom: 24,
  },
  backBtnAlt: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  backBtnAltText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  alreadyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -80,
  },
  checkBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  alreadyTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 8,
  },
  alreadySub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: 'rgba(191,163,93,0.55)',
    marginBottom: 24,
  },
});
