/** Buyer-facing copy for payment tiers. Keep finance jargon out of the UI. */

export function tierHeadline(tier: { id?: string; label?: string; upfrontPct?: number }) {
  const id = String(tier?.id || '');
  if (id === 'standard') {
    const pct = Number(tier?.upfrontPct);
    return Number.isFinite(pct) && pct > 0 ? `Reserve with ${pct}%` : 'Reserve with 10%';
  }
  if (id === 'booking_plus_down') return 'Pay booking + downpayment now';
  if (id === 'half') return 'Pay half now';
  if (id === 'full') return 'Pay in full now';
  const pct = Number(tier?.upfrontPct);
  if (Number.isFinite(pct) && pct >= 100) return 'Pay in full now';
  if (Number.isFinite(pct) && pct > 0) return `Pay ${pct}% now`;
  return tier?.label || 'Payment option';
}

export function tierHelp(tier: { id?: string; offeredDiscountPct?: number; upfrontPct?: number }) {
  const id = String(tier?.id || '');
  const save = Number(tier?.offeredDiscountPct) || 0;
  if (id === 'standard') return 'Smallest amount today. Rest on the installment calendar.';
  if (id === 'full') return save > 0 ? `Largest saving — about ${save.toFixed(1)}% off.` : 'One payment. Nothing left to pay later.';
  if (id === 'half') return save > 0 ? `Save about ${save.toFixed(1)}%. Remaining balance on installments.` : 'Half today, rest on installments.';
  if (id === 'booking_plus_down') return 'Skip the separate downpayment in 3 months.';
  return save > 0 ? `Save about ${save.toFixed(1)}% for paying earlier.` : '';
}

export function formatSavePct(pct?: number | null) {
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n >= 1 ? `${n.toFixed(1)}%` : `${n.toFixed(2)}%`;
}
