/**
 * app/aggregator/layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Main Aggregator Layout with Sidebar navigation.
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { House, Package, ChartLine, Users, Gear, SignOut, Bell } from 'phosphor-react';
import { SorttLogo } from '../../components/ui/SorttLogo';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const HouseIcon = House as IconComponent;
const PackageIcon = Package as IconComponent;
const ChartLineIcon = ChartLine as IconComponent;
const UsersIcon = Users as IconComponent;
const GearIcon = Gear as IconComponent;
const SignOutIcon = SignOut as IconComponent;
const BellIcon = Bell as IconComponent;

export default function AggregatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-bg">
            {/* Sidebar */}
            <aside className="w-64 bg-navy flex flex-col border-r border-slate/10">
                <div className="p-token-lg h-16 flex items-center border-b border-white/10 bg-navy/20">
                    <SorttLogo variant="compact-dark" size={100} />
                </div>

                <nav className="flex-1 p-token-md space-y-1 mt-4">
                    <NavItem icon={<HouseIcon size={20} />} label="Dashboard" active />
                    <NavItem icon={<PackageIcon size={20} />} label="Live Orders" />
                    <NavItem icon={<ChartLineIcon size={20} />} label="My Rates" />
                    <NavItem icon={<UsersIcon size={20} />} label="Field Agents" />
                </nav>

                <div className="p-token-md border-t border-white/10 space-y-1">
                    <NavItem icon={<GearIcon size={20} />} label="Settings" />
                    <NavItem icon={<SignOutIcon size={20} />} label="Logout" danger />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-token-xl shadow-sm">
                    <h2 className="text-navy font-bold text-lg">Dashboard Overview</h2>
                    <div className="flex items-center gap-token-md">
                        <button className="p-2 text-muted hover:text-navy transition-colors relative">
                            <BellIcon size={20} />
                            <div className="absolute top-2 right-2 w-2 h-2 bg-red rounded-full border-2 border-surface" />
                        </button>
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-navy">Suresh Metals</span>
                            <span className="text-[10px] text-teal font-bold uppercase tracking-wider bg-teal/10 px-1.5 rounded">Online</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate flex items-center justify-center text-surface font-bold">SM</div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-token-xl">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, danger = false }: { icon: React.ReactNode, label: string, active?: boolean, danger?: boolean }) {
    return (
        <button className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all
      ${active ? 'bg-navy/active text-navy font-bold' : 'text-slate hover:bg-navy/5 hover:text-navy'}
      ${danger ? 'text-red/70 hover:bg-red/10 hover:text-red' : ''}
    `}>
            {icon}
            <span>{label}</span>
        </button>
    );
}
