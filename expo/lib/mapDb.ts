import type { SocialUser, Place, Restaurant, NewsArticle, FeedPost } from '@/constants/types';

export function mapDbUser(u: any): SocialUser {
  return {
    id: u.id,
    username: u.username ?? '',
    displayName: u.display_name ?? '',
    bio: u.bio ?? '',
    avatarUrl: u.avatar_url ?? null,
    rank: u.rank ?? 'Neuling',
    rankIcon: u.rank_icon ?? 'Eye',
    ep: u.xp ?? 0,
    stampCount: u.stamp_count ?? 0,
    postCount: u.post_count ?? 0,
    friendCount: u.friend_count ?? 0,
    flagHoistedAt: u.flag_hoisted_at ?? null,
    values: [],
    birthplace: u.birthplace ?? '',
    birthplacePlz: u.birthplace_plz ?? '',
    residence: u.residence ?? '',
    residencePlz: u.residence_plz ?? '',
    bundesland: u.bundesland ?? '',
  };
}

export function mapDbPlace(p: any): Place {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    city: p.city,
    plz: p.plz ?? '',
    bundesland: p.bundesland,
    images: p.images ?? [],
    category: p.category,
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
  };
}

export function mapDbRestaurant(r: any): Restaurant {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    city: r.city,
    plz: r.plz ?? '',
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

export function mapDbNews(n: any): NewsArticle {
  return {
    id: n.id,
    title: n.title,
    text: n.text,
    image: n.image ?? '',
    author: n.author ?? 'Heldentum Redaktion',
    publishDate: n.publish_date ?? n.created_at,
  };
}

export function mapDbPost(p: any, userId?: string): FeedPost {
  return {
    id: p.id,
    userId: userId && p.user_id === userId ? 'me' : p.user_id,
    content: p.content ?? '',
    mediaUrls: p.media_urls ?? [],
    mediaType: p.media_type ?? 'none',
    likeCount: p.like_count ?? 0,
    commentCount: p.comment_count ?? 0,
    createdAt: p.created_at,
    location: p.location ?? undefined,
    taggedUserIds: p.tagged_user_ids ?? undefined,
    tags: p.tags ?? undefined,
    isArchived: p.is_archived ?? false,
    commentsDisabled: p.comments_disabled ?? false,
  };
}
