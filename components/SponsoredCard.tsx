import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExternalLink, Megaphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import OptimizedImage from '@/components/OptimizedImage';
import type { Promotion, Sponsor } from '@/constants/types';

const MIN_VIEW_DURATION_MS = 1000;

interface SponsoredCardProps {
  promotion: Promotion;
  sponsor: Sponsor | undefined;
  cardWidth: number;
  cardHeight: number;
  isVisible: boolean;
  onImpression: (promotionId: string, durationMs: number) => void;
  onClick: (promotionId: string) => void;
}

function SponsoredCardInner({
  promotion,
  sponsor,
  cardWidth,
  cardHeight,
  isVisible,
  onImpression,
  onClick,
}: SponsoredCardProps) {
  const visibleSince = useRef<number | null>(null);
  const impressionFired = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [, setImageLoaded] = useState<boolean>(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isVisible) {
      if (visibleSince.current === null) {
        visibleSince.current = Date.now();
        console.log('[SPONSORED] Card became visible:', promotion.id);
      }

      if (!impressionFired.current) {
        timerRef.current = setTimeout(() => {
          if (visibleSince.current !== null) {
            const duration = Date.now() - visibleSince.current;
            if (duration >= MIN_VIEW_DURATION_MS) {
              console.log('[SPONSORED] Impression fired:', promotion.id, 'duration:', duration);
              onImpression(promotion.id, duration);
              impressionFired.current = true;
            }
          }
        }, MIN_VIEW_DURATION_MS);
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      visibleSince.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVisible, promotion.id, onImpression]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClick(promotion.id);
    if (promotion.ctaUrl) {
      Linking.openURL(promotion.ctaUrl).catch((err) =>
        console.log('[SPONSORED] URL open error:', err),
      );
    }
  }, [promotion.id, promotion.ctaUrl, onClick]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [pressAnim]);

  const hasMedia = !!promotion.mediaUrl;
  const sponsorName = sponsor?.name ?? 'Gesponsert';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          opacity: fadeAnim,
          transform: [{ scale: pressAnim }],
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`sponsored-card-${promotion.id}`}
      >
        {hasMedia ? (
          <>
            <OptimizedImage
              source={{ uri: promotion.mediaUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              variant="dark"
              onLoad={() => setImageLoaded(true)}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
              locations={[0, 0.25, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <LinearGradient
            colors={['#1a1710', '#14120f', '#0f0e0b']}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.noMediaPattern}>
              {[...Array(10)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.patternLine,
                    {
                      top: 20 + i * 40,
                      opacity: 0.03 + i * 0.004,
                      transform: [{ rotate: '-10deg' }],
                    },
                  ]}
                />
              ))}
            </View>
          </LinearGradient>
        )}

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topRow}>
            <View style={styles.sponsorBadge}>
              <Megaphone size={11} color="#BFA35D" />
              <Text style={styles.sponsorBadgeText}>Gesponsert</Text>
            </View>
            {sponsor?.logoUrl ? (
              <View style={styles.sponsorLogoWrap}>
                <OptimizedImage
                  source={{ uri: sponsor.logoUrl }}
                  style={styles.sponsorLogo}
                  contentFit="contain"
                  variant="dark"
                />
              </View>
            ) : null}
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.sponsorName}>{sponsorName}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {promotion.title}
            </Text>
            {promotion.content.length > 0 && (
              <Text style={styles.content} numberOfLines={3}>
                {promotion.content}
              </Text>
            )}
            {promotion.ctaLabel.length > 0 && (
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>{promotion.ctaLabel}</Text>
                <ExternalLink size={14} color="#1c1c1e" />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(SponsoredCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0f0e0b',
    position: 'relative' as const,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(15,14,11,0.75)',
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  sponsorBadgeText: {
    color: '#BFA35D',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  sponsorLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sponsorLogo: {
    width: 36,
    height: 36,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  sponsorName: {
    color: 'rgba(191,163,93,0.7)',
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  title: {
    color: '#E8DCC8',
    fontSize: 20,
    fontWeight: '800' as const,
    lineHeight: 26,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  content: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#BFA35D',
  },
  ctaText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  noMediaPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternLine: {
    position: 'absolute' as const,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
});
