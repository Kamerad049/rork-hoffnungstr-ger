import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '@/hooks/useNotifications';
import { queryKeys } from '@/constants/queryKeys';
import type { NewsArticle, Place, Restaurant, FeedPost, SocialUser } from '@/constants/types';

export interface PushReceipt {
  userId: string;
  delivered: boolean;
  deliveredAt: string | null;
  read: boolean;
  readAt: string | null;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  audioUri: string | null;
  audioDuration: number;
  recipients: 'all' | string[];
  sentAt: string;
  status: 'sent' | 'draft';
  receipts: PushReceipt[];
}

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

function mapDbPost(p: any): FeedPost {
  return {
    id: p.id,
    userId: p.user_id,
    content: p.content ?? '',
    mediaUrls: p.media_urls ?? [],
    mediaType: p.media_type ?? 'none',
    likeCount: p.like_count ?? 0,
    commentCount: p.comment_count ?? 0,
    createdAt: p.created_at,
  };
}

function mapDbUser(u: any): SocialUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    bio: u.bio ?? '',
    avatarUrl: u.avatar_url ?? null,
    rank: u.rank ?? 'Neuling',
    rankIcon: u.rank_icon ?? 'Eye',
    xp: u.xp ?? 0,
    stampCount: u.stamp_count ?? 0,
    postCount: u.post_count ?? 0,
    friendCount: u.friend_count ?? 0,
    flagHoistedAt: u.flag_hoisted_at ?? null,
    birthplace: u.birthplace ?? '',
    residence: u.residence ?? '',
    bundesland: u.bundesland ?? '',
  };
}

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const { addNotification: addToInbox } = useNotifications();
  const queryClient = useQueryClient();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [pushHistory, setPushHistory] = useState<PushNotification[]>([]);
  const [allUsers, setAllUsers] = useState<SocialUser[]>([]);
  const [adminDataLoaded, setAdminDataLoaded] = useState<boolean>(false);

  const newsQuery = useQuery({
    queryKey: queryKeys.news(),
    queryFn: async () => {
      console.log('[ADMIN] Loading news...');
      const { data } = await supabase.from('news').select('*').order('publish_date', { ascending: false });
      return (data ?? []).map(mapDbNews);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const placesQuery = useQuery({
    queryKey: queryKeys.places(),
    queryFn: async () => {
      console.log('[ADMIN] Loading places...');
      const { data } = await supabase.from('places').select('*').order('created_at', { ascending: false });
      return (data ?? []).map(mapDbPlace);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants(),
    queryFn: async () => {
      console.log('[ADMIN] Loading restaurants...');
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

  const loadAdminData = useCallback(async () => {
    if (adminDataLoaded) return;
    console.log('[ADMIN] Loading admin-only data...');
    try {
      const [postsRes, usersRes, pushRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
        supabase.from('push_notifications').select('*').order('sent_at', { ascending: false }),
      ]);
      setPosts((postsRes.data ?? []).map(mapDbPost));
      setAllUsers((usersRes.data ?? []).map(mapDbUser));
      setPushHistory(
        (pushRes.data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          message: p.message,
          audioUri: p.audio_uri ?? null,
          audioDuration: p.audio_duration ?? 0,
          recipients: p.recipients === 'all' ? 'all' : JSON.parse(p.recipients ?? '[]'),
          sentAt: p.sent_at,
          status: p.status ?? 'sent',
          receipts: [],
        })),
      );
      setAdminDataLoaded(true);
      console.log('[ADMIN] Admin data loaded:', postsRes.data?.length, 'posts,', usersRes.data?.length, 'users');
    } catch (e) {
      console.log('[ADMIN] Admin data load error:', e);
    }
  }, [adminDataLoaded]);

  const addNews = useCallback(async (article: Omit<NewsArticle, 'id'>) => {
    const { data, error } = await supabase
      .from('news')
      .insert({
        title: article.title,
        text: article.text,
        image: article.image,
        author: article.author,
        publish_date: article.publishDate,
      })
      .select('*')
      .single();
    if (error) {
      console.log('[ADMIN] Add news error:', error.message);
      return;
    }
    queryClient.setQueryData<NewsArticle[]>(queryKeys.news(), (old) => [mapDbNews(data), ...(old ?? [])]);
  }, [queryClient]);

  const updateNews = useCallback(async (id: string, updates: Partial<NewsArticle>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.text !== undefined) dbUpdates.text = updates.text;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.author !== undefined) dbUpdates.author = updates.author;
    if (updates.publishDate !== undefined) dbUpdates.publish_date = updates.publishDate;
    const { error } = await supabase.from('news').update(dbUpdates).eq('id', id);
    if (error) {
      console.log('[ADMIN] Update news error:', error.message);
      return;
    }
    queryClient.setQueryData<NewsArticle[]>(queryKeys.news(), (old) => (old ?? []).map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, [queryClient]);

  const deleteNews = useCallback(async (id: string) => {
    queryClient.setQueryData<NewsArticle[]>(queryKeys.news(), (old) => (old ?? []).filter((n) => n.id !== id));
    await supabase.from('news').delete().eq('id', id);
  }, [queryClient]);

  const deleteAllNews = useCallback(async () => {
    queryClient.setQueryData<NewsArticle[]>(queryKeys.news(), []);
    await supabase.from('news').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }, [queryClient]);

  const addPlace = useCallback(async (place: Omit<Place, 'id'>) => {
    const { data, error } = await supabase
      .from('places')
      .insert({
        title: place.title,
        description: place.description,
        city: place.city,
        bundesland: place.bundesland,
        images: place.images,
        category: place.category,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        review_count: place.reviewCount,
      })
      .select('*')
      .single();
    if (error) {
      console.log('[ADMIN] Add place error:', error.message);
      return;
    }
    queryClient.setQueryData<Place[]>(queryKeys.places(), (old) => [mapDbPlace(data), ...(old ?? [])]);
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
      console.log('[ADMIN] Update place error:', error.message);
      return;
    }
    queryClient.setQueryData<Place[]>(queryKeys.places(), (old) => (old ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, [queryClient]);

  const deletePlace = useCallback(async (id: string) => {
    queryClient.setQueryData<Place[]>(queryKeys.places(), (old) => (old ?? []).filter((p) => p.id !== id));
    await supabase.from('places').delete().eq('id', id);
  }, [queryClient]);

  const deleteAllPlaces = useCallback(async () => {
    queryClient.setQueryData<Place[]>(queryKeys.places(), []);
    await supabase.from('places').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }, [queryClient]);

  const addRestaurant = useCallback(async (restaurant: Omit<Restaurant, 'id'>) => {
    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name: restaurant.name,
        description: restaurant.description,
        city: restaurant.city,
        bundesland: restaurant.bundesland,
        images: restaurant.images,
        cuisine: restaurant.cuisine,
        price_range: restaurant.priceRange,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        rating: restaurant.rating,
        review_count: restaurant.reviewCount,
      })
      .select('*')
      .single();
    if (error) {
      console.log('[ADMIN] Add restaurant error:', error.message);
      return;
    }
    queryClient.setQueryData<Restaurant[]>(queryKeys.restaurants(), (old) => [mapDbRestaurant(data), ...(old ?? [])]);
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
      console.log('[ADMIN] Update restaurant error:', error.message);
      return;
    }
    queryClient.setQueryData<Restaurant[]>(queryKeys.restaurants(), (old) => (old ?? []).map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, [queryClient]);

  const deleteRestaurant = useCallback(async (id: string) => {
    queryClient.setQueryData<Restaurant[]>(queryKeys.restaurants(), (old) => (old ?? []).filter((r) => r.id !== id));
    await supabase.from('restaurants').delete().eq('id', id);
  }, [queryClient]);

  const deleteAllRestaurants = useCallback(async () => {
    queryClient.setQueryData<Restaurant[]>(queryKeys.restaurants(), []);
    await supabase.from('restaurants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }, [queryClient]);

  const deletePost = useCallback(async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await supabase.from('posts').delete().eq('id', id);
  }, []);

  const deleteAllPosts = useCallback(async () => {
    setPosts([]);
    await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      console.log('[ADMIN] Delete user error:', error.message);
      return false;
    }
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    console.log('[ADMIN] User deleted:', userId);
    return true;
  }, []);

  const banUser = useCallback(async (userId: string) => {
    const { error } = await supabase.from('users').update({ banned: true }).eq('id', userId);
    if (error) {
      console.log('[ADMIN] Ban user error:', error.message);
      return false;
    }
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    console.log('[ADMIN] User banned:', userId);
    return true;
  }, []);

  const unbanUser = useCallback(async (userId: string) => {
    const { error } = await supabase.from('users').update({ banned: false }).eq('id', userId);
    if (error) {
      console.log('[ADMIN] Unban user error:', error.message);
      return false;
    }
    console.log('[ADMIN] User unbanned:', userId);
    return true;
  }, []);

  const scheduleLocalNotification = useCallback(async (title: string, body: string, hasAudio: boolean) => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        finalStatus = newStatus;
      }
      if (finalStatus !== 'granted') return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: body || (hasAudio ? 'Neue Audio-Nachricht' : ''),
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
    } catch (e) {
      console.log('[ADMIN] Notification error:', e);
    }
  }, []);

  const addPushNotification = useCallback(
    async (notification: Omit<PushNotification, 'id' | 'sentAt' | 'status' | 'receipts'>) => {
      scheduleLocalNotification(notification.title, notification.message, !!notification.audioUri);

      const sentAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('push_notifications')
        .insert({
          title: notification.title,
          message: notification.message,
          audio_uri: notification.audioUri,
          audio_duration: notification.audioDuration,
          recipients: notification.recipients === 'all' ? 'all' : JSON.stringify(notification.recipients),
          sent_at: sentAt,
          status: 'sent',
        })
        .select('id')
        .single();

      const pushId = data?.id ?? `push_${Date.now()}`;

      addToInbox({
        id: pushId,
        title: notification.title,
        message: notification.message,
        audioUri: notification.audioUri,
        audioDuration: notification.audioDuration,
        sentAt,
      });

      if (error) {
        console.log('[ADMIN] Push insert error:', error.message);
      }

      const item: PushNotification = {
        ...notification,
        id: pushId,
        sentAt,
        status: 'sent',
        receipts: [],
      };
      setPushHistory((prev) => [item, ...prev]);
    },
    [scheduleLocalNotification, addToInbox],
  );

  return {
    news,
    places,
    restaurants,
    posts,
    pushHistory,
    allUsers,
    isLoading,
    loadAdminData,
    addNews,
    updateNews,
    deleteNews,
    deleteAllNews,
    addPlace,
    updatePlace,
    deletePlace,
    deleteAllPlaces,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    deleteAllRestaurants,
    deletePost,
    deleteAllPosts,
    deleteUser,
    banUser,
    unbanUser,
    addPushNotification,
  };
});
