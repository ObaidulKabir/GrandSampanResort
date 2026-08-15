const fs = require('fs');
const path = require('path');
const p = path.join('app','(site)','[locale]','suites','page.tsx');
let s = fs.readFileSync(p,'utf8');
if (!s.includes("useTranslations")) {
  s = s.replace("import { useEffect, useMemo, useState } from 'react';","import { useEffect, useMemo, useState } from 'react';\nimport { useTranslations } from 'next-intl';");
  s = s.replace('export default function SuitesPage() {',"export default function SuitesPage() {\n  const t = useTranslations('suites');");
}
const reps = [
["Inventory","{t('eyebrow')}"],
[">Suites<",">{t('title')}<"],
["Browse each unit with its share plans, architectural plan, and key map. Click a drawing to\n        enlarge.","{t('intro')}"],
["Loading suites…","{t('loading')}"],
["No suites available right now. Check back soon.","{t('empty')}"],
["No share plans","{t('noSharePlans')}"],
["{stats.sold} sold / {stats.total} plans","{t('soldPlans', { sold: stats.sold, total: stats.total })}"],
["View plans","{t('viewPlans')}"],
[">Plans<",">{t('plans')}<"],
[">Buy<",">{t('buy')}<"],
["See who","{t('seeWho')}"],
['title="Architectural plan"',"title={t('archPlan')}"],
['title="Key map"',"title={t('keyMap')}"],
["{title} not uploaded yet","{t('notUploaded', { title })}"],
["`Enlarge ${title}`","t('enlargeTitle', { title })"],
[">Enlarge<",">{t('enlarge')}<"],
["label: 'Booked'","label: 'Booked' /*i18n*/"],
];
// simpler status labels via inline replace in planStatusMeta
s = s.replace("label: 'Booked'","labelKey: 'booked'");
s = s.replace("label: 'Reserved'","labelKey: 'reserved'");
s = s.replace("label: 'Available'","labelKey: 'available'");
s = s.replace("{status.label}","{t(status.labelKey as any)}");
s = s.replace("if (n >= 30) return 'Full month';\n  return `${n}d/mo`;","if (n >= 30) return 'FULL';\n  return String(n);");
// fix daysLabel usage later - do meta string
s = s.replace("{s.type} • {s.size} sq ft • {s.view}\n                    {s.floor != null ? ` • Floor ${s.floor}` : ''}","{t('meta', { type: s.type ?? '', size: s.size ?? 0, view: s.view ?? '' })}\n                    {s.floor != null ? t('floor', { floor: s.floor }) : ''}");
for (const [a,b] of reps) {
  if (s.includes(a)) s = s.split(a).join(b); else console.log('miss',a.slice(0,50));
}
// daysLabel display
s = s.replace("· {daysLabel(p.daysPerMonth)} ·","· {( () => { const d=daysLabel(p.daysPerMonth); return d==='FULL'?t('fullMonth'): d==='—'? '—' : t('daysMo',{n:Number(d)}); })()} ·");
fs.writeFileSync(p,s);
console.log('suites patched');
