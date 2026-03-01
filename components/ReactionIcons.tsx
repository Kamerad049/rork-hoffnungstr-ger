import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface ReactionIconProps {
  size?: number;
  color?: string;
  fill?: string;
}

export function LaurelWreathIcon({ size = 24 }: ReactionIconProps) {
  return (
    <Text style={[styles.emoji, { fontSize: size * 0.85, lineHeight: size }]}>
      🏆
    </Text>
  );
}

export function ArmWrestlingIcon({ size = 24 }: ReactionIconProps) {
  return (
    <Text style={[styles.emoji, { fontSize: size * 0.85, lineHeight: size }]}>
      🤝
    </Text>
  );
}

export function RaisedFistIcon({ size = 24 }: ReactionIconProps) {
  return (
    <Text style={[styles.emoji, { fontSize: size * 0.85, lineHeight: size }]}>
      ✊
    </Text>
  );
}

export function CrossedSwordsIcon({ size = 24 }: ReactionIconProps) {
  return (
    <Text style={[styles.emoji, { fontSize: size * 0.85, lineHeight: size }]}>
      ⚔️
    </Text>
  );
}

export function FlameIcon({ size = 24 }: ReactionIconProps) {
  return (
    <Text style={[styles.emoji, { fontSize: size * 0.85, lineHeight: size }]}>
      🔥
    </Text>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center' as const,
  },
});
