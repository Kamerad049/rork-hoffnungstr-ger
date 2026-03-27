import React, { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Animated } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { BUNDESLAENDER, MAP_VIEWBOX } from '@/constants/germany_map_data';

interface GermanyMapProps {
  activitiesByBundesland: Record<string, number>;
  onBundeslandPress?: (name: string) => void;
  selectedBundesland?: string | null;
  width?: number;
  height?: number;
}

const SVG_WIDTH = 586;
const SVG_HEIGHT = 793;

function PulsingDot({ cx, cy, count, isSelected }: { cx: number; cy: number; count: number; isSelected: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [count]);

  if (!count || count === 0) return null;

  const size = Math.min(6 + count * 1.5, 14);

  return (
    <G>
      <Circle
        cx={cx}
        cy={cy}
        r={size + 4}
        fill={isSelected ? 'rgba(191,163,93,0.25)' : 'rgba(191,163,93,0.12)'}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={size}
        fill={isSelected ? '#BFA35D' : '#8B7535'}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={size - 3}
        fill={isSelected ? '#E8DCC8' : '#BFA35D'}
      />
    </G>
  );
}

export default React.memo(function GermanyMap({
  activitiesByBundesland,
  onBundeslandPress,
  selectedBundesland,
  width = 320,
  height = 430,
}: GermanyMapProps) {
  const handlePress = useCallback((name: string) => {
    console.log('[MAP] Bundesland pressed:', name);
    onBundeslandPress?.(name);
  }, [onBundeslandPress]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={MAP_VIEWBOX}>
        {BUNDESLAENDER.map(bl => {
          const isSelected = selectedBundesland === bl.name;
          const hasActivity = (activitiesByBundesland[bl.name] ?? 0) > 0;
          const count = activitiesByBundesland[bl.name] ?? 0;

          return (
            <G key={bl.id}>
              <Path
                d={bl.path}
                fill={
                  isSelected
                    ? 'rgba(191,163,93,0.25)'
                    : hasActivity
                    ? 'rgba(191,163,93,0.08)'
                    : 'rgba(42,42,46,0.6)'
                }
                stroke={
                  isSelected
                    ? '#BFA35D'
                    : hasActivity
                    ? 'rgba(191,163,93,0.3)'
                    : 'rgba(191,163,93,0.15)'
                }
                strokeWidth={isSelected ? 2.5 : 1}
                strokeLinejoin="round"
                onPress={() => handlePress(bl.name)}
              />
              <PulsingDot
                cx={bl.labelX}
                cy={bl.labelY}
                count={count}
                isSelected={isSelected}
              />
            </G>
          );
        })}
      </Svg>

      {BUNDESLAENDER.map(bl => {
        const count = activitiesByBundesland[bl.name] ?? 0;
        if (count === 0) return null;
        const isSelected = selectedBundesland === bl.name;

        const xRatio = bl.labelX / SVG_WIDTH;
        const yRatio = bl.labelY / SVG_HEIGHT;

        return (
          <Pressable
            key={`label-${bl.id}`}
            style={[
              styles.countBadge,
              {
                left: xRatio * width - 10,
                top: yRatio * height - 10,
              },
              isSelected && styles.countBadgeSelected,
            ]}
            onPress={() => handlePress(bl.name)}
            hitSlop={12}
          >
            <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative' as const,
    alignSelf: 'center' as const,
  },
  countBadge: {
    position: 'absolute' as const,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(139,117,53,0.9)',
    paddingHorizontal: 4,
  },
  countBadgeSelected: {
    backgroundColor: '#BFA35D',
    transform: [{ scale: 1.15 }],
  },
  countText: {
    color: '#E8DCC8',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  countTextSelected: {
    color: '#1c1c1e',
  },
});
