import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { CHARACTER_DIMENSIONS } from '@/constants/orden';

interface RadarChartProps {
  values: number[];
  size?: number;
  animate?: boolean;
}

const LEVELS = 5;

function RadarChart({ values, size = 220, animate = true }: RadarChartProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;

  const dims = CHARACTER_DIMENSIONS;
  const numAxes = dims.length;
  const center = size / 2;
  const maxRadius = (size / 2) - 30;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animate]);

  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelPos = (index: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = maxRadius + 18;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridPolygons = Array.from({ length: LEVELS }, (_, level) => {
    const ratio = (level + 1) / LEVELS;
    const pts = Array.from({ length: numAxes }, (__, i) => {
      const p = getPoint(i, ratio * 100);
      return `${p.x},${p.y}`;
    }).join(' ');
    return pts;
  });

  const dataPoints = values.map((v, i) => getPoint(i, Math.min(v, 100)));
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const axisLines = Array.from({ length: numAxes }, (_, i) => {
    const end = getPoint(i, 100);
    return { x1: center, y1: center, x2: end.x, y2: end.y };
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Svg width={size} height={size}>
        {gridPolygons.map((pts, i) => (
          <Polygon
            key={`grid-${i}`}
            points={pts}
            fill="none"
            stroke={`rgba(191,163,93,${0.04 + i * 0.02})`}
            strokeWidth={1}
          />
        ))}

        {axisLines.map((line, i) => (
          <Line
            key={`axis-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(191,163,93,0.08)"
            strokeWidth={1}
          />
        ))}

        <Polygon
          points={dataPolygon}
          fill="rgba(191,163,93,0.12)"
          stroke="#BFA35D"
          strokeWidth={2}
        />

        {dataPoints.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={dims[i].color}
            stroke="#141416"
            strokeWidth={2}
          />
        ))}

        {dims.map((dim, i) => {
          const pos = getLabelPos(i);
          return (
            <SvgText
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              fill="rgba(232,220,200,0.55)"
              fontSize={9}
              fontWeight="600"
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {dim.label}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legendRow}>
        {dims.map((dim, i) => (
          <View key={dim.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: dim.color }]} />
            <Text style={styles.legendValue}>{values[i] ?? 0}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendValue: {
    color: 'rgba(232,220,200,0.5)',
    fontSize: 11,
    fontWeight: '700' as const,
  },
});

export default React.memo(RadarChart);
