/**
 * app/page.tsx — Web Portal Login
 * ─────────────────────────────────────────────────────────────────
 * Simplified login for Business Portal.
 * Sourced from sortt_ui.html (Web Mockup)
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Warning, Globe } from 'phosphor-react';
import { SorttLogo } from '../components/ui/SorttLogo';

const UserIcon = User as any;
const LockIcon = Lock as any;
const ArrowRightIcon = ArrowRight as any;
const WarningIcon = Warning as any;
const GlobeIcon = Globe as any;

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Mock routing:
        // admin@sortt.in -> /admin
        // any other -> /aggregator
        setTimeout(() => {
            if (email === 'admin@sortt.in') {
                router.push('/admin');
            } else {
                router.push('/aggregator');
            }
        }, 800);
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-bg p-token-md">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-token-xl">
                    <div className="w-16 h-16 bg-navy rounded-card flex items-center justify-center mb-token-sm shadow-sm">
                        <span className="text-surface font-bold text-2xl">S</span>
                    </div>
                    <h1 className="text-2xl font-bold text-navy tracking-tight">Business Portal</h1>
                    <p className="text-muted text-sm mt-1">Manage your scrap business operations</p>
                </div>

                {/* Login Card */}
                <div className="bg-surface border border-border rounded-card p-token-xl shadow-sm">
                    <form onSubmit={handleLogin} className="space-y-token-lg">
                        <div>
                            <label className="block text-xs font-bold text-slate uppercase tracking-wider mb-2">
                                Work Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon size={18} className="text-muted" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-input text-navy text-sm focus:ring-1 focus:ring-navy focus:border-navy transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockIcon size={18} className="text-muted" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-input text-navy text-sm focus:ring-1 focus:ring-navy focus:border-navy transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-navy text-surface py-3 px-4 rounded-btn font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate transition-colors active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? (
                                'Authenticating...'
                            ) : (
                                <>
                                    <span className="font-bold">Sign In</span>
                                    <ArrowRightIcon size={20} weight="bold" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-token-lg pt-token-lg border-t border-border flex items-center justify-between">
                        <button className="text-xs text-muted hover:text-navy transition-colors">
                            Forgot password?
                        </button>
                        <button className="text-xs text-muted hover:text-navy transition-colors">
                            Request Access
                        </button>
                    </div>
                </div>

                <p className="text-center text-[10px] text-muted mt-token-xl uppercase tracking-widest font-mono">
                    &copy; 2026 Sortt Technologies Pvt Ltd.
                </p>
            </div>
        </main>
    );
}
