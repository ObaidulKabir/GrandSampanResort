const fs = require('fs');
const p = 'app/(site)/[locale]/invest/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("from 'next-intl'")) {
  s = s.replace(
    "import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';",
    "import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';\nimport { useTranslations } from 'next-intl';"
  );
}

if (!s.includes("useTranslations('invest')")) {
  s = s.replace(
    'export default function InvestPage() {',
    "export default function InvestPage() {\n  const t = useTranslations('invest');"
  );
}

// Pass t into CatalogFilters
if (!s.includes('t: (key: string') && s.includes('function CatalogFilters({')) {
  s = s.replace(
    `function CatalogFilters({
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
  showSearch
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
}) {`,
    `function CatalogFilters({
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
  t: any;
}) {`
  );
}

s = s.replace(
  /function humanView\(v\?: string\) \{[\s\S]*?return v \|\| '—';\n\}/,
  `function humanView(v: string | undefined, t: any) {
  const s = (v || '').toLowerCase();
  if (s.includes('sea')) return t('seaView');
  if (s.includes('hill')) return t('hillView');
  return v || '—';
}`
);

const pairs = [
  ["FieldWrap label={labeled ? 'Search' : undefined}", "FieldWrap label={labeled ? t('search') : undefined}"],
  ['placeholder="Search plan, suite…"', "placeholder={t('searchPlaceholder')}"],
  ['aria-label="Search plans"', "aria-label={t('searchAria')}"],
  ["FieldWrap label={labeled ? 'View' : undefined}", "FieldWrap label={labeled ? t('view') : undefined}"],
  ['aria-label="View"', "aria-label={t('view')}"],
  ['All views', "{t('allViews')}"],
  ['{humanView(v)}', '{humanView(v, t)}'],
  ["FieldWrap label={labeled ? 'Suite type' : undefined}", "FieldWrap label={labeled ? t('suiteType') : undefined}"],
  ['aria-label="Category"', "aria-label={t('categoryAria')}"],
  ['All types', "{t('allTypes')}"],
  ["FieldWrap label={labeled ? 'Floor' : undefined}", "FieldWrap label={labeled ? t('floor') : undefined}"],
  ['aria-label="Floor"', "aria-label={t('floor')}"],
  ['All floors', "{t('allFloors')}"],
  ['Floor {f}', "{t('floorN', { n: f })}"],
  ["FieldWrap label={labeled ? 'Days per month' : undefined}", "FieldWrap label={labeled ? t('daysPerMonth') : undefined}"],
  ['aria-label="Days per month"', "aria-label={t('daysPerMonth')}"],
  ['All days', "{t('allDays')}"],
  ["{d >= 30 ? 'Full month' : `${d} days`}", "{d >= 30 ? t('fullMonth') : t('daysCount', { count: d })}"],
  ["FieldWrap label={labeled ? 'Min price' : undefined}", "FieldWrap label={labeled ? t('minPrice') : undefined}"],
  ['placeholder="Min ৳"', "placeholder={t('minPlaceholder')}"],
  ['aria-label="Minimum price"', "aria-label={t('minAria')}"],
  ["FieldWrap label={labeled ? 'Max price' : undefined}", "FieldWrap label={labeled ? t('maxPrice') : undefined}"],
  ['placeholder="Max ৳"', "placeholder={t('maxPlaceholder')}"],
  ['aria-label="Maximum price"', "aria-label={t('maxAria')}"],
  ["FieldWrap label={labeled ? 'Status' : undefined}", "FieldWrap label={labeled ? t('status') : undefined}"],
  ['aria-label="Admin status"', "aria-label={t('adminStatusAria')}"],
  ['All statuses', "{t('allStatuses')}"],
  ['Unsold ({availableCount})', "{t('unsoldCount', { count: availableCount })}"],
  ['Reserved ({reservedCount})', "{t('reservedCount', { count: reservedCount })}"],
  ['Booked ({soldOnlyCount})', "{t('bookedCount', { count: soldOnlyCount })}"],
  ["setError('Failed to load plans')", "setError(t('loadFailed'))"],
  ["label: humanView(filters.view)", "label: humanView(filters.view, t)"],
  ["label: `Floor ${filters.floor}`", "label: t('floorN', { n: filters.floor })"],
  ["label: Number(filters.days) >= 30 ? 'Full month' : `${filters.days} days`", "label: Number(filters.days) >= 30 ? t('fullMonth') : t('daysCount', { count: Number(filters.days) })"],
  ["label: `Min ${filters.priceMin}`", "label: t('chipMin', { value: filters.priceMin })"],
  ["label: `Max ${filters.priceMax}`", "label: t('chipMax', { value: filters.priceMax })"],
  ["label: adminStatus === 'sold' ? 'Booked' : adminStatus === 'reserved' ? 'Reserved' : 'Unsold'", "label: adminStatus === 'sold' ? t('statusBooked') : adminStatus === 'reserved' ? t('statusReserved') : t('statusUnsold')"],
  ['Invest in a Suite', "{t('title')}"],
  [
    'Reserve from 10% today. Booked cards show who already invested — name, profession, and city.',
    "{t('subtitle')}"
  ],
  ['Help me choose', "{t('helpChoose')}"],
  ["{loading ? 'Refreshing…' : 'Refresh'}", "loading ? t('refreshing') : t('refresh')"],
  ['aria-label="Clear search"', "aria-label={t('clearSearch')}"],
  ['Filters', "{t('filters')}"],
  ['Close filters', "{t('closeFilters')}"],
  ["{showSold ? 'Hide booked' : 'Show booked'}", "showSold ? t('hideBooked') : t('showBooked')"],
  ["Price {priceSort === 'asc' ? '↑' : '↓'}", "{t('price', { arrow: priceSort === 'asc' ? '↑' : '↓' })}"],
  ['Clear', "{t('clear')}"],
  ["Price {priceSort === 'asc' ? 'low → high' : 'high → low'}", "{priceSort === 'asc' ? t('priceLowHigh') : t('priceHighLow')}"],
  ['Show {filtered.length} plan{filtered.length === 1 ? \'\' : \'s\'}', "{t('showPlans', { count: filtered.length })}"],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 70));
}

// pass t into CatalogFilters usages
s = s.replace(
  /<CatalogFilters \{\.\.\.filterFieldProps\} fieldClass=\{compactField\} showSearch \/>/,
  '<CatalogFilters {...filterFieldProps} fieldClass={compactField} showSearch t={t} />'
);
s = s.replace(
  /<CatalogFilters \{\.\.\.filterFieldProps\} fieldClass=\{sheetField\} labeled \/>/,
  '<CatalogFilters {...filterFieldProps} fieldClass={sheetField} labeled t={t} />'
);

// result summary plurals
s = s.replace(
  /<span className="font-semibold text-ocean">\{filtered\.length\}<\/span> shown/,
  "{t('shown', { count: filtered.length })}"
);
s = s.replace(
  /\{availableCount\} available/,
  "{t('available', { count: availableCount })}"
);
s = s.replace(
  /\{soldCount\} booked\/reserved/,
  "{t('bookedReserved', { count: soldCount })}"
);
s = s.replace(
  /\{activeFilterCount\} filter\{activeFilterCount === 1 \? '' : 's'\}/g,
  "{t('filtersCount', { count: activeFilterCount })}"
);

fs.writeFileSync(p, s);
console.log('invest filters hit', hit);
