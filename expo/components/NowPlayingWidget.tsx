import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Music, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SpotifyTrack } from '@/constants/types';

interface NowPlayingWidgetProps {
  track: SpotifyTrack;
  isOwnProfile?: boolean;
}

function EqualizerBar({ delay, height }: { delay: number; height: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400 + Math.random() * 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.2 + Math.random() * 0.3,
          duration: 300 + Math.random() * 400,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        styles.eqBar,
        {
          height,
          transform: [{ scaleY: anim }],
        },
      ]}
    />
  );
}

const NowPlayingWidget = React.memo(function NowPlayingWidget({ track, isOwnProfile }: NowPlayingWidgetProps) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (track.spotifyUrl) {
      Linking.openURL(track.spotifyUrl).catch(err =>
        console.log('[SPOTIFY] Failed to open URL:', err),
      );
    }
  }, [track.spotifyUrl]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }, [pressAnim]);

  const progress = track.durationMs > 0 ? (track.progressMs / track.durationMs) * 100 : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: pressAnim }] }]}>
      <Pressable
        style={styles.inner}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID="now-playing-widget"
      >
        <View style={styles.spotifyBadge}>
          <View style={styles.spotifyDot} />
          <Text style={styles.spotifyBadgeText}>Hört gerade</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.albumArtWrap}>
            <Image
              source={{ uri: track.albumArt }}
              style={styles.albumArt}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.eqOverlay}>
              <EqualizerBar delay={0} height={10} />
              <EqualizerBar delay={150} height={14} />
              <EqualizerBar delay={80} height={12} />
              <EqualizerBar delay={200} height={9} />
            </View>
          </View>

          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
            <Text style={styles.trackAlbum} numberOfLines={1}>{track.album}</Text>
          </View>

          <View style={styles.openIcon}>
            <ExternalLink size={14} color="rgba(30,215,96,0.7)" />
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default NowPlayingWidget;

const SPOTIFY_GREEN = '#1DB954';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
  },
  inner: {
    backgroundColor: 'rgba(30,30,32,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(30,215,96,0.12)',
    overflow: 'hidden',
  },
  spotifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  spotifyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SPOTIFY_GREEN,
  },
  spotifyBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(30,215,96,0.7)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 6,
    gap: 12,
  },
  albumArtWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  albumArt: {
    width: 48,
    height: 48,
  },
  eqOverlay: {
    position: 'absolute',
    bottom: 3,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    height: 16,
  },
  eqBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: SPOTIFY_GREEN,
    opacity: 0.85,
  },
  trackInfo: {
    flex: 1,
    gap: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    letterSpacing: -0.2,
  },
  trackArtist: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(232,220,200,0.6)',
  },
  trackAlbum: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(232,220,200,0.3)',
  },
  openIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30,215,96,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 2,
    backgroundColor: 'rgba(30,215,96,0.08)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: SPOTIFY_GREEN,
    borderRadius: 1,
  },
});
