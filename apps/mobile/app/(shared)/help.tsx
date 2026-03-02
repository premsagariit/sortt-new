import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatCircleDots, Phone, EnvelopeSimple, CaretDown, CaretUp } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { Text } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';

// Mock FAQs
const FAQS = [
  {
    id: 'f1',
    question: 'How are prices calculated?',
    answer: 'Market rates are updated daily based on real-time commodity indices. Final rates may vary slightly depending on your aggregator\'s visual inspection of the scrap quality.',
  },
  {
    id: 'f2',
    question: 'Do you charge a pickup fee?',
    answer: 'No, all pickups scheduled through Sortt are 100% free for Sellers. You get paid the full value of your scrap.',
  },
  {
    id: 'f3',
    question: 'What if an aggregator doesn\'t arrive?',
    answer: 'If an aggregator misses a scheduled window, the system automatically redirects your order to the next closest verified partner in your area.',
  },
  {
    id: 'f4',
    question: 'How do I get paid?',
    answer: 'Aggregators currently pay via cash or UPI exactly at the time of pickup verification in front of you. Secure wallet payments are coming soon!',
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>('f1');

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        title="Help & Support"
        variant="light"
        onBack={() => safeBack()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contactCard}>
          <Text variant="subheading" color={colors.navy} style={{ marginBottom: spacing.xs }}>
            Need immediate help?
          </Text>
          <Text variant="caption" color={colors.muted} style={{ marginBottom: spacing.lg }}>
            Our support team is available Mon-Sat, 9AM to 7PM.
          </Text>

          <View style={styles.contactActions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Chat with Us"
                onPress={() => console.log('Chat support')}
              />
            </View>
            <View style={styles.iconBtnCtn}>
              <Pressable style={styles.circleBtn} onPress={() => console.log('Call support')}>
                <Phone color={colors.navy} weight="fill" size={20} />
              </Pressable>
            </View>
            <View style={styles.iconBtnCtn}>
              <Pressable style={styles.circleBtn} onPress={() => console.log('Email support')}>
                <EnvelopeSimple color={colors.navy} weight="fill" size={20} />
              </Pressable>
            </View>
          </View>
        </View>

        <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>
          FREQUENTLY ASKED QUESTIONS
        </Text>

        <View style={styles.faqCard}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedId === faq.id;
            const isLast = index === FAQS.length - 1;

            return (
              <View key={faq.id} style={!isLast && styles.faqDivider}>
                <Pressable
                  style={styles.faqHeader}
                  onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                >
                  <Text
                    variant="body"
                    color={isExpanded ? colors.teal : colors.navy}
                    style={[{ flex: 1 }, isExpanded && { fontWeight: '600' } as any]}
                  >
                    {faq.question}
                  </Text>
                  {isExpanded ? (
                    <CaretUp size={16} color={colors.teal} />
                  ) : (
                    <CaretDown size={16} color={colors.muted} />
                  )}
                </Pressable>
                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text variant="caption" color={colors.slate} style={{ lineHeight: 20 }}>
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch', // Make children fill height if button changes height
  },
  iconBtnCtn: {
    width: 48,
    height: 48,
  },
  circleBtn: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: colorExtended.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: 'DMSans-Bold',
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 56,
  },
  faqBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
  },
});
