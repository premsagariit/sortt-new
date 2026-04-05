'use client';

/**
 * app/admin/login/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin login using Email/Password (Replaces WhatsApp OTP).
 * Matches design from: sortt_admin_auth_ui.html
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { adminFetch } from '../../../lib/adminApi';

function setFallbackAdminToken(token: string) {
  const maxAge = 15 * 60;
  document.cookie = `admin_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; samesite=strict`;
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-navy flex items-center justify-center">
         <div className="text-white font-bold animate-pulse">Loading secure portal...</div>
       </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; attempts?: number; maxAttempts?: number } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const reason = searchParams.get('reason');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorInfo({ message: 'Please enter both email and password' });
      return;
    }
    setErrorInfo(null);
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorInfo({
          message: body?.message || (body?.error === 'not_admin'
            ? 'This account does not have admin access.'
            : body?.error || 'Login failed.'),
          attempts: body?.attempts,
          maxAttempts: body?.maxAttempts,
        });
        return;
      }

      const token = body?.token?.jwt;
      if (!token) {
        setErrorInfo({ message: 'Admin login did not return a session token.' });
        return;
      }

      sessionStorage.setItem('admin_token', token);
      setFallbackAdminToken(token);
      sessionStorage.setItem('lastActivity', String(Date.now()));

      const me = await adminFetch<{ must_change_password?: boolean; password_change_required?: boolean }>('/api/users/me');
      router.push((me?.must_change_password || me?.password_change_required) ? '/admin/create-password?mode=force' : '/admin');
    } catch (err: unknown) {
      console.error(err);
      setErrorInfo({ message: 'Login failed. Please check your connection and credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Left Panel */}
      <div className="w-full md:w-1/2 bg-navy p-10 md:p-16 flex flex-col relative overflow-hidden min-h-[400px] md:min-h-screen">
            <div className="absolute -right-[60px] -top-[60px] w-[240px] h-[240px] rounded-full bg-white/5" />
            <div className="absolute -left-[40px] -bottom-[40px] w-[180px] h-[180px] rounded-full bg-red/10" />
            
            <div className="flex items-center gap-3 mb-16 relative z-10">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                <NextImage src="/icon.png" alt="Sortt" fill className="object-cover" />
              </div>
              <div>
                <div className="text-[17px] font-bold text-white tracking-[-0.01em]">Sortt</div>
                <div className="text-[9px] font-bold text-white/40 tracking-[0.12em] uppercase">Admin Panel</div>
              </div>
            </div>

            <div className="text-[22px] font-extrabold text-white tracking-[-0.03em] leading-[1.25] mb-4 relative z-10">
              Operations<br />command centre.
            </div>
            
            <div className="text-[13px] text-white/50 leading-[1.6] flex-1 relative z-10">
              Manage KYC approvals, dispute resolution, price overrides, and flagged accounts — all from one secure panel.
            </div>

            <div className="flex flex-col gap-3 mt-8 relative z-10">
              <div className="flex items-center gap-3 text-[12px] text-white/55">
                <div className="w-7 h-7 bg-white/5 rounded flex items-center justify-center text-[13px] shrink-0">🪪</div>
                KYC queue management
              </div>
              <div className="flex items-center gap-3 text-[12px] text-white/55">
                <div className="w-7 h-7 bg-white/5 rounded flex items-center justify-center text-[13px] shrink-0">⚖️</div>
                Dispute resolution with 72h SLA
              </div>
              <div className="flex items-center gap-3 text-[12px] text-white/55">
                <div className="w-7 h-7 bg-white/5 rounded flex items-center justify-center text-[13px] shrink-0">💰</div>
                Manual price override with audit log
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 text-[11px] text-white/30 tracking-[0.06em] relative z-10">
              Hyderabad Pilot · v1 MVP
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-1/2 bg-white p-10 md:p-16 flex flex-col justify-center min-h-screen overflow-y-auto">
            
            {reason && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-amberLight border border-amber/20 text-[13px] font-medium flex items-start gap-2">
                <span className="mt-[2px]">🔒</span>
                <div>
                  {reason === 'timeout'
                    ? 'Your session expired due to inactivity.'
                    : reason === 'unauthorized'
                    ? 'This account does not have admin access.'
                    : 'Please sign in to continue.'}
                </div>
              </div>
            )}

            <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted mb-2">Admin Access Only</div>
            <div className="text-[22px] font-extrabold text-navy tracking-[-0.02em] mb-1">Sign in</div>
            <div className="text-[13px] text-slate leading-[1.6] mb-8">
              Use your admin email and password.<br />Not phone OTP — this panel is email-gated.
            </div>

            {errorInfo && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red/5 border border-red/20 text-red text-[12px] font-medium flex items-start gap-2">
                <span className="mt-[1px]">✕</span>
                <div>
                  {errorInfo.message}
                  {errorInfo.attempts !== undefined && errorInfo.maxAttempts !== undefined && (
                    <span> <strong>{errorInfo.attempts} of {errorInfo.maxAttempts} attempts used.</strong></span>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-slate mb-1.5">Email address</label>
                <input
                  type="email"
                  placeholder="admin@sortt.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-bg border ${errorInfo ? 'border-red' : 'border-border'} rounded-xl px-4 py-3 text-[14px] text-navy outline-none focus:border-navy transition-colors`}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-bg border ${errorInfo ? 'border-red' : 'border-border'} rounded-xl px-4 py-3 pr-10 text-[14px] text-navy outline-none focus:border-navy transition-colors`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted hover:text-navy"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 mb-2">
                <label className="flex items-center gap-1.5 text-[12px] text-slate cursor-pointer">
                  <input type="checkbox" className="rounded border border-border text-navy focus:ring-transparent" />
                  Remember this device
                </label>
                <Link href="/admin/forgot-password" className="text-[12px] font-semibold text-navy underline hover:no-underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-navy text-white rounded-xl text-[14px] font-bold tracking-[0.02em] disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Signing in...' : 'Sign in to Admin Panel →'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-border text-[10px] text-muted tracking-[0.04em]">
              <div className="flex items-center gap-1">🔒 IP verified</div>
              <div>· 10-attempt lockout</div>
              <div>· 15 min session</div>
            </div>

              <div className="mt-8 text-center text-[12px] text-muted">
              Don&apos;t have access? <Link href="/admin/request-access" className="text-navy font-semibold underline hover:no-underline">Request admin access</Link>
            </div>
        </div>
    </div>
  );
}
