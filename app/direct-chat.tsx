import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Text,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader2, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useChat } from '@/providers/ChatProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { getUserById } from '@/lib/utils';
import type { ChatMessage } from '@/constants/types';
import * as Haptics from 'expo-haptics';
import { trackRender, measureSinceBoot } from '@/lib/perf';

import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessageItem from '@/components/chat/ChatMessageItem';
import ChatInputArea from '@/components/chat/ChatInputArea';
import { useAlert } from '@/providers/AlertProvider';

let ScreenCapture: any = null;
try {
  if (Platform.OS !== 'web') {
    ScreenCapture = require('expo-screen-capture');
  }
} catch (e) {
  console.log('[CHAT] expo-screen-capture not available:', e);
}

const WAVE_COUNT = 12;

let AudioAV: any = null;
if (Platform.OS !== 'web') {
  try {
    AudioAV = require('expo-av').Audio;
  } catch (e) {
    console.log('[CHAT] expo-av not available:', e);
  }
}

export default function DirectChatScreen() {
  trackRender('DirectChatScreen');
  measureSinceBoot('DirectChatScreen_render');
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const chat = useChat();
  const friendsCtx = useFriends();
  const [input, setInput] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
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

  const hasIncomingRequest = isRequest && messages.some((m) => m.toUserId === 'me');

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
          showAlert('Mikrofon', 'Bitte erlaube den Zugriff auf dein Mikrofon.');
        }
        return;
      }

      if (!AudioAV) {
        console.log('[CHAT] Native recorder not available');
        showAlert('Fehler', 'Sprachaufnahme ist nicht verfügbar.');
        return;
      }

      const permStatus = await AudioAV.requestPermissionsAsync();
      if (!permStatus.granted) {
        showAlert('Mikrofon', 'Bitte erlaube den Zugriff auf dein Mikrofon in den Einstellungen.');
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
      showAlert('Fehler', 'Sprachaufnahme konnte nicht gestartet werden.');
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
      showAlert('Nicht möglich', 'Du kannst dieser Person keine weitere Nachricht senden, bis sie deine Anfrage annimmt.');
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
    showAlert('Anfrage ablehnen', 'Nachrichtenanfrage wirklich ablehnen?', [
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
    showAlert(
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
      showAlert(
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

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    return (
      <ChatMessageItem
        item={item}
        activeMenuId={activeMenuId}
        tertiaryTextColor={colors.tertiaryText}
        onToggleMenu={toggleMenu}
        onEdit={handleEdit}
        onRecall={handleRecall}
      />
    );
  }, [activeMenuId, colors.tertiaryText, toggleMenu, handleEdit, handleRecall]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ChatHeader
          partnerName={partner?.displayName ?? 'Chat'}
          isFriend={isFriend}
          onBack={() => router.back()}
          topInset={insets.top}
        />

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
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

          <ChatInputArea
            partnerId={partnerId ?? ''}
            isPartnerBlocked={isPartnerBlocked}
            isFriend={isFriend}
            canSend={canSend}
            isRequest={isRequest}
            hasIncomingRequest={hasIncomingRequest}
            editingMessage={editingMessage}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onCancelEdit={cancelEdit}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onBlockUser={handleBlockUser}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onCancelRecording={handleCancelRecording}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            bottomInset={insets.bottom}
            recordPulseAnim={recordPulseAnim}
            recordRingAnim={recordRingAnim}
            recordRing2Anim={recordRing2Anim}
            recordWaveAnims={recordWaveAnims}
            partnerName={partner?.displayName}
          />
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
  chatArea: {
    flex: 1,
    backgroundColor: '#111113',
  },
  listContent: {
    padding: 14,
    paddingBottom: 8,
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
});
