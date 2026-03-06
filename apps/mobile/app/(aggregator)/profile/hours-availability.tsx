import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Pressable, Modal, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Clock, Info, CaretRight, Copy, X } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';
import { safeBack } from '../../../utils/navigation';
import { useAggregatorStore, DaySchedule } from '../../../store/aggregatorStore';

// Helper to parse "09:00 AM" to Date
const parseTimeString = (timeStr: string) => {
    try {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
    } catch (e) {
        return new Date();
    }
};

// Helper to format Date to "09:00 AM"
const formatTimeDate = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${modifier}`;
};

export default function HoursAvailabilityScreen() {
    const router = useRouter();
    const storeSchedule = useAggregatorStore((s) => s.weeklySchedule);
    const setProfile = useAggregatorStore((s) => s.setProfile);

    const [isOpenNow, setIsOpenNow] = useState(true);
    const [schedule, setSchedule] = useState<DaySchedule[]>(storeSchedule);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state
    const [pickerVisible, setPickerVisible] = useState(false);
    const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
    const [editingType, setEditingType] = useState<'start' | 'end'>('start');
    const [tempDate, setTempDate] = useState(new Date());

    const toggleDay = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule[index].isOpen = !newSchedule[index].isOpen;
        setSchedule(newSchedule);
    };

    const copyMondayToAll = () => {
        const monday = schedule[0];
        setSchedule(schedule.map(d => ({ ...d, isOpen: monday.isOpen, start: monday.start, end: monday.end })));
    };

    const openTimePicker = (index: number, type: 'start' | 'end') => {
        setEditingDayIndex(index);
        setEditingType(type);
        const currentTimeStr = type === 'start' ? schedule[index].start : schedule[index].end;
        setTempDate(parseTimeString(currentTimeStr));
        setPickerVisible(true);
    };

    const handleTimeConfirm = (event: any, date?: Date) => {
        // Android dismisses immediately on select/cancel
        if (Platform.OS === 'android') {
            setPickerVisible(false);
        }

        if (event.type === 'set' && date && editingDayIndex !== null) {
            const newSchedule = [...schedule];
            const formatted = formatTimeDate(date);
            if (editingType === 'start') {
                newSchedule[editingDayIndex].start = formatted;
            } else {
                newSchedule[editingDayIndex].end = formatted;
            }
            setSchedule(newSchedule);
        } else if (event.type === 'dismissed') {
            setPickerVisible(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        setProfile({ weeklySchedule: schedule });
        setIsSaving(false);
        safeBack('/(aggregator)/profile');
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
                                    <View style={styles.switchWrapper}>
                                        <Switch
                                            value={item.isOpen}
                                            onValueChange={() => toggleDay(index)}
                                            trackColor={{ false: colors.border, true: colors.teal }}
                                            thumbColor={colors.surface}
                                            style={{ transform: [{ scale: 0.8 }] }}
                                        />
                                    </View>
                                    <Text variant="body" numberOfLines={1} style={[styles.dayName, !item.isOpen && styles.textMuted] as any}>
                                        {item.day}
                                    </Text>
                                </View>

                                {item.isOpen ? (
                                    <View style={styles.timeRange}>
                                        <Pressable style={styles.timeDisplay} onPress={() => openTimePicker(index, 'start')}>
                                            <Numeric size={13} color={colors.navy}>{item.start}</Numeric>
                                        </Pressable>
                                        <Text variant="caption" color={colors.muted}>–</Text>
                                        <Pressable style={styles.timeDisplay} onPress={() => openTimePicker(index, 'end')}>
                                            <Numeric size={13} color={colors.navy}>{item.end}</Numeric>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Text variant="caption" color={colors.red} style={styles.closedText}>Closed</Text>
                                )}
                            </View>
                            {index < schedule.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>

                {/* For iOS, we need a way to close the inline picker since it doesn't have a native 'OK' dialog */}
                {Platform.OS === 'ios' && pickerVisible && (
                    <View style={styles.iosPickerDone}>
                        <PrimaryButton label="Done Selection" onPress={() => setPickerVisible(false)} />
                    </View>
                )}

                <View style={styles.saveContainer}>
                    <PrimaryButton
                        label={isSaving ? "Saving..." : "Save Schedule"}
                        onPress={handleSave}
                        disabled={isSaving}
                    />
                </View>
            </ScrollView>

            {/* Time Picker Trigger */}
            {pickerVisible && (
                <DateTimePicker
                    value={tempDate}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeConfirm}
                    textColor={colors.navy}
                />
            )}
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
        gap: spacing.sm,
    },
    daySwitch: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        flex: 1,
    },
    switchWrapper: {
        width: 44, // Consistent switch width
        alignItems: 'center',
    },
    dayName: {
        fontWeight: '600',
        flex: 1,
    },
    textMuted: {
        color: colors.muted,
    },
    timeRange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeDisplay: {
        backgroundColor: colorExtended.surface2,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 80,
        alignItems: 'center',
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
    iosPickerDone: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
});

