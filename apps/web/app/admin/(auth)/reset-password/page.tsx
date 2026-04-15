'use client';

/**
 * app/admin/reset-password/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin Reset Password Page.
 * Matches design from: sortt_admin_auth_ui.html (Screen 4)
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BoneyardBlock } from '@/components/ui/Boneyard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center py-12 px-4">
        <BoneyardBlock className="h-5 w-36" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token && !success) {
      setErrorInfo({ message: 'Invalid or missing reset token.' });
    }
  }, [token, success]);

  // Password Validation
  const hasMinLen = password.length >= 12;
  const hasNum = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!hasMinLen || !hasNum || !hasSpecial) {
      setErrorInfo({ message: 'Password does not meet the complexity requirements.' });
      return;
    }

    if (password !== confirmPassword) {
      setErrorInfo({ message: 'Passwords do not match.' });
      return;
    }

    setErrorInfo(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorInfo({ message: data?.error || 'Failed to reset password.' });
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);
    } catch {
      setErrorInfo({ message: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center py-12 px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="w-full max-w-[460px] mx-auto mt-16">
          <div className="bg-tealLight border border-teal rounded-2xl p-10 text-center shadow-[0_2px_24px_rgba(0,0,0,0.07)]">
            <div className="text-[40px] mb-6">🔑</div>
            <div className="text-[18px] font-extrabold text-teal mb-2 tracking-[-0.02em]">Password Updated</div>
            <div className="text-[13px] text-slate leading-[1.6] mb-8">
              Your admin password has been successfully reset. You can now use it to sign in.
            </div>
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full py-3.5 bg-teal text-white rounded-xl text-[14px] font-bold tracking-[0.02em] transition-colors"
            >
              Go to Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center py-12 px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-[460px] mx-auto">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center text-xl font-extrabold text-white font-mono shrink-0 mx-auto mb-4 tracking-tighter">S</div>
          <h1 className="text-[24px] font-extrabold text-navy tracking-[-0.03em] mb-1">Set New Password</h1>
          <p className="text-[13px] text-muted">Choose a strong password</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-8 sm:p-10 shadow-[0_2px_24px_rgba(0,0,0,0.07)]">
          {errorInfo && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red/5 border border-red/20 text-red text-[12px] font-medium flex items-start gap-2">
              <span className="mt-[1px]">✕</span>
              <div>{errorInfo.message}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-[12px] font-semibold text-slate mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 pr-10 text-[14px] outline-none transition-colors"
                  disabled={!token}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted hover:text-navy"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>

              {/* Password Strength display matches UI spec */}
              <div className="mt-2.5">
                <div className="flex gap-1 mb-1.5">
                  <div className={`flex-1 h-1 rounded ${password.length > 0 ? (hasMinLen && hasNum && hasSpecial ? 'bg-teal' : 'bg-red') : 'bg-border'}`} />
                  <div className={`flex-1 h-1 rounded ${password.length >= 8 ? (hasMinLen && hasNum && hasSpecial ? 'bg-teal' : 'bg-amber') : 'bg-border'}`} />
                  <div className={`flex-1 h-1 rounded ${hasMinLen && hasNum && Boolean(hasSpecial) ? 'bg-teal' : 'bg-border'}`} />
                </div>
                
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className={`text-[11px] flex items-center gap-1.5 ${hasMinLen ? 'text-teal' : 'text-muted'}`}>
                    <span>{hasMinLen ? '✓' : '○'}</span> At least 12 characters
                  </div>
                  <div className={`text-[11px] flex items-center gap-1.5 ${hasNum ? 'text-teal' : 'text-muted'}`}>
                    <span>{hasNum ? '✓' : '○'}</span> Contains a number
                  </div>
                  <div className={`text-[11px] flex items-center gap-1.5 ${hasSpecial ? 'text-teal' : 'text-muted'}`}>
                    <span>{hasSpecial ? '✓' : '○'}</span> Contains a special character (!@#$)
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-[12px] font-semibold text-slate mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-[14px] outline-none transition-colors"
                disabled={!token}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3.5 bg-navy text-white rounded-xl text-[14px] font-bold tracking-[0.02em] disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Updating...' : 'Set Password and Login'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
