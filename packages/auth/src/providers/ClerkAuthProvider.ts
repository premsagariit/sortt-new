import { IAuthProvider, Session } from '../types';

/**
 * Clerk implementation of IAuthProvider.
 * CRITICAL: This is a BACKEND-ONLY provider that calls Clerk APIs via backend routes.
 * Mobile apps should call backend endpoints, not use this directly.
 * Backend server calls Clerk SDK (@clerk/clerk-sdk-node) internally.
 */
export class ClerkAuthProvider implements IAuthProvider {
  private baseUrl: string;
  private currentSession: Session | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async signInWithOTP(phone: string, mode: 'login' | 'signup'): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/signin/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, mode }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || `signInWithOTP failed: ${response.status}`);
      }
    } catch (error) {
      console.error('ClerkAuthProvider.signInWithOTP() failed', { phone, mode, error });
      throw error;
    }
  }

  async verifyOTP(phone: string, token: string): Promise<{ clerkToken: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, token }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || `verifyOTP failed: ${response.status}`);
      }

      const data = (await response.json()) as { clerkToken?: string };
      if (!data.clerkToken) {
        throw new Error('verifyOTP failed: missing clerkToken in response');
      }
      return { clerkToken: data.clerkToken };
    } catch (error) {
      console.error('ClerkAuthProvider.verifyOTP() failed', { phone, error });
      throw error;
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      // In browser/mobile: call backend endpoint that returns session
      // In server: fetch from Clerk directly via SDK
      const response = await fetch(`${this.baseUrl}/api/auth/session`, {
        method: 'GET',
        credentials: 'include', // Send cookies
      });

      if (response.status === 401) {
        this.currentSession = null;
        return null;
      }

      if (!response.ok) {
        throw new Error(`getSession failed: ${response.status}`);
      }

      const data = (await response.json()) as { id: string; user_type: 'seller' | 'aggregator' | 'admin' | null };
      this.currentSession = {
        id: data.id,
        user_type: data.user_type,
      };
      return this.currentSession;
    } catch (error) {
      console.error('ClerkAuthProvider.getSession() failed', { error });
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });
      this.currentSession = null;
    } catch (error) {
      console.error('ClerkAuthProvider.signOut() failed', { error });
      throw error;
    }
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    // Placeholder for real implementation
    // In mobile: use Expo AppState listeners
    // In web: use window focus/blur events
    console.log('ClerkAuthProvider.onAuthStateChange() registered');

    return () => {
      console.log('ClerkAuthProvider auth state listener removed');
    };
  }
}
