import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, ImageOff } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { NewsArticle } from '@/constants/types';

interface NewsCardProps {
  article: NewsArticle;
  onPress?: (article: NewsArticle) => void;
  compact?: boolean;
}

export default React.memo(function NewsCard({ article, onPress, compact = false }: NewsCardProps) {
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.(article);
  }, [article, onPress, scaleAnim]);

  const formattedDate = new Date(article.publishDate).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (compact) {
    return (
      <Pressable onPress={handlePress} testID={`news-card-compact-${article.id}`}>
        <Animated.View style={[styles.compactCard, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
          {article.image ? (
            <Image source={{ uri: article.image }} style={styles.compactImage} contentFit="cover" />
          ) : (
            <View style={[styles.compactImage, styles.placeholderImage, { backgroundColor: colors.surfaceSecondary }]}>
              <ImageOff size={28} color={colors.tertiaryText} />
              <Text style={[styles.placeholderText, { color: colors.tertiaryText }]}>Bild folgt</Text>
            </View>
          )}
          <View style={styles.compactInfo}>
            <Text style={[styles.compactTitle, { color: colors.primaryText }]} numberOfLines={2}>
              {article.title}
            </Text>
            <Text style={[styles.compactDate, { color: colors.tertiaryText }]}>{formattedDate}</Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} testID={`news-card-${article.id}`}>
      <Animated.View style={[styles.card, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
        {article.image ? (
          <Image source={{ uri: article.image }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholderImage, { backgroundColor: colors.surfaceSecondary }]}>
            <ImageOff size={24} color={colors.tertiaryText} />
            <Text style={[styles.placeholderSmallText, { color: colors.tertiaryText }]}>Bild folgt</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={2}>
            {article.title}
          </Text>
          <Text style={[styles.preview, { color: colors.secondaryText }]} numberOfLines={2}>
            {article.text}
          </Text>
          <View style={styles.metaRow}>
            <Calendar size={12} color={colors.tertiaryText} />
            <Text style={[styles.metaText, { color: colors.tertiaryText }]}>
              {formattedDate} · {article.author}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  image: {
    width: 110,
    height: 110,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  preview: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
  },
  compactCard: {
    width: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  compactImage: {
    width: 220,
    height: 120,
  },
  compactInfo: {
    padding: 10,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    marginBottom: 4,
  },
  compactDate: {
    fontSize: 11,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  placeholderSmallText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
});
