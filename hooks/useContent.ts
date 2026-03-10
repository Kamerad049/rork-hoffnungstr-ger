import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/constants/queryKeys';
import type { NewsArticle, Place, Restaurant } from '@/constants/types';
import { mapDbPlace, mapDbRestaurant, mapDbNews } from '@/lib/mapDb';

export function useContent() {
  const newsQuery = useQuery({
    queryKey: queryKeys.news(),
    queryFn: async () => {
      console.log('[CONTENT] Loading news...');
      const { data, error } = await supabase.from('news').select('*').order('publish_date', { ascending: false });
      if (error) {
        console.log('[CONTENT] News query error:', error.message, error.details, error.hint);
        throw error;
      }
      console.log('[CONTENT] News loaded:', data?.length ?? 0, 'items');
      return (data ?? []).map(mapDbNews);
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const placesQuery = useQuery({
    queryKey: queryKeys.places(),
    queryFn: async () => {
      console.log('[CONTENT] Loading places...');
      const { data, error } = await supabase.from('places').select('*').order('created_at', { ascending: false });
      if (error) {
        console.log('[CONTENT] Places query error:', error.message, error.details, error.hint);
        throw error;
      }
      console.log('[CONTENT] Places loaded:', data?.length ?? 0, 'items');
      return (data ?? []).map(mapDbPlace);
    },
    retry: 2,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants(),
    queryFn: async () => {
      console.log('[CONTENT] Loading restaurants...');
      const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
      if (error) {
        console.log('[CONTENT] Restaurants query error:', error.message, error.details, error.hint);
        throw error;
      }
      console.log('[CONTENT] Restaurants loaded:', data?.length ?? 0, 'items');
      return (data ?? []).map(mapDbRestaurant);
    },
    retry: 2,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const news = useMemo(() => newsQuery.data ?? [], [newsQuery.data]);
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const restaurants = useMemo(() => restaurantsQuery.data ?? [], [restaurantsQuery.data]);
  const isLoading = newsQuery.isLoading || placesQuery.isLoading || restaurantsQuery.isLoading;
  const placesError = placesQuery.error;
  const restaurantsError = restaurantsQuery.error;
  const newsError = newsQuery.error;

  const refetchAll = useCallback(async () => {
    console.log('[CONTENT] Refetching all content...');
    await Promise.all([newsQuery.refetch(), placesQuery.refetch(), restaurantsQuery.refetch()]);
  }, [newsQuery, placesQuery, restaurantsQuery]);

  const queryClient = useQueryClient();

  const updateNews = useCallback(async (id: string, updates: Partial<NewsArticle>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.text !== undefined) dbUpdates.text = updates.text;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.author !== undefined) dbUpdates.author = updates.author;
    if (updates.publishDate !== undefined) dbUpdates.publish_date = updates.publishDate;
    const { error } = await supabase.from('news').update(dbUpdates).eq('id', id);
    if (error) {
      console.log('[CONTENT] Update news error:', error.message);
      return;
    }
    queryClient.setQueryData<NewsArticle[]>(queryKeys.news(), (old) => (old ?? []).map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, [queryClient]);

  const updatePlace = useCallback(async (id: string, updates: Partial<Place>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.bundesland !== undefined) dbUpdates.bundesland = updates.bundesland;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    const { error } = await supabase.from('places').update(dbUpdates).eq('id', id);
    if (error) {
      console.log('[CONTENT] Update place error:', error.message);
      return;
    }
    queryClient.setQueryData<Place[]>(queryKeys.places(), (old) => (old ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, [queryClient]);

  const updateRestaurant = useCallback(async (id: string, updates: Partial<Restaurant>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.bundesland !== undefined) dbUpdates.bundesland = updates.bundesland;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.cuisine !== undefined) dbUpdates.cuisine = updates.cuisine;
    if (updates.priceRange !== undefined) dbUpdates.price_range = updates.priceRange;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    const { error } = await supabase.from('restaurants').update(dbUpdates).eq('id', id);
    if (error) {
      console.log('[CONTENT] Update restaurant error:', error.message);
      return;
    }
    queryClient.setQueryData<Restaurant[]>(queryKeys.restaurants(), (old) => (old ?? []).map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, [queryClient]);

  return { news, places, restaurants, isLoading, placesError, restaurantsError, newsError, refetchAll, updateNews, updatePlace, updateRestaurant };
}
