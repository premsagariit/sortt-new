/**
 * app/admin/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin Dashboard - Global KPIs and Marketplace Health.
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Users, Buildings, Package, CurrencyInr } from 'phosphor-react';

const UsersIcon = Users as any;
const BuildingsIcon = Buildings as any;
const PackageIcon = Package as any;
const CurrencyInrIcon = CurrencyInr as any;

export default function AdminDashboard() {
    return (
        <div className="space-y-token-xl">
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-token-lg">
                <GlobalStatCard title="Total GMV" value="₹12.4M" target="₹10M" color="text-teal" icon={<CurrencyInrIcon size={24} />} />
                <GlobalStatCard title="Active Sellers" value="1,842" target="1,500" color="text-navy" icon={<UsersIcon size={24} />} />
                <GlobalStatCard title="Active Aggregators" value="84" target="100" color="text-amber" icon={<BuildingsIcon size={24} />} />
                <GlobalStatCard title="Orders (MTD)" value="4,210" target="5,000" color="text-slate" icon={<PackageIcon size={24} />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-token-xl">
                {/* Marketplace Health */}
                <div className="bg-surface border border-border rounded-card p-token-xl">
                    <h3 className="text-navy font-bold text-lg mb-token-lg">Marketplace Health</h3>
                    <div className="space-y-token-xl">
                        <HealthMetric label="Order Fulfillment Rate" value="94.2%" status="Excelling" />
                        <HealthMetric label="Avg. Pickup Time" value="28 min" status="Optimal" />
                        <HealthMetric label="Payment Success Rate" value="99.8%" status="Excelling" />
                        <HealthMetric label="Dispute Rate" value="0.4%" status="Healthy" />
                    </div>
                </div>

                {/* Flagged Activities */}
                <div className="bg-surface border border-border rounded-card p-token-xl">
                    <h3 className="text-navy font-bold text-lg mb-token-lg text-red">Critical Alerts</h3>
                    <div className="space-y-token-md">
                        <AlertRow title="Unusual Weight Variance" detail="Aggregator SM-12 highlighted 14% delta on ORD-2901" type="Warning" />
                        <AlertRow title="Payment Gateway Latency" detail="Razorpay reporting 4s delay in North region" type="Error" />
                        <AlertRow title="New Aggregator Onboarding" detail="Hitech Metals awaiting KYC verification" type="Normal" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function GlobalStatCard({ title, value, target, color, icon }: any) {
    return (
        <div className="bg-surface border border-border rounded-card p-token-md shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">{icon}</div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{title}</span>
            <div className={`text-2xl font-bold mt-1 ${color} font-mono`}>{value}</div>
            <div className="flex items-center gap-1.5 mt-2">
                <div className="w-full h-1 bg-bg rounded-full overflow-hidden">
                    <div className={`h-full ${color.replace('text', 'bg')}`} style={{ width: '70%' }} />
                </div>
                <span className="text-[10px] text-muted font-bold whitespace-nowrap">Target: {target}</span>
            </div>
        </div>
    );
}

function HealthMetric({ label, value, status }: any) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-bold text-navy">{label}</div>
                <div className="text-[10px] text-teal font-bold uppercase tracking-wider">{status}</div>
            </div>
            <div className="text-xl font-bold text-navy font-mono">{value}</div>
        </div>
    );
}

function AlertRow({ title, detail, type }: any) {
    const borderColor = type === 'Error' ? 'border-red-500' : type === 'Warning' ? 'border-amber-500' : 'border-border';
    return (
        <div className={`p-token-md bg-bg rounded-card border-l-4 ${borderColor}`}>
            <div className="text-xs font-bold text-navy">{title}</div>
            <div className="text-[10px] text-muted mt-0.5">{detail}</div>
        </div>
    );
}
