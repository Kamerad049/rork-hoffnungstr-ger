import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { OptimizedAvatar } from '@/components/OptimizedImage';
import { useRouter } from 'expo-router';
import { Trophy, Flame, Award } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RankIcon from '@/components/RankIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useFriends } from '@/providers/FriendsProvider';
import type { SocialUser } from '@/constants/types';

type RankedUser = SocialUser & { position: number };

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

function PodiumCard({ user, position, colors, onPress }: {
  user: RankedUser;
  position: number;
  colors: any;
  onPress: () => void;
}) {
  const medalColor = MEDAL_COLORS[position - 1] ?? colors.tertiaryText;
  const initial = user.displayName.charAt(0).toUpperCase();
  const isFirst = position === 1;
  const avatarSize = isFirst ? 72 : 56;

  return (
    <Pressable style={[styles.podiumCard, isFirst && styles.podiumFirst]} onPress={onPress}>
      <View style={styles.podiumPosition}>
        <Trophy size={isFirst ? 24 : 18} color={medalColor} />
        <Text style={[styles.podiumNumber, { color: medalColor }]}>{position}</Text>
      </View>
      <View
        style={[
          styles.podiumAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: Math.round(avatarSize * 0.22),
            backgroundColor: 'rgba(191,163,93,0.1)',
            borderColor: medalColor,
            borderWidth: 3,
          },
        ]}
      >
        {user.avatarUrl ? (
          <OptimizedAvatar uri={user.avatarUrl} size={avatarSize} borderRadius={Math.round(avatarSize * 0.22)} />
        ) : (
          <Text style={[styles.podiumAvatarText, { fontSize: isFirst ? 28 : 22 }]}>{initial}</Text>
        )}
      </View>
      <Text style={[styles.podiumName, { color: '#E8DCC8' }]} numberOfLines={1}>
        {user.displayName}
      </Text>
      <View style={styles.podiumRankRow}>
        <RankIcon icon={user.rankIcon} size={12} color="rgba(232,220,200,0.7)" />
        <Text style={styles.podiumRank}>{user.rank}</Text>
      </View>
      <View style={styles.xpBadge}>
        <Flame size={12} color="#BFA35D" />
        <Text style={styles.xpText}>{user.xp.toLocaleString()} XP</Text>
      </View>
    </Pressable>
  );
}

export default function RankingScreen() {
  const { colors } = useTheme();
  const { leaderboard } = useFriends();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 25);

  const handleUserPress = useCallback(
    (userId: string) => {
      if (userId === 'me') return;
      router.push({ pathname: '/user-profile', params: { userId } } as any);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: RankedUser }) => {
      const initial = item.displayName.charAt(0).toUpperCase();
      const isMe = item.id === 'me';

      return (
        <Pressable
          style={[
            styles.listItem,
            isMe && styles.listItemMe,
          ]}
          onPress={() => handleUserPress(item.id)}
        >
          <Text style={styles.listPosition}>
            {item.position}
          </Text>
          {item.avatarUrl ? (
            <OptimizedAvatar uri={item.avatarUrl} size={42} borderRadius={10} />
          ) : (
            <View style={styles.listAvatar}>
              <Text style={styles.listAvatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.listInfo}>
            <View style={styles.listNameRow}>
              <Text style={styles.listName} numberOfLines={1}>
                {isMe ? `${item.displayName} (Du)` : item.displayName}
              </Text>
              <RankIcon icon={item.rankIcon} size={13} color="rgba(191,163,93,0.5)" />
            </View>
            <Text style={styles.listRank}>{item.rank}</Text>
          </View>
          <View style={styles.listStats}>
            <View style={styles.listStatRow}>
              <Flame size={14} color="#BFA35D" />
              <Text style={styles.listXp}>{item.xp.toLocaleString()}</Text>
            </View>
            <View style={styles.listStatRow}>
              <Award size={12} color="rgba(191,163,93,0.5)" />
              <Text style={styles.listStamps}>{item.stampCount}</Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleUserPress]
  );

  const ListHeader = useCallback(
    () => (
      <View>
        <LinearGradient
          colors={['#1e1d1a', '#1a1918', '#141416']}
          style={[styles.podiumContainer, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroPattern}>
            {[...Array(8)].map((_, i) => (
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
          <Text style={styles.podiumTitle}>TOP 25 Entdecker</Text>
          <Text style={styles.podiumSubtitle}>
            Sammle XP durch Stempel, Beiträge und Kommentare
          </Text>
          <View style={styles.podiumRow}>
            {top3[1] && (
              <PodiumCard
                user={top3[1]}
                position={2}
                colors={colors}
                onPress={() => handleUserPress(top3[1].id)}
              />
            )}
            {top3[0] && (
              <PodiumCard
                user={top3[0]}
                position={1}
                colors={colors}
                onPress={() => handleUserPress(top3[0].id)}
              />
            )}
            {top3[2] && (
              <PodiumCard
                user={top3[2]}
                position={3}
                colors={colors}
                onPress={() => handleUserPress(top3[2].id)}
              />
            )}
          </View>
        </LinearGradient>
        {rest.length > 0 && (
          <Text style={styles.sectionTitle}>
            Weitere Entdecker
          </Text>
        )}
      </View>
    ),
    [top3, rest.length, colors, handleUserPress, insets.top]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rest}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  listContent: {
    paddingBottom: 30,
  },
  podiumContainer: {
    paddingBottom: 28,
    paddingHorizontal: 16,
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
  podiumTitle: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 6,
  },
  podiumSubtitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  podiumCard: {
    alignItems: 'center',
    width: 100,
    paddingBottom: 8,
  },
  podiumFirst: {
    marginBottom: 10,
  },
  podiumPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  podiumNumber: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumAvatarText: {
    color: '#E8DCC8',
    fontWeight: '800' as const,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  podiumRank: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    color: '#E8DCC8',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  listItemMe: {
    borderColor: 'rgba(191,163,93,0.3)',
    borderWidth: 1.5,
  },
  listPosition: {
    width: 28,
    fontSize: 16,
    fontWeight: '800' as const,
    textAlign: 'center',
    color: 'rgba(191,163,93,0.4)',
  },
  listAvatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  listAvatarText: {
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  listInfo: {
    flex: 1,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  podiumRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  listRank: {
    fontSize: 12,
    marginTop: 1,
    color: 'rgba(191,163,93,0.4)',
  },
  listStats: {
    alignItems: 'flex-end',
    gap: 3,
  },
  listStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listXp: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  listStamps: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.5)',
  },
});
