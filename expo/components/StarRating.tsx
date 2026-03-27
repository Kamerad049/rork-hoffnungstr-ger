import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import BrezelRatingIcon from './BrezelRatingIcon';
import MonumentRatingIcon from './MonumentRatingIcon';

type RatingVariant = 'brezel' | 'monument';

interface StarRatingProps {
  rating: number;
  size?: number;
  maxStars?: number;
  variant?: RatingVariant;
}

export default React.memo(function StarRating({ rating, size = 14, maxStars = 5, variant = 'brezel' }: StarRatingProps) {
  const { colors } = useTheme();
  const IconComponent = variant === 'monument' ? MonumentRatingIcon : BrezelRatingIcon;

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => (
        <View key={i} style={styles.icon}>
          <IconComponent
            size={size}
            color={i < Math.round(rating) ? colors.star : colors.starEmpty}
            filled={i < Math.round(rating)}
          />
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 2,
  },
});
