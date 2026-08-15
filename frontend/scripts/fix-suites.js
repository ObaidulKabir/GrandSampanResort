const fs = require('fs');
const p = 'app/(site)/[locale]/suites/page.tsx';
let s = fs.readFileSync(p,'utf8');
s = s.replace(
`function DrawingSlot({
  title,
  image,
  onOpen
}: {
  title: string;
  image?: { src: string; alt: string };
  onOpen: (img: { src: string; alt: string }) => void;
}) {
  if (!image) {`,
`function DrawingSlot({
  title,
  image,
  onOpen
}: {
  title: string;
  image?: { src: string; alt: string };
  onOpen: (img: { src: string; alt: string }) => void;
}) {
  const t = useTranslations('suites');
  if (!image) {`
);
s = s.replace('          Enlarge\n', "          {t('enlarge')}\n");
s = s.replace(
`        Browse each unit with its share plans, architectural plan, and key map. Click a drawing to
        enlarge.`,
`        {t('intro')}`
);
s = s.replace('                                Buy\n', "                                {t('buy')}\n");
s = s.replace(
`function daysLabel(days?: number) {
  if (days == null || !Number.isFinite(Number(days))) return '—';
  const n = Number(days);
  if (n >= 30) return 'Full month';
  return \`\${n}d/mo\`;
}`,
`function daysLabel(days: number | undefined, t: (k: string, v?: any) => string) {
  if (days == null || !Number.isFinite(Number(days))) return '—';
  const n = Number(days);
  if (n >= 30) return t('fullMonth');
  return t('daysMo', { n });
}`
);
s = s.replace(
`· {( () => { const d=daysLabel(p.daysPerMonth); return d==='FULL'?t('fullMonth'): d==='—'? '—' : t('daysMo',{n:Number(d)}); })()} ·`,
`· {daysLabel(p.daysPerMonth, t)} ·`
);
fs.writeFileSync(p,s);
console.log('suites fixed');
