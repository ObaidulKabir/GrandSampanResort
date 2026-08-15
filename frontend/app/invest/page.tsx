'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { annualReturnRange, normalizeReturnAssumptions, type ReturnAssumptions } from '@/lib/returns';
import Button from '@/components/Button';
import PlanOwner from '@/components/PlanOwner';
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

  function humanView(v?: string) {
    const s = (v || '').toLowerCase();
    if (s.includes('sea')) return 'Sea View';
    if (s.includes('hill')) return 'Hill View';
    return v || '—';
  }

  const compactField = 'field h-11 py-2.5 text-sm leading-normal !w-auto shrink-0';

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ocean md:text-4xl">Invest in a Suite</h1>
          <p className="mt-1 text-sm text-ocean/70">
            Reserve from 10% today. Booked cards show who already invested — name, profession, and city.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invest/advisor">
            <Button>Help me choose</Button>
          </Link>
          <Button variant="ghost" onClick={load} className="px-3 py-2">
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="sticky top-[4.75rem] z-40 mt-5 overflow-visible border border-ocean/10 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <input
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            className={`${compactField} min-w-[10rem] flex-1 !w-auto shrink`}
            placeholder="Search plan, suite…"
            aria-label="Search plans"
          />
          <select
            value={filters.view}
            onChange={(e) => setFilter('view', e.target.value)}
            className={`${compactField} !w-[8.5rem]`}
            aria-label="View"
          >
            <option value="">All views</option>
            {filterOptions.views.map((v) => (
              <option key={v} value={v}>
                {humanView(v)}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value)}
            className={`${compactField} !w-[8.5rem]`}
            aria-label="Category"
          >
            <option value="">All types</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filters.floor}
            onChange={(e) => setFilter('floor', e.target.value)}
            className={`${compactField} !w-[7rem]`}
            aria-label="Floor"
          >
            <option value="">All floors</option>
            {filterOptions.floors.map((f) => (
              <option key={f} value={String(f)}>
                Floor {f}
              </option>
            ))}
          </select>
          <select
            value={filters.days}
            onChange={(e) => setFilter('days', e.target.value)}
            className={`${compactField} !w-[7.5rem]`}
            aria-label="Days per month"
          >
            <option value="">All days</option>
            {filterOptions.days.map((d) => (
              <option key={d} value={String(d)}>
                {d >= 30 ? 'Full month' : `${d} days`}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={filters.priceMin}
            onChange={(e) => setFilter('priceMin', e.target.value)}
            className={`${compactField} !w-[7.5rem]`}
            placeholder="Min ৳"
            aria-label="Minimum price"
          />
          <input
            type="number"
            min={0}
            value={filters.priceMax}
            onChange={(e) => setFilter('priceMax', e.target.value)}
            className={`${compactField} !w-[7.5rem]`}
            placeholder="Max ৳"
            aria-label="Maximum price"
          />
          {isAdmin && (
            <select
              value={adminStatus}
              onChange={(e) => setAdminStatus(e.target.value as AdminStatusFilter)}
              className={`${compactField} !w-[9rem]`}
              aria-label="Admin status"
            >
              <option value="">All statuses</option>
              <option value="unsold">Unsold ({availableCount})</option>
              <option value="reserved">Reserved ({reservedCount})</option>
              <option value="sold">Booked ({soldOnlyCount})</option>
            </select>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-ocean/70">
          <p>
            <span className="font-semibold text-ocean">{filtered.length}</span> shown
            <span className="text-ocean/40"> · </span>
            {availableCount} available
            {(showSold || (isAdmin && !!adminStatus)) && (
              <>
                <span className="text-ocean/40"> · </span>
                {soldCount} booked/reserved
              </>
            )}
            {activeFilterCount > 0 && (
              <>
                <span className="text-ocean/40"> · </span>
                {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-3">
            {!(isAdmin && adminStatus) && (
              <button type="button" className="font-semibold text-ocean hover:text-gold" onClick={() => setShowSold((v) => !v)}>
                {showSold ? 'Hide booked' : 'Show booked'}
              </button>
            )}
            <button
              type="button"
              className="font-semibold text-ocean hover:text-gold"
              onClick={() => setPriceSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
            >
              Price {priceSort === 'asc' ? '↑' : '↓'}
            </button>
            {activeFilterCount > 0 && (
              <button type="button" className="font-semibold text-ocean hover:text-gold" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p: any) => {
          const suite = suites[p.suiteId] || {};
          const discounted = typeof p.discountedPrice === 'number';
          const returns = annualReturnRange(p.daysPerMonth, assumptions, suite);
          const available = isUnsoldPlan(p);
          const sold = isSoldPlan(p);
          const statusLabel = sold ? 'Booked' : planStatusKey(p) === 'reserved' ? 'Reserved' : 'Available';
          const total = planTotal(p);
          const standardPct = Number(payPolicy?.resolved?.find((t: any) => t.id === 'standard')?.upfrontPct) || 10;
          const bookingAmount = Math.round(total * (standardPct / 100));
          const full = payPolicy?.resolved?.find((t: any) => t.upfrontPct >= 100);
          const owner = p.owner;
          return (
            <article
              key={p.id}
              className={`flex flex-col border px-4 py-3.5 ${
                available
                  ? discounted
                    ? 'border-gold/55 bg-white'
                    : 'border-ocean/15 bg-white'
                  : sold
                    ? 'border-ocean/20 bg-white'
                    : 'border-gold/35 bg-[#fbf8f1]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display truncate text-xl leading-tight text-ocean">{p.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-ocean/70">
                    {suite.type ?? 'Suite'} · {humanView(suite.view)} · {p.daysPerMonth} days/mo
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ocean/55">
                    {p.suiteId ?? '—'} · Floor {suite.floor ?? '—'}
                    {suite.size ? ` · ${suite.size} sq ft` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    available
                      ? 'border border-gold/60 bg-gold/15 text-ocean'
                      : sold
                        ? 'border border-ocean bg-ocean text-white'
                        : 'border border-gold/40 bg-gold/20 text-ocean/80'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              {available ? (
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean/50">Total</p>
                    {discounted && (
                      <p className="text-xs text-ocean/45 line-through">{formatMoney(p.price)}</p>
                    )}
                    <p className="font-display text-lg font-semibold leading-tight text-ocean">{formatMoney(total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ocean/50">
                      Today · {standardPct}%
                    </p>
                    <p className="font-display text-2xl font-bold leading-tight text-ocean">
                      {formatMoney(bookingAmount)}
                    </p>
                  </div>
                </div>
              ) : sold ? (
                <div className="mt-3 border border-ocean/10 bg-pearl px-3 py-2.5">
                  {owner ? (
                    <PlanOwner owner={owner} statusLabel="Booked by" />
                  ) : (
                    <p className="text-sm text-ocean/70">This share has been booked.</p>
                  )}
                  <p className="mt-2 text-xs text-ocean/55">Sold at {formatMoney(total)}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ocean/70">Held while a booking completes</p>
              )}

              {(discounted && available) || (available && full?.offeredDiscountPct > 0) || (returns && available) ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ocean/65">
                  {discounted && available && (
                    <span className="font-semibold text-ocean">
                      {p.discountPct}% off until {formatDate(p.promoEndsAt)}
                    </span>
                  )}
                  {available && full?.offeredDiscountPct > 0 && (
                    <span>Pay in full, save {Number(full.offeredDiscountPct).toFixed(1)}%</span>
                  )}
                  {returns && available && (
                    <span>
                      Rent {formatMoney(returns.low, 0)}–{formatMoney(returns.high, 0)}/yr
                    </span>
                  )}
                </p>
              ) : null}

              <div className="mt-3">
                {available ? (
                  <Link href={`/pricing/plans/${p.id}`} className="block">
                    <Button className="w-full px-4 py-2.5">Reserve from {formatMoney(bookingAmount)}</Button>
                  </Link>
                ) : sold ? (
                  <Link href={`/pricing/plans/${p.id}`} className="block">
                    <Button variant="outline" className="w-full px-4 py-2.5">
                      {owner ? 'See who booked' : 'View booked plan'}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full cursor-not-allowed border-gold/40 px-4 py-2.5 text-ocean/60"
                  >
                    Reserved
                  </Button>
                )}
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="border border-ocean/10 p-6 text-ocean/70 sm:col-span-2 xl:col-span-3">
            {availableCount === 0 && !showSold
              ? 'No available plans right now. Turn on “Show booked” to see who already reserved a share, or check back soon.'
              : plans.length === 0
                ? 'No plans available right now. Check back soon or contact sales.'
                : 'No plans match these filters. Try widening the price range or clearing filters.'}
          </div>
        )}
      </div>
    </main>
  );
}
