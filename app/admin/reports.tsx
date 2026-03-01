import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import {
  Flag,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Film,
  Trash2,
  Ban,
  AlertTriangle,
  Users,
  ChevronRight,
  Play,
  MessageCircle,
  Clock,
  ShieldAlert,
  Timer,
  Zap,
  User,
  FileText,
  Heart,
  ArrowLeft,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import {
  useModeration,
  REPORT_REASONS,
  type Report,
  type ReportStatus,
  type ContentType,
  type UserRestrictionType,
} from '@/providers/ModerationProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import * as Haptics from 'expo-haptics';
import ThreatGauge from '@/components/ThreatGauge';

type FilterTab = 'pending' | 'resolved' | 'all' | 'users' | 'restrictions';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post: 'Beitrag',
  story: 'Story',
  comment: 'Kommentar',
  reel: 'Reel',
  reel_comment: 'Reel-Kommentar',
};

const RESTRICTION_LABELS: Record<UserRestrictionType, string> = {
  comment_ban: 'Kommentar-Sperre',
  post_ban: 'Beitrags-Sperre',
  like_ban: 'Like-Sperre',
  full_ban: 'Vollsperre',
};

function formatDuration(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Abgelaufen';
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}T ${hours % 24}Std`;
  if (hours > 0) return `${hours}Std ${mins % 60}Min`;
  return `${mins}Min`;
}

export default function AdminReportsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    reports,
    pendingReports,
    resolvedReports,
    updateReportStatus,
    deleteReport,
    getUserViolationStats,
    getMostReportedUsers,
    getAllRestrictions,
    removeRestriction,
    addRestriction,
  } = useModeration();
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banModalUserId, setBanModalUserId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<string>('30');
  const [banType, setBanType] = useState<UserRestrictionType>('comment_ban');
  const [banReason, setBanReason] = useState<string>('');

  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredReports = filter === 'pending'
    ? pendingReports
    : filter === 'resolved'
    ? resolvedReports
    : filter === 'all'
    ? reports
    : [];

  const getStatusColor = useCallback((status: ReportStatus) => {
    switch (status) {
      case 'pending': return '#E8A44E';
      case 'reviewing': return '#5B9BD5';
      case 'resolved': return '#50B450';
      case 'dismissed': return '#8e8e93';
    }
  }, []);

  const getStatusLabel = useCallback((status: ReportStatus) => {
    switch (status) {
      case 'pending': return 'Offen';
      case 'reviewing': return 'In Prüfung';
      case 'resolved': return 'Erledigt';
      case 'dismissed': return 'Abgelehnt';
    }
  }, []);

  const getContentIcon = useCallback((type: ContentType) => {
    switch (type) {
      case 'post': return <FileText size={14} color={colors.tertiaryText} />;
      case 'story': return <Film size={14} color={colors.tertiaryText} />;
      case 'reel': return <Play size={14} color={colors.tertiaryText} />;
      case 'reel_comment': return <MessageCircle size={14} color={colors.tertiaryText} />;
      case 'comment': return <MessageSquare size={14} color={colors.tertiaryText} />;
      default: return <MessageSquare size={14} color={colors.tertiaryText} />;
    }
  }, [colors]);

  const handleResolve = useCallback((report: Report) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateReportStatus(report.id, 'resolved', 'admin', resolutionNote || 'Inhalt geprüft und entfernt');
    setSelectedReport(null);
    setResolutionNote('');
  }, [updateReportStatus, resolutionNote]);

  const handleDismiss = useCallback((report: Report) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateReportStatus(report.id, 'dismissed', 'admin', resolutionNote || 'Kein Verstoß festgestellt');
    setSelectedReport(null);
    setResolutionNote('');
  }, [updateReportStatus, resolutionNote]);

  const handleDelete = useCallback((reportId: string) => {
    Alert.alert('Meldung löschen', 'Möchtest du diese Meldung endgültig löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteReport(reportId) },
    ]);
  }, [deleteReport]);

  const handleStartReview = useCallback((report: Report) => {
    updateReportStatus(report.id, 'reviewing', 'admin');
  }, [updateReportStatus]);

  const handleDeleteContent = useCallback((report: Report) => {
    Alert.alert(
      'Inhalt löschen',
      `Möchtest du diesen ${CONTENT_TYPE_LABELS[report.contentType]} wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            updateReportStatus(report.id, 'resolved', 'admin', resolutionNote || 'Inhalt gelöscht');
            setSelectedReport(null);
            setResolutionNote('');
          },
        },
      ]
    );
  }, [updateReportStatus, resolutionNote]);

  const handleBanUser = useCallback((report: Report) => {
    const reported = getUserById(report.reportedUserId)?.displayName ?? 'Unbekannt';
    Alert.alert(
      'Nutzer sperren',
      `Möchtest du "${reported}" wirklich sperren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperren',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            updateReportStatus(report.id, 'resolved', 'admin', resolutionNote || `Nutzer "${reported}" gesperrt`);
            setSelectedReport(null);
            setResolutionNote('');
          },
        },
      ]
    );
  }, [updateReportStatus, resolutionNote]);

  const handleApplyBan = useCallback(() => {
    if (!banModalUserId) return;
    const mins = parseInt(banDuration, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Fehler', 'Bitte gib eine gültige Dauer ein.');
      return;
    }
    const user = getUserById(banModalUserId);
    addRestriction({
      userId: banModalUserId,
      type: banType,
      reason: banReason || `Manuell verhängt durch Admin`,
      expiresAt: new Date(Date.now() + mins * 60000).toISOString(),
      issuedBy: 'admin',
      violationCount: getUserViolationStats(banModalUserId).resolved,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sperre verhängt', `${user?.displayName ?? 'Nutzer'} wurde für ${mins} Minuten eingeschränkt.`);
    setBanModalUserId(null);
    setBanDuration('30');
    setBanReason('');
  }, [banModalUserId, banDuration, banType, banReason, addRestriction, getUserViolationStats]);

  const selectedUserStats = useMemo(() => {
    if (!selectedUserId) return null;
    return getUserViolationStats(selectedUserId);
  }, [selectedUserId, getUserViolationStats]);

  const selectedUserReports = useMemo(() => {
    if (!selectedUserId) return [];
    return reports.filter((r) => r.reportedUserId === selectedUserId);
  }, [selectedUserId, reports]);

  const renderReport = useCallback(({ item }: { item: Report }) => {
    const reporter = item.reporterUserId === 'me' ? 'Du' : (getUserById(item.reporterUserId)?.displayName ?? 'Unbekannt');
    const reporterUser = getUserById(item.reporterUserId);
    const reported = getUserById(item.reportedUserId)?.displayName ?? 'Unbekannt';
    const reportedUser = getUserById(item.reportedUserId);
    const reason = REPORT_REASONS.find((r) => r.key === item.reason);
    const statusColor = getStatusColor(item.status);
    const userStats = getUserViolationStats(item.reportedUserId);

    return (
      <Pressable
        style={[styles.card, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}
        onPress={() => setSelectedReport(item)}
        testID={`report-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeRow}>
            {getContentIcon(item.contentType)}
            <Text style={[styles.cardType, { color: colors.tertiaryText }]}>
              {CONTENT_TYPE_LABELS[item.contentType]}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.reasonRow}>
          <Text style={styles.reasonIcon}>{reason?.icon}</Text>
          <Text style={[styles.reasonLabel, { color: colors.primaryText }]}>{reason?.label}</Text>
        </View>

        {item.contentPreview.length > 0 && (
          <View style={[styles.previewWrap, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.preview, { color: colors.secondaryText }]} numberOfLines={2}>
              "{item.contentPreview}"
            </Text>
          </View>
        )}

        <View style={styles.userRow}>
          <View style={styles.userChip}>
            <View style={[styles.miniAvatar, { backgroundColor: 'rgba(191,163,93,0.15)' }]}>
              <Text style={[styles.miniAvatarText, { color: '#BFA35D' }]}>
                {(reporterUser?.displayName ?? 'U').charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.userChipLabel, { color: colors.tertiaryText }]}>Melder</Text>
              <Text style={[styles.userChipName, { color: colors.primaryText }]}>{reporter}</Text>
            </View>
          </View>
          <View style={[styles.arrowSep, { backgroundColor: colors.surfaceSecondary }]}>
            <ChevronRight size={12} color={colors.tertiaryText} />
          </View>
          <View style={styles.userChip}>
            <View style={[styles.miniAvatar, { backgroundColor: userStats.total >= 3 ? 'rgba(192,96,96,0.2)' : 'rgba(191,163,93,0.15)' }]}>
              <Text style={[styles.miniAvatarText, { color: userStats.total >= 3 ? '#C06060' : '#BFA35D' }]}>
                {(reportedUser?.displayName ?? 'U').charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.userChipLabel, { color: colors.tertiaryText }]}>Gemeldet</Text>
              <Text style={[styles.userChipName, { color: colors.primaryText }]}>{reported}</Text>
            </View>
          </View>
        </View>

        {userStats.total > 1 && (
          <View style={styles.threatRow}>
            <View style={[styles.repeatOffender, { backgroundColor: userStats.threatColor }]}>
              <AlertTriangle size={12} color="#fff" />
              <Text style={[styles.repeatOffenderText, { color: '#fff' }]}>
                {userStats.total} Meldungen ({userStats.resolved} bestätigt) · Risiko: {userStats.threatLabel}
              </Text>
            </View>
            {userStats.isCurrentlyRestricted && (
              <View style={[styles.restrictedBadge, { backgroundColor: '#8B0000' }]}>
                <Timer size={10} color="#fff" />
                <Text style={styles.restrictedText}>Eingeschränkt</Text>
              </View>
            )}
          </View>
        )}

        <Text style={[styles.timeText, { color: colors.tertiaryText }]}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </Pressable>
    );
  }, [colors, getStatusColor, getStatusLabel, getContentIcon, getUserViolationStats]);

  const renderUserCard = useCallback(({ item }: { item: typeof getMostReportedUsers[0] }) => {
    const user = item.user;
    const displayName = user?.displayName ?? 'Unbekannt';
    const stats = getUserViolationStats(item.userId);

    return (
      <Pressable
        style={[styles.userCard, { backgroundColor: colors.surface }]}
        onPress={() => setSelectedUserId(item.userId)}
      >
        <View style={styles.userCardTop}>
          <View style={styles.userCardLeft}>
            <View style={[styles.userAvatar, { backgroundColor: item.count >= 3 ? 'rgba(192,96,96,0.2)' : 'rgba(191,163,93,0.15)' }]}>
              <Text style={[styles.userAvatarText, { color: item.count >= 3 ? '#C06060' : '#BFA35D' }]}>
                {displayName.charAt(0)}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.primaryText }]}>{displayName}</Text>
              <Text style={[styles.userHandle, { color: colors.tertiaryText }]}>@{user?.username ?? 'unknown'}</Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.tertiaryText} />
        </View>

        <View style={styles.userMiniGauge}>
          <View style={styles.gaugeBarBg}>
            <View
              style={[
                styles.gaugeBarFill,
                {
                  width: `${Math.min(stats.threatLevel * 100, 100)}%`,
                  backgroundColor: stats.threatColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.gaugeLabel, { color: stats.threatColor }]}>{stats.threatLabel}</Text>
        </View>

        <View style={styles.userStatsRow}>
          <View style={[styles.userStatBadge, { backgroundColor: 'rgba(232,164,78,0.15)' }]}>
            <Text style={[styles.userStatNum, { color: '#E8A44E' }]}>{item.pendingCount}</Text>
            <Text style={[styles.userStatLabel, { color: '#E8A44E' }]}>offen</Text>
          </View>
          <View style={[styles.userStatBadge, { backgroundColor: '#C06060' }]}>
            <Text style={[styles.userStatNum, { color: '#fff' }]}>{item.resolvedCount}</Text>
            <Text style={[styles.userStatLabel, { color: '#fff' }]}>bestätigt</Text>
          </View>
          <View style={[styles.userStatBadge, { backgroundColor: 'rgba(142,142,147,0.12)' }]}>
            <Text style={[styles.userStatNum, { color: '#8e8e93' }]}>{item.count}</Text>
            <Text style={[styles.userStatLabel, { color: '#8e8e93' }]}>gesamt</Text>
          </View>
          {stats.isCurrentlyRestricted && (
            <View style={[styles.userStatBadge, { backgroundColor: '#8B0000' }]}>
              <Timer size={12} color="#fff" />
              <Text style={[styles.userStatLabel, { color: '#fff' }]}>gesperrt</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, [colors, getUserViolationStats]);

  const renderRestriction = useCallback(({ item }: { item: typeof getAllRestrictions[0] }) => {
    const user = getUserById(item.userId);
    const displayName = user?.displayName ?? 'Unbekannt';
    const isExpired = new Date(item.expiresAt).getTime() < Date.now();
    const remaining = formatDuration(item.expiresAt);

    return (
      <View style={[styles.restrictionCard, { backgroundColor: colors.surface, opacity: isExpired ? 0.5 : 1 }]}>
        <View style={styles.restrictionHeader}>
          <View style={styles.restrictionLeft}>
            <View style={[styles.restrictionIcon, { backgroundColor: isExpired ? 'rgba(142,142,147,0.12)' : 'rgba(139,0,0,0.12)' }]}>
              {item.type === 'full_ban' ? (
                <Ban size={18} color={isExpired ? '#8e8e93' : '#8B0000'} />
              ) : item.type === 'post_ban' ? (
                <ShieldAlert size={18} color={isExpired ? '#8e8e93' : '#C06060'} />
              ) : item.type === 'like_ban' ? (
                <Heart size={18} color={isExpired ? '#8e8e93' : '#E85D75'} />
              ) : (
                <MessageSquare size={18} color={isExpired ? '#8e8e93' : '#E8A44E'} />
              )}
            </View>
            <View style={styles.restrictionInfo}>
              <Text style={[styles.restrictionName, { color: colors.primaryText }]}>{displayName}</Text>
              <Text style={[styles.restrictionType, { color: isExpired ? '#8e8e93' : '#C06060' }]}>
                {RESTRICTION_LABELS[item.type]}
              </Text>
            </View>
          </View>
          <View style={styles.restrictionRight}>
            <View style={[styles.timeBadge, { backgroundColor: isExpired ? 'rgba(142,142,147,0.12)' : 'rgba(232,164,78,0.15)' }]}>
              <Clock size={11} color={isExpired ? '#8e8e93' : '#E8A44E'} />
              <Text style={[styles.timeText2, { color: isExpired ? '#8e8e93' : '#E8A44E' }]}>{remaining}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.restrictionReason, { color: colors.tertiaryText }]}>{item.reason}</Text>
        <View style={styles.restrictionMeta}>
          <Text style={[styles.restrictionMetaText, { color: colors.tertiaryText }]}>
            Verhängt von: {item.issuedBy === 'system' ? 'System (Auto)' : 'Admin'} · Vergehen #{item.violationCount}
          </Text>
          {!isExpired && (
            <Pressable
              style={[styles.liftBanBtn, { borderColor: colors.border }]}
              onPress={() => {
                Alert.alert('Sperre aufheben', `Möchtest du die Sperre von "${displayName}" aufheben?`, [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Aufheben', onPress: () => removeRestriction(item.userId, item.type) },
                ]);
              }}
            >
              <Text style={[styles.liftBanText, { color: '#50B450' }]}>Aufheben</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [colors, removeRestriction]);

  const tabCounts = useMemo(() => ({
    pending: pendingReports.length,
    resolved: resolvedReports.length,
    all: reports.length,
    users: getMostReportedUsers.length,
    restrictions: getAllRestrictions.length,
  }), [pendingReports, resolvedReports, reports, getMostReportedUsers, getAllRestrictions]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'Offen' },
    { key: 'resolved', label: 'Erledigt' },
    { key: 'all', label: 'Alle' },
    { key: 'users', label: 'Nutzer' },
    { key: 'restrictions', label: 'Sperren' },
  ];

  const renderListHeader = useCallback(() => (
    <View>
      <Animated.View style={{ opacity: headerFadeAnim }}>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={[styles.heroSection, { paddingTop: insets.top + 56 }]}
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
          <View style={styles.heroIconWrap}>
            <View style={styles.heroIconInner}>
              <Flag size={28} color="#BFA35D" />
            </View>
          </View>
          <Text style={styles.heroTitle}>Meldungen</Text>
          <Text style={styles.heroSub}>Gemeldete Inhalte prüfen & verwalten</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, pendingReports.length > 0 ? { color: '#C06060' } : undefined]}>
                {pendingReports.length}
              </Text>
              <Text style={styles.heroStatLabel}>Offen</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{resolvedReports.length}</Text>
              <Text style={styles.heroStatLabel}>Erledigt</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{reports.length}</Text>
              <Text style={styles.heroStatLabel}>Gesamt</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
        style={styles.tabsWrap}
      >
        {tabs.map((tab) => {
          const active = filter === tab.key;
          const count = tabCounts[tab.key];
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                active && styles.tabActive,
              ]}
              onPress={() => setFilter(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? '#BFA35D' : 'rgba(191,163,93,0.45)' },
                ]}
                numberOfLines={1}
              >
                {tab.label}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ), [headerFadeAnim, insets.top, pendingReports.length, resolvedReports.length, reports.length, filter, tabCounts]);

  const listData = filter === 'users'
    ? getMostReportedUsers
    : filter === 'restrictions'
    ? getAllRestrictions
    : filteredReports;

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (filter === 'users') return renderUserCard({ item });
    if (filter === 'restrictions') return renderRestriction({ item });
    return renderReport({ item });
  }, [filter, renderUserCard, renderRestriction, renderReport]);

  const keyExtractor = useCallback((item: any, idx: number) => {
    if (filter === 'users') return item.userId;
    if (filter === 'restrictions') return `${item.userId}_${item.type}_${idx}`;
    return item.id;
  }, [filter]);

  const renderEmpty = useCallback(() => {
    if (filter === 'restrictions') {
      return (
        <View style={styles.empty}>
          <ShieldAlert size={48} color={colors.tertiaryText} />
          <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine Sperren</Text>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
            Es sind aktuell keine Nutzer eingeschränkt.
          </Text>
        </View>
      );
    }
    if (filter === 'users') {
      return (
        <View style={styles.empty}>
          <Users size={48} color={colors.tertiaryText} />
          <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine gemeldeten Nutzer</Text>
          <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
            Es wurden noch keine Nutzer gemeldet.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Flag size={48} color={colors.tertiaryText} />
        <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine Meldungen</Text>
        <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
          {filter === 'pending' ? 'Keine offenen Meldungen vorhanden.' : 'Keine Meldungen in dieser Kategorie.'}
        </Text>
      </View>
    );
  }, [filter, colors]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ArrowLeft size={20} color="#BFA35D" />
      </Pressable>

      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedReport(null)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            {selectedReport && (() => {
              const reason = REPORT_REASONS.find((r) => r.key === selectedReport.reason);
              const reporter = selectedReport.reporterUserId === 'me' ? 'Du' : (getUserById(selectedReport.reporterUserId)?.displayName ?? 'Unbekannt');
              const reported = getUserById(selectedReport.reportedUserId)?.displayName ?? 'Unbekannt';
              const userStats = getUserViolationStats(selectedReport.reportedUserId);

              return (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Meldung prüfen</Text>

                  <View style={[styles.detailRow, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.tertiaryText }]}>Typ</Text>
                    <View style={styles.detailRight}>
                      {getContentIcon(selectedReport.contentType)}
                      <Text style={[styles.detailValue, { color: colors.primaryText }]}>
                        {CONTENT_TYPE_LABELS[selectedReport.contentType]}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailRow, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.tertiaryText }]}>Grund</Text>
                    <Text style={[styles.detailValue, { color: colors.primaryText }]}>{reason?.icon} {reason?.label}</Text>
                  </View>

                  <View style={[styles.detailRow, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.tertiaryText }]}>Melder</Text>
                    <Text style={[styles.detailValue, { color: colors.primaryText }]}>{reporter}</Text>
                  </View>

                  <Pressable
                    style={[styles.detailRow, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => {
                      setSelectedReport(null);
                      setTimeout(() => setSelectedUserId(selectedReport.reportedUserId), 300);
                    }}
                  >
                    <Text style={[styles.detailLabel, { color: colors.tertiaryText }]}>Gemeldeter Nutzer</Text>
                    <View style={styles.userDetailRow}>
                      <Text style={[styles.detailValue, { color: colors.primaryText }]}>{reported}</Text>
                      {userStats.total > 1 && (
                        <View style={[styles.miniWarningBadge, { backgroundColor: `${userStats.threatColor}20` }]}>
                          <Text style={[styles.miniWarningText, { color: userStats.threatColor }]}>{userStats.total}x</Text>
                        </View>
                      )}
                      <ChevronRight size={14} color={colors.tertiaryText} />
                    </View>
                  </Pressable>

                  {userStats.total > 1 && (
                    <View style={[styles.warningBox, { backgroundColor: userStats.threatColor, borderColor: userStats.threatColor }]}>
                      <AlertTriangle size={16} color="#fff" />
                      <View style={styles.warningTextWrap}>
                        <Text style={[styles.warningTitle, { color: '#fff' }]}>
                          Wiederholungstäter · Risiko: {userStats.threatLabel}
                        </Text>
                        <Text style={[styles.warningDesc, { color: 'rgba(255,255,255,0.8)' }]}>
                          {userStats.total} Meldungen ({userStats.resolved} bestätigt, {userStats.pending} offen, {userStats.dismissed} abgelehnt)
                        </Text>
                        {userStats.isCurrentlyRestricted && (
                          <View style={[styles.inlineRestriction, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Timer size={12} color="#fff" />
                            <Text style={[styles.inlineRestrictionText, { color: '#fff' }]}>Aktuell eingeschränkt</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {selectedReport.contentPreview.length > 0 && (
                    <View style={[styles.previewBox, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.detailLabel, { color: colors.tertiaryText, marginBottom: 6 }]}>Vorschau</Text>
                      <Text style={[styles.previewText, { color: colors.primaryText }]}>"{selectedReport.contentPreview}"</Text>
                    </View>
                  )}

                  {selectedReport.details.length > 0 && (
                    <View style={[styles.previewBox, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.detailLabel, { color: colors.tertiaryText, marginBottom: 6 }]}>Details vom Melder</Text>
                      <Text style={[styles.previewText, { color: colors.primaryText }]}>{selectedReport.details}</Text>
                    </View>
                  )}

                  {(selectedReport.status === 'pending' || selectedReport.status === 'reviewing') && (
                    <>
                      <Text style={[styles.noteLabel, { color: colors.primaryText }]}>Notiz zur Entscheidung</Text>
                      <TextInput
                        style={[styles.noteInput, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                        placeholder="Optional: Begründung hinzufügen..."
                        placeholderTextColor={colors.tertiaryText}
                        multiline
                        value={resolutionNote}
                        onChangeText={setResolutionNote}
                        textAlignVertical="top"
                      />

                      {selectedReport.status === 'pending' && (
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: '#5B9BD5' }]}
                          onPress={() => handleStartReview(selectedReport)}
                        >
                          <Eye size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>In Prüfung nehmen</Text>
                        </Pressable>
                      )}

                      <Pressable
                        style={[styles.actionButton, { backgroundColor: '#C06060' }]}
                        onPress={() => handleDeleteContent(selectedReport)}
                      >
                        <Trash2 size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Inhalt löschen</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionButton, { backgroundColor: '#E8A44E' }]}
                        onPress={() => {
                          setSelectedReport(null);
                          setTimeout(() => setBanModalUserId(selectedReport.reportedUserId), 300);
                        }}
                      >
                        <Timer size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Zeitsperre verhängen</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionButton, { backgroundColor: '#8B0000' }]}
                        onPress={() => handleBanUser(selectedReport)}
                      >
                        <Ban size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Nutzer sperren</Text>
                      </Pressable>

                      <View style={styles.actionRow}>
                        <Pressable
                          style={[styles.actionButton, styles.resolveBtn]}
                          onPress={() => handleResolve(selectedReport)}
                        >
                          <CheckCircle size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Erledigt</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, styles.dismissBtn]}
                          onPress={() => handleDismiss(selectedReport)}
                        >
                          <XCircle size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Freigeben</Text>
                        </Pressable>
                      </View>
                    </>
                  )}

                  {selectedReport.resolvedAt && (
                    <View style={[styles.resolutionBox, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.detailLabel, { color: colors.tertiaryText, marginBottom: 4 }]}>Entscheidung</Text>
                      <Text style={[styles.previewText, { color: colors.primaryText }]}>{selectedReport.resolution}</Text>
                      <Text style={[styles.resolutionTime, { color: colors.tertiaryText }]}>
                        {formatTimeAgo(selectedReport.resolvedAt)}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    style={[styles.deleteButton, { borderColor: colors.red }]}
                    onPress={() => {
                      setSelectedReport(null);
                      handleDelete(selectedReport.id);
                    }}
                  >
                    <Text style={[styles.deleteButtonText, { color: colors.red }]}>Meldung löschen</Text>
                  </Pressable>

                  <View style={{ height: 30 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedUserId}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUserId(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedUserId(null)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            {selectedUserId && selectedUserStats && (() => {
              const user = getUserById(selectedUserId);
              const displayName = user?.displayName ?? 'Unbekannt';

              return (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.userProfileHeader}>
                    <View style={[styles.userProfileAvatar, { backgroundColor: selectedUserStats.total >= 3 ? 'rgba(192,96,96,0.2)' : 'rgba(191,163,93,0.15)' }]}>
                      <Text style={[styles.userProfileAvatarText, { color: selectedUserStats.total >= 3 ? '#C06060' : '#BFA35D' }]}>
                        {displayName.charAt(0)}
                      </Text>
                    </View>
                    <Text style={[styles.userProfileName, { color: colors.primaryText }]}>{displayName}</Text>
                    <Text style={[styles.userProfileHandle, { color: colors.tertiaryText }]}>@{user?.username ?? 'unknown'}</Text>
                  </View>

                  <View style={styles.gaugeCenter}>
                    <ThreatGauge
                      level={selectedUserStats.threatLevel}
                      label={selectedUserStats.threatLabel}
                      color={selectedUserStats.threatColor}
                      size={140}
                    />
                  </View>

                  {selectedUserStats.isCurrentlyRestricted && (
                    <View style={[styles.activeRestrictionBox, { backgroundColor: '#8B0000', borderColor: '#8B0000' }]}>
                      <ShieldAlert size={18} color="#fff" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activeRestrictionTitle, { color: '#fff' }]}>Aktuell eingeschränkt</Text>
                        {selectedUserStats.activeRestrictions.map((r, i) => (
                          <Text key={i} style={[styles.activeRestrictionDetail, { color: 'rgba(255,255,255,0.85)' }]}>
                            {RESTRICTION_LABELS[r.type]} · Noch {formatDuration(r.expiresAt)}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.userStatsGrid}>
                    <View style={[styles.userStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.userStatCardNum, { color: '#E8A44E' }]}>{selectedUserStats.pending}</Text>
                      <Text style={[styles.userStatCardLabel, { color: colors.tertiaryText }]}>Offen</Text>
                    </View>
                    <View style={[styles.userStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.userStatCardNum, { color: '#C06060' }]}>{selectedUserStats.resolved}</Text>
                      <Text style={[styles.userStatCardLabel, { color: colors.tertiaryText }]}>Bestätigt</Text>
                    </View>
                    <View style={[styles.userStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.userStatCardNum, { color: '#8e8e93' }]}>{selectedUserStats.dismissed}</Text>
                      <Text style={[styles.userStatCardLabel, { color: colors.tertiaryText }]}>Abgelehnt</Text>
                    </View>
                    <View style={[styles.userStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.userStatCardNum, { color: colors.primaryText }]}>{selectedUserStats.total}</Text>
                      <Text style={[styles.userStatCardLabel, { color: colors.tertiaryText }]}>Gesamt</Text>
                    </View>
                  </View>

                  {Object.keys(selectedUserStats.reasons).length > 0 && (
                    <View style={[styles.reasonsBreakdown, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.reasonsTitle, { color: colors.primaryText }]}>Vergehen nach Kategorie</Text>
                      {Object.entries(selectedUserStats.reasons)
                        .sort(([, a], [, b]) => b - a)
                        .map(([reason, count]) => {
                          const reasonInfo = REPORT_REASONS.find((r) => r.key === reason);
                          return (
                            <View key={reason} style={styles.reasonBreakdownRow}>
                              <Text style={styles.reasonBreakdownIcon}>{reasonInfo?.icon}</Text>
                              <Text style={[styles.reasonBreakdownLabel, { color: colors.primaryText }]}>{reasonInfo?.label}</Text>
                              <View style={[styles.reasonCountBadge, { backgroundColor: '#C06060' }]}>
                                <Text style={styles.reasonCountText}>{count}x</Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}

                  <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Meldungsverlauf</Text>

                  {selectedUserReports.map((report) => {
                    const reason = REPORT_REASONS.find((r) => r.key === report.reason);
                    const statusColor = getStatusColor(report.status);
                    const reporterName = report.reporterUserId === 'me' ? 'Du' : (getUserById(report.reporterUserId)?.displayName ?? 'Unbekannt');

                    return (
                      <Pressable
                        key={report.id}
                        style={[styles.miniReportCard, { backgroundColor: colors.surfaceSecondary }]}
                        onPress={() => {
                          setSelectedUserId(null);
                          setTimeout(() => setSelectedReport(report), 300);
                        }}
                      >
                        <View style={styles.miniReportHeader}>
                          <View style={styles.cardTypeRow}>
                            {getContentIcon(report.contentType)}
                            <Text style={[styles.miniReportType, { color: colors.tertiaryText }]}>
                              {CONTENT_TYPE_LABELS[report.contentType]}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(report.status)}</Text>
                          </View>
                        </View>
                        <Text style={[styles.miniReportReason, { color: colors.primaryText }]}>
                          {reason?.icon} {reason?.label}
                        </Text>
                        <Text style={[styles.miniReporterName, { color: colors.tertiaryText }]}>
                          Gemeldet von: {reporterName}
                        </Text>
                        {report.contentPreview.length > 0 && (
                          <Text style={[styles.miniReportPreview, { color: colors.tertiaryText }]} numberOfLines={1}>
                            "{report.contentPreview}"
                          </Text>
                        )}
                        <Text style={[styles.miniReportTime, { color: colors.tertiaryText }]}>
                          {formatTimeAgo(report.createdAt)}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <Pressable
                    style={[styles.actionButton, { backgroundColor: '#E8A44E', marginTop: 16 }]}
                    onPress={() => {
                      setSelectedUserId(null);
                      setTimeout(() => setBanModalUserId(selectedUserId), 300);
                    }}
                  >
                    <Timer size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Zeitsperre verhängen</Text>
                  </Pressable>

                  {selectedUserStats.total >= 3 && (
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: '#8B0000' }]}
                      onPress={() => {
                        Alert.alert(
                          'Nutzer sperren',
                          `Möchtest du "${displayName}" wirklich sperren?`,
                          [
                            { text: 'Abbrechen', style: 'cancel' },
                            {
                              text: 'Sperren',
                              style: 'destructive',
                              onPress: () => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                setSelectedUserId(null);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Ban size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Nutzer sperren</Text>
                    </Pressable>
                  )}

                  <View style={{ height: 30 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!banModalUserId}
        transparent
        animationType="slide"
        onRequestClose={() => setBanModalUserId(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBanModalUserId(null)} />
          <View style={[styles.banSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                Zeitsperre verhängen
              </Text>
              {banModalUserId && (
                <Text style={[styles.banUserName, { color: colors.secondaryText }]}>
                  Für: {getUserById(banModalUserId)?.displayName ?? 'Unbekannt'}
                </Text>
              )}

              <Text style={[styles.noteLabel, { color: colors.primaryText }]}>Art der Sperre</Text>
              <View style={styles.banTypeRow}>
                {([
                  { key: 'comment_ban' as const, label: 'Kommentar', icon: <MessageSquare size={14} color={banType === 'comment_ban' ? '#fff' : colors.tertiaryText} /> },
                  { key: 'post_ban' as const, label: 'Beitrag', icon: <FileText size={14} color={banType === 'post_ban' ? '#fff' : colors.tertiaryText} /> },
                  { key: 'like_ban' as const, label: 'Like', icon: <Heart size={14} color={banType === 'like_ban' ? '#fff' : colors.tertiaryText} /> },
                  { key: 'full_ban' as const, label: 'Voll', icon: <Ban size={14} color={banType === 'full_ban' ? '#fff' : colors.tertiaryText} /> },
                ]).map((bt) => (
                  <Pressable
                    key={bt.key}
                    style={[
                      styles.banTypeBtn,
                      {
                        backgroundColor: banType === bt.key ? '#C06060' : colors.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setBanType(bt.key)}
                  >
                    {bt.icon}
                    <Text style={[styles.banTypeBtnText, { color: banType === bt.key ? '#fff' : colors.primaryText }]}>
                      {bt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.noteLabel, { color: colors.primaryText }]}>Dauer (Minuten)</Text>
              <View style={styles.durationRow}>
                {['30', '60', '1440', '10080'].map((d) => {
                  const labels: Record<string, string> = { '30': '30Min', '60': '1Std', '1440': '1Tag', '10080': '7Tage' };
                  return (
                    <Pressable
                      key={d}
                      style={[
                        styles.durationBtn,
                        {
                          backgroundColor: banDuration === d ? '#E8A44E' : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => setBanDuration(d)}
                    >
                      <Text style={[styles.durationBtnText, { color: banDuration === d ? '#1c1c1e' : colors.primaryText }]}>
                        {labels[d]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={[styles.durationInput, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                placeholder="Eigene Dauer in Minuten..."
                placeholderTextColor={colors.tertiaryText}
                keyboardType="number-pad"
                value={banDuration}
                onChangeText={setBanDuration}
              />

              <Text style={[styles.noteLabel, { color: colors.primaryText }]}>Begründung</Text>
              <TextInput
                style={[styles.noteInput, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                placeholder="Grund für die Einschränkung..."
                placeholderTextColor={colors.tertiaryText}
                multiline
                value={banReason}
                onChangeText={setBanReason}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.actionButton, { backgroundColor: '#C06060' }]}
                onPress={handleApplyBan}
              >
                <Timer size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Sperre aktivieren</Text>
              </Pressable>

              <Pressable
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setBanModalUserId(null)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.tertiaryText }]}>Abbrechen</Text>
              </Pressable>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  heroSection: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.5)',
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    color: '#E8DCC8',
    fontSize: 20,
    fontWeight: '800' as const,
  },
  heroStatLabel: {
    color: 'rgba(191,163,93,0.4)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  tabsWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  tabsScroll: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(191,163,93,0.12)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  list: {
    paddingBottom: 30,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardType: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reasonIcon: {
    fontSize: 18,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  previewWrap: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  preview: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic' as const,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  userChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  userChipLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  userChipName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  arrowSep: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  repeatOffender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  repeatOffenderText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  restrictedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  restrictedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  banSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 18,
    marginTop: 8,
  },
  banUserName: {
    fontSize: 14,
    marginTop: -14,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniWarningBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniWarningText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    marginTop: 4,
    borderWidth: 1,
  },
  warningTextWrap: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  inlineRestriction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  inlineRestrictionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  previewBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    marginTop: 4,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 14,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resolveBtn: {
    flex: 1,
    backgroundColor: '#50B450',
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: '#8e8e93',
  },
  resolutionBox: {
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  resolutionTime: {
    fontSize: 11,
    marginTop: 6,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  userCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  userHandle: {
    fontSize: 12,
    marginTop: 1,
  },
  userMiniGauge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  gaugeBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  gaugeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    minWidth: 50,
    textAlign: 'right' as const,
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  userStatBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
    flexDirection: 'row',
    gap: 4,
  },
  userStatNum: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  userStatLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
  },
  userProfileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  userProfileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  userProfileAvatarText: {
    fontSize: 26,
    fontWeight: '700' as const,
  },
  userProfileName: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  userProfileHandle: {
    fontSize: 14,
    marginTop: 2,
  },
  gaugeCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  activeRestrictionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeRestrictionTitle: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  activeRestrictionDetail: {
    color: '#C06060',
    fontSize: 12,
    lineHeight: 18,
  },
  userStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  userStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  userStatCardNum: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  userStatCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  reasonsBreakdown: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  reasonsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  reasonBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  reasonBreakdownIcon: {
    fontSize: 16,
  },
  reasonBreakdownLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  reasonCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reasonCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  miniReportCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  miniReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniReportType: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  miniReportReason: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  miniReporterName: {
    fontSize: 11,
    marginBottom: 4,
  },
  miniReportPreview: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginBottom: 4,
  },
  miniReportTime: {
    fontSize: 10,
  },
  banTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  banTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  banTypeBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  durationBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  durationInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  restrictionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  restrictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  restrictionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  restrictionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictionInfo: {
    flex: 1,
  },
  restrictionName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  restrictionType: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  restrictionRight: {
    alignItems: 'flex-end',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText2: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  restrictionReason: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
    marginHorizontal: 48,
  },
  restrictionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restrictionMetaText: {
    fontSize: 11,
    flex: 1,
  },
  liftBanBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liftBanText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
