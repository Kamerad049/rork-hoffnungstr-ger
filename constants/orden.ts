export type OrdenTier = 'bronze' | 'silber' | 'gold' | 'legendaer';
export type OrdenCategory = 'aktivitaet' | 'gemeinschaft' | 'entdecker' | 'inhalt' | 'selten';

export interface OrdenDefinition {
  id: string;
  name: string;
  description: string;
  tier: OrdenTier;
  category: OrdenCategory;
  icon: string;
  requirement: string;
  xpReward: number;
}

export interface EarnedOrden {
  ordenId: string;
  earnedAt: string;
  userId: string;
}

export interface CharacterStat {
  label: string;
  value: number;
  maxValue: number;
  icon: string;
}

export const TIER_COLORS: Record<OrdenTier, { primary: string; secondary: string; glow: string; bg: string; border: string; text: string }> = {
  bronze: {
    primary: '#CD7F32',
    secondary: '#A0522D',
    glow: 'rgba(205,127,50,0.5)',
    bg: 'rgba(205,127,50,0.08)',
    border: 'rgba(205,127,50,0.25)',
    text: '#CD7F32',
  },
  silber: {
    primary: '#C0C0C0',
    secondary: '#A8A8A8',
    glow: 'rgba(192,192,192,0.5)',
    bg: 'rgba(192,192,192,0.08)',
    border: 'rgba(192,192,192,0.25)',
    text: '#C0C0C0',
  },
  gold: {
    primary: '#FFD700',
    secondary: '#DAA520',
    glow: 'rgba(255,215,0,0.5)',
    bg: 'rgba(255,215,0,0.08)',
    border: 'rgba(255,215,0,0.3)',
    text: '#FFD700',
  },
  legendaer: {
    primary: '#E8DCC8',
    secondary: '#BFA35D',
    glow: 'rgba(191,163,93,0.6)',
    bg: 'rgba(191,163,93,0.1)',
    border: 'rgba(191,163,93,0.4)',
    text: '#BFA35D',
  },
};

export const TIER_NAMES: Record<OrdenTier, string> = {
  bronze: 'Bronze',
  silber: 'Silber',
  gold: 'Gold',
  legendaer: 'Legendär',
};

export const CATEGORY_NAMES: Record<OrdenCategory, string> = {
  aktivitaet: 'Aktivität',
  gemeinschaft: 'Gemeinschaft',
  entdecker: 'Entdecker',
  inhalt: 'Inhalt',
  selten: 'Extrem Selten',
};

export const CATEGORY_ICONS: Record<OrdenCategory, string> = {
  aktivitaet: 'Flame',
  gemeinschaft: 'Users',
  entdecker: 'Compass',
  inhalt: 'Feather',
  selten: 'Sparkles',
};

