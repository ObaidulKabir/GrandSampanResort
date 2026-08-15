/** Buyer-facing copy for payment tiers. Prefer stable tier ids over API labels. */

type Translate = (key: string, values?: any) => string;

const EN: Translate = (key, values) => {
  const pct = values?.pct;
  const save = values?.save;
  const map: Record<string, string> = {
    'headline.standard': typeof pct === 'number' ? `Reserve with ${pct}%` : 'Reserve with 10%',
    'headline.standardDefault': 'Reserve with 10%',
    'headline.booking_plus_down': 'Pay booking + downpayment now',
    'headline.half': 'Pay half now',
    'headline.full': 'Pay in full now',
    'headline.pct': typeof pct === 'number' ? `Pay ${pct}% now` : 'Payment option',
    'headline.fallback': 'Payment option',
    'help.standard': 'Smallest amount today. Rest on the installment calendar.',
    'help.full.save': typeof save === 'string' ? `Largest saving — about ${save}% off.` : 'One payment. Nothing left to pay later.',
    'help.full': 'One payment. Nothing left to pay later.',
    'help.half.save': typeof save === 'string' ? `Save about ${save}%. Remaining balance on installments.` : 'Half today, rest on installments.',
    'help.half': 'Half today, rest on installments.',
    'help.booking_plus_down': 'Skip the separate downpayment in 3 months.',
    'help.save': typeof save === 'string' ? `Save about ${save}% for paying earlier.` : ''
  };
  return map[key] ?? key;
};

export function tierHeadline(
  tier: { id?: string; label?: string; upfrontPct?: number },
  t: Translate = EN
) {
  const id = String(tier?.id || '');
  if (id === 'standard') {
    const pct = Number(tier?.upfrontPct);
    return Number.isFinite(pct) && pct > 0 ? t('headline.standard', { pct }) : t('headline.standardDefault');
  }
  if (id === 'booking_plus_down') return t('headline.booking_plus_down');
  if (id === 'half') return t('headline.half');
  if (id === 'full') return t('headline.full');
  const pct = Number(tier?.upfrontPct);
  if (Number.isFinite(pct) && pct >= 100) return t('headline.full');
  if (Number.isFinite(pct) && pct > 0) return t('headline.pct', { pct });
  return tier?.label || t('headline.fallback');
}

export function tierHelp(
  tier: { id?: string; offeredDiscountPct?: number; upfrontPct?: number },
  t: Translate = EN
) {
  const id = String(tier?.id || '');
  const saveN = Number(tier?.offeredDiscountPct) || 0;
  const save = saveN > 0 ? saveN.toFixed(1) : '';
  if (id === 'standard') return t('help.standard');
  if (id === 'full') return saveN > 0 ? t('help.full.save', { save }) : t('help.full');
  if (id === 'half') return saveN > 0 ? t('help.half.save', { save }) : t('help.half');
  if (id === 'booking_plus_down') return t('help.booking_plus_down');
  return saveN > 0 ? t('help.save', { save }) : '';
}

export function formatSavePct(pct?: number | null) {
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n >= 1 ? `${n.toFixed(1)}%` : `${n.toFixed(2)}%`;
}
