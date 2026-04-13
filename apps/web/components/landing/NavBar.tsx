/**
 * components/landing/NavBar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Responsive navigation bar for the public landing page.
 * Tokens: navy, surface, red, border from constants/tokens.ts.
 * ─────────────────────────────────────────────────────────────────
 */

import Link from 'next/link';
import { APP_NAME } from '../../constants/app';
import { DownloadButton } from './DownloadButton';

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur-sm border-b border-white/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" aria-label={`${APP_NAME} home`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red">
            <span className="text-white font-bold text-sm tracking-tight">S</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">{APP_NAME}</span>
          <span className="hidden sm:inline text-white/40 text-xs font-semibold uppercase tracking-widest ml-1 border border-white/10 px-1.5 py-0.5 rounded">
            Beta
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          <a href="#how-it-works" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            How It Works
          </a>
          <a href="#materials" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Materials
          </a>
          <a href="#pricing" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Live Prices
          </a>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="hidden sm:inline-flex items-center text-sm text-white/60 hover:text-white font-medium transition-colors"
          >
            Admin
          </Link>
          <DownloadButton size="sm" />
        </div>
      </div>
    </header>
  );
}
