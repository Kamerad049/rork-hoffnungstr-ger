import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Share2,
  Bell,
  CheckCheck,
  ChevronRight,
  Swords,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getUserById } from '@/lib/utils';
import {
  getActivityLabel,
  getActivityIconColor,
  type ActivityItem,
  type ActivityType,
} from '@/constants/types';


function getIconComponent(type: ActivityType) {
  switch (type) {
    case 'like_post':
    case 'like_reel':
      return Heart;
    case 'like_comment':
      return Swords;
    case 'comment':
    case 'reply_comment':
    case 'comment_reel':
      return MessageCircle;
    case 'follow':
      return UserPlus;
    case 'mention':
      return AtSign;
    case 'share':
      return Share2;
    default:
      return Bell;
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return `vor ${Math.floor(days / 7)} Wo.`;
}

function groupByTime(items: ActivityItem[]): { title: string; data: ActivityItem[] }[] {
  const now = Date.now();
  const groups: Record<string, ActivityItem[]> = {
    'Neu': [],
    'Heute': [],
    'Gestern': [],
    'Diese Woche': [],
    'Älter': [],
  };

  for (const item of items) {
    const diff = now - new Date(item.createdAt).getTime();
    const hours = diff / 3600000;
    if (!item.read && hours < 24) {
      groups['Neu'].push(item);
    } else if (hours < 24) {
      groups['Heute'].push(item);
    } else if (hours < 48) {
      groups['Gestern'].push(item);
    } else if (hours < 168) {
      groups['Diese Woche'].push(item);
    } else {
      groups['Älter'].push(item);
    }
  }

  return Object.entries(groups)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

const ActivityRow = React.memo(function ActivityRow({ item }: { item: ActivityItem }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const user = useMemo(
    () => getUserById(item.fromUserId),
    [item.fromUserId],
  );
  const IconComp = getIconComponent(item.type);
  const iconColor = getActivityIconColor(item.type);
  const label = getActivityLabel(item.type);
  const initials = user
    ? user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
    : '?';

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.type === 'follow' && user) {
      router.push({ pathname: '/user-profile', params: { userId: user.id } } as any);
    } else if ((item.type === 'like_post' || item.type === 'comment' || item.type === 'reply_comment' || item.type === 'mention' || item.type === 'share') && item.targetId) {
      router.push({ pathname: '/user-posts', params: { postId: item.targetId } } as any);
    } else if ((item.type === 'like_reel' || item.type === 'comment_reel') && item.targetId) {
      router.push('/(tabs)/feed' as any);
    } else if (item.type === 'like_comment' && user) {
      router.push({ pathname: '/user-profile', params: { userId: user.id } } as any);
    }
  }, [item.type, item.targetId, user, router]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          !item.read && styles.rowUnread,
          pressed && styles.rowPressed,
        ]}
        onPress={handlePress}
        testID={`activity-row-${item.id}`}
      >
        <View style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={[styles.avatar, { borderColor: iconColor + '40' }]} />
          ) : (
            <View style={[styles.avatar, { borderColor: iconColor + '40' }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={[styles.iconBubble, { backgroundColor: iconColor + '22' }]}>
            <IconComp size={12} color={iconColor} fill={item.type === 'like_post' || item.type === 'like_reel' ? iconColor : 'none'} />
          </View>
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.rowText} numberOfLines={3}>
            <Text style={styles.boldName}>{user?.displayName ?? 'Unbekannt'}</Text>
            {' '}
            {label}
          </Text>
          {item.targetPreview && item.type !== 'follow' ? (
            <Text style={styles.preview} numberOfLines={1}>
              {item.targetPreview}
            </Text>
          ) : null}
          <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
        </View>

        {item.mediaUrl ? (
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : item.type === 'follow' ? (
          <ChevronRight size={16} color="rgba(196,184,154,0.3)" />
        ) : null}

        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    </Animated.View>
  );
});

export default function ActivityScreen() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const sections = useMemo(() => groupByTime(activities), [activities]);
  const unreadCount = useMemo(() => activities.filter((a) => !a.read).length, [activities]);

  const markAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const flatData = useMemo(() => {
    const result: (ActivityItem | { type: 'header'; title: string; id: string })[] = [];
    for (const section of sections) {
      result.push({ type: 'header' as const, title: section.title, id: `h-${section.title}` });
      for (const item of section.data) {
        result.push(item);
      }
    }
    return result;
  }, [sections]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.title === 'Neu' && unreadCount > 0 && (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      );
    }
    return <ActivityRow item={item as ActivityItem} />;
  }, [unreadCount]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Aktivitäten',
          headerRight: unreadCount > 0
            ? () => (
                <Pressable onPress={markAllRead} hitSlop={12} style={styles.markAllBtn}>
                  <CheckCheck size={20} color="#BFA35D" />
                </Pressable>
              )
            : undefined,
        }}
      />

      {activities.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Bell size={48} color="rgba(191,163,93,0.25)" />
          <Text style={styles.emptyTitle}>Keine Aktivitäten</Text>
          <Text style={styles.emptySubtitle}>
            Hier siehst du Likes, Kommentare, Follower und mehr.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  listContent: {
    paddingBottom: 40,
  },
  markAllBtn: {
    marginRight: 4,
    padding: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#BFA35D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  sectionBadge: {
    backgroundColor: '#E85D75',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sectionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800' as const,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  rowUnread: {
    backgroundColor: 'rgba(191,163,93,0.04)',
  },
  rowPressed: {
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  avatarWrap: {
    width: 50,
    height: 50,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  iconBubble: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#141416',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  rowText: {
    fontSize: 14,
    color: '#C4B89A',
    lineHeight: 20,
  },
  boldName: {
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  preview: {
    fontSize: 13,
    color: 'rgba(196,184,154,0.6)',
    fontStyle: 'italic' as const,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(196,184,154,0.4)',
    marginTop: 2,
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BFA35D',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(196,184,154,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
