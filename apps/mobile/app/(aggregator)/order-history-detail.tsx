import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { MaterialChip } from '../../components/ui/MaterialChip';
import {
    CheckCircle, XCircle, MapPin, Clock, Package,
    Hash, CalendarBlank, ChatsCircle, Star, ArrowLeft,
    Camera, Scales,
} from 'phosphor-react-native';
import { PrimaryButton } from '../../components/ui/Button';
import { useOrderStore } from '../../store/orderStore';
import { safeBack } from '../../utils/navigation';
import { Avatar } from '../../components/ui/Avatar';

/**
 * app/(aggregator)/order-history-detail.tsx
 * ──────────────────────────────────────────────────────────────────
 * Read-only order detail for Completed and Cancelled orders.
 *
 * Completed view includes:
 *  – Order photo (scrap image from pickup)
 *  – Materials + weight + rate breakdown table
 *  – Total amount earned
 *  – Rating section  (star input if not rated, review display if rated)
 *
 * Cancelled view includes:
 *  – Status banner + cancellation notice
 *  – Materials that were listed
 * ──────────────────────────────────────────────────────────────────
 */

// Mock material detail with weights (would come from backend post-weighing)
const MOCK_MATERIAL_DETAILS: Record<string, Array<{ material: string; weight: number; rate: number }>> = {
    'COMP-001': [
        { material: 'Metal', weight: 18, rate: 28 },
        { material: 'E-Waste', weight: 4, rate: 60 },
    ],
    default_completed: [
        { material: 'Metal', weight: 18, rate: 28 },
        { material: 'E-Waste', weight: 4, rate: 60 },
    ],
    default_cancelled: [
        { material: 'Plastic', weight: 8, rate: 8 },
        { material: 'Glass', weight: 5, rate: 3 },
    ],
};

// Mock order photos (placeholder colors mimicking real scrap photos)
const MOCK_ORDER_PHOTO = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80';

const MOCK_SELLER_NAME = 'Seller';
const MOCK_RATING = 4.8;

