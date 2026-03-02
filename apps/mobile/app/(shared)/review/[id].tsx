/**
 * app/(shared)/review/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * S28 Rate & Review Screen
 *
 * Dedicated stack screen for submitting a rating and review for an
 * aggregator after a completed pickup.
 *
 * Navigation:
 *   - Pushed from: (shared)/receipt/[id].tsx
 *   - Submitting returns to: (seller)/home via router.replace
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, colorExtended, spacing, radius } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Very Good',
  5: 'Excellent',
};

const CHIP_OPTIONS = ['On time', 'Fair weighing', 'Friendly', 'Quick'];

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Use matching default states from HTML spec
  const [rating, setRating] = useState<number>(4);
  const [activeChips, setActiveChips] = useState<string[]>(['On time', 'Fair weighing']);
  const [reviewText, setReviewText] = useState('');

  const toggleChip = (chip: string) => {
    setActiveChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSubmit = () => {
    console.log({ rating, chips: activeChips, review: reviewText });
    router.replace('/(seller)/home' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavBar variant="light" title="Rate & Review" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1 — Aggregator identity header */}
        <View style={styles.headerSection}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarInitial} variant="heading">K</Text>
          </View>
          <Text variant="body" style={styles.aggregatorName}>
            Kumar Scrap Co.
          </Text>
          <Text variant="caption" style={styles.subtitle}>
            Picked up · Tue, Mar 4
          </Text>
        </View>

        {/* Section 2 — Star rating card */}
        <View style={styles.card}>
          <Text variant="caption" style={styles.cardLabel}>
            How was your experience?
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                hitSlop={8}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                style={styles.starTapArea}
              >
                <Text
                  style={[
                    styles.star,
                    { color: star <= rating ? colors.amber : colors.border },
                  ] as any}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <Text variant="body" style={styles.ratingText}>
            {rating > 0 ? RATING_LABELS[rating] : 'Select a rating'}
          </Text>
        </View>

        {/* Section 3 — "What went well?" chips */}
        <View style={styles.chipsSection}>
          <Text variant="caption" style={styles.sectionTitle}>
            What went well?
          </Text>
          <View style={styles.chipsContainer}>
            {CHIP_OPTIONS.map((chip) => {
              const isActive = activeChips.includes(chip);
              return (
                <Pressable
                  key={chip}
                  onPress={() => toggleChip(chip)}
                  style={[
                    styles.chip,
                    isActive ? styles.chipActive : styles.chipInactive,
                  ]}
                  accessible
                  accessibilityRole="button"
                >
                  <Text
                    variant="caption"
                    style={[
                      styles.chipText,
                      isActive ? styles.chipTextActive : styles.chipTextInactive,
                    ] as any}
                  >
                    {isActive ? `${chip} ✓` : chip}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 4 — Written review input */}
        <View style={styles.reviewSection}>
          <View style={styles.reviewLabelRow}>
            <Text variant="caption" style={styles.sectionTitle}>
              Write a review
            </Text>
            <Text variant="caption" style={styles.optionalText}>
              {' '}(optional)
            </Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Share details..."
            placeholderTextColor={colors.muted}
            multiline
            value={reviewText}
            onChangeText={setReviewText}
            accessible
            accessibilityLabel="Write a review"
          />
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          label="Submit Review"
          onPress={handleSubmit}
          disabled={rating === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  
  // Section 1
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    color: colors.surface,
    fontSize: 24,
    fontFamily: 'DMSans-Bold',
  },
  aggregatorName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Section 2
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  starTapArea: {
    // Ensuring touch target is at least 48dp by padding the text element or setting min dimensions
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 36,
  },
  ratingText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    color: colors.navy,
    marginTop: 10,
  },

  // Section 3
  chipsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
    color: colors.navy,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // ensure min height is ~48dp per guidelines
    minHeight: 48,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  chipInactive: {
    backgroundColor: colorExtended.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.surface,
  },
  chipTextInactive: {
    color: colors.slate,
  },

  // Section 4
  reviewSection: {
    marginTop: 20,
  },
  reviewLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  optionalText: {
    fontSize: 11,
    color: colors.muted,
  },
  textInput: {
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.navy,
    backgroundColor: colorExtended.surface2,
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
  },
});
