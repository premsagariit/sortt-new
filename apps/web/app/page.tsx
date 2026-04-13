/**
 * app/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Public Landing Page — 9 sections exactly.
 * Static render (no 'use client' on the page itself).
 * All tokens sourced from constants/tokens.ts via Tailwind classes.
 * Brand constants from constants/app.ts.
 *
 * Sections:
 *  1. Navigation Bar
 *  2. Hero
 *  3. Social Proof Strip
 *  4. How It Works (Seller)
 *  5. How It Works (Aggregator)
 *  6. Material Types
 *  7. Price Transparency
 *  8. Download Section
 *  9. Footer
 * ─────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import { NavBar } from '../components/landing/NavBar';
import { Footer } from '../components/landing/Footer';
import { MaterialCard } from '../components/landing/MaterialCard';
import { HeroIllustration } from '../components/landing/HeroIllustration';
import { PriceTicker } from '../components/landing/PriceTicker';
import { DownloadButton } from '../components/landing/DownloadButton';
import { FadeIn, StaggerContainer, StaggerItem, ParallaxHero } from '../components/landing/Animations';
import { APP_NAME, APP_TAGLINE, APP_CONFIG } from '../constants/app';

export const metadata: Metadata = {
  title: `${APP_NAME} — India's Scrap Marketplace`,
  description: `${APP_NAME} connects scrap sellers with verified aggregators in Hyderabad. Fair prices, transparent pickups, trusted matching. Download the app today.`,
  keywords: ['scrap', 'scrap dealer', 'kabadiwala', 'Hyderabad', 'scrap pickup', 'recycling'],
  openGraph: {
    title: `${APP_NAME} — India's Scrap Marketplace`,
    description: 'Fair prices. Verified pickers. Trusted pickups — all in one app.',
    type: 'website',
  },
};

// ─────────────────────────────────────────────────────────────────
// Section 3 — Social Proof Strip data
// ─────────────────────────────────────────────────────────────────
const SOCIAL_PROOF = [
  { value: '500+', label: 'Sellers onboarded' },
  { value: '120+', label: 'Verified aggregators' },
  { value: '2,400+', label: 'Pickups completed' },
  { value: '₹18L+', label: 'Paid to sellers' },
];

// ─────────────────────────────────────────────────────────────────
// Section 4 — How It Works (Seller) steps
// ─────────────────────────────────────────────────────────────────
const SELLER_STEPS = [
  {
    step: '01',
    title: 'List your scrap',
    body: 'Open the app, choose your material type, enter estimated weight, and upload a quick photo. Done in under 2 minutes.',
  },
  {
    step: '02',
    title: 'Get matched instantly',
    body: 'Our engine matches you with a verified local aggregator who handles your material. No cold calls, no negotiation haggling.',
  },
  {
    step: '03',
    title: 'Pickup & get paid',
    body: 'The aggregator arrives in your scheduled window. Weight is confirmed on-site. OTP closes the order. Simple.',
  },
];

// ─────────────────────────────────────────────────────────────────
// Section 5 — How It Works (Aggregator) steps
// ─────────────────────────────────────────────────────────────────
const AGGREGATOR_STEPS = [
  {
    step: '01',
    title: 'Set your service area',
    body: 'Define the Hyderabad zones and material categories you cover. Orders outside your scope never reach you.',
  },
  {
    step: '02',
    title: 'Accept from your feed',
    body: 'Browse a structured order feed with address, photo, estimated weight, and fair-rate breakdown — no surprises.',
  },
  {
    step: '03',
    title: 'Complete & confirm',
    body: 'Weigh on-site, capture the OTP from the seller, and mark complete. Your rating history builds from here.',
  },
];

export default function RootPage() {
  return (
    <main className="min-h-screen bg-bg text-navy" data-app={APP_CONFIG.APP_SLUG}>

      {/* ── Section 1: Navigation Bar ─────────────────────────── */}
      <NavBar />

      {/* ── Section 2: Hero ───────────────────────────────────── */}
      <section
        className="relative bg-navy px-6 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Background texture */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal/5 rounded-full blur-3xl" />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-6xl items-center gap-12 md:grid-cols-2 grid">
          {/* Left copy */}
          <FadeIn direction="right" className="space-y-7 order-2 md:order-1">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" aria-hidden="true" />
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                {APP_TAGLINE}
              </span>
            </div>

            <h1
              id="hero-heading"
              className="text-4xl md:text-5xl lg:text-[56px] font-extrabold text-white leading-[1.1] tracking-tight"
            >
              Fair scrap pickups.
              <br />
              <span className="text-red">Transparent prices.</span>
              <br />
              Trusted every time.
            </h1>

            <p className="text-white/60 text-lg leading-relaxed max-w-lg">
              {APP_NAME} connects Hyderabad sellers and verified aggregators with structured orders, live rates, and OTP-confirmed pickups.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <DownloadButton size="lg" />
              <a
                href="#how-it-works"
                className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-btn border border-white/20 px-8 text-base font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all"
              >
                See how it works ↓
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { icon: '🪪', text: 'KYC-verified aggregators' },
                { icon: '🔒', text: 'OTP-confirmed pickups' },
                { icon: '⚖️', text: 'Live transparent rates' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-white/50 text-xs font-medium">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Right illustration */}
          <ParallaxHero>
            <div className="order-1 md:order-2 flex justify-center md:justify-end">
              <HeroIllustration />
            </div>
          </ParallaxHero>
        </div>
      </section>

      {/* ── Section 3: Social Proof Strip ─────────────────────── */}
      <section
        className="bg-surface border-y border-border py-8"
        aria-label="Platform statistics"
      >
        <div className="mx-auto w-full max-w-6xl px-6">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {SOCIAL_PROOF.map(({ value, label }) => (
              <StaggerItem key={label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-navy font-mono tracking-tight">
                  {value}
                </div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">
                  {label}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Section 4: How It Works (Seller) ──────────────────── */}
      <section
        id="how-it-works"
        className="bg-bg px-6 py-16 md:py-20"
        aria-labelledby="seller-how-heading"
      >
        <FadeIn className="mx-auto w-full max-w-6xl">
          <div className="mb-3 inline-flex items-center gap-2 bg-tealLight border border-teal/20 rounded-full px-3 py-1">
            <span className="text-teal text-[10px] font-bold uppercase tracking-widest">For Sellers</span>
          </div>
          <h2
            id="seller-how-heading"
            className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight mb-3"
          >
            Sell your scrap in 3 steps
          </h2>
          <p className="text-slate text-base max-w-xl mb-10">
            No bargaining, no uncertainty — just a straightforward pickup at a fair price.
          </p>

          <StaggerContainer className="grid gap-6 md:grid-cols-3">
            {SELLER_STEPS.map(({ step, title, body }) => (
              <StaggerItem key={step}>
                <article
                  className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full"
                >
                  <div className="absolute top-4 right-4 font-mono text-5xl font-extrabold text-teal/8 pointer-events-none select-none">
                    {step}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-tealLight flex items-center justify-center mb-5">
                    <span className="font-mono text-sm font-extrabold text-teal">{step}</span>
                  </div>
                  <h3 className="text-[17px] font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-slate leading-relaxed">{body}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>
      </section>

      {/* ── Section 5: How It Works (Aggregator) ──────────────── */}
      <section
        className="bg-surface border-y border-border px-6 py-16 md:py-20"
        aria-labelledby="aggregator-how-heading"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-3 inline-flex items-center gap-2 bg-amberLight border border-amber/20 rounded-full px-3 py-1">
            <span className="text-amber text-[10px] font-bold uppercase tracking-widest">For Aggregators</span>
          </div>
          <h2
            id="aggregator-how-heading"
            className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight mb-3"
          >
            Run a smarter pickup business
          </h2>
          <p className="text-slate text-base max-w-xl mb-10">
            Structured orders, fair rate transparency, and a trust layer built on KYC and ratings.
          </p>

          <StaggerContainer className="grid gap-6 md:grid-cols-3">
            {AGGREGATOR_STEPS.map(({ step, title, body }) => (
              <StaggerItem key={step}>
                <article
                  className="bg-bg border border-border rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full"
                >
                  <div className="absolute top-4 right-4 font-mono text-5xl font-extrabold text-amber/8 pointer-events-none select-none">
                    {step}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amberLight flex items-center justify-center mb-5">
                    <span className="font-mono text-sm font-extrabold text-amber">{step}</span>
                  </div>
                  <h3 className="text-[17px] font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-slate leading-relaxed">{body}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Aggregator benefits pills */}
          <div className="mt-10 flex flex-wrap gap-3">
            {[
              '🪪 KYC onboarding',
              '⭐ Rating protection',
              '📍 Zone-based routing',
              '💬 In-app coordination',
              '📊 Order history',
            ].map((benefit) => (
              <span
                key={benefit}
                className="inline-flex items-center gap-1.5 bg-surface border border-border rounded-full px-4 py-1.5 text-sm text-slate font-medium"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Material Types ──────────────────────────── */}
      <section
        id="materials"
        className="bg-bg px-6 py-16 md:py-20"
        aria-labelledby="materials-heading"
      >
        <FadeIn className="mx-auto w-full max-w-6xl">
          <h2
            id="materials-heading"
            className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight mb-3"
          >
            We handle all scrap types
          </h2>
          <p className="text-slate text-base max-w-xl mb-10">
            From everyday household recyclables to appliances — our aggregators are categorised and verified per material type.
          </p>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StaggerItem>
              <MaterialCard
                type="metal"
                label="Metal & Iron"
                description="Iron rods, steel utensils, copper wiring, aluminium cans. Best rates for bulk metal."
                emoji="🔩"
                priceIndicator="₹32–480/kg"
              />
            </StaggerItem>
            <StaggerItem>
              <MaterialCard
                type="paper"
                label="Paper & Cardboard"
                description="Newspapers, magazines, cardboard boxes, office paper — household staple recycling."
                emoji="📰"
                priceIndicator="₹12/kg"
              />
            </StaggerItem>
            <StaggerItem>
              <MaterialCard
                type="plastic"
                label="Plastic Waste"
                description="PET bottles, buckets, hard containers, polypropylene. Grades sorted by colour."
                emoji="🧴"
                priceIndicator="₹8–18/kg"
              />
            </StaggerItem>
            <StaggerItem>
              <MaterialCard
                type="ewaste"
                label="E-Waste"
                description="Old mobiles, laptops, circuit boards, batteries. Handled by certified e-waste partners."
                emoji="📱"
                priceIndicator="₹50–800/pc"
              />
            </StaggerItem>
            <StaggerItem>
              <MaterialCard
                type="fabric"
                label="Fabric & Clothes"
                description="Old cotton garments, torn curtains, fabric offcuts. Textile recycling at your doorstep."
                emoji="👕"
                priceIndicator="₹8/kg"
              />
            </StaggerItem>
            <StaggerItem>
              <MaterialCard
                type="glass"
                label="Glass"
                description="Glass bottles, broken panes, jar collections. Pickup minimum 5 kg applies."
                emoji="🍶"
                priceIndicator="₹3/kg"
              />
            </StaggerItem>
          </StaggerContainer>
        </FadeIn>
      </section>

      {/* ── Section 7: Price Transparency ─────────────────────── */}
      <section
        id="pricing"
        className="bg-surface border-y border-border px-6 py-16 md:py-20"
        aria-labelledby="pricing-heading"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <FadeIn direction="right">
              <div className="mb-3 inline-flex items-center gap-2 bg-amberLight border border-amber/20 rounded-full px-3 py-1">
                <span className="text-amber text-[10px] font-bold uppercase tracking-widest">Price Transparency</span>
              </div>
              <h2
                id="pricing-heading"
                className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight mb-4"
              >
                No surprises.<br />Ever.
              </h2>
              <p className="text-slate text-base leading-relaxed mb-6">
                Every seller sees indicative scrap rates before scheduling a pickup. Aggregators see the same numbers. The price is locked when the order is accepted — not haggled at the door.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: '📊', text: 'Rates updated daily from market benchmarks' },
                  { icon: '🔒', text: 'Price locked at order acceptance' },
                  { icon: '⚖️', text: 'Final payout based on verified on-site weight' },
                  { icon: '📝', text: 'Full transaction history in-app' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate">
                    <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn direction="left">
              <PriceTicker />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Section 8: Download Section ────────────────────────── */}
      <section
        id="download"
        className="relative bg-navy px-6 py-20 md:py-28 overflow-hidden"
        aria-labelledby="download-heading"
      >
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-red/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <FadeIn className="relative mx-auto w-full max-w-3xl text-center">
          <div className="text-5xl mb-6">📱</div>
          <h2
            id="download-heading"
            className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4"
          >
            {APP_NAME} is coming to your phone
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Android and iOS apps are in final testing. Join the waitlist and be first to get notified when we launch in your area.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <DownloadButton size="lg" label="Get it on Android" />
            <DownloadButton size="lg" variant="outline" label="Get it on iOS" />
          </div>

          {/* App store logos (placeholder badges) */}
          <div className="mt-10 flex items-center justify-center gap-6 opacity-40">
            <div className="flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm font-medium">
              <span className="text-xl">🤖</span>
              <div className="text-left">
                <div className="text-[9px] opacity-70 uppercase tracking-wider">Get it on</div>
                <div className="font-bold text-sm leading-tight">Google Play</div>
              </div>
            </div>
            <div className="flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm font-medium">
              <span className="text-xl">🍎</span>
              <div className="text-left">
                <div className="text-[9px] opacity-70 uppercase tracking-wider">Download on the</div>
                <div className="font-bold text-sm leading-tight">App Store</div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-white/30 text-xs">
            Hyderabad pilot · Available on Android 10+ and iOS 15+
          </p>
        </FadeIn>
      </section>

      {/* ── Section 9: Footer ──────────────────────────────────── */}
      <Footer />
    </main>
  );
}
