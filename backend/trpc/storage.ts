interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  isSingle: boolean;
  rank: string;
  ep: number;
  isPremium: boolean;
  createdAt: Date;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

interface Post {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  mediaType: "image" | "video" | "none";
  likes: string[];
  createdAt: Date;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  likes: string[];
  createdAt: Date;
}

interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  viewers: string[];
  createdAt: Date;
  expiresAt: Date;
}

interface StampEntry {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  verifiedAt: Date;
  epEarned: number;
}

interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  mediaUrl: string | null;
  read: boolean;
  createdAt: Date;
}

const users = new Map<string, User>();
const friendRequests = new Map<string, FriendRequest>();
const posts = new Map<string, Post>();
const comments = new Map<string, Comment>();
const stories = new Map<string, Story>();
const stamps = new Map<string, StampEntry>();
const messages = new Map<string, Message>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

const RANKS = [
  { name: "Sucher", minEp: 0 },
  { name: "Entdecker", minEp: 100 },
  { name: "Hüter", minEp: 500 },
  { name: "Wächter", minEp: 1500 },
  { name: "Bewahrer", minEp: 3000 },
  { name: "Meister", minEp: 5000 },
  { name: "Patriot", minEp: 10000 },
];

function getRankForEp(ep: number): string {
  let rank = RANKS[0].name;
  for (const r of RANKS) {
    if (ep >= r.minEp) rank = r.name;
  }
  return rank;
}

export const db = {
  users,
  friendRequests,
  posts,
  comments,
  stories,
  stamps,
  messages,
  generateId,
  getRankForEp,
  RANKS,
};

export type { User, FriendRequest, Post, Comment, Story, StampEntry, Message };
