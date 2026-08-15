'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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

type FilterOptions = {
  views: string[];
  categories: string[];
  floors: number[];
  days: number[];
};

function humanView(v: string | undefined, t: (key: string) => string) {
  const s = (v || '').toLowerCase();
  if (s.includes('sea')) return t('seaView');
  if (s.includes('hill')) return t('hillView');
  return v || '—';
}

function FieldWrap({ label, children }: { label?: string; children: ReactNode }) {
  if (!label) return children;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ocean/50">{label}</span>
      {children}
    </label>
  );
}

function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex shrink-0 items-center gap-1 border border-ocean/15 bg-pearl px-2 py-1 text-xs font-semibold text-ocean"
    >
      {children}
      <span aria-hidden className="text-ocean/45">
        ×
      </span>
    </button>
  );
}

function CatalogFilters({
  filters,
  setFilter,
  filterOptions,
  isAdmin,
  adminStatus,
  setAdminStatus,
  availableCount,
  reservedCount,
  soldOnlyCount,
  fieldClass,
  labeled,
  showSearch,
  t
}: {
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  filterOptions: FilterOptions;
  isAdmin: boolean;
  adminStatus: AdminStatusFilter;
  setAdminStatus: (v: AdminStatusFilter) => void;
  availableCount: number;
  reservedCount: number;
  soldOnlyCount: number;
  fieldClass: string;
  labeled?: boolean;
  showSearch?: boolean;
  t: (key: string, values?: any) => string;
}) {
  return (
    <div className={labeled ? 'space-y-3' : 'flex flex-wrap items-center gap-x-3 gap-y-3'}>
      {showSearch && (
        <FieldWrap label={labeled ? t('search') : undefined}>
          <input
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            className={labeled ? fieldClass : `${fieldClass} min-w-[10rem] flex-1 !w-auto shrink`}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchAria')}
          />
        </FieldWrap>
      )}
      <FieldWrap label={labeled ? t('view') : undefined}>
        <select
          value={filters.view}
          onChange={(e) => setFilter('view', e.target.value)}
          className={labeled ? fieldClass : `${fieldClass} !w-[8.5rem]`}
          aria-label={t('view')}
        >
          <option value="">{t('allViews')}</option>
          {filterOptions.views.map((v) => (
            <option key={v} value={v}>
              {humanView(v, t)}
            </option>
          ))}
        </select>
      </FieldWrap>
      <FieldWrap label={labeled ? t('suiteType') : undefined}>
        <select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className={labeled ? fieldClass : `${fieldClass} !w-[8.5rem]`}
          aria-label={t('categoryAria')}
        >
          <option value="">{t('allTypes')}</option>
          {filterOptions.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FieldWrap>
      <FieldWrap label={labeled ? t('floor') : undefined}>
        <select
          value={filters.floor}
          onChange={(e) => setFilter('floor', e.target.value)}
          className={labeled ? fieldClass : `${fieldClass} !w-[7rem]`}
          aria-label={t('floor')}
        >
          <option value="">{t('allFloors')}</option>
          {filterOptions.floors.map((f) => (
            <option key={f} value={String(f)}>
              {t('floorN', { n: f })}
            </option>
          ))}
        </select>
      </FieldWrap>
      <FieldWrap label={labeled ? t('daysPerMonth') : undefined}>
        <select
          value={filters.days}
          onChange={(e) => setFilter('days', e.target.value)}
          className={labeled ? fieldClass : `${fieldClass} !w-[7.5rem]`}
          aria-label={t('daysPerMonth')}
        >
          <option value="">{t('allDays')}</option>
          {filterOptions.days.map((d) => (
            <option key={d} value={String(d)}>
              {d >= 30 ? t('fullMonth') : t('daysCount', { count: d })}
            </option>
          ))}
        </select>
      </FieldWrap>
      <div className={labeled ? 'grid grid-cols-2 gap-3' : 'contents'}>
        <FieldWrap label={labeled ? t('minPrice') : undefined}>
          <input
            type="number"
            min={0}
            value={filters.priceMin}
            onChange={(e) => setFilter('priceMin', e.target.value)}
            className={labeled ? fieldClass : `${fieldClass} !w-[7.5rem]`}
            placeholder={t('minPlaceholder')}
            aria-label={t('minAria')}
          />
        </FieldWrap>
        <FieldWrap label={labeled ? t('maxPrice') : undefined}>
          <input
            type="number"
            min={0}
            value={filters.priceMax}
            onChange={(e) => setFilter('priceMax', e.target.value)}
            className={labeled ? fieldClass : `${fieldClass} !w-[7.5rem]`}
            placeholder={t('maxPlaceholder')}
            aria-label={t('maxAria')}
          />
        </FieldWrap>
      </div>
      {isAdmin && (
        <FieldWrap label={labeled ? t('status') : undefined}>
          <select
            value={adminStatus}
            onChange={(e) => setAdminStatus(e.target.value as AdminStatusFilter)}
            className={labeled ? fieldClass : `${fieldClass} !w-[9rem]`}
            aria-label={t('adminStatusAria')}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="unsold">{t('unsoldCount', { count: availableCount })}</option>
            <option value="reserved">{t('reservedCount', { count: reservedCount })}</option>
            <option value="sold">{t('bookedCount', { count: soldOnlyCount })}</option>
          </select>
        </FieldWrap>
      )}
    </div>
  );
}

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
  const t = useTranslations('invest');
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sheetTitleRef = useRef<HTMLHeadingElement>(null);

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
      setError(t('loadFailed'));
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

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetTitleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setFiltersOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
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

  const sheetFilterCount = useMemo(() => {
    const base = Object.entries(filters).filter(([k, v]) => k !== 'q' && String(v).trim() !== '').length;
    return base + (isAdmin && adminStatus ? 1 : 0);
  }, [filters, isAdmin, adminStatus]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    if (isAdmin) setAdminStatus('');
  }

  const compactField = 'field h-11 py-2.5 text-sm leading-normal !w-auto shrink-0';
  const sheetField = 'field h-11 py-2.5 text-sm leading-normal';
  const filterFieldProps = {
    filters,
    setFilter,
    filterOptions,
    isAdmin,
    adminStatus,
    setAdminStatus,
    availableCount,
    reservedCount,
    soldOnlyCount
  };
  const activeChips = [
    filters.view ? { key: 'view', label: humanView(filters.view, t), clear: () => setFilter('view', '') } : null,
    filters.category ? { key: 'category', label: filters.category, clear: () => setFilter('category', '') } : null,
    filters.floor ? { key: 'floor', label: t('floorN', { n: filters.floor }), clear: () => setFilter('floor', '') } : null,
    filters.days
      ? {
          key: 'days',
          label: Number(filters.days) >= 30 ? t('fullMonth') : t('daysCount', { count: Number(filters.days) }),
          clear: () => setFilter('days', '')
        }
      : null,
    filters.priceMin ? { key: 'priceMin', label: t('chipMin', { value: filters.priceMin }), clear: () => setFilter('priceMin', '') } : null,
    filters.priceMax ? { key: 'priceMax', label: t('chipMax', { value: filters.priceMax }), clear: () => setFilter('priceMax', '') } : null,
    isAdmin && adminStatus
      ? {
          key: 'status',
          label: adminStatus === 'sold' ? t('statusBooked') : adminStatus === 'reserved' ? t('statusReserved') : t('statusUnsold'),
          clear: () => setAdminStatus('')
        }
      : null
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const resultSummary = (
    <p>
      {t('shown', { count: filtered.length })}
      <span className="text-ocean/40"> · </span>
      {t('available', { count: availableCount })}
      {(showSold || (isAdmin && !!adminStatus)) && (
        <>
          <span className="text-ocean/40"> · </span>
          {t('bookedReserved', { count: soldCount })}
        </>
      )}
      {activeFilterCount > 0 && (
        <>
          <span className="text-ocean/40"> · </span>
          {t('filtersCount', { count: activeFilterCount })}
        </>
      )}
    </p>
  );

  const resultActions = (
    <div className="flex flex-wrap items-center gap-x-3">
      {!(isAdmin && adminStatus) && (
        <button type="button" className="font-semibold text-ocean hover:text-gold" onClick={() => setShowSold((v) => !v)}>
          showSold ? t('hideBooked') : t('showBooked')
        </button>
      )}
      <button
        type="button"
        className="font-semibold text-ocean hover:text-gold"
        onClick={() => setPriceSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
      >
        {t('price', { arrow: priceSort === 'asc' ? '↑' : '↓' })}
      </button>
      {activeFilterCount > 0 && (
        <button type="button" className="font-semibold text-ocean hover:text-gold" onClick={clearFilters}>
          {t('clear')}
        </button>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ocean md:text-4xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-ocean/70">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/invest/advisor" className="sm:inline-flex">
            <Button className="w-full sm:w-auto">{t('helpChoose')}</Button>
          </Link>
          <Button variant="ghost" onClick={load} className="px-3 py-2">
            loading ? t('refreshing') : t('refresh')
          </Button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="sticky top-[3.85rem] z-40 mt-4 border border-ocean/10 bg-white/95 px-3 py-2 shadow-sm backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={filters.q}
              onChange={(e) => setFilter('q', e.target.value)}
              className="field h-11 w-full py-2.5 pr-8 text-sm leading-normal"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchAria')}
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => setFilter('q', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-lg leading-none text-ocean/45"
                aria-label={t('clearSearch')}
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 shrink-0 items-center border border-ocean/20 bg-white px-3 text-sm font-semibold text-ocean"
            aria-expanded={filtersOpen}
            aria-controls="invest-filters-sheet"
          >
            {t('filters')}
            {sheetFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ocean px-1 text-[11px] text-white">
                {sheetFilterCount}
              </span>
            )}
          </button>
        </div>
        {activeChips.length > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {activeChips.map((chip) => (
              <FilterChip key={chip.key} onRemove={chip.clear}>
                {chip.label}
              </FilterChip>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-ocean/70">
          <span className="font-semibold text-ocean">{filtered.length}</span> shown
          {activeFilterCount > 0 && (
            <>
              <span className="text-ocean/40"> · </span>
              {t('filtersCount', { count: activeFilterCount })}
            </>
          )}
        </p>
      </section>

      <section className="sticky top-[4.5rem] z-40 mt-5 hidden overflow-visible border border-ocean/10 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:block">
        <CatalogFilters {...filterFieldProps} fieldClass={compactField} showSearch t={t} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-ocean/70">
          {resultSummary}
          {resultActions}
        </div>
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ocean/40"
            aria-label={t('closeFilters')}
            onClick={() => setFiltersOpen(false)}
          />
          <div
            id="invest-filters-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invest-filters-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ocean/10 px-4 py-3">
              <h2
                id="invest-filters-title"
                ref={sheetTitleRef}
                tabIndex={-1}
                className="font-display text-xl text-ocean outline-none"
              >
                {t('filters')}
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="px-2 text-2xl leading-none text-ocean/50"
                aria-label={t('closeFilters')}
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {!(isAdmin && adminStatus) && (
                  <button
                    type="button"
                    className="min-h-11 border border-ocean/15 px-3 text-sm font-semibold text-ocean"
                    onClick={() => setShowSold((v) => !v)}
                  >
                    showSold ? t('hideBooked') : t('showBooked')
                  </button>
                )}
                <button
                  type="button"
                  className="min-h-11 border border-ocean/15 px-3 text-sm font-semibold text-ocean"
                  onClick={() => setPriceSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
                >
                  {priceSort === 'asc' ? t('priceLowHigh') : t('priceHighLow')}
                </button>
              </div>
              <CatalogFilters {...filterFieldProps} fieldClass={sheetField} labeled t={t} />
            </div>
            <div className="flex gap-2 border-t border-ocean/10 px-4 py-3">
              {sheetFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 px-4 text-sm font-semibold text-ocean"
                >
                  {t('clear')}
                </button>
              )}
              <Button className="h-11 flex-1 py-0" onClick={() => setFiltersOpen(false)}>
                {t('showPlans', { count: filtered.length })}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p: any) => {
          const suite = suites[p.suiteId] || {};
          const discounted = typeof p.discountedPrice === 'number';
          const returns = annualReturnRange(p.daysPerMonth, assumptions, suite);
          const available = isUnsoldPlan(p);
          const sold = isSoldPlan(p);
          const statusLabel = sold ? t('statusBooked') : planStatusKey(p) === 'reserved' ? t('statusReserved') : t('statusAvailable');
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
                    {t('metaDays', { type: suite.type ?? t('suiteFallback'), view: humanView(suite.view, t), days: p.daysPerMonth })}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ocean/55">
                    {t('metaFloor', { suiteId: p.suiteId ?? '—', floor: suite.floor ?? '—' })}
                    {suite.size ? t('metaSize', { size: suite.size }) : ''}
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
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean/50">{t('total')}</p>
                    {discounted && (
                      <p className="text-xs text-ocean/45 line-through">{formatMoney(p.price)}</p>
                    )}
                    <p className="font-display text-lg font-semibold leading-tight text-ocean">{formatMoney(total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ocean/50">
                      {t('todayPct', { pct: standardPct })}
                    </p>
                    <p className="font-display text-2xl font-bold leading-tight text-ocean">
                      {formatMoney(bookingAmount)}
                    </p>
                  </div>
                </div>
              ) : sold ? (
                <div className="mt-3 border border-ocean/10 bg-pearl px-3 py-2.5">
                  {owner ? (
                    <PlanOwner owner={owner} statusLabel={t('bookedBy')} />
                  ) : (
                    <p className="text-sm text-ocean/70">{t('shareBooked')}</p>
                  )}
                  <p className="mt-2 text-xs text-ocean/55">{t('soldAt', { amount: formatMoney(total) })}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ocean/70">{t('heldBooking')}</p>
              )}

              {(discounted && available) || (available && full?.offeredDiscountPct > 0) || (returns && available) ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ocean/65">
                  {discounted && available && (
                    <span className="font-semibold text-ocean">
                      {t('promoOff', { pct: p.discountPct, date: formatDate(p.promoEndsAt) })}
                    </span>
                  )}
                  {available && full?.offeredDiscountPct > 0 && (
                    <span>{t('payFullSave', { pct: Number(full.offeredDiscountPct).toFixed(1) })}</span>
                  )}
                  {returns && available && (
                    <span>
                      {t('rentRange', { low: formatMoney(returns.low, 0), high: formatMoney(returns.high, 0) })}
                    </span>
                  )}
                </p>
              ) : null}

              <div className="mt-3">
                {available ? (
                  <Link href={`/pricing/plans/${p.id}`} className="block">
                    <Button className="w-full px-4 py-2.5">{t('reserveFrom', { amount: formatMoney(bookingAmount) })}</Button>
                  </Link>
                ) : sold ? (
                  <Link href={`/pricing/plans/${p.id}`} className="block">
                    <Button variant="outline" className="w-full px-4 py-2.5">
                      owner ? t('seeWhoBooked') : t('viewBookedPlan')
                    </Button>
                  </Link>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full cursor-not-allowed border-gold/40 px-4 py-2.5 text-ocean/60"
                  >
                    {t('statusReserved')}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="border border-ocean/10 p-6 text-ocean/70 sm:col-span-2 xl:col-span-3">
            {availableCount === 0 && !showSold
              ? t('emptyNoAvailable')
              : plans.length === 0
                ? t('emptyNone')
                : t('emptyFiltered')}
          </div>
        )}
      </div>
    </main>
  );
}
