import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
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
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useNotifications, type InboxNotification } from '@/providers/NotificationProvider';
import * as Haptics from 'expo-haptics';


function formatTimeAgo(dateStr: string): string {
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
        {isPlaying ? (
          <Pause size={14} color="#1c1c1e" />
        ) : (
          <Play size={14} color="#1c1c1e" />
        )}
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
          styles.card,
          {
            backgroundColor: item.read ? colors.surface : 'rgba(191,163,93,0.06)',
            borderLeftColor: item.read ? 'transparent' : colors.accent,
            borderLeftWidth: item.read ? 0 : 3,
          },
        ]}
        onPress={handlePress}
        testID={`notification-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: item.read ? colors.surfaceSecondary : 'rgba(191,163,93,0.15)' }]}>
            {item.audioUri ? (
              <Volume2 size={18} color={item.read ? colors.tertiaryText : colors.accent} />
            ) : (
              <Bell size={18} color={item.read ? colors.tertiaryText : colors.accent} />
            )}
          </View>
          <View style={styles.cardTitleRow}>
            <Text
              style={[
                styles.cardTitle,
                { color: colors.primaryText, fontWeight: item.read ? ('500' as const) : ('700' as const) },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View style={styles.timeBadge}>
              <Clock size={10} color={colors.tertiaryText} />
              <Text style={[styles.timeText, { color: colors.tertiaryText }]}>
                {formatTimeAgo(item.sentAt)}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleDelete} hitSlop={12} style={styles.deleteBtn}>
            <Trash2 size={16} color={colors.tertiaryText} />
          </Pressable>
        </View>

        {item.message ? (
          <Text
            style={[styles.cardMessage, { color: item.read ? colors.tertiaryText : colors.matteText }]}
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

export default function InboxScreen() {
  const { colors } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllAsRead();
  }, [unreadCount, markAllAsRead]);

  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) return;
    Alert.alert('Alle löschen', 'Alle Nachrichten wirklich löschen?', [
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

  const renderItem = useCallback(
    ({ item }: { item: InboxNotification }) => (
      <NotificationItem
        item={item}
        colors={colors}
        onRead={markAsRead}
        onDelete={deleteNotification}
      />
    ),
    [colors, markAsRead, deleteNotification]
  );

  const ListHeader = useCallback(() => {
    if (notifications.length === 0) return null;
    return (
      <View style={styles.headerActions}>
        {unreadCount > 0 && (
          <Pressable style={styles.headerBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={14} color={colors.accent} />
            <Text style={[styles.headerBtnText, { color: colors.accent }]}>Alle gelesen</Text>
          </Pressable>
        )}
        <Pressable style={[styles.headerBtn, { marginLeft: 'auto' }]} onPress={handleClearAll}>
          <Trash2 size={14} color={colors.red} />
          <Text style={[styles.headerBtnText, { color: colors.red }]}>Alle löschen</Text>
        </Pressable>
      </View>
    );
  }, [notifications.length, unreadCount, colors, handleMarkAllRead, handleClearAll]);

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSecondary }]}>
          <BellOff size={40} color={colors.tertiaryText} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>
          Keine Nachrichten
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.tertiaryText }]}>
          Wenn dein Coach dir eine Nachricht{'\n'}schickt, erscheint sie hier.
        </Text>
      </View>
    ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: 'rgba(191,163,93,0.1)' }]}>
          <Mic size={14} color={colors.accent} />
          <Text style={[styles.unreadBannerText, { color: colors.accent }]}>
            {unreadCount} ungelesene Nachricht{unreadCount > 1 ? 'en' : ''}
          </Text>
        </View>
      )}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: {
    flex: 1,
  },
  cardTitle: {
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
  cardMessage: {
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
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
