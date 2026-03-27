import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface LatinCrossIconProps {
  size?: number;
  color?: string;
}

export default React.memo(function LatinCrossIcon({ size = 20, color = '#BFA35D' }: LatinCrossIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2V22"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M6 8H18"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M12 2C12 2 12.8 2.4 12.8 3V21C12.8 21.6 12 22 12 22C12 22 11.2 21.6 11.2 21V3C11.2 2.4 12 2 12 2Z"
        fill={color}
        opacity={0.15}
      />
      <Path
        d="M6 8C6 8 6.3 7.3 7 7.3H17C17.7 7.3 18 8 18 8C18 8 17.7 8.7 17 8.7H7C6.3 8.7 6 8 6 8Z"
        fill={color}
        opacity={0.15}
      />
      <Path
        d="M10.5 1.5L12 0.8L13.5 1.5V3L12 3.5L10.5 3V1.5Z"
        fill={color}
        opacity={0.25}
        transform="translate(0, 1.2) scale(0.9)"
      />
    </Svg>
  );
});
