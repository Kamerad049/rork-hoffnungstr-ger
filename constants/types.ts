export interface Place {
  id: string;
  title: string;
  description: string;
  city: string;
  bundesland: string;
  images: string[];
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
}

export type PlaceCategory = 'Denkmal' | 'Gedenkstätte' | 'Historische Stätte' | 'Natur' | 'Schloss/Burg' | 'Kirche' | 'Museum';

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  city: string;
  bundesland: string;
  images: string[];
  priceRange: 1 | 2 | 3;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  cuisine: string[];
}

export interface Quote {
  id: number;
  text: string;
  author: string;
}

export interface Leitsatz {
  tag: number;
  spruch: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  image: string;
  text: string;
  publishDate: string;
  author: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  targetId: string;
  targetType: 'place' | 'restaurant';
  rating: number;
  comment: string;
  createdAt: string;
  thumbsUp: string[];
  thumbsDown: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Stamp {
  id: string;
  placeId: string;
  userId: string;
  collectedAt: string;
  photoUri: string | null;
  latitude: number;
  longitude: number;
  verified: boolean;
}

export interface LocationCheck {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
}

export const BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;

export const PLACE_CATEGORIES: PlaceCategory[] = [
  'Denkmal',
  'Gedenkstätte',
  'Historische Stätte',
  'Natur',
  'Schloss/Burg',
  'Kirche',
  'Museum',
];

export const PERSONAL_VALUES = [
  'Ehre',
  'Treue',
  'Verantwortung',
  'Heimat',
  'Familie',
  'Freiheit',
  'Stärke',
  'Disziplin',
  'Glaube',
  'Mut',
  'Tradition',
  'Zusammenhalt',
  'Respekt',
  'Aufrichtigkeit',
  'Demut',
] as const;

export type PersonalValue = typeof PERSONAL_VALUES[number];

export type Gender = 'mann' | 'frau' | '';

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: '', label: 'Keine Angabe' },
  { value: 'mann', label: 'Mann' },
  { value: 'frau', label: 'Frau' },
];

export type Religion = '' | 'katholisch' | 'evangelisch' | 'orthodox' | 'anders_glaeubig';

export const RELIGION_OPTIONS: { value: Religion; label: string }[] = [
  { value: '', label: 'Keine Angabe' },
  { value: 'katholisch', label: 'Katholisch' },
  { value: 'evangelisch', label: 'Evangelisch' },
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'anders_glaeubig', label: 'Anders gläubig' },
];

export type CrossStyle = 'latin' | 'orthodox' | 'none';

export const CROSS_STYLE_OPTIONS: { value: CrossStyle; label: string }[] = [
  { value: 'none', label: 'Kein Kreuz anzeigen' },
  { value: 'latin', label: 'Lateinisches Kreuz' },
  { value: 'orthodox', label: 'Orthodoxes Kreuz' },
];

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  rank: string;
  rankIcon: string;
  ep: number;
  stampCount: number;
  postCount: number;
  friendCount: number;
  flagHoistedAt?: string | null;
  values?: string[];
  birthplace?: string;
  residence?: string;
  bundesland?: string;
  gender?: Gender;
  religion?: Religion;
  crossStyle?: CrossStyle;
  showGender?: boolean;
  showReligion?: boolean;
}

export interface FeedPost {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'none';
  likeCount: number;
  commentCount: number;
  createdAt: string;
  location?: string;
  taggedUserIds?: string[];
  tags?: string[];
  isArchived?: boolean;
  commentsDisabled?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  replyToId?: string;
  defendCount?: number;
}

export interface StoryItem {
  id: string;
  mediaUrl: string;
  caption: string;
  createdAt: string;
  bgColor?: string;
  fontFamily?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  textX?: number;
  textY?: number;
  textScale?: number;
}

export interface StoryGroup {
  userId: string;
  stories: StoryItem[];
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
  edited?: boolean;
  recalled?: boolean;
  isSystem?: boolean;
  isVoice?: boolean;
  voiceUri?: string;
  voiceDuration?: number;
}

export interface Conversation {
  partnerId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isFromMe: boolean;
  lastMessageRead: boolean;
  lastMessageRecalled: boolean;
}

export type ReactionType = 'respekt' | 'anerkennung' | 'zuspruch' | 'verbundenheit';

