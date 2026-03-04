import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Users,
  Timer,
  ArrowRight,
  Ghost,
  Shuffle,
  CheckCircle,
  Settings,
} from 'lucide-react-native';
import { useLobbyEngine } from '@/providers/LobbyEngine';
import { GAME_DEFINITIONS, DEFAULT_GAME_SETTINGS } from '@/constants/games';
import type { GameType, DrawDirection } from '@/constants/games';

export default function CreateRoomScreen() {
  const { gameType: gameTypeParam } = useLocalSearchParams<{ gameType: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createRoom } = useLobbyEngine();

  const gameType = (gameTypeParam as GameType) || 'shadow_cards';
  const gameDef = GAME_DEFINITIONS.find(g => g.type === gameType);

  const [playerCount, setPlayerCount] = useState<number>(3);
  const [turnTimer, setTurnTimer] = useState<number>(DEFAULT_GAME_SETTINGS.turnTimerSeconds);
  const [drawDirection, setDrawDirection] = useState<DrawDirection>('left');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCreate = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('[CREATE-ROOM] Creating room:', gameType, playerCount);
      await createRoom(gameType, playerCount, true, {
        turnTimerSeconds: turnTimer,
        drawDirection,
        autoPairRemove: true,
      });
      router.push('/(tabs)/spiele/lobby' as any);
    } catch (e: any) {
      console.log('[CREATE-ROOM] Error:', e?.message);
      setIsCreating(false);
    }
  }, [gameType, playerCount, turnTimer, drawDirection, isCreating, createRoom, router]);

  const TIMER_OPTIONS = [15, 20, 30, 45];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#191816', '#141416']} style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <ChevronLeft size={22} color="#E8DCC8" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>RAUM ERSTELLEN</Text>
          <Text style={styles.headerSubtitle}>{gameDef?.name ?? 'Spiel'}</Text>
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.gamePreview}>
            <View style={styles.gamePreviewIcon}>
              <Ghost size={36} color="#BFA35D" />
            </View>
            <Text style={styles.gamePreviewTitle}>{gameDef?.name ?? gameType}</Text>
            <Text style={styles.gamePreviewDesc}>{gameDef?.description ?? ''}</Text>
          </View>

          <View style={styles.settingSection}>
            <View style={styles.settingHeader}>
              <Users size={16} color="#BFA35D" />
              <Text style={styles.settingLabel}>SPIELERANZAHL</Text>
            </View>
            <View style={styles.optionRow}>
              {[3, 4].map(count => (
                <Pressable
                  key={count}
                  style={[styles.optionBtn, playerCount === count && styles.optionBtnActive]}
                  onPress={() => {
                    setPlayerCount(count);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                  testID={`player-count-${count}`}
                >
                  <Text style={[styles.optionBtnText, playerCount === count && styles.optionBtnTextActive]}>
                    {count} Spieler
                  </Text>
                  {playerCount === count && <CheckCircle size={14} color="#141416" />}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingSection}>
            <View style={styles.settingHeader}>
              <Timer size={16} color="#BFA35D" />
              <Text style={styles.settingLabel}>ZUG-TIMER</Text>
            </View>
            <View style={styles.optionRow}>
              {TIMER_OPTIONS.map(t => (
                <Pressable
                  key={t}
                  style={[styles.timerBtn, turnTimer === t && styles.timerBtnActive]}
                  onPress={() => {
                    setTurnTimer(t);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.timerBtnText, turnTimer === t && styles.timerBtnTextActive]}>
                    {t}s
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingSection}>
            <View style={styles.settingHeader}>
              <Shuffle size={16} color="#BFA35D" />
              <Text style={styles.settingLabel}>ZIEH-RICHTUNG</Text>
            </View>
            <View style={styles.optionRow}>
              {[
                { value: 'left' as const, label: 'Links (Standard)' },
                { value: 'right' as const, label: 'Rechts' },
              ].map(opt => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, drawDirection === opt.value && styles.optionBtnActive]}
                  onPress={() => {
                    setDrawDirection(opt.value);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.optionBtnText, drawDirection === opt.value && styles.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                  {drawDirection === opt.value && <CheckCircle size={14} color="#141416" />}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingSection}>
            <View style={styles.settingHeader}>
              <Settings size={16} color="#BFA35D" />
              <Text style={styles.settingLabel}>REGELN</Text>
            </View>
            <View style={styles.ruleCard}>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleLabel}>Paare automatisch entfernen</Text>
                <View style={styles.ruleActive}>
                  <Text style={styles.ruleActiveText}>AN</Text>
                </View>
              </View>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleLabel}>Raum-Typ</Text>
                <View style={styles.ruleActive}>
                  <Text style={styles.ruleActiveText}>PRIVAT</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.createBtn, isCreating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={isCreating}
          testID="create-room-btn"
        >
          <LinearGradient
            colors={isCreating ? ['#555', '#444'] : ['#BFA35D', '#A08A45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createBtnGradient}
          >
            <Text style={styles.createBtnText}>
              {isCreating ? 'ERSTELLE...' : 'RAUM ERSTELLEN'}
            </Text>
            {!isCreating && <ArrowRight size={18} color="#141416" />}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(42,42,46,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.5)',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  gamePreview: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  gamePreviewIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gamePreviewTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  gamePreviewDesc: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.4)',
    textAlign: 'center' as const,
    paddingHorizontal: 24,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 1.5,
  },
  optionRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  optionBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  optionBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  optionBtnTextActive: {
    color: '#141416',
  },
  timerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1e1e20',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  timerBtnActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  timerBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  timerBtnTextActive: {
    color: '#141416',
  },
  ruleCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  ruleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.5)',
  },
  ruleActive: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  ruleActiveText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#BFA35D',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#141416',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  createBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#141416',
    letterSpacing: 2,
  },
});
