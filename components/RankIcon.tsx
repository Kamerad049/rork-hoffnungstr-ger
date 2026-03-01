import React from 'react';
import {
  Eye,
  Search,
  Footprints,
  Compass,
  MapPin,
  Binoculars,
  Shield,
  ShieldCheck,
  Landmark,
  BookOpen,
  Crown,
  Gem,
  Star,
  Sword,
  Sparkles,
  Map,
  Mountain,
  Flag,
  Globe,
  Target,
  Telescope,
  Castle,
  Flame,
  Zap,
  Trophy,
  Medal,
  Swords,
  ScrollText,
  Sun,
  Infinity,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Eye,
  Search,
  Footprints,
  Compass,
  MapPin,
  Binoculars,
  Shield,
  ShieldCheck,
  Landmark,
  BookOpen,
  Crown,
  Gem,
  Star,
  Sword,
  Sparkles,
  Map,
  Mountain,
  Flag,
  Globe,
  Target,
  Telescope,
  Castle,
  Flame,
  Zap,
  Trophy,
  Medal,
  Swords,
  ScrollText,
  Sun,
  Infinity,
};

interface RankIconProps {
  icon: string;
  size?: number;
  color?: string;
}

export default function RankIcon({ icon, size = 16, color = '#BFA35D' }: RankIconProps) {
  const IconComponent = ICON_MAP[icon];
  if (!IconComponent) {
    const Fallback = ICON_MAP['Eye'];
    return <Fallback size={size} color={color} />;
  }
  return <IconComponent size={size} color={color} />;
}
