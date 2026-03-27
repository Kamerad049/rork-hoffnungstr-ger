import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface BrezelRatingIconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default React.memo(function BrezelRatingIcon({ size = 16, color = '#BFA35D', filled = false }: BrezelRatingIconProps) {
  const innerColor = filled ? (color === 'transparent' ? color : '#1c1c1e') : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C12 22 12 18 12 16"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M9 16H15"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M7 12C4.5 10.5 3.5 7.5 5 5C6.5 2.5 9.5 2 12 3.5C14.5 2 17.5 2.5 19 5C20.5 7.5 19.5 10.5 17 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'transparent'}
      />
      <Path
        d="M7 12L15 6"
        stroke={innerColor}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M17 12L9 6"
        stroke={innerColor}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
});
