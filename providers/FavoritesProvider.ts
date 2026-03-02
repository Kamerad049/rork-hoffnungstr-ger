import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/constants/queryKeys';

interface FavoriteItem {
  id: string;
  targetId: string;
  targetType: string;
}

export const [FavoritesProvider, useFavorites] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: queryKeys.favorites(user?.id ?? ''),
    queryFn: async () => {
      console.log('[FAVORITES] Loading for user:', user!.id);
      const { data, error } = await supabase
        .from('favorites')
        .select('id, target_id, target_type')
        .eq('user_id', user!.id);
      if (error) {
        console.log('[FAVORITES] Load error:', error.message);
        return [];
      }
      const loaded = (data ?? []).map((f: any) => ({
        id: f.id,
        targetId: f.target_id,
        targetType: f.target_type,
      }));
      console.log('[FAVORITES] Loaded', loaded.length);
      return loaded;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const items: FavoriteItem[] = useMemo(() => favoritesQuery.data ?? [], [favoritesQuery.data]);

  const toggleFavorite = useCallback(
    async (targetId: string, targetType: 'place' | 'restaurant' | 'post' | 'reel' = 'place') => {
      if (!user) return;
      const existing = items.find((f) => f.targetId === targetId);
      if (existing) {
        queryClient.setQueryData<FavoriteItem[]>(
          queryKeys.favorites(user.id),
          (old) => (old ?? []).filter((f) => f.targetId !== targetId),
        );
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', targetId)
          .eq('target_type', existing.targetType);
        if (error) {
          console.log('[FAVORITES] Remove error:', error.message);
          queryClient.invalidateQueries({ queryKey: queryKeys.favorites(user.id) });
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        queryClient.setQueryData<FavoriteItem[]>(
          queryKeys.favorites(user.id),
          (old) => [...(old ?? []), { id: tempId, targetId, targetType }],
        );
        const { data, error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, target_id: targetId, target_type: targetType })
          .select('id')
          .single();
        if (error) {
          console.log('[FAVORITES] Add error:', error.message);
          queryClient.setQueryData<FavoriteItem[]>(
            queryKeys.favorites(user.id),
            (old) => (old ?? []).filter((f) => f.id !== tempId),
          );
        } else if (data) {
          queryClient.setQueryData<FavoriteItem[]>(
            queryKeys.favorites(user.id),
            (old) => (old ?? []).map((f) => f.id === tempId ? { ...f, id: data.id } : f),
          );
        }
      }
    },
    [user, items, queryClient],
  );

  const isFavorite = useCallback(
    (targetId: string) => items.some((f) => f.targetId === targetId),
    [items],
  );

  return { favorites: items.map((f) => f.targetId), toggleFavorite, isFavorite };
});
