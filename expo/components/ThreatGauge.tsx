import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ThreatGaugeProps {
  level: number;
  label: string;
  color: string;
  size?: number;
}

export default function ThreatGauge({ level, label, color, size = 120 }: ThreatGaugeProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: level,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [level, animValue]);

  const arcWidth = size;
  const arcHeight = size / 2 + 10;
  const barCount = 24;
  const startAngle = -180;
  const endAngle = 0;
  const radius = size / 2 - 8;

  const bars = Array.from({ length: barCount }, (_, i) => {
    const progress = i / (barCount - 1);
    const angle = startAngle + progress * (endAngle - startAngle);
    const rad = (angle * Math.PI) / 180;
    const cx = size / 2 + Math.cos(rad) * radius;
    const cy = size / 2 + Math.sin(rad) * radius;

    let barColor: string;
    if (progress < 0.33) barColor = '#4CAF50';
    else if (progress < 0.66) barColor = '#FF9800';
    else barColor = '#F44336';

    const isActive = progress <= level;

    return (
      <View
        key={i}
        style={[
          styles.bar,
          {
            left: cx - 3,
            top: cy - 8,
            backgroundColor: isActive ? barColor : 'rgba(255,255,255,0.08)',
            transform: [{ rotate: `${angle + 90}deg` }],
            opacity: isActive ? 1 : 0.3,
          },
        ]}
      />
    );
  });

  const needleAngle = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <View style={[styles.container, { width: arcWidth, height: arcHeight }]}>
      <View style={[styles.arcWrap, { width: arcWidth, height: size }]}>
        {bars}
        <Animated.View
          style={[
            styles.needle,
            {
              left: size / 2 - 2,
              top: size / 2 - 2,
              width: radius - 10,
              transform: [
                { translateX: -(radius - 10) / 2 },
                { rotate: needleAngle },
                { translateX: (radius - 10) / 2 },
              ],
            },
          ]}
        >
          <View style={[styles.needleBar, { backgroundColor: color }]} />
        </Animated.View>
        <View style={[styles.centerDot, { left: size / 2 - 6, top: size / 2 - 6, backgroundColor: color }]} />
      </View>
      <View style={styles.labelWrap}>
        <Text style={[styles.levelText, { color }]}>{label}</Text>
        <Text style={styles.percentText}>{Math.round(level * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  arcWrap: {
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    width: 6,
    height: 16,
    borderRadius: 3,
  },
  needle: {
    position: 'absolute',
    height: 4,
    justifyContent: 'center',
  },
  needleBar: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
  },
  centerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  labelWrap: {
    alignItems: 'center',
    marginTop: -8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  percentText: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 2,
  },
});
