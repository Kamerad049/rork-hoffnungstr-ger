import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface VoiceMessageBubbleProps {
  voiceUri: string;
  duration: number;
  isMe: boolean;
}

export default React.memo(function VoiceMessageBubble({ voiceUri, duration, isMe }: VoiceMessageBubbleProps) {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const totalDuration = Math.ceil(duration);

  const cleanupInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupInterval();
      if (playerRef.current) {
        try {
          playerRef.current.pause();
        } catch (e) {
          console.log('[VOICE] Cleanup pause error:', e);
        }
      }
    };
  }, [cleanupInterval]);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim]);

  const handleTogglePlay = useCallback(async () => {
    try {
      if (isPlaying) {
        console.log('[VOICE] Pausing playback');
        if (playerRef.current) {
          playerRef.current.pause();
        }
        cleanupInterval();
        stopPulse();
        setIsPlaying(false);
        return;
      }

      console.log('[VOICE] Starting playback:', voiceUri);

      if (Platform.OS === 'web') {
        const audio = new Audio(voiceUri);
        playerRef.current = audio;

        audio.ontimeupdate = () => {
          const ct = audio.currentTime;
          const dur = audio.duration || duration;
          setCurrentTime(ct);
          setProgress(dur > 0 ? ct / dur : 0);
        };

        audio.onended = () => {
          console.log('[VOICE] Playback finished (web)');
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
          stopPulse();
        };

        await audio.play();
        setIsPlaying(true);
        startPulse();
        return;
      }

      const { Audio: ExpoAudio } = require('expo-av');
      if (playerRef.current) {
        await playerRef.current.unloadAsync();
        playerRef.current = null;
      }
      const { sound } = await ExpoAudio.Sound.createAsync(
        { uri: voiceUri },
        { shouldPlay: true }
      );
      playerRef.current = sound;
      setIsPlaying(true);
      startPulse();

      cleanupInterval();
      intervalRef.current = setInterval(async () => {
        if (playerRef.current) {
          try {
            const status = await playerRef.current.getStatusAsync();
            if (status.isLoaded) {
              const ct = (status.positionMillis ?? 0) / 1000;
              const dur = (status.durationMillis ?? duration * 1000) / 1000;
              setCurrentTime(ct);
              if (dur > 0) {
                setProgress(ct / dur);
              }
              if (!status.isPlaying && status.didJustFinish) {
                console.log('[VOICE] Playback finished (native)');
                setIsPlaying(false);
                setProgress(0);
                setCurrentTime(0);
                stopPulse();
                cleanupInterval();
              }
            }
          } catch (_e) {}
        }
      }, 100);
    } catch (e) {
      console.log('[VOICE] Play error:', e);
      setIsPlaying(false);
      stopPulse();
      cleanupInterval();
    }
  }, [isPlaying, voiceUri, duration, cleanupInterval, startPulse, stopPulse]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const waveformBars = 20;
  const barHeights = useRef(
    Array.from({ length: waveformBars }, () => 0.2 + Math.random() * 0.8)
  ).current;

  const accentColor = isMe ? 'rgba(255,255,255,0.9)' : colors.accent;
  const mutedColor = isMe ? 'rgba(255,255,255,0.3)' : 'rgba(191,163,93,0.3)';
  const timeColor = isMe ? 'rgba(255,255,255,0.6)' : colors.tertiaryText;

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          onPress={handleTogglePlay}
          style={[
            styles.playBtn,
            { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(191,163,93,0.15)' },
          ]}
          testID="voice-play-btn"
        >
          {isPlaying ? (
            <Pause size={16} color={accentColor} />
          ) : (
            <Play size={16} color={accentColor} style={{ marginLeft: 2 }} />
          )}
        </Pressable>
      </Animated.View>

      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {barHeights.map((h, i) => {
            const barProgress = i / waveformBars;
            const isActive = barProgress <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: h * 24,
                    backgroundColor: isActive ? accentColor : mutedColor,
                  },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.timeText, { color: timeColor }]}>
          {isPlaying ? formatTime(currentTime) : formatTime(totalDuration)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    gap: 4,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
  timeText: {
    fontSize: 11,
  },
});
