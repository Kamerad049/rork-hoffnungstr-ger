import React from 'react';
import { View, StyleSheet } from 'react-native';

interface StoryRingProps {
  size: number;
  ringWidth?: number;
  children: React.ReactNode;
  hasUnviewed?: boolean;
  maskColor?: string;
}

export default function StoryRing({ size, children, hasUnviewed = false }: StoryRingProps) {
  const borderRadius = Math.round(size * 0.22);

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: hasUnviewed ? 'rgba(191,163,93,0.45)' : 'rgba(191,163,93,0.15)',
          borderWidth: hasUnviewed ? 2 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: size - 4,
            height: size - 4,
            borderRadius: Math.round((size - 4) * 0.22),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
