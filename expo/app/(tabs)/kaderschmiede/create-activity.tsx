import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
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
  Mountain,
  Check,
  Repeat,
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { SPORT_CATEGORIES, SKILL_LEVELS, BUNDESLAND_COORDS } from '@/constants/kaderschmiede';
import type { SportCategory, SkillLevel } from '@/constants/kaderschmiede';
import { useAlert } from '@/providers/AlertProvider';

const SPORT_ICON_MAP: Record<SportCategory, React.ComponentType<any>> = {
  Calisthenics: Dumbbell,
  Kampfsport: Swords,
  Ausdauer: Timer,
  Eisbaden: Snowflake,
  Kraftsport: Dumbbell,
  Wandern: Mountain,
};

const BUNDESLAENDER = Object.keys(BUNDESLAND_COORDS);

export default function CreateActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { createActivity } = useKaderschmiede();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<SportCategory | null>(null);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [city, setCity] = useState('');
  const [bundesland, setBundesland] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('8');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const canSubmit = title.trim() && sport && level && city.trim() && bundesland && dateStr.trim() && timeStr.trim();

  const handleCreate = useCallback(() => {
    if (!canSubmit || !sport || !level) return;

    const [day, month, year] = dateStr.split('.').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const dateTime = new Date(year || 2026, (month || 1) - 1, day || 1, hours || 12, minutes || 0);

    if (isNaN(dateTime.getTime())) {
      showAlert('Fehler', 'Bitte gib ein gültiges Datum und Uhrzeit ein.');
      return;
    }

    const coords = BUNDESLAND_COORDS[bundesland] ?? { lat: 51, lng: 10 };

    console.log('[CREATE-ACTIVITY] Creating activity:', title);
    createActivity({
      type: sport,
      title: title.trim(),
      description: description.trim(),
      city: city.trim(),
      bundesland,
      latitude: coords.lat,
      longitude: coords.lng,
      dateTime: dateTime.toISOString(),
      level,
      maxParticipants: parseInt(maxParticipants, 10) || 8,
      isRecurring,
    });

    showAlert('Aktivität erstellt!', `"${title}" wurde erfolgreich erstellt.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [canSubmit, title, description, sport, level, city, bundesland, maxParticipants, isRecurring, dateStr, timeStr, createActivity, router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Aktivität erstellen</Text>
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
            <Text style={styles.label}>TITEL *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. Muscle-Up Training am Park"
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
              placeholder="Was erwartet die Teilnehmer?"
              placeholderTextColor="rgba(191,163,93,0.25)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={250}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SPORTART *</Text>
            <View style={styles.chipGrid}>
              {SPORT_CATEGORIES.map(s => {
                const Icon = SPORT_ICON_MAP[s] ?? Dumbbell;
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
            <Text style={styles.label}>LEVEL *</Text>
            <View style={styles.chipRow}>
              {SKILL_LEVELS.map(l => {
                const selected = level === l;
                return (
                  <Pressable
                    key={l}
                    style={[styles.levelChip, selected && styles.levelChipActive]}
                    onPress={() => setLevel(selected ? null : l)}
                  >
                    <Text style={[styles.levelChipText, selected && styles.levelChipTextActive]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>DATUM * (TT.MM.JJJJ)</Text>
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="28.02.2026"
                placeholderTextColor="rgba(191,163,93,0.25)"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>UHRZEIT * (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={timeStr}
                onChangeText={setTimeStr}
                placeholder="18:00"
                placeholderTextColor="rgba(191,163,93,0.25)"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
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
              <View style={styles.blChipRow}>
                {BUNDESLAENDER.map(bl => {
                  const selected = bundesland === bl;
                  return (
                    <Pressable
                      key={bl}
                      style={[styles.blChip, selected && styles.blChipActive]}
                      onPress={() => setBundesland(selected ? '' : bl)}
                    >
                      <Text style={[styles.blChipText, selected && styles.blChipTextActive]}>{bl}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>MAX. TEILNEHMER</Text>
              <TextInput
                style={styles.input}
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>WIEDERKEHREND</Text>
              <Pressable
                style={[styles.recurBtn, isRecurring && styles.recurBtnActive]}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <Repeat size={14} color={isRecurring ? '#141416' : 'rgba(191,163,93,0.5)'} />
                <Text style={[styles.recurBtnText, isRecurring && styles.recurBtnTextActive]}>
                  {isRecurring ? 'Ja' : 'Nein'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            <Check size={18} color={canSubmit ? '#141416' : 'rgba(20,20,22,0.4)'} />
            <Text style={[styles.createBtnText, !canSubmit && styles.createBtnTextDisabled]}>
              Aktivität erstellen
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
    minHeight: 80,
    paddingTop: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
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
  levelChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  levelChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  levelChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  levelChipTextActive: {
    color: '#141416',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  blChipRow: {
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
  recurBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  recurBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  recurBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  recurBtnTextActive: {
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
