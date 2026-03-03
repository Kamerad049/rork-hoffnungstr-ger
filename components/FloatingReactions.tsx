import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GERMAN_COLORS = ['#000000', '#DD0000', '#FFCC00'] as const;

interface FloatingSymbol {
  id: number;
  emoji: string;
  x: number;
  anim: Animated.Value;
  colorIndex: number;
  scale: number;
  delay: number;
}

interface FloatingReactionsProps {
  emoji: string;
  trigger: number;
  originX?: number;
  originY?: number;
}

export default function FloatingReactions({ emoji, trigger, originX, originY }: FloatingReactionsProps) {
  const symbolsRef = useRef<FloatingSymbol[]>([]);
  const [symbols, setSymbols] = React.useState<FloatingSymbol[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (trigger <= 0) return;

    const currentEmoji = emoji;
    const baseX = originX ?? Dimensions.get('window').width / 2;
    const newSymbols: FloatingSymbol[] = [];

    for (let i = 0; i < 9; i++) {
      const id = counterRef.current++;
      const xSpread = (Math.random() - 0.5) * 120;
      newSymbols.push({
        id,
        emoji: currentEmoji,
        x: baseX + xSpread,
        anim: new Animated.Value(0),
        colorIndex: i % 3,
        scale: 0.7 + Math.random() * 0.6,
        delay: i * 80,
      });
    }

    symbolsRef.current = [...symbolsRef.current, ...newSymbols];
    setSymbols([...symbolsRef.current]);

    newSymbols.forEach((s) => {
      Animated.timing(s.anim, {
        toValue: 1,
        duration: 1800 + Math.random() * 600,
        delay: s.delay,
        useNativeDriver: true,
      }).start(() => {
        symbolsRef.current = symbolsRef.current.filter((sym) => sym.id !== s.id);
        setSymbols([...symbolsRef.current]);
      });
    });
  }, [trigger]);

  if (symbols.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {symbols.map((s) => {
        const translateY = s.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(SCREEN_HEIGHT * 0.5 + Math.random() * 100)],
        });
        const opacity = s.anim.interpolate({
          inputRange: [0, 0.2, 0.7, 1],
          outputRange: [0, 1, 0.8, 0],
        });
        const scale = s.anim.interpolate({
          inputRange: [0, 0.15, 0.5, 1],
          outputRange: [0.3, s.scale * 1.2, s.scale, s.scale * 0.6],
        });
        const rotate = s.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [`${(Math.random() - 0.5) * 30}deg`, `${(Math.random() - 0.5) * 60}deg`],
        });
        const wobbleX = s.anim.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 15],
        });

        const color = GERMAN_COLORS[s.colorIndex];

        return (
          <Animated.View
            key={s.id}
            style={[
              styles.floatingSymbol,
              {
                left: s.x - 20,
                bottom: originY ? SCREEN_HEIGHT - originY : 120,
                opacity,
                transform: [
                  { translateY },
                  { translateX: wobbleX },
                  { scale },
                  { rotate },
                ],
              },
            ]}
          >
            <Text style={[styles.symbolText, { textShadowColor: color }]}>
              {s.emoji}
            </Text>
            <View style={[styles.colorDot, { backgroundColor: color }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  floatingSymbol: {
    position: 'absolute',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: 32,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -2,
    opacity: 0.7,
  },
});
