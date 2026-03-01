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
} from 'lucide-react-native';
import { useKaderschmiede } from '@/providers/KaderschmiedeProvider';
import { SPORT_CATEGORIES } from '@/constants/kaderschmiede';
import type { SportCategory, ChallengeType } from '@/constants/kaderschmiede';

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

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: 'Gruppe', label: 'Gruppen-Challenge' },
  { value: '1v1', label: '1 gegen 1' },
  { value: 'Stadt', label: 'Stadt-Duell' },
  { value: 'Bundesland', label: 'Bundesland-Duell' },
];

export default function CreateChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createChallenge } = useKaderschmiede();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<SportCategory | null>(null);
  const [type, setType] = useState<ChallengeType | null>(null);
  const [goal, setGoal] = useState('');
  const [unit, setUnit] = useState('');
  const [durationDays, setDurationDays] = useState('7');

  const canSubmit = title.trim() && sport && type && goal.trim() && unit.trim() && durationDays.trim();

  const handleCreate = useCallback(() => {
    if (!canSubmit || !sport || !type) return;

    const days = parseInt(durationDays, 10) || 7;
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 86400000).toISOString();

    console.log('[CREATE-CHALLENGE] Creating challenge:', title);
    createChallenge({
      title: title.trim(),
      description: description.trim(),
      type,
      sport,
      startDate,
      endDate,
      goal: parseInt(goal, 10) || 100,
      unit: unit.trim(),
    });

    Alert.alert('Challenge erstellt!', `"${title}" wurde erfolgreich erstellt.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [canSubmit, title, description, sport, type, goal, unit, durationDays, createChallenge, router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenge erstellen</Text>
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
              placeholder="z.B. 100 Liegestütze täglich"
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
              placeholder="Was ist die Herausforderung?"
              placeholderTextColor="rgba(191,163,93,0.25)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={250}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>TYP *</Text>
            <View style={styles.typeGrid}>
              {CHALLENGE_TYPES.map(ct => {
                const selected = type === ct.value;
                return (
                  <Pressable
                    key={ct.value}
                    style={[styles.typeChip, selected && styles.typeChipActive]}
                    onPress={() => setType(selected ? null : ct.value)}
                  >
                    <Swords size={12} color={selected ? '#141416' : '#BFA35D'} />
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{ct.label}</Text>
                  </Pressable>
                );
              })}
            </View>
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

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>ZIEL *</Text>
              <TextInput
                style={styles.input}
                value={goal}
                onChangeText={setGoal}
                placeholder="z.B. 1000"
                placeholderTextColor="rgba(191,163,93,0.25)"
                keyboardType="number-pad"
                maxLength={8}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>EINHEIT *</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="z.B. Liegestütze"
                placeholderTextColor="rgba(191,163,93,0.25)"
                maxLength={20}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>DAUER (TAGE)</Text>
            <View style={styles.durationRow}>
              {['3', '7', '14', '30'].map(d => {
                const selected = durationDays === d;
                return (
                  <Pressable
                    key={d}
                    style={[styles.durationChip, selected && styles.durationChipActive]}
                    onPress={() => setDurationDays(d)}
                  >
                    <Text style={[styles.durationChipText, selected && styles.durationChipTextActive]}>
                      {d}d
                    </Text>
                  </Pressable>
                );
              })}
              <TextInput
                style={styles.durationInput}
                value={durationDays}
                onChangeText={setDurationDays}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          <Pressable
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            <Check size={18} color={canSubmit ? '#141416' : 'rgba(20,20,22,0.4)'} />
            <Text style={[styles.createBtnText, !canSubmit && styles.createBtnTextDisabled]}>
              Challenge erstellen
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
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
  typeChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  typeChipTextActive: {
    color: '#141416',
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
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(42,42,46,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  durationChipActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  durationChipTextActive: {
    color: '#141416',
  },
  durationInput: {
    flex: 1,
    backgroundColor: '#1e1e20',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    textAlign: 'center',
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
