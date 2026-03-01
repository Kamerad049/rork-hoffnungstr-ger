import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Alert,
  RefreshControl,
  PanResponder,
  Dimensions,
  Modal,
  Easing,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  BellOff,
  Play,
  Pause,
  Trash2,
  CheckCheck,
  Mic,
  Clock,
  Volume2,
  MessageCircle,
  Check,
  Undo2,
  Plus,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useNotifications, type InboxNotification } from '@/providers/NotificationProvider';
import { useChat } from '@/providers/ChatProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { Conversation } from '@/constants/types';
import * as Haptics from 'expo-haptics';


type TabKey = 'chats' | 'anfragen' | 'heldentum';

function formatNotifTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min`;
  if (diffH < 24) return `vor ${diffH} Std`;
  if (diffD < 7) return `vor ${diffD} Tag${diffD > 1 ? 'en' : ''}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function AudioPlayer({ uri, duration, colors }: { uri: string; duration: number; colors: any }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.pause(); } catch (e) { console.log('[AUDIO] cleanup error:', e); }
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, pulseAnim]);

  const toggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isPlaying) {
        if (playerRef.current) playerRef.current.pause();
        setIsPlaying(false);
        return;
      }
      if (Platform.OS === 'web') {
        const audio = new Audio(uri);
        playerRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        await audio.play();
        setIsPlaying(true);
      } else {
        const { Audio } = require('expo-av');
        if (playerRef.current) {
          await playerRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );
        playerRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    } catch (e) {
      console.log('[AUDIO] play error:', e);
      setIsPlaying(false);
    }
  }, [isPlaying, uri]);

  return (
    <Pressable style={[styles.audioRow, { backgroundColor: 'rgba(191,163,93,0.08)' }]} onPress={toggle}>
      <View style={[styles.audioPlayBtn, { backgroundColor: colors.accent }]}>
        {isPlaying ? <Pause size={14} color="#1c1c1e" /> : <Play size={14} color="#1c1c1e" />}
      </View>
      <View style={styles.audioWaveform}>
        {Array.from({ length: 20 }).map((_, i) => {
          const h = Math.sin(i * 0.8) * 8 + 10;
          return (
            <Animated.View
              key={i}
              style={[
                styles.audioBar,
                {
                  height: h,
                  backgroundColor: isPlaying ? colors.accent : 'rgba(191,163,93,0.35)',
                  opacity: isPlaying ? pulseAnim : 1,
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.audioDuration, { color: colors.tertiaryText }]}>
        {formatDuration(duration)}
      </Text>
    </Pressable>
  );
}

function NotificationItem({
  item,
  colors,
  onRead,
  onDelete,
}: {
  item: InboxNotification;
  colors: any;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handlePress = useCallback(() => {
    if (!item.read) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRead(item.id);
    }
  }, [item.id, item.read, onRead]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Löschen', 'Nachricht wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }, [item.id, onDelete]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={[
          styles.notifCard,
          {
            backgroundColor: item.read ? colors.surface : 'rgba(191,163,93,0.06)',
            borderLeftColor: item.read ? 'transparent' : colors.accent,
            borderLeftWidth: item.read ? 0 : 3,
          },
        ]}
        onPress={handlePress}
        testID={`notification-${item.id}`}
      >
        <View style={styles.notifHeader}>
          <View style={[styles.notifIconCircle, { backgroundColor: item.read ? colors.surfaceSecondary : 'rgba(191,163,93,0.15)' }]}>
            {item.audioUri ? (
              <Volume2 size={18} color={item.read ? colors.tertiaryText : colors.accent} />
            ) : (
              <Bell size={18} color={item.read ? colors.tertiaryText : colors.accent} />
            )}
          </View>
          <View style={styles.notifTitleRow}>
            <Text
              style={[
                styles.notifTitle,
                { color: colors.primaryText, fontWeight: item.read ? ('500' as const) : ('700' as const) },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View style={styles.timeBadge}>
              <Clock size={10} color={colors.tertiaryText} />
              <Text style={[styles.timeText, { color: colors.tertiaryText }]}>
                {formatNotifTimeAgo(item.sentAt)}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleDelete} hitSlop={12} style={styles.deleteBtn}>
            <Trash2 size={16} color={colors.tertiaryText} />
          </Pressable>
        </View>

        {item.message ? (
          <Text
            style={[styles.notifMessage, { color: item.read ? colors.tertiaryText : colors.matteText }]}
            numberOfLines={3}
          >
            {item.message}
          </Text>
        ) : null}

        {item.audioUri ? (
          <AudioPlayer uri={item.audioUri} duration={item.audioDuration} colors={colors} />
        ) : null}

        {!item.read && (
          <View style={styles.unreadDot}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const SWIPE_HINT_KEY = 'chat_delete_hint_dismissed';
const DELETE_ZONE_WIDTH = 80;
const TIMER_SECONDS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;

function SwipeableChatItem({
  item,
  colors,
  onPress,
  onDelete,
  onShowHint,
  hintDismissed,
}: {
  item: Conversation;
  colors: any;
  onPress: (partnerId: string) => void;
  onDelete: (partnerId: string) => void;
  onShowHint: () => void;
  hintDismissed: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const timerProgress = useRef(new Animated.Value(0)).current;
  const trashScale = useRef(new Animated.Value(1)).current;
  const rowHeight = useRef(new Animated.Value(86)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const timerRunningRef = useRef(false);
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deletingRef = useRef(false);
  const isSwipingRef = useRef(false);
  const hintTriggeredRef = useRef(false);

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  const onShowHintRef = useRef(onShowHint);
  onShowHintRef.current = onShowHint;
  const hintDismissedRef = useRef(hintDismissed);
  hintDismissedRef.current = hintDismissed;

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (timerAnimRef.current) timerAnimRef.current.stop();
    };
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerAnimRef.current) {
      timerAnimRef.current.stop();
      timerAnimRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    timerRunningRef.current = false;
    setCountdown(null);
    timerProgress.setValue(0);
  }, [timerProgress]);

  const executeDelete = useCallback(() => {
    deletingRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(trashScale, { toValue: 1.5, duration: 120, useNativeDriver: false }),
      Animated.timing(trashScale, { toValue: 1, duration: 80, useNativeDriver: false }),
    ]).start();

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(rowOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(rowHeight, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start(() => {
        onDeleteRef.current(item.partnerId);
      });
    });

    setCountdown(null);
  }, [item.partnerId, translateX, trashScale, rowHeight, rowOpacity]);

  const startTimer = useCallback(() => {
    if (timerRunningRef.current || deletingRef.current) return;
    timerRunningRef.current = true;
    setCountdown(TIMER_SECONDS);
    timerProgress.setValue(0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    let remaining = TIMER_SECONDS;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdown(0);
      }
    }, 1000);

    const anim = Animated.timing(timerProgress, {
      toValue: 1,
      duration: TIMER_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    timerAnimRef.current = anim;

    anim.start(({ finished }) => {
      timerRunningRef.current = false;
      timerAnimRef.current = null;
      if (finished) {
        executeDelete();
      }
    });
  }, [timerProgress, executeDelete]);

  const snapToClose = useCallback(() => {
    cancelTimer();
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      speed: 28,
      bounciness: 4,
    }).start();
  }, [translateX, cancelTimer]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (deletingRef.current) return false;
        return Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 8;
      },
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (deletingRef.current) return false;
        return Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 14;
      },
      onPanResponderGrant: () => {
        isSwipingRef.current = true;
        hintTriggeredRef.current = false;
        translateX.stopAnimation();
        translateX.setOffset(0);
        translateX.setValue(0);
        if (timerRunningRef.current) {
          if (timerAnimRef.current) { timerAnimRef.current.stop(); timerAnimRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          timerRunningRef.current = false;
        }
      },
      onPanResponderMove: (_, gs) => {
        const clamped = Math.min(0, Math.max(-DELETE_ZONE_WIDTH, gs.dx));
        translateX.setValue(clamped);

        if (!hintDismissedRef.current && !hintTriggeredRef.current && gs.dx < -30) {
          hintTriggeredRef.current = true;
          onShowHintRef.current();
        }
      },
      onPanResponderRelease: (_, gs) => {
        translateX.flattenOffset();
        isSwipingRef.current = false;

        if (hintTriggeredRef.current) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: false, speed: 28, bounciness: 4 }).start();
          return;
        }

        if (gs.vx < -0.3 || gs.dx < -DELETE_ZONE_WIDTH * 0.4) {
          Animated.spring(translateX, {
            toValue: -DELETE_ZONE_WIDTH,
            useNativeDriver: false,
            speed: 28,
            bounciness: 4,
          }).start(() => {
            if (!timerRunningRef.current && !deletingRef.current) {
              startTimer();
            }
          });
        } else {
          cancelTimer();
          Animated.spring(translateX, { toValue: 0, useNativeDriver: false, speed: 28, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        isSwipingRef.current = false;
        cancelTimer();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false, speed: 28, bounciness: 4 }).start();
      },
      onPanResponderTerminationRequest: () => !isSwipingRef.current,
    }),
  [translateX, cancelTimer, startTimer]);

  const partner = getUserById(item.partnerId);
  if (!partner) return null;
  const initial = partner.displayName.charAt(0).toUpperCase();

  const progressWidth = timerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressColor = timerProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [colors.red ?? '#C06060', '#E07040', '#40B060'],
  });

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_ZONE_WIDTH, -20, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ height: rowHeight, opacity: rowOpacity, overflow: 'hidden' as const, marginBottom: 8 }}>
      <View style={styles.swipeContainer}>
        <Animated.View
          style={[
            styles.deleteAction,
            { backgroundColor: colors.red ?? '#C06060', opacity: deleteOpacity },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: trashScale }], alignItems: 'center' as const }}>
            <Trash2 size={22} color="#FFFFFF" />
            {countdown !== null && countdown > 0 && (
              <Text style={styles.timerCountdownText}>{countdown}</Text>
            )}
            {countdown === 0 && (
              <Text style={styles.timerDoneText}>✓</Text>
            )}
          </Animated.View>
          {countdown !== null && (
            <View style={styles.timerBarBg}>
              <Animated.View
                style={[
                  styles.timerBarFill,
                  { width: progressWidth, backgroundColor: progressColor },
                ]}
              />
            </View>
          )}
        </Animated.View>
        <Animated.View
          style={[styles.chatSlider, { transform: [{ translateX }], backgroundColor: colors.surface }]}
          {...panResponder.panHandlers}
        >
          <Pressable
            style={[styles.chatItem, { backgroundColor: colors.surface }]}
            onPress={() => {
              if (deletingRef.current) return;
              onPress(item.partnerId);
            }}
          >
            {partner.avatarUrl ? (
              <Image source={{ uri: partner.avatarUrl }} style={[styles.chatAvatar, { backgroundColor: colors.accent }]} />
            ) : (
              <View style={[styles.chatAvatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.chatAvatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.chatInfo}>
              <View style={styles.chatTopRow}>
                <Text style={[styles.chatName, { color: colors.primaryText }]} numberOfLines={1}>
                  {partner.displayName}
                </Text>
                <Text style={[styles.chatTime, { color: colors.tertiaryText }]}>
                  {formatTimeAgo(item.lastMessageTime)}
                </Text>
              </View>
              <View style={styles.chatBottomRow}>
                <View style={styles.previewRow}>
                  {item.isFromMe && !item.lastMessageRecalled && (
                    <View style={styles.statusIcon}>
                      {item.lastMessageRead ? (
                        <CheckCheck size={14} color="#34B7F1" strokeWidth={2.5} />
                      ) : (
                        <Check size={14} color={colors.tertiaryText} strokeWidth={2.5} />
                      )}
                    </View>
                  )}
                  {item.lastMessageRecalled && item.isFromMe && (
                    <View style={styles.statusIcon}>
                      <Undo2 size={12} color={colors.tertiaryText} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.chatPreview,
                      { color: item.unreadCount > 0 ? colors.primaryText : colors.tertiaryText },
                      item.unreadCount > 0 && styles.chatPreviewBold,
                      item.lastMessageRecalled && styles.chatPreviewItalic,
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('chats');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(false);
  const [hintDismissed, setHintDismissed] = useState<boolean>(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState<boolean>(false);
  const hintFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(SWIPE_HINT_KEY).then((val) => {
      if (val) setHintDismissed(true);
    });
  }, []);

  const { conversations, messageRequests, acceptMessageRequest, declineMessageRequest, deleteConversation } = useChat();
  const { blockUser } = useFriends();
  const { notifications, unreadCount: notifUnreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();

  const chatUnreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  const requestCount = useMemo(() => messageRequests.length, [messageRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleChatPress = useCallback(
    (partnerId: string) => {
      router.push({ pathname: '/direct-chat', params: { partnerId } } as any);
    },
    [router],
  );

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile/friends' as any);
  }, [router]);

  const handleAcceptRequest = useCallback((userId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptMessageRequest(userId);
  }, [acceptMessageRequest]);

  const handleDeclineRequest = useCallback((userId: string) => {
    Alert.alert('Anfrage ablehnen', 'Nachrichtenanfrage wirklich ablehnen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Ablehnen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          declineMessageRequest(userId);
        },
      },
    ]);
  }, [declineMessageRequest]);

  const handleBlockFromRequest = useCallback((userId: string) => {
    const partner = getUserById(userId);
    Alert.alert(
      'Person sperren',
      `${partner?.displayName ?? 'Diese Person'} wird dich nicht mehr finden, deine Storys, Beiträge und Bewertungen nicht sehen können – komplett unsichtbar.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperren',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            blockUser(userId);
          },
        },
      ]
    );
  }, [blockUser]);

  const handleMarkAllRead = useCallback(() => {
    if (notifUnreadCount === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllAsRead();
  }, [notifUnreadCount, markAllAsRead]);

  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) return;
    Alert.alert('Alle löschen', 'Alle HELDENTUM Nachrichten löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          clearAll();
        },
      },
    ]);
  }, [notifications.length, clearAll]);

  const handleOpenRequest = useCallback(
    (partnerId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/direct-chat', params: { partnerId } } as any);
    },
    [router],
  );

  const renderRequestItem = useCallback(
    ({ item }: { item: Conversation }) => {
      const partner = getUserById(item.partnerId);
      if (!partner) return null;
      const initial = partner.displayName.charAt(0).toUpperCase();

      return (
        <View style={[styles.requestCard, { backgroundColor: colors.surface }]}>
          <Pressable
            style={styles.requestHeader}
            onPress={() => handleOpenRequest(item.partnerId)}
          >
            {partner.avatarUrl ? (
              <Image source={{ uri: partner.avatarUrl }} style={[styles.chatAvatar, { backgroundColor: 'rgba(191,163,93,0.25)' }]} />
            ) : (
              <View style={[styles.chatAvatar, { backgroundColor: 'rgba(191,163,93,0.25)' }]}>
                <Text style={[styles.chatAvatarText, { color: colors.accent }]}>{initial}</Text>
              </View>
            )}
            <View style={styles.chatInfo}>
              <Text style={[styles.chatName, { color: colors.primaryText }]} numberOfLines={1}>
                {partner.displayName}
              </Text>
              <Text style={[styles.chatPreview, { color: colors.tertiaryText }]} numberOfLines={2}>
                {item.lastMessage}
              </Text>
              <Text style={[styles.requestTime, { color: colors.tertiaryText }]}>
                {formatTimeAgo(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.requestOpenIcon}>
              <MessageCircle size={18} color={colors.accent} />
            </View>
          </Pressable>
          <View style={styles.requestActions}>
            <Pressable
              style={[styles.requestAcceptBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleAcceptRequest(item.partnerId)}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.requestAcceptText}>Annehmen</Text>
            </Pressable>
            <Pressable
              style={[styles.requestDeclineBtn, { backgroundColor: colors.surfaceSecondary ?? colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => handleDeclineRequest(item.partnerId)}
            >
              <Text style={[styles.requestDeclineText, { color: colors.tertiaryText }]}>Ablehnen</Text>
            </Pressable>
            <Pressable
              style={[styles.requestBlockBtn]}
              onPress={() => handleBlockFromRequest(item.partnerId)}
            >
              <Text style={[styles.requestBlockText, { color: colors.red }]}>Sperren</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.requestReadLink}
            onPress={() => handleOpenRequest(item.partnerId)}
          >
            <Text style={[styles.requestReadLinkText, { color: colors.accent }]}>Nachricht lesen →</Text>
          </Pressable>
          <Text style={[styles.requestHint, { color: colors.tertiaryText }]}>
            Wenn du annimmst, kann diese Person dir ohne erneutes Nachfragen Nachrichten senden.
          </Text>
        </View>
      );
    },
    [colors, handleAcceptRequest, handleDeclineRequest, handleBlockFromRequest, handleOpenRequest],
  );

  const handleDeleteConversation = useCallback((partnerId: string) => {
    console.log('[MESSAGES] Chat deleted via timer:', partnerId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteConversation(partnerId);
  }, [deleteConversation]);

  const handleShowSwipeHint = useCallback(() => {
    setShowSwipeHint(true);
    hintFade.setValue(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.timing(hintFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [hintFade]);

  const dismissSwipeHint = useCallback(() => {
    setHintDismissed(true);
    if (dontShowAgainChecked) {
      AsyncStorage.setItem(SWIPE_HINT_KEY, 'true');
    }
    Animated.timing(hintFade, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSwipeHint(false);
      setDontShowAgainChecked(false);
    });
  }, [hintFade, dontShowAgainChecked]);

  const renderChatItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <SwipeableChatItem
        item={item}
        colors={colors}
        onPress={handleChatPress}
        onDelete={handleDeleteConversation}
        onShowHint={handleShowSwipeHint}
        hintDismissed={hintDismissed}
      />
    ),
    [colors, handleChatPress, handleDeleteConversation, handleShowSwipeHint, hintDismissed],
  );

  const renderNotifItem = useCallback(
    ({ item }: { item: InboxNotification }) => (
      <NotificationItem
        item={item}
        colors={colors}
        onRead={markAsRead}
        onDelete={deleteNotification}
      />
    ),
    [colors, markAsRead, deleteNotification],
  );

  const ChatEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MessageCircle size={48} color={colors.tertiaryText} />
        <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine Chats</Text>
        <Text style={[styles.emptySubtitle, { color: colors.tertiaryText }]}>
          Schreibe deinen Freunden eine Nachricht!
        </Text>
      </View>
    ),
    [colors],
  );

  const NotifEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <BellOff size={48} color={colors.tertiaryText} />
        <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine Nachrichten</Text>
        <Text style={[styles.emptySubtitle, { color: colors.tertiaryText }]}>
          Wenn HELDENTUM dir eine Nachricht{'\n'}schickt, erscheint sie hier.
        </Text>
      </View>
    ),
    [colors],
  );

  const NotifHeader = useCallback(() => {
    if (notifications.length === 0) return null;
    return (
      <View style={styles.notifActions}>
        {notifUnreadCount > 0 && (
          <Pressable style={styles.notifActionBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={14} color={colors.accent} />
            <Text style={[styles.notifActionText, { color: colors.accent }]}>Alle gelesen</Text>
          </Pressable>
        )}
        <Pressable style={[styles.notifActionBtn, { marginLeft: 'auto' }]} onPress={handleClearAll}>
          <Trash2 size={14} color={colors.red} />
          <Text style={[styles.notifActionText, { color: colors.red }]}>Alle löschen</Text>
        </Pressable>
      </View>
    );
  }, [notifications.length, notifUnreadCount, colors, handleMarkAllRead, handleClearAll]);

  const RequestEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MessageCircle size={48} color={colors.tertiaryText} />
        <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine Anfragen</Text>
        <Text style={[styles.emptySubtitle, { color: colors.tertiaryText }]}>
          Nachrichtenanfragen von Personen,{`\n`}die nicht deine Freunde sind, erscheinen hier.
        </Text>
      </View>
    ),
    [colors],
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'chats', label: 'Chats', count: chatUnreadCount },
    { key: 'anfragen', label: 'Anfragen', count: requestCount },
    { key: 'heldentum', label: 'HELDENTUM', count: notifUnreadCount },
  ];

  return (
    <>
      {showSwipeHint && (
        <Modal transparent animationType="none" visible={showSwipeHint} onRequestClose={dismissSwipeHint}>
          <Pressable style={styles.hintOverlay} onPress={dismissSwipeHint}>
            <Animated.View style={[styles.hintCard, { backgroundColor: colors.surfaceElevated ?? colors.surface, opacity: hintFade, transform: [{ scale: hintFade.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
              <View style={[styles.hintIconCircle, { backgroundColor: 'rgba(192,96,96,0.15)' }]}>
                <Trash2 size={28} color={colors.red} />
              </View>
              <Text style={[styles.hintTitle, { color: colors.primaryText }]}>Chat löschen</Text>
              <Text style={[styles.hintDescription, { color: colors.tertiaryText }]}>
                Wische den Chat nach links.{"\n"}Es startet ein 3-Sekunden-Timer.{"\n"}Nach Ablauf wird der Chat unwiderruflich gelöscht.
              </Text>
              <View style={styles.hintSteps}>
                <View style={styles.hintStep}>
                  <View style={[styles.hintStepNumber, { backgroundColor: colors.accent }]}><Text style={styles.hintStepNumberText}>1</Text></View>
                  <Text style={[styles.hintStepText, { color: colors.matteText }]}>← Nach links swipen</Text>
                </View>
                <View style={styles.hintStep}>
                  <View style={[styles.hintStepNumber, { backgroundColor: colors.accent }]}><Text style={styles.hintStepNumberText}>2</Text></View>
                  <Text style={[styles.hintStepText, { color: colors.matteText }]}>Timer läuft 3 Sekunden</Text>
                </View>
                <View style={styles.hintStep}>
                  <View style={[styles.hintStepNumber, { backgroundColor: colors.red }]}><Text style={styles.hintStepNumberText}>3</Text></View>
                  <Text style={[styles.hintStepText, { color: colors.matteText }]}>Chat wird gelöscht</Text>
                </View>
              </View>
              <Pressable
                style={styles.hintCheckboxRow}
                onPress={() => setDontShowAgainChecked(prev => !prev)}
              >
                <View style={[styles.hintCheckbox, { borderColor: colors.tertiaryText, backgroundColor: dontShowAgainChecked ? colors.accent : 'transparent' }]}>
                  {dontShowAgainChecked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.hintCheckboxLabel, { color: colors.tertiaryText }]}>
                  Hinweis künftig nicht mehr anzeigen
                </Text>
              </Pressable>
              <Pressable style={[styles.hintDismissBtn, { backgroundColor: colors.accent }]} onPress={dismissSwipeHint}>
                <Text style={styles.hintDismissText}>Verstanden</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroTopRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <ChevronLeft size={20} color="#BFA35D" />
            </Pressable>
            <Pressable
              onPress={handleNewChat}
              hitSlop={12}
              style={styles.newChatBtn}
              testID="new-chat-btn"
            >
              <Plus size={20} color="#BFA35D" />
            </Pressable>
          </View>
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
          <View style={styles.heroIconWrap}>
            <MessageCircle size={32} color="#BFA35D" />
          </View>
          <Text style={styles.heroTitle}>Nachrichten</Text>
        </LinearGradient>

        <View style={[styles.tabBar, { borderBottomColor: 'rgba(191,163,93,0.1)' }]}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && [styles.tabActive, { borderBottomColor: colors.accent }],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? colors.accent : colors.tertiaryText },
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.tabBadgeText}>{tab.count > 9 ? '9+' : tab.count}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {activeTab === 'chats' && (
          <FlatList
            data={conversations}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.partnerId}
            ListEmptyComponent={ChatEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
          />
        )}

        {activeTab === 'anfragen' && (
          <FlatList
            data={messageRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.partnerId}
            ListEmptyComponent={RequestEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
          />
        )}

        {activeTab === 'heldentum' && (
          <>
            {notifUnreadCount > 0 && (
              <View style={[styles.unreadBanner, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
                <Mic size={14} color={colors.accent} />
                <Text style={[styles.unreadBannerText, { color: colors.accent }]}>
                  {notifUnreadCount} ungelesene Nachricht{notifUnreadCount > 1 ? 'en' : ''}
                </Text>
              </View>
            )}
            <FlatList
              data={notifications}
              renderItem={renderNotifItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={NotifHeader}
              ListEmptyComponent={NotifEmpty}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
              }
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
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
    zIndex: 10,
  },
  heroTopRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
    zIndex: 10,
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  },
  headerPlusBtn: {
    marginRight: 4,
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  swipeContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  chatSlider: {
    borderRadius: 14,
    zIndex: 2,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 20,
    gap: 4,
  },
  timerCountdownText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800' as const,
    marginTop: 2,
  },
  timerDoneText: {
    color: '#40B060',
    fontSize: 14,
    fontWeight: '800' as const,
    marginTop: 2,
  },
  timerBarBg: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginTop: 4,
  },
  timerBarFill: {
    height: 4,
    borderRadius: 2,
  },
  hintOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  hintCard: {
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  hintIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hintTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 10,
  },
  hintDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  hintSteps: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  hintStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hintStepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintStepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800' as const,
  },
  hintStepText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  hintCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  hintCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCheckboxLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  hintDismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  hintDismissText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statusIcon: {
    marginRight: 2,
  },
  chatPreview: {
    fontSize: 14,
    flex: 1,
  },
  chatPreviewBold: {
    fontWeight: '600' as const,
  },
  chatPreviewItalic: {
    fontStyle: 'italic' as const,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unreadBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  notifActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  notifActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  notifCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitleRow: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  notifMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginLeft: 50,
  },
  deleteBtn: {
    padding: 4,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginLeft: 50,
    borderRadius: 12,
    padding: 10,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  audioBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'],
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  requestAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  requestAcceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  requestDeclineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  requestDeclineText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  requestBlockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 'auto',
  },
  requestBlockText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  requestTime: {
    fontSize: 11,
    marginTop: 4,
  },
  requestHint: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic' as const,
  },
  requestOpenIcon: {
    paddingLeft: 4,
    paddingTop: 4,
  },
  requestReadLink: {
    marginBottom: 10,
  },
  requestReadLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
