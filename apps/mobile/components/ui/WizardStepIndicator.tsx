/**
 * components/ui/WizardStepIndicator.tsx
 * ──────────────────────────────────────────────────────────────────
 * 4-step wizard indicator specific to the Scrap Listing Wizard.
 * 
 * States:
 * - Completed (< currentStep): Circle, teal bg, white check.
 * - Active (=== currentStep): Pill, navy bg.
 * - Pending (> currentStep): Circle, surface bg, 2px border.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/tokens';
import { Text } from './Typography';

interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  const steps = [1, 2, 3, 4];

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const isPending = step > currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step}>
            <View
              style={[
                styles.dotBase,
                isCompleted && styles.dotCompleted,
                isActive && styles.dotActive,
                isPending && styles.dotPending,
              ]}
            >
              {isCompleted && (
                <Text variant="caption" style={styles.checkText}>✓</Text>
              )}
            </View>

            {!isLast && (
              <View 
                style={[
                  styles.connector, 
                  isCompleted ? styles.connectorCompleted : styles.connectorPending
                ]} 
              />
            )}
          </React.Fragment>
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
    paddingVertical: spacing.md,
  },
  dotBase: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    width: 16,
    borderRadius: 8,
    backgroundColor: colors.teal,
  },
  checkText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12, // Exact fit
  },
  dotActive: {
    width: 32, // Pill shape
    borderRadius: 8,
    backgroundColor: colors.navy,
  },
  dotPending: {
    width: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  connector: {
    height: 1,
    width: 32,
    marginHorizontal: spacing.sm,
  },
  connectorCompleted: {
    backgroundColor: colors.teal,
    opacity: 0.5,
  },
  connectorPending: {
    backgroundColor: colors.border,
  },
});
