import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Lock, ChevronLeft, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '@/providers/PostsProvider';
import { useSocial } from '@/providers/SocialProvider';
import { getUserById } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';
import PostCard from '@/components/PostCard';

export default function UserPostsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { getPostsForUser } = usePosts();
  const { privacy, canViewContent } = useSocial();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  const profile = useMemo(() => getUserById(userId ?? ''), [userId]);
  const isOwnProfile = userId === 'me';

  const canView = useMemo(() => {
    if (isOwnProfile) return true;
    return canViewContent(privacy.showPosts, userId ?? '');
  }, [isOwnProfile, canViewContent, privacy.showPosts, userId]);

  const posts = useMemo(() => {
    if (!canView) return [];
    return getPostsForUser(userId ?? '');
  }, [canView, getPostsForUser, userId]);

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCommentPress = (postId: string) => {
    router.push({ pathname: '/(tabs)/feed/comments', params: { postId } } as any);
  };

  const handleUserPress = (uid: string) => {
    if (uid !== 'me') {
      router.push({ pathname: '/user-profile', params: { userId: uid } } as any);
    }
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <PostCard
      post={item}
      onCommentPress={handleCommentPress}
      onUserPress={handleUserPress}
    />
  );

  const renderHeader = () => (
    <Animated.View style={{ opacity: headerFadeAnim }}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
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
          <FileText size={28} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>
          {isOwnProfile ? 'Meine Beiträge' : `${profile?.displayName ?? ''}`}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isOwnProfile
            ? 'Deine veröffentlichten Beiträge.'
            : 'Veröffentlichte Beiträge.'}
        </Text>

        <View style={styles.countCard}>
          <Text style={styles.countNumber}>{posts.length}</Text>
          <Text style={styles.countLabel}>Beiträge</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        {!canView ? (
          <>
            {renderHeader()}
            <View style={styles.lockedContainer}>
              <LinearGradient
                colors={['#2a2a2e', '#1c1c1e']}
                style={styles.lockedCard}
              >
                <View style={styles.lockedIconWrap}>
                  <Lock size={28} color="rgba(191,163,93,0.5)" />
                </View>
                <Text style={styles.lockedTitle}>Beiträge sind privat</Text>
                <Text style={styles.lockedSub}>
                  {profile?.displayName} hat die Sichtbarkeit eingeschränkt.
                </Text>
              </LinearGradient>
            </View>
          </>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Noch keine Beiträge vorhanden.
                </Text>
              </View>
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
  listContent: {
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
  },

  heroSection: {
    paddingBottom: 24,
    paddingHorizontal: 20,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    color: '#E8DCC8',
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  countCard: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  countNumber: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: '#BFA35D',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.4)',
    marginTop: 2,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  lockedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 8,
  },
  lockedSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: 'rgba(232,220,200,0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.4)',
  },
});
