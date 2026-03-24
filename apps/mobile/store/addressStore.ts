import { create } from 'zustand';
import { api } from '../lib/api';

export type SellerAddress = {
  id: string;
  label: string;
  building_name: string | null;
  street: string | null;
  colony: string | null;
  city: string;
  pincode: string;
  city_code: string | null;
  pickup_locality: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
};

export type AddressDraft = {
  label: string;
  building_name: string;
  street: string;
  colony: string;
  city: string;
  pincode: string;
  city_code: string | null;
  pickup_locality: string;
  latitude: number | null;
  longitude: number | null;
};

type UpsertAddressPayload = {
  label: string;
  building_name?: string | null;
  street?: string | null;
  colony?: string | null;
  city: string;
  pincode: string;
  city_code?: string | null;
  pickup_locality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  set_as_default?: boolean;
};

interface AddressState {
  addresses: SellerAddress[];
  loading: boolean;
  error: string | null;
  draft: AddressDraft | null;

  fetchAddresses: () => Promise<void>;
  createAddress: (payload: UpsertAddressPayload) => Promise<{ success: boolean; error?: string; address?: SellerAddress }>;
  updateAddress: (addressId: string, payload: Partial<UpsertAddressPayload> & { is_default?: boolean }) => Promise<{ success: boolean; error?: string; address?: SellerAddress }>;
  deleteAddress: (addressId: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (addressId: string) => Promise<{ success: boolean; error?: string }>;
  setDraft: (draft: AddressDraft) => void;
  hydrateDraftFromAddress: (address: SellerAddress) => void;
  clearDraft: () => void;
}

const sortAddresses = (addresses: SellerAddress[]) =>
  [...addresses].sort((a, b) => {
    if (a.is_default === b.is_default) return 0;
    return a.is_default ? -1 : 1;
  });

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  loading: false,
  error: null,
  draft: null,

  fetchAddresses: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/api/sellers/addresses');
      const addresses = Array.isArray(res.data?.addresses) ? (res.data.addresses as SellerAddress[]) : [];
      set({ addresses: sortAddresses(addresses), loading: false, error: null });
    } catch (error: any) {
      set({ loading: false, error: error?.response?.data?.error || error?.message || 'Failed to fetch addresses' });
    }
  },

  createAddress: async (payload) => {
    try {
      const res = await api.post('/api/sellers/addresses', payload);
      const created = res.data as SellerAddress;
      set((state) => ({
        addresses: sortAddresses([
          ...state.addresses.filter((item) => item.id !== created.id),
          created,
        ]),
      }));
      return { success: true, address: created };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || error?.message || 'Failed to create address' };
    }
  },

  updateAddress: async (addressId, payload) => {
    try {
      const res = await api.patch(`/api/sellers/addresses/${addressId}`, payload);
      const updated = res.data as SellerAddress;
      set((state) => ({
        addresses: sortAddresses(state.addresses.map((item) => (item.id === addressId ? updated : item))),
      }));
      return { success: true, address: updated };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || error?.message || 'Failed to update address' };
    }
  },

  deleteAddress: async (addressId) => {
    try {
      await api.delete(`/api/sellers/addresses/${addressId}`);
      set((state) => ({ addresses: state.addresses.filter((item) => item.id !== addressId) }));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || error?.message || 'Failed to delete address' };
    }
  },

  setDefaultAddress: async (addressId) => {
    const response = await get().updateAddress(addressId, { is_default: true });
    if (!response.success) return { success: false, error: response.error };
    return { success: true };
  },

  setDraft: (draft) => set({ draft }),

  hydrateDraftFromAddress: (address) => {
    set({
      draft: {
        label: address.label || 'Home',
        building_name: address.building_name || '',
        street: address.street || '',
        colony: address.colony || '',
        city: address.city || '',
        pincode: address.pincode || '',
        city_code: address.city_code || null,
        pickup_locality: address.pickup_locality || '',
        latitude: address.latitude != null ? Number(address.latitude) : null,
        longitude: address.longitude != null ? Number(address.longitude) : null,
      },
    });
  },

  clearDraft: () => set({ draft: null }),
}));
