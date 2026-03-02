import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send,
  Check,
  CheckCheck,
  Pencil,
  Undo2,
  X,
  ShieldAlert,
  UserCheck,
  Ban,
  Camera,
  Mic,
  Trash2,
  ChevronLeft,
  MessageSquare,
  Type,
  AudioLines,
  ImagePlus,
  Loader2,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useChat } from '@/providers/ChatProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { ChatMessage } from '@/constants/types';
import * as Haptics from 'expo-haptics';
import VoiceMessageBubble from '@/components/VoiceMessageBubble';
import { trackRender, measureSinceBoot } from '@/lib/perf';

let ScreenCapture: any = null;
try {
  if (Platform.OS !== 'web') {
    ScreenCapture = require('expo-screen-capture');
  }
} catch (e) {
  console.log('[CHAT] expo-screen-capture not available:', e);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVE_COUNT = 12;

let AudioAV: any = null;

if (Platform.OS !== 'web') {
  try {
    AudioAV = require('expo-av').Audio;
  } catch (e) {
    console.log('[CHAT] expo-av not available:', e);
  }
}

type InputMode = 'image' | 'text' | 'audio';

const MODES: { key: InputMode; label: string; icon: 'image' | 'text' | 'mic' }[] = [
  { key: 'image', label: 'Bild', icon: 'image' },
  { key: 'text', label: 'Text', icon: 'text' },
  { key: 'audio', label: 'Ton', icon: 'mic' },
];

export default function DirectChatScreen() {
  trackRender('DirectChatScreen');
  measureSinceBoot('DirectChatScreen_render');
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const chat = useChat();
  const friendsCtx = useFriends();
  const [input, setInput] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const listRef = useRef<FlatList>(null);
  const justSentRef = useRef<boolean>(false);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const webRecorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recordPulseAnim = useRef(new Animated.Value(1)).current;
  const recordRingAnim = useRef(new Animated.Value(0)).current;
  const recordRing2Anim = useRef(new Animated.Value(0)).current;
  const recordGlowAnim = useRef(new Animated.Value(0)).current;
  const wheelSlideAnim = useRef(new Animated.Value(0)).current;
  const recordWaveAnims = useRef(
    Array.from({ length: WAVE_COUNT }, () => new Animated.Value(0.15))
  ).current;
  const sendFlashAnim = useRef(new Animated.Value(0)).current;

  const nativeRecorderRef = useRef<any>(null);

  const partner = partnerId ? getUserById(partnerId) : undefined;
  const messages = chat.getMessages(partnerId ?? '');
  const isRequest = partnerId ? chat.isMessageRequest(partnerId) : false;
  const canSend = partnerId ? chat.canSendMessage(partnerId) : false;
  const isPartnerBlocked = partnerId ? friendsCtx.isBlocked(partnerId) : false;
  const isFriend = partnerId ? friendsCtx.isFriend(partnerId) : false;
  const hasMore = partnerId ? chat.hasMoreMessages(partnerId) : false;
  const loadingMore = partnerId ? chat.isLoadingMore(partnerId) : false;
  const scrollOffsetRef = useRef<number>(0);
  const contentHeightRef = useRef<number>(0);
  const prevMessageCountRef = useRef<number>(0);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loadingMore) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [loadingMore, spinAnim]);

  console.log('[CHAT] Rendering with', messages.length, 'messages, activeMenuId:', activeMenuId);

  useEffect(() => {
    if (partnerId) {
      console.log('[CHAT] Loading conversation and marking read for partner:', partnerId);
      chat.loadConversation(partnerId);
      chat.markMessagesRead(partnerId);
    }
  }, [partnerId]);

  useEffect(() => {
    if (partnerId && messages.length > 0) {
      chat.markMessagesRead(partnerId);
    }
  }, [partnerId, messages.length]);

  useEffect(() => {
    if (Platform.OS === 'web' || !partnerId || !ScreenCapture) return;

    let subscription: { remove: () => void } | undefined;

    const setup = async () => {
      try {
        const { status } = await ScreenCapture.requestPermissionsAsync();
        if (status === 'granted') {
          subscription = ScreenCapture.addScreenshotListener(() => {
            console.log('[CHAT] Screenshot detected in chat with:', partnerId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const platformHint = Platform.OS === 'ios'
              ? 'Ein Screenshot wurde in diesem Chat erstellt.'
              : 'Es wurde versucht, einen Screenshot in diesem Chat zu erstellen.';
            chat.addSystemMessage(partnerId, platformHint);
          });
          console.log('[CHAT] Screenshot listener registered');
        } else {
          subscription = ScreenCapture.addScreenshotListener(() => {
            console.log('[CHAT] Screenshot detected (no permission fallback)');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            chat.addSystemMessage(partnerId, 'Ein Screenshot wurde in diesem Chat erstellt.');
          });
        }
      } catch (e) {
        console.log('[CHAT] Screenshot listener setup failed:', e);
      }
    };

    setup();

    return () => {
      subscription?.remove();
    };
  }, [partnerId]);

  useEffect(() => {
    if (messages.length > 0 && prevMessageCountRef.current === 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleLoadOlder = useCallback(() => {
    if (!partnerId || loadingMore || !hasMore) return;
    console.log('[CHAT] Triggering load older messages');
    chat.loadOlderMessages(partnerId);
  }, [partnerId, loadingMore, hasMore, chat]);

  const handleScroll = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = offsetY;
    if (offsetY < 80 && !loadingMore && hasMore && partnerId) {
      console.log('[CHAT] Near top, triggering load older');
      chat.loadOlderMessages(partnerId);
    }
  }, [loadingMore, hasMore, partnerId, chat]);

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    const prevHeight = contentHeightRef.current;
    contentHeightRef.current = h;
    if (prevHeight > 0 && h > prevHeight && scrollOffsetRef.current < 50) {
      const diff = h - prevHeight;
      listRef.current?.scrollToOffset({ offset: diff, animated: false });
    }
  }, []);

  useEffect(() => {
    if (!partnerId || !justSentRef.current) return;
    justSentRef.current = false;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.fromUserId === 'me' && !lastMsg.read) {
      const delay = 8000 + Math.random() * 15000;
      const timer = setTimeout(() => {
        console.log('[CHAT] Simulating partner read');
        chat.simulatePartnerRead(partnerId);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [partnerId, messages.length]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const switchMode = useCallback((mode: InputMode) => {
    if (mode === inputMode) {
      if (mode === 'audio') {
        handleStartRecording();
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setInputMode(mode);
    const modeIndex = mode === 'image' ? 0 : mode === 'text' ? 1 : 2;
    Animated.spring(wheelSlideAnim, {
      toValue: modeIndex,
      useNativeDriver: false,
      tension: 65,
      friction: 9,
    }).start();
  }, [inputMode, wheelSlideAnim]);

  const startRecordingWaves = useCallback(() => {
    recordWaveAnims.forEach((anim, i) => {
      const baseDelay = i * 60;
      Animated.loop(
        Animated.sequence([
          Animated.delay(baseDelay),
          Animated.timing(anim, {
            toValue: 0.4 + Math.random() * 0.6,
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.25,
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [recordWaveAnims]);

  const stopRecordingWaves = useCallback(() => {
    recordWaveAnims.forEach((anim) => {
      anim.stopAnimation();
      Animated.timing(anim, { toValue: 0.15, duration: 300, useNativeDriver: true }).start();
    });
  }, [recordWaveAnims]);

  const startRecordingPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(recordPulseAnim, {
          toValue: 1.12,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recordPulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(recordRingAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recordRingAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(recordRing2Anim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recordRing2Anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(recordGlowAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(recordGlowAnim, {
          toValue: 0.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [recordPulseAnim, recordRingAnim, recordRing2Anim, recordGlowAnim]);

  const stopRecordingPulse = useCallback(() => {
    recordPulseAnim.stopAnimation();
    recordRingAnim.stopAnimation();
    recordRing2Anim.stopAnimation();
    recordGlowAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(recordPulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(recordRingAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(recordRing2Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(recordGlowAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [recordPulseAnim, recordRingAnim, recordRing2Anim, recordGlowAnim]);

  const handleStartRecording = useCallback(async () => {
    if (!partnerId || !canSend || editingMessage) return;

    try {
      console.log('[CHAT] Starting voice recording...');

      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
          };

          webRecorderRef.current = { mediaRecorder, chunks, stream };
          mediaRecorder.start();

          setIsRecording(true);
          setRecordingDuration(0);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          startRecordingPulse();
          startRecordingWaves();

          recordingTimerRef.current = setInterval(() => {
            setRecordingDuration((prev) => prev + 0.1);
          }, 100);

          console.log('[CHAT] Web recording started');
        } catch (e) {
          console.log('[CHAT] Web recording permission denied:', e);
          Alert.alert('Mikrofon', 'Bitte erlaube den Zugriff auf dein Mikrofon.');
        }
        return;
      }

      if (!AudioAV) {
        console.log('[CHAT] Native recorder not available');
        Alert.alert('Fehler', 'Sprachaufnahme ist nicht verfügbar.');
        return;
      }

      const permStatus = await AudioAV.requestPermissionsAsync();
      if (!permStatus.granted) {
        Alert.alert('Mikrofon', 'Bitte erlaube den Zugriff auf dein Mikrofon in den Einstellungen.');
        return;
      }

      await AudioAV.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true,
      });

      const recording = new AudioAV.Recording();
      await recording.prepareToRecordAsync(AudioAV.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      nativeRecorderRef.current = recording;

      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      startRecordingPulse();
      startRecordingWaves();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      console.log('[CHAT] Native recording started');
    } catch (e) {
      console.log('[CHAT] Start recording error:', e);
      Alert.alert('Fehler', 'Sprachaufnahme konnte nicht gestartet werden.');
      setIsRecording(false);
    }
  }, [partnerId, canSend, editingMessage, startRecordingPulse, startRecordingWaves]);

  const handleStopRecording = useCallback(async () => {
    if (!partnerId || !isRecording) return;

    try {
      console.log('[CHAT] Stopping voice recording, duration:', recordingDuration);
      stopRecordingPulse();
      stopRecordingWaves();

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (recordingDuration < 0.5) {
        console.log('[CHAT] Recording too short, discarding');
        setIsRecording(false);
        setRecordingDuration(0);
        if (Platform.OS === 'web' && webRecorderRef.current?.mediaRecorder) {
          webRecorderRef.current.mediaRecorder.stop();
        } else if (nativeRecorderRef.current) {
          try { await nativeRecorderRef.current.stopAndUnloadAsync(); nativeRecorderRef.current = null; } catch (_e) { /* ignore */ }
        }
        webRecorderRef.current = null;
        return;
      }

      let voiceUri = '';

      if (Platform.OS === 'web') {
        const { mediaRecorder, chunks, stream } = webRecorderRef.current || {};
        if (mediaRecorder) {
          await new Promise<void>((resolve) => {
            mediaRecorder.onstop = () => {
              stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
              resolve();
            };
            mediaRecorder.stop();
          });
          const blob = new Blob(chunks, { type: 'audio/webm' });
          voiceUri = URL.createObjectURL(blob);
          console.log('[CHAT] Web recording URI:', voiceUri);
        }
      } else if (nativeRecorderRef.current) {
        await nativeRecorderRef.current.stopAndUnloadAsync();
        voiceUri = nativeRecorderRef.current.getURI() ?? '';
        nativeRecorderRef.current = null;
        console.log('[CHAT] Native recording URI:', voiceUri);
      }

      webRecorderRef.current = null;
      setIsRecording(false);
      const finalDuration = recordingDuration;
      setRecordingDuration(0);

      if (voiceUri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.sequence([
          Animated.timing(sendFlashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(sendFlashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();

        justSentRef.current = true;
        await chat.sendVoiceMessage(partnerId, voiceUri, finalDuration);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
      }
    } catch (e) {
      console.log('[CHAT] Stop recording error:', e);
      setIsRecording(false);
      setRecordingDuration(0);
      webRecorderRef.current = null;
    }
  }, [partnerId, isRecording, recordingDuration, chat, stopRecordingPulse, stopRecordingWaves, sendFlashAnim]);

  const handleCancelRecording = useCallback(async () => {
    console.log('[CHAT] Cancelling recording');
    stopRecordingPulse();
    stopRecordingWaves();

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      if (Platform.OS === 'web' && webRecorderRef.current?.mediaRecorder) {
        webRecorderRef.current.stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        webRecorderRef.current.mediaRecorder.stop();
      } else if (nativeRecorderRef.current) {
        await nativeRecorderRef.current.stopAndUnloadAsync();
        nativeRecorderRef.current = null;
      }
    } catch (e) {
      console.log('[CHAT] Cancel recording cleanup error:', e);
    }

    webRecorderRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [stopRecordingPulse, stopRecordingWaves]);

  const toggleMenu = useCallback((msg: ChatMessage) => {
    const canModify = msg.fromUserId === 'me' && !msg.read && !msg.recalled;
    if (!canModify) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveMenuId((prev) => prev === msg.id ? null : msg.id);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || !partnerId) return;
    if (!canSend && !editingMessage) {
      Alert.alert('Nicht möglich', 'Du kannst dieser Person keine weitere Nachricht senden, bis sie deine Anfrage annimmt.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(sendFlashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(sendFlashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    if (editingMessage) {
      chat.editMessage(partnerId, editingMessage.id, input.trim());
      setEditingMessage(null);
    } else {
      justSentRef.current = true;
      chat.sendMessage(partnerId, input.trim());
    }
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  }, [input, partnerId, editingMessage, chat, canSend, sendFlashAnim]);

  const handleAcceptRequest = useCallback(() => {
    if (!partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    chat.acceptMessageRequest(partnerId);
  }, [partnerId, chat]);

  const handleDeclineRequest = useCallback(() => {
    if (!partnerId) return;
    Alert.alert('Anfrage ablehnen', 'Nachrichtenanfrage wirklich ablehnen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Ablehnen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          chat.declineMessageRequest(partnerId);
        },
      },
    ]);
  }, [partnerId, chat]);

  const handleBlockUser = useCallback(() => {
    if (!partnerId) return;
    Alert.alert(
      'Person sperren',
      `${partner?.displayName ?? 'Diese Person'} wird dich nicht mehr finden können – komplett unsichtbar.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperren',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            friendsCtx.blockUser(partnerId);
          },
        },
      ]
    );
  }, [partnerId, partner, friendsCtx]);

  const cancelEdit = useCallback(() => {
    setEditingMessage(null);
    setInput('');
  }, []);

  const handleEdit = useCallback((msg: ChatMessage) => {
    if (msg.isVoice) return;
    setEditingMessage(msg);
    setInput(msg.content);
    setActiveMenuId(null);
  }, []);

  const handleRecall = useCallback((msg: ChatMessage) => {
    if (!partnerId) return;
    setActiveMenuId(null);
    setTimeout(() => {
      Alert.alert(
        'Nachricht zurückziehen',
        'Möchtest du diese Nachricht wirklich zurückziehen?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Zurückziehen',
            style: 'destructive',
            onPress: () => {
              chat.recallMessage(partnerId, msg.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }, 100);
  }, [partnerId, chat]);

  const formatRecordingTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.fromUserId === 'me';
    const canModify = isMe && !item.read && !item.recalled;
    const isMenuOpen = activeMenuId === item.id;

    if (item.isSystem) {
      return (
        <View style={styles.systemMsgRow}>
          <View style={styles.systemMsgBubble}>
            <Camera size={12} color="#E53935" />
            <Text style={styles.systemMsgText}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.systemMsgTime, { color: colors.tertiaryText }]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      );
    }

    if (item.recalled) {
      return (
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
          <View style={styles.recalledBubble}>
            <Undo2 size={12} color="rgba(142,142,147,0.5)" />
            <Text style={styles.recalledText}>
              Nachricht zurückgezogen
            </Text>
          </View>
        </View>
      );
    }

    if (item.isVoice && item.voiceUri) {
      return (
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
          <Pressable
            onPress={() => toggleMenu(item)}
            onLongPress={() => toggleMenu(item)}
            delayLongPress={400}
            style={({ pressed }) => [
              styles.voiceBubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              pressed && { opacity: 0.85 },
            ]}
          >
            <VoiceMessageBubble
              voiceUri={item.voiceUri}
              duration={item.voiceDuration ?? 0}
              isMe={isMe}
            />
            <View style={styles.msgFooter}>
              <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.55)' : 'rgba(191,163,93,0.45)' }]}>
                {formatTimeAgo(item.createdAt)}
              </Text>
              {isMe && (
                <View style={styles.readIndicator}>
                  {item.read ? (
                    <CheckCheck size={14} color="#34B7F1" strokeWidth={2.5} />
                  ) : (
                    <Check size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                  )}
                </View>
              )}
            </View>
          </Pressable>

          {isMenuOpen && canModify && (
            <View style={[styles.inlineMenu, isMe ? styles.inlineMenuMe : styles.inlineMenuOther]}>
              <Pressable
                style={styles.inlineMenuBtn}
                onPress={() => handleRecall(item)}
              >
                <Undo2 size={13} color="#C06060" />
                <Text style={[styles.inlineMenuText, { color: '#C06060' }]}>Zurückziehen</Text>
              </Pressable>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        <Pressable
          onPress={() => toggleMenu(item)}
          onLongPress={() => toggleMenu(item)}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.msgBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : '#E8DCC8' }]}>
            {item.content}
          </Text>
          <View style={styles.msgFooter}>
            {item.edited && (
              <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.45)' : 'rgba(191,163,93,0.4)' }]}>
                bearbeitet
              </Text>
            )}
            <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.55)' : 'rgba(191,163,93,0.45)' }]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
            {isMe && (
              <View style={styles.readIndicator}>
                {item.read ? (
                  <CheckCheck size={14} color="#34B7F1" strokeWidth={2.5} />
                ) : (
                  <Check size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                )}
              </View>
            )}
          </View>
        </Pressable>

        {isMenuOpen && canModify && (
          <View style={[styles.inlineMenu, isMe ? styles.inlineMenuMe : styles.inlineMenuOther]}>
            <Pressable
              style={styles.inlineMenuBtn}
              onPress={() => handleEdit(item)}
            >
              <Pencil size={13} color="#BFA35D" />
              <Text style={[styles.inlineMenuText, { color: '#BFA35D' }]}>Bearbeiten</Text>
            </Pressable>
            <Pressable
              style={styles.inlineMenuBtn}
              onPress={() => handleRecall(item)}
            >
              <Undo2 size={13} color="#C06060" />
              <Text style={[styles.inlineMenuText, { color: '#C06060' }]}>Zurückziehen</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }, [activeMenuId, colors, toggleMenu, handleEdit, handleRecall]);

  const wheelWidth = SCREEN_WIDTH - 32;
  const segmentWidth = (wheelWidth - 8) / 3;
  const wheelIndicatorLeft = wheelSlideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [4, 4 + segmentWidth, 4 + segmentWidth * 2],
  });

  const getModeIcon = (modeKey: InputMode, isActive: boolean) => {
    const color = isActive ? '#1a1a1a' : 'rgba(191,163,93,0.45)';
    const size = 15;
    switch (modeKey) {
      case 'image': return <ImagePlus size={size} color={color} strokeWidth={2.2} />;
      case 'text': return <Type size={size} color={color} strokeWidth={2.2} />;
      case 'audio': return <Mic size={size} color={color} strokeWidth={2.2} />;
    }
  };

  const renderCommandWheel = () => {
    return (
      <View style={styles.commandWheelWrap}>
        <View style={[styles.commandWheel, { width: wheelWidth }]}>
          <View style={styles.commandWheelTrack}>
            <View style={styles.commandWheelNotches}>
              {[...Array(14)].map((_, i) => (
                <View key={i} style={styles.commandWheelNotch} />
              ))}
            </View>
          </View>

          <Animated.View
            style={[
              styles.commandWheelIndicator,
              {
                width: segmentWidth,
                left: wheelIndicatorLeft,
              },
            ]}
          >
            <LinearGradient
              colors={['#D4B96A', '#BFA35D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.commandWheelIndicatorGradient}
            />
          </Animated.View>

          {MODES.map((mode) => {
            const isActive = inputMode === mode.key;
            return (
              <Pressable
                key={mode.key}
                onPress={() => switchMode(mode.key)}
                style={[styles.commandWheelBtn, { width: segmentWidth }]}
                testID={`mode-${mode.key}-btn`}
              >
                {getModeIcon(mode.key, isActive)}
                <Text
                  style={[
                    styles.commandWheelLabel,
                    { color: isActive ? '#1a1a1a' : 'rgba(191,163,93,0.45)' },
                    isActive && styles.commandWheelLabelActive,
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderRecordingUI = () => {
    const ring1Scale = recordRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.8],
    });
    const ring1Opacity = recordRingAnim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.4, 0.15, 0],
    });
    const ring2Scale = recordRing2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.4],
    });
    const ring2Opacity = recordRing2Anim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.3, 0.1, 0],
    });

    return (
      <View style={styles.recordingPanel}>
        <View style={styles.recordingTopRow}>
          <Pressable
            onPress={handleCancelRecording}
            style={styles.recordCancelBtn}
            testID="cancel-record-btn"
          >
            <Trash2 size={18} color="#C06060" />
          </Pressable>

          <View style={styles.recordingTimerWrap}>
            <View style={styles.recordingDotLive} />
            <Text style={styles.recordingTimerText}>
              {formatRecordingTime(recordingDuration)}
            </Text>
          </View>

          <Pressable
            onPress={handleStopRecording}
            style={styles.recordSendBtn}
            testID="stop-record-btn"
          >
            <LinearGradient
              colors={['#D4B96A', '#BFA35D']}
              style={styles.recordSendBtnGradient}
            >
              <Send size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.recordingVisualizerWrap}>
          <View style={styles.circularWaveContainer}>
            <Animated.View
              style={[
                styles.recordingRing,
                { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.recordingRing2,
                { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
              ]}
            />

            <Animated.View
              style={[
                styles.recordingOrb,
                { transform: [{ scale: recordPulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={['#D4B96A', '#BFA35D', '#A88D45']}
                style={styles.recordingOrbGradient}
              >
                <Mic size={26} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </View>

          <View style={styles.circularWaveBars}>
            {recordWaveAnims.map((anim, i) => {
              const angle = (i / WAVE_COUNT) * 360;
              const rad = (angle * Math.PI) / 180;
              const radius = 58;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.circularWaveBar,
                    {
                      transform: [
                        { translateX: x },
                        { translateY: y },
                        { rotate: `${angle + 90}deg` },
                        { scaleY: anim },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Text style={styles.recordingHint}>Aufnahme läuft...</Text>
      </View>
    );
  };

  const renderInputArea = () => {
    if (isPartnerBlocked) {
      return (
        <View style={[styles.blockedBar, { paddingBottom: insets.bottom + 6 }]}>
          <Ban size={16} color="#8e8e93" />
          <Text style={styles.blockedText}>Diese Person ist gesperrt</Text>
        </View>
      );
    }

    if (!canSend && !isFriend) {
      return (
        <View style={[styles.blockedBar, { paddingBottom: insets.bottom + 6 }]}>
          <Text style={styles.blockedText}>Warte auf Annahme deiner Nachrichtenanfrage</Text>
        </View>
      );
    }

    if (isRecording) {
      return (
        <View style={{ paddingBottom: insets.bottom + 4 }}>
          {renderRecordingUI()}
        </View>
      );
    }

    return (
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 4 }]}>
        {editingMessage && (
          <View style={styles.editBanner}>
            <Pencil size={13} color="#BFA35D" />
            <View style={styles.editBannerContent}>
              <Text style={styles.editBannerTitle}>Nachricht bearbeiten</Text>
              <Text style={styles.editBannerText} numberOfLines={1}>
                {editingMessage.content}
              </Text>
            </View>
            <Pressable onPress={cancelEdit} hitSlop={8}>
              <X size={16} color="#8e8e93" />
            </Pressable>
          </View>
        )}

        {renderCommandWheel()}

        {inputMode === 'text' ? (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={!isFriend && !canSend ? 'Anfrage ausstehend...' : 'Nachricht schreiben...'}
              placeholderTextColor="rgba(142,142,147,0.5)"
              value={input}
              onChangeText={setInput}
              maxLength={2000}
              editable={canSend || !!editingMessage}
              multiline
              testID="direct-chat-input"
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: input.trim() && (canSend || editingMessage) ? '#BFA35D' : 'rgba(60,60,64,0.6)',
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
              onPress={handleSend}
              disabled={!input.trim() || (!canSend && !editingMessage)}
              testID="direct-send-btn"
            >
              {editingMessage ? (
                <Check size={18} color={input.trim() ? '#FFFFFF' : '#636366'} />
              ) : (
                <Send size={18} color={input.trim() && canSend ? '#FFFFFF' : '#636366'} />
              )}
            </Pressable>
          </View>
        ) : inputMode === 'audio' ? (
          <View style={styles.audioInputRow}>
            <Pressable
              onPress={handleStartRecording}
              style={({ pressed }) => [
                styles.audioRecordBtn,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
              testID="mic-btn"
            >
              <LinearGradient
                colors={['#D4B96A', '#BFA35D', '#A88D45']}
                style={styles.audioRecordBtnInner}
              >
                <Mic size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
            <Text style={styles.audioReadyText}>Tippe zum Aufnehmen</Text>
          </View>
        ) : (
          <View style={styles.imageInputRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Bild', 'Bildversand kommt bald!');
              }}
              style={({ pressed }) => [
                styles.imagePickBtn,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
              testID="image-btn"
            >
              <LinearGradient
                colors={['#D4B96A', '#BFA35D', '#A88D45']}
                style={styles.imagePickBtnInner}
              >
                <ImagePlus size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
            <Text style={styles.audioReadyText}>Bild senden</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#161618']}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerDecor}>
            <View style={styles.headerDecoLine1} />
            <View style={styles.headerDecoLine2} />
          </View>

          <View style={styles.headerContent}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={12}
            >
              <ChevronLeft size={22} color="#BFA35D" />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {partner?.displayName ?? 'Chat'}
              </Text>
              {partner && (
                <View style={styles.headerStatusRow}>
                  <View style={[styles.headerStatusDot, isFriend && styles.headerStatusDotOnline]} />
                  <Text style={styles.headerSubtitle}>
                    {isFriend ? 'Freund' : 'Nachricht'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {isRequest && messages.some((m) => m.toUserId === 'me') && (
            <View style={styles.requestBanner}>
              <ShieldAlert size={18} color="#BFA35D" />
              <View style={styles.requestBannerText}>
                <Text style={styles.requestTitle}>Nachrichtenanfrage</Text>
                <Text style={styles.requestSubtitle}>
                  {partner?.displayName} ist nicht in deiner Freundesliste. Wenn du annimmst, kann diese Person dir frei Nachrichten senden.
                </Text>
              </View>
            </View>
          )}

          {isRequest && messages.some((m) => m.toUserId === 'me') && (
            <View style={styles.requestActionBar}>
              <Pressable
                style={styles.requestAcceptBtn}
                onPress={handleAcceptRequest}
              >
                <UserCheck size={16} color="#FFFFFF" />
                <Text style={styles.requestAcceptBtnText}>Annehmen</Text>
              </Pressable>
              <Pressable
                style={styles.requestDeclineBtn}
                onPress={handleDeclineRequest}
              >
                <Text style={styles.requestDeclineBtnText}>Ablehnen</Text>
              </Pressable>
              <Pressable
                style={styles.requestBlockBtn}
                onPress={handleBlockUser}
              >
                <Ban size={14} color="#C06060" />
              </Pressable>
            </View>
          )}

          <FlatList
            ref={listRef}
            data={messages}
            extraData={activeMenuId}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListHeaderComponent={
              hasMore ? (
                <Pressable
                  onPress={handleLoadOlder}
                  disabled={loadingMore}
                  style={styles.loadMoreWrap}
                >
                  {loadingMore ? (
                    <Animated.View style={{
                      transform: [{
                        rotate: spinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    }}>
                      <Loader2 size={18} color="rgba(191,163,93,0.5)" />
                    </Animated.View>
                  ) : (
                    <Text style={styles.loadMoreText}>Ältere Nachrichten laden</Text>
                  )}
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <MessageSquare size={28} color="rgba(191,163,93,0.2)" />
                </View>
                <Text style={styles.emptyText}>
                  {isPartnerBlocked ? 'Person gesperrt' : 'Sag Hallo! 👋'}
                </Text>
              </View>
            }
            renderItem={renderMessage}
          />

          {renderInputArea()}
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111113',
  },
  header: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.08)',
  },
  headerDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  headerDecoLine1: {
    position: 'absolute',
    left: -30,
    right: -30,
    top: '40%',
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.04)',
    transform: [{ rotate: '-3deg' }],
  },
  headerDecoLine2: {
    position: 'absolute',
    left: -30,
    right: -30,
    top: '70%',
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.03)',
    transform: [{ rotate: '2deg' }],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    letterSpacing: 0.2,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(142,142,147,0.3)',
  },
  headerStatusDotOnline: {
    backgroundColor: '#4CAF50',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  headerRight: {
    width: 38,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#111113',
  },
  listContent: {
    padding: 14,
    paddingBottom: 8,
  },
  msgRow: {
    marginBottom: 8,
  },
  msgRowMe: {
    alignItems: 'flex-end',
  },
  msgRowOther: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voiceBubble: {
    maxWidth: '80%',
    minWidth: 210,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#BFA35D',
    borderBottomRightRadius: 6,
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleOther: {
    backgroundColor: '#222226',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  recalledBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(142,142,147,0.12)',
    borderStyle: 'dashed' as const,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recalledText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    color: 'rgba(142,142,147,0.5)',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic' as const,
  },
  msgTime: {
    fontSize: 10,
  },
  readIndicator: {
    marginLeft: 1,
  },
  loadMoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 8,
  },
  loadMoreText: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.45)',
    letterSpacing: 0.3,
    fontWeight: '500' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(191,163,93,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(142,142,147,0.5)',
  },
  inlineMenu: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  inlineMenuMe: {
    justifyContent: 'flex-end',
  },
  inlineMenuOther: {
    justifyContent: 'flex-start',
  },
  inlineMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1e1e22',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  inlineMenuText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  inputArea: {
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
    backgroundColor: 'rgba(191,163,93,0.03)',
  },
  editBannerContent: {
    flex: 1,
  },
  editBannerTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#BFA35D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  editBannerText: {
    fontSize: 13,
    marginTop: 2,
    color: '#8e8e93',
  },
  commandWheelWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  commandWheel: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1e',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  commandWheelTrack: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  commandWheelNotches: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  commandWheelNotch: {
    width: 1,
    height: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderRadius: 1,
  },
  commandWheelIndicator: {
    position: 'absolute',
    top: 3,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  commandWheelIndicatorGradient: {
    flex: 1,
    borderRadius: 18,
  },
  commandWheelBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 2,
  },
  commandWheelLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  commandWheelLabelActive: {
    fontWeight: '700' as const,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#1e1e22',
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioInputRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  imageInputRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  imagePickBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  imagePickBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  audioReadyText: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.35)',
    letterSpacing: 0.3,
  },
  audioRecordBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  audioRecordBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recordingPanel: {
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.1)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
  },
  recordingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  recordCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(192,96,96,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDotLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  recordingTimerText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 1.5,
  },
  recordSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  recordSendBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  recordingVisualizerWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  circularWaveContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  recordingRing2: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  recordingOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  recordingOrbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  circularWaveBars: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularWaveBar: {
    position: 'absolute',
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.4)',
  },
  recordingHint: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.35)',
    letterSpacing: 0.3,
  },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  blockedText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8e8e93',
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
    backgroundColor: 'rgba(191,163,93,0.03)',
  },
  requestBannerText: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
    color: '#E8DCC8',
  },
  requestSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8e8e93',
  },
  requestActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
    backgroundColor: '#161618',
  },
  requestAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
  },
  requestAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  requestDeclineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  requestDeclineBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  requestBlockBtn: {
    padding: 9,
    marginLeft: 'auto',
  },
  systemMsgRow: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  systemMsgBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(229,57,53,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.12)',
  },
  systemMsgText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#E53935',
    flexShrink: 1,
  },
  systemMsgTime: {
    fontSize: 10,
    marginTop: 3,
  },
});
