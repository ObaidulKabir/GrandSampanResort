'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import ImageLightbox from '@/components/ImageLightbox';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';

type SortKey = 'id' | 'floor' | 'type' | 'size' | 'view' | 'totalPrice' | 'plans';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'id', label: 'Unit' },
  { key: 'floor', label: 'Floor' },
  { key: 'type', label: 'Category' },
  { key: 'size', label: 'Size' },
  { key: 'view', label: 'View' },
  { key: 'totalPrice', label: 'Price' },
  { key: 'plans', label: 'Plans' }
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
    return <span className="text-xs text-ocean/45">Not uploaded</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onOpen({ src: image.src, alt: image.alt || label })}
      className="group block w-20 overflow-hidden border border-ocean/15 bg-pearl/40 transition hover:border-gold/50"
      title={`View ${label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt || label} className="h-14 w-full object-contain p-1" />
    </button>
  );
}

export default function AdminUnitsListPage() {
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
    setError('');
    try {
      const json = await api(`/suites/${id}`, { method: 'DELETE' });
      if (json?.ok) {
        await load();
      } else if (json?.error === 'has_bookings') {
        setError(`Unit ${id} has sales/bookings and cannot be deleted.`);
      } else {
        setError(json?.error === 'not_found' ? `Unit ${id} was not found` : json?.error || `Failed to delete ${id}`);
      }
    } catch {
      setError(`Failed to delete ${id}`);
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

  function SortHeader({ col }: { col: (typeof COLUMNS)[number] }) {
    const active = sortKey === col.key;
    return (
      <th className="p-3 font-medium">
        <button
          type="button"
          onClick={() => toggleSort(col.key)}
          className={`inline-flex items-center gap-1 ${active ? 'text-ocean' : 'text-ocean/70 hover:text-ocean'}`}
          aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          {col.label}
          <span className="text-[10px] font-semibold" aria-hidden>
            {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Inventory</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Units</h1>
          <p className="mt-2 text-ocean/75">Each unit needs at least one Unsold plan to appear in the buyer catalog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/units/new">
            <Button>Create unit</Button>
          </Link>
          <Button variant="outline" onClick={load}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-6 overflow-auto border border-ocean/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ocean/10 text-left">
              {COLUMNS.map((col) => (
                <SortHeader key={col.key} col={col} />
              ))}
              <th className="p-3 font-medium text-ocean/70">Architectural plan</th>
              <th className="p-3 font-medium text-ocean/70">Key map</th>
              <th className="p-3 font-medium text-ocean/70">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => {
              const stats = { total: i._plansTotal, unsold: i._plansUnsold };
              return (
                <tr key={i.id} className="border-t border-ocean/10">
                  <td className="p-3 font-medium text-ocean">{i.id}</td>
                  <td className="p-3">{i.floor}</td>
                  <td className="p-3">{i.type}</td>
                  <td className="p-3">{i.size} sq ft</td>
                  <td className="p-3">{i.view}</td>
                  <td className="p-3">{formatMoney(i.totalPrice || 0)}</td>
                  <td className="p-3">
                    {stats.total === 0 ? (
                      <span className="inline-block border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        No plans
                      </span>
                    ) : (
                      <span
                        className={`inline-block border px-2 py-0.5 text-xs ${
                          stats.unsold > 0
                            ? 'border-gold/50 bg-gold/10 text-ocean'
                            : 'border-ocean/20 bg-pearl text-ocean/80'
                        }`}
                      >
                        {stats.unsold} on sale / {stats.total}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <DrawingThumb
                      label="Architectural plan"
                      image={archBySuite[i.id]}
                      onOpen={setLightbox}
                    />
                  </td>
                  <td className="p-3">
                    <DrawingThumb label="Key map" image={keyMapBySuite[i.id]} onOpen={setLightbox} />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-3 text-xs font-semibold">
                      <Link href={`/admin/units/${i.id}/plans`} className="text-ocean underline">
                        Plans
                      </Link>
                      <Link href={`/admin/units/${i.id}/edit`} className="text-ocean underline">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteUnit(i.id)}
                        disabled={deletingId === i.id}
                        className="text-red-700 underline disabled:opacity-50"
                      >
                        {deletingId === i.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td className="p-4 text-ocean/70" colSpan={10}>
                  No units yet —{' '}
                  <Link href="/admin/units/new" className="font-semibold text-ocean underline">
                    create the first one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </main>
  );
}
