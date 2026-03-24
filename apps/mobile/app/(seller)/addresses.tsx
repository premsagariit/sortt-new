import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MapPin, Plus, PencilSimple, Trash, CheckCircle } from 'phosphor-react-native';

import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { colors, radius, spacing } from '../../constants/tokens';
import { SellerAddress, useAddressStore } from '../../store/addressStore';

const formatAddressLine = (address: SellerAddress) => {
  const parts = [address.building_name, address.street, address.colony, address.city, address.pincode];
  return parts.filter((value) => !!value && String(value).trim().length > 0).join(', ');
};

export default function SellerAddressesScreen() {
  const addresses = useAddressStore((state) => state.addresses);
  const loading = useAddressStore((state) => state.loading);
  const error = useAddressStore((state) => state.error);
  const fetchAddresses = useAddressStore((state) => state.fetchAddresses);
  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const setDefaultAddress = useAddressStore((state) => state.setDefaultAddress);

  useFocusEffect(
    React.useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses])
  );

  const onDelete = (addressId: string) => {
    Alert.alert('Delete address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAddress(addressId);
          await fetchAddresses();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar title="Saved Addresses" onBack={() => router.back()} />

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void fetchAddresses()} tintColor={colors.navy} />}
        >
          {error ? <Text variant="caption" color={colors.red}>{error}</Text> : null}

          {addresses.length === 0 ? (
            <View style={styles.emptyCard}>
              <MapPin size={24} color={colors.slate} />
              <Text variant="label" color={colors.navy}>No saved addresses yet</Text>
              <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
                Add your pickup address once and reuse it while creating listings.
              </Text>
            </View>
          ) : (
            addresses.map((address) => (
              <View key={address.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.labelWrap}>
                    <Text variant="label" color={colors.navy}>{address.label || 'Address'}</Text>
                    {address.is_default ? (
                      <View style={styles.defaultPill}>
                        <CheckCircle size={12} color={colors.teal} weight="fill" />
                        <Text variant="caption" color={colors.teal}>Default</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/(seller)/address-map', params: { id: address.id } } as any)}>
                    <PencilSimple size={18} color={colors.navy} />
                  </Pressable>
                </View>

                <Text variant="caption" color={colors.slate}>{formatAddressLine(address)}</Text>
                {!!address.pickup_locality && (
                  <Text variant="caption" color={colors.muted} style={{ marginTop: spacing.xs }}>
                    Locality: {address.pickup_locality}
                  </Text>
                )}

                <View style={styles.cardActions}>
                  {!address.is_default ? (
                    <SecondaryButton
                      label="Set Default"
                      onPress={async () => {
                        await setDefaultAddress(address.id);
                        await fetchAddresses();
                      }}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}

                  <Pressable style={styles.deleteBtn} onPress={() => onDelete(address.id)}>
                    <Trash size={16} color={colors.red} />
                    <Text variant="caption" color={colors.red}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Add Address"
            icon={<Plus size={16} color={colors.surface} weight="bold" />}
            onPress={() => router.push('/(seller)/address-map' as any)}
          />
        </View>
      </View>
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
    gap: spacing.md,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tealLight,
    borderRadius: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
});
