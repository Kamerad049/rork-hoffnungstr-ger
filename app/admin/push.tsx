import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Users,
  User,
  CheckCircle,
  Circle,
  Search,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import type { SocialUser } from '@/constants/types';
import * as Haptics from 'expo-haptics';


export default function AdminPushScreen() {
  const { colors } = useTheme();
  const { allUsers, addPushNotification } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [recipientMode, setRecipientMode] = useState<'all' | 'select'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');

  const [hasRecording, setHasRecording] = useState<boolean>(false);
  const [isPlayingBack, setIsPlayingBack] = useState<boolean>(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);

  const recorderRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const { Audio } = require('expo-av');
        const status = await Audio.requestPermissionsAsync();
        if (!status.granted) {
          console.log('[ADMIN PUSH] Microphone permission denied');
        }
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: true,
        });
      } catch (e) {
        console.log('[ADMIN PUSH] Audio setup error:', e);
      }
    })();
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Nicht verfügbar', 'Audio-Aufnahme ist nur in der mobilen App verfügbar.');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setHasRecording(false);
      setAudioUri(null);
      setRecordingDuration(0);
      const { Audio } = require('expo-av');
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recorderRef.current = recording;
      setIsRecording(true);
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
      console.log('[ADMIN PUSH] Recording started');
    } catch (error) {
      console.log('[ADMIN PUSH] Recording error:', error);
      setIsRecording(false);
      Alert.alert('Fehler', 'Aufnahme konnte nicht gestartet werden. Bitte Mikrofon-Berechtigung prüfen.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (recorderRef.current) {
        await recorderRef.current.stopAndUnloadAsync();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const uri = recorderRef.current.getURI();
        console.log('[ADMIN PUSH] Recording stopped, uri:', uri);
        if (uri) {
          setAudioUri(uri);
          setHasRecording(true);
        }
      }
      setIsRecording(false);
    } catch (error) {
      console.log('[ADMIN PUSH] Stop recording error:', error);
      setIsRecording(false);
    }
  }, []);

  const playRecording = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (Platform.OS === 'web') {
        if (audioUri) {
          const audio = new Audio(audioUri);
          playerRef.current = audio;
          audio.onended = () => setIsPlayingBack(false);
          await audio.play();
          setIsPlayingBack(true);
        }
      } else {
        const { Audio } = require('expo-av');
        if (playerRef.current) {
          await playerRef.current.unloadAsync();
        }
        if (audioUri) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true }
          );
          playerRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) setIsPlayingBack(false);
          });
          setIsPlayingBack(true);
        }
      }
      console.log('[ADMIN PUSH] Playing recording');
    } catch (e) {
      console.log('[ADMIN PUSH] Play error:', e);
    }
  }, [audioUri]);

  const stopPlayback = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsPlayingBack(false);
    console.log('[ADMIN PUSH] Playback stopped');
  }, []);

  const deleteRecording = useCallback(() => {
    Alert.alert('Aufnahme löschen', 'Aufnahme wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          setHasRecording(false);
          setAudioUri(null);
          setIsPlayingBack(false);
          if (playerRef.current) {
            try { playerRef.current.pause(); } catch (e) {}
          }
          playerRef.current = null;
          console.log('[ADMIN PUSH] Recording deleted');
        },
      },
    ]);
  }, []);

  const toggleUser = useCallback((userId: string) => {
    Haptics.selectionAsync();
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase().trim();
    return allUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const selectAll = useCallback(() => {
    setSelectedUsers(allUsers.map((u) => u.id));
  }, [allUsers]);

  const deselectAll = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const handleSend = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel ein.');
      return;
    }
    if (!message.trim() && !hasRecording) {
      Alert.alert('Fehler', 'Bitte gib eine Nachricht ein oder nimm eine Audio-Nachricht auf.');
      return;
    }
    if (isRecording) {
      Alert.alert('Fehler', 'Bitte stoppe zuerst die Aufnahme.');
      return;
    }
    if (recipientMode === 'select' && selectedUsers.length === 0) {
      Alert.alert('Fehler', 'Bitte wähle mindestens einen Empfänger aus.');
      return;
    }

    const recipientCount = recipientMode === 'all' ? allUsers.length : selectedUsers.length;
    const recipientLabel = recipientMode === 'all' ? 'ALLE Nutzer' : `${selectedUsers.length} Nutzer`;

    Alert.alert(
      'Push senden',
      `Push-Nachricht an ${recipientLabel} senden?${hasRecording ? '\n\nMit Audio-Nachricht' : ''}`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Senden',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            addPushNotification({
              title: title.trim(),
              message: message.trim(),
              audioUri,
              audioDuration: hasRecording ? recordingDuration : 0,
              recipients: recipientMode === 'all' ? 'all' : [...selectedUsers],
            });
            Alert.alert('Gesendet!', `Push-Nachricht wurde an ${recipientLabel} gesendet.`);
            setTitle('');
            setMessage('');
            setHasRecording(false);
            setAudioUri(null);
            setSelectedUsers([]);
            console.log('[ADMIN PUSH] Notification sent to', recipientCount, 'users');
          },
        },
      ]
    );
  }, [title, message, hasRecording, recipientMode, selectedUsers, allUsers, audioUri, recordingDuration, addPushNotification]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#141416' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: '#141416' }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.heroPattern}>
          {[...Array(6)].map((_, i) => (
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
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={18} color="#BFA35D" />
        </Pressable>
        <View style={styles.heroIconWrap}>
          <Send size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Push senden</Text>
        <Text style={styles.heroSubtitle}>
          Sende Push-Nachrichten an deine Nutzer.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Nachricht</Text>

      <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Titel</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Push-Titel..."
        placeholderTextColor={colors.tertiaryText}
      />

      <Text style={[styles.inputLabel, { color: colors.tertiaryText }]}>Text (optional bei Audio)</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.border }]}
        value={message}
        onChangeText={setMessage}
        placeholder="Nachrichtentext..."
        placeholderTextColor={colors.tertiaryText}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.sectionTitle, { color: colors.primaryText, marginTop: 24 }]}>
        Audio-Nachricht
      </Text>

      <View style={[styles.recorderCard, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}>
        {!isRecording && !hasRecording && (
          <View style={styles.recorderEmpty}>
            <Pressable
              style={styles.recordBtn}
              onPress={startRecording}
              testID="admin-record-btn"
            >
              <View style={styles.recordBtnInner}>
                <Mic size={28} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={[styles.recorderHint, { color: colors.tertiaryText }]}>
              Tippe zum Aufnehmen
            </Text>
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingActive}>
            <Animated.View style={[styles.recordingPulse, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.recordingDot} />
            </Animated.View>
            <Text style={[styles.recordingTime, { color: colors.red }]}>
              {formatDuration(recordingDuration)}
            </Text>
            <Text style={[styles.recordingLabel, { color: colors.tertiaryText }]}>Aufnahme läuft...</Text>
            <Pressable
              style={[styles.stopBtn, { backgroundColor: colors.red }]}
              onPress={stopRecording}
              testID="admin-stop-btn"
            >
              <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.stopBtnText}>Stopp</Text>
            </Pressable>
          </View>
        )}

        {hasRecording && !isRecording && (
          <View style={styles.playbackSection}>
            <View style={styles.playbackRow}>
              <Pressable
                style={[styles.playBtn, { backgroundColor: colors.accent }]}
                onPress={isPlayingBack ? stopPlayback : playRecording}
              >
                {isPlayingBack ? (
                  <Pause size={20} color="#1c1c1e" />
                ) : (
                  <Play size={20} color="#1c1c1e" />
                )}
              </Pressable>
              <View style={styles.waveformContainer}>
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = Math.random() * 24 + 8;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: h,
                          backgroundColor: isPlayingBack ? colors.accent : 'rgba(191,163,93,0.4)',
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={[styles.durationText, { color: colors.primaryText }]}>
                {formatDuration(recordingDuration)}
              </Text>
            </View>
            <Pressable
              style={[styles.deleteRecBtn, { backgroundColor: 'rgba(192,96,96,0.12)' }]}
              onPress={deleteRecording}
            >
              <Trash2 size={16} color={colors.red} />
              <Text style={[styles.deleteRecText, { color: colors.red }]}>Aufnahme löschen</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.primaryText, marginTop: 24 }]}>
        Empfänger
      </Text>

      <View style={styles.recipientModeRow}>
        <Pressable
          style={[
            styles.modeBtn,
            recipientMode === 'all'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
          onPress={() => setRecipientMode('all')}
        >
          <Users size={16} color={recipientMode === 'all' ? '#1c1c1e' : colors.primaryText} />
          <Text style={[styles.modeBtnText, { color: recipientMode === 'all' ? '#1c1c1e' : colors.primaryText }]}>
            Alle Nutzer
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.modeBtn,
            recipientMode === 'select'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
          onPress={() => setRecipientMode('select')}
        >
          <User size={16} color={recipientMode === 'select' ? '#1c1c1e' : colors.primaryText} />
          <Text style={[styles.modeBtnText, { color: recipientMode === 'select' ? '#1c1c1e' : colors.primaryText }]}>
            Auswählen
          </Text>
        </Pressable>
      </View>

      {recipientMode === 'select' && (
        <View style={styles.userSelectSection}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.tertiaryText} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: colors.primaryText }]}
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Nutzer suchen..."
              placeholderTextColor={colors.tertiaryText}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
            {userSearch.length > 0 && (
              <Pressable onPress={() => setUserSearch('')} hitSlop={8}>
                <X size={18} color={colors.tertiaryText} />
              </Pressable>
            )}
          </View>
          <View style={styles.selectActions}>
            <Pressable onPress={selectAll}>
              <Text style={[styles.selectActionText, { color: colors.accent }]}>Alle auswählen</Text>
            </Pressable>
            <Pressable onPress={deselectAll}>
              <Text style={[styles.selectActionText, { color: colors.tertiaryText }]}>Keine</Text>
            </Pressable>
            <Text style={[styles.selectedCount, { color: colors.tertiaryText }]}>
              {selectedUsers.length} / {allUsers.length}
            </Text>
          </View>
          {filteredUsers.map((user: SocialUser) => {
            const isSelected = selectedUsers.includes(user.id);
            return (
              <Pressable
                key={user.id}
                style={[
                  styles.userRow,
                  {
                    backgroundColor: isSelected ? 'rgba(191,163,93,0.08)' : colors.surface,
                    borderColor: isSelected ? colors.accent : 'transparent',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => toggleUser(user.id)}
              >
                <View style={[styles.userAvatar, { backgroundColor: 'rgba(191,163,93,0.12)' }]}>
                  <Text style={[styles.userAvatarText, { color: colors.accent }]}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.primaryText }]}>{user.displayName}</Text>
                  <Text style={[styles.userHandle, { color: colors.tertiaryText }]}>@{user.username}</Text>
                </View>
                {isSelected ? (
                  <CheckCircle size={22} color={colors.accent} />
                ) : (
                  <Circle size={22} color={colors.tertiaryText} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.sendBtn, { backgroundColor: colors.accent }]}
        onPress={handleSend}
        testID="admin-send-push-btn"
      >
        <Send size={20} color="#1c1c1e" />
        <Text style={styles.sendBtnText}>Push-Nachricht senden</Text>
      </Pressable>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  heroPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
    marginLeft: 4,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600' as const, marginBottom: 6, marginTop: 10 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 80 },
  recorderCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  recorderEmpty: { alignItems: 'center', gap: 12 },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C06060',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C06060',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  recordBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C06060',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  recorderHint: { fontSize: 13 },
  recordingActive: { alignItems: 'center', gap: 10 },
  recordingPulse: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(192,96,96,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C06060',
  },
  recordingTime: { fontSize: 32, fontWeight: '800' as const, fontVariant: ['tabular-nums'] },
  recordingLabel: { fontSize: 13 },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  stopBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' as const },
  playbackSection: { gap: 14, width: '100%' },
  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 40,
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  durationText: { fontSize: 14, fontWeight: '600' as const, fontVariant: ['tabular-nums'] },
  deleteRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  deleteRecText: { fontSize: 13, fontWeight: '600' as const },
  recipientModeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeBtnText: { fontSize: 14, fontWeight: '600' as const },
  userSelectSection: { marginBottom: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  selectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  selectActionText: { fontSize: 13, fontWeight: '600' as const },
  selectedCount: { fontSize: 12, marginLeft: 'auto' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 16, fontWeight: '700' as const },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' as const },
  userHandle: { fontSize: 11 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  sendBtnText: { color: '#1c1c1e', fontSize: 16, fontWeight: '700' as const },
});
