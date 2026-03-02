import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/tokens';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color:    string;
}

/**
 * ProgressBar Component
 * ──────────────────────────────────────────────────────────────────
 * Thin linear progress bar for onboarding wizard steps.
 * ──────────────────────────────────────────────────────────────────
 */
export function ProgressBar({ progress, color }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.fill, 
          { 
            width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, 
            backgroundColor: color 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
