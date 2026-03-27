import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Check, CheckCheck, XCircle, Clock, Filter, ArrowLeft, FileCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin, type PushReceipt } from '@/providers/AdminProvider';

type FilterType = 'all' | 'delivered' | 'read' | 'failed';

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelative(dateStr: string | null, baseStr: string): string {
  if (!dateStr) return '';
  const base = new Date(baseStr).getTime();
  const target = new Date(dateStr).getTime();
  const diffSec = Math.round((target - base) / 1000);
  if (diffSec < 60) return `nach ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `nach ${diffMin}min`;
  const diffHr = Math.round(diffMin / 60);
  return `nach ${diffHr}h`;
}

export default function PushDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pushHistory } = useAdmin();
  const [filter, setFilter] = useState<FilterType>('all');

  const notification = useMemo(() => pushHistory.find((n) => n.id === id), [pushHistory, id]);

  const receipts = useMemo(() => notification?.receipts ?? [], [notification]);
  const totalCount = receipts.length;
  const deliveredCount = receipts.filter((r) => r.delivered).length;
  const readCount = receipts.filter((r) => r.read).length;
  const failedCount = receipts.filter((r) => !r.delivered).length;

  const filteredReceipts = useMemo(() => {
    switch (filter) {
      case 'delivered':
        return receipts.filter((r) => r.delivered && !r.read);
      case 'read':
        return receipts.filter((r) => r.read);
      case 'failed':
        return receipts.filter((r) => !r.delivered);
      default:
        return receipts;
    }
  }, [receipts, filter]);

  const { allUsers } = useAdmin();

  const getUserName = (userId: string): string => {
    const user = allUsers.find((u: any) => u.id === userId);
    return user?.displayName ?? 'Unbekannt';
  };

  const getUserHandle = (userId: string): string => {
    const user = allUsers.find((u: any) => u.id === userId);
    return user ? `@${user.username}` : '';
  };

  if (!notification) {
    return (
      <View style={[styles.container, { backgroundColor: '#141416' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Nachricht nicht gefunden</Text>
        </View>
      </View>
    );
  }

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Alle', count: totalCount },
    { key: 'delivered', label: 'Zugestellt', count: deliveredCount - readCount },
    { key: 'read', label: 'Gelesen', count: readCount },
    { key: 'failed', label: 'Fehler', count: failedCount },
  ];

  const renderReceipt = ({ item }: { item: PushReceipt }) => {
    const statusColor = item.read ? '#5BA478' : item.delivered ? colors.accent : colors.red;
    const statusLabel = item.read ? 'Gelesen' : item.delivered ? 'Zugestellt' : 'Fehlgeschlagen';
    const StatusIcon = item.read ? CheckCheck : item.delivered ? Check : XCircle;

    return (
      <Pressable
        style={[styles.receiptCard, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}
        onPress={() => router.push(`/user-profile?id=${item.userId}`)}
        android_ripple={{ color: 'rgba(191,163,93,0.1)' }}
      >
        <View style={styles.receiptLeft}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(191,163,93,0.12)' }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {getUserName(item.userId).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.primaryText }]}>{getUserName(item.userId)}</Text>
            <Text style={[styles.userHandle, { color: colors.tertiaryText }]}>{getUserHandle(item.userId)}</Text>
          </View>
        </View>
        <View style={styles.receiptRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <StatusIcon size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          {item.delivered && item.deliveredAt && (
            <View style={styles.timestampRow}>
              <Clock size={9} color={colors.tertiaryText} />
              <Text style={[styles.timestampText, { color: colors.tertiaryText }]}>
                {formatRelative(item.deliveredAt, notification.sentAt)}
              </Text>
            </View>
          )}
          {item.read && item.readAt && (
            <View style={styles.timestampRow}>
              <CheckCheck size={9} color="#5BA478" />
              <Text style={[styles.timestampText, { color: colors.tertiaryText }]}>
                {formatRelative(item.readAt, notification.sentAt)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const heroHeader = (
    <View>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 16 }]}
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
          <FileCheck size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Empfangsbestätigung</Text>
        <Text style={styles.heroSubtitle} numberOfLines={1}>
          {notification.title}
        </Text>
      </LinearGradient>

      <View style={[styles.summaryCard, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(191,163,93,0.12)' }]}>
              <Check size={16} color={colors.accent} />
            </View>
            <Text style={[styles.statNumber, { color: colors.primaryText }]}>{deliveredCount}</Text>
            <Text style={[styles.statLabel, { color: colors.tertiaryText }]}>Zugestellt</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(91,164,120,0.12)' }]}>
              <CheckCheck size={16} color="#5BA478" />
            </View>
            <Text style={[styles.statNumber, { color: colors.primaryText }]}>{readCount}</Text>
            <Text style={[styles.statLabel, { color: colors.tertiaryText }]}>Gelesen</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(192,96,96,0.12)' }]}>
              <XCircle size={16} color={colors.red} />
            </View>
            <Text style={[styles.statNumber, { color: colors.red }]}>{failedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.tertiaryText }]}>Fehler</Text>
          </View>
        </View>

        <View style={styles.rateRow}>
          <Text style={[styles.rateLabel, { color: colors.tertiaryText }]}>Zustellrate</Text>
          <View style={[styles.rateBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.rateBarFill,
                {
                  width: `${totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0}%` as any,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.ratePct, { color: colors.accent }]}>
            {totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0}%
          </Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={[styles.rateLabel, { color: colors.tertiaryText }]}>Leserate</Text>
          <View style={[styles.rateBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.rateBarFill,
                {
                  width: `${totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0}%` as any,
                  backgroundColor: '#5BA478',
                },
              ]}
            />
          </View>
          <Text style={[styles.ratePct, { color: '#5BA478' }]}>
            {totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0}%
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Filter size={14} color={colors.tertiaryText} />
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key
                ? { backgroundColor: colors.accent }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filter === f.key ? '#1c1c1e' : colors.primaryText },
              ]}
            >
              {f.label} ({f.count})
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.userId}
        renderItem={renderReceipt}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={heroHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Keine Empfänger in diesem Filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    width: 72,
  },
  rateBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rateBarFill: {
    height: 6,
    borderRadius: 3,
  },
  ratePct: {
    fontSize: 12,
    fontWeight: '700' as const,
    width: 36,
    textAlign: 'right' as const,
    fontVariant: ['tabular-nums'],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  list: {
    paddingBottom: 30,
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  receiptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  userHandle: {
    fontSize: 10,
    marginTop: 1,
  },
  receiptRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timestampText: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
  },
});
