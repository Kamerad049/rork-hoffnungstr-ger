import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Animated, Image } from 'react-native';
import { ThumbsUp, ThumbsDown, Send, MessageSquare, LogIn } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useReviews, useTargetReviews } from '@/hooks/useReviews';
import MonumentRatingIcon from '@/components/MonumentRatingIcon';
import BrezelRatingIcon from '@/components/BrezelRatingIcon';
import StarRating from '@/components/StarRating';
import * as Haptics from 'expo-haptics';
import type { Review } from '@/constants/types';
import { getUserById } from '@/lib/utils';

type RatingVariant = 'monument' | 'brezel';

interface ReviewSectionProps {
  targetId: string;
  targetType: 'place' | 'restaurant';
  variant?: RatingVariant;
  renderAboveForm?: () => React.ReactNode;
}

function RatingSelector({ rating, onSelect, variant, colors }: {
  rating: number;
  onSelect: (r: number) => void;
  variant: RatingVariant;
  colors: any;
}) {
  const IconComponent = variant === 'monument' ? MonumentRatingIcon : BrezelRatingIcon;

  return (
    <View style={sStyles.ratingSelector}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = i + 1;
        const selected = value <= rating;
        return (
          <Pressable
            key={i}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(value);
            }}
            hitSlop={4}
            style={sStyles.ratingIcon}
            testID={`rating-icon-${value}`}
          >
            <IconComponent
              size={32}
              color={selected ? colors.star : colors.starEmpty}
              filled={selected}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function ReviewItem({ review, colors, userId }: { review: Review; colors: any; userId: string | undefined }) {
  const { toggleThumbsUp, toggleThumbsDown } = useReviews();
  const router = useRouter();
  const variant: RatingVariant = review.targetType === 'place' ? 'monument' : 'brezel';
  const reviewUser = getUserById(review.userId);

  const userThumbedUp = userId ? review.thumbsUp.includes(userId) : false;
  const userThumbedDown = userId ? review.thumbsDown.includes(userId) : false;

  const handleThumbUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleThumbsUp(review.id);
  }, [review.id, toggleThumbsUp]);

  const handleThumbDown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleThumbsDown(review.id);
  }, [review.id, toggleThumbsDown]);

  const handleUserPress = useCallback(() => {
    if (userId && review.userId === userId) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push({ pathname: '/user-profile' as any, params: { userId: review.userId } });
    }
  }, [review.userId, userId, router]);

  const timeAgo = useCallback(() => {
    const diff = Date.now() - new Date(review.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    return new Date(review.createdAt).toLocaleDateString('de-DE');
  }, [review.createdAt])();

  return (
    <View style={[sStyles.reviewItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={sStyles.reviewHeader}>
        <Pressable onPress={handleUserPress} hitSlop={6}>
          {reviewUser?.avatarUrl ? (
            <Image source={{ uri: reviewUser.avatarUrl }} style={sStyles.avatar} />
          ) : (
            <View style={[sStyles.avatar, { backgroundColor: colors.accentLight }]}>
              <Text style={[sStyles.avatarText, { color: colors.accent }]}>
                {review.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={sStyles.reviewHeaderInfo}>
          <Pressable onPress={handleUserPress} hitSlop={6}>
            <Text style={[sStyles.reviewUserName, { color: colors.accent }]}>
              {review.userName}
            </Text>
          </Pressable>
          <Text style={[sStyles.reviewDate, { color: colors.tertiaryText }]}>{timeAgo}</Text>
        </View>
        <StarRating rating={review.rating} size={12} variant={variant} />
      </View>

      {review.comment.length > 0 && (
        <Text style={[sStyles.reviewComment, { color: colors.primaryText }]}>
          {review.comment}
        </Text>
      )}

      <View style={[sStyles.helpfulRow, { borderTopColor: colors.borderLight }]}>
        <Text style={[sStyles.helpfulLabel, { color: colors.tertiaryText }]}>
          War diese Bewertung hilfreich?
        </Text>
        <View style={sStyles.thumbsRow}>
          <Pressable
            onPress={handleThumbUp}
            style={[
              sStyles.thumbBtn,
              userThumbedUp && { backgroundColor: 'rgba(191,163,93,0.15)' },
            ]}
            hitSlop={6}
          >
            <ThumbsUp
              size={16}
              color={userThumbedUp ? colors.accent : colors.tertiaryText}
              fill={userThumbedUp ? colors.accent : 'transparent'}
            />
            {review.thumbsUp.length > 0 && (
              <Text style={[sStyles.thumbCount, { color: userThumbedUp ? colors.accent : colors.tertiaryText }]}>
                {review.thumbsUp.length}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={handleThumbDown}
            style={[
              sStyles.thumbBtn,
              userThumbedDown && { backgroundColor: 'rgba(192,96,96,0.15)' },
            ]}
            hitSlop={6}
          >
            <ThumbsDown
              size={16}
              color={userThumbedDown ? colors.red : colors.tertiaryText}
              fill={userThumbedDown ? colors.red : 'transparent'}
            />
            {review.thumbsDown.length > 0 && (
              <Text style={[sStyles.thumbCount, { color: userThumbedDown ? colors.red : colors.tertiaryText }]}>
                {review.thumbsDown.length}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default React.memo(function ReviewSection({ targetId, targetType, variant = 'brezel', renderAboveForm }: ReviewSectionProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { addReview, hasUserReviewed } = useReviews();
  const { reviews, averageRating, count } = useTargetReviews(targetId, targetType);

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);

  const alreadyReviewed = hasUserReviewed(targetId, targetType);

  const handleSubmit = useCallback(() => {
    if (selectedRating === 0) {
      Alert.alert('Bewertung fehlt', 'Bitte wähle eine Bewertung aus.');
      return;
    }
    addReview(targetId, targetType, selectedRating, comment.trim());
    setSelectedRating(0);
    setComment('');
    setShowForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Danke!', 'Deine Bewertung wurde gespeichert.');
  }, [selectedRating, comment, targetId, targetType, addReview]);

  return (
    <View style={sStyles.container}>
      <View style={sStyles.sectionHeader}>
        <MessageSquare size={20} color={colors.accent} />
        <Text style={[sStyles.sectionTitle, { color: colors.primaryText }]}>Bewertungen</Text>
        {count > 0 && (
          <View style={[sStyles.countBadge, { backgroundColor: colors.accentLight }]}>
            <Text style={[sStyles.countText, { color: colors.accent }]}>{count}</Text>
          </View>
        )}
      </View>

      {count > 0 && (
        <View style={[sStyles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={sStyles.summaryLeft}>
            <Text style={[sStyles.avgNumber, { color: colors.primaryText }]}>{averageRating}</Text>
            <Text style={[sStyles.avgLabel, { color: colors.tertiaryText }]}>von 5</Text>
          </View>
          <View style={sStyles.summaryRight}>
            <StarRating rating={averageRating} size={18} variant={variant} />
            <Text style={[sStyles.summaryCount, { color: colors.tertiaryText }]}>
              {count} Bewertung{count !== 1 ? 'en' : ''}
            </Text>
          </View>
        </View>
      )}

      {renderAboveForm && renderAboveForm()}

      {!alreadyReviewed && user && (
        <>
          {!showForm ? (
            <Pressable
              style={[sStyles.writeBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowForm(true)}
              testID="write-review-btn"
            >
              <Text style={sStyles.writeBtnText}>Bewertung abgeben</Text>
            </Pressable>
          ) : (
            <View style={[sStyles.formContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[sStyles.formTitle, { color: colors.primaryText }]}>Deine Bewertung</Text>

              <RatingSelector
                rating={selectedRating}
                onSelect={setSelectedRating}
                variant={variant}
                colors={colors}
              />

              {selectedRating > 0 && (
                <Text style={[sStyles.ratingLabel, { color: colors.accent }]}>
                  {selectedRating} von 5
                </Text>
              )}

              <TextInput
                style={[sStyles.commentInput, {
                  color: colors.primaryText,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderLight,
                }]}
                placeholder="Kommentar (optional)"
                placeholderTextColor={colors.tertiaryText}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="review-comment-input"
              />

              <View style={sStyles.formActions}>
                <Pressable
                  style={[sStyles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowForm(false);
                    setSelectedRating(0);
                    setComment('');
                  }}
                >
                  <Text style={[sStyles.cancelBtnText, { color: colors.tertiaryText }]}>Abbrechen</Text>
                </Pressable>
                <Pressable
                  style={[sStyles.submitBtn, { backgroundColor: selectedRating > 0 ? colors.accent : colors.starEmpty }]}
                  onPress={handleSubmit}
                  disabled={selectedRating === 0}
                  testID="submit-review-btn"
                >
                  <Send size={16} color="#FFFFFF" />
                  <Text style={sStyles.submitBtnText}>Abgeben</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}

      {!user && (
        <Pressable
          style={[sStyles.loginHint, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/login' as any)}
          testID="login-hint-btn"
        >
          <LogIn size={18} color={colors.accent} />
          <View style={sStyles.loginHintTextWrap}>
            <Text style={[sStyles.loginHintTitle, { color: colors.primaryText }]}>
              Anmelden um zu bewerten
            </Text>
            <Text style={[sStyles.loginHintSub, { color: colors.tertiaryText }]}>
              Nur registrierte Benutzer können Bewertungen abgeben.
            </Text>
          </View>
        </Pressable>
      )}

      {alreadyReviewed && (
        <View style={[sStyles.alreadyBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[sStyles.alreadyText, { color: colors.success }]}>
            ✓ Du hast bereits bewertet
          </Text>
        </View>
      )}

      {reviews.length > 0 ? (
        <View style={sStyles.reviewsList}>
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              colors={colors}
              userId={user?.id}
            />
          ))}
        </View>
      ) : (
        <View style={sStyles.emptyState}>
          <Text style={[sStyles.emptyText, { color: colors.tertiaryText }]}>
            Noch keine Bewertungen. Sei der Erste!
          </Text>
        </View>
      )}
    </View>
  );
});

const sStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 16,
  },
  summaryLeft: {
    alignItems: 'center',
  },
  avgNumber: {
    fontSize: 36,
    fontWeight: '800' as const,
  },
  avgLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  summaryRight: {
    flex: 1,
    gap: 6,
  },
  summaryCount: {
    fontSize: 13,
  },
  writeBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  writeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  formContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 14,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ratingIcon: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  commentInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 14,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  alreadyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  alreadyText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  helpfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  helpfulLabel: {
    fontSize: 12,
    flex: 1,
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  thumbCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  loginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  loginHintTextWrap: {
    flex: 1,
  },
  loginHintTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  loginHintSub: {
    fontSize: 13,
    marginTop: 2,
  },
});
