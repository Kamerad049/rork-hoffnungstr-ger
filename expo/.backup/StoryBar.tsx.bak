import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Animated, TouchableWithoutFeedback, Image } from 'react-native';
import { Plus, FileText, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useStories } from '@/providers/StoriesProvider';
import { useSocial } from '@/providers/SocialProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById } from '@/lib/utils';
import type { StoryGroup } from '@/constants/types';

interface StoryBarProps {
  onStoryPress?: (group: StoryGroup, index: number) => void;
  onAddStory?: () => void;
  onCreatePost?: () => void;
  variant?: 'default' | 'reels';
}

function StoryBarInner({ onStoryPress, onAddStory, onCreatePost, variant = 'default' }: StoryBarProps) {
  const { colors } = useTheme();
  const { stories, isStoryViewed, activeOwnStories } = useStories();
  const { profile } = useSocial();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const openMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMenu(true);
    Animated.spring(menuAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [menuAnim]);

  const closeMenu = useCallback(() => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowMenu(false));
  }, [menuAnim]);

  const handleCreatePost = useCallback(() => {
    closeMenu();
    setTimeout(() => onCreatePost?.(), 200);
  }, [closeMenu, onCreatePost]);

  const handleCreateStory = useCallback(() => {
    closeMenu();
    setTimeout(() => onAddStory?.(), 200);
  }, [closeMenu, onAddStory]);

  const renderStory = useCallback(
    (group: StoryGroup, index: number) => {
      const isMe = group.userId === 'me';
      const storyUser = isMe ? null : getUserById(group.userId);
      if (!isMe && !storyUser) return null;

      const displayName = isMe
        ? (profile.displayName || user?.name || 'Ich')
        : storyUser!.displayName;
      const avatarUrl = isMe ? (profile.avatarUrl ?? null) : (storyUser?.avatarUrl ?? null);
      const allViewed = group.stories.every((s) => isStoryViewed(s.id));
      const initial = displayName.charAt(0).toUpperCase();
      const isReels = variant === 'reels';

      const avatarSize = isReels ? 58 : 68;
      const borderRadius = Math.round(avatarSize * 0.22);

      return (
        <Pressable
          key={group.userId}
          style={isReels ? reelsStyles.storyItem : styles.storyItem}
          onPress={() => onStoryPress?.(group, index)}
        >
          <View
            style={[
              styles.avatarOuter,
              {
                width: avatarSize + 4,
                height: (avatarSize + 4) * 1.15,
                borderRadius: borderRadius + 2,
                borderColor: !allViewed ? 'rgba(191,163,93,0.45)' : 'rgba(191,163,93,0.12)',
                borderWidth: !allViewed ? 2 : 1,
              },
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: avatarSize,
                  height: avatarSize * 1.15,
                  borderRadius,
                }}
              />
            ) : (
              <View
                style={[
                  {
                    width: avatarSize,
                    height: avatarSize * 1.15,
                    borderRadius,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isReels ? 'rgba(255,255,255,0.12)' : colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.storyInitial,
                    !isReels && { color: colors.primaryText },
                    isReels && { color: '#fff' },
                  ]}
                >
                  {initial}
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 4 }} />
          <Text
            style={[
              isReels ? reelsStyles.storyName : styles.storyName,
              !isReels && { color: colors.secondaryText },
            ]}
            numberOfLines={1}
          >
            {isMe ? 'Meine' : displayName.split(' ')[0]}
          </Text>
        </Pressable>
      );
    },
    [colors, isStoryViewed, onStoryPress, profile, user, variant]
  );

  const isReels = variant === 'reels';
  const addSize = isReels ? 58 : 68;
  const addRadius = Math.round(addSize * 0.22);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={isReels ? reelsStyles.container : styles.container}
      >
        <Pressable style={isReels ? reelsStyles.storyItem : styles.storyItem} onPress={openMenu} testID="add-story-btn">
          <View
            style={[
              styles.addBtnOuter,
              {
                width: addSize + 4,
                height: (addSize + 4) * 1.15,
                borderRadius: addRadius + 2,
                backgroundColor: isReels ? 'rgba(255,255,255,0.08)' : colors.accentLight,
                borderWidth: 1.5,
                borderColor: isReels ? 'rgba(255,255,255,0.2)' : 'rgba(191,163,93,0.2)',
                borderStyle: 'dashed',
              },
            ]}
          >
            <Plus size={isReels ? 24 : 22} color={isReels ? '#fff' : colors.accent} />
          </View>
          <View style={{ height: 4 }} />
          <Text style={isReels ? reelsStyles.addBtnText : [styles.storyName, { color: colors.accent }]}>Neu</Text>
        </Pressable>
        {stories.map((group, index) => renderStory(group, index))}
      </ScrollView>

      <Modal visible={showMenu} transparent animationType="none" onRequestClose={closeMenu}>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={menuStyles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[
                menuStyles.sheet,
                {
                  opacity: menuAnim,
                  transform: [{
                    translateY: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 0],
                    }),
                  }, {
                    scale: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  }],
                },
              ]}>
                <View style={menuStyles.handle} />
                <Text style={menuStyles.title}>Erstellen</Text>
                <Pressable
                  style={({ pressed }) => [menuStyles.option, pressed && menuStyles.optionPressed]}
                  onPress={handleCreatePost}
                  testID="menu-create-post"
                >
                  <View style={menuStyles.optionIcon}>
                    <FileText size={22} color="#BFA35D" />
                  </View>
                  <View style={menuStyles.optionTextWrap}>
                    <Text style={menuStyles.optionTitle}>Beitrag</Text>
                    <Text style={menuStyles.optionSub}>Fotos, Texte & mehr teilen</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [menuStyles.option, pressed && menuStyles.optionPressed]}
                  onPress={handleCreateStory}
                  testID="menu-create-story"
                >
                  <View style={[menuStyles.optionIcon, { backgroundColor: 'rgba(218,165,32,0.12)' }]}>
                    <Camera size={22} color="#DAA520" />
                  </View>
                  <View style={menuStyles.optionTextWrap}>
                    <Text style={menuStyles.optionTitle}>Story</Text>
                    <Text style={menuStyles.optionSub}>Momente für 24h teilen</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

export default React.memo(StoryBarInner);

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1914',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.15)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.25)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#E8DCC8',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 6,
  },
  optionPressed: {
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  optionSub: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 13,
    fontWeight: '400' as const,
  },
});

const reelsStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    width: 78,
  },
  storyName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 6,
  },
  storyItem: {
    alignItems: 'center',
    width: 82,
  },
  avatarOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addBtnOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyInitial: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  storyName: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
