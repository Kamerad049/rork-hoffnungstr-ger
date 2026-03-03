import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cleanPanHandlers } from '@/lib/utils';
import { Mail, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/providers/AlertProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - 80;
const SLIDER_KNOB_SIZE = 56;
const SLIDER_MAX = SLIDER_TRACK_WIDTH - SLIDER_KNOB_SIZE - 8;
const UNLOCK_THRESHOLD = SLIDER_MAX * 0.75;

const CARD_MAX_TRANSLATE_Y = -SCREEN_HEIGHT * 0.6;

export default function LoginScreen() {
  const { login, stayLoggedIn, updateStayLoggedIn, resetPassword } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const { direct } = useLocalSearchParams<{ direct?: string }>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const isDirect = direct === '1' || hasSeenWelcome;
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const sliderX = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const cardTilt = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;
  const sliderOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const cardFloatAnim = useRef(new Animated.Value(0)).current;
  const cardFloatLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const cardFlyAway = useRef(new Animated.Value(0)).current;
  const sliderGlowAnim = useRef(new Animated.Value(0)).current;
  const sliderGlowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (direct === '1') {
      setHasSeenWelcome(true);
      setIsRevealed(true);
      cardFlyAway.setValue(1);
      formOpacity.setValue(1);
      setReady(true);
    } else {
      cardTranslateY.setValue(0);
      formOpacity.setValue(0);
      sliderOpacity.setValue(1);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready && !isRevealed) {
      cardFloatLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(cardFloatAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: false,
          }),
          Animated.timing(cardFloatAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: false,
          }),
        ])
      );
      cardFloatLoopRef.current.start();

      sliderGlowLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(sliderGlowAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(sliderGlowAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      sliderGlowLoopRef.current.start();
    }
    return () => {
      if (cardFloatLoopRef.current) {
        cardFloatLoopRef.current.stop();
      }
      if (sliderGlowLoopRef.current) {
        sliderGlowLoopRef.current.stop();
      }
    };
  }, [ready, isRevealed]);

  useEffect(() => {
    if (isRevealed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isRevealed, glowAnim]);

  const revealLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (cardFloatLoopRef.current) {
      cardFloatLoopRef.current.stop();
      cardFloatLoopRef.current = null;
    }
    if (sliderGlowLoopRef.current) {
      sliderGlowLoopRef.current.stop();
      sliderGlowLoopRef.current = null;
    }

    Animated.parallel([
      Animated.timing(cardFlyAway, {
        toValue: 1,
        duration: 800,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(sliderOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsRevealed(true);
    });
  }, [cardFlyAway, formOpacity, sliderOpacity]);

  const isRevealedRef = useRef(false);
  isRevealedRef.current = isRevealed;

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRevealedRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !isRevealedRef.current && Math.abs(gestureState.dx) > 5,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.18,
              duration: 400,
              useNativeDriver: false,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: false,
            }),
          ])
        );
        pulseLoopRef.current.start();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, SLIDER_MAX));
        sliderX.setValue(newX);

        const progress = newX / SLIDER_MAX;
        const yOffset = progress * CARD_MAX_TRANSLATE_Y;
        cardTranslateY.setValue(yOffset);

        const tiltValue = Math.sin(progress * Math.PI) * 5;
        cardTilt.setValue(tiltValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (pulseLoopRef.current) {
          pulseLoopRef.current.stop();
          pulseLoopRef.current = null;
        }
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }).start();

        const currentX = Math.max(0, Math.min(gestureState.dx, SLIDER_MAX));
        if (currentX >= UNLOCK_THRESHOLD) {
          Animated.timing(sliderX, {
            toValue: SLIDER_MAX,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            revealLogin();
          });
        } else {
          Animated.parallel([
            Animated.spring(sliderX, {
              toValue: 0,
              friction: 6,
              tension: 80,
              useNativeDriver: false,
            }),
            Animated.spring(cardTranslateY, {
              toValue: 0,
              friction: 6,
              tension: 80,
              useNativeDriver: false,
            }),
            Animated.spring(cardTilt, {
              toValue: 0,
              friction: 6,
              tension: 80,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    }), [revealLogin, sliderX, pulseAnim, cardTranslateY, cardTilt]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Fehler', 'Bitte fülle alle Felder aus.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: any) {
      console.log('Login error:', err);
      const message = err?.message || 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('Fehler', message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, router]);

  const sliderFillTranslateX = sliderX.interpolate({
    inputRange: [0, SLIDER_MAX],
    outputRange: [-SLIDER_TRACK_WIDTH, 0],
    extrapolate: 'clamp',
  });

  const sliderBorderColor = sliderX.interpolate({
    inputRange: [0, SLIDER_MAX * 0.3, SLIDER_MAX * 0.6, SLIDER_MAX],
    outputRange: ['rgba(191,163,93,0.3)', 'rgba(40,40,40,0.7)', 'rgba(180,30,30,0.6)', 'rgba(220,180,50,0.6)'],
    extrapolate: 'clamp',
  });

  const arrowOpacity = sliderX.interpolate({
    inputRange: [0, SLIDER_MAX * 0.3],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const floatOffset = cardFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const cardScale = sliderX.interpolate({
    inputRange: [0, SLIDER_MAX],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  const cardFlyAwayTranslateY = cardFlyAway.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_HEIGHT * 1.3],
  });

  const cardFlyAwayOpacity = cardFlyAway.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.5, 0],
  });

  const sliderFillGlowOpacity = sliderGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });

  const sliderProgress = sliderX.interpolate({
    inputRange: [0, SLIDER_MAX],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fillBrightness = sliderX.interpolate({
    inputRange: [0, SLIDER_MAX * 0.5, SLIDER_MAX],
    outputRange: [0.3, 0.5, 0.7],
    extrapolate: 'clamp',
  });

  if (!ready) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={styles.backgroundGradient}
      >
        <View style={styles.heroPattern}>
          {[...Array(12)].map((_, i) => (
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
      </LinearGradient>

      {!isRevealed && (
        <Animated.View
          style={[
            styles.floatingCardContainer,
            {
              opacity: cardFlyAwayOpacity,
              transform: [
                { translateY: Animated.add(Animated.add(cardTranslateY, floatOffset), cardFlyAwayTranslateY) },
                { scale: cardScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Animated.Image
            source={require('@/assets/images/floating-card.png')}
            style={[
              styles.floatingCardImage,
              {
                transform: [
                  { rotate: cardTilt.interpolate({
                    inputRange: [-10, 0, 10],
                    outputRange: ['-3deg', '0deg', '3deg'],
                  }) },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {!isRevealed && (
        <Animated.View
          style={[
            styles.sliderContainer,
            {
              bottom: insets.bottom + 40,
              opacity: sliderOpacity,
            },
          ]}
        >
          <Animated.View style={[styles.sliderTrack, { borderColor: sliderBorderColor }]}>
            <Animated.View
              style={[
                styles.sliderFill,
                {
                  transform: [{ translateX: sliderFillTranslateX }],
                },
              ]}
            >
                <View style={styles.sliderGradientRow}>
                {Array.from({ length: 40 }).map((_, i) => {
                  const t = i / 39;
                  let r: number, g: number, b: number;
                  if (t < 0.45) {
                    const p = t / 0.45;
                    r = Math.round(20 + p * 180);
                    g = Math.round(20 + p * 10);
                    b = Math.round(20 - p * 10);
                  } else {
                    const p = (t - 0.45) / 0.55;
                    r = Math.round(200 + p * 30);
                    g = Math.round(30 + p * 165);
                    b = Math.round(10 + p * 10);
                  }
                  return (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        backgroundColor: `rgb(${r},${g},${b})`,
                      }}
                    />
                  );
                })}
              </View>
              <Animated.View style={[styles.sliderGlowOverlay, { opacity: sliderFillGlowOpacity }]} />
              <View style={styles.sliderShineHighlight} />
              <Animated.View style={[styles.sliderFillGlow, { opacity: fillBrightness }]} />
            </Animated.View>

            <Animated.View style={[styles.sliderHintArrows, { opacity: arrowOpacity }]}>
              <ChevronRight size={18} color="rgba(191,163,93,0.3)" />
              <ChevronRight size={18} color="rgba(191,163,93,0.5)" />
              <ChevronRight size={18} color="rgba(191,163,93,0.7)" />
            </Animated.View>

            <Animated.View
              style={[
                styles.sliderKnob,
                { transform: [{ translateX: sliderX }, { scale: pulseAnim }] },
              ]}
              {...cleanPanHandlers(panResponder.panHandlers)}
            >
              <Image
                source={require('@/assets/images/slider-button.png')}
                style={styles.knobImage}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>

          <Text style={styles.sliderLabel}>Zum Anmelden schieben</Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.loginLayer, { opacity: formOpacity }]} pointerEvents={isRevealed ? 'auto' : 'none'}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.formContainer, { paddingTop: insets.top + 40 }]}>
            <View style={styles.logoArea}>
              <Animated.View
                style={[
                  styles.logoGlowOuter,
                  {
                    shadowOpacity: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.8],
                    }),
                    shadowRadius: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 36],
                    }),
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.logoGlowInner,
                    {
                      opacity: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.15, 0.4],
                      }),
                      transform: [{
                        scale: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.15],
                        }),
                      }],
                    },
                  ]}
                />
                <Image
                  source={require('@/assets/images/slider-button.png')}
                  style={styles.logoButtonImage}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.brandName}>HELDENTUM</Text>
              <Text style={styles.brandSub}>WERTEGEMEINSCHAFT</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="rgba(191,163,93,0.5)" />
                <TextInput
                  style={styles.input}
                  placeholder="E-Mail"
                  placeholderTextColor="rgba(191,163,93,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-email"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={18} color="rgba(191,163,93,0.5)" />
                <TextInput
                  style={styles.input}
                  placeholder="Passwort"
                  placeholderTextColor="rgba(191,163,93,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="login-password"
                />
                <Pressable
                  onPress={() => setShowPassword(prev => !prev)}
                  hitSlop={8}
                  testID="toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="rgba(191,163,93,0.5)" />
                  ) : (
                    <Eye size={20} color="rgba(191,163,93,0.5)" />
                  )}
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  isLoading && styles.submitBtnDisabled,
                  pressed && styles.submitBtnPressed,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                testID="login-submit"
              >
                <Text style={styles.submitText}>
                  {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
                </Text>
              </Pressable>

              <View style={styles.stayLoggedInRow}>
                <Text style={styles.stayLoggedInText}>Angemeldet bleiben</Text>
                <Switch
                  value={stayLoggedIn}
                  onValueChange={updateStayLoggedIn}
                  trackColor={{ false: 'rgba(191,163,93,0.15)', true: 'rgba(191,163,93,0.4)' }}
                  thumbColor={stayLoggedIn ? '#BFA35D' : '#555'}
                  testID="stay-logged-in-switch"
                />
              </View>

              <Pressable
                style={styles.forgotLink}
                onPress={() => {
                  if (!email.trim()) {
                    showAlert('E-Mail eingeben', 'Bitte gib zuerst deine E-Mail-Adresse im Feld oben ein.');
                    return;
                  }
                  showAlert(
                    'Passwort zurücksetzen',
                    `Wir senden einen Reset-Link an:\n${email.trim()}`,
                    [
                      { text: 'Abbrechen', style: 'cancel' },
                      {
                        text: 'Senden',
                        onPress: async () => {
                          try {
                            await resetPassword(email.trim());
                            showAlert('E-Mail gesendet', 'Prüfe dein Postfach (auch Spam) für den Link zum Zurücksetzen.');
                          } catch (err: any) {
                            showAlert('Fehler', err?.message || 'Konnte keine E-Mail senden.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.forgotText}>Passwort vergessen?</Text>
              </Pressable>

              <Pressable
                style={styles.switchLink}
                onPress={() => {
                  router.push('/register' as any);
                }}
              >
                <Text style={styles.switchText}>
                  Noch kein Konto?{' '}
                  <Text style={styles.switchBold}>Registrieren</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
  floatingCardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingCardImage: {
    width: SCREEN_WIDTH * 1.05,
    height: SCREEN_HEIGHT * 0.78,
  },
  sliderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 14,
    zIndex: 20,
  },
  sliderTrack: {
    width: SLIDER_TRACK_WIDTH,
    height: SLIDER_KNOB_SIZE + 8,
    borderRadius: (SLIDER_KNOB_SIZE + 8) / 2,
    backgroundColor: 'rgba(30,30,32,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.3)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SLIDER_TRACK_WIDTH,
    borderRadius: (SLIDER_KNOB_SIZE + 8) / 2,
    overflow: 'hidden',
  },
  sliderGradientRow: {
    flexDirection: 'row',
    width: SLIDER_TRACK_WIDTH,
    height: '100%',
  },
  sliderGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,200,80,0.12)',
    borderRadius: (SLIDER_KNOB_SIZE + 8) / 2,
  },
  sliderShineHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderTopLeftRadius: (SLIDER_KNOB_SIZE + 8) / 2,
    borderTopRightRadius: (SLIDER_KNOB_SIZE + 8) / 2,
  },
  sliderFillGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,220,100,0.06)',
    borderRadius: (SLIDER_KNOB_SIZE + 8) / 2,
  },
  sliderHintArrows: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sliderKnob: {
    width: SLIDER_KNOB_SIZE,
    height: SLIDER_KNOB_SIZE,
    borderRadius: SLIDER_KNOB_SIZE / 2,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  knobImage: {
    width: SLIDER_KNOB_SIZE,
    height: SLIDER_KNOB_SIZE,
    borderRadius: SLIDER_KNOB_SIZE / 2,
  },
  sliderLabel: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loginLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoGlowOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  logoGlowInner: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#BFA35D',
  },
  logoButtonImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  brandName: {
    color: '#BFA35D',
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 4,
  },
  brandSub: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  input: {
    flex: 1,
    color: '#E8DCC8',
    fontSize: 16,
    height: 54,
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#BFA35D',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    color: '#1c1c1e',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  switchText: {
    color: 'rgba(191,163,93,0.45)',
    fontSize: 14,
  },
  switchBold: {
    color: '#BFA35D',
    fontWeight: '700' as const,
  },
  stayLoggedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  forgotText: {
    color: 'rgba(191,163,93,0.55)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  stayLoggedInText: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
