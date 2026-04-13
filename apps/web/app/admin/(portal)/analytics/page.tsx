'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminApi';
import type { AdminAnalytics } from '@/lib/adminApi';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Users, Package, BarChart2, RefreshCw } from 'lucide-react';
import styles from './analytics.module.css';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4'];


function StatCard({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statTitle}>{title}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

function customTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ color?: string; name?: string | number; value?: unknown }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {String(p.name)}: {typeof p.value === 'number' ? p.value.toLocaleString() : String(p.value ?? '')}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await adminFetch<AdminAnalytics>('/api/admin/analytics')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totalOrders = data?.status_breakdown?.reduce((a: number, r) => a + Number(r.count), 0) ?? 0;
  const completedOrders = data?.status_breakdown?.find((r) => r.status === 'completed')?.count ?? 0;
  const completionRate = totalOrders > 0 ? ((Number(completedOrders) / totalOrders) * 100).toFixed(1) : '0';
  const totalGmv = data?.revenue_weekly?.reduce((a: number, r) => a + Number(r.gmv), 0) ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><BarChart2 size={24} /> Analytics</h1>
          <p className={styles.subtitle}>Platform insights & trends · Last 30 days</p>
        </div>
        <button className={styles.refresh} onClick={load}>
          <RefreshCw size={16} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className={styles.loadingCenter}><div className={styles.spinner} /></div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className={styles.kpiStrip}>
            <StatCard title="Total Orders" value={totalOrders.toLocaleString()} />
            <StatCard title="Completed" value={Number(completedOrders).toLocaleString()} sub={`${completionRate}% completion rate`} />
            <StatCard title="Total GMV" value={`₹${(totalGmv / 100).toFixed(0)}`} sub="Completed orders only" />
            <StatCard title="Active Cities" value={data?.city_breakdown?.length ?? 0} />
          </div>

          {/* Daily orders chart */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Daily Orders — Last 30 Days</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data?.daily_orders ?? []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Line dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={false} name="Total" />
                <Line dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
                <Line dataKey="cancelled" stroke="#ef4444" strokeWidth={2} dot={false} name="Cancelled" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.twoCol}>
            {/* Order Status Donut */}
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Status Distribution</h2>
              <div className={styles.pieWrapper}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data?.status_breakdown ?? []}
                      dataKey="count" nameKey="status"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={50}
                    >
                      {(data?.status_breakdown ?? []).map((_, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Peak Hours (last 30 days)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.hourly_distribution ?? []} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(h: number) => `${h}:00`} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[3,3,0,0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly GMV */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Weekly GMV — Last 12 Weeks</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.revenue_weekly ?? []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week_start" tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => `₹${(v/100).toFixed(0)}`} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="gmv" fill="#10b981" radius={[3,3,0,0]} name="GMV (paise)" />
                <Bar dataKey="completed_orders" fill="#6366f1" radius={[3,3,0,0]} name="Completed Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.twoCol}>
            {/* Top Sellers */}
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}><Users size={16} /> Top Sellers</h2>
              <div className={styles.leaderboard}>
                {(data?.top_sellers ?? []).map((s, i: number) => (
                  <div key={s.id} className={styles.leaderboardRow}>
                    <span className={styles.rank} style={{ color: i < 3 ? '#f59e0b' : '#475569' }}>#{i+1}</span>
                    <div className={styles.lbInfo}>
                      <span className={styles.lbName}>{s.name || s.id}</span>
                      <span className={styles.lbPhone}>{s.display_phone}</span>
                    </div>
                    <div className={styles.lbStats}>
                      <span className={styles.lbOrders}>{Number(s.total_orders).toLocaleString()} orders</span>
                      <span className={styles.lbCompleted}>{Number(s.completed_orders).toLocaleString()} done</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Aggregators */}
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}><Package size={16} /> Top Aggregators</h2>
              <div className={styles.leaderboard}>
                {(data?.top_aggregators ?? []).map((a, i: number) => (
                  <div key={a.id} className={styles.leaderboardRow}>
                    <span className={styles.rank} style={{ color: i < 3 ? '#f59e0b' : '#475569' }}>#{i+1}</span>
                    <div className={styles.lbInfo}>
                      <span className={styles.lbName}>{a.business_name || a.name || a.id}</span>
                      <span className={styles.lbPhone}>{a.display_phone}</span>
                    </div>
                    <div className={styles.lbStats}>
                      <span className={styles.lbOrders}>{Number(a.completed_orders).toLocaleString()} done</span>
                      <span className={styles.lbCompleted}>⭐ {Number(a.avg_rating).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
