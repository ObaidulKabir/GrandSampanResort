'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { annualReturnRange, normalizeReturnAssumptions, type ReturnAssumptions } from '@/lib/returns';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';

type Filters = {
  q: string;
  view: string;
  category: string;
  floor: string;
  days: string;
  priceMin: string;
  priceMax: string;
};

type AdminStatusFilter = '' | 'unsold' | 'reserved' | 'sold';

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

function planStatusKey(p: any) {
  return String(p?.planStatus || 'Unsold').toLowerCase().trim();
}

function isUnsoldPlan(p: any) {
  return planStatusKey(p) === 'unsold';
}

function isSoldPlan(p: any) {
  const s = planStatusKey(p);
  return s === 'booked' || s === 'sold';
}

function isReservedPlan(p: any) {
  return planStatusKey(p) === 'reserved';
}

function matchesAdminStatus(p: any, status: AdminStatusFilter) {
  if (!status) return true;
  if (status === 'unsold') return isUnsoldPlan(p);
  if (status === 'reserved') return isReservedPlan(p);
  if (status === 'sold') return isSoldPlan(p);
  return true;
}

export default function InvestPage() {
  const user = useAppStore((s) => s.user);
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const isAdmin = hydrated && user?.role === 'admin';

  const [plans, setPlans] = useState<any[]>([]);
  const [suites, setSuites] = useState<Record<string, any>>({});
  const [assumptions, setAssumptions] = useState<ReturnAssumptions | null>(null);
  const [payPolicy, setPayPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [priceSort, setPriceSort] = useState<'asc' | 'desc'>('asc');
  const [showSold, setShowSold] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminStatusFilter>('');
  const [filtersVisible, setFiltersVisible] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Non-admins should never keep an admin-only status filter applied.
  useEffect(() => {
    if (hydrated && !isAdmin && adminStatus) setAdminStatus('');
  }, [hydrated, isAdmin, adminStatus]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [plansJson, suitesJson, returnsJson, policyJson] = await Promise.all([
        api('/timeshares'),
        api('/suites'),
        api('/settings/return-assumptions').catch(() => null),
        api('/payment-plans/policy').catch(() => null)
      ]);
      const items = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
      const suitesArr = Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [];
      const byId = Object.fromEntries((suitesArr as any[]).map((s: any) => [s.id, s]));
      setSuites(byId);
      // Keep available + sold/booked plans; drop other draft/internal statuses.
      setPlans(
        items.filter((p: any) => {
          const status = planStatusKey(p);
          return status === 'unsold' || status === 'booked' || status === 'sold' || status === 'reserved';
        })
      );
      if (returnsJson) setAssumptions(normalizeReturnAssumptions(returnsJson));
      if (policyJson?.ok) setPayPolicy(policyJson);
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
    return plans
      .filter((p) => {
        if (isAdmin && adminStatus) {
          if (!matchesAdminStatus(p, adminStatus)) return false;
        } else if (!showSold && !isUnsoldPlan(p)) {
          return false;
        }
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
            p.planType,
            p.planStatus
          ]
            .map((x) => String(x ?? '').toLowerCase())
            .join(' ');
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceCmp =
          priceSort === 'asc' ? planTotal(a) - planTotal(b) : planTotal(b) - planTotal(a);
        if (priceCmp !== 0) return priceCmp;
        return String(a.id).localeCompare(String(b.id), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
  }, [plans, suites, filters, priceSort, showSold, isAdmin, adminStatus]);

  const availableCount = useMemo(() => plans.filter(isUnsoldPlan).length, [plans]);
  const soldCount = useMemo(() => plans.filter((p) => !isUnsoldPlan(p)).length, [plans]);
  const reservedCount = useMemo(() => plans.filter(isReservedPlan).length, [plans]);
  const soldOnlyCount = useMemo(() => plans.filter(isSoldPlan).length, [plans]);

  const activeFilterCount = useMemo(() => {
    const base = Object.values(filters).filter((v) => String(v).trim() !== '').length;
    return base + (isAdmin && adminStatus ? 1 : 0);
  }, [filters, isAdmin, adminStatus]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    if (isAdmin) setAdminStatus('');
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
          <p className="mt-3 max-w-2xl text-ocean/70">
            Reserve from 10% today, or pay more now to save. Filter by view, floor, or price — or
            let us match a plan to what you can pay.
          </p>
          <div className="mt-4">
            <Link href="/invest/advisor">
              <Button>Help me choose</Button>
            </Link>
          </div>
        </div>
        <Button variant="outline" onClick={load}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="sticky top-[4.75rem] z-40 mt-8 border border-ocean/10 bg-white/95 p-4 shadow-sm backdrop-blur md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold">Find a plan</p>
            <p className="mt-1 text-sm text-ocean/70">
              Showing {filtered.length} plan{filtered.length === 1 ? '' : 's'}
              {` · ${availableCount} available`}
              {showSold || (isAdmin && !!adminStatus)
                ? ` · ${soldCount} sold/reserved`
                : ''}
              {isAdmin && adminStatus
                ? ` · admin status: ${adminStatus}`
                : ''}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} on` : ''}
              {' · '}
              price {priceSort === 'asc' ? 'low → high' : 'high → low'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFiltersVisible((v) => !v)}
              aria-expanded={filtersVisible}
            >
              {filtersVisible ? 'Hide filters' : 'Show filters'}
            </Button>
            {!(isAdmin && adminStatus) && (
              <Button
                type="button"
                variant={showSold ? 'outline' : 'primary'}
                onClick={() => setShowSold((v) => !v)}
              >
                {showSold ? 'Hide sold plans' : 'Show sold plans'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setPriceSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
            >
              {priceSort === 'asc' ? 'Price: High → Low' : 'Price: Low → High'}
            </Button>
            {activeFilterCount > 0 && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {filtersVisible && (
          <div className="mt-4 max-h-[min(50vh,28rem)] overflow-y-auto grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-medium text-ocean sm:col-span-2 lg:col-span-2">
              Search
              <input
                value={filters.q}
                onChange={(e) => setFilter('q', e.target.value)}
                className="field mt-1"
                placeholder="Plan ID, name, suite…"
              />
            </label>
            {isAdmin && (
              <label className="block text-sm font-medium text-ocean sm:col-span-2 lg:col-span-2">
                Status <span className="font-normal text-ocean/50">(admin)</span>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value as AdminStatusFilter)}
                  className="field mt-1"
                >
                  <option value="">All statuses</option>
                  <option value="unsold">Unsold only ({availableCount})</option>
                  <option value="reserved">Reserved only ({reservedCount})</option>
                  <option value="sold">Sold only ({soldOnlyCount})</option>
                </select>
              </label>
            )}
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
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p: any) => {
          const suite = suites[p.suiteId] || {};
          const isFull = (p.daysPerMonth ?? 0) >= 30;
          const discounted = typeof p.discountedPrice === 'number';
          const returns = annualReturnRange(p.daysPerMonth, assumptions, suite);
          const available = isUnsoldPlan(p);
          const sold = isSoldPlan(p);
          const statusLabel = sold
            ? 'Sold'
            : planStatusKey(p) === 'reserved'
              ? 'Reserved'
              : 'Available';
          const total = planTotal(p);
          const standardPct = Number(payPolicy?.resolved?.find((t: any) => t.id === 'standard')?.upfrontPct) || 10;
          const bookingAmount = Math.round(total * (standardPct / 100));
          const full = payPolicy?.resolved?.find((t: any) => t.upfrontPct >= 100);
          return (
            <article
              key={p.id}
              className={`relative flex flex-col overflow-hidden border p-6 ${
                available
                  ? discounted || isFull
                    ? 'border-gold/55 bg-white shadow-[0_1px_0_rgba(212,175,55,0.25)]'
                    : 'border-ocean/20 bg-white'
                  : sold
                    ? 'border-ocean/15 bg-[linear-gradient(180deg,#eef2f4_0%,#e6ebef_100%)]'
                    : 'border-gold/35 bg-[linear-gradient(180deg,#fbf8f1_0%,#f3eee3_100%)]'
              }`}
            >
              {!available && (
                <div
                  className={`absolute right-0 top-0 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                    sold ? 'bg-ocean text-white' : 'bg-gold text-ocean'
                  }`}
                >
                  {statusLabel}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <h2
                  className={`font-display text-2xl ${
                    available ? 'text-ocean' : sold ? 'text-ocean/55' : 'text-ocean/75'
                  }`}
                >
                  {p.name}
                </h2>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`border px-2.5 py-1 text-xs font-semibold ${
                      available
                        ? 'border-ocean/15 bg-pearl text-ocean'
                        : 'border-ocean/10 bg-white/50 text-ocean/55'
                    }`}
                  >
                    {p.daysPerMonth} days/mo
                  </span>
                  {available ? (
                    <span className="border border-gold/60 bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ocean">
                      Available
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        sold
                          ? 'border border-ocean/20 bg-ocean/10 text-ocean/60'
                          : 'border border-gold/40 bg-gold/20 text-ocean/80'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className={`mt-4 flex items-center gap-3 ${!available ? 'opacity-60 grayscale' : ''}`}>
                <div className="relative h-8 w-8">
                  <Image src={suiteTypeIcon(suite.type)} alt="" fill sizes="32px" />
                </div>
                <span className={`text-sm ${available ? 'text-ocean/80' : 'text-ocean/55'}`}>
                  {suite.type ?? 'Suite'} · {humanView(suite.view)}
                </span>
              </div>
              <dl
                className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm ${
                  available ? 'text-ocean/70' : 'text-ocean/45'
                }`}
              >
                <div>
                  Suite <span className={available ? 'text-ocean' : 'text-ocean/60'}>{p.suiteId ?? '—'}</span>
                </div>
                <div>
                  Floor <span className={available ? 'text-ocean' : 'text-ocean/60'}>{suite.floor ?? '—'}</span>
                </div>
                <div>
                  Size{' '}
                  <span className={available ? 'text-ocean' : 'text-ocean/60'}>
                    {suite.size ?? '—'} sq ft
                  </span>
                </div>
                <div>
                  Lock-in{' '}
                  <span className={available ? 'text-ocean' : 'text-ocean/60'}>{p.lockIn ?? 36} mo</span>
                </div>
              </dl>
              {discounted && available && (
                <span className="mt-5 inline-flex w-fit items-center border border-gold bg-gold/90 px-2.5 py-1 text-xs font-semibold text-ocean">
                  {p.discountPct}% OFF · Ends {formatDate(p.promoEndsAt)}
                </span>
              )}
              <div className="mt-5 space-y-3">
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      available ? 'text-ocean/60' : 'text-ocean/40'
                    }`}
                  >
                    Total price
                  </p>
                  {discounted && available && (
                    <p className="text-sm text-ocean/50 line-through">{formatMoney(p.price)}</p>
                  )}
                  <p
                    className={`font-display text-2xl font-semibold ${
                      available ? 'text-ocean' : 'text-ocean/50 line-through decoration-ocean/30'
                    }`}
                  >
                    {formatMoney(total)}
                  </p>
                </div>
                {available && full?.offeredDiscountPct > 0 && (
                  <span className="inline-flex w-fit items-center border border-gold bg-gold/90 px-2.5 py-1 text-xs font-semibold text-ocean">
                    Pay in full, save {Number(full.offeredDiscountPct).toFixed(1)}%
                  </span>
                )}
                {available ? (
                  <div className="border border-gold/50 bg-gold/10 px-3 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-ocean/70">To reserve today</p>
                    <p className="font-display mt-0.5 text-3xl font-bold text-ocean">
                      {formatMoney(bookingAmount)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-ocean/65">
                      {standardPct}% now · pay more at checkout to save
                    </p>
                  </div>
                ) : (
                  <div
                    className={`border px-3 py-3 ${
                      sold
                        ? 'border-dashed border-ocean/25 bg-white/40'
                        : 'border-dashed border-gold/40 bg-white/50'
                    }`}
                  >
                    <p
                      className={`text-xs font-bold uppercase tracking-wide ${
                        sold ? 'text-ocean/55' : 'text-ocean/70'
                      }`}
                    >
                      {sold ? 'No longer available' : 'Temporarily held'}
                    </p>
                    <p className={`mt-1 text-sm ${sold ? 'text-ocean/55' : 'text-ocean/70'}`}>
                      {sold
                        ? 'This share plan has already been purchased.'
                        : 'This share plan is reserved while a booking is being completed.'}
                    </p>
                  </div>
                )}
              </div>
              {returns && available && (
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
                {available ? (
                    <Link href={`/pricing/plans/${p.id}`}>
                      <Button>Reserve from {formatMoney(bookingAmount)}</Button>
                    </Link>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className={
                      sold
                        ? 'cursor-not-allowed border-ocean/20 text-ocean/45'
                        : 'cursor-not-allowed border-gold/40 text-ocean/60'
                    }
                  >
                    {sold ? 'Sold out' : 'Reserved'}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="border border-ocean/10 p-6 text-ocean/70 sm:col-span-2 lg:col-span-3">
            {availableCount === 0 && !showSold
              ? 'No available plans right now. Turn on “Show sold plans” to browse sold/reserved inventory, or check back soon.'
              : plans.length === 0
                ? 'No plans available right now. Check back soon or contact sales.'
                : 'No plans match these filters. Try widening the price range or clearing filters.'}
          </div>
        )}
      </div>
    </main>
  );
}
