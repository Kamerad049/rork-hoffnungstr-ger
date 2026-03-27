import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface WavingFlagProps {
  width?: number;
  height?: number;
  borderRadius?: number;
}

const STRIPE_COUNT = 6;

export default function WavingFlag({ width = 18, height = 12, borderRadius = 3 }: WavingFlagProps) {
  const waveAnims = useRef(
    Array.from({ length: STRIPE_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = waveAnims.map((anim, i) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: -0.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    });

    Animated.stagger(60, animations).start();

    return () => {
      waveAnims.forEach((a) => a.stopAnimation());
    };
  }, []);

  const stripeHeight = height / 3;
  const colWidth = width / STRIPE_COUNT;

  const colors = ['#000000', '#DD0000', '#FFCC00'];

  return (
    <View style={[styles.container, { width, height, borderRadius, overflow: 'hidden' }]}>
      {colors.map((color, row) => (
        <View key={row} style={[styles.stripeRow, { height: stripeHeight }]}>
          {waveAnims.map((anim, col) => {
            const translateY = anim.interpolate({
              inputRange: [-0.5, 0, 1],
              outputRange: [0.5, 0, -1.2],
            });

            const scaleY = anim.interpolate({
              inputRange: [-0.5, 0, 1],
              outputRange: [0.92, 1, 1.1],
            });

            const opacity = anim.interpolate({
              inputRange: [-0.5, 0, 1],
              outputRange: [0.85, 1, 0.9],
            });

            const isFirst = col === 0;
            const isLast = col === STRIPE_COUNT - 1;
            const isTopRow = row === 0;
            const isBottomRow = row === 2;

            return (
              <Animated.View
                key={col}
                style={[
                  {
                    width: colWidth + 0.5,
                    height: stripeHeight,
                    backgroundColor: color,
                    transform: [{ translateY }, { scaleY }],
                    opacity,
                    borderTopLeftRadius: isFirst && isTopRow ? borderRadius : 0,
                    borderTopRightRadius: isLast && isTopRow ? borderRadius : 0,
                    borderBottomLeftRadius: isFirst && isBottomRow ? borderRadius : 0,
                    borderBottomRightRadius: isLast && isBottomRow ? borderRadius : 0,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  stripeRow: {
    flexDirection: 'row',
  },
});
