import type { IAuthProvider } from './types';
import { JwtAuthProvider } from './providers/JwtAuthProvider';

export { IAuthProvider, Session } from './types';
export { JwtAuthProvider } from './providers/JwtAuthProvider';

/**
 * Factory function to create auth provider.
 * Uses custom JWT-based auth (jose) — no third-party auth SDK.
 */
export function createAuthProvider(baseUrl?: string): IAuthProvider {
  return new JwtAuthProvider(baseUrl);
}
