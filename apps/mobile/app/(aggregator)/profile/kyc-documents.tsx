import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Camera, Image as ImageIcon, CheckCircle, Clock, Info, Trash, WarningCircle, ShieldCheck } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';
import { safeBack } from '../../../utils/navigation';

interface DocumentStatus {
    id: string;
    label: string;
    status: 'empty' | 'pending' | 'verified' | 'rejected';
    uri?: string;
    errorNote?: string;
}

const INITIAL_DOCS: DocumentStatus[] = [
    { id: 'shop', label: 'Shop / Warehouse Front', status: 'verified', uri: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=300&q=80' },
    { id: 'vehicle', label: 'Vehicle with License Plate', status: 'empty' },
];

export default function KycDocumentsScreen() {
    const router = useRouter();
    const [docs, setDocs] = useState<DocumentStatus[]>(INITIAL_DOCS);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const simulateUpload = (id: string) => {
        // Simulate picking an image
        setDocs(prev => prev.map(d =>
            d.id === id ? { ...d, status: 'pending', uri: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=300&q=80' } : d
        ));

        Alert.alert('Upload Started', 'Your document is being uploaded and will be verified manually.');
    };

    const removeDoc = (id: string) => {
        setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'empty', uri: undefined } : d));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSubmitting(false);
        Alert.alert('KYC Updated', 'Any new documents have been submitted for verification.', [
            {
                text: 'OK', onPress: () => {
                    safeBack('/(aggregator)/profile');
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="Verification Proof"
                variant="light"
                onBack={() => router.replace('/(aggregator)/profile')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerInfo}>
                    <ShieldCheck size={20} color={colors.navy} weight="fill" />
                    <Text variant="caption" style={styles.headerInfoText as any}>
                        To ensure trust in our marketplace, aggregators must provide proof of business premise and vehicle.
                    </Text>
                </View>

                <View style={styles.docList}>
                    {docs.map((doc) => (
                        <View key={doc.id} style={styles.docCard}>
                            <View style={styles.docHeader}>
                                <Text variant="subheading" color={colors.navy}>{doc.label}</Text>
                                <StatusBadge status={doc.status} />
                            </View>

                            {doc.uri ? (
                                <View style={styles.previewContainer}>
                                    <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                                    {doc.status !== 'verified' && (
                                        <Pressable style={styles.removeBtn} onPress={() => removeDoc(doc.id)}>
                                            <Trash size={16} color={colors.surface} weight="bold" />
                                        </Pressable>
                                    )}
                                    {doc.status === 'verified' && (
                                        <View style={styles.verifiedOverlay}>
                                            <CheckCircle size={32} color={colors.teal} weight="fill" />
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Pressable
                                    style={styles.uploadTrigger}
                                    onPress={() => simulateUpload(doc.id)}
                                >
                                    <View style={styles.uploadIconWrap}>
                                        <Camera size={24} color={colors.muted} />
                                    </View>
                                    <Text variant="body" color={colors.muted} style={{ fontWeight: '500' } as any}>Tap to take or upload photo</Text>
                                    <Text variant="caption" color={colors.muted}>JPG or PNG, max 5MB</Text>
                                </Pressable>
                            )}

                            {doc.status === 'rejected' && doc.errorNote && (
                                <View style={styles.errorBanner}>
                                    <WarningCircle size={16} color={colors.red} weight="fill" />
                                    <Text variant="caption" color={colors.red}>{doc.errorNote}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {docs.some(d => d.status === 'pending') && (
                    <View style={styles.pendingNote}>
                        <Info size={16} color={colors.amber} weight="fill" />
                        <Text variant="caption" color={colors.amber} style={{ flex: 1 }}>
                            Documents marked as pending usually take 24-48 hours to be verified by our admin team.
                        </Text>
                    </View>
                )}

                <View style={styles.saveContainer}>
                    <PrimaryButton
                        label={isSubmitting ? "Submitting..." : "Update Documents"}
                        onPress={handleSubmit}
                        disabled={isSubmitting || !docs.some(d => d.status === 'pending' || d.status === 'empty')}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function StatusBadge({ status }: { status: DocumentStatus['status'] }) {
    const config = {
        empty: { label: 'REQUIRED', color: colors.muted, bg: colors.bg },
        pending: { label: 'PENDING', color: colors.amber, bg: colors.amberLight },
        verified: { label: 'VERIFIED', color: colors.teal, bg: colors.tealLight },
        rejected: { label: 'REJECTED', color: colors.red, bg: colors.redLight },
    }[status];

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text variant="caption" style={[styles.badgeText, { color: config.color }] as any}>
                {config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl * 2,
    },
    headerInfo: {
        flexDirection: 'row',
        backgroundColor: colorExtended.surface2,
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        marginBottom: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerInfoText: {
        flex: 1,
        lineHeight: 18,
    },
    docList: {
        gap: spacing.lg,
    },
    docCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    docHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    previewContainer: {
        height: 180,
        borderRadius: radius.input,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadTrigger: {
        height: 180,
        borderRadius: radius.input,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    uploadIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colorExtended.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.md,
        backgroundColor: colors.redLight,
        padding: spacing.sm,
        borderRadius: 8,
    },
    pendingNote: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xl,
        paddingHorizontal: spacing.sm,
    },
    saveContainer: {
        marginTop: spacing.xl,
    },
});
