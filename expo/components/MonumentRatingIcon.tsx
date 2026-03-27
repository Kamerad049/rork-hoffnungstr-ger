import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface MonumentRatingIconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default React.memo(function MonumentRatingIcon({ size = 16, color = '#BFA35D', filled = false }: MonumentRatingIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21H21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Rect
        x={3}
        y={19}
        width={18}
        height={2}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        fill={filled ? color : 'transparent'}
      />
      <Path
        d="M5 19V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9 19V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M15 19V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M19 19V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M2 10L12 4L22 10H2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'transparent'}
      />
    </Svg>
  );
});
