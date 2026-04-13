/**
 * components/landing/Footer.tsx
 * ─────────────────────────────────────────────────────────────────
 * Universal footer for the public landing page.
 * Tokens: navy, surface, muted, border, teal from constants/tokens.ts.
 * ─────────────────────────────────────────────────────────────────
 */

import Link from 'next/link';
import { APP_NAME, APP_DOMAIN } from '../../constants/app';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy border-t border-white/10" role="contentinfo">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-bold text-base tracking-tight">{APP_NAME}</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              India&apos;s scrap marketplace connecting sellers and verified aggregators.
            </p>
            <div className="text-white/40 text-sm leading-relaxed max-w-xs">
              📍 Headquarters: Gachibowli, Hyderabad, Telangana, India
            </div>
            <p className="text-white/30 text-xs mt-4">
              © {currentYear} {APP_NAME} · {APP_DOMAIN}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 col-span-1 md:col-span-2 gap-8 md:gap-10">
            {/* Platform */}
            <div className="space-y-4">
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Platform</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/#how-it-works" className="text-white/60 hover:text-white text-sm transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/#materials" className="text-white/60 hover:text-white text-sm transition-colors">
                    Material Types
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="text-white/60 hover:text-white text-sm transition-colors">
                    Live Prices
                  </Link>
                </li>
                <li>
                  <Link href="/#download" className="text-white/60 hover:text-white text-sm transition-colors">
                    Download App
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Support</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/help" className="text-white/60 hover:text-white text-sm transition-colors">
                    Help & Support
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white/60 hover:text-white text-sm transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/disputes" className="text-white/60 hover:text-white text-sm transition-colors">
                    Disputes & Complaints
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4 col-span-2 sm:col-span-1">
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Legal</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="#" className="text-white/60 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-white/60 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            Built for Hyderabad Pilot · v1 MVP · Made in India 🇮🇳
          </p>
          <div className="flex items-center gap-1.5 text-xs text-teal font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse inline-block" />
            Hyderabad Pilot · Live
          </div>
        </div>
      </div>
    </footer>
  );
}
