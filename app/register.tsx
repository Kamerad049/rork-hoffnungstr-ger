import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Lock, ArrowLeft, Info, X, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { GENDER_OPTIONS, RELIGION_OPTIONS, type Gender, type Religion } from '@/constants/types';
import LatinCrossIcon from '@/components/LatinCrossIcon';
import GenderIcon from '@/components/GenderIcon';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/providers/AlertProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RegisterScreen() {
  const { register } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [gender, setGender] = useState<Gender>('');
  const [religion, setReligion] = useState<Religion>('');
  const [showGenderPicker, setShowGenderPicker] = useState<boolean>(false);
  const [showReligionPicker, setShowReligionPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showEmailHint, setShowEmailHint] = useState<boolean>(false);
  const [hasShownEmailHint, setHasShownEmailHint] = useState<boolean>(false);

  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintScale = useRef(new Animated.Value(0.9)).current;

  const handleEmailFocus = useCallback(() => {
    if (!hasShownEmailHint) {
      setShowEmailHint(true);
      setHasShownEmailHint(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(hintScale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasShownEmailHint, hintOpacity, hintScale]);

  const dismissEmailHint = useCallback(() => {
    Animated.parallel([
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(hintScale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowEmailHint(false);
    });
  }, [hintOpacity, hintScale]);

  const handleRegister = useCallback(async () => {
    if (!name.trim()) {
      showAlert('Fehler', 'Bitte gib deinen Namen ein.');
      return;
    }
    if (!email.trim()) {
      showAlert('Fehler', 'Bitte gib deine E-Mail Adresse ein.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Fehler', 'Bitte gib eine gültige E-Mail Adresse ein.');
      return;
    }
    if (!password.trim()) {
      showAlert('Fehler', 'Bitte gib ein Passwort ein.');
      return;
    }
    if (password.length < 6) {
      showAlert('Fehler', 'Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, { gender, religion });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: any) {
      console.log('Register error:', err);
      const message = err?.message || 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('Fehler', message);
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, register, router]);

  return (
    <View style={styles.container}>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} color="rgba(191,163,93,0.6)" />
          </Pressable>

          <View style={styles.logoArea}>
            <View style={styles.miniLogo}>
              <Text style={styles.miniLogoText}>H</Text>
            </View>
            <Text style={styles.title}>Konto erstellen</Text>
            <Text style={styles.subtitle}>Werde Teil der Kaderschmiede</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <User size={18} color="rgba(191,163,93,0.5)" />
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="rgba(191,163,93,0.35)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                testID="register-name"
              />
            </View>

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
                onFocus={handleEmailFocus}
                testID="register-email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color="rgba(191,163,93,0.5)" />
              <TextInput
                style={styles.input}
                placeholder="Passwort (mind. 6 Zeichen)"
                placeholderTextColor="rgba(191,163,93,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="register-password"
              />
            </View>

            <View style={styles.optionalDivider}>
              <View style={styles.optionalDividerLine} />
              <Text style={styles.optionalDividerText}>Freiwillige Angaben</Text>
              <View style={styles.optionalDividerLine} />
            </View>

            <Pressable
              style={styles.pickerWrapper}
              onPress={() => { setShowGenderPicker(!showGenderPicker); setShowReligionPicker(false); }}
              testID="register-gender"
            >
              {gender ? (
                <GenderIcon gender={gender} size={16} color="rgba(191,163,93,0.5)" />
              ) : (
                <User size={18} color="rgba(191,163,93,0.5)" />
              )}
              <Text style={[styles.pickerText, gender ? styles.pickerTextSelected : null]}>
                {gender ? GENDER_OPTIONS.find(g => g.value === gender)?.label : 'Geschlecht (optional)'}
              </Text>
              <ChevronDown size={16} color="rgba(191,163,93,0.35)" />
            </Pressable>
            {showGenderPicker && (
              <View style={styles.optionsList}>
                {GENDER_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.optionItem, gender === opt.value && styles.optionItemActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGender(opt.value);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={[styles.optionText, gender === opt.value && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable
              style={styles.pickerWrapper}
              onPress={() => { setShowReligionPicker(!showReligionPicker); setShowGenderPicker(false); }}
              testID="register-religion"
            >
              <LatinCrossIcon size={16} color="rgba(191,163,93,0.5)" />
              <Text style={[styles.pickerText, religion ? styles.pickerTextSelected : null]}>
                {religion ? RELIGION_OPTIONS.find(r => r.value === religion)?.label : 'Religion (optional)'}
              </Text>
              <ChevronDown size={16} color="rgba(191,163,93,0.35)" />
            </Pressable>
            {showReligionPicker && (
              <View style={styles.optionsList}>
                {RELIGION_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.optionItem, religion === opt.value && styles.optionItemActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setReligion(opt.value);
                      setShowReligionPicker(false);
                    }}
                  >
                    <Text style={[styles.optionText, religion === opt.value && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                isLoading && styles.submitBtnDisabled,
                pressed && styles.submitBtnPressed,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              testID="register-submit"
            >
              <Text style={styles.submitText}>
                {isLoading ? 'Wird registriert...' : 'Registrieren'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.switchLink}
              onPress={() => {
                router.back();
              }}
            >
              <Text style={styles.switchText}>
                Bereits ein Konto?{' '}
                <Text style={styles.switchBold}>Anmelden</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showEmailHint}
        transparent
        animationType="none"
        onRequestClose={dismissEmailHint}
      >
        <Pressable style={styles.modalOverlay} onPress={dismissEmailHint}>
          <Animated.View
            style={[
              styles.hintModal,
              {
                opacity: hintOpacity,
                transform: [{ scale: hintScale }],
              },
            ]}
          >
            <Pressable onPress={() => {}} style={styles.hintContent}>
              <View style={styles.hintHeader}>
                <View style={styles.hintIconCircle}>
                  <Info size={22} color="#BFA35D" />
                </View>
                <Pressable onPress={dismissEmailHint} hitSlop={10} style={styles.hintCloseBtn}>
                  <X size={18} color="rgba(191,163,93,0.5)" />
                </Pressable>
              </View>

              <Text style={styles.hintTitle}>Wichtiger Hinweis</Text>
              <Text style={styles.hintText}>
                Du musst eine gültige E-Mail Adresse eingeben, da Du einen Bestätigungslink per E-Mail erhältst.
              </Text>

              <View style={styles.hintDivider} />

              <Pressable
                style={({ pressed }) => [
                  styles.hintBtn,
                  pressed && styles.hintBtnPressed,
                ]}
                onPress={dismissEmailHint}
              >
                <Text style={styles.hintBtnText}>Verstanden</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 0,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  miniLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#BFA35D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#D4B96A',
  },
  miniLogoText: {
    color: '#1c1c1e',
    fontSize: 24,
    fontWeight: '900' as const,
  },
  title: {
    color: '#BFA35D',
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
    letterSpacing: 1,
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
  optionalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: -4,
  },
  optionalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  optionalDividerText: {
    color: 'rgba(191,163,93,0.35)',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  pickerWrapper: {
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
  pickerIcon: {
    fontSize: 18,
    color: 'rgba(191,163,93,0.5)',
    width: 18,
    textAlign: 'center' as const,
  },
  pickerText: {
    flex: 1,
    color: 'rgba(191,163,93,0.35)',
    fontSize: 16,
  },
  pickerTextSelected: {
    color: '#E8DCC8',
  },
  optionsList: {
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    overflow: 'hidden',
    marginTop: -8,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
  },
  optionItemActive: {
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  optionText: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 15,
  },
  optionTextActive: {
    color: '#BFA35D',
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  hintModal: {
    width: '100%',
    maxWidth: 340,
  },
  hintContent: {
    backgroundColor: '#2a2a2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hintIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintTitle: {
    color: '#BFA35D',
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  hintText: {
    color: '#E8DCC8',
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
  hintDivider: {
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.12)',
    marginVertical: 18,
  },
  hintBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  hintBtnText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
