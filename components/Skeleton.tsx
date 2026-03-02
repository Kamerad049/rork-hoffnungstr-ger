import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle } from 'react-native';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonPulse({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: 'rgba(191,163,93,0.08)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export default React.memo(SkeletonPulse);

export const CardSkeleton = React.memo(function CardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <SkeletonPulse width="100%" height={180} borderRadius={14} />
      <View style={skeletonStyles.cardBody}>
        <SkeletonPulse width="70%" height={18} borderRadius={6} />
        <SkeletonPulse width="50%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        <SkeletonPulse width="30%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
});

export const HorizontalCardSkeleton = React.memo(function HorizontalCardSkeleton() {
  return (
    <View style={skeletonStyles.horizontalCard}>
      <SkeletonPulse width={160} height={110} borderRadius={12} />
      <View style={skeletonStyles.horizontalCardBody}>
        <SkeletonPulse width={120} height={14} borderRadius={6} />
        <SkeletonPulse width={80} height={11} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
});

export const FeedCardSkeleton = React.memo(function FeedCardSkeleton({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <View style={[skeletonStyles.feedCard, { width, height }]}>
      <View style={skeletonStyles.feedCardHeader}>
        <SkeletonPulse width={40} height={40} borderRadius={10} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <SkeletonPulse width={120} height={14} borderRadius={6} />
          <SkeletonPulse width={60} height={10} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={skeletonStyles.feedCardBottom}>
        <SkeletonPulse width={80} height={22} borderRadius={10} />
        <SkeletonPulse width="85%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
        <SkeletonPulse width="60%" height={14} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
});

export const ListItemSkeleton = React.memo(function ListItemSkeleton() {
  return (
    <View style={skeletonStyles.listItem}>
      <SkeletonPulse width={42} height={42} borderRadius={10} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <SkeletonPulse width="60%" height={15} borderRadius={6} />
        <SkeletonPulse width="40%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <SkeletonPulse width={50} height={14} borderRadius={6} />
    </View>
  );
});

export const NewsCardSkeleton = React.memo(function NewsCardSkeleton() {
  return (
    <View style={skeletonStyles.newsCard}>
      <SkeletonPulse width={110} height={110} borderRadius={14} />
      <View style={skeletonStyles.newsCardBody}>
        <SkeletonPulse width="90%" height={15} borderRadius={6} />
        <SkeletonPulse width="75%" height={15} borderRadius={6} style={{ marginTop: 6 }} />
        <SkeletonPulse width="50%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
        <SkeletonPulse width="35%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
});

export const HomeSkeleton = React.memo(function HomeSkeleton() {
  return (
    <View style={skeletonStyles.homeContainer}>
      <View style={skeletonStyles.homeHeader}>
        <View>
          <SkeletonPulse width={100} height={14} borderRadius={6} />
          <SkeletonPulse width={160} height={24} borderRadius={8} style={{ marginTop: 4 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonPulse width={40} height={40} borderRadius={20} />
          <SkeletonPulse width={100} height={40} borderRadius={20} />
        </View>
      </View>

      <SkeletonPulse width="100%" height={80} borderRadius={14} style={{ marginTop: 24 }} />

      <SkeletonPulse width={140} height={19} borderRadius={6} style={{ marginTop: 24 }} />
      <View style={skeletonStyles.horizontalRow}>
        {[0, 1, 2].map((i) => (
          <HorizontalCardSkeleton key={i} />
        ))}
      </View>

      <SkeletonPulse width={140} height={19} borderRadius={6} style={{ marginTop: 12 }} />
      <View style={skeletonStyles.horizontalRow}>
        {[0, 1, 2].map((i) => (
          <HorizontalCardSkeleton key={i} />
        ))}
      </View>

      <SkeletonPulse width={120} height={19} borderRadius={6} style={{ marginTop: 12 }} />
      {[0, 1].map((i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </View>
  );
});

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardBody: {
    padding: 14,
  },
  horizontalCard: {
    width: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  horizontalCardBody: {
    padding: 10,
  },
  feedCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 14,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedCardBottom: {
    marginTop: 'auto',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(191,163,93,0.03)',
  },
  newsCard: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  newsCardBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  homeContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 8,
  },
});
