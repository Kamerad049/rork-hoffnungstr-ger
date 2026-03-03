import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, UserPlus, UserCheck, X, Users, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RankIcon from '@/components/RankIcon';
import { Stack, useRouter as useExpoRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { SocialUser } from '@/constants/types';
import * as Haptics from 'expo-haptics';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const {
    friendUsers,
    friendRequestUsers,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    isFriend,
    hasSentRequest,
    isBlocked,
    leaderboard,
  } = useFriends();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const searchResults = searchQuery.trim().length > 0
    ? leaderboard.filter(
        (u: any) =>
          u.id !== 'me' &&
          !isFriend(u.id) &&
          !isBlocked(u.id) &&
          (u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.username.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleAccept = useCallback(
    (userId: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      acceptFriendRequest(userId);
    },
    [acceptFriendRequest]
  );

  const handleReject = useCallback(
    (userId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      rejectFriendRequest(userId);
    },
    [rejectFriendRequest]
  );

  const handleAddFriend = useCallback(
    (userId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendFriendRequest(userId);
    },
    [sendFriendRequest]
  );

  const handleViewProfile = useCallback(
    (userId: string) => {
      router.push({ pathname: '/user-profile', params: { userId } } as any);
    },
    [router]
  );

  const renderFriend = useCallback(
    ({ item }: { item: SocialUser }) => {
      const initial = item.displayName.charAt(0).toUpperCase();
      return (
        <Pressable
          style={({ pressed }) => [
            styles.userItem,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => handleViewProfile(item.id)}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <View style={styles.userRankRow}>
              <RankIcon icon={item.rankIcon} size={12} color="rgba(232,220,200,0.4)" />
              <Text style={styles.userRank}>
                {item.rank} · {item.ep.toLocaleString()} EP
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleViewProfile]
  );

  const renderRequest = useCallback(
    ({ item }: { item: SocialUser }) => {
      const initial = item.displayName.charAt(0).toUpperCase();
      return (
        <Pressable
          style={({ pressed }) => [
            styles.userItem,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => handleViewProfile(item.id)}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <Text style={styles.userRank}>
              @{item.username}
            </Text>
          </View>
          <View style={styles.requestActions}>
            <Pressable
              style={styles.acceptBtn}
              onPress={(e) => { e.stopPropagation(); handleAccept(item.id); }}
              hitSlop={4}
            >
              <UserCheck size={16} color="#1c1c1e" />
            </Pressable>
            <Pressable
              style={styles.rejectBtn}
              onPress={(e) => { e.stopPropagation(); handleReject(item.id); }}
              hitSlop={4}
            >
              <X size={16} color="#C06060" />
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [handleAccept, handleReject, handleViewProfile]
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: SocialUser }) => {
      const initial = item.displayName.charAt(0).toUpperCase();
      const sent = hasSentRequest(item.id);
      return (
        <View style={styles.userItem}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <View style={styles.userRankRow}>
              <Text style={styles.userRank}>@{item.username} · </Text>
              <RankIcon icon={item.rankIcon} size={12} color="rgba(232,220,200,0.4)" />
              <Text style={styles.userRank}> {item.rank}</Text>
            </View>
          </View>
          <Pressable
            style={[
              styles.addBtn,
              sent ? styles.addBtnSent : styles.addBtnActive,
            ]}
            onPress={() => !sent && handleAddFriend(item.id)}
            disabled={sent}
          >
            <UserPlus size={16} color={sent ? 'rgba(232,220,200,0.3)' : '#1c1c1e'} />
            <Text style={[styles.addBtnText, { color: sent ? 'rgba(232,220,200,0.3)' : '#1c1c1e' }]}>
              {sent ? 'Gesendet' : 'Hinzufügen'}
            </Text>
          </Pressable>
        </View>
      );
    },
    [hasSentRequest, handleAddFriend]
  );

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'friends', label: 'Freunde', count: friendUsers.length },
    { key: 'requests', label: 'Anfragen', count: friendRequestUsers.length },
    { key: 'search', label: 'Suchen' },
  ];

  const HeroHeader = useCallback(() => (
    <LinearGradient
      colors={['#1e1d1a', '#1a1918', '#141416']}
      style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <ChevronLeft size={20} color="#BFA35D" />
      </Pressable>
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
        <Users size={32} color="#BFA35D" />
      </View>
      <Text style={styles.heroTitle}>Freunde</Text>
    </LinearGradient>
  ), [insets.top, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <HeroHeader />

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#BFA35D' : 'rgba(232,220,200,0.35)' },
              ]}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchBar}>
          <Search size={18} color="rgba(232,220,200,0.35)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Benutzer suchen..."
            placeholderTextColor="rgba(232,220,200,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {activeTab === 'friends' && (
        <FlatList
          data={friendUsers}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Noch keine Freunde. Suche nach Gleichgesinnten!
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={friendRequestUsers}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Keine offenen Anfragen.
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'search' && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery.trim().length > 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Keine Ergebnisse für "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Suche nach Benutzernamen oder Namen
                </Text>
              </View>
            )
          }
        />
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
    marginBottom: 20,
    marginLeft: 4,
    zIndex: 10,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroLine: {
    position: 'absolute',
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
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#BFA35D',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#1e1e20',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#E8DCC8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#1e1e20',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  avatarText: {
    color: '#BFA35D',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  userRank: {
    fontSize: 12,
    color: 'rgba(232,220,200,0.4)',
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFA35D',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C06060',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  addBtnActive: {
    backgroundColor: '#BFA35D',
  },
  addBtnSent: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(232,220,200,0.35)',
  },
});
