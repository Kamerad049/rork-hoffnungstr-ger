import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as Location from 'expo-location';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { supabase } from '@/lib/supabase';
import type { SocialUser } from '@/constants/types';

export type SharingAudience = 'friends' | 'specific';
export type SharingDuration = '15min' | '1h' | '3h' | '1day';
export type SharingPrecision = 'exact' | 'approximate';

export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export interface LocationShareSettings {
  audience: SharingAudience;
  duration: SharingDuration;
  specificUserIds: string[];
  precision: SharingPrecision;
}

export interface LiveUserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  expiresAt: string;
  audience: SharingAudience;
  specificUserIds: string[];
}

const DURATION_MS: Record<SharingDuration, number> = {
  '15min': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
};

const DURATION_LABELS: Record<SharingDuration, string> = {
  '15min': '15 Minuten',
  '1h': '1 Stunde',
  '3h': '3 Stunden',
  '1day': '1 Tag',
};

export { DURATION_MS, DURATION_LABELS };

function latLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const minLat = 47.27;
  const maxLat = 55.06;
  const minLng = 5.87;
  const maxLng = 15.04;

  const svgW = 586;
  const svgH = 793;

  const padX = 30;
  const padY = 60;

  const x = padX + ((lng - minLng) / (maxLng - minLng)) * (svgW - 2 * padX);
  const y = padY + ((maxLat - lat) / (maxLat - minLat)) * (svgH - 2 * padY);

  return { x, y };
}

