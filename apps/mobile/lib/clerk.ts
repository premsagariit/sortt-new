import * as SecureStore from 'expo-secure-store';

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used \uD83D\uDD10 \n`);
      } else {
        console.log('No values stored under key: ' + key);
      }
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isTestPublishableKey = clerkPublishableKey?.startsWith('pk_test_') ?? false;

if (!clerkPublishableKey) {
  console.warn('⚠️ Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
  console.log('Available env keys:', Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC_')));
}

if (!__DEV__ && isTestPublishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY uses a test key in production build. Replace with a pk_live_ key.');
}
