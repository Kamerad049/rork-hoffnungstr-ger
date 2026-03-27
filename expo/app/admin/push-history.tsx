import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Bell, Mic, Users, User, CheckCheck, Check, XCircle, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin, type PushNotification } from '@/providers/AdminProvider';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAudioDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PushHistoryScreen() {
  const { colors } = useTheme();
  const { pushHistory } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: PushNotification }) => {
    const receipts = item.receipts ?? [];
    const totalRecipients = receipts.length;
    const deliveredCount = receipts.filter((r) => r.delivered).length;
    const readCount = receipts.filter((r) => r.read).length;
    const failedCount = receipts.filter((r) => !r.delivered).length;

    const deliveredPct = totalRecipients > 0 ? Math.round((deliveredCount / totalRecipients) * 100) : 0;
    const readPct = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    return (
      <Pressable
        style={[styles.card, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}
        onPress={() => router.push({ pathname: '/admin/push-detail' as any, params: { id: item.id } })}
        testID={`push-history-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(191,163,93,0.12)' }]}>
            <Bell size={18} color={colors.accent} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.primaryText }]}>{item.title}</Text>
            <Text style={[styles.date, { color: colors.tertiaryText }]}>{formatDate(item.sentAt)}</Text>
          </View>
          <ChevronRight size={18} color={colors.tertiaryText} />
        </View>

        {item.message.length > 0 && (
          <Text style={[styles.message, { color: colors.matteText }]} numberOfLines={2}>
            {item.message}
          </Text>
        )}

        <View style={styles.metaRow}>
          {item.audioUri && (
            <View style={[styles.metaChip, { backgroundColor: 'rgba(192,96,96,0.12)' }]}>
              <Mic size={12} color={colors.red} />
              <Text style={[styles.metaChipText, { color: colors.red }]}>
                Audio {formatAudioDuration(item.audioDuration)}
              </Text>
            </View>
          )}
          <View style={[styles.metaChip, { backgroundColor: 'rgba(191,163,93,0.12)' }]}>
            {item.recipients === 'all' ? (
              <Users size={12} color={colors.accent} />
            ) : (
              <User size={12} color={colors.accent} />
            )}
            <Text style={[styles.metaChipText, { color: colors.accent }]}>
              {item.recipients === 'all' ? 'Alle Nutzer' : `${Array.isArray(item.recipients) ? item.recipients.length : 0} Nutzer`}
            </Text>
          </View>
        </View>

        {totalRecipients > 0 && (
          <View style={[styles.receiptSection, { borderTopColor: colors.border }]}>
            <View style={styles.receiptRow}>
              <View style={styles.receiptStat}>
                <View style={[styles.receiptIcon, { backgroundColor: 'rgba(191,163,93,0.12)' }]}>
                  <Check size={13} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.receiptLabel, { color: colors.tertiaryText }]}>Zugestellt</Text>
                  <Text style={[styles.receiptValue, { color: colors.primaryText }]}>
                    {deliveredCount}/{totalRecipients}
                    <Text style={[styles.receiptPct, { color: colors.tertiaryText }]}> ({deliveredPct}%)</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.receiptStat}>
                <View style={[styles.receiptIcon, { backgroundColor: 'rgba(91,164,120,0.12)' }]}>
                  <CheckCheck size={13} color="#5BA478" />
                </View>
                <View>
                  <Text style={[styles.receiptLabel, { color: colors.tertiaryText }]}>Gelesen</Text>
                  <Text style={[styles.receiptValue, { color: colors.primaryText }]}>
                    {readCount}/{totalRecipients}
                    <Text style={[styles.receiptPct, { color: colors.tertiaryText }]}> ({readPct}%)</Text>
                  </Text>
                </View>
              </View>

              {failedCount > 0 && (
                <View style={styles.receiptStat}>
                  <View style={[styles.receiptIcon, { backgroundColor: 'rgba(192,96,96,0.12)' }]}>
                    <XCircle size={13} color={colors.red} />
                  </View>
                  <View>
                    <Text style={[styles.receiptLabel, { color: colors.tertiaryText }]}>Fehler</Text>
                    <Text style={[styles.receiptValue, { color: colors.red }]}>{failedCount}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBarRead, { width: `${readPct}%` as any, backgroundColor: '#5BA478' }]} />
                <View style={[styles.progressBarDelivered, { width: `${deliveredPct}%` as any, backgroundColor: colors.accent, position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.35 }]} />
              </View>
              <View style={styles.progressLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#5BA478' }]} />
                  <Text style={[styles.legendText, { color: colors.tertiaryText }]}>Gelesen</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accent, opacity: 0.5 }]} />
                  <Text style={[styles.legendText, { color: colors.tertiaryText }]}>Zugestellt</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const heroHeader = (
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
        <Bell size={32} color="#BFA35D" />
      </View>
      <Text style={styles.heroTitle}>Push-Verlauf</Text>
      <Text style={styles.heroSubtitle}>
        Alle gesendeten Push-Nachrichten im Überblick.
      </Text>
    </LinearGradient>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={pushHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listContent}>
            {renderItem({ item } as any)}
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={heroHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bell size={48} color={colors.tertiaryText} />
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
              Noch keine Push-Nachrichten gesendet
            </Text>
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
    paddingBottom: 30,
    position: 'relative' as const,
    overflow: 'hidden' as const,
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
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  list: { paddingBottom: 30 },
  listContent: { paddingHorizontal: 16 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' as const },
  date: { fontSize: 11, marginTop: 2 },
  message: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: { fontSize: 11, fontWeight: '600' as const },
  receiptSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  receiptRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  receiptStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptLabel: { fontSize: 10, fontWeight: '500' as const },
  receiptValue: { fontSize: 13, fontWeight: '700' as const },
  receiptPct: { fontSize: 10, fontWeight: '500' as const },
  progressBarContainer: { gap: 6 },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarRead: {
    height: 6,
    borderRadius: 3,
  },
  progressBarDelivered: {
    height: 6,
    borderRadius: 3,
  },
  progressLegend: {
    flexDirection: 'row',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: { fontSize: 10 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