export { latLngToSvg };

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export const [LiveLocationProvider, useLiveLocation] = createContextHook(() => {
  const { user } = useAuth();
  const { friends, friendUsers, blockedUsers } = useFriends();
  const userId = user?.id ?? '';

  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [isAcquiringLocation, setIsAcquiringLocation] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('unknown');
  const [shareSettings, setShareSettings] = useState<LocationShareSettings>({
    audience: 'friends',
    duration: '1h',
    specificUserIds: [],
    precision: 'exact',
  });
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [sharingExpiresAt, setSharingExpiresAt] = useState<string | null>(null);
  const [friendLocations, setFriendLocations] = useState<LiveUserLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
  const locationWatchRef = useRef<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasReceivedFirstLocation = useRef<boolean>(false);

  const startWatchingLocation = useCallback(async (): Promise<boolean> => {
    setIsAcquiringLocation(true);
    hasReceivedFirstLocation.current = false;

    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        console.log('[LIVE-LOC] Web geolocation not available');
        setPermissionStatus('unavailable');
        setIsAcquiringLocation(false);
        Alert.alert(
          'Standort nicht verfügbar',
          'Dein Browser unterstützt keine Ortungsdienste. Bitte verwende einen modernen Browser oder die mobile App.',
        );
        return false;
      }

      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('[LIVE-LOC] Web initial position:', pos.coords.latitude, pos.coords.longitude);
            setMyLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
            setPermissionStatus('granted');
            hasReceivedFirstLocation.current = true;
            setIsAcquiringLocation(false);

            const watchId = navigator.geolocation.watchPosition(
              (watchPos) => {
                console.log('[LIVE-LOC] Web position update:', watchPos.coords.latitude, watchPos.coords.longitude);
                setMyLocation({
                  latitude: watchPos.coords.latitude,
                  longitude: watchPos.coords.longitude,
                  accuracy: watchPos.coords.accuracy,
                });
              },
              (err) => console.log('[LIVE-LOC] Web watch error:', err.message),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
            );
            locationWatchRef.current = watchId;
            resolve(true);
          },
          (err) => {
            console.log('[LIVE-LOC] Web geolocation error:', err.code, err.message);
            setIsAcquiringLocation(false);

            if (err.code === 1) {
              setPermissionStatus('denied');
              Alert.alert(
                'Standortzugriff verweigert',
                'Bitte erlaube den Zugriff auf deinen Standort in den Browser-Einstellungen und versuche es erneut.',
              );
            } else if (err.code === 2) {
              setPermissionStatus('unavailable');
              Alert.alert(
                'Standort nicht verfügbar',
                'Die Ortungsdienste sind deaktiviert. Bitte aktiviere GPS/Ortungsdienste in deinen Geräteeinstellungen.',
              );
            } else {
              Alert.alert(
                'Standortfehler',
                'Dein Standort konnte nicht ermittelt werden. Bitte überprüfe deine Verbindung und versuche es erneut.',
              );
            }
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        );
      });
    } else {
      try {
        let serviceEnabled = false;
        try {
          serviceEnabled = await Location.hasServicesEnabledAsync();
          console.log('[LIVE-LOC] Services enabled:', serviceEnabled);
        } catch (serviceErr) {
          console.log('[LIVE-LOC] hasServicesEnabledAsync error (ignoring):', serviceErr);
          serviceEnabled = true;
        }
        if (!serviceEnabled) {
          console.log('[LIVE-LOC] Location services disabled');
          setPermissionStatus('unavailable');
          setIsAcquiringLocation(false);
          Alert.alert(
            'Ortungsdienste deaktiviert',
            'Bitte aktiviere die Ortungsdienste in deinen Geräteeinstellungen, damit wir deinen Standort ermitteln können.',
          );
          return false;
        }

        let permStatus;
        try {
          const existing = await Location.getForegroundPermissionsAsync();
          console.log('[LIVE-LOC] Existing permission:', existing.status);
          if (existing.status === 'granted') {
            permStatus = 'granted';
          } else {
            const { status } = await Location.requestForegroundPermissionsAsync();
            permStatus = status;
          }
        } catch (permErr) {
          console.log('[LIVE-LOC] Permission request error:', permErr);
          const { status } = await Location.requestForegroundPermissionsAsync();
          permStatus = status;
        }
        console.log('[LIVE-LOC] Permission status:', permStatus);
        if (permStatus !== 'granted') {
          console.log('[LIVE-LOC] Location permission denied');
          setPermissionStatus('denied');
          setIsAcquiringLocation(false);
          Alert.alert(
            'Standortzugriff verweigert',
            'Bitte erlaube den Zugriff auf deinen Standort in den App-Einstellungen, damit du deinen Live-Standort teilen kannst.',
          );
          return false;
        }

        setPermissionStatus('granted');

        let initialLoc = null;

        const tryGetPosition = async (accuracy: Location.LocationAccuracy, label: string): Promise<Location.LocationObject | null> => {
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.log(`[LIVE-LOC] ${label} timed out after 20s`);
              resolve(null);
            }, 20000);
            Location.getCurrentPositionAsync({ accuracy })
              .then((loc) => {
                clearTimeout(timeout);
                console.log(`[LIVE-LOC] ${label} success:`, loc.coords.latitude, loc.coords.longitude);
                resolve(loc);
              })
              .catch((err) => {
                clearTimeout(timeout);
                console.log(`[LIVE-LOC] ${label} failed:`, err?.message ?? err);
                resolve(null);
              });
          });
        };

        initialLoc = await tryGetPosition(Location.Accuracy.High, 'High');

        if (!initialLoc) {
          initialLoc = await tryGetPosition(Location.Accuracy.Balanced, 'Balanced');
        }

        if (!initialLoc) {
          initialLoc = await tryGetPosition(Location.Accuracy.Low, 'Low');
        }

        if (!initialLoc) {
          initialLoc = await tryGetPosition(Location.Accuracy.Lowest, 'Lowest');
        }

        if (!initialLoc) {
          try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
              initialLoc = lastKnown;
              console.log('[LIVE-LOC] Using last known position:', lastKnown.coords.latitude, lastKnown.coords.longitude);
            }
          } catch (lastErr) {
            console.log('[LIVE-LOC] getLastKnownPositionAsync failed:', lastErr);
          }
        }

        if (!initialLoc) {
          console.log('[LIVE-LOC] Could not get any position after all attempts');
          setIsAcquiringLocation(false);
          Alert.alert(
            'Standort nicht gefunden',
            'Dein Standort konnte nicht ermittelt werden. Bitte stelle sicher, dass GPS aktiviert ist und du dich an einem Ort mit gutem Empfang befindest. Tipp: Öffne kurz Apple Karten oder Google Maps, damit das GPS aktiviert wird, und versuche es dann erneut.',
          );
          return false;
        }

        setMyLocation({
          latitude: initialLoc.coords.latitude,
          longitude: initialLoc.coords.longitude,
          accuracy: initialLoc.coords.accuracy ?? 50,
        });
        hasReceivedFirstLocation.current = true;
        setIsAcquiringLocation(false);

        try {
          const sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 8000,
              distanceInterval: 5,
            },
            (loc) => {
              console.log('[LIVE-LOC] Native position update:', loc.coords.latitude, loc.coords.longitude);
              setMyLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: loc.coords.accuracy ?? 50,
              });
            },
          );
          locationWatchRef.current = sub;
        } catch (watchErr) {
          console.log('[LIVE-LOC] watchPositionAsync failed (continuing with initial position):', watchErr);
        }
        return true;
      } catch (e: any) {
        console.log('[LIVE-LOC] Native location error:', e?.message ?? e);
        setIsAcquiringLocation(false);
        const errorMsg = e?.message ?? String(e);
        if (errorMsg.includes('denied') || errorMsg.includes('permission')) {
          setPermissionStatus('denied');
          Alert.alert(
            'Standortzugriff verweigert',
            'Bitte erlaube den Zugriff auf deinen Standort in den App-Einstellungen und versuche es erneut.',
          );
        } else if (errorMsg.includes('unavailable') || errorMsg.includes('disabled') || errorMsg.includes('service')) {
          setPermissionStatus('unavailable');
          Alert.alert(
            'Ortungsdienste deaktiviert',
            'Bitte aktiviere die Ortungsdienste in deinen Geräteeinstellungen und versuche es erneut.',
          );
        } else {
          Alert.alert(
            'Standortfehler',
            'Ein Fehler ist beim Ermitteln deines Standorts aufgetreten. Tipp: Öffne kurz Apple Karten oder Google Maps, um GPS zu aktivieren, und versuche es dann erneut.',
          );
        }
        return false;
      }
    }
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (Platform.OS === 'web') {
      if (locationWatchRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    } else {
      if (locationWatchRef.current?.remove) {
        locationWatchRef.current.remove();
      }
    }
    locationWatchRef.current = null;
    hasReceivedFirstLocation.current = false;
  }, []);

  const uploadMyLocation = useCallback(async () => {
    if (!userId || !myLocation || !isSharing || !sharingExpiresAt) return;
    if (new Date(sharingExpiresAt).getTime() < Date.now()) {
      console.log('[LIVE-LOC] Sharing expired, stopping');
      setIsSharing(false);
      setSharingExpiresAt(null);
      stopWatchingLocation();
      return;
    }
    const isApproximate = shareSettings.precision === 'approximate';
    const uploadLat = isApproximate ? Math.round(myLocation.latitude * 100) / 100 : myLocation.latitude;
    const uploadLng = isApproximate ? Math.round(myLocation.longitude * 100) / 100 : myLocation.longitude;
    console.log('[LIVE-LOC] Uploading location to Supabase:', uploadLat, uploadLng, '(precision:', shareSettings.precision, ')');
    try {
      const { error } = await supabase.from('live_locations').upsert({
        user_id: userId,
        latitude: uploadLat,
        longitude: uploadLng,
        accuracy: isApproximate ? 1000 : myLocation.accuracy,
        expires_at: sharingExpiresAt,
        audience: shareSettings.audience,
        specific_user_ids: shareSettings.specificUserIds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) {
        console.log('[LIVE-LOC] Upload error:', error.message);
      } else {
        console.log('[LIVE-LOC] Location uploaded successfully');
      }
    } catch (e) {
      console.log('[LIVE-LOC] Upload exception:', e);
    }
  }, [userId, myLocation, isSharing, sharingExpiresAt, shareSettings, stopWatchingLocation]);

  useEffect(() => {
    if (isSharing && myLocation) {
      uploadMyLocation();
    }
  }, [myLocation, isSharing, uploadMyLocation]);

  const startSharing = useCallback(async (settings?: Partial<LocationShareSettings>): Promise<boolean> => {
    const finalSettings = { ...shareSettings, ...settings };
    setShareSettings(finalSettings);

    console.log('[LIVE-LOC] Starting sharing with settings:', finalSettings);
    const success = await startWatchingLocation();
    if (!success) {
      console.log('[LIVE-LOC] Failed to start watching location');
      return false;
    }

    const expiresAt = new Date(Date.now() + DURATION_MS[finalSettings.duration]).toISOString();
    setSharingExpiresAt(expiresAt);
    setIsSharing(true);
    console.log('[LIVE-LOC] Started sharing, expires:', expiresAt);
    return true;
  }, [shareSettings, startWatchingLocation]);

  const stopSharing = useCallback(async () => {
    setIsSharing(false);
    setSharingExpiresAt(null);
    setMyLocation(null);
    stopWatchingLocation();
    if (userId) {
      await supabase.from('live_locations').delete().eq('user_id', userId);
    }
    console.log('[LIVE-LOC] Stopped sharing');
  }, [userId, stopWatchingLocation]);

  const fetchFriendLocations = useCallback(async () => {
    if (!userId) {
      console.log('[LIVE-LOC] No userId, skipping fetch');
      return;
    }
    setIsLoadingLocations(true);
    console.log('[LIVE-LOC] Fetching friend locations...');
    try {
      const { data, error } = await supabase
        .from('live_locations')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .neq('user_id', userId);

      if (error) {
        console.log('[LIVE-LOC] Fetch error:', error.message);
        setIsLoadingLocations(false);
        return;
      }

      console.log('[LIVE-LOC] Raw data from Supabase:', data?.length ?? 0, 'rows');

      const visible = (data ?? []).filter((loc: any) => {
        if (blockedUsers.includes(loc.user_id)) return false;
        if (loc.audience === 'friends') return friends.includes(loc.user_id);
        if (loc.audience === 'specific') {
          const specificIds: string[] = loc.specific_user_ids ?? [];
          return specificIds.includes(userId);
        }
        return false;
      }).map((loc: any): LiveUserLocation => ({
        userId: loc.user_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy ?? 10,
        timestamp: loc.updated_at,
        expiresAt: loc.expires_at,
        audience: loc.audience,
        specificUserIds: loc.specific_user_ids ?? [],
      }));

      setFriendLocations(visible);
      console.log('[LIVE-LOC] Fetched', visible.length, 'visible locations');
    } catch (e) {
      console.log('[LIVE-LOC] Fetch locations error:', e);
    }
    setIsLoadingLocations(false);
  }, [userId, friends, blockedUsers]);

  const [isMapActive, setIsMapActive] = useState<boolean>(false);

  const activatePolling = useCallback(() => {
    setIsMapActive(true);
    console.log('[LIVE-LOC] Polling activated');
  }, []);

  const deactivatePolling = useCallback(() => {
    setIsMapActive(false);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    console.log('[LIVE-LOC] Polling deactivated');
  }, []);

  useEffect(() => {
    if (userId && isMapActive) {
      fetchFriendLocations();
      refreshIntervalRef.current = setInterval(fetchFriendLocations, 30000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [userId, isMapActive, fetchFriendLocations]);

  useEffect(() => {
    if (!isSharing || !sharingExpiresAt) return;
    const remaining = new Date(sharingExpiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      stopSharing();
      return;
    }
    const timer = setTimeout(() => {
      stopSharing();
    }, remaining);
    return () => clearTimeout(timer);
  }, [isSharing, sharingExpiresAt, stopSharing]);

  const [remainingTime, setRemainingTime] = useState<number>(0);

  useEffect(() => {
    if (!isSharing || !sharingExpiresAt) {
      setRemainingTime(0);
      return;
    }
    const update = () => {
      const ms = Math.max(0, new Date(sharingExpiresAt).getTime() - Date.now());
      setRemainingTime(ms);
      if (ms <= 0) {
        stopSharing();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isSharing, sharingExpiresAt, stopSharing]);

  const getUserForLocation = useCallback((loc: LiveUserLocation): SocialUser | undefined => {
    return friendUsers.find((u) => u.id === loc.userId);
  }, [friendUsers]);

  const visibleLocationsWithUsers = useMemo(() => {
    return friendLocations
      .map((loc) => {
        const foundUser = friendUsers.find((u) => u.id === loc.userId);
        return foundUser ? { ...loc, user: foundUser } : null;
      })
      .filter(Boolean) as (LiveUserLocation & { user: SocialUser })[];
  }, [friendLocations, friendUsers]);

  return {
    isSharing,
    isAcquiringLocation,
    permissionStatus,
    shareSettings,
    setShareSettings,
    myLocation,
    sharingExpiresAt,
    friendLocations,
    visibleLocationsWithUsers,
    isLoadingLocations,
    startSharing,
    stopSharing,
    fetchFriendLocations,
    remainingTime,
    getUserForLocation,
    activatePolling,
    deactivatePolling,
  };
});
