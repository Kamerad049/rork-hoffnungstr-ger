import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Image } from 'react-native';
import { Trash2, FileText, ArrowLeft } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { FeedPost } from '@/constants/types';
import * as Haptics from 'expo-haptics';

export default function AdminPostsScreen() {
  const { colors } = useTheme();
  const { posts, deletePost, deleteAllPosts } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Löschen', 'Beitrag wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deletePost(id);
        },
      },
    ]);
  }, [deletePost]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert('Alle löschen', 'Wirklich ALLE Beiträge löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Alle löschen',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteAllPosts();
        },
      },
    ]);
  }, [deleteAllPosts]);

  const renderItem = useCallback(({ item }: { item: FeedPost }) => {
    const author = getUserById(item.userId);
    return (
      <View style={[styles.card, { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: 'rgba(191,163,93,0.06)' }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {(author?.displayName ?? item.userId).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.authorName, { color: colors.primaryText }]}>
              {author?.displayName ?? item.userId}
            </Text>
            <Text style={[styles.time, { color: colors.tertiaryText }]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
          <Pressable
            style={[styles.deleteBtn, { backgroundColor: 'rgba(192,96,96,0.12)' }]}
            onPress={() => handleDelete(item.id)}
            hitSlop={8}
          >
            <Trash2 size={16} color={colors.red} />
          </Pressable>
        </View>
        <Text style={[styles.postContent, { color: colors.primaryText }]} numberOfLines={3}>
          {item.content}
        </Text>
        {item.mediaUrls.length > 0 && (
          <Image source={{ uri: item.mediaUrls[0] }} style={styles.media} />
        )}
        <View style={styles.statsRow}>
          <Text style={[styles.stat, { color: colors.tertiaryText }]}>{item.likeCount} Likes</Text>
          <Text style={[styles.stat, { color: colors.tertiaryText }]}>{item.commentCount} Kommentare</Text>
        </View>
      </View>
    );
  }, [colors, handleDelete]);

  const listHeader = useCallback(() => (
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
          <FileText size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Beiträge verwalten</Text>
        <Text style={styles.heroSubtitle}>
          Überblicke und moderiere alle Nutzerbeiträge.
        </Text>
      </LinearGradient>

      {posts.length > 0 && (
        <View style={styles.toolbar}>
          <Text style={[styles.countLabel, { color: colors.tertiaryText }]}>{posts.length} Beiträge</Text>
          <Pressable style={[styles.deleteAllBtn, { borderColor: colors.red }]} onPress={handleDeleteAll}>
            <Trash2 size={14} color={colors.red} />
            <Text style={[styles.deleteAllText, { color: colors.red }]}>Alle löschen</Text>
          </Pressable>
        </View>
      )}
    </>
  ), [insets.top, colors, posts.length, handleDeleteAll, router]);

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FileText size={48} color={colors.tertiaryText} />
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Keine Beiträge vorhanden</Text>
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
  toolbar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countLabel: { fontSize: 14, fontWeight: '600' as const },
  deleteAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  deleteAllText: { fontSize: 13, fontWeight: '600' as const },
  list: { paddingBottom: 30 },
  card: { borderRadius: 14, marginBottom: 10, padding: 14, marginHorizontal: 16 },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: { fontSize: 15, fontWeight: '700' as const },
  headerInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700' as const },
  time: { fontSize: 11 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  postContent: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  media: { height: 140, borderRadius: 12, marginBottom: 8 },
  statsRow: { flexDirection: 'row' as const, gap: 16 },
  stat: { fontSize: 12 },
  empty: { alignItems: 'center' as const, paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
