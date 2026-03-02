/**
 * app/admin/layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Main Admin Layout with Sidebar navigation.
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ChartBar, Users, Buildings, ShieldCheck, Gear, SignOut, Globe } from 'phosphor-react';

const ChartBarIcon = ChartBar as any;
const UsersIcon = Users as any;
const BuildingsIcon = Buildings as any;
const ShieldCheckIcon = ShieldCheck as any;
const GearIcon = Gear as any;
const SignOutIcon = SignOut as any;
const GlobeIcon = Globe as any;

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-bg">
            {/* Sidebar */}
            <aside className="w-64 bg-slate flex flex-col border-r border-navy/10">
                <div className="p-token-lg h-16 flex items-center border-b border-navy/10 bg-navy">
                    <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center mr-3">
                        <span className="text-navy font-bold text-lg">S</span>
                    </div>
                    <span className="text-surface font-bold text-lg tracking-tight">Admin</span>
                </div>

                <nav className="flex-1 p-token-md space-y-1 mt-4">
                    <NavItem icon={<ChartBarIcon size={20} />} label="Global Overview" active />
                    <NavItem icon={<BuildingsIcon size={20} />} label="Aggregators" />
                    <NavItem icon={<UsersIcon size={20} />} label="Sellers" />
                    <NavItem icon={<GlobeIcon size={20} />} label="Marketplace" />
                    <NavItem icon={<ShieldCheckIcon size={20} />} label="Compliance" />
                </nav>

                <div className="p-token-md border-t border-navy/10 space-y-1">
                    <NavItem icon={<GearIcon size={20} />} label="System Config" />
                    <NavItem icon={<SignOutIcon size={20} />} label="Logout" danger />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-token-xl shadow-sm">
                    <h2 className="text-navy font-bold text-lg">Internal Control Center</h2>
                    <div className="flex items-center gap-token-md">
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-navy">Super Admin</span>
                            <span className="text-[10px] text-amber font-bold uppercase tracking-wider bg-amber/10 px-1.5 rounded">Production</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-surface font-bold">SA</div>
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
    const IconComponent = icon as any;
    return (
        <button className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all
      ${active ? 'bg-navy/10 text-navy font-bold' : 'text-slate hover:bg-navy/5 hover:text-navy'}
      ${danger ? 'text-red/70 hover:bg-red/10 hover:text-red' : ''}
    `}>
            {icon}
            <span>{label}</span>
        </button>
    );
}
