/**
 * app/aggregator/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Aggregator Dashboard Stats & Recent Activity.
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { CurrencyInr, Package, TrendUp, Clock, CaretRight, Info } from 'phosphor-react';

const CurrencyInrIcon = CurrencyInr as any;
const PackageIcon = Package as any;
const TrendUpIcon = TrendUp as any;
const ClockIcon = Clock as any;
const CaretRightIcon = CaretRight as any;
const InfoIcon = Info as any;

export default function AggregatorDashboard() {
    return (
        <div className="space-y-token-xl">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-token-lg">
                <StatCard title="Today's Earnings" value="₹14,250" delta="+12%" icon={<CurrencyInrIcon size={24} />} color="text-teal" />
                <StatCard title="Active Orders" value="28" delta="+4" icon={<PackageIcon size={24} />} color="text-navy" />
                <StatCard title="Avg. Order Value" value="₹508" delta="+5%" icon={<TrendUpIcon size={24} />} color="text-amber" />
                <StatCard title="Active Agents" value="12 / 15" delta="Stable" icon={<ClockIcon size={24} />} color="text-slate" />
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-token-xl">
                {/* Recent Orders Feed */}
                <div className="lg:col-span-2 space-y-token-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-navy font-bold text-lg">Recent Completions</h3>
                        <button className="text-muted hover:text-navy transition-colors">
                            <CaretRightIcon size={20} />
                        </button>
                    </div>

                    <div className="bg-surface border border-border rounded-card divide-y divide-border overflow-hidden">
                        <OrderRow id="ORD-2841" locality="Madhapur" weight="22" amount="380" status="Completed" time="11:02 AM" />
                        <OrderRow id="ORD-2839" locality="Kondapur" weight="45" amount="890" status="Completed" time="10:15 AM" />
                        <OrderRow id="ORD-2835" locality="Hitech City" weight="12" amount="210" status="Completed" time="09:44 AM" />
                        <OrderRow id="ORD-2831" locality="Jubilee Hills" weight="68" amount="1420" status="Completed" time="08:20 AM" />
                    </div>
                </div>

                {/* Top Materials */}
                <div className="space-y-token-md">
                    <h3 className="text-navy font-bold text-lg">Top Materials</h3>
                    <div className="bg-surface border border-border rounded-card p-token-md space-y-token-md">
                        <MaterialProgress label="Iron" percentage={65} color="bg-material-metal-bg text-material-metal-fg" />
                        <MaterialProgress label="Paper" percentage={42} color="bg-material-paper-bg text-material-paper-fg" />
                        <MaterialProgress label="Plastic" percentage={28} color="bg-material-plastic-bg text-material-plastic-fg" />
                        <MaterialProgress label="E-Waste" percentage={15} color="bg-material-ewaste-bg text-material-ewaste-fg" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, up, icon }: any) {
    return (
        <div className="bg-surface border border-border rounded-card p-token-md shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-xs font-bold uppercase tracking-wider">{title}</span>
                <div className="p-2 bg-bg rounded-lg">{icon}</div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy font-mono">{value}</span>
                <span className={`text-xs font-bold ${up ? 'text-teal' : 'text-red'}`}>{trend}</span>
            </div>
        </div>
    );
}

function OrderRow({ id, locality, weight, amount, status, time }: any) {
    return (
        <div className="flex items-center justify-between p-token-md hover:bg-bg transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center">
                    <PackageIcon size={20} className="text-navy" />
                </div>
                <div>
                    <div className="text-sm font-bold text-navy">{id}</div>
                    <div className="text-[10px] text-muted">{locality} · {time}</div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-sm font-bold text-navy font-mono">₹{amount}</div>
                <div className="text-[10px] text-muted font-mono">{weight} kg</div>
            </div>
        </div>
    );
}

function MaterialProgress({ label, percentage, color }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
                <PackageIcon size={20} className="text-navy" />
                <span className="text-sm font-bold text-navy">Paper & Cardboard</span>
            </div>
            <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color.split(' ')[0]}`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}
