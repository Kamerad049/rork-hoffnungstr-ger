import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  UtensilsCrossed,
  Send,
  Info,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { BUNDESLAENDER, PLACE_CATEGORIES } from '@/constants/types';
import type { SubmissionCategory, PlaceCategory } from '@/constants/types';
import { useAlert } from '@/providers/AlertProvider';

const CUISINE_HINT =
  'Bitte beachte: Es muss sich um ein Restaurant oder Gasthaus handeln, dessen Schwerpunkt ganz klar auf traditionell deutscher Küche / deutscher Hausmannskost liegt. Es reicht nicht aus, ein Restaurant zu empfehlen, nur weil es als Beiwerk vielleicht ein Schnitzel auf der Karte hat.';

const PRICE_OPTIONS: { label: string; value: 1 | 2 | 3 }[] = [
  { label: '€ — Günstig', value: 1 },
  { label: '€€ — Mittel', value: 2 },
  { label: '€€€ — Gehoben', value: 3 },
];

export default function SubmitSuggestionScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ type?: string }>();

  const category: SubmissionCategory = params.type === 'restaurant' ? 'restaurant' : 'place';
  const isRestaurant = category === 'restaurant';

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [plz, setPlz] = useState<string>('');
  const [bundesland, setBundesland] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [whyRecommend, setWhyRecommend] = useState<string>('');
  const [placeCategory, setPlaceCategory] = useState<PlaceCategory | ''>('');
  const [priceRange, setPriceRange] = useState<1 | 2 | 3>(2);
  const [showBundesland, setShowBundesland] = useState<boolean>(false);
  const [showPlaceCategory, setShowPlaceCategory] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Nicht angemeldet');
      if (!name.trim()) throw new Error('Name ist erforderlich');
      if (!city.trim()) throw new Error('Stadt ist erforderlich');
      if (!bundesland) throw new Error('Bundesland ist erforderlich');
      if (!whyRecommend.trim()) throw new Error('Begründung ist erforderlich');
      if (!isRestaurant && !placeCategory) throw new Error('Kategorie ist erforderlich');

      const { error } = await supabase.from('submissions').insert({
        category,
        submitted_by: user.id,
        submitter_name: user.name,
        status: 'pending',
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        plz: plz.trim(),
        bundesland,
        images: [],
        place_category: isRestaurant ? null : placeCategory,
        cuisine_types: isRestaurant ? ['Deutsche Küche'] : null,
        price_range: isRestaurant ? priceRange : null,
        address: address.trim() || null,
        why_recommend: whyRecommend.trim(),
      });

      if (error) {
        console.log('[SUBMISSION] Insert error:', error.message);
        throw new Error('Einsendung fehlgeschlagen: ' + error.message);
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      Animated.spring(successAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }).start();
    },
    onError: (err: Error) => {
      showAlert('Fehler', err.message);
    },
  });

  const { mutate: submitSuggestion } = submitMutation;

  const handleSubmit = useCallback(() => {
    submitSuggestion();
  }, [submitSuggestion]);

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.successContainer, { paddingTop: insets.top + 60 }]}>
          <Animated.View
            style={[
              styles.successContent,
              {
                transform: [{ scale: successAnim }],
                opacity: successAnim,
              },
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
              <CheckCircle size={48} color="#4CAF50" />
            </View>
            <Text style={[styles.successTitle, { color: colors.primaryText }]}>
              Vielen Dank!
            </Text>
            <Text style={[styles.successMessage, { color: colors.secondaryText }]}>
              Deine Empfehlung wurde erfolgreich eingereicht und wird von unserem Team geprüft.
              Du wirst benachrichtigt, sobald dein Vorschlag freigeschaltet wurde.
            </Text>
            <Pressable
              style={[styles.successBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.back()}
            >
              <Text style={styles.successBtnText}>Zurück</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.headerBg }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <ArrowLeft size={20} color={colors.headerText} />
          </Pressable>
          <View style={styles.headerCenter}>
            {isRestaurant ? (
              <UtensilsCrossed size={18} color={colors.accent} />
            ) : (
              <MapPin size={18} color={colors.accent} />
            )}
            <Text style={[styles.headerTitle, { color: colors.headerText }]}>
              {isRestaurant ? 'Restaurant empfehlen' : 'Ort empfehlen'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {isRestaurant && (
              <View style={[styles.hintCard, { backgroundColor: 'rgba(191,163,93,0.08)', borderColor: 'rgba(191,163,93,0.2)' }]}>
                <AlertTriangle size={18} color="#BFA35D" style={{ marginTop: 2 }} />
                <Text style={[styles.hintText, { color: colors.secondaryText }]}>
                  {CUISINE_HINT}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.primaryText }]}>
                {isRestaurant ? 'Name des Restaurants *' : 'Name des Ortes *'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
                placeholder={isRestaurant ? 'z.B. Gasthaus zur Linde' : 'z.B. Schloss Neuschwanstein'}
                placeholderTextColor={colors.tertiaryText}
                value={name}
                onChangeText={setName}
                testID="suggestion-name"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.primaryText }]}>Beschreibung</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
                placeholder={isRestaurant ? 'Was macht dieses Restaurant besonders?' : 'Warum ist dieser Ort sehenswert?'}
                placeholderTextColor={colors.tertiaryText}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="suggestion-description"
              />
            </View>

            {!isRestaurant && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.primaryText }]}>Kategorie *</Text>
                <Pressable
                  style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowPlaceCategory(!showPlaceCategory)}
                >
                  <Text style={[styles.dropdownText, { color: placeCategory ? colors.primaryText : colors.tertiaryText }]}>
                    {placeCategory || 'Kategorie wählen...'}
                  </Text>
                  <ChevronDown size={18} color={colors.tertiaryText} />
                </Pressable>
                {showPlaceCategory && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {PLACE_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        style={[
                          styles.dropdownItem,
                          placeCategory === cat && { backgroundColor: 'rgba(191,163,93,0.1)' },
                        ]}
                        onPress={() => {
                          setPlaceCategory(cat);
                          setShowPlaceCategory(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.primaryText }]}>{cat}</Text>
                        {placeCategory === cat && <CheckCircle size={16} color={colors.accent} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {isRestaurant && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.primaryText }]}>Preisklasse</Text>
                <View style={styles.priceRow}>
                  {PRICE_OPTIONS.map((p) => (
                    <Pressable
                      key={p.value}
                      style={[
                        styles.priceChip,
                        {
                          backgroundColor: priceRange === p.value ? colors.accent : colors.surface,
                          borderColor: priceRange === p.value ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => setPriceRange(p.value)}
                    >
                      <Text
                        style={[
                          styles.priceChipText,
                          { color: priceRange === p.value ? '#fff' : colors.secondaryText },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.primaryText }]}>Stadt *</Text>
              <View style={styles.cityPlzRow}>
                <TextInput
                  style={[styles.input, styles.cityInput, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
                  placeholder="z.B. München"
                  placeholderTextColor={colors.tertiaryText}
                  value={city}
                  onChangeText={setCity}
                  testID="suggestion-city"
                />
                <TextInput
                  style={[styles.input, styles.plzInput, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
                  placeholder="PLZ"
                  placeholderTextColor={colors.tertiaryText}
                  value={plz}
                  onChangeText={(t) => setPlz(t.replace(/[^0-9]/g, '').slice(0, 5))}
                  maxLength={5}
                  keyboardType="number-pad"
                  testID="suggestion-plz"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.primaryText }]}>Bundesland *</Text>
              <Pressable
                style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowBundesland(!showBundesland)}
              >
                <Text style={[styles.dropdownText, { color: bundesland ? colors.primaryText : colors.tertiaryText }]}>
                  {bundesland || 'Bundesland wählen...'}
                </Text>
                <ChevronDown size={18} color={colors.tertiaryText} />
              </Pressable>
              {showBundesland && (
                <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {BUNDESLAENDER.map((bl) => (
                    <Pressable
                      key={bl}
                      style={[
                        styles.dropdownItem,
                        bundesland === bl && { backgroundColor: 'rgba(191,163,93,0.1)' },
                      ]}
                      onPress={() => {
                        setBundesland(bl);
                        setShowBundesland(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.primaryText }]}>{bl}</Text>
                      {bundesland === bl && <CheckCircle size={16} color={colors.accent} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.primaryText }]}>Adresse (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
                placeholder="Straße, Hausnummer"
                placeholderTextColor={colors.tertiaryText}
                value={address}
                onChangeText={setAddress}
                testID="suggestion-address"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.primaryText }]}>
                Warum empfiehlst du {isRestaurant ? 'dieses Restaurant' : 'diesen Ort'}? *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
                placeholder={
                  isRestaurant
                    ? 'z.B. Authentische Hausmannskost, tolles Ambiente, faire Preise...'
                    : 'z.B. Historisch bedeutsam, wunderschöne Aussicht, gut erhalten...'
                }
                placeholderTextColor={colors.tertiaryText}
                value={whyRecommend}
                onChangeText={setWhyRecommend}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="suggestion-why"
              />
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Info size={16} color={colors.tertiaryText} />
              <Text style={[styles.infoText, { color: colors.tertiaryText }]}>
                Deine Empfehlung wird von unserem Team geprüft, bevor sie veröffentlicht wird.
                Felder mit * sind Pflichtfelder.
              </Text>
            </View>

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: colors.accent },
                submitMutation.isPending && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
              testID="suggestion-submit"
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Empfehlung einsenden</Text>
                </>
              )}
            </Pressable>

            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  hintCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  cityPlzRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cityInput: {
    flex: 1,
  },
  plzInput: {
    width: 80,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 15,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 260,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  priceChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  successBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  successBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
