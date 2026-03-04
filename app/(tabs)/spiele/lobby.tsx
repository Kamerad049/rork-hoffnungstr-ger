import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Share,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Users,
  Crown,
  CheckCircle,
  Copy,
  UserPlus,
  Play,
  Bot,
  Ghost,
  Grid3x3,
  X,
} from 'lucide-react-native';
import { useLobbyEngine } from '@/providers/LobbyEngine';
import { useShadowCards } from '@/providers/ShadowCardsEngine';
import { useConnectFour } from '@/providers/ConnectFourEngine';
import type { LobbyMember } from '@/constants/games';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function LobbyPlayerSlot({
  member,
  index,
  isEmpty,
}: {
  member: LobbyMember | null;
  index: number;
  isEmpty: boolean;
}) {
  const slamAnim = useRef(new Animated.Value(isEmpty ? 0 : -150)).current;
  const scaleAnim = useRef(new Animated.Value(isEmpty ? 1 : 0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const readyPulse = useRef(new Animated.Value(1)).current;
  const emptyPulse = useRef(new Animated.Value(0.5)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isEmpty && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.sequence([
        Animated.delay(index * 180),
        Animated.parallel([
          Animated.spring(slamAnim, { toValue: 0, friction: 4, tension: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 3, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [isEmpty]);

  useEffect(() => {
    if (member?.isReady) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(readyPulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(readyPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [member?.isReady]);

  useEffect(() => {
    if (isEmpty) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(emptyPulse, { toValue: 0.9, duration: 1800 + index * 200, useNativeDriver: true }),
          Animated.timing(emptyPulse, { toValue: 0.5, duration: 1800 + index * 200, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isEmpty]);

  const initial = member?.displayName?.charAt(0)?.toUpperCase() ?? '?';
  const isBot = member?.userId.startsWith('bot_');

  if (isEmpty) {
    return (
      <Animated.View style={[styles.playerSlot, { opacity: emptyPulse }]}>
        <View style={styles.emptySlotOuter}>
          <View style={styles.emptySlotInner}>
            <Text style={styles.emptySlotQ}>?</Text>
          </View>
        </View>
        <Text style={styles.emptySlotLabel}>Warte...</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.playerSlot,
        {
          transform: [
            { translateY: slamAnim },
            { translateX: shakeAnim },
            { scale: Animated.multiply(scaleAnim, member?.isReady ? readyPulse : new Animated.Value(1)) },
          ],
        },
      ]}
    >
      <View style={[styles.filledSlotOuter, member?.isReady && styles.filledSlotReady]}>
        {member?.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.playerAvatar} />
        ) : (
          <LinearGradient
            colors={member?.isReady ? ['#BFA35D', '#8B7340'] : ['#3a3a3e', '#2a2a2e']}
            style={styles.playerAvatarGrad}
          >
            {isBot ? (
              <Bot size={22} color={member?.isReady ? '#141416' : '#E8DCC8'} />
            ) : (
              <Text style={[styles.playerInitial, member?.isReady && styles.playerInitialReady]}>
                {initial}
              </Text>
            )}
          </LinearGradient>
        )}

        {member?.isHost && (
          <View style={styles.hostBadge}>
            <Crown size={10} color="#BFA35D" strokeWidth={3} />
          </View>
        )}
        {member?.isReady && (
          <View style={styles.readyBadge}>
            <CheckCircle size={14} color="#141416" strokeWidth={3} />
          </View>
        )}
      </View>
      <Text style={[styles.playerName, member?.isReady && styles.playerNameReady]} numberOfLines={1}>
        {member?.displayName?.split(' ')[0] ?? 'Spieler'}
      </Text>
      <Text style={[styles.playerStatus, member?.isReady && styles.playerStatusReady]}>
        {member?.isReady ? 'BEREIT' : 'WARTET'}
      </Text>
    </Animated.View>
  );
}

function CountdownOverlay({ count }: { count: number }) {
  const scaleAnim = useRef(new Animated.Value(3)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    scaleAnim.setValue(3);
    opacityAnim.setValue(1);
    ringScale.setValue(0.5);
    ringOpacity.setValue(0.8);

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      Animated.timing(ringScale, { toValue: 2.5, duration: 800, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [count]);

  const isUrgent = count <= 2;
  const color = isUrgent ? '#FF4444' : '#BFA35D';

  return (
    <View style={styles.countdownOverlay}>
      <Animated.View
        style={[styles.countdownRing, { opacity: ringOpacity, borderColor: color, transform: [{ scale: ringScale }] }]}
      />
      <Animated.View style={[styles.countdownNum, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Text style={[styles.countdownText, { color }]}>{count}</Text>
      </Animated.View>
      <Text style={styles.countdownLabel}>{count > 1 ? 'MACH DICH BEREIT' : 'LOS!'}</Text>
    </View>
  );
}

export default function GameLobbyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentRoom,
    members,
    isHost,
    myMember,
    countdownValue,
    isCountingDown,
    toggleReady,
    startGame,
    leaveRoom,
    fillWithBots,
    canStart,
    currentSession,
  } = useLobbyEngine();
  const { initGame: initShadowCards } = useShadowCards();
  const { initGame: initConnectFour } = useConnectFour();
  const [codeCopied, setCodeCopied] = useState<boolean>(false);

  useEffect(() => {
    if (currentSession && !isCountingDown) {
      console.log('[LOBBY-UI] Session started, navigating to game:', currentRoom?.gameType);
      if (currentRoom?.gameType === 'vier_gewinnt') {
        initConnectFour();
        router.push('/(tabs)/spiele/connect-four' as any);
      } else {
        initShadowCards();
        router.push('/(tabs)/spiele/shadow-cards' as any);
      }
    }
  }, [currentSession, isCountingDown]);

  const handleCopyCode = useCallback(async () => {
    if (!currentRoom) return;
    try {
      if (Platform.OS !== 'web') {
        await Share.share({ message: `Komm in meinen Spiele-Raum! Code: ${currentRoom.inviteCode}` });
      }
      setCodeCopied(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (e: any) {
      console.log('[LOBBY-UI] Share error:', e?.message);
    }
  }, [currentRoom]);

  const handleStart = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startGame();
  }, [startGame]);

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    router.back();
  }, [leaveRoom, router]);

  const handleReady = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleReady();
  }, [toggleReady]);

  if (!currentRoom) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.noRoomText}>Kein aktiver Raum</Text>
        <Pressable style={styles.backLinkBtn} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  const maxSlots = currentRoom.maxPlayers;
  const slots = Array.from({ length: maxSlots }, (_, i) => members[i] ?? null);

  return (
    <View style={styles.container}>
      {isCountingDown && countdownValue > 0 && <CountdownOverlay count={countdownValue} />}

      <LinearGradient colors={['#191816', '#141416']} style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={handleLeave} testID="leave-lobby-btn">
          <X size={20} color="#E8DCC8" />
        </Pressable>
        <View style={styles.headerCenter}>
          {currentRoom.gameType === 'vier_gewinnt' ? <Grid3x3 size={18} color="#BFA35D" /> : <Ghost size={18} color="#BFA35D" />}
          <Text style={styles.headerTitle}>
            {currentRoom.gameType === 'shadow_cards' ? 'DER SCHATTEN' : currentRoom.gameType === 'vier_gewinnt' ? 'VIER GEWINNT' : 'LOBBY'}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>RAUM-CODE</Text>
          <Pressable style={styles.codeRow} onPress={handleCopyCode} testID="copy-code-btn">
            <Text style={styles.codeText}>{currentRoom.inviteCode}</Text>
            {codeCopied ? (
              <CheckCircle size={18} color="#BFA35D" />
            ) : (
              <Copy size={18} color="rgba(191,163,93,0.5)" />
            )}
          </Pressable>
        </View>

        <View style={styles.playersSection}>
          <View style={styles.playersSectionHeader}>
            <Users size={14} color="rgba(191,163,93,0.5)" />
            <Text style={styles.playersSectionLabel}>
              SPIELER ({members.length}/{maxSlots})
            </Text>
          </View>
          <View style={styles.slotsGrid}>
            {slots.map((member, i) => (
              <LobbyPlayerSlot key={member?.userId ?? `empty-${i}`} member={member} index={i} isEmpty={!member} />
            ))}
          </View>
        </View>

        {isHost && members.length < maxSlots && (
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={handleCopyCode}>
              <UserPlus size={16} color="#BFA35D" />
              <Text style={styles.actionBtnText}>Einladen</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                fillWithBots();
              }}
              testID="fill-bots-btn"
            >
              <Bot size={16} color="#BFA35D" />
              <Text style={styles.actionBtnText}>Bots füllen</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.bottomActions}>
          {!isHost && (
            <Pressable
              style={[styles.readyBtn, myMember?.isReady && styles.readyBtnActive]}
              onPress={handleReady}
              testID="ready-btn"
            >
              <Text style={[styles.readyBtnText, myMember?.isReady && styles.readyBtnTextActive]}>
                {myMember?.isReady ? 'BEREIT ✓' : 'BEREIT MELDEN'}
              </Text>
            </Pressable>
          )}

          {isHost && (
            <>
              <Pressable
                style={[styles.readyBtn, myMember?.isReady && styles.readyBtnActive]}
                onPress={handleReady}
                testID="host-ready-btn"
              >
                <Text style={[styles.readyBtnText, myMember?.isReady && styles.readyBtnTextActive]}>
                  {myMember?.isReady ? 'BEREIT ✓' : 'BEREIT MELDEN'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.startBtn, !canStart() && styles.startBtnDisabled]}
                onPress={handleStart}
                disabled={!canStart()}
                testID="start-game-btn"
              >
                <LinearGradient
                  colors={canStart() ? ['#BFA35D', '#A08A45'] : ['#333', '#2a2a2e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startBtnGradient}
                >
                  <Play size={18} color={canStart() ? '#141416' : 'rgba(232,220,200,0.25)'} />
                  <Text style={[styles.startBtnText, !canStart() && styles.startBtnTextDisabled]}>
                    STARTEN
                  </Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>
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
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#BFA35D',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'] as any,
  },
  playersSection: {
    marginBottom: 20,
  },
  playersSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  playersSectionLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.4)',
    letterSpacing: 1.5,
  },
  slotsGrid: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  playerSlot: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 40 - 48) / 4,
    minWidth: 70,
  },
  emptySlotOuter: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(42,42,46,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.08)',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptySlotInner: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(30,30,32,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotQ: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.15)',
  },
  emptySlotLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.2)',
  },
  filledSlotOuter: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(42,42,46,0.8)',
    marginBottom: 6,
  },
  filledSlotReady: {
    borderColor: '#BFA35D',
  },
  playerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  playerAvatarGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitial: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  playerInitialReady: {
    color: '#141416',
  },
  hostBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e1e20',
    borderWidth: 1.5,
    borderColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#BFA35D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.6)',
    maxWidth: 70,
    textAlign: 'center' as const,
  },
  playerNameReady: {
    color: '#BFA35D',
  },
  playerStatus: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.25)',
    letterSpacing: 1,
    marginTop: 2,
  },
  playerStatusReady: {
    color: 'rgba(191,163,93,0.6)',
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  bottomActions: {
    marginTop: 'auto' as any,
    gap: 10,
  },
  readyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  readyBtnActive: {
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderColor: '#BFA35D',
  },
  readyBtnText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 1.5,
  },
  readyBtnTextActive: {
    color: '#BFA35D',
  },
  startBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#141416',
    letterSpacing: 2,
  },
  startBtnTextDisabled: {
    color: 'rgba(232,220,200,0.25)',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: 'rgba(10,10,12,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownRing: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  countdownNum: {
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 80,
    fontWeight: '900' as const,
  },
  countdownLabel: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: 'rgba(232,220,200,0.4)',
    letterSpacing: 3,
  },
  noRoomText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(232,220,200,0.4)',
    marginBottom: 16,
  },
  backLinkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
});
