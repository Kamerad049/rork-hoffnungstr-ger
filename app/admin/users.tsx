import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import {
  Users,
  ChevronRight,
  ArrowLeft,
  Search,
  X,
  ArrowUpDown,
  Trash2,
  ShieldBan,
  ChevronDown,
  UserX,
  Crown,
  Clock,
  Hash,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RankIcon from '@/components/RankIcon';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import type { SocialUser } from '@/constants/types';

type SortKey = 'name' | 'xp' | 'rank' | 'posts' | 'stamps';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'name', label: 'Name', icon: <Users size={14} color="#BFA35D" /> },
  { key: 'xp', label: 'XP', icon: <Crown size={14} color="#BFA35D" /> },
  { key: 'rank', label: 'Rang', icon: <Hash size={14} color="#BFA35D" /> },
  { key: 'posts', label: 'Beiträge', icon: <Clock size={14} color="#BFA35D" /> },
  { key: 'stamps', label: 'Stempel', icon: <Hash size={14} color="#BFA35D" /> },
];

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { allUsers, deleteUser, banUser } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...allUsers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.rank ?? '').toLowerCase().includes(q) ||
          (u.bundesland ?? '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case 'xp':
          cmp = (a.xp ?? 0) - (b.xp ?? 0);
          break;
        case 'rank':
          cmp = (a.xp ?? 0) - (b.xp ?? 0);
          break;
        case 'posts':
          cmp = (a.postCount ?? 0) - (b.postCount ?? 0);
          break;
        case 'stamps':
          cmp = (a.stampCount ?? 0) - (b.stampCount ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allUsers, searchQuery, sortKey, sortDir]);

  const handleToggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return key;
    });
    setShowSortMenu(false);
  }, []);

  const confirmDeleteUser = useCallback(
    (user: SocialUser) => {
      Alert.alert(
        'Nutzer löschen',
        `Möchtest du "${user.displayName}" (@${user.username}) wirklich unwiderruflich löschen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen',
            style: 'destructive',
            onPress: async () => {
              const ok = await deleteUser(user.id);
              if (ok) {
                setSelectedUserId(null);
                console.log('[ADMIN] User deleted successfully:', user.id);
              } else {
                Alert.alert('Fehler', 'Nutzer konnte nicht gelöscht werden.');
              }
            },
          },
        ]
      );
    },
    [deleteUser]
  );

  const confirmBanUser = useCallback(
    (user: SocialUser) => {
      Alert.alert(
        'Nutzer sperren',
        `Möchtest du "${user.displayName}" (@${user.username}) sperren? Der Nutzer kann sich nicht mehr anmelden.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Sperren',
            style: 'destructive',
            onPress: async () => {
              const ok = await banUser(user.id);
              if (ok) {
                setSelectedUserId(null);
                Alert.alert('Gesperrt', `${user.displayName} wurde gesperrt.`);
                console.log('[ADMIN] User banned successfully:', user.id);
              } else {
                Alert.alert('Fehler', 'Nutzer konnte nicht gesperrt werden.');
              }
            },
          },
        ]
      );
    },
    [banUser]
  );

  const renderItem = useCallback(
    ({ item }: { item: SocialUser }) => {
      const isSelected = selectedUserId === item.id;

      return (
        <View>
          <Pressable
            style={[
              styles.card,
              isSelected && styles.cardSelected,
            ]}
            onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } } as any)}
            onLongPress={() => setSelectedUserId(isSelected ? null : item.id)}
            testID={`admin-user-${item.id}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.username}>@{item.username}</Text>
            </View>
            <View style={styles.statsCol}>
              <Text style={styles.statVal}>{item.xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statsCol}>
              <RankIcon icon={item.rankIcon} size={18} color="#BFA35D" />
              <Text style={styles.statLabel}>{item.rank}</Text>
            </View>
            <ChevronRight size={16} color="rgba(191,163,93,0.3)" />
          </Pressable>

          {isSelected && (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionBtnProfile}
                onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } } as any)}
              >
                <Users size={14} color="#BFA35D" />
                <Text style={styles.actionBtnProfileText}>Profil</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtnBan}
                onPress={() => confirmBanUser(item)}
              >
                <ShieldBan size={14} color="#E8A44E" />
                <Text style={styles.actionBtnBanText}>Sperren</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtnDelete}
                onPress={() => confirmDeleteUser(item)}
              >
                <Trash2 size={14} color="#C06060" />
                <Text style={styles.actionBtnDeleteText}>Löschen</Text>
              </Pressable>
            </View>
          )}
        </View>
      );
    },
    [selectedUserId, router, confirmBanUser, confirmDeleteUser]
  );

  const listHeader = useCallback(
    () => (
      <>
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={18} color="#BFA35D" />
          </Pressable>
          <View style={styles.heroIconWrap}>
            <Users size={32} color="#BFA35D" />
          </View>
          <Text style={styles.heroTitle}>Nutzer verwalten</Text>
          <Text style={styles.heroSubtitle}>
            Suche, sortiere und verwalte alle registrierten Nutzer.
          </Text>
        </LinearGradient>

        <View style={styles.toolsSection}>
          <View style={styles.searchContainer}>
            <Search size={16} color="rgba(191,163,93,0.4)" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Nutzer suchen..."
              placeholderTextColor="rgba(191,163,93,0.3)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              testID="admin-user-search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={16} color="rgba(191,163,93,0.5)" />
              </Pressable>
            )}
          </View>

          <View style={styles.sortRow}>
            <Pressable
              style={styles.sortToggle}
              onPress={() => setShowSortMenu((v) => !v)}
            >
              <ArrowUpDown size={14} color="#BFA35D" />
              <Text style={styles.sortToggleText}>
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
              </Text>
              <ChevronDown
                size={12}
                color="rgba(191,163,93,0.5)"
                style={showSortMenu ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>
            <Pressable
              style={styles.sortDirBtn}
              onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <Text style={styles.sortDirText}>
                {sortDir === 'asc' ? 'A→Z / Aufsteigend' : 'Z→A / Absteigend'}
              </Text>
            </Pressable>
            <Text style={styles.countLabel}>
              {filteredAndSortedUsers.length} von {allUsers.length}
            </Text>
          </View>

          {showSortMenu && (
            <View style={styles.sortMenu}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.sortMenuItem,
                    sortKey === opt.key && styles.sortMenuItemActive,
                  ]}
                  onPress={() => handleToggleSort(opt.key)}
                >
                  {opt.icon}
                  <Text
                    style={[
                      styles.sortMenuItemText,
                      sortKey === opt.key && styles.sortMenuItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {sortKey === opt.key && (
                    <Text style={styles.sortMenuCheck}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.hintRow}>
          <UserX size={12} color="rgba(191,163,93,0.3)" />
          <Text style={styles.hintText}>Lang drücken für Aktionen</Text>
        </View>
      </>
    ),
    [
      insets.top,
      searchQuery,
      sortKey,
      sortDir,
      showSortMenu,
      filteredAndSortedUsers.length,
      allUsers.length,
      router,
      handleToggleSort,
    ]
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={filteredAndSortedUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            {searchQuery.length > 0 ? (
              <>
                <Search size={48} color="rgba(191,163,93,0.2)" />
                <Text style={styles.emptyTitle}>Keine Treffer</Text>
                <Text style={styles.emptyText}>
                  Kein Nutzer gefunden für "{searchQuery}"
                </Text>
                <Pressable style={styles.clearBtn} onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearBtnText}>Suche zurücksetzen</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Users size={48} color="rgba(191,163,93,0.2)" />
                <Text style={styles.emptyTitle}>Keine Nutzer</Text>
                <Text style={styles.emptyText}>
                  Es sind noch keine Nutzer registriert.
                </Text>
              </>
            )}
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
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
  toolsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#E8DCC8',
    height: 48,
  },
  sortRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  sortToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(191,163,93,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },
  sortToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  sortDirBtn: {
    backgroundColor: 'rgba(191,163,93,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sortDirText: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.5)',
    fontWeight: '500' as const,
  },
  countLabel: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.4)',
    fontWeight: '600' as const,
    marginLeft: 'auto' as const,
  },
  sortMenu: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    overflow: 'hidden' as const,
  },
  sortMenuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.04)',
  },
  sortMenuItemActive: {
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  sortMenuItemText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(232,220,200,0.6)',
    fontWeight: '500' as const,
  },
  sortMenuItemTextActive: {
    color: '#BFA35D',
    fontWeight: '700' as const,
  },
  sortMenuCheck: {
    fontSize: 14,
    color: '#BFA35D',
    fontWeight: '700' as const,
  },
  hintRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.3)',
    fontWeight: '500' as const,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 2,
    marginHorizontal: 16,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  cardSelected: {
    borderColor: 'rgba(191,163,93,0.2)',
    backgroundColor: '#222224',
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(191,163,93,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 2,
  },
  username: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.4)',
  },
  statsCol: {
    alignItems: 'center' as const,
    minWidth: 40,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    color: 'rgba(191,163,93,0.4)',
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#222224',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(191,163,93,0.2)',
    marginBottom: 2,
  },
  actionBtnProfile: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  actionBtnProfileText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  actionBtnBan: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(232,164,78,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,164,78,0.15)',
  },
  actionBtnBanText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#E8A44E',
  },
  actionBtnDelete: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(192,96,96,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
  },
  actionBtnDeleteText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#C06060',
  },
  empty: {
    alignItems: 'center' as const,
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.4)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  clearBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(191,163,93,0.1)',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
});
