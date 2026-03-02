import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/constants/queryKeys';
import type { NewsArticle, Place, Restaurant } from '@/constants/types';

function mapDbPlace(p: any): Place {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    city: p.city,
    bundesland: p.bundesland,
    images: p.images ?? [],
    category: p.category,
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
  };
}

function mapDbRestaurant(r: any): Restaurant {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    city: r.city,
    bundesland: r.bundesland,
    images: r.images ?? [],
    cuisine: r.cuisine ?? [],
    priceRange: r.price_range ?? 1,
    latitude: r.latitude ?? 0,
    longitude: r.longitude ?? 0,
    rating: r.rating ?? 0,
    reviewCount: r.review_count ?? 0,
  };
}

function mapDbNews(n: any): NewsArticle {
  return {
    id: n.id,
    title: n.title,
    text: n.text,
    image: n.image ?? '',
    author: n.author ?? 'Heldentum Redaktion',
    publishDate: n.publish_date ?? n.created_at,
  };
}

export function useContent() {
  const newsQuery = useQuery({
    queryKey: queryKeys.news(),
    queryFn: async () => {
      console.log('[CONTENT] Loading news...');
      const { data } = await supabase.from('news').select('*').order('publish_date', { ascending: false });
      return (data ?? []).map(mapDbNews);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const placesQuery = useQuery({
    queryKey: queryKeys.places(),
    queryFn: async () => {
      console.log('[CONTENT] Loading places...');
      const { data } = await supabase.from('places').select('*').order('created_at', { ascending: false });
      return (data ?? []).map(mapDbPlace);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants(),
    queryFn: async () => {
      console.log('[CONTENT] Loading restaurants...');
      const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
      return (data ?? []).map(mapDbRestaurant);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const news = useMemo(() => newsQuery.data ?? [], [newsQuery.data]);
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const restaurants = useMemo(() => restaurantsQuery.data ?? [], [restaurantsQuery.data]);
  const isLoading = newsQuery.isLoading || placesQuery.isLoading || restaurantsQuery.isLoading;

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

  return { news, places, restaurants, isLoading, updateNews, updatePlace, updateRestaurant };
}
