import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface OrthodoxCrossIconProps {
  size?: number;
  color?: string;
}

export default React.memo(function OrthodoxCrossIcon({ size = 20, color = '#BFA35D' }: OrthodoxCrossIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      <Path
        d="M12 1V27"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M7 5.5H17"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Path
        d="M5 10.5H19"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M7.5 21L16.5 18"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Path
        d="M12 1C12 1 12.7 1.3 12.7 2V26C12.7 26.7 12 27 12 27C12 27 11.3 26.7 11.3 26V2C11.3 1.3 12 1 12 1Z"
        fill={color}
        opacity={0.12}
      />
      <Path
        d="M5 10.5C5 10.5 5.3 9.9 6 9.9H18C18.7 9.9 19 10.5 19 10.5C19 10.5 18.7 11.1 18 11.1H6C5.3 11.1 5 10.5 5 10.5Z"
        fill={color}
        opacity={0.12}
      />
    </Svg>
  );
});
