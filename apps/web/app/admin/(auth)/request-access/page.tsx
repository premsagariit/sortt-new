'use client';

/**
 * app/admin/request-access/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin Request Access Page.
 * Matches design from: sortt_admin_auth_ui.html (Screen 2)
 * ─────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function RequestAccessPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorInfo({ message: 'Please enter your work email.' });
      return;
    }
    setErrorInfo(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrorInfo({ message: 'A request for this email already exists or is approved.' });
        } else {
          setErrorInfo({ message: data?.error || 'Failed to submit request.' });
        }
        return;
      }

      setSuccess(true);
    } catch {
      setErrorInfo({ message: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center py-12 px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-[460px] mx-auto">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center text-xl font-extrabold text-white font-mono shrink-0 mx-auto mb-4 tracking-tighter">S</div>
          <h1 className="text-[24px] font-extrabold text-navy tracking-[-0.03em] mb-1">Request Access</h1>
          <p className="text-[13px] text-muted">Admin panel operations</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-8 sm:p-10 shadow-[0_2px_24px_rgba(0,0,0,0.07)]">
          {!success ? (
            <>
              <div className="text-[14px] leading-[1.6] text-slate mb-8">
                Submit an access request. Once approved by a superadmin, you&apos;ll receive a link to set your password.
              </div>

              {errorInfo && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red/5 border border-red/20 text-red text-[12px] font-medium flex items-start gap-2">
                  <span className="mt-[1px]">✕</span>
                  <div>{errorInfo.message}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-[12px] font-semibold text-slate mb-1.5">Work Email Address</label>
                  <input
                    type="email"
                    placeholder="name@sortt.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-[14px] outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-navy text-white rounded-xl text-[14px] font-bold tracking-[0.02em] disabled:opacity-50 transition-colors mt-2"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-[40px] mb-6">✅</div>
              <div className="text-[18px] font-extrabold text-teal mb-2 tracking-[-0.02em]">Request Sent</div>
              <div className="text-[13px] text-slate leading-[1.6]">
                Your access request has been submitted to the administrative review queue.
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-[12px] text-muted">
          <Link href="/admin/login" className="text-navy font-semibold underline hover:no-underline">← Back to Login</Link>
        </div>

      </div>
    </div>
  );
}
