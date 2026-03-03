import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface ReactionIconProps {
  size?: number;
  color?: string;
  fill?: string;
}

export function RespektIcon({ size = 24, color = '#BFA35D', fill = 'none' }: ReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 7v6c0 5.25 3.4 10.15 8 11.25C16.6 23.15 20 18.25 20 13V7l-8-5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={fill}
      />
      <Path
        d="M12 7v5l3 2.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 14.5l3-2.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AnerkennungIcon({ size = 24, color = '#BFA35D', fill = 'none' }: ReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17l-5.8 2.9 1.1-6.47L2.6 8.85l6.5-.95L12 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={fill}
      />
      <Circle cx={12} cy={11} r={2.5} stroke={color} strokeWidth={1.2} fill={fill} />
    </Svg>
  );
}

export function ZuspruchIcon({ size = 24, color = '#BFA35D', fill = 'none' }: ReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 20V11c0-2.8 2.2-5 5-5s5 2.2 5 5v1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M17 12v-1c0-.6.4-1 1-1h1.5c.8 0 1.5.7 1.5 1.5v0c0 .8-.7 1.5-1.5 1.5H17"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 11H5.5C4.7 11 4 11.7 4 12.5v0C4 13.3 4.7 14 5.5 14H7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 20h6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 6V3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 14v3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx={10} cy={11} r={0.8} fill={color} />
      <Circle cx={14} cy={11} r={0.8} fill={color} />
    </Svg>
  );
}

export function VerbundenheitIcon({ size = 24, color = '#BFA35D', fill = 'none' }: ReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12.5c0-1 .8-2 2-2h2l2.5 2 2-2h1c1.2 0 2 1 2 2v0c0 .5-.2 1-.5 1.3L8 17.5l-5-3.7c-.3-.3-.5-.8-.5-1.3z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={fill}
      />
      <Path
        d="M21.5 12.5c0-1-.8-2-2-2h-2l-2.5 2-2-2h-1c-1.2 0-2 1-2 2v0c0 .5.2 1 .5 1.3L16 17.5l5-3.7c.3-.3.5-.8.5-1.3z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={fill}
      />
      <Path
        d="M8 10.5V8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function EhreIcon({ size = 24, color = '#BFA35D', fill = 'none' }: ReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G>
        <Path
          d="M5 20c0-4 1.5-7 3-9.5C9.5 8 10 6 9.5 4c-.1-.5.1-1 .5-1h0"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill={fill}
        />
        <Path
          d="M19 20c0-4-1.5-7-3-9.5C14.5 8 14 6 14.5 4c.1-.5-.1-1-.5-1h0"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill={fill}
        />
        <Path
          d="M7 16c1-.8 2.5-1.2 5-1.2s4 .4 5 1.2"
          stroke={color}
          strokeWidth={1.4}
          strokeLinecap="round"
          fill={fill}
        />
        <Path
          d="M6.5 12.5c.8-.6 2-1 3-1.2"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <Path
          d="M17.5 12.5c-.8-.6-2-1-3-1.2"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <Path
          d="M8 8.5c.5-.3 1.2-.6 2-.8"
          stroke={color}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        <Path
          d="M16 8.5c-.5-.3-1.2-.6-2-.8"
          stroke={color}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        <Circle cx={12} cy={3} r={1.2} stroke={color} strokeWidth={1.3} fill={fill} />
        <Path
          d="M4 20h16"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
