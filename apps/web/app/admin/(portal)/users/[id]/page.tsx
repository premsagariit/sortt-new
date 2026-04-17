'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminApi';
import {
  ArrowLeft, User, Star, MessageSquareWarning, ArrowUpRight, Package, Truck
} from 'lucide-react';
import { BoneyardDetailPage } from '@/components/ui/Boneyard';
import styles from './user-detail.module.css';

interface OrderLite {
  id: string;
  status: string;
  amount_due: string | null;
  created_at: string;
  completed_at: string | null;
}

interface UserDetail {
  user: {
    id: string;
    name: string;
    user_type: string;
    display_phone: string;
    email: string | null;
    is_active: boolean;
    created_at: string;
    photo_url: string | null;
  };
  profile: {
    business_name?: string | null;
    aggregator_type?: string | null;
    city_code?: string | null;
    kyc_status?: string | null;
    vehicle_type?: string | null;
    is_onboarding_complete?: boolean | null;
    home_lat?: string | number | null;
    home_lng?: string | number | null;
  } | null;
  stats: {
    total_orders: string;
    completed_orders: string;
    cancelled_orders: string;
    total_earnings: string;
    complaints_count: string;
    avg_rating: string;
    ratings_count: string;
  } | null;
  recent_orders: OrderLite[];
  recent_orders_total?: number;
  recent_orders_page?: number;
  recent_orders_per_page?: number;
  recent_orders_total_pages?: number;
  reviews?: Array<{
    id: string;
    order_id: string | null;
    score: number;
    review: string | null;
    created_at: string;
    reviewer_id: string | null;
    reviewer_name: string | null;
  }>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Icon size={16} />
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={styles.kvValue}>{value ?? '-'}</span>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 10;

  useEffect(() => {
    setOrdersPage(1);
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminFetch<UserDetail>(`/api/admin/users/${params.id}?page=${ordersPage}&per_page=${ORDERS_PER_PAGE}`)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [params.id, ordersPage]);

  if (loading) return <BoneyardDetailPage />;

  if (error || !data) return (
    <div className={styles.center}>
      <MessageSquareWarning size={40} color="#ef4444" />
      <p className={styles.errorMsg}>{error ?? 'User not found'}</p>
      <button className={styles.back} onClick={() => router.back()}>Go back</button>
    </div>
  );

  const { user, profile, stats, recent_orders, reviews = [] } = data;
  const recentOrdersTotal = data.recent_orders_total ?? recent_orders.length;
  const currentOrdersPage = data.recent_orders_page ?? ordersPage;
  const totalOrdersPages = data.recent_orders_total_pages ?? 1;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={18} /> Back to Users
        </button>
        <div className={styles.topRight}>
          <span
            className={styles.statusBadge}
            style={{
              background: user.is_active ? '#10b98122' : '#ef444422',
              color: user.is_active ? '#10b981' : '#ef4444',
            }}
          >
            {user.is_active ? 'Active Account' : 'Inactive Account'}
          </span>
        </div>
      </div>

      <div className={styles.hero}>
        {user.photo_url ? (
          <Image src={user.photo_url} alt="Profile" width={96} height={96} className={styles.avatar} unoptimized />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {user.name ? user.name.charAt(0).toUpperCase() : <User size={32} />}
          </div>
        )}
        <div className={styles.heroDetails}>
          <h1 className={styles.userName}>{user.name || 'Unnamed User'}</h1>
          <p className={styles.userMeta}>
            ID: <span className={styles.mono}>{user.id}</span> - {user.user_type.toUpperCase()} - Joined {fmtDate(user.created_at)}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <Section title="Account & Contact" icon={User}>
          <KV label="Name" value={user.name} />
          <KV label="Phone" value={user.display_phone} />
          <KV label="Email" value={user.email} />
          <KV label="User Type" value={<span style={{ textTransform: 'capitalize' }}>{user.user_type}</span>} />
        </Section>

        {profile && (
          <Section title="Business Profile" icon={Truck}>
            <KV label="Business Name" value={profile.business_name} />
            <KV label="Aggregator Type" value={profile.aggregator_type} />
            <KV label="City" value={profile.city_code} />
            <KV
              label="KYC Status"
              value={
                <span style={{ color: profile.kyc_status === 'verified' ? '#10b981' : profile.kyc_status === 'rejected' ? '#ef4444' : '#f59e0b', textTransform: 'capitalize' }}>
                  {profile.kyc_status}
                </span>
              }
            />
            <KV label="Vehicle Type" value={profile.vehicle_type} />
            <KV label="Onboarding Complete" value={profile.is_onboarding_complete ? 'Yes' : 'No'} />
            {profile.home_lat && profile.home_lng && (
              <KV
                label="Home Location"
                value={
                  <a href={`https://www.openstreetmap.org/?mlat=${profile.home_lat}&mlon=${profile.home_lng}#map=18/${profile.home_lat}/${profile.home_lng}`} target="_blank" rel="noreferrer" className={styles.link}>
                    {Number(profile.home_lat).toFixed(5)}, {Number(profile.home_lng).toFixed(5)} <ArrowUpRight size={12} />
                  </a>
                }
              />
            )}
          </Section>
        )}

        {stats && (
          <Section title="Performance & Stats" icon={Star}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Completed Orders</span>
                <span className={styles.statValue} style={{ color: '#10b981' }}>{stats.completed_orders}</span>
                <span className={styles.statSub}>of {stats.total_orders} total</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Cancelled</span>
                <span className={styles.statValue} style={{ color: '#ef4444' }}>{stats.cancelled_orders}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Earnings/GMV</span>
                <span className={styles.statValue} style={{ color: '#6366f1' }}>Rs {Number(stats.total_earnings).toFixed(2)}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Disputes/Complaints</span>
                <span className={styles.statValue} style={{ color: '#f59e0b' }}>{stats.complaints_count}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Avg Rating</span>
                <span className={styles.statValue}>{stats.avg_rating} ⭐</span>
                <span className={styles.statSub}>({stats.ratings_count} reviews)</span>
              </div>
            </div>
          </Section>
        )}

        <Section title={`Recent Orders (${recentOrdersTotal})`} icon={Package}>
          {recent_orders.length === 0 ? (
            <p className={styles.unassigned}>No orders found for this user.</p>
          ) : (
            <>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_orders.map((o) => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/orders/${o.id}`)}>
                      <td className={styles.mono}>{o.id.split('-')[0]}...</td>
                      <td style={{ textTransform: 'capitalize' }}>{o.status.replace('_', ' ')}</td>
                      <td>{o.amount_due ? `Rs ${Number(o.amount_due).toFixed(2)}` : '-'}</td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalOrdersPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    disabled={currentOrdersPage <= 1}
                  >
                    Prev
                  </button>
                  <span className={styles.pageInfo}>
                    Page {currentOrdersPage} of {totalOrdersPages}
                  </span>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))}
                    disabled={currentOrdersPage >= totalOrdersPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </Section>

        <Section title={`Recent Reviews (${reviews.length})`} icon={MessageSquareWarning}>
          {reviews.length === 0 ? (
            <p className={styles.unassigned}>No reviews available for this user.</p>
          ) : (
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Review</th>
                  <th>Reviewer</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{Number(r.score).toFixed(1)} ⭐</td>
                    <td>{r.review?.trim() ? r.review : '-'}</td>
                    <td>{r.reviewer_name || r.reviewer_id || '-'}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
