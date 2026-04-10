import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { api } from '../../../lib/api';

const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 300;

type AreaSuggestion = {
    label: string;
    locality: string;
};

const normalizeAreaKey = (value: unknown): string => {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const uniqAreas = (items: string[]): string[] => {
    const seen = new Set<string>();
    const next: string[] = [];

    for (const item of items) {
        const label = String(item ?? '').trim();
        if (!label) continue;
        const key = normalizeAreaKey(label);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        next.push(label);
    }

    return next;
};

export default function OperatingAreasScreen() {
    const router = useRouter();
    const { operatingAreas, setOperatingAreas, updateProfile } = useAggregatorStore();
    const [selectedZones, setSelectedZones] = useState<string[]>(operatingAreas);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const requestSeqRef = useRef(0);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setSelectedZones(operatingAreas);
    }, [operatingAreas]);

    const selectedZoneKeys = useMemo(() => {
        return new Set(selectedZones.map((zone) => normalizeAreaKey(zone)));
    }, [selectedZones]);

    const filteredSuggestions = useMemo(() => {
        return suggestions.filter((item) => !selectedZoneKeys.has(normalizeAreaKey(item.locality)));
    }, [selectedZoneKeys, suggestions]);

    useEffect(() => {
        const query = searchQuery.trim();
        const queryKey = normalizeAreaKey(query);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (query.length < AUTOCOMPLETE_MIN_CHARS) {
            setSuggestions([]);
            setIsSearching(false);
            setSearchError(null);
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        debounceTimerRef.current = setTimeout(() => {
            const requestId = ++requestSeqRef.current;

            api.get('/api/maps/autocomplete', { params: { input: query } })
                .then((res: any) => {
                    if (requestSeqRef.current !== requestId) return;

                    const predictions = Array.isArray(res.data?.predictions) ? res.data.predictions : [];
                    const nextSuggestions = predictions
                        .map((item: any) => {
                            const label = String(item?.description ?? '').trim();
                            const locality = String(item?.locality ?? '').trim();
                            return { label, locality };
                        })
                        .filter((item: AreaSuggestion) => item.label.length > 0 && item.locality.length > 0)
                        .filter((item: AreaSuggestion) => {
                            const normalizedLabel = normalizeAreaKey(item.label);
                            const normalizedLocality = normalizeAreaKey(item.locality);
                            return normalizedLabel.includes(queryKey) || normalizedLocality.includes(queryKey);
                        });

                    const dedupedByLocality = new Map<string, AreaSuggestion>();
                    for (const item of nextSuggestions) {
                        const localityKey = normalizeAreaKey(item.locality);
                        if (!localityKey || dedupedByLocality.has(localityKey)) continue;
                        dedupedByLocality.set(localityKey, item);
                    }

                    setSuggestions(Array.from(dedupedByLocality.values()));
                    setIsSearching(false);
                    setSearchError(null);
                })
                .catch((err: any) => {
                    if (requestSeqRef.current !== requestId) return;
                    console.error('[OperatingAreas] Autocomplete failed:', err);
                    setSuggestions([]);
                    setIsSearching(false);
                    setSearchError('Could not fetch area suggestions right now.');
                });
        }, AUTOCOMPLETE_DEBOUNCE_MS);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [searchQuery]);

    const toggleZone = (zone: string) => {
        setSelectedZones((prev) => {
            const zoneKey = normalizeAreaKey(zone);
            const exists = prev.some((entry) => normalizeAreaKey(entry) === zoneKey);
            if (exists) {
                return prev.filter((entry) => normalizeAreaKey(entry) !== zoneKey);
            }
            return uniqAreas([...prev, zone]);
        });
    };

    const handleSave = async () => {
        if (selectedZones.length === 0) return;
        setIsSaving(true);
        try {
            await updateProfile({ operating_area: uniqAreas(selectedZones) });
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
                            {filteredSuggestions.map((item) => (
                                <ZoneChip
                                    key={item.label}
                                    label={item.label}
                                    selected={false}
                                    onPress={() => toggleZone(item.locality)}
                                />
                            ))}
                        </View>
                        {isSearching && (
                            <View style={styles.emptySearch}>
                                <Text variant="caption" color={colors.muted}>Searching areas...</Text>
                            </View>
                        )}
                        {!isSearching && searchError && searchQuery.length >= AUTOCOMPLETE_MIN_CHARS && (
                            <View style={styles.emptySearch}>
                                <Text variant="caption" color={colors.muted}>{searchError}</Text>
                            </View>
                        )}
                        {!isSearching && !searchError && filteredSuggestions.length === 0 && searchQuery.length >= AUTOCOMPLETE_MIN_CHARS && (
                            <View style={styles.emptySearch}>
                                <Text variant="caption" color={colors.muted}>No matching areas found.</Text>
                            </View>
                        )}
                        {searchQuery.length > 0 && searchQuery.length < AUTOCOMPLETE_MIN_CHARS && (
                            <View style={styles.emptySearch}>
                                <Text variant="caption" color={colors.muted}>Type at least {AUTOCOMPLETE_MIN_CHARS} characters to search areas.</Text>
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
