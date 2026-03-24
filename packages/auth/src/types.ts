/**
 * IAuthProvider — Abstraction for authentication.
 * Critical (V24 + V-CLERK-1): Session DTO MUST NOT expose phone, phone_hash, or clerk_user_id.
 * Single implementation: ClerkAuthProvider (calls backend API, not Clerk SDK).
 */

/**
 * CRITICAL (V24 + V-CLERK-1):
 * Session MUST NOT include phone, phone_hash, or clerk_user_id.
 * Only exposed DTO fields: id, user_type.
 * Matches existing authStore contract.
 */
export interface Session {
  id: string;                                           // Internal user.id (UUID)
  user_type: 'seller' | 'aggregator' | 'admin' | null; // User type or null if not set
}

export interface IAuthProvider {
  /**
   * Initiate OTP flow for the given phone number.
   * Mode determines behavior: 'login' checks existence, 'signup' checks non-existence.
   */
  signInWithOTP(phone: string, mode: 'login' | 'signup'): Promise<void>;

  /**
   * Verify OTP and return Clerk token.
   */
  verifyOTP(phone: string, token: string): Promise<{ clerkToken: string }>;

  /**
   * Get current session (null if not authenticated).
   */
  getSession(): Promise<Session | null>;

  /**
   * Sign out current session.
   */
  signOut(): Promise<void>;

  /**
   * Listen for auth state changes.
   * Returns unsubscribe function.
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}
