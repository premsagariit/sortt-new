/**
 * app/(shared)/dispute.tsx
 * ──────────────────────────────────────────────────────────────────
 * Shared Dispute screen for Sellers and Aggregators.
 *
 * Requirements:
 * 1. Warning banner (Amber tint) about 48h limit.
 * 2. Order context card (ID, status, counterparty).
 * 3. Issue selection (Radio cards) - userType specific.
 * 4. Description input (min 10 chars for validation).
 * 5. Mocked photo upload.
 * 6. Bottom-fixed primary button.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Warning, UploadSimple, CheckCircle } from 'phosphor-react-native';

import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { NavBar } from '../../components/ui/NavBar';
import { StatusChip } from '../../components/ui/StatusChip';
import { BaseCard } from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { safeBack } from '../../utils/navigation';

// ── Types ─────────────────────────────────────────────────────────

type IssueOption = {
    id: string;
    label: string;
};

const AGGREGATOR_ISSUES: IssueOption[] = [
    { id: 'no_show', label: 'Seller was not present at address' },
    { id: 'wrong_weight', label: 'Wrong weight recorded' },
    { id: 'abusive_behaviour', label: 'Abusive or unsafe behaviour' },
    { id: 'payment_not_made', label: 'Payment not made' },
    { id: 'other', label: 'Other' },
];

const SELLER_ISSUES: IssueOption[] = [
    { id: 'wrong_weight', label: 'Wrong weight recorded' },
    { id: 'payment_not_made', label: 'Payment not made' },
    { id: 'no_show', label: 'Aggregator no-show' },
    { id: 'abusive_behaviour', label: 'Abusive or unsafe behaviour' },
    { id: 'other', label: 'Other' },
];

// ── Component ──────────────────────────────────────────────────────

export default function DisputeScreen() {
    const insets = useSafeAreaInsets();
    const userType = useAuthStore((state) => state.userType);
    const params = useLocalSearchParams<{ orderId?: string; id?: string; fallbackRoute?: string }>();
    const orderId = typeof params.orderId === 'string'
        ? params.orderId
        : (typeof params.id === 'string' ? params.id : '');
    const fallbackRoute = typeof params.fallbackRoute === 'string'
        ? params.fallbackRoute
        : (userType === 'aggregator' ? '/(aggregator)/orders' : '/(seller)/orders');

    const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [evidenceSelected, setEvidenceSelected] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const issueOptions = userType === 'aggregator' ? AGGREGATOR_ISSUES : SELLER_ISSUES;
    const counterpartyName = userType === 'aggregator' ? 'Rahul Sharma' : 'Kumar Scrap Co.';

    const isFormValid = !!orderId && selectedIssue !== null && description.trim().length >= 10;

    const handleSubmit = async () => {
        if (!selectedIssue) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await api.post('/api/disputes', {
                order_id: orderId,
                issue_type: selectedIssue,
                description: description.trim(),
            });
            setIsSubmitting(false);
            setIsSubmitted(true);
        } catch (error: any) {
            const message = error?.response?.data?.message
                || error?.response?.data?.error
                || 'Failed to submit dispute. Please try again.';
            setSubmitError(String(message));
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <View style={styles.container}>
                <NavBar
                    title="Dispute Submitted"
                    variant="light"
                />
                <View style={styles.successContent}>
                    <View style={styles.successIconWrap}>
                        <CheckCircle size={64} color={colors.teal} weight="fill" />
                    </View>
                    <Text variant="heading" style={styles.successTitle}>
                        Successfully Submitted
                    </Text>
                    <Text variant="body" style={styles.successText}>
                        Your dispute has been successfully submitted. Our team will review it and help you resolve the issue within 72 hours.
                    </Text>
                </View>
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <PrimaryButton
                        label="Back to Orders"
                        onPress={() => safeBack(fallbackRoute)}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <NavBar
                title="File a Dispute"
                onBack={() => safeBack(fallbackRoute)}
                variant="light"
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Warning Banner ────────────────────────────────── */}
                    <View style={styles.banner}>
                        <Warning size={18} color={colors.amber} weight="fill" />
                        <Text variant="caption" style={styles.bannerText}>
                            Disputes must be raised within 48 hours of order completion. Reviewed within 72 hours.
                        </Text>
                    </View>

                    {/* ── Order Context Card ────────────────────────────── */}
                    <BaseCard style={styles.contextCard}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text variant="label" style={styles.cardSectionLabel}>Order</Text>
                                <View style={styles.orderMeta}>
                                    <Numeric size={12} color={colors.muted}>{orderId || 'Order ID unavailable'}</Numeric>
                                    <StatusChip status="completed" />
                                </View>
                            </View>
                        </View>
                        <Text variant="caption" style={styles.partnerInfo}>
                            {counterpartyName} • Tue, Mar 4
                        </Text>
                    </BaseCard>

                    {/* ── Issue Selection ─────────────────────────────── */}
                    <View style={styles.section}>
                        <Text variant="label" style={styles.sectionLabel}>Issue Type</Text>
                        <View style={styles.radioGroup}>
                            {issueOptions.map((option) => {
                                const isSelected = selectedIssue === option.id;
                                return (
                                    <Pressable
                                        key={option.id}
                                        onPress={() => setSelectedIssue(option.id)}
                                        style={[
                                            styles.radioCard,
                                            isSelected && styles.radioCardSelected
                                        ]}
                                    >
                                        <View style={[
                                            styles.radioOuter,
                                            isSelected && styles.radioOuterSelected
                                        ]}>
                                            {isSelected && (
                                                <CheckCircle size={14} color={colors.surface} weight="fill" />
                                            )}
                                        </View>
                                        <Text
                                            variant="body"
                                            style={[
                                                styles.radioLabel,
                                                isSelected && { color: colors.navy, fontWeight: '600' } as any
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* ── Description Input ─────────────────────────────── */}
                    <View style={styles.section}>
                        <Text variant="label" style={styles.sectionLabel}>Describe the issue</Text>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder={userType === 'aggregator'
                                ? "I arrived at the address at 8:05 AM. No one was home..."
                                : "The aggregator recorded 8 kg but my estimate was clearly around 12 kg..."}
                            placeholderTextColor={colors.muted}
                            multiline
                            maxLength={2000}
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                        <Text variant="caption" color={colors.muted}>
                            {description.length}/2000
                        </Text>
                    </View>

                    {/* ── Evidence Upload ───────────────────────────────── */}
                    <View style={styles.section}>
                        <Text variant="label" style={styles.sectionLabel}>
                            Upload Evidence <Text variant="caption">(Optional)</Text>
                        </Text>
                        <Pressable
                            onPress={() => setEvidenceSelected(true)}
                            style={styles.uploadZone}
                        >
                            {evidenceSelected ? (
                                <View style={styles.evidencePlaceholder}>
                                    <CheckCircle size={24} color={colors.teal} weight="fill" />
                                    <Text variant="label" color={colors.teal}>Evidence attached</Text>
                                </View>
                            ) : (
                                <>
                                    <UploadSimple size={24} color={colors.muted} weight="regular" />
                                    <Text variant="label" color={colors.muted}>Add photo evidence</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Fixed Bottom Button ─────────────────────────────── */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {submitError ? (
                    <Text variant="caption" style={styles.errorText}>{submitError}</Text>
                ) : null}
                <PrimaryButton
                    label={isSubmitting ? "Submitting..." : "Submit Dispute"}
                    onPress={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                />
            </View>
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        gap: spacing.lg,
    },

    // Banner
    banner: {
        flexDirection: 'row',
        backgroundColor: colors.amberLight,
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.amber + '20', // Subtle tint
    },
    bannerText: {
        flex: 1,
        color: colors.slate,
        lineHeight: 18,
    },

    // Context Card
    contextCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardSectionLabel: {
        fontWeight: '700',
        color: colors.navy,
        marginBottom: 4,
    },
    orderMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    partnerInfo: {
        marginTop: spacing.xs,
    },

    // Generic Section
    section: {
        gap: spacing.sm,
    },
    sectionLabel: {
        fontWeight: '700',
        color: colors.navy,
    },

    // Radio Group
    radioGroup: {
        gap: spacing.sm,
    },
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    radioCardSelected: {
        borderColor: colors.navy,
        backgroundColor: colors.bg,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        backgroundColor: colors.navy,
        borderColor: colors.navy,
    },
    radioLabel: {
        flex: 1,
        color: colors.slate,
    },

    // Description Input
    descriptionInput: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.input,
        padding: spacing.md,
        height: 100,
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: colors.navy,
    },

    // Upload Zone
    uploadZone: {
        height: 80,
        backgroundColor: colors.surface2,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    evidencePlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    errorText: {
        color: colors.red,
    },

    // Success Content
    successContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    successIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.tealLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    successTitle: {
        textAlign: 'center',
        color: colors.navy,
    },
    successText: {
        textAlign: 'center',
        color: colors.slate,
        lineHeight: 22,
    },
});
