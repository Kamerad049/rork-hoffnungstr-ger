import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, Pressable, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame, Flag, MessageCircle, Swords, Users, Heart, MapPin, Map,
  Globe, Feather, ScrollText, Gem, Crown, Bird, Sunrise, Moon,
  Compass, Zap, Landmark, UtensilsCrossed, Sparkles, Star, Shield, X,
} from 'lucide-react-native';
import { TIER_COLORS, TIER_NAMES, type OrdenDefinition } from '@/constants/orden';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Flame, Flag, MessageCircle, Swords, Users, Heart, MapPin, Map,
  Globe, Feather, ScrollText, Gem, Crown, Bird, Sunrise, Moon,
  Compass, Zap, Landmark, UtensilsCrossed, Sparkles, Star, Shield,
};

interface OrdenCeremonyProps {
  visible: boolean;
  orden: OrdenDefinition | null;
  onClose: () => void;
}

const NUM_PARTICLES = 24;
const NUM_RAYS = 12;

export default function OrdenCeremony({ visible, orden, onClose }: OrdenCeremonyProps) {
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const medalScale = useRef(new Animated.Value(0)).current;
  const medalRotate = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const ribbonAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: NUM_PARTICLES }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  const rayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && orden) {
      overlayAnim.setValue(0);
      medalScale.setValue(0);
      medalRotate.setValue(0);
      glowAnim.setValue(0);
      textAnim.setValue(0);
      ribbonAnim.setValue(0);
      btnAnim.setValue(0);
      rayAnim.setValue(0);
      particleAnims.forEach(p => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Animated.sequence([
        Animated.timing(overlayAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(medalScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
          Animated.timing(medalRotate, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(rayAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ...particleAnims.map((p, i) => {
            const angle = (i / NUM_PARTICLES) * Math.PI * 2;
            const dist = 80 + Math.random() * 60;
            return Animated.parallel([
              Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 700 + Math.random() * 300, useNativeDriver: true }),
              Animated.timing(p.y, { toValue: Math.sin(angle) * dist - 40, duration: 700 + Math.random() * 300, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
              ]),
              Animated.timing(p.scale, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]);
          }),
        ]),
        Animated.stagger(100, [
          Animated.timing(ribbonAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(textAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(btnAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          ])
        ).start();
      });
    }
  }, [visible, orden]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(medalScale, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, overlayAnim, medalScale]);

  if (!orden) return null;

  const tierColor = TIER_COLORS[orden.tier];
  const IconComp = ICON_MAP[orden.icon] ?? Shield;

  const medalRotateVal = medalRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <View style={styles.centerContent}>
          {Array.from({ length: NUM_RAYS }).map((_, i) => {
            const angle = (i / NUM_RAYS) * 360;
            return (
              <Animated.View
                key={`ray-${i}`}
                style={[
                  styles.ray,
                  {
                    backgroundColor: tierColor.primary,
                    opacity: rayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.06 + (i % 3) * 0.02] }),
                    transform: [
                      { rotate: `${angle}deg` },
                      { scaleY: rayAnim },
                    ],
                  },
                ]}
              />
            );
          })}

          {particleAnims.map((p, i) => (
            <Animated.View
              key={`particle-${i}`}
              style={[
                styles.particle,
                {
                  backgroundColor: i % 3 === 0 ? tierColor.primary : i % 3 === 1 ? tierColor.secondary : '#E8DCC8',
                  width: 3 + (i % 4) * 2,
                  height: 3 + (i % 4) * 2,
                  borderRadius: 4,
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { scale: p.scale },
                  ],
                },
              ]}
            />
          ))}

          <Animated.View
            style={[
              styles.glowCircle,
              {
                backgroundColor: tierColor.primary,
                opacity: Animated.multiply(glowAnim, new Animated.Value(0.15)),
                transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.3] }) }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.medalContainer,
              {
                transform: [
                  { scale: medalScale },
                  { rotate: medalRotateVal },
                ],
              },
            ]}
          >
            <View style={[styles.medalOuter, { borderColor: tierColor.border }]}>
              <LinearGradient
                colors={getMedalGradient(orden.tier)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.medalInner}
              >
                <View style={[styles.medalShine, { backgroundColor: `${tierColor.primary}15` }]} />
                <View style={[styles.medalInnerRing, { borderColor: `${tierColor.primary}40` }]}>
                  <IconComp size={48} color={tierColor.primary} />
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.View style={[styles.ribbonRow, { opacity: ribbonAnim, transform: [{ translateY: ribbonAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View style={[styles.ribbon, { backgroundColor: tierColor.bg, borderColor: tierColor.border }]}>
              <Text style={[styles.ribbonText, { color: tierColor.primary }]}>
                {TIER_NAMES[orden.tier].toUpperCase()}
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.textBlock, { opacity: textAnim, transform: [{ translateY: textAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <Text style={styles.ceremonyTitle}>Orden verliehen!</Text>
            <Text style={[styles.ordenNameText, { color: tierColor.primary }]}>{orden.name}</Text>
            <Text style={styles.ordenDesc}>{orden.description}</Text>
            <View style={styles.xpPill}>
              <Zap size={14} color="#FFD700" />
              <Text style={styles.xpText}>+{orden.epReward} EP</Text>
            </View>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
            <Pressable
              style={[styles.closeBtn, { borderColor: tierColor.border }]}
              onPress={handleClose}
              testID="ceremony-close-btn"
            >
              <Text style={[styles.closeBtnText, { color: tierColor.primary }]}>Orden annehmen</Text>
            </Pressable>
          </Animated.View>
        </View>

        <Pressable style={styles.dismissX} onPress={handleClose} hitSlop={20}>
          <X size={24} color="rgba(232,220,200,0.4)" />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function getMedalGradient(tier: string): [string, string, ...string[]] {
  switch (tier) {
    case 'bronze': return ['#4a3520', '#3a2818', '#2a1c10'];
    case 'silber': return ['#3a3a40', '#2e2e34', '#222228'];
    case 'gold': return ['#3a3420', '#2e2a18', '#221e10'];
    case 'legendaer': return ['#302c20', '#28261c', '#1e1c16'];
    default: return ['#2a2a2e', '#1e1e20', '#161618'];
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,8,10,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 2,
    height: SCREEN_HEIGHT * 0.5,
    transformOrigin: 'bottom',
    bottom: 0,
  },
  particle: {
    position: 'absolute',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  medalContainer: {
    marginBottom: 20,
  },
  medalOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  medalInner: {
    flex: 1,
    borderRadius: 67,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  medalShine: {
    position: 'absolute',
    top: -20,
    left: -10,
    width: 100,
    height: 60,
    borderRadius: 50,
    transform: [{ rotate: '-25deg' }],
  },
  medalInnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonRow: {
    marginBottom: 16,
  },
  ribbon: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  ribbonText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 3,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  ceremonyTitle: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ordenNameText: {
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  ordenDesc: {
    color: 'rgba(232,220,200,0.55)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  xpText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  closeBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: 'rgba(191,163,93,0.06)',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dismissX: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
});
