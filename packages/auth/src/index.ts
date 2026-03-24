import type { IAuthProvider } from './types';
import { ClerkAuthProvider } from './providers/ClerkAuthProvider';

export { IAuthProvider, Session } from './types';
export { ClerkAuthProvider } from './providers/ClerkAuthProvider';

/**
 * Factory function to create auth provider.
 * Currently only Clerk is supported.
 */
export function createAuthProvider(baseUrl?: string): IAuthProvider {
  return new ClerkAuthProvider(baseUrl);
}
