'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { annualReturnRange, normalizeReturnAssumptions, type ReturnAssumptions } from '@/lib/returns';
import Button from '@/components/Button';

type Filters = {
  q: string;
  view: string;
  category: string;
  floor: string;
  days: string;
  priceMin: string;
  priceMax: string;
};

const emptyFilters: Filters = {
  q: '',
  view: '',
  category: '',
  floor: '',
  days: '',
  priceMin: '',
  priceMax: ''
};

function planTotal(p: any) {
  return typeof p.discountedPrice === 'number' ? Number(p.discountedPrice) : Number(p.price || 0);
}

export default function InvestPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [suites, setSuites] = useState<Record<string, any>>({});
  const [assumptions, setAssumptions] = useState<ReturnAssumptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [plansJson, suitesJson, returnsJson] = await Promise.all([
        api('/timeshares'),
        api('/suites'),
        api('/settings/return-assumptions').catch(() => null)
      ]);
      const items = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
      const suitesArr = Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [];
      const byId = Object.fromEntries((suitesArr as any[]).map((s: any) => [s.id, s]));
      setSuites(byId);
      setPlans(items.filter((p: any) => (p.planStatus ?? '').toLowerCase() === 'unsold'));
      if (returnsJson) setAssumptions(normalizeReturnAssumptions(returnsJson));
    } catch {
      setError('Failed to load plans');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setFilters((f) => ({ ...f, q }));
  }, []);

  const filterOptions = useMemo(() => {
    const views = new Set<string>();
    const categories = new Set<string>();
    const floors = new Set<number>();
    const days = new Set<number>();
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;
    for (const p of plans) {
      const suite = suites[p.suiteId] || {};
      if (suite.view) views.add(String(suite.view));
      if (suite.type) categories.add(String(suite.type));
      if (suite.floor != null && suite.floor !== '') floors.add(Number(suite.floor));
      if (p.daysPerMonth != null) days.add(Number(p.daysPerMonth));
      const total = planTotal(p);
      if (Number.isFinite(total)) {
        minPrice = Math.min(minPrice, total);
        maxPrice = Math.max(maxPrice, total);
      }
    }
    return {
      views: Array.from(views).sort((a, b) => a.localeCompare(b)),
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
      floors: Array.from(floors).sort((a, b) => a - b),
      days: Array.from(days).sort((a, b) => a - b),
      minPrice: Number.isFinite(minPrice) ? minPrice : 0,
      maxPrice
    };
  }, [plans, suites]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const priceMin = filters.priceMin === '' ? null : Number(filters.priceMin);
    const priceMax = filters.priceMax === '' ? null : Number(filters.priceMax);
    return plans.filter((p) => {
      const suite = suites[p.suiteId] || {};
      const total = planTotal(p);
      if (filters.view && String(suite.view || '').toLowerCase() !== filters.view.toLowerCase()) return false;
      if (filters.category && String(suite.type || '').toLowerCase() !== filters.category.toLowerCase()) return false;
      if (filters.floor !== '' && Number(suite.floor) !== Number(filters.floor)) return false;
      if (filters.days !== '' && Number(p.daysPerMonth) !== Number(filters.days)) return false;
      if (priceMin != null && Number.isFinite(priceMin) && total < priceMin) return false;
      if (priceMax != null && Number.isFinite(priceMax) && total > priceMax) return false;
      if (q) {
        const hay = [
          p.id,
          p.name,
          p.suiteId,
          suite.type,
          suite.view,
          suite.floor,
          p.daysPerMonth,
          p.planType
        ]
          .map((x) => String(x ?? '').toLowerCase())
          .join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [plans, suites, filters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => String(v).trim() !== '').length,
    [filters]
  );

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function suiteTypeIcon(type: string) {
    const t = (type || '').toLowerCase();
    if (t.includes('premium')) return '/images/icons/security.svg';
    if (t.includes('delux')) return '/images/icons/concierge.svg';
    return '/images/icons/balcony.svg';
  }

  function humanView(v?: string) {
    const s = (v || '').toLowerCase();
    if (s.includes('sea')) return 'Sea View';
    if (s.includes('hill')) return 'Hill View';
    return v || '—';
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ocean">Invest in a Suite</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Live unsold share plans. Search by view, floor, price, or category to find the right plan.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-8 border border-ocean/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold">Find a plan</p>
            <p className="mt-1 text-sm text-ocean/70">
              Showing {filtered.length} of {plans.length} available plan{plans.length === 1 ? '' : 's'}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} on` : ''}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <Button type="button" variant="ghost" onClick={() => setFilters(emptyFilters)}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-medium text-ocean sm:col-span-2 lg:col-span-2">
            Search
            <input
              value={filters.q}
              onChange={(e) => setFilter('q', e.target.value)}
              className="field mt-1"
              placeholder="Plan ID, name, suite…"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            View
            <select value={filters.view} onChange={(e) => setFilter('view', e.target.value)} className="field mt-1">
              <option value="">All views</option>
              {filterOptions.views.map((v) => (
                <option key={v} value={v}>
                  {humanView(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Category
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="field mt-1"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Floor
            <select value={filters.floor} onChange={(e) => setFilter('floor', e.target.value)} className="field mt-1">
              <option value="">All floors</option>
              {filterOptions.floors.map((f) => (
                <option key={f} value={String(f)}>
                  Floor {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Days / month
            <select value={filters.days} onChange={(e) => setFilter('days', e.target.value)} className="field mt-1">
              <option value="">All durations</option>
              {filterOptions.days.map((d) => (
                <option key={d} value={String(d)}>
                  {d >= 30 ? 'Full month (30)' : `${d} days`}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Min price (BDT)
            <input
              type="number"
              min={0}
              value={filters.priceMin}
              onChange={(e) => setFilter('priceMin', e.target.value)}
              className="field mt-1"
              placeholder={filterOptions.minPrice ? String(Math.floor(filterOptions.minPrice)) : '0'}
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Max price (BDT)
            <input
              type="number"
              min={0}
              value={filters.priceMax}
              onChange={(e) => setFilter('priceMax', e.target.value)}
              className="field mt-1"
              placeholder={filterOptions.maxPrice ? String(Math.ceil(filterOptions.maxPrice)) : ''}
            />
          </label>
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p: any) => {
          const suite = suites[p.suiteId] || {};
          const isFull = (p.daysPerMonth ?? 0) >= 30;
          const discounted = typeof p.discountedPrice === 'number';
          const returns = annualReturnRange(p.daysPerMonth, assumptions, suite);
          return (
            <article
              key={p.id}
              className={`flex flex-col border bg-white p-6 ${
                discounted ? 'border-gold/60' : isFull ? 'border-gold/50' : 'border-ocean/15'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-ocean">{p.name}</h2>
                <span className="shrink-0 border border-ocean/15 bg-pearl px-2.5 py-1 text-xs font-semibold text-ocean">
                  {p.daysPerMonth} days/mo
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-8 w-8">
                  <Image src={suiteTypeIcon(suite.type)} alt="" fill sizes="32px" />
                </div>
                <span className="text-sm text-ocean/80">
                  {suite.type ?? 'Suite'} · {humanView(suite.view)}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ocean/70">
                <div>
                  Suite <span className="text-ocean">{p.suiteId ?? '—'}</span>
                </div>
                <div>
                  Floor <span className="text-ocean">{suite.floor ?? '—'}</span>
                </div>
                <div>
                  Size <span className="text-ocean">{suite.size ?? '—'} sq ft</span>
                </div>
                <div>
                  Lock-in <span className="text-ocean">{p.lockIn ?? 36} mo</span>
                </div>
              </dl>
              {discounted && (
                <span className="mt-5 inline-flex w-fit items-center border border-gold bg-gold/90 px-2.5 py-1 text-xs font-semibold text-ocean">
                  {p.discountPct}% OFF · Ends {formatDate(p.promoEndsAt)}
                </span>
              )}
              {(() => {
                const total = planTotal(p);
                const bookingAmount = Math.round(total * 0.1);
                return (
                  <div className="mt-5 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">Total price</p>
                      {discounted && (
                        <p className="text-sm text-ocean/50 line-through">{formatMoney(p.price)}</p>
                      )}
                      <p className="font-display text-2xl font-semibold text-ocean">{formatMoney(total)}</p>
                    </div>
                    <div className="border border-gold/50 bg-gold/10 px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-ocean/70">Booking amount</p>
                      <p className="font-display mt-0.5 text-3xl font-bold text-ocean">
                        {formatMoney(bookingAmount)}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-ocean/65">
                        Pay only 10% today to reserve this plan
                      </p>
                    </div>
                  </div>
                );
              })()}
              {returns && (
                <div className="mt-4 border border-gold/40 bg-gold/5 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">
                    Expected return / year
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ocean">
                    {formatMoney(returns.low, 0)} – {formatMoney(returns.high, 0)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ocean/55">
                    Projected rental income · varies with occupancy & rates
                  </p>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button>Buy this plan</Button>
                </Link>
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button variant="outline">Details</Button>
                </Link>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="border border-ocean/10 p-6 text-ocean/70 sm:col-span-2 lg:col-span-3">
            {plans.length === 0
              ? 'No unsold plans available right now. Check back soon or contact sales.'
              : 'No plans match these filters. Try widening the price range or clearing filters.'}
          </div>
        )}
      </div>
    </main>
  );
}
