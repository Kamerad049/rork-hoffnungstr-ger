import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/constants/queryKeys';

export interface CollectedStamp {
  placeId: string;
  collectedAt: string;
  photoUri: string | null;
}

interface Rank {
  name: string;
  minStamps: number;
  icon: string;
}

const RANKS: Rank[] = [
  { name: 'Neuling', minStamps: 0, icon: 'Eye' },
  { name: 'Beobachter', minStamps: 1, icon: 'Search' },
  { name: 'Wanderer', minStamps: 3, icon: 'Footprints' },
  { name: 'Sucher', minStamps: 5, icon: 'Compass' },
  { name: 'Kartograf', minStamps: 8, icon: 'Map' },
  { name: 'Entdecker', minStamps: 11, icon: 'MapPin' },
  { name: 'Späher', minStamps: 15, icon: 'Binoculars' },
  { name: 'Bergsteiger', minStamps: 19, icon: 'Mountain' },
  { name: 'Pfadfinder', minStamps: 24, icon: 'Flag' },
  { name: 'Forscher', minStamps: 29, icon: 'Telescope' },
  { name: 'Kundschafter', minStamps: 35, icon: 'Target' },
  { name: 'Hüter', minStamps: 41, icon: 'Shield' },
  { name: 'Wächter', minStamps: 48, icon: 'ShieldCheck' },
  { name: 'Bewahrer', minStamps: 55, icon: 'Landmark' },
  { name: 'Burgherr', minStamps: 63, icon: 'Castle' },
  { name: 'Gelehrter', minStamps: 72, icon: 'BookOpen' },
  { name: 'Chronist', minStamps: 81, icon: 'ScrollText' },
  { name: 'Ritter', minStamps: 91, icon: 'Sword' },
  { name: 'Streiter', minStamps: 102, icon: 'Swords' },
  { name: 'Meister', minStamps: 114, icon: 'Crown' },
  { name: 'Flammenträger', minStamps: 127, icon: 'Flame' },
  { name: 'Großmeister', minStamps: 141, icon: 'Gem' },
  { name: 'Weltenkenner', minStamps: 156, icon: 'Globe' },
  { name: 'Legende', minStamps: 172, icon: 'Star' },
  { name: 'Veteran', minStamps: 190, icon: 'Trophy' },
  { name: 'Titan', minStamps: 210, icon: 'Zap' },
  { name: 'Koryphäe', minStamps: 235, icon: 'Sun' },
  { name: 'Held der Nation', minStamps: 260, icon: 'Medal' },
  { name: 'Mythisch', minStamps: 300, icon: 'Sparkles' },
  { name: 'Unsterblicher', minStamps: 350, icon: 'Infinity' },
];

export function useStampPass() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const stampsQuery = useQuery({
    queryKey: queryKeys.stamps(user?.id ?? ''),
    queryFn: async () => {
      console.log('[STAMPS] Loading stamps for user:', user!.id);
      const { data, error } = await supabase
        .from('collected_stamps')
        .select('place_id, collected_at, photo_uri')
        .eq('user_id', user!.id);
      if (error) {
        console.log('[STAMPS] Load error:', error.message);
        return [];
      }
      const loaded = (data ?? []).map((s: any) => ({
        placeId: s.place_id,
        collectedAt: s.collected_at,
        photoUri: s.photo_uri ?? null,
      }));
      console.log('[STAMPS] Loaded', loaded.length, 'stamps');
      return loaded;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const placesCountQuery = useQuery({
    queryKey: queryKeys.placesCount(),
    queryFn: async () => {
      const { count } = await supabase.from('places').select('id', { count: 'exact', head: true });
      console.log('[STAMPS] Total places:', count);
      return count ?? 0;
    },
    staleTime: 30 * 60 * 1000,
  });

  const stamps: CollectedStamp[] = useMemo(() => stampsQuery.data ?? [], [stampsQuery.data]);
  const totalPlaces = placesCountQuery.data ?? 0;
  const isLoading = stampsQuery.isLoading;

  const collectStamp = useCallback(
    async (placeId: string, photoUri: string | null) => {
      if (!user) return;
      if (stamps.some((s) => s.placeId === placeId)) return;
      const newStamp: CollectedStamp = {
        placeId,
        collectedAt: new Date().toISOString(),
        photoUri,
      };
      queryClient.setQueryData<CollectedStamp[]>(
        queryKeys.stamps(user.id),
        (old) => [...(old ?? []), newStamp],
      );
      const { error } = await supabase.from('collected_stamps').insert({
        user_id: user.id,
        place_id: placeId,
        photo_uri: photoUri,
      });
      if (error) {
        console.log('[STAMPS] Collect error:', error.message);
        queryClient.invalidateQueries({ queryKey: queryKeys.stamps(user.id) });
      }
    },
    [user, stamps, queryClient],
  );

  const hasStamp = useCallback(
    (placeId: string) => stamps.some((s) => s.placeId === placeId),
    [stamps],
  );

  const rank = useMemo(() => {
    let current = RANKS[0];
    for (const r of RANKS) {
      if (stamps.length >= r.minStamps) current = r;
    }
    return current;
  }, [stamps.length]);

  const nextRank = useMemo(() => {
    const idx = RANKS.findIndex((r) => r.name === rank.name);
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  }, [rank.name]);

  const progress = totalPlaces > 0 ? stamps.length / totalPlaces : 0;

  return {
    stamps,
    isLoading,
    collectStamp,
    hasStamp,
    rank,
    nextRank,
    progress,
    totalPlaces,
    RANKS,
  };
}
