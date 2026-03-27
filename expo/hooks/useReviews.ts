import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/constants/queryKeys';
import type { Review } from '@/constants/types';

export function useReviews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews(),
    queryFn: async () => {
      console.log('[REVIEWS] Loading reviews...');
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('id, user_id, target_id, target_type, rating, comment, created_at')
        .order('created_at', { ascending: false });

      if (reviewError) {
        console.log('[REVIEWS] Load error:', reviewError.message);
        return [];
      }

      const reviewRows = reviewData ?? [];
      if (reviewRows.length === 0) return [];

      const reviewIds = reviewRows.map((r: any) => r.id);
      const userIds = [...new Set(reviewRows.map((r: any) => r.user_id))];

      const [votesRes, usersRes] = await Promise.all([
        supabase.from('review_votes').select('review_id, user_id, vote_type').in('review_id', reviewIds),
        supabase.from('users').select('id, display_name').in('id', userIds),
      ]);

      const usersMap = new Map<string, string>();
      for (const u of (usersRes.data ?? [])) {
        usersMap.set(u.id, u.display_name);
      }

      const votesMap = new Map<string, { up: string[]; down: string[] }>();
      for (const v of (votesRes.data ?? [])) {
        if (!votesMap.has(v.review_id)) {
          votesMap.set(v.review_id, { up: [], down: [] });
        }
        const entry = votesMap.get(v.review_id)!;
        if (v.vote_type === 'up') entry.up.push(v.user_id);
        else entry.down.push(v.user_id);
      }

      const mapped: Review[] = reviewRows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: usersMap.get(r.user_id) ?? 'Unbekannt',
        targetId: r.target_id,
        targetType: r.target_type,
        rating: r.rating,
        comment: r.comment ?? '',
        createdAt: r.created_at,
        thumbsUp: votesMap.get(r.id)?.up ?? [],
        thumbsDown: votesMap.get(r.id)?.down ?? [],
      }));

      console.log('[REVIEWS] Loaded', mapped.length, 'reviews');
      return mapped;
    },
    staleTime: 5 * 60 * 1000,
  });

  const reviews: Review[] = useMemo(() => reviewsQuery.data ?? [], [reviewsQuery.data]);
  const isLoading = reviewsQuery.isLoading;

  const addReview = useCallback(
    async (targetId: string, targetType: 'place' | 'restaurant', rating: number, comment: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          target_id: targetId,
          target_type: targetType,
          rating,
          comment,
        })
        .select('id, created_at')
        .single();

      if (error) {
        console.log('[REVIEWS] Add error:', error.message);
        return;
      }

      const newReview: Review = {
        id: data.id,
        userId: user.id,
        userName: user.name,
        targetId,
        targetType,
        rating,
        comment,
        createdAt: data.created_at,
        thumbsUp: [],
        thumbsDown: [],
      };
      queryClient.setQueryData<Review[]>(
        queryKeys.reviews(),
        (old) => [newReview, ...(old ?? [])],
      );
      console.log('[REVIEWS] Added review:', data.id);
    },
    [user, queryClient],
  );

  const toggleThumbsUp = useCallback(
    async (reviewId: string) => {
      if (!user) return;
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) return;

      const alreadyUp = review.thumbsUp.includes(user.id);

      queryClient.setQueryData<Review[]>(
        queryKeys.reviews(),
        (old) =>
          (old ?? []).map((r) => {
            if (r.id !== reviewId) return r;
            const cleanDown = r.thumbsDown.filter((uid) => uid !== user.id);
            return {
              ...r,
              thumbsUp: alreadyUp ? r.thumbsUp.filter((uid) => uid !== user.id) : [...r.thumbsUp, user.id],
              thumbsDown: cleanDown,
            };
          }),
      );

      if (alreadyUp) {
        await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', user.id);
      } else {
        await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', user.id);
        await supabase.from('review_votes').insert({ review_id: reviewId, user_id: user.id, vote_type: 'up' });
      }
    },
    [user, reviews, queryClient],
  );

  const toggleThumbsDown = useCallback(
    async (reviewId: string) => {
      if (!user) return;
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) return;

      const alreadyDown = review.thumbsDown.includes(user.id);

      queryClient.setQueryData<Review[]>(
        queryKeys.reviews(),
        (old) =>
          (old ?? []).map((r) => {
            if (r.id !== reviewId) return r;
            const cleanUp = r.thumbsUp.filter((uid) => uid !== user.id);
            return {
              ...r,
              thumbsDown: alreadyDown ? r.thumbsDown.filter((uid) => uid !== user.id) : [...r.thumbsDown, user.id],
              thumbsUp: cleanUp,
            };
          }),
      );

      if (alreadyDown) {
        await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', user.id);
      } else {
        await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', user.id);
        await supabase.from('review_votes').insert({ review_id: reviewId, user_id: user.id, vote_type: 'down' });
      }
    },
    [user, reviews, queryClient],
  );

  const hasUserReviewed = useCallback(
    (targetId: string, targetType: 'place' | 'restaurant') => {
      if (!user) return false;
      return reviews.some((r) => r.targetId === targetId && r.targetType === targetType && r.userId === user.id);
    },
    [user, reviews],
  );

  return {
    reviews,
    isLoading,
    addReview,
    toggleThumbsUp,
    toggleThumbsDown,
    hasUserReviewed,
  };
}

export function useTargetReviews(targetId: string, targetType: 'place' | 'restaurant') {
  const { reviews } = useReviews();
  return useMemo(() => {
    const filtered = reviews.filter((r) => r.targetId === targetId && r.targetType === targetType);
    const avg = filtered.length > 0 ? filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length : 0;
    return {
      reviews: filtered,
      averageRating: Math.round(avg * 10) / 10,
      count: filtered.length,
    };
  }, [reviews, targetId, targetType]);
}
