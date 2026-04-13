'use client';

/**
 * app/admin/(portal)/profile/page.tsx
 * Admin profile page — shows current admin's session metadata.
 */

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../../lib/adminApi';

interface AdminProfile {
  id: string;
  phone?: string;
  email?: string;
  user_type: string;
  created_at: string;
  full_name?: string;
  must_change_password?: boolean;
}

function InfoRow({ label, value, mono = false }: { label: string; value: string | undefined | null; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-4 border-b border-border last:border-0">
      <div className="w-40 flex-shrink-0 text-[11px] font-bold text-muted uppercase tracking-widest">{label}</div>
      <div className={`text-[14px] font-semibold text-navy ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-muted font-normal">—</span>}
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<AdminProfile>('/api/users/me')
      .then(setProfile)
      .catch((err: Error) => setError(err.message ?? 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : profile?.email
    ? profile.email.slice(0, 2).toUpperCase()
    : 'SA';

  const lastActive = (() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('lastActivity') : null;
    if (!raw) return null;
    return new Date(parseInt(raw)).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  })();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy tracking-tight">Admin Profile</h1>
        <p className="text-[13px] text-muted mt-1">Your account details and session information</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Hero band */}
        <div className="h-24 bg-gradient-to-r from-navy via-navySoft to-navy relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
        </div>

        {/* Avatar + name */}
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            {loading ? (
              <div className="w-16 h-16 rounded-2xl bg-border animate-pulse flex-shrink-0 border-4 border-white" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy to-navySoft flex items-center justify-center text-white font-black text-xl flex-shrink-0 border-4 border-white shadow-lg">
                {initials}
              </div>
            )}
            <div className="pb-1">
              {loading ? (
                <div className="space-y-1">
                  <div className="h-5 w-32 bg-border rounded animate-pulse" />
                  <div className="h-4 w-24 bg-border rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-[16px] font-bold text-navy">
                    {profile?.full_name ?? 'Admin User'}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber/10 border border-amber/20 text-amber text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Super Admin
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Profile fields */}
          <div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4 py-4 border-b border-border">
                    <div className="w-32 h-4 bg-border rounded animate-pulse" />
                    <div className="flex-1 h-4 bg-border rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <InfoRow label="User ID" value={profile?.id} mono />
                <InfoRow label="Email" value={profile?.email} />
                <InfoRow label="Phone" value={profile?.phone} />
                <InfoRow label="Role" value={profile?.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : undefined} />
                <InfoRow
                  label="Account Created"
                  value={profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })
                    : undefined}
                />
                <InfoRow label="Last Active" value={lastActive ?? 'This session'} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security panel */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-bg/40">
          <h2 className="text-[14px] font-bold text-navy">Security & Session</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-teal" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">Session Security</div>
                <div className="text-[11px] text-muted">15-minute inactivity timeout active</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-teal/10 text-teal text-[11px] font-bold rounded-full border border-teal/20">Active</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-navy" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">Login Method</div>
                <div className="text-[11px] text-muted">Email + password authentication</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-navy/10 text-navy text-[11px] font-bold rounded-full border border-navy/20">Email</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">Audit Logging</div>
                <div className="text-[11px] text-muted">All admin actions are permanently logged</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber/10 text-amber text-[11px] font-bold rounded-full border border-amber/20">Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
