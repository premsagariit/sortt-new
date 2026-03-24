import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Truck, Storefront, MapPin, Calendar, ArrowRight, Plus } from 'phosphor-react-native';

import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { colors, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { useAddressStore } from '../../../store/addressStore';

import DateTimePicker from '@react-native-community/datetimepicker';
import { safeBack } from '../../../utils/navigation';

const TIMES = [
  { label: 'Morning · 8–10 AM', value: 'morning_8_10' },
  { label: 'Morning · 10–12 PM', value: 'morning_10_12' },
  { label: 'Afternoon · 12–2 PM', value: 'afternoon_12_2' },
  { label: 'Afternoon · 2–4 PM', value: 'afternoon_2_4' },
  { label: 'Afternoon · 4–6 PM', value: 'afternoon_4_6' },
  { label: 'Evening · 6 PM+', value: 'evening_6_plus' },
];

const formatAddress = (address: {
  building_name: string | null;
  street: string | null;
  colony: string | null;
  city: string;
  pincode: string;
}) => {
  return [address.building_name, address.street, address.colony, address.city, address.pincode]
    .filter((part) => !!part && String(part).trim().length > 0)
    .join(', ');
};

export default function Step3Screen() {
  const {
    pickupType,
    scheduledDate,
    scheduledTime,
    selectedAddressId,
    selectedAddressSnapshot,
    setPickupType,
    setScheduledDate,
    setScheduledTime,
    setSelectedAddress,
  } = useListingStore();

  const addresses = useAddressStore((state) => state.addresses);
  const loadingAddresses = useAddressStore((state) => state.loading);
  const fetchAddresses = useAddressStore((state) => state.fetchAddresses);

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showAddressSelector, setShowAddressSelector] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void fetchAddresses();
    }, [fetchAddresses])
  );

  React.useEffect(() => {
    if (selectedAddressId) {
      const selected = addresses.find((item) => item.id === selectedAddressId);
      if (selected) {
        setSelectedAddress({
          id: selected.id,
          label: selected.label,
          building_name: selected.building_name,
          street: selected.street,
          colony: selected.colony,
          city: selected.city,
          pincode: selected.pincode,
          pickup_locality: selected.pickup_locality,
        });
      }
      return;
    }

    const defaultAddress = addresses.find((item) => item.is_default) || addresses[0];
    if (defaultAddress) {
      setSelectedAddress({
        id: defaultAddress.id,
        label: defaultAddress.label,
        building_name: defaultAddress.building_name,
        street: defaultAddress.street,
        colony: defaultAddress.colony,
        city: defaultAddress.city,
        pincode: defaultAddress.pincode,
        pickup_locality: defaultAddress.pickup_locality,
      });
    }
  }, [addresses, selectedAddressId, setSelectedAddress]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setScheduledDate(selectedDate.toISOString());
    }
  };

  const canProceed =
    !!selectedAddressId &&
    (pickupType === 'dropoff' || (pickupType === 'scheduled' && !!scheduledDate && !!scheduledTime));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar
        title="List Scrap"
        onBack={() => safeBack('/(seller)/listing/step2')}
        rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 3 of 4</Text>}
      />

      <View style={styles.content}>
        <WizardStepIndicator currentStep={3} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="heading">Pickup preference</Text>
          </View>

          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeCard, pickupType === 'scheduled' ? styles.typeSelected : styles.typeUnselected]}
              onPress={() => setPickupType('scheduled')}
            >
              <Truck size={32} color={pickupType === 'scheduled' ? colors.surface : colors.navy} weight="duotone" />
              <Text variant="label" style={{ color: pickupType === 'scheduled' ? colors.surface : colors.navy, marginTop: spacing.sm, textAlign: 'center' }}>
                Pickup from my location
              </Text>
              <Text variant="caption" style={{ color: pickupType === 'scheduled' ? colors.whiteAlpha70 : colors.muted, marginTop: 2, textAlign: 'center' }}>
                Aggregator comes to you · Free
              </Text>
            </Pressable>

            <Pressable
              style={[styles.typeCard, pickupType === 'dropoff' ? styles.typeSelected : styles.typeUnselected]}
              onPress={() => setPickupType('dropoff')}
            >
              <Storefront size={32} color={pickupType === 'dropoff' ? colors.surface : colors.navy} weight="duotone" />
              <Text variant="label" style={{ color: pickupType === 'dropoff' ? colors.surface : colors.navy, marginTop: spacing.sm, textAlign: 'center' }}>
                Drop-off at aggregator
              </Text>
              <Text variant="caption" style={{ color: pickupType === 'dropoff' ? colors.whiteAlpha70 : colors.muted, marginTop: 2, textAlign: 'center' }}>
                You bring the scrap · Higher rate
              </Text>
            </Pressable>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.addressHeaderRow}>
              <Text variant="subheading">Saved Pickup Address</Text>
              <Pressable onPress={() => router.push('/(seller)/addresses' as any)}>
                <Text variant="caption" color={colors.red}>Manage</Text>
              </Pressable>
            </View>

            <Pressable style={styles.addressCard} onPress={() => setShowAddressSelector(true)}>
              {selectedAddressSnapshot ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <MapPin size={16} color={colors.navy} />
                    <Text variant="label" color={colors.navy}>{selectedAddressSnapshot.label}</Text>
                  </View>
                  <Text variant="caption" color={colors.slate} numberOfLines={2}>
                    {formatAddress(selectedAddressSnapshot)}
                  </Text>
                </>
              ) : (
                <Text variant="caption" color={colors.muted}>
                  {loadingAddresses ? 'Loading saved addresses...' : 'Select a saved address to continue'}
                </Text>
              )}
            </Pressable>

            {!selectedAddressId && !loadingAddresses ? (
              <SecondaryButton
                label="Add New Address"
                icon={<Plus size={14} color={colors.navy} weight="bold" />}
                onPress={() => router.push('/(seller)/address-map' as any)}
              />
            ) : null}

            {pickupType === 'scheduled' && (
              <>
                <Text variant="subheading" style={styles.sectionTitle}>Preferred Date</Text>

                {Platform.OS === 'ios' ? (
                  <View style={styles.iosPickerContainer}>
                    <DateTimePicker
                      value={scheduledDate ? new Date(scheduledDate) : new Date()}
                      mode="date"
                      display="inline"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                      <Text variant="body" color={scheduledDate ? colors.navy : colors.muted}>
                        {scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Select Date'}
                      </Text>
                      <Calendar size={20} color={colors.navy} />
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={scheduledDate ? new Date(scheduledDate) : new Date()}
                        mode="date"
                        display="calendar"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </>
                )}

                <Text variant="subheading" style={styles.sectionTitle}>Preferred Time</Text>
                <View style={styles.timeGrid}>
                  {TIMES.map((timeSlot) => (
                    <Pressable
                      key={timeSlot.label}
                      style={[styles.timeChip, scheduledTime === timeSlot.value ? styles.chipSelected : styles.chipUnselected]}
                      onPress={() => setScheduledTime(timeSlot.value)}
                    >
                      <Text variant="caption" style={{ color: scheduledTime === timeSlot.value ? colors.surface : colors.navy, textAlign: 'center' }}>
                        {timeSlot.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Next"
            icon={<ArrowRight size={18} color={colors.surface} weight="bold" />}
            disabled={!canProceed}
            onPress={() => router.push('/(seller)/listing/step4')}
          />
        </View>
      </View>

      <Modal
        visible={showAddressSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressSelector(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddressSelector(false)}>
          <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
            <Text variant="subheading" style={{ marginBottom: spacing.md }}>Select Address</Text>

            {addresses.map((address) => (
              <Pressable
                key={address.id}
                style={[styles.modalAddressCard, selectedAddressId === address.id && styles.modalAddressCardSelected]}
                onPress={() => {
                  setSelectedAddress({
                    id: address.id,
                    label: address.label,
                    building_name: address.building_name,
                    street: address.street,
                    colony: address.colony,
                    city: address.city,
                    pincode: address.pincode,
                    pickup_locality: address.pickup_locality,
                  });
                  setShowAddressSelector(false);
                }}
              >
                <Text variant="label" color={colors.navy}>{address.label}</Text>
                <Text variant="caption" color={colors.slate} numberOfLines={2}>{formatAddress(address)}</Text>
              </Pressable>
            ))}

            <SecondaryButton
              label="Add New Address"
              onPress={() => {
                setShowAddressSelector(false);
                router.push('/(seller)/address-map' as any);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  typeCard: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  typeSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  typeUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  detailsContainer: {
    gap: spacing.sm,
  },
  addressHeaderRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    width: '31%',
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  iosPickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  datePickerBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.btn,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.blackAlpha3,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '75%',
  },
  modalAddressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  modalAddressCardSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.navyAlpha3,
  },
});
