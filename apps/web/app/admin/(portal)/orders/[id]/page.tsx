'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminApi';
import type {
  AdminOrderDetail,
  AdminTimelineEvent,
  AdminOrderItem,
  AdminOrderMedia,
} from '@/lib/adminApi';
import {
  ArrowLeft, User, Truck, MapPin, Clock, Package, CheckCircle,
  XCircle, Phone, Calendar, Scale, CreditCard, Image as ImageIcon,
} from 'lucide-react';
import { BoneyardDetailPage } from '@/components/ui/Boneyard';
import styles from './order-detail.module.css';

const STATUS_COLORS: Record<string, string> = {
  created: '#6366f1', accepted: '#f59e0b', scheduled: '#8b5cf6',
  picked_up: '#3b82f6', completed: '#10b981', cancelled: '#ef4444',
};
const STATUS_ICONS: Record<string, React.ElementType> = {
  created: Clock, accepted: Truck, scheduled: Calendar,
  picked_up: Package, completed: CheckCircle, cancelled: XCircle,
};

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
      <span className={styles.kvValue}>{value ?? '—'}</span>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<AdminOrderDetail>(`/api/admin/orders/${params.id}`)
      .then(setOrder)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load order'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <BoneyardDetailPage />;

  if (error || !order) return (
    <div className={styles.center}>
      <XCircle size={40} color="#ef4444" />
      <p className={styles.errorMsg}>{error ?? 'Order not found'}</p>
      <button className={styles.back} onClick={() => router.back()}>Go back</button>
    </div>
  );

  const StatusIcon = STATUS_ICONS[order.status] ?? Clock;
  const statusColor = STATUS_COLORS[order.status] ?? '#6366f1';

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={18} /> Back to Orders
        </button>
        <div className={styles.topRight}>
          <span className={styles.statusBadge} style={{ background: statusColor + '22', color: statusColor }}>
            <StatusIcon size={14} />
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Order ID hero */}
      <div className={styles.hero}>
        <h1 className={styles.orderId}>{order.id}</h1>
        <p className={styles.orderMeta}>
          Created {fmtDate(order.created_at)} · {order.city_code}
          {order.amount_due != null && ` · ₹${Number(order.amount_due).toFixed(2)}`}
        </p>
      </div>

      <div className={styles.grid}>
        {/* Seller */}
        <Section title="Seller" icon={User}>
          <KV label="Name" value={order.seller_name} />
          <KV label="Seller ID" value={<span className={styles.mono}>{order.seller_id}</span>} />
          <KV label="Phone" value={order.seller_phone && <a href={`tel:${order.seller_phone}`} className={styles.link}><Phone size={12} />{order.seller_phone}</a>} />
          <KV label="Joined" value={fmtDate(order.seller_joined_at)} />
          {order.seller_flat && (
            <KV label="Address" value={
              `${order.seller_flat}, ${order.seller_street}, ${order.seller_area}, ${order.seller_city} - ${order.seller_pincode}`
            } />
          )}
        </Section>

        {/* Pickup */}
        <Section title="Pickup Location" icon={MapPin}>
          <KV label="Address" value={order.pickup_address} />
          <KV label="Coordinates" value={
            order.pickup_lat
              ? <a href={`https://maps.google.com/?q=${order.pickup_lat},${order.pickup_lng}`} target="_blank" rel="noreferrer" className={styles.link}>
                  {Number(order.pickup_lat).toFixed(5)}, {Number(order.pickup_lng).toFixed(5)}
                </a>
              : null
          } />
          <KV label="Preferred Window" value={
            order.preferred_pickup_window
              ? JSON.stringify(order.preferred_pickup_window)
              : null
          } />
          {order.seller_note && <KV label="Seller Note" value={<em>{order.seller_note}</em>} />}
        </Section>

        {/* Aggregator */}
        <Section title="Aggregator" icon={Truck}>
          {order.aggregator_id ? (
            <>
              <KV label="Name" value={order.aggregator_name} />
              <KV label="Business" value={order.aggregator_business_name} />
              <KV label="Aggregator ID" value={<span className={styles.mono}>{order.aggregator_id}</span>} />
              <KV label="Phone" value={order.aggregator_phone && <a href={`tel:${order.aggregator_phone}`} className={styles.link}><Phone size={12} />{order.aggregator_phone}</a>} />
              <KV label="Type" value={order.aggregator_type} />
              <KV label="KYC Status" value={<span style={{ color: order.aggregator_kyc_status === 'verified' ? '#10b981' : '#f59e0b' }}>{order.aggregator_kyc_status}</span>} />
              <KV label="City" value={order.aggregator_city} />
              {order.distance_km != null && <KV label="Distance at Accept" value={`${order.distance_km} km`} />}
              <KV label="Accepted At" value={fmtDate(order.aggregator_accepted_at)} />
            </>
          ) : (
            <p className={styles.unassigned}>No aggregator assigned yet</p>
          )}
        </Section>

        {/* Timeline */}
        <Section title="Order Timeline" icon={Clock}>
          {(order.timeline ?? []).length === 0 ? (
            <p className={styles.unassigned}>No timeline events</p>
          ) : (
            <div className={styles.timeline}>
              {order.timeline.map((ev: AdminTimelineEvent, i: number) => (
                <div key={i} className={styles.timelineItem}>
                  <div className={styles.timelineDot} style={{ background: STATUS_COLORS[ev.status] ?? '#6366f1' }} />
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineStatus}>{ev.status.replace('_', ' ')}</span>
                    <span className={styles.timelineTime}>{fmtDate(ev.changed_at)}</span>
                    {ev.note && <span className={styles.timelineNote}>{ev.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {order.cancelled_at && order.cancellation_reason && (
            <div className={styles.cancellationBox}>
              <XCircle size={14} />
              <div>
                <strong>Cancellation Reason</strong>
                <p>{order.cancellation_reason}</p>
              </div>
            </div>
          )}
        </Section>

        {/* Items */}
        <Section title="Order Items" icon={Scale}>
          {(order.items ?? []).length === 0 ? (
            <p className={styles.unassigned}>No items recorded</p>
          ) : (
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Est. Wt</th>
                  <th>Actual Wt</th>
                  <th>Rate/kg</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: AdminOrderItem, i: number) => (
                  <tr key={i}>
                    <td>{item.material_code}</td>
                    <td>{item.estimated_weight_kg != null ? `${item.estimated_weight_kg} kg` : '—'}</td>
                    <td>{item.actual_weight_kg != null ? `${item.actual_weight_kg} kg` : '—'}</td>
                    <td>{item.unit_price_per_kg != null ? `₹${item.unit_price_per_kg}` : '—'}</td>
                    <td>{item.line_amount != null ? `₹${item.line_amount}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {order.amount_due != null && (
            <div className={styles.amountDue}>
              <CreditCard size={16} />
              <span>Total Amount Due: <strong>₹{Number(order.amount_due).toFixed(2)}</strong></span>
            </div>
          )}
        </Section>

        {/* Key Timestamps */}
        <Section title="Key Timestamps" icon={Calendar}>
          <KV label="Created" value={fmtDate(order.created_at)} />
          <KV label="Scheduled" value={fmtDate(order.scheduled_at)} />
          <KV label="Picked Up" value={fmtDate(order.picked_up_at)} />
          <KV label="Completed" value={fmtDate(order.completed_at)} />
          <KV label="Cancelled" value={fmtDate(order.cancelled_at)} />
        </Section>

        {/* Media */}
        {(order.media ?? []).length > 0 && (
          <Section title="Attachments" icon={ImageIcon}>
            <div className={styles.mediaGrid}>
              {order.media.map((m: AdminOrderMedia) => (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className={styles.mediaCard}>
                  <ImageIcon size={20} />
                  <span className={styles.mediaType}>{m.media_type}</span>
                  <span className={styles.mediaDate}>{fmtDate(m.created_at)}</span>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
