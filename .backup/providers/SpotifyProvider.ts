import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { supabase } from '@/lib/supabase';
import type { SpotifyTrack } from '@/constants/types';

export type MusicVisibility = 'everyone' | 'friends' | 'nobody';

interface SpotifySettings {
  enabled: boolean;
  visibility: MusicVisibility;
  allowedUserIds: string[];
}

const STORAGE_KEY = 'spotify_settings';

const DEFAULT_SETTINGS: SpotifySettings = {
  enabled: true,
  visibility: 'everyone',
  allowedUserIds: [],
};

export const [SpotifyProvider, useSpotify] = createContextHook(() => {
  const { user } = useAuth();
  const { isFriend } = useFriends();

  const [settings, setSettings] = useState<SpotifySettings>({ ...DEFAULT_SETTINGS });
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const trackRotationRef = useRef<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SpotifySettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.log('[SPOTIFY] Failed to load settings:', e);
      }
      setIsLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!settings.enabled || !user) {
      setCurrentTrack(null);
      return;
    }
    const loadTrack = async () => {
      try {
        const { data } = await supabase
          .from('spotify_tracks')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setCurrentTrack({
            id: data.id,
            title: data.title ?? '',
            artist: data.artist ?? '',
            album: data.album ?? '',
            albumArt: data.album_art ?? '',
            spotifyUrl: data.spotify_url ?? '',
            durationMs: data.duration_ms ?? 0,
            progressMs: data.progress_ms ?? 0,
          });
          console.log('[SPOTIFY] Loaded track for user:', data.title);
        } else {
          setCurrentTrack(null);
          console.log('[SPOTIFY] No track found for user');
        }
      } catch (e) {
        console.log('[SPOTIFY] Load track error:', e);
        setCurrentTrack(null);
      }
    };
    loadTrack();
  }, [settings.enabled, user]);

  const updateSettings = useCallback(async (updates: Partial<SpotifySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(e =>
        console.log('[SPOTIFY] Failed to save settings:', e),
      );
      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  const setVisibility = useCallback((visibility: MusicVisibility) => {
    updateSettings({ visibility });
  }, [updateSettings]);

  const addAllowedUser = useCallback((userId: string) => {
    setSettings(prev => {
      if (prev.allowedUserIds.includes(userId)) return prev;
      const next = { ...prev, allowedUserIds: [...prev.allowedUserIds, userId] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeAllowedUser = useCallback((userId: string) => {
    setSettings(prev => {
      const next = { ...prev, allowedUserIds: prev.allowedUserIds.filter(id => id !== userId) };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const canUserSeeMyMusic = useCallback((viewerUserId: string): boolean => {
    if (!settings.enabled) return false;
    if (viewerUserId === 'me' || viewerUserId === user?.id) return true;

    switch (settings.visibility) {
      case 'everyone':
        return true;
      case 'friends':
        return isFriend(viewerUserId);
      case 'nobody':
        return settings.allowedUserIds.includes(viewerUserId);
      default:
        return false;
    }
  }, [settings, user, isFriend]);

  const getTrackForUser = useCallback((targetUserId: string): SpotifyTrack | null => {
    if (targetUserId === 'me' || targetUserId === user?.id) {
      return currentTrack;
    }
    return null;
  }, [user, currentTrack]);

  return {
    settings,
    currentTrack,
    isLoaded,
    toggleEnabled,
    setVisibility,
    addAllowedUser,
    removeAllowedUser,
    updateSettings,
    canUserSeeMyMusic,
    getTrackForUser,
  };
});
