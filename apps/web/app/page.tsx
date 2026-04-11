import Link from 'next/link';
import { SorttLogo } from '../components/ui/SorttLogo';
import { APP_CONFIG, APP_NAME, APP_SLUG, APP_TAGLINE } from '../constants/app';

export default function RootPage() {
    return (
        <main className="min-h-screen bg-bg text-navy" data-app={APP_SLUG}>
            <nav className="bg-navy px-6 py-4">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
                    <SorttLogo variant="compact-dark" size={132} />
                    <Link
                        href="/admin/login"
                        className="inline-flex min-h-[48px] items-center justify-center rounded-btn border border-surface px-5 text-sm font-bold text-surface transition hover:bg-surface hover:text-navy"
                    >
                        Admin Login
                    </Link>
                </div>
            </nav>

            <section className="bg-bg px-6 py-12 md:py-16">
                <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-2">
                    <div className="space-y-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{APP_TAGLINE}</p>
                        <h1 className="text-4xl font-bold leading-tight text-navy md:text-5xl">
                            Fair and trusted scrap pickups for every seller and aggregator.
                        </h1>
                        <p className="max-w-xl text-base leading-relaxed text-slate md:text-lg">
                            {APP_NAME} helps Hyderabad sellers and aggregators complete more orders with transparent prices,
                            verified matching, and faster pickup coordination.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="#"
                                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-btn bg-red px-6 text-base font-bold text-surface transition hover:opacity-90 sm:w-auto"
                            >
                                Download App
                            </Link>
                            <Link
                                href="/admin/login"
                                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-btn border border-border bg-surface px-6 text-base font-bold text-navy transition hover:bg-bg sm:w-auto"
                            >
                                Admin Login
                            </Link>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-md">
                        <div className="rounded-card border border-border bg-surface p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-card border border-border bg-surface2 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-teal">Seller</p>
                                    <p className="mt-2 text-sm font-medium text-slate">List materials, schedule pickup</p>
                                </div>
                                <div className="rounded-card border border-border bg-surface2 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber">Aggregator</p>
                                    <p className="mt-2 text-sm font-medium text-slate">Accept orders, complete pickup</p>
                                </div>
                            </div>
                            <div className="mt-4 rounded-card border border-border bg-bg p-4">
                                <p className="text-sm font-semibold text-navy">Real-time matching across one city network</p>
                                <p className="mt-2 text-sm text-muted">Built for {APP_CONFIG.APP_DOMAIN}</p>
                            </div>
                        </div>
                        <div className="pointer-events-none absolute -left-5 -top-6 h-20 w-20 -rotate-6 rounded-card border border-border bg-tealLight" />
                        <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rotate-6 rounded-card border border-border bg-amberLight" />
                    </div>
                </div>
            </section>

            <section className="bg-surface px-6 py-12 md:py-16">
                <div className="mx-auto w-full max-w-6xl">
                    <h2 className="text-3xl font-bold text-navy">How it works</h2>
                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                        <article className="rounded-card border border-border bg-surface p-6">
                            <p className="font-mono text-lg font-bold text-red">01</p>
                            <h3 className="mt-3 text-xl font-bold text-navy">List your scrap</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate">
                                Sellers add material types, upload a photo, and set a preferred pickup window.
                            </p>
                        </article>
                        <article className="rounded-card border border-border bg-surface p-6">
                            <p className="font-mono text-lg font-bold text-red">02</p>
                            <h3 className="mt-3 text-xl font-bold text-navy">Get matched with a verified aggregator</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate">
                                Orders are routed to verified local aggregators who handle the selected material categories.
                            </p>
                        </article>
                        <article className="rounded-card border border-border bg-surface p-6">
                            <p className="font-mono text-lg font-bold text-red">03</p>
                            <h3 className="mt-3 text-xl font-bold text-navy">Confirm pickup and get paid</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate">
                                Pickup is completed with weight confirmation and OTP verification for trusted closure.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="bg-bg px-6 py-12 md:py-16">
                <div className="mx-auto w-full max-w-6xl">
                    <h2 className="text-3xl font-bold text-navy">Built for two audiences</h2>
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <article className="rounded-card border border-border bg-surface p-6">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-chip bg-tealLight text-sm font-bold text-teal">S</div>
                            <h3 className="mt-4 text-2xl font-bold text-navy">I want to sell scrap</h3>
                            <ul className="mt-4 space-y-3 text-sm text-slate">
                                <li>Convenient pickups with fair prices and less negotiation friction.</li>
                                <li>Simple mobile flow designed for occasional household or office transactions.</li>
                            </ul>
                        </article>

                        <article className="rounded-card border border-border bg-surface p-6">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-chip bg-amberLight text-sm font-bold text-amber">A</div>
                            <h3 className="mt-4 text-2xl font-bold text-navy">I&apos;m a scrap aggregator</h3>
                            <ul className="mt-4 space-y-3 text-sm text-slate">
                                <li>Larger, structured local order pipeline with transparent material details.</li>
                                <li>Reduced idle travel through city and material-aware matching in one feed.</li>
                            </ul>
                        </article>
                    </div>
                </div>
            </section>

            <footer className="bg-navy px-6 py-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-surface md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-muted">{APP_NAME} © {new Date().getFullYear()} · {APP_CONFIG.APP_DOMAIN}</p>
                    <Link href="/admin/login" className="inline-flex min-h-[48px] items-center text-sm text-muted transition hover:text-surface">
                        Admin Portal
                    </Link>
                </div>
            </footer>
        </main>
    );
}
