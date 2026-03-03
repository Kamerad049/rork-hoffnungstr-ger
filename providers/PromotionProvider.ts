import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/constants/queryKeys';
import type {
  Sponsor,
  Promotion,
  PromotionDailyStats,
  PromotionAnalytics,
} from '@/constants/types';

function mapDbSponsor(s: any): Sponsor {
  return {
    id: s.id,
    name: s.name,
    logoUrl: s.logo_url ?? '',
    websiteUrl: s.website_url ?? '',
    contactEmail: s.contact_email ?? '',
    createdAt: s.created_at,
  };
}

function mapDbPromotion(p: any): Promotion {
  return {
    id: p.id,
    sponsorId: p.sponsor_id ?? null,
    promotionType: p.promotion_type ?? 'sponsor',
    title: p.title ?? '',
    content: p.content ?? '',
    mediaUrl: p.media_url ?? '',
    ctaLabel: p.cta_label ?? '',
    ctaUrl: p.cta_url ?? '',
    status: p.status ?? 'draft',
    feedPosition: p.feed_position ?? 5,
    startDate: p.start_date,
    endDate: p.end_date,
    createdAt: p.created_at,
  };
}

function mapDbDailyStats(d: any): PromotionDailyStats {
  return {
    id: d.id,
    promotionId: d.promotion_id,
    date: d.date,
    totalImpressions: d.total_impressions ?? 0,
    uniqueImpressions: d.unique_impressions ?? 0,
    totalClicks: d.total_clicks ?? 0,
    uniqueClicks: d.unique_clicks ?? 0,
  };
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

const IMPRESSION_DEDUP_KEY_PREFIX = 'promo_imp_';

export const [PromotionProvider, usePromotions] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  const todayImpressionSet = useRef<Set<string>>(new Set());
  const pendingImpressions = useRef<{ promotionId: string; durationMs: number }[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sponsorsQuery = useQuery({
    queryKey: queryKeys.sponsors(),
    queryFn: async () => {
      console.log('[PROMO] Loading sponsors...');
      const { data, error } = await supabase.from('sponsors').select('*').order('created_at', { ascending: false });
      if (error) console.log('[PROMO] Sponsors load error:', error.message);
      return (data ?? []).map(mapDbSponsor);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const promotionsQuery = useQuery({
    queryKey: queryKeys.promotions(),
    queryFn: async () => {
      console.log('[PROMO] Loading promotions...');
      const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
      if (error) console.log('[PROMO] Promotions load error:', error.message);
      return (data ?? []).map(mapDbPromotion);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const activePromotionsQuery = useQuery({
    queryKey: queryKeys.activePromotions(),
    queryFn: async () => {
      console.log('[PROMO] Loading active promotions...');
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('feed_position', { ascending: true });
      if (error) console.log('[PROMO] Active promotions load error:', error.message);
      return (data ?? []).map(mapDbPromotion);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const sponsors = useMemo(() => sponsorsQuery.data ?? [], [sponsorsQuery.data]);
  const promotions = useMemo(() => promotionsQuery.data ?? [], [promotionsQuery.data]);
  const activePromotions = useMemo(() => activePromotionsQuery.data ?? [], [activePromotionsQuery.data]);

  const flushImpressions = useCallback(async () => {
    if (pendingImpressions.current.length === 0) return;
    const batch = [...pendingImpressions.current];
    pendingImpressions.current = [];

    const today = getTodayDate();
    const rows = batch.map((imp) => ({
      promotion_id: imp.promotionId,
      user_id: userId,
      viewed_at: new Date().toISOString(),
      view_duration_ms: imp.durationMs,
      date: today,
    }));

    console.log('[PROMO] Flushing', rows.length, 'impressions');
    const { error } = await supabase.from('promotion_impressions').insert(rows);
    if (error) {
      console.log('[PROMO] Impression insert error:', error.message);
      pendingImpressions.current.push(...batch);
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushImpressions();
    };
  }, [flushImpressions]);

  const trackImpression = useCallback(
    (promotionId: string, durationMs: number) => {
      if (!userId) return;
      const today = getTodayDate();
      const dedupKey = `${IMPRESSION_DEDUP_KEY_PREFIX}${promotionId}_${today}`;

      if (todayImpressionSet.current.has(dedupKey)) {
        console.log('[PROMO] Skipping duplicate unique impression for', promotionId, 'today');
      } else {
        todayImpressionSet.current.add(dedupKey);
      }

      pendingImpressions.current.push({ promotionId, durationMs });

      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushImpressions();
      }, 5000);

      console.log('[PROMO] Impression tracked:', promotionId, 'duration:', durationMs, 'ms');
    },
    [userId, flushImpressions],
  );

  const trackClick = useCallback(
    async (promotionId: string) => {
      if (!userId) return;
      const today = getTodayDate();
      console.log('[PROMO] Click tracked:', promotionId);
      const { error } = await supabase.from('promotion_clicks').insert({
        promotion_id: promotionId,
        user_id: userId,
        clicked_at: new Date().toISOString(),
        date: today,
      });
      if (error) console.log('[PROMO] Click insert error:', error.message);
    },
    [userId],
  );

  const addSponsorMutation = useMutation({
    mutationFn: async (sponsor: Omit<Sponsor, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('sponsors')
        .insert({
          name: sponsor.name,
          logo_url: sponsor.logoUrl,
          website_url: sponsor.websiteUrl,
          contact_email: sponsor.contactEmail,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapDbSponsor(data);
    },
    onSuccess: (newSponsor) => {
      queryClient.setQueryData<Sponsor[]>(queryKeys.sponsors(), (old) => [newSponsor, ...(old ?? [])]);
    },
  });

  const updateSponsorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Sponsor> }) => {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
      if (updates.websiteUrl !== undefined) dbUpdates.website_url = updates.websiteUrl;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      const { error } = await supabase.from('sponsors').update(dbUpdates).eq('id', id);
      if (error) throw new Error(error.message);
      return { id, updates };
    },
    onSuccess: ({ id, updates }) => {
      queryClient.setQueryData<Sponsor[]>(queryKeys.sponsors(), (old) =>
        (old ?? []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
      );
    },
  });

  const deleteSponsorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Sponsor[]>(queryKeys.sponsors(), (old) => (old ?? []).filter((s) => s.id !== id));
    },
  });

  const addPromotionMutation = useMutation({
    mutationFn: async (promo: Omit<Promotion, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          sponsor_id: promo.sponsorId,
          promotion_type: promo.promotionType,
          title: promo.title,
          content: promo.content,
          media_url: promo.mediaUrl,
          cta_label: promo.ctaLabel,
          cta_url: promo.ctaUrl,
          status: promo.status,
          feed_position: promo.feedPosition,
          start_date: promo.startDate,
          end_date: promo.endDate,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapDbPromotion(data);
    },
    onSuccess: (newPromo) => {
      queryClient.setQueryData<Promotion[]>(queryKeys.promotions(), (old) => [newPromo, ...(old ?? [])]);
      queryClient.invalidateQueries({ queryKey: queryKeys.activePromotions() });
    },
  });

  const updatePromotionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Promotion> }) => {
      const dbUpdates: any = {};
      if (updates.sponsorId !== undefined) dbUpdates.sponsor_id = updates.sponsorId;
      if (updates.promotionType !== undefined) dbUpdates.promotion_type = updates.promotionType;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.mediaUrl !== undefined) dbUpdates.media_url = updates.mediaUrl;
      if (updates.ctaLabel !== undefined) dbUpdates.cta_label = updates.ctaLabel;
      if (updates.ctaUrl !== undefined) dbUpdates.cta_url = updates.ctaUrl;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.feedPosition !== undefined) dbUpdates.feed_position = updates.feedPosition;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
      const { error } = await supabase.from('promotions').update(dbUpdates).eq('id', id);
      if (error) throw new Error(error.message);
      return { id, updates };
    },
    onSuccess: ({ id, updates }) => {
      queryClient.setQueryData<Promotion[]>(queryKeys.promotions(), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.activePromotions() });
    },
  });

  const deletePromotionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Promotion[]>(queryKeys.promotions(), (old) => (old ?? []).filter((p) => p.id !== id));
      queryClient.invalidateQueries({ queryKey: queryKeys.activePromotions() });
    },
  });

  const getPromotionAnalytics = useCallback(
    async (promotionId: string): Promise<PromotionAnalytics> => {
      console.log('[PROMO] Fetching analytics for', promotionId);

      const { data: dailyData, error: dailyError } = await supabase
        .from('promotion_daily_stats')
        .select('*')
        .eq('promotion_id', promotionId)
        .order('date', { ascending: false });

      if (dailyError) console.log('[PROMO] Daily stats error:', dailyError.message);

      const dailyStats = (dailyData ?? []).map(mapDbDailyStats);

      let totalImpressions = 0;
      let uniqueReach = 0;
      let totalClicks = 0;
      let uniqueClicks = 0;

      for (const day of dailyStats) {
        totalImpressions += day.totalImpressions;
        uniqueReach += day.uniqueImpressions;
        totalClicks += day.totalClicks;
        uniqueClicks += day.uniqueClicks;
      }

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgFrequency = uniqueReach > 0 ? totalImpressions / uniqueReach : 0;

      return {
        promotionId,
        totalImpressions,
        uniqueReach,
        totalClicks,
        uniqueClicks,
        ctr,
        avgFrequency,
        dailyStats,
      };
    },
    [],
  );

  const getSponsorById = useCallback(
    (sponsorId: string): Sponsor | undefined => {
      return sponsors.find((s) => s.id === sponsorId);
    },
    [sponsors],
  );

  return {
    sponsors,
    promotions,
    activePromotions,
    isLoading: sponsorsQuery.isLoading || promotionsQuery.isLoading,
    trackImpression,
    trackClick,
    addSponsor: addSponsorMutation.mutateAsync,
    updateSponsor: (id: string, updates: Partial<Sponsor>) => updateSponsorMutation.mutateAsync({ id, updates }),
    deleteSponsor: deleteSponsorMutation.mutateAsync,
    addPromotion: addPromotionMutation.mutateAsync,
    updatePromotion: (id: string, updates: Partial<Promotion>) => updatePromotionMutation.mutateAsync({ id, updates }),
    deletePromotion: deletePromotionMutation.mutateAsync,
    getPromotionAnalytics,
    getSponsorById,
    isSavingSponsor: addSponsorMutation.isPending || updateSponsorMutation.isPending,
    isSavingPromotion: addPromotionMutation.isPending || updatePromotionMutation.isPending,
  };
});
