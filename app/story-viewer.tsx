import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { X, Trash2, Flag, Eye, ChevronUp, ChevronRight } from 'lucide-react-native';
import ReportModal from '@/components/ReportModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useStories, STORY_DURATION_SECONDS } from '@/providers/StoriesProvider';
import { useSocial } from '@/providers/SocialProvider';
import { getUserById, formatTimeAgo, cleanPanHandlers } from '@/lib/utils';
import type { StoryItem, StoryGroup, SocialUser } from '@/constants/types';
import { useAuth } from '@/providers/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { stories, markStoryViewed, deleteStory, getStoryViewers } = useStories();
  const { profile } = useSocial();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId: string; groupIndex: string }>();

  const startGroupIndex = parseInt(params.groupIndex ?? '0', 10);

  const [currentGroupIdx, setCurrentGroupIdx] = useState<number>(startGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState<number>(0);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showViewers, setShowViewers] = useState<boolean>(false);
  const viewersPanelAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPaused = useRef(false);
  const dismissAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dismissOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderGrant: () => {
        isPaused.current = true;
        animRef.current?.stop();
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          dismissAnim.setValue({ x: 0, y: gestureState.dy });
          const opacity = Math.max(0.3, 1 - gestureState.dy / (SCREEN_HEIGHT * 0.4));
          dismissOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          Animated.parallel([
            Animated.timing(dismissAnim, {
              toValue: { x: 0, y: SCREEN_HEIGHT },
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dismissOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            router.back();
          });
        } else {
          Animated.spring(dismissAnim, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          Animated.timing(dismissOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
          isPaused.current = false;
          startProgress();
        }
      },
    })
  ).current;

  const currentGroup: StoryGroup | undefined = stories[currentGroupIdx];
  const currentStory: StoryItem | undefined = currentGroup?.stories[currentStoryIdx];

  const isOwnStory = currentGroup?.userId === 'me';

  const storyUser = isOwnStory
    ? {
        id: 'me',
        displayName: profile.displayName || user?.name || 'Ich',
        username: 'ich',
        bio: '',
        avatarUrl: profile.avatarUrl,
        rank: '',
        rankIcon: 'Eye',
        xp: 0,
        stampCount: 0,
        postCount: 0,
        friendCount: 0,
      }
    : getUserById(currentGroup?.userId ?? '');

  const startProgress = useCallback(() => {
    if (!currentStory) return;
    progressAnim.setValue(0);
    animRef.current?.stop();
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION_SECONDS * 1000,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !isPaused.current) {
        goNext();
      }
    });
  }, [currentStory, currentGroupIdx, currentStoryIdx]);

  useEffect(() => {
    if (currentStory) {
      markStoryViewed(currentStory.id);
      startProgress();
    }
    return () => {
      animRef.current?.stop();
    };
  }, [currentGroupIdx, currentStoryIdx, currentStory?.id]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (currentStoryIdx < currentGroup.stories.length - 1) {
      setCurrentStoryIdx((prev) => prev + 1);
    } else if (currentGroupIdx < stories.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentStoryIdx(0);
    } else {
      router.back();
    }
  }, [currentGroup, currentGroupIdx, currentStoryIdx, stories.length, router]);

  const goPrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx((prev) => prev - 1);
    } else if (currentGroupIdx > 0) {
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentStoryIdx(0);
    }
  }, [currentGroupIdx, currentStoryIdx]);

  const handlePress = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      if (isLongPress.current) return;
      const x = evt.nativeEvent.locationX;
      if (x < SCREEN_WIDTH * 0.35) {
        goPrev();
      } else {
        goNext();
      }
    },
    [goPrev, goNext]
  );

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePressIn = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      isPaused.current = true;
      animRef.current?.stop();
    }, 150);
  }, []);

  const handlePressOut = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (isPaused.current) {
      isPaused.current = false;
      const currentVal = (progressAnim as any).__getValue?.() ?? 0;
      const remaining = (1 - currentVal) * STORY_DURATION_SECONDS * 1000;
      if (remaining > 50) {
        animRef.current?.stop();
        const anim = Animated.timing(progressAnim, {
          toValue: 1,
          duration: remaining,
          useNativeDriver: false,
        });
        animRef.current = anim;
        anim.start(({ finished }) => {
          if (finished && !isPaused.current) {
            goNext();
          }
        });
      } else {
        goNext();
      }
    }
  }, [progressAnim, goNext]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleReportStory = useCallback(() => {
    if (!currentStory || isOwnStory) return;
    animRef.current?.stop();
    isPaused.current = true;
    setShowReport(true);
  }, [currentStory, isOwnStory]);

  const handleReportClose = useCallback(() => {
    setShowReport(false);
    isPaused.current = false;
    startProgress();
  }, [startProgress]);

  const [storyViewers, setStoryViewers] = useState<SocialUser[]>([]);
  useEffect(() => {
    if (!currentStory || !isOwnStory) { setStoryViewers([]); return; }
    const load = async () => {
      const viewers = await getStoryViewers(currentStory.id);
      setStoryViewers(viewers);
    };
    load();
  }, [currentStory?.id, isOwnStory, getStoryViewers]);

  const handleToggleViewers = useCallback(() => {
    if (showViewers) {
      animRef.current?.stop();
      Animated.timing(viewersPanelAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowViewers(false);
        isPaused.current = false;
        startProgress();
      });
    } else {
      animRef.current?.stop();
      isPaused.current = true;
      setShowViewers(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.timing(viewersPanelAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showViewers, viewersPanelAnim, startProgress]);

  const handleViewerPress = useCallback((viewerId: string) => {
    console.log('[STORY] Viewer pressed, navigating to user:', viewerId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animRef.current?.stop();
    isPaused.current = true;
    setShowViewers(false);
    viewersPanelAnim.setValue(0);
    setTimeout(() => {
      console.log('[STORY] Now navigating to user-profile:', viewerId);
      router.push({ pathname: '/user-profile', params: { userId: viewerId } } as any);
    }, 100);
  }, [router, viewersPanelAnim]);

  const handleDeleteStory = useCallback(() => {
    if (!currentStory || !isOwnStory) return;

    animRef.current?.stop();
    isPaused.current = true;

    Alert.alert(
      'Story löschen',
      'Möchtest du diese Story wirklich löschen?',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
          onPress: () => {
            isPaused.current = false;
            startProgress();
          },
        },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteStory(currentStory.id);
            console.log('[STORY] Deleted story:', currentStory.id);

            const remainingInGroup = currentGroup!.stories.length - 1;
            if (remainingInGroup <= 0) {
              if (stories.length <= 1) {
                router.back();
              } else if (currentGroupIdx < stories.length - 1) {
                setCurrentStoryIdx(0);
              } else {
                router.back();
              }
            } else if (currentStoryIdx >= remainingInGroup) {
              setCurrentStoryIdx(remainingInGroup - 1);
            } else {
              startProgress();
            }
          },
        },
      ]
    );
  }, [currentStory, isOwnStory, currentGroup, currentGroupIdx, currentStoryIdx, stories.length, deleteStory, router, startProgress]);

  if (!currentGroup || !currentStory || !storyUser) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  const initial = storyUser.displayName.charAt(0).toUpperCase();
  const hasImage = !!currentStory.mediaUrl && currentStory.mediaUrl.length > 0;
  const bgColor = currentStory.bgColor || '#1c1c1e';

  const parsedFont = useMemo(() => {
    if (!currentStory.fontFamily) return null;
    const parts = currentStory.fontFamily.split('|');
    if (parts.length !== 3) return null;
    return {
      fontFamily: parts[0],
      fontWeight: parts[1] as 'normal' | 'bold' | '300' | '600' | '700' | '900',
      fontStyle: parts[2] as 'normal' | 'italic',
    };
  }, [currentStory.fontFamily]);

  const textTransform = useMemo(() => {
    const tx = (currentStory.textX ?? 0) * SCREEN_WIDTH;
    const ty = (currentStory.textY ?? 0) * SCREEN_HEIGHT;
    const sc = currentStory.textScale ?? 1;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: sc },
      ] as { translateX: number }[] | { translateY: number }[] | { scale: number }[],
    };
  }, [currentStory.textX, currentStory.textY, currentStory.textScale]);

  const hasCustomPos = currentStory.textX !== undefined || currentStory.textY !== undefined;

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[styles.dismissWrap, { transform: dismissAnim.getTranslateTransform(), opacity: dismissOpacity }]}
        {...cleanPanHandlers(panResponder.panHandlers)}
      >
      <Pressable
        style={styles.touchArea}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID="story-touch-area"
        pointerEvents={showViewers ? 'none' : 'auto'}
      >
        {hasImage ? (
          <Image
            source={{ uri: currentStory.mediaUrl }}
            style={styles.storyImage}
            resizeMode="cover"
          />
        ) : !hasCustomPos ? (
          <View style={[styles.storyTextBg, { backgroundColor: bgColor }]}>
            <Text style={[
              styles.storyTextContent,
              parsedFont && {
                fontFamily: parsedFont.fontFamily,
                fontWeight: parsedFont.fontWeight,
                fontStyle: parsedFont.fontStyle,
              },
            ]}>{currentStory.caption}</Text>
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
        )}

        {hasImage && currentStory.caption && hasCustomPos ? (
          <View
            style={[
              styles.positionedTextWrap,
              {
                transform: [
                  { translateX: (currentStory.textX ?? 0) * SCREEN_WIDTH },
                  { translateY: (currentStory.textY ?? 0) * SCREEN_HEIGHT },
                  { scale: currentStory.textScale ?? 1 },
                ],
              },
            ]}
          >
            <Text style={[
              styles.positionedText,
              parsedFont && {
                fontFamily: parsedFont.fontFamily,
                fontWeight: parsedFont.fontWeight,
                fontStyle: parsedFont.fontStyle,
              },
            ]}>{currentStory.caption}</Text>
          </View>
        ) : null}

        {!hasImage && hasCustomPos && currentStory.caption ? (
          <View
            style={[
              styles.positionedTextWrap,
              {
                transform: [
                  { translateX: (currentStory.textX ?? 0) * SCREEN_WIDTH },
                  { translateY: (currentStory.textY ?? 0) * SCREEN_HEIGHT },
                  { scale: currentStory.textScale ?? 1 },
                ],
              },
            ]}
          >
            <Text style={[
              styles.positionedText,
              parsedFont && {
                fontFamily: parsedFont.fontFamily,
                fontWeight: parsedFont.fontWeight,
                fontStyle: parsedFont.fontStyle,
              },
            ]}>{currentStory.caption}</Text>
          </View>
        ) : null}

        <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.progressContainer}>
            {currentGroup.stories.map((s, i) => {
              const isCompleted = i < currentStoryIdx;
              const isCurrent = i === currentStoryIdx;
              const animatedWidth = isCurrent
                ? progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                : isCompleted
                ? '100%'
                : '0%';
              const animatedColor = isCurrent
                ? progressAnim.interpolate({
                    inputRange: [0, 0.15, 0.4, 0.65, 0.85, 1],
                    outputRange: ['#111111', '#1a1a1a', '#8B0000', '#CC0000', '#D4A017', '#FFD700'],
                  })
                : isCompleted
                ? '#FFD700'
                : 'transparent';
              return (
                <View key={s.id} style={styles.progressTrack}>
                  <View style={[styles.progressBg, { backgroundColor: 'rgba(178,144,50,0.25)' }]} />
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: animatedColor,
                        width: animatedWidth,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.header}>
            <View style={styles.userInfo}>
              {storyUser.avatarUrl ? (
                <Image source={{ uri: storyUser.avatarUrl }} style={styles.avatarSmall} />
              ) : (
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={styles.userMeta}>
                <Text style={styles.userName}>{storyUser.displayName}</Text>
                <Text style={styles.storyTime}>{formatTimeAgo(currentStory.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {isOwnStory && (
                <Pressable
                  onPress={handleDeleteStory}
                  hitSlop={16}
                  style={styles.actionPill}
                  testID="story-delete"
                >
                  <Trash2 size={18} color="#BFA35D" style={styles.actionIconShadow} />
                </Pressable>
              )}
              {!isOwnStory && (
                <Pressable
                  onPress={handleReportStory}
                  hitSlop={16}
                  style={styles.actionPill}
                  testID="story-report"
                >
                  <Flag size={18} color="#BFA35D" style={styles.actionIconShadow} />
                </Pressable>
              )}
              <Pressable
                onPress={handleClose}
                hitSlop={16}
                style={styles.actionPill}
                testID="story-close"
              >
                <X size={20} color="#BFA35D" style={styles.actionIconShadow} />
              </Pressable>
            </View>
          </View>

          {hasImage && currentStory.caption && !hasCustomPos ? (
            <View style={styles.captionContainer}>
              <Text style={[
                styles.captionText,
                parsedFont && {
                  fontFamily: parsedFont.fontFamily,
                  fontWeight: parsedFont.fontWeight,
                  fontStyle: parsedFont.fontStyle,
                },
              ]}>{currentStory.caption}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      </Animated.View>

      {isOwnStory && (
        <Pressable
          onPress={handleToggleViewers}
          style={styles.viewersButton}
          hitSlop={12}
          testID="story-viewers-btn"
        >
          <Eye size={18} color="#fff" />
          <Text style={styles.viewersButtonText}>{storyViewers.length}</Text>
        </Pressable>
      )}

      {showViewers && (
        <Animated.View
          style={[
            styles.viewersPanel,
            {
              paddingBottom: insets.bottom + 16,
              transform: [{
                translateY: viewersPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              }],
            },
          ]}
        >
          <Pressable onPress={handleToggleViewers} style={styles.viewersPanelHandle}>
            <View style={styles.handleBar} />
            <ChevronUp size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <View style={styles.viewersHeader}>
            <Eye size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.viewersTitle}>{storyViewers.length} {storyViewers.length === 1 ? 'Zuschauer' : 'Zuschauer'}</Text>
          </View>
          <ScrollView
            style={styles.viewersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            nestedScrollEnabled
          >
            {storyViewers.map((viewer) => {
              const viewerInitial = viewer.displayName.charAt(0).toUpperCase();
              return (
                <Pressable
                  key={viewer.id}
                  style={({ pressed }) => [
                    styles.viewerRow,
                    pressed && { opacity: 0.7, backgroundColor: 'rgba(191,163,93,0.08)', borderColor: 'rgba(191,163,93,0.15)' },
                  ]}
                  onPress={() => handleViewerPress(viewer.id)}
                  testID={`viewer-${viewer.id}`}
                >
                  <View style={styles.viewerAvatar}>
                    <Text style={styles.viewerAvatarText}>{viewerInitial}</Text>
                  </View>
                  <View style={styles.viewerInfo}>
                    <Text style={styles.viewerName}>{viewer.displayName}</Text>
                    <Text style={styles.viewerRank}>{viewer.rank}</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(191,163,93,0.4)" />
                </Pressable>
              );
            })}
            {storyViewers.length === 0 && (
              <Text style={styles.noViewersText}>Noch keine Zuschauer</Text>
            )}
          </ScrollView>
        </Animated.View>
      )}

      <ReportModal
        visible={showReport}
        onClose={handleReportClose}
        contentType="story"
        contentId={currentStory?.id ?? ''}
        contentPreview={currentStory?.caption ?? 'Story'}
        reportedUserId={currentGroup?.userId ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dismissWrap: {
    flex: 1,
  },
  touchArea: {
    flex: 1,
  },
  storyImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  storyTextBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  storyTextContent: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  positionedTextWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  positionedText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 20,
    maxWidth: SCREEN_WIDTH - 40,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.25,
    overflow: 'hidden',
  },
  progressBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1.25,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1.25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,14,11,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(178,144,50,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  avatarInitial: {
    color: '#BFA35D',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  userMeta: {
    gap: 1,
  },
  userName: {
    color: '#BFA35D',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  storyTime: {
    color: 'rgba(191,163,93,0.55)',
    fontSize: 10,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionPill: {
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    borderRadius: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconShadow: {
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } as any,
  captionContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  captionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  viewersButton: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 10,
  },
  viewersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  viewersPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20,20,22,0.96)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.5,
    zIndex: 20,
    paddingTop: 6,
  },
  viewersPanelHandle: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  viewersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  viewersTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  viewersList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  viewerAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  viewerInfo: {
    flex: 1,
    gap: 2,
  },
  viewerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  viewerRank: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  noViewersText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
