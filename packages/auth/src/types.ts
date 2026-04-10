/**
 * packages/auth/src/types.ts
 * ─────────────────────────────────────────────────────────────────
 * IAuthProvider abstraction for custom JWT-based authentication.
 * Session DTO MUST NOT expose phone, phone_hash, or any PII.
 * Only exposed fields: id (internal UUID), user_type.
 * ─────────────────────────────────────────────────────────────────
 */

export interface Session {
  id: string;                                           // Internal users.id (UUID)
  user_type: 'seller' | 'aggregator' | 'admin' | null; // null if type not yet set
}

export interface IAuthProvider {
  /**
   * Initiate OTP flow for the given phone number.
   * Mode: 'login' checks existence, 'signup' checks non-existence.
   */
  signInWithOTP(phone: string, mode: 'login' | 'signup'): Promise<void>;

  /**
   * Verify OTP and return the custom JWT issued by the backend.
   */
  verifyOTP(phone: string, otp: string): Promise<{ jwt: string }>;

  /**
   * Get current session (null if not authenticated).
   */
  getSession(): Promise<Session | null>;

  /**
   * Sign out — clears local session state.
   */
  signOut(): Promise<void>;

  /**
   * Listen for auth state changes.
   * Returns unsubscribe function.
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}
