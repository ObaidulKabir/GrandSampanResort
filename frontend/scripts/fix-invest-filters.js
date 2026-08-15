const fs = require('fs');
const p = 'app/(site)/[locale]/invest/page.tsx';
let s = fs.readFileSync(p, 'utf8');

s = s.split("set{t('filters')}").join('setFilters');
s = s.split("empty{t('filters')}").join('emptyFilters');
s = s.split("Catalog{t('filters')}").join('CatalogFilters');
s = s.split("useState<{t('filters')}>").join('useState<Filters>');
s = s.split('aria-label="{t(\'closeFilters\')}"').join("aria-label={t('closeFilters')}");
s = s.split("aria-label=\"{t('closeFilters')}\"").join("aria-label={t('closeFilters')}");

// Ensure CatalogFilters gets t prop
s = s.replace(
  /<CatalogFilters \{\.\.\.filterFieldProps\} fieldClass=\{compactField\} showSearch \/>/g,
  '<CatalogFilters {...filterFieldProps} fieldClass={compactField} showSearch t={t} />'
);
s = s.replace(
  /<CatalogFilters \{\.\.\.filterFieldProps\} fieldClass=\{sheetField\} labeled \/>/g,
  '<CatalogFilters {...filterFieldProps} fieldClass={sheetField} labeled t={t} />'
);

fs.writeFileSync(p, s);
const broken = (s.match(/set\{t\(/g) || []).length;
console.log('broken left', broken);
console.log('CatalogFilters count', (s.match(/CatalogFilters/g) || []).length);
console.log('has t={t}', s.includes('t={t}'));
