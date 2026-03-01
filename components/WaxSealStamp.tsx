import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Stamp } from 'lucide-react-native';

interface WaxSealStampProps {
  size?: number;
  color?: 'red' | 'gold' | 'black';
  animate?: boolean;
  showShine?: boolean;
}

const SEAL_COLORS = {
  red: {
    primary: '#8B1A1A',
    secondary: '#B22222',
    highlight: '#D44040',
    dark: '#5C0E0E',
    shine: '#E86060',
    shadow: 'rgba(139,26,26,0.5)',
  },
  gold: {
    primary: '#8B7320',
    secondary: '#BFA35D',
    highlight: '#D4B86A',
    dark: '#5C4B0E',
    shine: '#E8D080',
    shadow: 'rgba(191,163,93,0.5)',
  },
  black: {
    primary: '#2A2A2E',
    secondary: '#3E3E44',
    highlight: '#555560',
    dark: '#18181C',
    shine: '#6E6E78',
    shadow: 'rgba(42,42,46,0.5)',
  },
};

function generateOrganicSealPath(cx: number, cy: number, baseRadius: number, segments: number = 48): string {
  const points: { x: number; y: number }[] = [];
  const bumpCount = 12;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const bumpPhase = Math.sin(angle * bumpCount) * (baseRadius * 0.06);
    const wobble1 = Math.sin(angle * 3.7 + 1.2) * (baseRadius * 0.03);
    const wobble2 = Math.cos(angle * 5.3 + 0.8) * (baseRadius * 0.02);
    const r = baseRadius + bumpPhase + wobble1 + wobble2;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  path += ' Z';
  return path;
}

export default function WaxSealStamp({
  size = 80,
  color = 'red',
  animate = false,
  showShine = true,
}: WaxSealStampProps) {
  const colors = SEAL_COLORS[color];
  const shineAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;

  const svgSize = size;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const baseRadius = svgSize * 0.4;
  const sealPath = generateOrganicSealPath(cx, cy, baseRadius);
  const innerRadius = baseRadius * 0.65;

  useEffect(() => {
    if (animate) {
      scaleAnim.setValue(2);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }
  }, [animate, scaleAnim]);

  useEffect(() => {
    if (showShine) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(shineAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showShine, shineAnim]);

  const shineOpacity = shineAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.35, 0.15],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: svgSize,
          height: svgSize,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.shadowLayer, {
        shadowColor: colors.shadow,
        width: svgSize,
        height: svgSize,
      }]}>
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <Defs>
            <RadialGradient id="sealGrad" cx="40%" cy="35%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={colors.highlight} />
              <Stop offset="40%" stopColor={colors.secondary} />
              <Stop offset="75%" stopColor={colors.primary} />
              <Stop offset="100%" stopColor={colors.dark} />
            </RadialGradient>
            <RadialGradient id="innerGrad" cx="45%" cy="40%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={colors.secondary} />
              <Stop offset="60%" stopColor={colors.primary} />
              <Stop offset="100%" stopColor={colors.dark} />
            </RadialGradient>
            <RadialGradient id="shineGrad" cx="30%" cy="25%" rx="60%" ry="60%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Path d={sealPath} fill="url(#sealGrad)" />

          <Circle
            cx={cx}
            cy={cy}
            r={innerRadius + 2}
            fill="none"
            stroke={colors.dark}
            strokeWidth={1.5}
            opacity={0.6}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={innerRadius}
            fill="url(#innerGrad)"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={innerRadius - 3}
            fill="none"
            stroke={colors.highlight}
            strokeWidth={0.8}
            opacity={0.3}
          />
        </Svg>

        <View style={[styles.iconContainer, {
          top: cy - size * 0.14,
          left: cx - size * 0.14,
          width: size * 0.28,
          height: size * 0.28,
        }]}>
          <Stamp size={size * 0.2} color={colors.shine} />
        </View>
      </View>

      {showShine && (
        <Animated.View
          style={[
            styles.shineOverlay,
            {
              width: svgSize,
              height: svgSize,
              opacity: shineOpacity,
            },
          ]}
        >
          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <Path d={sealPath} fill="url(#shineGrad)" />
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowLayer: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
