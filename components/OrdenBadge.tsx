import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame, Flag, MessageCircle, Swords, Users, Heart, MapPin, Map,
  Globe, Feather, ScrollText, Gem, Crown, Bird, Sunrise, Moon,
  Compass, Zap, Landmark, UtensilsCrossed, Sparkles, Star, Shield,
} from 'lucide-react-native';
import { TIER_COLORS, TIER_NAMES, type OrdenDefinition, type OrdenTier } from '@/constants/orden';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Flame, Flag, MessageCircle, Swords, Users, Heart, MapPin, Map,
  Globe, Feather, ScrollText, Gem, Crown, Bird, Sunrise, Moon,
  Compass, Zap, Landmark, UtensilsCrossed, Sparkles, Star, Shield,
};

interface OrdenBadgeProps {
  orden: OrdenDefinition;
  earned: boolean;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showName?: boolean;
  animate?: boolean;
}

const SIZES = {
  small: { badge: 56, icon: 20, ring: 52, innerRing: 44, fontSize: 9, nameWidth: 64 },
  medium: { badge: 76, icon: 28, ring: 70, innerRing: 58, fontSize: 11, nameWidth: 80 },
  large: { badge: 110, icon: 40, ring: 102, innerRing: 86, fontSize: 14, nameWidth: 120 },
};

function OrdenBadge({ orden, earned, size = 'medium', onPress, showName = true, animate = true }: OrdenBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const s = SIZES[size];
  const tierColor = TIER_COLORS[orden.tier];
  const IconComp = ICON_MAP[orden.icon] ?? Shield;

  useEffect(() => {
    if (animate) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }

    if (earned && orden.tier === 'legendaer') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true })
      ).start();
    } else if (earned && orden.tier === 'gold') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [earned, orden.tier, animate]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start();
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }, [pressScale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const gradientColors = earned
    ? getGradientColors(orden.tier)
    : ['#2a2a2e', '#1e1e20'] as [string, string];

  const iconColor = earned ? tierColor.primary : 'rgba(232,220,200,0.15)';
  const borderColor = earned ? tierColor.border : 'rgba(60,60,60,0.3)';

  const content = (
    <Animated.View style={[{ transform: [{ scale: Animated.multiply(scaleAnim, pressScale) }] }]}>
      <View style={[styles.badgeOuter, { width: s.badge, height: s.badge }]}>
        {earned && (orden.tier === 'legendaer' || orden.tier === 'gold') && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                width: s.badge + 12,
                height: s.badge + 12,
                borderRadius: (s.badge + 12) / 2,
                borderColor: tierColor.primary,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
        )}

        <View
          style={[
            styles.badgeRing,
            {
              width: s.ring,
              height: s.ring,
              borderRadius: s.ring / 2,
              borderColor: borderColor,
              borderWidth: earned ? 2 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.badgeInner,
              {
                width: s.innerRing,
                height: s.innerRing,
                borderRadius: s.innerRing / 2,
              },
            ]}
          >
            {earned && orden.tier !== 'bronze' && (
              <View style={[styles.innerShine, { width: s.innerRing * 0.6, height: s.innerRing * 0.3 }]} />
            )}
            <IconComp size={s.icon} color={iconColor} />
          </LinearGradient>
        </View>

        {earned && (
          <View style={[styles.tierDot, { backgroundColor: tierColor.primary }]}>
            <View style={[styles.tierDotInner, { backgroundColor: tierColor.secondary }]} />
          </View>
        )}

        {!earned && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIcon}>
              <View style={styles.lockBody} />
              <View style={styles.lockShackle} />
            </View>
          </View>
        )}
      </View>

      {showName && (
        <View style={[styles.nameContainer, { width: s.nameWidth }]}>
          <Text
            style={[
              styles.ordenName,
              {
                fontSize: s.fontSize,
                color: earned ? tierColor.text : 'rgba(232,220,200,0.2)',
              },
            ]}
            numberOfLines={2}
          >
            {orden.name}
          </Text>
          {earned && size !== 'small' && (
            <Text style={[styles.tierLabel, { color: tierColor.text }]}>
              {TIER_NAMES[orden.tier]}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`orden-badge-${orden.id}`}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

function getGradientColors(tier: OrdenTier): [string, string] {
  switch (tier) {
    case 'bronze':
      return ['#3a2a1a', '#2a1e14'];
    case 'silber':
      return ['#2e2e32', '#222226'];
    case 'gold':
      return ['#2e2a1a', '#1e1c12'];
    case 'legendaer':
      return ['#2a2820', '#1e1c16'];
  }
}

const styles = StyleSheet.create({
  badgeOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  badgeRing: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerShine: {
    position: 'absolute',
    top: -2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 100,
    transform: [{ rotate: '-20deg' }],
  },
  tierDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#141416',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,22,0.5)',
    borderRadius: 100,
  },
  lockIcon: {
    alignItems: 'center',
  },
  lockBody: {
    width: 10,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(232,220,200,0.12)',
  },
  lockShackle: {
    width: 8,
    height: 6,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(232,220,200,0.12)',
    borderBottomWidth: 0,
    position: 'absolute',
    top: -5,
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  ordenName: {
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 14,
  },
  tierLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    marginTop: 2,
    opacity: 0.6,
  },
});

export default React.memo(OrdenBadge);
