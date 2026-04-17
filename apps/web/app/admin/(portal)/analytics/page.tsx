'use client';

/**
 * app/admin/(portal)/analytics/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin Analytics Dashboard
 * - Platform KPIs (orders, revenue, city breakdown)
 * - User Registration card with date-range filters
 * - Drill-down user table on card click
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  adminApi,
  type AdminAnalytics,
  type DateRangeKey,
  type UserRegistrationAnalytics,
  type RegisteredUser,
} from '@/lib/adminApi';
import { BoneyardAnalyticsPage, BoneyardBlock } from '@/components/ui/Boneyard';

// ─── Constants ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  created: '#6366f1',
  accepted: '#8b5cf6',
  en_route: '#3b82f6',
  arrived: '#0ea5e9',
  weighing_in_progress: '#06b6d4',
  completed: '#10b981',
  cancelled: '#ef4444',
  disputed: '#f59e0b',
};

const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '2days', label: '2 Days' },
  { key: 'week', label: '1 Week' },
  { key: 'month', label: '1 Month' },
  { key: 'custom', label: 'Custom' },
  { key: 'all', label: 'All Time' },
];

// ─── Tiny Components ──────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  onClick,
  active = false,
}: {
  title: string;
  value: string | number;
  sub?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-6 text-left transition-all duration-200 border ${
        active
          ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/40 scale-[1.02]'
          : onClick
          ? 'bg-[#1a1f36] border-white/8 hover:border-indigo-500/60 hover:bg-[#1e2342] cursor-pointer'
          : 'bg-[#1a1f36] border-white/8 cursor-default'
      }`}
    >
      <p className={`text-sm font-medium mb-1 ${active ? 'text-indigo-200' : 'text-gray-400'}`}>
        {title}
      </p>
      <p className={`text-3xl font-bold ${active ? 'text-white' : 'text-white'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${active ? 'text-indigo-200' : 'text-gray-500'}`}>{sub}</p>}
    </button>
  );
}

// ─── User Registration Section ────────────────────────────────────

function UserRegistrationsSection() {
  const [range, setRange] = useState<DateRangeKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<UserRegistrationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [drillType, setDrillType] = useState<'all' | 'seller' | 'aggregator'>('all');
  const [search, setSearch] = useState('');
  const [regError, setRegError] = useState('');

  const load = useCallback(
    async (r: DateRangeKey, from?: string, to?: string) => {
      setLoading(true);
      setRegError('');
      try {
        const res = await adminApi.getRegistrationAnalytics(r, from, to);
        setData(res);
      } catch (e: unknown) {
        setRegError(e instanceof Error ? e.message : 'Failed to load registration analytics');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (range !== 'custom') {
      load(range);
    }
  }, [range, load]);

  const handleApplyCustom = () => {
    if (customFrom && customTo) load('custom', customFrom, customTo);
  };

  const handleCardClick = (type: 'all' | 'seller' | 'aggregator') => {
    if (showTable && drillType === type) {
      setShowTable(false);
    } else {
      setDrillType(type);
      setShowTable(true);
      setSearch('');
    }
  };

  const filteredUsers: RegisteredUser[] = (data?.users ?? []).filter((u) => {
    if (drillType !== 'all' && u.user_type !== drillType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.phone_last4?.includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white">User Registrations</h2>

        {/* Range pills */}
        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                range === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1a1f36] text-gray-400 border border-white/10 hover:border-indigo-500/50 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date pickers */}
      {range === 'custom' && (
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#1a1f36] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#1a1f36] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Stat Cards */}
      {regError ? (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {regError}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <BoneyardBlock key={i} className="h-28 rounded-2xl bg-[#1a1f36] border border-white/8" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total New Users"
            value={data?.total ?? 0}
            sub={`${DATE_RANGES.find((d) => d.key === range)?.label ?? range}`}
            onClick={() => handleCardClick('all')}
            active={showTable && drillType === 'all'}
          />
          <StatCard
            title="New Sellers"
            value={data?.sellers ?? 0}
            onClick={() => handleCardClick('seller')}
            active={showTable && drillType === 'seller'}
          />
          <StatCard
            title="New Aggregators"
            value={data?.aggregators ?? 0}
            onClick={() => handleCardClick('aggregator')}
            active={showTable && drillType === 'aggregator'}
          />
        </div>
      )}

      {/* Drill-down table */}
      {showTable && !loading && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-[#131929] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/8">
            <p className="text-sm font-medium text-white capitalize">
              {drillType === 'all' ? 'All New Users' : `New ${drillType}s`} ({filteredUsers.length})
            </p>
            <input
              type="text"
              placeholder="Search name, ID, phone, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 px-3 py-1.5 rounded-lg bg-[#1a1f36] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {['User ID', 'Name', 'Type', 'Phone Last 4', 'Email', 'Status', 'Joined At'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-indigo-300">{u.id}</td>
                      <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.user_type === 'seller'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {u.user_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">••••{u.phone_last4}</td>
                      <td className="px-4 py-3 text-gray-400">{u.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.is_active
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getAnalytics()
      .then(setAnalytics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BoneyardAnalyticsPage />;
  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-red-400 text-sm">
        Failed to load analytics: {error}
      </div>
    );
  }
  if (!analytics) return null;

  const statusData = analytics.status_breakdown.map((s) => ({
    name: s.status.replace(/_/g, ' '),
    value: Number(s.count),
    fill: STATUS_COLORS[s.status] ?? '#6b7280',
  }));

  return (
    <div className="space-y-8 pb-10">
      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{color: '#1e3a8a'}}>Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Platform insights and trends</p>
      </div>

      {/* ── User Registrations ── */}
      <UserRegistrationsSection />

      {/* ── Orders per Day ── */}
      <section>
        <h2 className="text-lg font-semibold" style={{color: '#000000'}} >Orders — Last 30 Days</h2>
        <div className="rounded-2xl bg-[#1a1f36] border border-white/8 p-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics.daily_orders}>
              <defs>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                }
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e2342', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                }
              />
              <Area type="monotone" dataKey="orders" stroke="#6366f1" fill="url(#ordersGrad)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#completedGrad)" strokeWidth={2} name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Status Distribution + City ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <section>
          <h2 className="text-lg font-semibold" style={{color: '#000000'}}>Order Status Distribution</h2>
          <div className="rounded-2xl bg-[#1a1f36] border border-white/8 p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e2342', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Legend
                  formatter={(val) => <span style={{ color: '#d1d5db', fontSize: 12 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* City breakdown */}
        <section>
          <h2 className="text-lg font-semibold" style={{color: '#000000'}}>Orders by City</h2>
          <div className="rounded-2xl bg-[#1a1f36] border border-white/8 p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.city_breakdown.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis dataKey="city_code" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={70} />
                <Tooltip
                  contentStyle={{ background: '#1e2342', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Total" />
                <Bar dataKey="completed" fill="#10b981" radius={[0, 4, 4, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ── Weekly Revenue ── */}
      <section>
        <h2 className="text-lg font-semibold" style={{color: '#000000'}}>Weekly GMV — Last 12 Weeks</h2>
        <div className="rounded-2xl bg-[#1a1f36] border border-white/8 p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.revenue_weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="week_start"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                }
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e2342', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                formatter={(v) => [`₹${Number(v ?? 0).toLocaleString('en-IN')}`, 'GMV']}
              />
              <Bar dataKey="gmv" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="GMV" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Hourly Distribution ── */}
      <section>
        <h2 className="text-lg font-semibold" style={{color: '#000000'}}>Hourly Order Distribution</h2>
        <div className="rounded-2xl bg-[#1a1f36] border border-white/8 p-5">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.hourly_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(h) => `${h}:00`} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e2342', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(h) => `${h}:00`}
              />
              <Bar dataKey="orders" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Top Sellers & Aggregators ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Top Sellers</h2>
          <div className="rounded-2xl bg-[#1a1f36] border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Name</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-medium">Orders</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-medium">GMV</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_sellers.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-white">{s.name}</td>
                    <td className="px-4 py-3 text-right text-indigo-300">{s.total_orders}</td>
                    <td className="px-4 py-3 text-right text-emerald-300">
                      ₹{Number(s.total_gmv).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Top Aggregators</h2>
          <div className="rounded-2xl bg-[#1a1f36] border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Name</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-medium">Completed</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_aggregators.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-white">
                      {a.business_name ?? a.name}
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-300">{a.completed_orders}</td>
                    <td className="px-4 py-3 text-right text-yellow-300">
                      {Number(a.avg_rating).toFixed(1)} ⭐
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