export const ORDEN_DEFINITIONS: OrdenDefinition[] = [
  // === AKTIVITÄT ===
  {
    id: 'ord_dauerbrenner_b',
    name: 'Dauerbrenner',
    description: '7 Tage am Stück aktiv gewesen',
    tier: 'bronze',
    category: 'aktivitaet',
    icon: 'Flame',
    requirement: '7 Tage Streak',
    xpReward: 100,
  },
  {
    id: 'ord_dauerbrenner_s',
    name: 'Dauerbrenner II',
    description: '14 Tage am Stück aktiv gewesen',
    tier: 'silber',
    category: 'aktivitaet',
    icon: 'Flame',
    requirement: '14 Tage Streak',
    xpReward: 250,
  },
  {
    id: 'ord_dauerbrenner_g',
    name: 'Dauerbrenner III',
    description: '30 Tage am Stück aktiv gewesen',
    tier: 'gold',
    category: 'aktivitaet',
    icon: 'Flame',
    requirement: '30 Tage Streak',
    xpReward: 500,
  },
  {
    id: 'ord_dauerbrenner_l',
    name: 'Ewige Flamme',
    description: '100 Tage am Stück aktiv – eine lebende Legende',
    tier: 'legendaer',
    category: 'aktivitaet',
    icon: 'Flame',
    requirement: '100 Tage Streak',
    xpReward: 2000,
  },
  {
    id: 'ord_fruehaufsteher',
    name: 'Frühaufsteher',
    description: '10x vor 6 Uhr morgens aktiv gewesen',
    tier: 'bronze',
    category: 'aktivitaet',
    icon: 'Sunrise',
    requirement: '10x vor 06:00 aktiv',
    xpReward: 75,
  },
  {
    id: 'ord_nachtwache',
    name: 'Nachtwache',
    description: '20x nach Mitternacht aktiv gewesen',
    tier: 'silber',
    category: 'aktivitaet',
    icon: 'Moon',
    requirement: '20x nach 00:00 aktiv',
    xpReward: 150,
  },
  {
    id: 'ord_flaggentraeger',
    name: 'Fahnenträger',
    description: '30x die Flagge gehisst',
    tier: 'gold',
    category: 'aktivitaet',
    icon: 'Flag',
    requirement: '30x Flagge gehisst',
    xpReward: 400,
  },

  // === GEMEINSCHAFT ===
  {
    id: 'ord_wortfuehrer_b',
    name: 'Wortführer',
    description: '50 Kommentare geschrieben',
    tier: 'bronze',
    category: 'gemeinschaft',
    icon: 'MessageCircle',
    requirement: '50 Kommentare',
    xpReward: 100,
  },
  {
    id: 'ord_wortfuehrer_s',
    name: 'Wortführer II',
    description: '200 Kommentare geschrieben',
    tier: 'silber',
    category: 'gemeinschaft',
    icon: 'MessageCircle',
    requirement: '200 Kommentare',
    xpReward: 300,
  },
  {
    id: 'ord_wortfuehrer_g',
    name: 'Volkstribun',
    description: '500 Kommentare geschrieben – deine Stimme zählt',
    tier: 'gold',
    category: 'gemeinschaft',
    icon: 'MessageCircle',
    requirement: '500 Kommentare',
    xpReward: 600,
  },
  {
    id: 'ord_verteidiger_b',
    name: 'Standhafter',
    description: '50 Verteidigungen erhalten',
    tier: 'bronze',
    category: 'gemeinschaft',
    icon: 'Swords',
    requirement: '50 Verteidigungen',
    xpReward: 100,
  },
  {
    id: 'ord_verteidiger_g',
    name: 'Unbeugsamer',
    description: '500 Verteidigungen erhalten – deine Worte haben Gewicht',
    tier: 'gold',
    category: 'gemeinschaft',
    icon: 'Swords',
    requirement: '500 Verteidigungen',
    xpReward: 600,
  },
  {
    id: 'ord_bruderschaft',
    name: 'Bruderschaft',
    description: '25 Freunde gefunden',
    tier: 'silber',
    category: 'gemeinschaft',
    icon: 'Users',
    requirement: '25 Freunde',
    xpReward: 200,
  },
  {
    id: 'ord_volksheld',
    name: 'Volksheld',
    description: '100 Freunde – du bist das Herz der Gemeinschaft',
    tier: 'legendaer',
    category: 'gemeinschaft',
    icon: 'Heart',
    requirement: '100 Freunde',
    xpReward: 1500,
  },

  // === ENTDECKER ===
  {
    id: 'ord_wanderer_b',
    name: 'Wandersmann',
    description: '5 Orte mit Stempel besucht',
    tier: 'bronze',
    category: 'entdecker',
    icon: 'MapPin',
    requirement: '5 Stempel',
    xpReward: 100,
  },
  {
    id: 'ord_wanderer_s',
    name: 'Pilger',
    description: '15 Orte mit Stempel besucht',
    tier: 'silber',
    category: 'entdecker',
    icon: 'MapPin',
    requirement: '15 Stempel',
    xpReward: 250,
  },
  {
    id: 'ord_wanderer_g',
    name: 'Kreuzritter',
    description: '30 Orte mit Stempel besucht',
    tier: 'gold',
    category: 'entdecker',
    icon: 'MapPin',
    requirement: '30 Stempel',
    xpReward: 500,
  },
  {
    id: 'ord_bundeslandkenner',
    name: 'Bundeslandkenner',
    description: 'In 8 verschiedenen Bundesländern gestempelt',
    tier: 'gold',
    category: 'entdecker',
    icon: 'Map',
    requirement: '8 Bundesländer',
    xpReward: 500,
  },
  {
    id: 'ord_deutschlandkenner',
    name: 'Deutschlandkenner',
    description: 'In allen 16 Bundesländern gestempelt – du kennst die Heimat',
    tier: 'legendaer',
    category: 'entdecker',
    icon: 'Globe',
    requirement: 'Alle 16 Bundesländer',
    xpReward: 3000,
  },

  // === INHALT ===
  {
    id: 'ord_chronist_b',
    name: 'Chronist',
    description: '10 Beiträge veröffentlicht',
    tier: 'bronze',
    category: 'inhalt',
    icon: 'Feather',
    requirement: '10 Beiträge',
    xpReward: 100,
  },
  {
    id: 'ord_chronist_s',
    name: 'Geschichtsschreiber',
    description: '50 Beiträge veröffentlicht',
    tier: 'silber',
    category: 'inhalt',
    icon: 'Feather',
    requirement: '50 Beiträge',
    xpReward: 300,
  },
  {
    id: 'ord_chronist_g',
    name: 'Erzähler des Volkes',
    description: '100 Beiträge veröffentlicht',
    tier: 'gold',
    category: 'inhalt',
    icon: 'ScrollText',
    requirement: '100 Beiträge',
    xpReward: 600,
  },
  {
    id: 'ord_geschichtenerzaehler',
    name: 'Geschmackswächter',
    description: '25 Restaurant-Bewertungen geschrieben',
    tier: 'silber',
    category: 'inhalt',
    icon: 'UtensilsCrossed',
    requirement: '25 Bewertungen',
    xpReward: 200,
  },
  {
    id: 'ord_kritiker',
    name: 'Denkmalpfleger',
    description: '25 Orts-Bewertungen geschrieben',
    tier: 'silber',
    category: 'inhalt',
    icon: 'Landmark',
    requirement: '25 Orts-Bewertungen',
    xpReward: 200,
  },

  // === EXTREM SELTEN ===
  {
    id: 'ord_urgestein',
    name: 'Urgestein',
    description: 'Seit dem ersten Tag dabei – ein Gründungsmitglied',
    tier: 'legendaer',
    category: 'selten',
    icon: 'Gem',
    requirement: 'Tag-1-User',
    xpReward: 5000,
  },
  {
    id: 'ord_meister_aller_klassen',
    name: 'Meister aller Klassen',
    description: 'Alle Gold-Orden freigeschaltet',
    tier: 'legendaer',
    category: 'selten',
    icon: 'Crown',
    requirement: 'Alle Gold-Orden',
    xpReward: 10000,
  },
  {
    id: 'ord_phoenix',
    name: 'Phönix',
    description: 'Nach 30 Tagen Inaktivität zurückgekehrt und 7-Tage-Streak geschafft',
    tier: 'legendaer',
    category: 'selten',
    icon: 'Bird',
    requirement: 'Comeback + 7er Streak',
    xpReward: 2000,
  },
];

export const CHARACTER_DIMENSIONS: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'disziplin', label: 'Disziplin', icon: 'Crown', color: '#FFD700' },
  { key: 'bestaendigkeit', label: 'Beständigkeit', icon: 'Flame', color: '#FF6B35' },
  { key: 'gemeinschaft', label: 'Gemeinschaft', icon: 'Users', color: '#4ECDC4' },
  { key: 'entdeckergeist', label: 'Entdeckergeist', icon: 'Compass', color: '#45B7D1' },
  { key: 'wortstaerke', label: 'Wortstärke', icon: 'MessageCircle', color: '#96CEB4' },
  { key: 'einfluss', label: 'Einfluss', icon: 'Zap', color: '#DDA0DD' },
];
