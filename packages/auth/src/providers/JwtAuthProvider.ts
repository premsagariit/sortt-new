import { IAuthProvider, Session } from '../types';

/**
 * JwtAuthProvider — IAuthProvider implementation for custom JWT auth.
 * Calls backend API endpoints only; no third-party auth SDK required.
 *
 * Routes used:
 *  POST /api/auth/request-otp  — initiate OTP
 *  POST /api/auth/verify-otp   — verify OTP, receive { token: { jwt } }
 *  GET  /api/users/me          — load current session from DB
 *  (sign-out is local-only — JWT expires server-side)
 */
export class JwtAuthProvider implements IAuthProvider {
  private baseUrl: string;
  private currentSession: Session | null = null;

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  async signInWithOTP(phone: string, mode: 'login' | 'signup'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, mode }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || `signInWithOTP failed: ${response.status}`);
    }
  }

  async verifyOTP(phone: string, otp: string): Promise<{ jwt: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || `verifyOTP failed: ${response.status}`);
    }

    const data = (await response.json()) as { token?: { jwt?: string } };
    const jwt = data?.token?.jwt;
    if (!jwt) {
      throw new Error('verifyOTP failed: missing jwt in response');
    }
    return { jwt };
  }

  async getSession(): Promise<Session | null> {
    // Session is managed by the mobile authStore / web sessionStorage.
    // This method is a convenience shim for test consumers.
    return this.currentSession;
  }

  setSession(session: Session | null): void {
    this.currentSession = session;
  }

  async signOut(): Promise<void> {
    // No server call needed — JWT expires naturally.
    // Caller is responsible for deleting the token from SecureStore / sessionStorage.
    this.currentSession = null;
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    // No-op: state changes are driven by Zustand store in mobile and
    // by cookie expiry checks in the web middleware.
    void callback; // satisfy TypeScript usage
    return () => {};
  }
}
