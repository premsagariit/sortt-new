'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminApi';
import {
  Users, Search, ChevronRight, RefreshCw,
  AlertCircle, ShieldCheck, ShoppingCart
} from 'lucide-react';
import { BoneyardTable } from '@/components/ui/Boneyard';
import styles from './users.module.css';

interface User {
  id: string;
  name: string;
  user_type: string;
  phone_last4: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

interface AnalyticsUsersResponse {
  range: string;
  total: number;
  sellers: number;
  aggregators: number;
  users: User[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('all'); // today, week, month, all
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<AnalyticsUsersResponse>(`/api/admin/analytics/users?range=${range}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const allUsers = data?.users ?? [];
  const filtered = allUsers.filter(u =>
    !search ||
    u.id.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_last4?.includes(search)
  );

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    paginated.slice(0, 12).forEach((user) => {
      router.prefetch(`/admin/users/${user.id}`);
    });
  }, [paginated, router]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Users size={24} />
          <div>
            <h1 className={styles.title}>Users</h1>
            <p className={styles.subtitle}>
              {data ? `${data.total.toLocaleString()} users (${data.sellers} sellers, ${data.aggregators} aggregators)` : 'Loading users...'}
            </p>
          </div>
        </div>
        <button className={styles.refresh} onClick={fetchUsers}>
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
            placeholder="Search by ID, name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.statusTabs}>
          {['all', 'month', 'week', 'today'].map(r => (
            <button
              key={r}
              className={`${styles.tab} ${range === r ? styles.tabActive : ''}`}
              onClick={() => { setRange(r); setPage(0); }}
            >
              {r === 'all' ? 'All Time' : r === 'month' ? 'Last 30 Days' : r === 'week' ? 'Last 7 Days' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <BoneyardTable preset="users" rows={8} />
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={40} />
            <p>No users found</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Type</th>
                <th>Name / Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(user => (
                <tr
                  key={user.id}
                  className={styles.row}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  onMouseEnter={() => router.prefetch(`/admin/users/${user.id}`)}
                >
                  <td className={styles.orderId}>{user.id}</td>
                  <td>
                    <span className={styles.roleBadge} style={{
                      background: user.user_type === 'aggregator' ? '#f59e0b22' : '#6366f122',
                      color: user.user_type === 'aggregator' ? '#f59e0b' : '#6366f1'
                    }}>
                      {user.user_type === 'aggregator' ? <ShieldCheck size={12} /> : <ShoppingCart size={12} />}
                      {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.person}>
                      <span className={styles.personName}>{user.name || '—'}</span>
                      <span className={styles.personSub}>{user.email || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.phone}>***-***-{user.phone_last4 || '****'}</span>
                  </td>
                  <td>
                    {user.is_active ? 
                      <span className={styles.statusActive}>Active</span> : 
                      <span className={styles.statusInactive}>Inactive</span>
                    }
                  </td>
                  <td className={styles.date}>
                    {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td><ChevronRight size={16} className={styles.chevron} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className={styles.pagination}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
          <span className={styles.pageInfo}>Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <button disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}
