import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MagnifyingGlass, MapPin, Info, X } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { ZoneChip } from '../../../components/ui/ZoneChip';
import { PrimaryButton } from '../../../components/ui/Button';
import { safeBack } from '../../../utils/navigation';
import { useAggregatorStore } from '../../../store/aggregatorStore';

const ALL_ZONES = [
    'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Kondapur', 'Madhapur',
    'Hitech City', 'Manikonda', 'Kukatpally', 'Secunderabad', 'Abids',
    'Begumpet', 'Ameerpet', 'Somajiguda', 'Nallakunta', 'Himayatnagar',
];

export default function OperatingAreasScreen() {
    const router = useRouter();
    const { operatingAreas, setOperatingAreas, updateProfile } = useAggregatorStore();
    const [selectedZones, setSelectedZones] = useState<string[]>(operatingAreas);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        setSelectedZones(operatingAreas);
    }, [operatingAreas]);

    const filteredZones = useMemo(() => {
        return ALL_ZONES.filter(z =>
            z.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedZones.includes(z)
        );
    }, [searchQuery, selectedZones]);

    const toggleZone = (zone: string) => {
        setSelectedZones(prev =>
            prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
        );
    };

    const handleSave = async () => {
        if (selectedZones.length === 0) return;
        setIsSaving(true);
        try {
            await updateProfile({ operating_area: selectedZones });
            setIsSaving(false);
            router.back();
        } catch (err: any) {
            console.error('[OperatingAreas] Save failed:', err);
            setIsSaving(false);
            // In a real app, we'd show a toast here
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="Operating Areas"
                variant="light"
                onBack={() => router.replace('/(aggregator)/profile')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.headerInfo}>
                    <MapPin size={20} color={colors.navy} weight="fill" />
                    <Text variant="caption" style={styles.headerInfoText as any}>
                        Select the zones where your vehicles can pick up scrap. Sellers in these areas will see your profile and rates.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text variant="label" color={colors.slate} style={styles.sectionLabel}>SELECTED ZONES ({selectedZones.length})</Text>
                    <View style={styles.selectedContainer}>
                        {selectedZones.length > 0 ? (
                            <View style={styles.chipsWrap}>
                                {selectedZones.map(zone => (
                                    <ZoneChip
                                        key={zone}
                                        label={zone}
                                        selected={true}
                                        onPress={() => toggleZone(zone)}
                                    />
                                ))}
                            </View>
                        ) : (
                            <Text variant="caption" color={colors.muted}>No zones selected. Select areas below to start receiving orders.</Text>
                        )}
                    </View>
                </View>

                <View style={styles.searchSection}>
                    <Text variant="label" color={colors.slate} style={styles.sectionLabel}>FIND MORE AREAS</Text>
                    <View style={styles.searchBar}>
                        <MagnifyingGlass size={20} color={colors.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search zones..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={colors.muted}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <X size={16} color={colors.muted} weight="bold" />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.suggestionsList}>
                        <View style={styles.chipsWrap}>
                            {filteredZones.map(zone => (
                                <ZoneChip
                                    key={zone}
                                    label={zone}
                                    selected={false}
                                    onPress={() => toggleZone(zone)}
                                />
                            ))}
                        </View>
                        {filteredZones.length === 0 && searchQuery.length > 0 && (
                            <View style={styles.emptySearch}>
                                <Text variant="caption" color={colors.muted}>No zones matching "{searchQuery}"</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.saveContainer}>
                    <PrimaryButton
                        label={isSaving ? "Saving..." : "Update Areas"}
                        onPress={handleSave}
                        disabled={isSaving || selectedZones.length === 0}
                    />
                </View>
            </ScrollView>
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
    section: {
        marginBottom: spacing.xl,
    },
    sectionLabel: {
        marginBottom: spacing.md,
        fontSize: 12,
        letterSpacing: 0.8,
    },
    selectedContainer: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 80,
        justifyContent: 'center',
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    searchSection: {
        flex: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingHorizontal: spacing.md,
        height: 52,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: colors.navy,
    },
    suggestionsList: {
        marginTop: spacing.xs,
    },
    emptySearch: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    saveContainer: {
        marginTop: spacing.xxl,
    },
});
