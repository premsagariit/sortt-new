'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminFetch } from '@/lib/adminApi';
import {
  ShoppingBag, Search, ChevronRight, RefreshCw,
  Clock, CheckCircle, XCircle, Truck, AlertCircle, Package,
} from 'lucide-react';
import styles from './orders.module.css';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  created:   { label: 'Created',   color: '#6366f1', icon: Clock },
  accepted:  { label: 'Accepted',  color: '#f59e0b', icon: Truck },
  scheduled: { label: 'Scheduled', color: '#8b5cf6', icon: Clock },
  picked_up: { label: 'Picked Up', color: '#3b82f6', icon: Package },
  completed: { label: 'Completed', color: '#10b981', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: XCircle },
};

interface Order {
  id: string;
  status: string;
  created_at: string;
  amount_due: number | null;
  pickup_address: string;
  city_code: string;
  seller_name: string;
  seller_phone: string;
  aggregator_business_name: string | null;
  aggregator_phone: string | null;
  cancellation_reason: string | null;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(sp.get('status') ?? '');
  const [page, setPage] = useState(0);
  const PAGE = 50;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(page * PAGE) });
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminFetch<{orders: Order[]; total: number}>(`/api/admin/orders?${params}`);
      setOrders(data.orders);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o =>
    !search ||
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.seller_phone?.includes(search)
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ShoppingBag size={24} />
          <div>
            <h1 className={styles.title}>Orders</h1>
            <p className={styles.subtitle}>{total.toLocaleString()} total orders in system</p>
          </div>
        </div>
        <button className={styles.refresh} onClick={fetchOrders}>
          <RefreshCw size={16} className={loading ? styles.spin : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            className={styles.searchInput}
            placeholder="Search by order ID, seller name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.statusTabs}>
          {['', 'created', 'accepted', 'picked_up', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              className={`${styles.tab} ${statusFilter === s ? styles.tabActive : ''}`}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              style={s && statusFilter === s ? { borderColor: STATUS_CONFIG[s]?.color, color: STATUS_CONFIG[s]?.color } : {}}
            >
              {s ? STATUS_CONFIG[s]?.label : 'All Statuses'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading orders...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={40} />
            <p>No orders found</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Seller</th>
                <th>Aggregator</th>
                <th>City</th>
                <th>Amount</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.created;
                const Icon = cfg.icon;
                return (
                  <tr
                    key={order.id}
                    className={styles.row}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <td className={styles.orderId}>{order.id}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: cfg.color + '22', color: cfg.color }}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                    </td>
                    <td>
                      <div className={styles.person}>
                        <span className={styles.personName}>{order.seller_name || '—'}</span>
                        <span className={styles.personPhone}>{order.seller_phone || ''}</span>
                      </div>
                    </td>
                    <td>
                      {order.aggregator_business_name ? (
                        <div className={styles.person}>
                          <span className={styles.personName}>{order.aggregator_business_name}</span>
                          <span className={styles.personPhone}>{order.aggregator_phone || ''}</span>
                        </div>
                      ) : <span className={styles.noAgg}>Unassigned</span>}
                    </td>
                    <td><span className={styles.city}>{order.city_code}</span></td>
                    <td className={styles.amount}>
                      {order.amount_due != null ? `₹${Number(order.amount_due).toFixed(2)}` : '—'}
                    </td>
                    <td className={styles.date}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td><ChevronRight size={16} className={styles.chevron} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE && (
        <div className={styles.pagination}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
          <span className={styles.pageInfo}>Page {page + 1} of {Math.ceil(total / PAGE)}</span>
          <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}
