/**
 * components/ui/StepIndicator.tsx
 * ──────────────────────────────────────────────────────────────────
 * Step indicator for multi-step flows like onboarding.
 * ──────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/tokens';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({ currentStep, totalSteps = 3 }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        return (
          <View
            key={`step-${stepNumber}`}
            style={[styles.dot, isActive && styles.activeDot]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.teal,
  },
});
