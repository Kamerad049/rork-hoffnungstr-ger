export type GameType = 'shadow_cards' | 'vier_gewinnt' | 'schiffe_versenken';

export type LobbyStatus = 'waiting' | 'ready_check' | 'countdown' | 'in_game' | 'finished' | 'cancelled';

export type DrawDirection = 'left' | 'right';

export interface GameDefinition {
  type: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  icon: string;
  estimatedDuration: string;
  available: boolean;
}

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    type: 'shadow_cards',
    name: 'Der Schatten',
    description: 'Schwarzer-Peter-Variante. Finde Paare und werde den Schatten los!',
    minPlayers: 3,
    maxPlayers: 4,
    icon: 'ghost',
    estimatedDuration: '2–4 Min.',
    available: true,
  },
  {
    type: 'vier_gewinnt',
    name: 'Vier Gewinnt',
    description: 'Klassiker – 4 in einer Reihe gewinnt.',
    minPlayers: 2,
    maxPlayers: 2,
    icon: 'grid',
    estimatedDuration: '3–5 Min.',
    available: true,
  },
  {
    type: 'schiffe_versenken',
    name: 'Schiffe versenken',
    description: 'Strategisches Flottenduell auf dem Raster.',
    minPlayers: 2,
    maxPlayers: 2,
    icon: 'anchor',
    estimatedDuration: '5–10 Min.',
    available: false,
  },
];

export interface GameSettings {
  turnTimerSeconds: number;
  drawDirection: DrawDirection;
  autoPairRemove: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  turnTimerSeconds: 20,
  drawDirection: 'left',
  autoPairRemove: true,
};

export interface LobbyRoom {
  id: string;
  gameType: GameType;
  hostUserId: string;
  maxPlayers: number;
  isPrivate: boolean;
  settings: GameSettings;
  status: LobbyStatus;
  inviteCode: string;
  createdAt: string;
  expiresAt: string;
}

export interface LobbyMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isReady: boolean;
  isHost: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface GameSession {
  id: string;
  roomId: string;
  gameType: GameType;
  startedAt: string;
  endedAt: string | null;
  winnerUserId: string | null;
  loserUserId: string | null;
  resultJson: Record<string, unknown> | null;
  playerIds: string[];
}

export interface GameEvent {
  sessionId: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type CardSuit = 'swords' | 'shields' | 'crowns' | 'flames' | 'mountains' | 'eagles';

export interface ShadowCard {
  id: string;
  suit: CardSuit | 'shadow';
  value: number;
  label: string;
  isShadow: boolean;
}

export const CARD_SUITS: { suit: CardSuit; label: string; symbol: string }[] = [
  { suit: 'swords', label: 'Schwerter', symbol: '⚔️' },
  { suit: 'shields', label: 'Schilde', symbol: '🛡️' },
  { suit: 'crowns', label: 'Kronen', symbol: '👑' },
  { suit: 'flames', label: 'Flammen', symbol: '🔥' },
  { suit: 'mountains', label: 'Berge', symbol: '⛰️' },
  { suit: 'eagles', label: 'Adler', symbol: '🦅' },
];

export const SHADOW_CARD_SYMBOL = '🌑';

export function generateDeck(playerCount: number): ShadowCard[] {
  const pairsPerSuit = playerCount === 3 ? 2 : 3;
  const cards: ShadowCard[] = [];
  let id = 0;

  for (const { suit } of CARD_SUITS) {
    for (let v = 1; v <= pairsPerSuit; v++) {
      cards.push({ id: `c${id++}`, suit, value: v, label: `${suit}_${v}_a`, isShadow: false });
      cards.push({ id: `c${id++}`, suit, value: v, label: `${suit}_${v}_b`, isShadow: false });
    }
  }

  cards.push({ id: `c${id++}`, suit: 'shadow', value: 0, label: 'der_schatten', isShadow: true });

  return cards;
}

export function shuffleDeck<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function findPairs(hand: ShadowCard[]): { pairs: [ShadowCard, ShadowCard][]; remaining: ShadowCard[] } {
  const grouped: Record<string, ShadowCard[]> = {};
  for (const card of hand) {
    if (card.isShadow) continue;
    const key = `${card.suit}_${card.value}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(card);
  }

  const pairs: [ShadowCard, ShadowCard][] = [];
  const pairedIds = new Set<string>();

  for (const group of Object.values(grouped)) {
    if (group.length >= 2) {
      pairs.push([group[0], group[1]]);
      pairedIds.add(group[0].id);
      pairedIds.add(group[1].id);
    }
  }

  const remaining = hand.filter(c => !pairedIds.has(c.id));
  return { pairs, remaining };
}

export type ShadowGamePhase = 'dealing' | 'removing_pairs' | 'playing' | 'finished';

export interface ShadowPlayerState {
  userId: string;
  hand: ShadowCard[];
  handCount: number;
  isEliminated: boolean;
  finishOrder: number;
}

export interface ShadowGameState {
  phase: ShadowGamePhase;
  players: ShadowPlayerState[];
  currentTurnUserId: string;
  turnStartedAt: number;
  drawFromUserId: string;
  removedPairs: { userId: string; pair: [ShadowCard, ShadowCard] }[];
  turnNumber: number;
  lastDrawnCard: ShadowCard | null;
  lastDrawnByUserId: string | null;
  loserUserId: string | null;
  finishOrder: string[];
}
