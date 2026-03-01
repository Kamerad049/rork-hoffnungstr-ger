import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Dumbbell,
  Swords,
  Timer,
  Snowflake,
  Waves,
  Mountain,
  Leaf,
  Activity,
  Check,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { SPORT_CATEGORIES, BUNDESLAND_COORDS } from '@/constants/kaderschmiede';
import type { SportCategory } from '@/constants/kaderschmiede';

const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Schwimmen: Waves,
  Wandern: Mountain,
  Yoga: Leaf,
  Sonstiges: Activity,
};

const BUNDESLAENDER = Object.keys(BUNDESLAND_COORDS);

export default function CreateTruppScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createTrupp } = useKaderschmiede();

  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<SportCategory | null>(null);
  const [city, setCity] = useState('');
  const [bundesland, setBundesland] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  const canSubmit = name.trim() && motto.trim() && sport && city.trim() && bundesland && weeklyGoal.trim();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!canSubmit || !sport || isSubmitting) return;
    setIsSubmitting(true);
    console.log('[CREATE-TRUPP] Creating trupp:', name);
    try {
      await createTrupp({
        name: name.trim(),
        motto: motto.trim(),
        description: description.trim(),
        sport,
        city: city.trim(),
        bundesland,
        isOpen,
        weeklyGoal: weeklyGoal.trim(),
      });
      Alert.alert('Trupp erstellt!', `"${name}" wurde erfolgreich gegründet.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.log('[CREATE-TRUPP] Error:', e);
      Alert.alert('Fehler', 'Trupp konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, name, motto, description, sport, city, bundesland, isOpen, weeklyGoal, createTrupp, router, isSubmitting]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Trupp gründen</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>NAME *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Eiserne Garde Berlin"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={40}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MOTTO *</Text>
            <TextInput
              style={styles.input}
              value={motto}
              onChangeText={setMotto}
              placeholder="z.B. Stahl formt Charakter"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={60}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BESCHREIBUNG</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Was macht euren Trupp aus?"
              placeholderTextColor="rgba(191,163,93,0.25)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SPORTART *</Text>
            <View style={styles.chipGrid}>
              {SPORT_CATEGORIES.map(s => {
                const Icon = SPORT_ICON_MAP[s] ?? Activity;
                const selected = sport === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.sportChip, selected && styles.sportChipActive]}
                    onPress={() => setSport(selected ? null : s)}
                  >
                    <Icon size={14} color={selected ? '#141416' : '#BFA35D'} />
                    <Text style={[styles.sportChipText, selected && styles.sportChipTextActive]}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>STADT *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="z.B. Berlin"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={30}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BUNDESLAND *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {BUNDESLAENDER.map(bl => {
                  const selected = bundesland === bl;
                  return (
                    <Pressable
                      key={bl}
                      style={[styles.blChip, selected && styles.blChipActive]}
                      onPress={() => setBundesland(selected ? '' : bl)}
                    >
                      <Text style={[styles.blChipText, selected && styles.blChipTextActive]}>
                        {bl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>WOCHENZIEL *</Text>
            <TextInput
              style={styles.input}
              value={weeklyGoal}
              onChangeText={setWeeklyGoal}
              placeholder="z.B. 500 Klimmzüge als Gruppe"
              placeholderTextColor="rgba(191,163,93,0.25)"
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>STATUS</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, isOpen && styles.toggleBtnActive]}
                onPress={() => setIsOpen(true)}
              >
                <Unlock size={14} color={isOpen ? '#141416' : 'rgba(191,163,93,0.5)'} />
                <Text style={[styles.toggleText, isOpen && styles.toggleTextActive]}>Offen</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, !isOpen && styles.toggleBtnClosed]}
                onPress={() => setIsOpen(false)}
              >
                <Lock size={14} color={!isOpen ? '#141416' : 'rgba(191,163,93,0.5)'} />
                <Text style={[styles.toggleText, !isOpen && styles.toggleTextActive]}>Geschlossen</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit || isSubmitting}
          >
            <Check size={18} color={canSubmit ? '#141416' : 'rgba(20,20,22,0.4)'} />
            <Text style={[styles.createBtnText, !canSubmit && styles.createBtnTextDisabled]}>
              {isSubmitting ? 'Wird erstellt...' : 'Trupp gründen'}
            </Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#141416',
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
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1e20',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  sportChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  sportChipTextActive: {
    color: '#141416',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  blChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  blChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  blChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  blChipTextActive: {
    color: '#141416',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  toggleBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  toggleBtnClosed: {
    backgroundColor: '#C06060',
    borderColor: '#C06060',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  toggleTextActive: {
    color: '#141416',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
    marginTop: 12,
  },
  createBtnDisabled: {
    backgroundColor: 'rgba(191,163,93,0.15)',
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#141416',
  },
  createBtnTextDisabled: {
    color: 'rgba(20,20,22,0.4)',
  },
});
