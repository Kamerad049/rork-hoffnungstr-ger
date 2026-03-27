import React from 'react';
import Svg, { Circle, Path, Line } from 'react-native-svg';

interface GenderIconProps {
  gender: 'mann' | 'frau';
  size?: number;
  color?: string;
}

export default React.memo(function GenderIcon({ gender, size = 18, color = '#BFA35D' }: GenderIconProps) {
  if (gender === 'mann') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
          cx={10}
          cy={14}
          r={6.5}
          stroke={color}
          strokeWidth={1.6}
        />
        <Circle
          cx={10}
          cy={14}
          r={5.5}
          stroke={color}
          strokeWidth={0.4}
          opacity={0.3}
        />
        <Line
          x1={15}
          y1={9}
          x2={21}
          y2={3}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Path
          d="M17 3H21V7"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M18.5 3L21 3V5.5"
          fill={color}
          opacity={0.12}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      <Circle
        cx={12}
        cy={10}
        r={6.5}
        stroke={color}
        strokeWidth={1.6}
      />
      <Circle
        cx={12}
        cy={10}
        r={5.5}
        stroke={color}
        strokeWidth={0.4}
        opacity={0.3}
      />
      <Line
        x1={12}
        y1={16.5}
        x2={12}
        y2={25}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line
        x1={8.5}
        y1={21}
        x2={15.5}
        y2={21}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
});
