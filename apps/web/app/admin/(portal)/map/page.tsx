'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/adminApi';
import type { AdminOrderPin } from '@/lib/adminApi';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { BoneyardBlock } from '@/components/ui/Boneyard';
import styles from './map.module.css';

// Status → colour for Leaflet markers
const STATUS_COLORS: Record<string, string> = {
  created: '#6366f1',
  accepted: '#f59e0b',
  scheduled: '#8b5cf6',
  picked_up: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

interface OrderPin {
  id: string;
  status: string;
  lat: number;
  lng: number;
  created_at: string;
  city_code: string;
  seller_name: string;
  aggregator_name: string | null;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className={styles.legendItem}>
      <div className={styles.legendDot} style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<{ remove: () => void } | null>(null);
  const [pins, setPins] = useState<OrderPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const loadPins = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<AdminOrderPin[]>('/api/admin/orders/locations');
      setPins(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load order locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPins(); }, []);

  // Initialize Leaflet once data is loaded
  useEffect(() => {
    if (loading || !mapRef.current || typeof window === 'undefined') return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then(L => {
      // If map already initialized, remove it first
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Fix default icon paths (Next.js asset issue)
      // @ts-expect-error Leaflet exposes this private helper on runtime prototype
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Center on Hyderabad (or first pin)
      const firstPin = pins[0];
      const center: [number, number] = firstPin ? [firstPin.lat, firstPin.lng] : [17.385, 78.4867];

      const map = L.map(mapRef.current!, {
        center,
        zoom: 11,
        zoomControl: true,
      });
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      const pinsToShow = filterStatus ? pins.filter(p => p.status === filterStatus) : pins;
      pinsToShow.forEach(pin => {
        const color = STATUS_COLORS[pin.status] ?? '#6366f1';
        const svg = `<svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9.6 12 24 12 24S24 21.6 24 12c0-6.627-5.373-12-12-12z" fill="${color}"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>`;
        const icon = L.divIcon({
          html: svg,
          className: '',
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36],
        });
        const marker = L.marker([pin.lat, pin.lng], { icon });
        marker.addTo(map);
        marker.bindPopup(`
          <div style="font-family:sans-serif;font-size:13px;min-width:180px">
            <strong style="display:block;margin-bottom:4px;color:#1e293b">${pin.id}</strong>
            <span style="display:inline-block;padding:2px 8px;border-radius:999px;
              background:${color}22;color:${color};font-size:11px;font-weight:700;margin-bottom:6px">
              ${pin.status.replace('_', ' ').toUpperCase()}
            </span>
            <p style="margin:2px 0;color:#475569">Seller: <strong>${pin.seller_name || '—'}</strong></p>
            <p style="margin:2px 0;color:#475569">Aggregator: ${pin.aggregator_name || 'Unassigned'}</p>
            <p style="margin:2px 0;color:#475569">City: ${pin.city_code}</p>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:11px">${new Date(pin.created_at).toLocaleString('en-IN')}</p>
            <a href="/admin/orders/${pin.id}" style="display:block;margin-top:8px;color:#6366f1;font-size:12px;">View order →</a>
          </div>
        `);
      });
    });

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, filterStatus]);

  const pinCounts = Object.entries(STATUS_COLORS).map(([status, color]) => ({
    status, color, count: pins.filter(p => p.status === status).length,
  })).filter(x => x.count > 0);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><MapPin size={22} /> Order Map</h1>
          <p className={styles.subtitle}>{pins.length} orders with location data · last 30 days</p>
        </div>
        <button className={styles.refresh} onClick={loadPins}>
          <RefreshCw size={16} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      {/* Legend + filters */}
      <div className={styles.controls}>
        <div className={styles.legend}>
          {pinCounts.map(({ status, color, count }) => (
            <button
              key={status}
              className={`${styles.legendBtn} ${filterStatus === status ? styles.legendBtnActive : ''}`}
              style={filterStatus === status ? { borderColor: color, color } : {}}
              onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            >
              <LegendDot color={color} label={`${status.replace('_', ' ')} (${count})`} />
            </button>
          ))}
          {filterStatus && (
            <button className={styles.clearFilter} onClick={() => setFilterStatus('')}>
              Show all
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className={styles.mapContainer}>
        {loading && (
          <div className={styles.mapOverlay}>
            <div className="w-[min(480px,90%)] space-y-3">
              <BoneyardBlock className="h-4 w-32 mx-auto" />
              <BoneyardBlock className="h-52 w-full rounded-xl" />
            </div>
          </div>
        )}
        {error && (
          <div className={styles.mapOverlay}>
            <AlertCircle size={40} color="#ef4444" />
            <p className={styles.errorMsg}>{error}</p>
          </div>
        )}
        {/* Leaflet stylesheet */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapRef} className={styles.leafletMap} />
      </div>
    </div>
  );
}