export default function OrderHistoryDetailScreen() {
    const router = useRouter();
    const { id, status } = useLocalSearchParams<{ id: string; status: string }>();
    const { orders } = useOrderStore();

    const order = orders.find(o => o.orderId === id);
    const resolvedStatus = (status ?? order?.status) as string;
    const isCancelled = resolvedStatus === 'cancelled';
    const isCompleted = resolvedStatus === 'completed';

    // Rating state
    const [ratingGiven, setRatingGiven] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedRating, setSelectedRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);

    // Seed fallbacks
    const displayOrder = order
        ? {
            id: order.orderId,
            status: order.status,
            locality: order.pickupLocality,
            address: order.pickupAddress ?? 'Address available after acceptance',
            materials: order.materials,
            amount: order.confirmedAmount ?? order.estimatedAmount,
            date: new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            }),
            otp: order.otp,
        }
        : {
            id: id ?? '—',
            status: resolvedStatus ?? 'completed',
            locality: isCancelled ? 'Kukatpally area' : 'Gachibowli area',
            address: isCancelled ? '—' : 'Road No. 5, Near Metro Station',
            materials: isCancelled ? (['plastic', 'glass'] as const) : (['metal', 'ewaste'] as const),
            amount: isCancelled ? 580 : 1250,
            date: isCancelled ? '2 days ago' : 'Yesterday',
            otp: isCompleted ? '4821' : '—',
        };

    const materialDetails = MOCK_MATERIAL_DETAILS[displayOrder.id] ??
        (isCancelled ? MOCK_MATERIAL_DETAILS.default_cancelled : MOCK_MATERIAL_DETAILS.default_completed);

    const totalAmount = materialDetails.reduce((sum, d) => sum + d.weight * d.rate, 0);
    const heroBg = isCancelled ? '#4A5568' : colors.teal;

    const handleSubmitRating = () => {
        if (selectedRating === 0) return;
        setIsReviewSubmitted(true);
        setRatingGiven(true);
    };

    const renderStars = (interactive: boolean = false, displayValue: number = 0) => (
        <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = interactive
                    ? (hoverRating || selectedRating) >= star
                    : displayValue >= star;
                return (
                    <Pressable
                        key={star}
                        onPress={interactive ? () => setSelectedRating(star) : undefined}
                        onPressIn={interactive ? () => setHoverRating(star) : undefined}
                        onPressOut={interactive ? () => setHoverRating(0) : undefined}
                        hitSlop={8}
                    >
                        <Star
                            size={32}
                            color={filled ? colors.amber : colors.border}
                            weight={filled ? 'fill' : 'regular'}
                        />
                    </Pressable>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Hero Banner ──────────────────────────────────── */}
            <View style={[styles.hero, { backgroundColor: heroBg }]}>
                <View style={styles.heroNav}>
                    <Pressable onPress={() => safeBack('/(aggregator)/orders')} style={styles.backBtn}>
                        <ArrowLeft size={22} color="#FFFFFF" weight="bold" />
                    </Pressable>
                    <Text variant="label" style={styles.heroNavTitle}>Order Details</Text>
                    <View style={{ width: 36 }} />
                </View>

                <View style={styles.heroBody}>
                    {isCancelled
                        ? <XCircle size={48} color="#FFFFFF" weight="fill" />
                        : <CheckCircle size={48} color="#FFFFFF" weight="fill" />
                    }
                    <Text variant="heading" style={styles.heroTitle}>
                        {isCancelled ? 'Order Cancelled' : 'Pickup Completed'}
                    </Text>
                </View>

                {/* Amount bubble */}
                <View style={styles.amountBubble}>
                    <Text variant="caption" style={styles.amountLabel}>
                        {isCancelled ? 'ESTIMATED VALUE' : 'PAYMENT RECEIVED'}
                    </Text>
                    <Numeric size={30} style={[styles.amountValue, { color: isCancelled ? colors.muted : colors.navy }]}>
                        {isCancelled ? '—' : `₹${displayOrder.amount}`}
                    </Numeric>
                    {isCompleted && (
                        <View style={styles.paidBadge}>
                            <Text variant="caption" style={styles.paidBadgeText}>PAID</Text>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* ── ID + Date strip ──────────────────────────── */}
                <View style={styles.infoStrip}>
                    <View style={styles.infoItem}>
                        <Hash size={13} color={colors.muted} />
                        <Numeric size={12} color={colors.navy} style={styles.monoText}>{displayOrder.id}</Numeric>
                    </View>
                    <View style={styles.stripDivider} />
                    <View style={styles.infoItem}>
                        <CalendarBlank size={13} color={colors.muted} />
                        <Text variant="caption" color={colors.slate}>{displayOrder.date}</Text>
                    </View>
                    <View style={styles.stripDivider} />
                    <View style={[styles.statusPill, { backgroundColor: isCancelled ? '#FEE2E2' : colorExtended.tealLight }]}>
                        <Text variant="caption" style={[styles.statusPillText, { color: isCancelled ? colors.red : colors.teal }]}>
                            {isCancelled ? 'Cancelled' : 'Completed'}
                        </Text>
                    </View>
                </View>

                {/* ── Order Photo (completed only) ──────────────── */}
                {isCompleted && (
                    <View style={styles.photoCard}>
                        <View style={styles.cardHeader}>
                            <Camera size={16} color={colors.navy} />
                            <Text variant="label" color={colors.slate} style={styles.cardTitle}>ORDER PHOTO</Text>
                        </View>
                        <View style={styles.photoContainer}>
                            <Image
                                source={{ uri: MOCK_ORDER_PHOTO }}
                                style={styles.orderPhoto}
                                resizeMode="cover"
                            />
                            <View style={styles.photoOverlay}>
                                <View style={styles.photoBadge}>
                                    <Camera size={12} color="#FFFFFF" weight="fill" />
                                    <Text variant="caption" style={styles.photoBadgeText}>Captured at pickup</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.cardSection}>
                    {/* ── Materials + Weight Table ──────────────── */}
                    <View style={styles.detailCard}>
                        <View style={styles.cardHeader}>
                            <Scales size={16} color={colors.navy} />
                            <Text variant="label" color={colors.slate} style={styles.cardTitle}>
                                {isCompleted ? 'MATERIALS & WEIGHT' : 'LISTED MATERIALS'}
                            </Text>
                        </View>

                        {isCompleted ? (
                            /* Full weight breakdown table for completed */
                            <View style={styles.table}>
                                <View style={styles.tableHeader}>
                                    <Text variant="caption" color={colors.muted} style={[styles.col, styles.colMat]}>Material</Text>
                                    <Text variant="caption" color={colors.muted} style={[styles.col, styles.colWeight]}>Weight</Text>
                                    <Text variant="caption" color={colors.muted} style={[styles.col, styles.colRate]}>Rate</Text>
                                    <Text variant="caption" color={colors.muted} style={[styles.col, styles.colTotal]}>Amount</Text>
                                </View>
                                {materialDetails.map((item, idx) => (
                                    <View key={idx} style={[styles.tableRow, idx === materialDetails.length - 1 && { borderBottomWidth: 0 }]}>
                                        <Text variant="label" color={colors.navy} style={[styles.col, styles.colMat]}>{item.material}</Text>
                                        <Numeric size={13} color={colors.teal} style={[styles.col, styles.colWeight]}>{item.weight} kg</Numeric>
                                        <Numeric size={13} color={colors.muted} style={[styles.col, styles.colRate]}>₹{item.rate}</Numeric>
                                        <Numeric size={13} color={colors.amber} style={[styles.col, styles.colTotal, { fontWeight: '700' }]}>
                                            ₹{item.weight * item.rate}
                                        </Numeric>
                                    </View>
                                ))}
                                <View style={styles.tableTotalRow}>
                                    <Text variant="label" color={colors.navy} style={{ fontFamily: 'DMSans-Bold', flex: 1 }}>Total</Text>
                                    <Numeric size={18} color={colors.navy} style={{ fontFamily: 'DMMono-Bold' }}>₹{totalAmount}</Numeric>
                                </View>
                            </View>
                        ) : (
                            /* Simple chip list for cancelled */
                            <View style={styles.chipsRow}>
                                {displayOrder.materials.map((m: string) => (
                                    <MaterialChip key={m} material={m as any} variant="chip" />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ── Pickup Location ───────────────────────── */}
                    <View style={styles.detailCard}>
                        <View style={styles.cardHeader}>
                            <MapPin size={16} color={colors.navy} />
                            <Text variant="label" color={colors.slate} style={styles.cardTitle}>PICKUP LOCATION</Text>
                        </View>
                        <Text variant="subheading" color={colors.navy}>{displayOrder.locality}</Text>
                        {displayOrder.address && displayOrder.address !== '—' && (
                            <Text variant="caption" color={colors.slate} style={{ marginTop: 4 }}>
                                {displayOrder.address}
                            </Text>
                        )}
                    </View>

                    {/* ── OTP (completed only) ─────────────────── */}
                    {isCompleted && displayOrder.otp && displayOrder.otp !== '—' && (
                        <View style={styles.detailCard}>
                            <View style={styles.cardHeader}>
                                <Clock size={16} color={colors.navy} />
                                <Text variant="label" color={colors.slate} style={styles.cardTitle}>VERIFICATION OTP</Text>
                            </View>
                            <View style={styles.otpRow}>
                                {displayOrder.otp.split('').map((digit, idx) => (
                                    <View key={idx} style={styles.otpDigit}>
                                        <Numeric size={22} color={colors.navy} style={{ fontFamily: 'DMMono-Bold' }}>{digit}</Numeric>
                                    </View>
                                ))}
                            </View>
                            <Text variant="caption" color={colors.muted} style={{ marginTop: 6 }}>
                                Used to verify the seller at pickup
                            </Text>
                        </View>
                    )}

                    {/* ── Seller Info ───────────────────────────── */}
                    <View style={styles.detailCard}>
                        <View style={styles.cardHeader}>
                            <ChatsCircle size={16} color={colors.navy} />
                            <Text variant="label" color={colors.slate} style={styles.cardTitle}>SELLER</Text>
                        </View>
                        <View style={styles.sellerRow}>
                            <Avatar name={MOCK_SELLER_NAME} userType="seller" size="sm" />
                            <View style={styles.sellerInfo}>
                                <Text variant="label" color={colors.navy}>{MOCK_SELLER_NAME}</Text>
                                <View style={styles.ratingRow}>
                                    <Star size={11} color={colors.amber} weight="fill" />
                                    <Text variant="caption" color={colors.muted}>{MOCK_RATING} · rated seller</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── Rating Section (completed only) ──────── */}
                    {isCompleted && (
                        <View style={styles.detailCard}>
                            <View style={styles.cardHeader}>
                                <Star size={16} color={colors.amber} weight="fill" />
                                <Text variant="label" color={colors.slate} style={styles.cardTitle}>
                                    {isReviewSubmitted ? 'YOUR REVIEW' : 'RATE THIS PICKUP'}
                                </Text>
                            </View>

                            {isReviewSubmitted ? (
                                /* ── Submitted Review Display ── */
                                <View style={styles.reviewDisplay}>
                                    <View style={styles.starsRowSmall}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                size={20}
                                                color={selectedRating >= s ? colors.amber : colors.border}
                                                weight={selectedRating >= s ? 'fill' : 'regular'}
                                            />
                                        ))}
                                    </View>
                                    {reviewText.length > 0 && (
                                        <View style={styles.reviewTextBubble}>
                                            <Text variant="body" color={colors.slate} style={{ lineHeight: 20 }}>
                                                "{reviewText}"
                                            </Text>
                                        </View>
                                    )}
                                    <Text variant="caption" color={colors.teal}>✓ Review submitted</Text>
                                </View>
                            ) : (
                                /* ── Interactive Rating Input ── */
                                <View style={styles.ratingInputSection}>
                                    <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
                                        How was this pickup?
                                    </Text>
                                    {renderStars(true)}
                                    {selectedRating > 0 && (
                                        <Text variant="caption" color={colors.amber} style={{ textAlign: 'center', marginTop: -4 }}>
                                            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][selectedRating]}
                                        </Text>
                                    )}
                                    <TextInput
                                        style={styles.reviewInput}
                                        placeholder="Write a review (optional)..."
                                        placeholderTextColor={colors.muted}
                                        multiline
                                        numberOfLines={3}
                                        value={reviewText}
                                        onChangeText={setReviewText}
                                    />
                                    <PrimaryButton
                                        label="Submit Review"
                                        onPress={handleSubmitRating}
                                        style={[styles.submitBtn, selectedRating === 0 && styles.submitBtnDisabled]}
                                        disabled={selectedRating === 0}
                                    />
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── Cancellation Notice (cancelled only) ── */}
                    {isCancelled && (
                        <View style={styles.cancelNotice}>
                            <XCircle size={18} color={colors.red} />
                            <Text variant="caption" color={colors.slate} style={{ flex: 1, lineHeight: 18 }}>
                                This order was cancelled. No amount was charged or transferred for this transaction.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // ── Hero ──
    hero: { paddingBottom: spacing.xl },
    heroNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: spacing.sm,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    heroNavTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'DMSans-SemiBold' },
    heroBody: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
        gap: 6,
    },
    heroTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: 'DMSans-Bold', textAlign: 'center' },
    amountBubble: {
        marginHorizontal: spacing.md,
        backgroundColor: '#FFFFFF',
        borderRadius: radius.card,
        padding: spacing.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        gap: 2,
    },
    amountLabel: { letterSpacing: 1, fontSize: 10, fontFamily: 'DMSans-Bold', color: colors.muted },
    amountValue: { fontFamily: 'DMMono-Bold' },
    paidBadge: {
        backgroundColor: colorExtended.tealLight,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginTop: 2,
    },
    paidBadgeText: { color: colors.teal, fontFamily: 'DMSans-Bold', fontSize: 9, letterSpacing: 1 },

    // ── Strip ──
    scroll: { paddingBottom: 60 },
    infoStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    stripDivider: { width: 1, height: 14, backgroundColor: colors.border },
    statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    statusPillText: { fontSize: 10, fontFamily: 'DMSans-Bold' },
    monoText: { fontFamily: 'DMMono-Medium', fontSize: 12 },

    // ── Photo ──
    photoCard: {
        margin: spacing.md,
        marginBottom: 0,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 10,
    },
    photoContainer: {
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    orderPhoto: { width: '100%', height: 200 },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.sm,
    },
    photoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    photoBadgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'DMSans-Medium' },

    // ── Cards ──
    cardSection: { padding: spacing.md, gap: spacing.md },
    detailCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.slate },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

    // ── Table ──
    table: { gap: 0 },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.bg,
        paddingVertical: 8,
        paddingHorizontal: spacing.sm,
        borderRadius: 6,
        marginBottom: 4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    tableTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.sm,
        marginTop: 4,
        borderTopWidth: 1.5,
        borderTopColor: colors.border,
    },
    col: { flex: 1 },
    colMat: { flex: 2 },
    colWeight: { textAlign: 'center' },
    colRate: { textAlign: 'center' },
    colTotal: { textAlign: 'right' },

    // ── OTP ──
    otpRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    otpDigit: {
        width: 44,
        height: 50,
        backgroundColor: colors.bg,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Seller ──
    sellerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sellerInfo: { gap: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    // ── Rating ──
    ratingInputSection: { gap: spacing.sm, alignItems: 'center' },
    starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 4 },
    reviewInput: {
        width: '100%',
        minHeight: 80,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        fontSize: 14,
        fontFamily: 'DMSans-Regular',
        color: colors.navy,
        backgroundColor: colors.bg,
        textAlignVertical: 'top',
    },
    submitBtn: { width: '100%', backgroundColor: colors.teal, height: 44 },
    submitBtnDisabled: { opacity: 0.4 },
    reviewDisplay: { gap: spacing.sm },
    starsRowSmall: { flexDirection: 'row', gap: 4 },
    reviewTextBubble: {
        backgroundColor: colors.bg,
        borderRadius: 10,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },

    // ── Cancel Notice ──
    cancelNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FEF2F2',
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: spacing.md,
    },
});
