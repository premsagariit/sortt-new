'use client';

/**
 * app/admin/(portal)/profile/page.tsx
 * Admin profile page — shows current admin's session metadata.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { adminFetch } from '../../../../lib/adminApi';
import { BoneyardProfileSection } from '@/components/ui/Boneyard';

interface AdminProfile {
  id: string;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  display_phone?: string | null;
  email?: string | null;
  user_type: string;
  created_at: string;
  preferred_language?: string | null;
  profile_photo_url?: string | null;
  photo_url?: string | null;
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    adminFetch<AdminProfile>('/api/users/me')
      .then(setProfile)
      .catch((err: Error) => setError(err.message ?? 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const displayName = profile?.full_name ?? profile?.name ?? null;
  const displayPhone = profile?.phone ?? profile?.display_phone ?? null;
  const displayPhoto = profile?.profile_photo_url ?? profile?.photo_url ?? null;

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError('');

    try {
      const token = typeof window !== 'undefined'
        ? (window.sessionStorage.getItem('admin_token') ||
          document.cookie
            .split('; ')
            .find((part) => part.startsWith('admin_token='))
            ?.split('=')[1] || '')
        : '';

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/users/profile-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to upload profile image');
      }

      const payload = await response.json();
      setProfile((prev) => prev ? {
        ...prev,
        profile_photo_url: payload?.profile_photo_url ?? prev.profile_photo_url,
      } : prev);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload profile image');
    } finally {
      setUploadingPhoto(false);
      if (event.target) event.target.value = '';
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : profile?.name
    ? profile.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
          {loading ? (
            <BoneyardProfileSection />
          ) : (
            <>
              <div className="flex items-end gap-4 -mt-8 mb-4">
                {displayPhoto ? (
                  <Image
                    src={displayPhoto}
                    alt="Admin Profile"
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border-4 border-white shadow-lg"
                    unoptimized
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy to-navySoft flex items-center justify-center text-white font-black text-xl flex-shrink-0 border-4 border-white shadow-lg">
                    {initials}
                  </div>
                )}
                <div className="pb-1">
                  <div className="text-[16px] font-bold text-navy">
                    {displayName ?? 'Admin User'}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber/10 border border-amber/20 text-amber text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Super Admin
                  </span>
                </div>
                <div className="ml-auto pb-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleProfilePhotoChange}
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold text-navy hover:bg-bg disabled:opacity-50"
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Update Photo'}
                  </button>
                </div>
              </div>

              <div>
                <InfoRow label="User ID" value={profile?.id} mono />
                <InfoRow label="Email" value={profile?.email} />
                <InfoRow label="Phone" value={displayPhone} />
                <InfoRow label="Role" value={profile?.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : undefined} />
                <InfoRow label="Preferred Language" value={profile?.preferred_language?.toUpperCase() ?? 'EN'} />
                <InfoRow label="Password Change Required" value={profile?.must_change_password ? 'Yes' : 'No'} />
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
            </>
          )}
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
