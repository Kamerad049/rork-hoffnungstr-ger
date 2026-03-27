import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Check, CheckCheck, Undo2 } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useChat } from '@/providers/ChatProvider';
import { getUserById, formatTimeAgo } from '@/lib/utils';
import type { Conversation } from '@/constants/types';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const { conversations } = useChat();
  const router = useRouter();

  const handleChatPress = useCallback(
    (partnerId: string) => {
      router.push({ pathname: '/direct-chat', params: { partnerId } } as any);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => {
      const partner = getUserById(item.partnerId);
      if (!partner) return null;
      const initial = partner.displayName.charAt(0).toUpperCase();

      return (
        <Pressable
          style={[styles.chatItem, { backgroundColor: colors.surface }]}
          onPress={() => handleChatPress(item.partnerId)}
        >
          {partner.avatarUrl ? (
            <Image source={{ uri: partner.avatarUrl }} style={[styles.avatar, { backgroundColor: colors.accent }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.chatInfo}>
            <View style={styles.chatTopRow}>
              <Text style={[styles.chatName, { color: colors.primaryText }]} numberOfLines={1}>
                {partner.displayName}
              </Text>
              <Text style={[styles.chatTime, { color: colors.tertiaryText }]}>
                {formatTimeAgo(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.chatBottomRow}>
              <View style={styles.previewRow}>
                {item.isFromMe && !item.lastMessageRecalled && (
                  <View style={styles.statusIcon}>
                    {item.lastMessageRead ? (
                      <CheckCheck size={14} color="#34B7F1" strokeWidth={2.5} />
                    ) : (
                      <Check size={14} color={colors.tertiaryText} strokeWidth={2.5} />
                    )}
                  </View>
                )}
                {item.lastMessageRecalled && item.isFromMe && (
                  <View style={styles.statusIcon}>
                    <Undo2 size={12} color={colors.tertiaryText} />
                  </View>
                )}
                <Text
                  style={[
                    styles.chatPreview,
                    { color: item.unreadCount > 0 ? colors.primaryText : colors.tertiaryText },
                    item.unreadCount > 0 && styles.chatPreviewBold,
                    item.lastMessageRecalled && styles.chatPreviewItalic,
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [colors, handleChatPress]
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MessageCircle size={48} color={colors.tertiaryText} />
        <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>
          Keine Nachrichten
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.tertiaryText }]}>
          Schreibe deinen Freunden eine Nachricht!
        </Text>
      </View>
    ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.partnerId}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
    paddingBottom: 30,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.25)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statusIcon: {
    marginRight: 2,
  },
  chatPreview: {
    fontSize: 14,
    flex: 1,
  },
  chatPreviewBold: {
    fontWeight: '600' as const,
  },
  chatPreviewItalic: {
    fontStyle: 'italic' as const,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptySubtitle: {
    fontSize: 14,
  },
});
