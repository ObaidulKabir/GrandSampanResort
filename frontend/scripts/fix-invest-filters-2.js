const fs = require('fs');
const path = require('path');
const p = path.join('app', '(site)', '[locale]', 'invest', 'page.tsx');
let s = fs.readFileSync(p, 'utf8');

// Restore TypeScript identifier "Filters" wherever the aggressive replace broke it.
// Keep JSX display strings that intentionally use t('filters').
const restores = [
  ["type {t('filters')} = {", 'type Filters = {'],
  ["const emptyFilters: {t('filters')} = {", 'const emptyFilters: Filters = {'],
  ["function Catalog{t('filters')}(", 'function CatalogFilters('],
  ["filters: {t('filters')};", 'filters: Filters;'],
  ["keyof {t('filters')}>", 'keyof Filters>'],
  ["value: {t('filters')}[K]", 'value: Filters[K]'],
  ["function clear{t('filters')}()", 'function clearFilters()'],
  ["onClick={clear{t('filters')}}", 'onClick={clearFilters}'],
  ["onClick={clear{t('filters')}}", 'onClick={clearFilters}'],
  ["<Catalog{t('filters')}", '<CatalogFilters'],
];

for (const [a, b] of restores) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    console.log('fixed', a.slice(0, 40));
  }
}

// any remaining identifier-style breakage
s = s.replace(/Catalog\{t\('filters'\)\}/g, 'CatalogFilters');
s = s.replace(/clear\{t\('filters'\)\}/g, 'clearFilters');
s = s.replace(/keyof \{t\('filters'\)\}/g, 'keyof Filters');
s = s.replace(/: \{t\('filters'\)\}/g, ': Filters');
s = s.replace(/type \{t\('filters'\)\}/g, 'type Filters');

// Ensure t prop on CatalogFilters calls
if (!s.includes('showSearch t={t}')) {
  s = s.replace(
    /<CatalogFilters \{\.\.\.filterFieldProps\} fieldClass=\{compactField\} showSearch \/>/g,
    '<CatalogFilters {...filterFieldProps} fieldClass={compactField} showSearch t={t} />'
  );
}
if (!s.includes('labeled t={t}')) {
  s = s.replace(
    /<CatalogFilters \{\.\.\.filterFieldProps\} fieldClass=\{sheetField\} labeled \/>/g,
    '<CatalogFilters {...filterFieldProps} fieldClass={sheetField} labeled t={t} />'
  );
}

fs.writeFileSync(p, s);

const leftovers = [...s.matchAll(/\{t\('filters'\)\}/g)].map((m) => {
  const i = m.index || 0;
  return s.slice(Math.max(0, i - 30), i + 40);
});
console.log('remaining t(filters) contexts:');
leftovers.forEach((x) => console.log(' -', JSON.stringify(x)));
