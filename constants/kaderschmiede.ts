export interface TrainingActivity {
  id: string;
  userId: string;
  userName: string;
  type: SportCategory;
  title: string;
  description: string;
  city: string;
  bundesland: string;
  latitude: number;
  longitude: number;
  dateTime: string;
  level: SkillLevel;
  maxParticipants: number;
  participants: string[];
  isRecurring: boolean;
  createdAt: string;
}

export interface TruppMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'leader' | 'member';
  joinedAt: string;
}

export interface TruppMeeting {
  id: string;
  truppId: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
  city: string;
  attendeeIds: string[];
}

export interface Trupp {
  id: string;
  name: string;
  motto: string;
  sport: SportCategory;
  city: string;
  bundesland: string;
  leaderId: string;
  memberIds: string[];
  members: TruppMember[];
  meetings: TruppMeeting[];
  isOpen: boolean;
  createdAt: string;
  weeklyGoal: string;
  streak: number;
  description: string;
  logoUrl: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  sport: SportCategory;
  creatorId: string;
  participantIds: string[];
  startDate: string;
  endDate: string;
  goal: number;
  unit: string;
  results: ChallengeResult[];
  isActive: boolean;
}

export interface ChallengeResult {
  userId: string;
  value: number;
  proofUrl?: string;
  submittedAt: string;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  exercise: string;
  reps?: number;
  sets?: number;
  duration?: number;
  distance?: number;
  notes: string;
  createdAt: string;
}

export type SportCategory =
  | 'Calisthenics'
  | 'Kampfsport'
  | 'Ausdauer'
  | 'Eisbaden'
  | 'Kraftsport'
  | 'Wandern';

export type SkillLevel = 'Anfänger' | 'Fortgeschritten' | 'Profi';

export type ChallengeType = '1v1' | 'Gruppe' | 'Stadt' | 'Bundesland';

export const SPORT_CATEGORIES: SportCategory[] = [
  'Calisthenics',
  'Kampfsport',
  'Ausdauer',
  'Eisbaden',
  'Kraftsport',
  'Wandern',
];

export const SPORT_ICONS: Record<SportCategory, string> = {
  Calisthenics: 'Dumbbell',
  Kampfsport: 'Swords',
  Ausdauer: 'Timer',
  Eisbaden: 'Snowflake',
  Kraftsport: 'Dumbbell',
  Wandern: 'Mountain',
};

export const SKILL_LEVELS: SkillLevel[] = ['Anfänger', 'Fortgeschritten', 'Profi'];

export interface CheckInSession {
  id: string;
  type: 'activity' | 'meeting';
  sessionId: string;
  hostUserId: string;
  code: string;
  participantIds: string[];
  checkedInUsers: CheckInEntry[];
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  hostLatitude: number;
  hostLongitude: number;
  hostAccuracy: number;
}

export interface CheckInEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  checkedInAt: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  distanceToHost?: number;
  isMocked?: boolean;
}

export interface CheckInToken {
  checkinId: string;
  epoch: number;
  nonce: string;
}

export const CHECKIN_PROXIMITY_RADIUS_M = 50;
export const CHECKIN_TOKEN_ROTATION_S = 30;
export const CHECKIN_TOKEN_VALIDITY_S = 60;
export const CHECKIN_MAX_GPS_ACCURACY_M = 100;

export const BUNDESLAND_COORDS: Record<string, { lat: number; lng: number }> = {
  'Baden-Württemberg': { lat: 48.66, lng: 9.35 },
  'Bayern': { lat: 48.79, lng: 11.50 },
  'Berlin': { lat: 52.52, lng: 13.41 },
  'Brandenburg': { lat: 52.41, lng: 13.07 },
  'Bremen': { lat: 53.08, lng: 8.80 },
  'Hamburg': { lat: 53.55, lng: 10.00 },
  'Hessen': { lat: 50.65, lng: 9.16 },
  'Mecklenburg-Vorpommern': { lat: 53.61, lng: 12.43 },
  'Niedersachsen': { lat: 52.64, lng: 9.85 },
  'Nordrhein-Westfalen': { lat: 51.43, lng: 7.66 },
  'Rheinland-Pfalz': { lat: 49.91, lng: 7.45 },
  'Saarland': { lat: 49.40, lng: 6.96 },
  'Sachsen': { lat: 51.10, lng: 13.20 },
  'Sachsen-Anhalt': { lat: 51.95, lng: 11.69 },
  'Schleswig-Holstein': { lat: 54.22, lng: 9.70 },
  'Thüringen': { lat: 50.98, lng: 11.03 },
};
