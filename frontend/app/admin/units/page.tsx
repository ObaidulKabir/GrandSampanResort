'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import ImageLightbox from '@/components/ImageLightbox';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';
import { useToast } from '@/components/ui/ToastContext';

type SortKey = 'id' | 'floor' | 'type' | 'size' | 'view' | 'totalPrice' | 'plans';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'id', label: 'Unit ID' },
  { key: 'floor', label: 'Floor' },
  { key: 'type', label: 'Category' },
  { key: 'size', label: 'Size (sq ft)' },
  { key: 'view', label: 'View' },
  { key: 'totalPrice', label: 'List Price' },
  { key: 'plans', label: 'Share Status' }
];

function firstBySuite(items: MediaItem[]) {
  const map: Record<string, { src: string; alt: string }> = {};
  for (const item of items) {
    const suiteId = item.suiteId;
    if (!suiteId || map[suiteId] || !item.url) continue;
    map[suiteId] = {
      src: resolveMediaUrl(item.url),
      alt: item.alt || item.label || suiteId
    };
  }
  return map;
}

function DrawingThumb({
  label,
  image,
  onOpen
}: {
  label: string;
  image?: { src: string; alt: string };
  onOpen: (img: { src: string; alt: string }) => void;
}) {
  if (!image) {
    return <span className="text-[11px] text-ocean/40 font-normal">Not Uploaded</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onOpen({ src: image.src, alt: image.alt || label })}
      className="group block w-16 overflow-hidden rounded border border-ocean/15 bg-pearl/60 transition hover:border-gold hover:shadow-sm"
      title={`View ${label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt || label} className="h-10 w-full object-contain p-0.5" />
    </button>
  );
}

export default function AdminUnitsListPage() {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [archBySuite, setArchBySuite] = useState<Record<string, { src: string; alt: string }>>({});
  const [keyMapBySuite, setKeyMapBySuite] = useState<Record<string, { src: string; alt: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deletingId, setDeletingId] = useState('');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [suitesJson, plansJson, archMedia, keyMedia] = await Promise.all([
        api('/suites'),
        api('/timeshares'),
        fetchMedia('suite_plan'),
        fetchMedia('suite_keymap')
      ]);
      setItems(Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? []);
      setPlans(Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? []);
      setArchBySuite(firstBySuite(archMedia));
      setKeyMapBySuite(firstBySuite(keyMedia));
    } catch {
      setError('Failed to load units');
      toastError('Failed to load units');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function planStats(suiteId: string) {
    const forUnit = plans.filter((p) => p.suiteId === suiteId);
    const unsold = forUnit.filter((p) => (p.planStatus || '').toLowerCase() === 'unsold').length;
    return { total: forUnit.length, unsold };
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'totalPrice' || key === 'floor' || key === 'size' || key === 'plans' ? 'desc' : 'asc');
  }

  async function deleteUnit(id: string) {
    const ok = window.confirm(
      `Delete unit ${id}? This also removes its share plans and architectural images. Units with existing bookings cannot be deleted.`
    );
    if (!ok) return;
    setDeletingId(id);
    try {
      const json = await api(`/suites/${id}`, { method: 'DELETE' });
      if (json?.ok) {
        success(`Unit ${id} successfully deleted!`);
        await load();
      } else if (json?.error === 'has_bookings') {
        toastError(`Unit ${id} has active sales/bookings and cannot be deleted.`);
      } else {
        toastError(json?.error || `Failed to delete ${id}`);
      }
    } catch {
      toastError(`Failed to delete ${id}`);
    }
    setDeletingId('');
  }

  const sorted = useMemo(() => {
    const rows = items.map((i) => {
      const stats = planStats(i.id);
      return { ...i, _plansTotal: stats.total, _plansUnsold: stats.unsold };
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'floor':
        case 'size':
        case 'totalPrice':
          cmp = Number(a[sortKey] || 0) - Number(b[sortKey] || 0);
          break;
        case 'plans':
          cmp = a._plansTotal - b._plansTotal || a._plansUnsold - b._plansUnsold;
          break;
        default: {
          const av = String(a[sortKey] ?? '').toLowerCase();
          const bv = String(b[sortKey] ?? '').toLowerCase();
          cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        }
      }
      if (cmp === 0) {
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      }
      return cmp * dir;
    });
    return rows;
  }, [items, plans, sortKey, sortDir]);

  const totalUnsoldShares = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'unsold').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="gold" size="sm" dot>Physical Asset &amp; Inventory Matrix</Badge>
          <h1 className="font-display mt-1 text-2xl font-bold text-ocean sm:text-3xl">
            Resort Suites &amp; Units
          </h1>
          <p className="mt-1 text-xs text-ocean/65">
            Configure rooms, floor locations, architectural keymaps, and associated fractional share plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs" onClick={load}>
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </Button>
          <Link href="/admin/units/new">
            <Button className="text-xs">+ Create Unit</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Resort Suites"
          value={items.length}
          variant="ocean"
          icon={<span className="text-lg">🏢</span>}
          subtext="Configured inventory rooms"
        />
        <StatCard
          label="Unsold Available Shares"
          value={totalUnsoldShares}
          variant="gold"
          icon={<span className="text-lg">🏷️</span>}
          subtext={`Across ${plans.length} total published plans`}
        />
        <StatCard
          label="Drawings Uploaded"
          value={Object.keys(archBySuite).length}
          variant="pearl"
          icon={<span className="text-lg">📐</span>}
          subtext="Architectural floor drawings active"
        />
      </div>

      {/* Units Table */}
      <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
        <div className="border-b border-ocean/10 bg-pearl px-5 py-3">
          <h3 className="font-display text-base font-bold text-ocean">Suite Inventory Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ocean/10 bg-pearl/60 text-ocean/60 uppercase font-semibold">
                {COLUMNS.map((col) => {
                  const active = sortKey === col.key;
                  return (
                    <th key={col.key} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 font-bold ${
                          active ? 'text-ocean' : 'text-ocean/70 hover:text-ocean'
                        }`}
                      >
                        {col.label}
                        <span className="text-[10px]">{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    </th>
                  );
                })}
                <th className="px-4 py-3">Floor Plan</th>
                <th className="px-4 py-3">Key Map</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean/10">
              {sorted.map((i) => {
                const stats = { total: i._plansTotal, unsold: i._plansUnsold };
                return (
                  <tr key={i.id} className="hover:bg-pearl/30 transition">
                    <td className="px-4 py-3.5 font-bold text-ocean font-mono text-sm">{i.id}</td>
                    <td className="px-4 py-3.5 font-semibold text-ocean">Floor {i.floor}</td>
                    <td className="px-4 py-3.5 font-semibold text-ocean">{i.type}</td>
                    <td className="px-4 py-3.5 text-ocean/80">{i.size} sq ft</td>
                    <td className="px-4 py-3.5 capitalize text-ocean">{i.view} View</td>
                    <td className="px-4 py-3.5 font-bold text-ocean">{formatMoney(i.totalPrice || 0)}</td>
                    <td className="px-4 py-3.5">
                      {stats.total === 0 ? (
                        <Badge variant="danger" size="sm">No Plans</Badge>
                      ) : (
                        <Badge variant={stats.unsold > 0 ? 'gold' : 'neutral'} size="sm">
                          {stats.unsold} on sale / {stats.total}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <DrawingThumb label="Architectural plan" image={archBySuite[i.id]} onOpen={setLightbox} />
                    </td>
                    <td className="px-4 py-3.5">
                      <DrawingThumb label="Key map" image={keyMapBySuite[i.id]} onOpen={setLightbox} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/units/${i.id}/plans`}
                          className="rounded bg-ocean px-2.5 py-1 text-xs font-semibold text-white hover:bg-ocean/90 transition"
                        >
                          Plans
                        </Link>
                        <Link
                          href={`/admin/units/${i.id}/edit`}
                          className="rounded border border-ocean/20 px-2.5 py-1 text-xs font-semibold text-ocean hover:bg-ocean/5 transition"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteUnit(i.id)}
                          disabled={deletingId === i.id}
                          className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === i.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-ocean/60">
                    No suites created yet.{' '}
                    <Link href="/admin/units/new" className="font-bold text-ocean underline">
                      Create the first unit &rarr;
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}