export const REACTION_CONFIG: Record<ReactionType, { label: string; emoji: string }> = {
  respekt: { label: 'Respekt', emoji: '🫡' },
  anerkennung: { label: 'Anerkennung', emoji: '🏆' },
  zuspruch: { label: 'Zuspruch', emoji: '💪' },
  verbundenheit: { label: 'Verbundenheit', emoji: '🤝' },
};

export const REACTION_TYPES: ReactionType[] = ['respekt', 'anerkennung', 'zuspruch', 'verbundenheit'];

export type ReelMediaType = 'video' | 'photo';

export interface Reel {
  id: string;
  userId: string;
  caption: string;
  mediaType: ReelMediaType;
  videoUrl: string;
  thumbnailUrl: string;
  imageUrl?: string;
  reactionCounts: Record<ReactionType, number>;
  totalReactions: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  createdAt: string;
  location?: string;
  tags?: string[];
  duration?: number;
  isUserUpload?: boolean;
  aspectRatio?: number;
  taggedUsers?: string[];
  isArchived?: boolean;
}

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  createdAt: string;
  likeCount: number;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUrl: string;
  durationMs: number;
  progressMs: number;
}

export type ActivityType =
  | 'like_post'
  | 'like_comment'
  | 'comment'
  | 'reply_comment'
  | 'follow'
  | 'mention'
  | 'share'
  | 'like_reel'
  | 'comment_reel';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  fromUserId: string;
  targetId?: string;
  targetPreview?: string;
  mediaUrl?: string;
  createdAt: string;
  read: boolean;
}

export function getActivityLabel(type: ActivityType): string {
  switch (type) {
    case 'like_post': return 'hat deinen Beitrag geliked';
    case 'like_comment': return 'hat deinen Kommentar verteidigt';
    case 'comment': return 'hat kommentiert';
    case 'reply_comment': return 'hat auf deinen Kommentar geantwortet';
    case 'follow': return 'folgt dir jetzt';
    case 'mention': return 'hat dich erwähnt';
    case 'share': return 'hat deinen Beitrag geteilt';
    case 'like_reel': return 'hat dein Reel geliked';
    case 'comment_reel': return 'hat dein Reel kommentiert';
    default: return '';
  }
}

export type SubmissionCategory = 'place' | 'restaurant';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  category: SubmissionCategory;
  submittedBy: string;
  submitterName: string;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  name: string;
  description: string;
  city: string;
  bundesland: string;
  images: string[];
  placeCategory?: PlaceCategory;
  cuisineTypes?: string[];
  priceRange?: 1 | 2 | 3;
  address?: string;
  latitude?: number;
  longitude?: number;
  whyRecommend: string;
}

export type PromotionType = 'sponsor' | 'internal' | 'creator' | 'event';
export type PromotionStatus = 'active' | 'paused' | 'ended' | 'draft';

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  contactEmail: string;
  createdAt: string;
}

export interface SponsorContract {
  id: string;
  sponsorId: string;
  startDate: string;
  endDate: string;
  pricePerMonth: number;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
}

export interface Promotion {
  id: string;
  sponsorId: string | null;
  promotionType: PromotionType;
  title: string;
  content: string;
  mediaUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  status: PromotionStatus;
  feedPosition: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface PromotionImpression {
  id: string;
  promotionId: string;
  userId: string;
  viewedAt: string;
  viewDurationMs: number;
  date: string;
}

export interface PromotionClick {
  id: string;
  promotionId: string;
  userId: string;
  clickedAt: string;
  date: string;
}

export interface PromotionDailyStats {
  id: string;
  promotionId: string;
  date: string;
  totalImpressions: number;
  uniqueImpressions: number;
  totalClicks: number;
  uniqueClicks: number;
}

export interface PromotionAnalytics {
  promotionId: string;
  totalImpressions: number;
  uniqueReach: number;
  totalClicks: number;
  uniqueClicks: number;
  ctr: number;
  avgFrequency: number;
  dailyStats: PromotionDailyStats[];
}

export function getActivityIconColor(type: ActivityType): string {
  switch (type) {
    case 'like_post':
    case 'like_comment':
      return '#DAA520';
    case 'like_reel':
      return '#E85D75';
    case 'comment':
    case 'reply_comment':
    case 'comment_reel':
      return '#5DA0E8';
    case 'follow':
      return '#5DE8A0';
    case 'mention':
      return '#BFA35D';
    case 'share':
      return '#A35DBF';
    default:
      return '#999';
  }
}
