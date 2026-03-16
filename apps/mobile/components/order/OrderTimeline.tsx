import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { CaretDown, CaretUp, CheckCircle, Clock, MapPin, Package, CurrencyInr } from 'phosphor-react-native';
import { Text, Numeric } from '../ui/Typography';
import { colors, spacing, radius } from '../../constants/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TimelineEvent {
  id: string;
  new_status: string;
  created_at: string;
  note?: string;
}

interface OrderTimelineProps {
  history: TimelineEvent[];
  currentStatus: string;
}

const statusMap: Record<string, string> = {
  created: 'Order Created',
  accepted: 'Aggregator Accepted',
  en_route: 'Aggregator En-route',
  arrived: 'Aggregator Arrived',
  weighing_in_progress: 'Weighing started',
  completed: 'Order Completed',
  cancelled: 'Order Cancelled',
  disputed: 'Dispute Raised',
};

// Summary steps for the collapsed bar
const STEPS = [
  { key: 'listing', label: 'Listing', statuses: ['created', 'accepted'], icon: Package },
  { key: 'en_route', label: 'En-route', statuses: ['en_route'], icon: Clock },
  { key: 'pickup', label: 'Pickup', statuses: ['arrived', 'weighing_in_progress'], icon: MapPin },
  { key: 'paid', label: 'Paid', statuses: ['completed'], icon: CurrencyInr },
];

export function OrderTimeline({ history, currentStatus }: OrderTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  if (!history || history.length === 0) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Determine current step index for the status bar
  const currentStepIndex = STEPS.findIndex(step => step.statuses.includes(currentStatus));
  const isCancelled = currentStatus === 'cancelled';
  const isDisputed = currentStatus === 'disputed';

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerToggle} onPress={toggleExpand}>
        <Text variant="subheading">Order Timeline</Text>
        <View style={styles.headerRight}>
          {expanded ? <CaretUp size={18} color={colors.navy} /> : <CaretDown size={18} color={colors.navy} />}
        </View>
      </Pressable>

      {!expanded ? (
        <View style={styles.collapsedContent}>
          <View style={styles.progressBarContainer}>
            {STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex || currentStatus === 'completed';
              const isCurrent = idx === currentStepIndex && !isCancelled && !isDisputed;
              const Icon = step.icon;

              return (
                <View key={step.key} style={styles.stepItem}>
                  <View style={styles.stepIconContainer}>
                    {idx > 0 && (
                      <View 
                        style={[
                          styles.progressLine, 
                          (isPast || isCurrent) && { backgroundColor: isPast ? colors.teal : colors.border }
                        ]} 
                      />
                    )}
                    <View 
                      style={[
                        styles.stepIconCircle,
                        isPast && styles.stepIconPast,
                        isCurrent && styles.stepIconCurrent,
                        (isCancelled || isDisputed) && { borderColor: colors.red }
                      ]}
                    >
                      {isPast ? (
                        <CheckCircle size={14} color={colors.surface} weight="fill" />
                      ) : (
                        <Icon size={14} color={isCurrent ? colors.navy : colors.muted} weight={isCurrent ? "fill" : "regular"} />
                      )}
                    </View>
                  </View>
                  <Text 
                    variant="caption" 
                    style={[
                      styles.stepLabel, 
                      isCurrent && { color: colors.navy, fontFamily: 'DMSans-SemiBold' },
                      isPast && { color: colors.teal }
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.expandedContent}>
          <View style={styles.list}>
            {[...history].reverse().map((event, index) => {
              const isLatest = index === 0;
              const date = new Date(event.created_at);
              
              const timeStr = date.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }).toUpperCase();

              const dateStr = date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.leftCol}>
                    <View style={[styles.dot, isLatest && styles.dotActive]} />
                    {index < history.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={styles.rightCol}>
                    <View style={styles.eventHeader}>
                      <Text 
                        variant="label" 
                        style={[
                          styles.statusText, 
                          isLatest ? { color: colors.navy, fontFamily: 'DMSans-SemiBold' } : { color: colors.slate }
                        ]}
                      >
                        {statusMap[event.new_status] || event.new_status}
                      </Text>
                      <Numeric size={11} color={colors.muted}>
                        {timeStr}, {dateStr}
                      </Numeric>
                    </View>
                    {event.note && (
                      <Text variant="caption" color={colors.muted} style={styles.note}>
                        {event.note}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginTop: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedContent: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  progressBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 30,
  },
  progressLine: {
    position: 'absolute',
    left: '-50%',
    right: '50%',
    top: 15,
    height: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  stepIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepIconPast: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  stepIconCurrent: {
    backgroundColor: colors.surface,
    borderColor: colors.navy,
    borderWidth: 2,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    color: colors.muted,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: colors.bg,
  },
  list: {
    padding: spacing.md,
  },
  eventRow: {
    flexDirection: 'row',
  },
  leftCol: {
    alignItems: 'center',
    width: 20,
    marginRight: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: 6,
    zIndex: 1,
  },
  dotActive: {
    backgroundColor: colors.teal,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.tealLight,
    marginTop: 5,
  },
  line: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: 4,
  },
  rightCol: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
  },
  note: {
    marginTop: 2,
  },
});
