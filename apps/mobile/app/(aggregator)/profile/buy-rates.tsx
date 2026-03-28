/**
 * app/(aggregator)/profile/buy-rates.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator "My Buy Rates" — full rewrite with custom material support.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
    Lightbulb,
    ArrowUp,
    ArrowDown,
    Plus,
    Gear,
    Plug,
    FileText,
    Dress,
    Wine,
    Cube,
    X,
    CurrencyInr,
    Trash,
} from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { useFocusEffect } from 'expo-router';
import { EmptyState } from '../../../components/ui/EmptyState';

// ── Standard material config ─────────────────────────────────────

const STANDARD_MATERIALS = [
    { code: 'metal',   label: 'Metal',   Icon: Gear },
    { code: 'copper',  label: 'Copper',  Icon: Plug },
    { code: 'paper',   label: 'Paper',   Icon: FileText },
    { code: 'plastic', label: 'Plastic', Icon: Cube },
    { code: 'fabric',  label: 'Fabric',  Icon: Dress },
    { code: 'glass',   label: 'Glass',   Icon: Wine },
    { code: 'ewaste',  label: 'E-Waste', Icon: Plug },
];

interface LocalRate {
    key: string;               // unique key: material_code or `custom_${custom_label}`
    label: string;
    isActive: boolean;
    rate: string;
    is_custom: boolean;
    material_code?: string;
    custom_label?: string;
}

// ── Comparison helper ────────────────────────────────────────────

function getComparison(userRate: number, marketAvg: number) {
    if (userRate > marketAvg) return { label: 'Above avg', color: colors.teal,  Icon: ArrowUp };
    if (userRate < marketAvg) return { label: 'Below avg', color: colors.amber, Icon: ArrowDown };
    return { label: 'At avg', color: colors.slate, Icon: null };
}

// Static market averages (fallback — ideally fetched from /api/rates)
const MARKET_AVG: Record<string, number> = {
    metal: 35, copper: 450, paper: 12, plastic: 8, fabric: 10, glass: 5, ewaste: 60,
};

// ── Add Custom Modal ──────────────────────────────────────────────

interface AddCustomModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (label: string, rate: string) => void;
}

function AddCustomModal({ visible, onClose, onAdd }: AddCustomModalProps) {
    const [label, setLabel] = useState('');
    const [rate, setRate] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAdd = () => {
        const trimLabel = label.trim();
        const rateNum = parseFloat(rate);
        if (!trimLabel) { setError('Please enter a material name.'); return; }
        if (!Number.isFinite(rateNum) || rateNum <= 0) { setError('Please enter a valid rate per kg.'); return; }
        setError(null);
        onAdd(trimLabel, rate);
        setLabel('');
        setRate('');
    };

    const handleClose = () => {
        setLabel('');
        setRate('');
        setError(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                        <Text variant="subheading" style={styles.modalTitle}>Add Custom Material</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
                            <X size={22} color={colors.slate} />
                        </TouchableOpacity>
                    </View>

                    <Text variant="caption" color={colors.slate} style={styles.modalSubtitle}>
                        Add any material you buy that's not in the standard list (e.g. Copper Wire, Wood, Milk Cans).
                    </Text>

                    <View style={styles.fieldRow}>
                        <Text variant="label" style={styles.fieldLabel}>Material Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Copper Wire"
                            placeholderTextColor={colors.muted}
                            value={label}
                            onChangeText={setLabel}
                            autoCapitalize="words"
                            maxLength={60}
                        />
                    </View>

                    <View style={styles.fieldRow}>
                        <Text variant="label" style={styles.fieldLabel}>Your Buy Rate (₹/kg)</Text>
                        <View style={styles.rateInputRow}>
                            <View style={styles.rateInputWrap}>
                                <Text variant="body" style={styles.rupeePrefix}>₹</Text>
                                <TextInput
                                    style={styles.rateInputInline}
                                    placeholder="0"
                                    placeholderTextColor={colors.muted}
                                    value={rate}
                                    onChangeText={setRate}
                                    keyboardType="numeric"
                                />
                                <Text variant="caption" color={colors.muted}>/kg</Text>
                            </View>
                        </View>
                    </View>

                    {error ? (
                        <Text variant="caption" color={colors.red} style={styles.modalError}>{error}</Text>
                    ) : null}

                    <PrimaryButton label="Add Material" onPress={handleAdd} style={styles.modalAddBtn} />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ── Main Screen ───────────────────────────────────────────────────

export default function BuyRatesScreen() {
    const router = useRouter();
    const { materialRates, fetchAggregatorRates, updateRates, ratesError } = useAggregatorStore();
    const [localRates, setLocalRates] = useState<LocalRate[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showAddCustom, setShowAddCustom] = useState(false);

    // ── Sync from store whenever materialRates changes ─────────────
    const buildLocalRates = useCallback(() => {
        // Start with all 6 standard materials
        const standard: LocalRate[] = STANDARD_MATERIALS.map(m => {
            const existing = materialRates.find(r => r.material_code === m.code && !r.is_custom);
            return {
                key: m.code,
                label: m.label,
                isActive: !!existing,
                rate: existing ? String(Number(existing.rate_per_kg)) : '',
                is_custom: false,
                material_code: m.code,
            };
        });

        // Append any custom materials from store
        const custom: LocalRate[] = materialRates
            .filter(r => r.is_custom && r.custom_label)
            .map(r => ({
                key: `custom_${r.custom_label}`,
                label: r.custom_label!,
                isActive: true,
                rate: String(Number(r.rate_per_kg)),
                is_custom: true,
                custom_label: r.custom_label!,
            }));

        setLocalRates([...standard, ...custom]);
    }, [materialRates]);

    useFocusEffect(
        useCallback(() => {
            void fetchAggregatorRates();
        }, [fetchAggregatorRates])
    );

    React.useEffect(() => {
        buildLocalRates();
    }, [buildLocalRates]);

    // ── Toggle a standard material on/off ──────────────────────────
    const handleToggle = (key: string) => {
        setLocalRates(prev => prev.map(r =>
            r.key === key ? { ...r, isActive: !r.isActive, rate: r.isActive ? '' : r.rate } : r
        ));
    };

    // ── Update rate for any row ────────────────────────────────────
    const handleRateChange = (key: string, value: string) => {
        setLocalRates(prev => prev.map(r => r.key === key ? { ...r, rate: value } : r));
    };

    // ── Remove a custom material ───────────────────────────────────
    const handleRemoveCustom = (key: string) => {
        setLocalRates(prev => prev.filter(r => r.key !== key));
    };

    // ── Add a new custom material ──────────────────────────────────
    const handleAddCustom = (label: string, rate: string) => {
        const key = `custom_${label}`;
        // Avoid duplicates
        setLocalRates(prev => {
            if (prev.some(r => r.key === key)) {
                return prev.map(r => r.key === key ? { ...r, rate, isActive: true } : r);
            }
            return [
                ...prev,
                {
                    key,
                    label,
                    isActive: true,
                    rate,
                    is_custom: true,
                    custom_label: label,
                },
            ];
        });
        setShowAddCustom(false);
    };

    // ── Save ──────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaveError(null);
        setIsSaving(true);
        try {
            const payload = localRates
                .filter(r => r.isActive && parseFloat(r.rate) > 0)
                .map(r => r.is_custom
                    ? { is_custom: true, custom_label: r.custom_label!, rate_per_kg: parseFloat(r.rate) }
                    : { material_code: r.material_code!, rate_per_kg: parseFloat(r.rate) }
                );

            await updateRates(payload);
            router.back();
        } catch (e: any) {
            setSaveError(e?.response?.data?.error ?? e?.message ?? 'Failed to save rates');
        } finally {
            setIsSaving(false);
        }
    };

    const activeRates   = localRates.filter(r => r.isActive);
    const inactiveRates = localRates.filter(r => !r.isActive && !r.is_custom);
    const customRates   = localRates.filter(r => r.is_custom);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar title="My Buy Rates" variant="light" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Info Banner */}
                <View style={styles.infoBox}>
                    <Lightbulb size={22} color={colors.amber} weight="fill" />
                    <Text variant="caption" style={styles.infoText}>
                        These rates are shown to sellers when they browse aggregators. Competitive rates get more orders.
                    </Text>
                </View>

                {ratesError ? (
                    <Text variant="caption" color={colors.red} style={{ marginBottom: spacing.md }}>{ratesError}</Text>
                ) : null}

                {/* ── Active Materials ─────────────────────────── */}
                {activeRates.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="label" style={styles.sectionLabel}>CURRENTLY COLLECTING</Text>
                        <View style={styles.card}>
                            {activeRates.map((item, idx) => {
                                const uRate = parseFloat(item.rate) || 0;
                                const marketAvg = item.is_custom ? 0 : (MARKET_AVG[item.material_code ?? ''] ?? 0);
                                const comp = getComparison(uRate, marketAvg);
                                const StdIcon = STANDARD_MATERIALS.find(m => m.code === item.material_code)?.Icon ?? Cube;

                                return (
                                    <View
                                        key={item.key}
                                        style={[
                                            styles.rateRow,
                                            idx < activeRates.length - 1 && styles.rateRowBorder,
                                        ]}
                                    >
                                        {/* Icon */}
                                        <View style={styles.matIconWrap}>
                                            {item.is_custom
                                                ? <CurrencyInr size={18} color={colors.navy} />
                                                : <StdIcon size={18} color={colors.navy} />
                                            }
                                        </View>

                                        {/* Label + market info */}
                                        <View style={styles.matInfo}>
                                            <View style={styles.labelRow}>
                                                <Text variant="label" style={styles.matLabel}>{item.label}</Text>
                                                {item.is_custom && (
                                                    <View style={styles.customBadge}>
                                                        <Text variant="caption" color={colors.teal} style={styles.customBadgeText}>Custom</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {!item.is_custom && marketAvg > 0 && uRate > 0 ? (
                                                <View style={styles.marketInfo}>
                                                    <Text variant="caption" color={colors.muted}>Avg ₹{marketAvg} · </Text>
                                                    <Text variant="caption" color={comp.color}>
                                                        {comp.label}
                                                        {comp.Icon ? <comp.Icon size={10} color={comp.color} /> : null}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Rate input */}
                                        <View style={styles.inputCell}>
                                            <View style={styles.inputBorder}>
                                                <Text variant="caption" color={colors.muted} style={styles.rupeeSymbol}>₹</Text>
                                                <TextInput
                                                    value={item.rate}
                                                    onChangeText={val => handleRateChange(item.key, val)}
                                                    keyboardType="numeric"
                                                    style={styles.priceInput}
                                                    placeholder="0"
                                                    placeholderTextColor={colors.muted}
                                                />
                                            </View>
                                            <Text variant="caption" color={colors.muted}>/kg</Text>
                                        </View>

                                        {/* Toggle / Remove */}
                                        {item.is_custom ? (
                                            <TouchableOpacity
                                                style={styles.removeBtn}
                                                onPress={() => handleRemoveCustom(item.key)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Trash size={18} color={colors.red} />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.toggleBtn}
                                                onPress={() => handleToggle(item.key)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <X size={16} color={colors.slate} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {activeRates.length === 0 && (
                    <EmptyState
                        icon={<CurrencyInr size={48} color={colors.muted} weight="thin" />}
                        heading="No materials enabled yet"
                        body="Tap materials below or add a custom one to start collecting."
                    />
                )}

                {/* ── Add Custom Product ───────────────────────── */}
                <Pressable style={styles.addCustomBtn} onPress={() => setShowAddCustom(true)}>
                    <View style={styles.addCustomIcon}>
                        <Plus size={16} color={colors.surface} weight="bold" />
                    </View>
                    <Text variant="label" style={styles.addCustomText}>Add Custom Material</Text>
                </Pressable>

                {/* ── Not Collecting (inactive standard materials) */}
                {inactiveRates.length > 0 && (
                    <View style={styles.notCollectingBox}>
                        <Text variant="label" style={styles.notCollectingTitle}>NOT CURRENTLY COLLECTING</Text>
                        <Text variant="caption" color={colors.muted} style={{ marginBottom: spacing.md }}>
                            Tap a material to enable it and set a buy rate.
                        </Text>
                        <View style={styles.chipsContainer}>
                            {inactiveRates.map(r => {
                                const StdIcon = STANDARD_MATERIALS.find(m => m.code === r.material_code)?.Icon ?? Cube;
                                return (
                                    <Pressable
                                        key={r.key}
                                        style={styles.inactiveChip}
                                        onPress={() => handleToggle(r.key)}
                                    >
                                        <StdIcon size={14} color={colors.slate} />
                                        <Text variant="caption" style={styles.chipText}>{r.label}</Text>
                                        <Plus size={12} color={colors.teal} weight="bold" />
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {saveError ? (
                    <Text variant="caption" color={colors.red} style={{ marginTop: spacing.md, textAlign: 'center' }}>
                        {saveError}
                    </Text>
                ) : null}
            </ScrollView>

            {/* ── Footer ─────────────────────────────────────── */}
            <View style={styles.footer}>
                <PrimaryButton
                    label={isSaving ? 'Saving…' : 'Save Rates'}
                    onPress={handleSave}
                    disabled={isSaving}
                />
            </View>

            {/* ── Add Custom Modal ────────────────────────────── */}
            <AddCustomModal
                visible={showAddCustom}
                onClose={() => setShowAddCustom(false)}
                onAdd={handleAddCustom}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    scrollContent: { padding: spacing.md, paddingBottom: 120 },

    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#FFF9EB',
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: '#FFE8A3',
    },
    infoText: { flex: 1, lineHeight: 18, color: '#4B5563' },

    section: { marginBottom: spacing.lg },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.slate,
        letterSpacing: 0.8,
        marginBottom: spacing.sm,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
    },
    rateRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    matIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    matInfo: { flex: 1, marginRight: spacing.sm },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    matLabel: { fontWeight: '700', color: colors.navy },
    customBadge: {
        backgroundColor: colorExtended.tealLight,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    customBadgeText: { fontSize: 10, fontWeight: '800' },
    marketInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },

    inputCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    inputBorder: {
        width: 84,
        height: 42,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        backgroundColor: '#fff',
    },
    rupeeSymbol: { marginRight: 2 },
    priceInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: colors.navy,
        padding: 0,
    },
    toggleBtn: { marginLeft: 8, padding: 4 },
    removeBtn: { marginLeft: 8, padding: 4 },

    addCustomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        alignSelf: 'center',
        marginBottom: spacing.xl,
        paddingVertical: 10,
        paddingHorizontal: spacing.lg,
        borderRadius: 24,
        backgroundColor: colors.navy,
    },
    addCustomIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addCustomText: { fontWeight: '700', color: colors.surface },

    notCollectingBox: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    notCollectingTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.slate,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    inactiveChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F5FA',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    chipText: { fontWeight: '600', color: colors.slate },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    // ── Modal ──────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    modalTitle: { color: colors.navy, fontWeight: '800' },
    modalCloseBtn: { padding: 4 },
    modalSubtitle: { marginBottom: spacing.lg, lineHeight: 18 },

    fieldRow: { marginBottom: spacing.md },
    fieldLabel: { fontWeight: '700', color: colors.slate, marginBottom: 8 },
    modalInput: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.navy,
        backgroundColor: '#fff',
    },
    rateInputRow: { flexDirection: 'row' },
    rateInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        backgroundColor: '#fff',
        flex: 1,
        gap: 6,
    },
    rupeePrefix: { fontWeight: '700', color: colors.navy },
    rateInputInline: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: colors.navy,
        padding: 0,
    },
    modalError: { marginBottom: spacing.sm, textAlign: 'center' },
    modalAddBtn: { marginTop: spacing.sm },
});
