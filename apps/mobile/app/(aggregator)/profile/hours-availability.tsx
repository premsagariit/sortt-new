import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Clock, Info, CaretRight, Copy } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';

interface DaySchedule {
    day: string;
    isOpen: boolean;
    start: string;
    end: string;
}

const INITIAL_SCHEDULE: DaySchedule[] = [
    { day: 'Monday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
    { day: 'Tuesday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
    { day: 'Wednesday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
    { day: 'Thursday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
    { day: 'Friday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
    { day: 'Saturday', isOpen: true, start: '10:00 AM', end: '04:00 PM' },
    { day: 'Sunday', isOpen: false, start: '10:00 AM', end: '02:00 PM' },
];

export default function HoursAvailabilityScreen() {
    const router = useRouter();
    const [isOpenNow, setIsOpenNow] = useState(true);
    const [schedule, setSchedule] = useState<DaySchedule[]>(INITIAL_SCHEDULE);
    const [isSaving, setIsSaving] = useState(false);

    const toggleDay = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule[index].isOpen = !newSchedule[index].isOpen;
        setSchedule(newSchedule);
    };

    const copyMondayToAll = () => {
        const monday = schedule[0];
        setSchedule(schedule.map(d => ({ ...d, isOpen: monday.isOpen, start: monday.start, end: monday.end })));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSaving(false);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(aggregator)/profile');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="Hours & Availability"
                variant="light"
                onBack={() => router.replace('/(aggregator)/profile')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.masterToggleCard}>
                    <View style={styles.masterToggleInfo}>
                        <Text variant="subheading" color={colors.navy}>Open for Pickups</Text>
                        <Text variant="caption" color={colors.muted}>Receive and accept orders from sellers</Text>
                    </View>
                    <Switch
                        value={isOpenNow}
                        onValueChange={setIsOpenNow}
                        trackColor={{ false: colors.border, true: colors.teal }}
                        thumbColor={colors.surface}
                    />
                </View>

                <View style={styles.headerInfo}>
                    <Info size={20} color={colors.navy} weight="fill" />
                    <Text variant="caption" style={styles.headerInfoText as any}>
                        Set your weekly business hours. Orders will be scheduled within these slots.
                    </Text>
                </View>

                <View style={styles.scheduleHeader}>
                    <Text variant="label" color={colors.slate} style={styles.sectionLabel}>WEEKLY SCHEDULE</Text>
                    <Pressable style={styles.copyBtn} onPress={copyMondayToAll}>
                        <Copy size={16} color={colors.teal} weight="bold" />
                        <Text variant="caption" color={colors.teal} style={{ fontWeight: '600' } as any}>Copy Mon to all</Text>
                    </Pressable>
                </View>

                <View style={styles.scheduleList}>
                    {schedule.map((item, index) => (
                        <View key={item.day} style={styles.dayRow}>
                            <View style={styles.dayMain}>
                                <View style={styles.daySwitch}>
                                    <Switch
                                        value={item.isOpen}
                                        onValueChange={() => toggleDay(index)}
                                        trackColor={{ false: colors.border, true: colors.teal }}
                                        thumbColor={colors.surface}
                                        style={{ transform: [{ scale: 0.8 }] }}
                                    />
                                    <Text variant="body" style={[styles.dayName, !item.isOpen && styles.textMuted] as any}>
                                        {item.day}
                                    </Text>
                                </View>

                                {item.isOpen ? (
                                    <Pressable style={styles.timeDisplay}>
                                        <Numeric size={14} color={colors.navy}>{item.start} – {item.end}</Numeric>
                                        <CaretRight size={14} color={colors.muted} />
                                    </Pressable>
                                ) : (
                                    <Text variant="caption" color={colors.red} style={styles.closedText}>Closed</Text>
                                )}
                            </View>
                            {index < schedule.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>

                <View style={styles.saveContainer}>
                    <PrimaryButton
                        label={isSaving ? "Saving..." : "Save Schedule"}
                        onPress={handleSave}
                        disabled={isSaving}
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
    masterToggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
    },
    masterToggleInfo: {
        flex: 1,
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
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    sectionLabel: {
        fontSize: 12,
        letterSpacing: 0.8,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    scheduleList: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    dayRow: {
        paddingHorizontal: spacing.md,
    },
    dayMain: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    daySwitch: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    dayName: {
        fontWeight: '600',
        width: 80,
    },
    textMuted: {
        color: colors.muted,
    },
    timeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colorExtended.surface2,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    closedText: {
        fontWeight: '700',
        marginRight: spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    saveContainer: {
        marginTop: spacing.xl,
    },
});
