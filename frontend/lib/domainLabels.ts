/**
 * Localized display labels for API domain values.
 * Fall back to the raw value so unknown data never renders blank.
 */

type Translate = (key: string, values?: any) => string;

function pick(t: Translate, key: string, raw: string) {
  try {
    const value = t(key);
    if (value && value !== key) return value;
  } catch {
    /* missing key */
  }
  return raw;
}

export function suiteTypeLabel(raw: string | null | undefined, t: Translate) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.startsWith('prem')) return pick(t, 'suiteType.premium', s);
  if (lower.startsWith('delux')) return pick(t, 'suiteType.deluxe', s);
  if (lower.startsWith('stand')) return pick(t, 'suiteType.standard', s);
  return s;
}

export function suiteViewLabel(raw: string | null | undefined, t: Translate) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower === 'sea' || lower === 'ocean') return pick(t, 'view.sea', s);
  if (lower === 'hill') return pick(t, 'view.hill', s);
  return s;
}

export function planStatusLabel(raw: string | null | undefined, t: Translate) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const map: Record<string, string> = {
    Unsold: 'planStatus.unsold',
    Reserved: 'planStatus.reserved',
    Booked: 'planStatus.booked',
    Resale: 'planStatus.resale',
    Transferred: 'planStatus.transferred'
  };
  const key = map[s];
  return key ? pick(t, key, s) : s;
}

export function bookingStatusLabel(raw: string | null | undefined, t: Translate) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const map: Record<string, string> = {
    awaiting_payment: 'bookingStatus.awaiting_payment',
    awaiting_kyc: 'bookingStatus.awaiting_kyc',
    confirmed: 'bookingStatus.confirmed',
    cancelled: 'bookingStatus.cancelled',
    pending: 'bookingStatus.pending'
  };
  const key = map[s];
  return key ? pick(t, key, s) : s;
}

export function scheduleTypeLabel(raw: string | null | undefined, t: Translate) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const map: Record<string, string> = {
    deposit: 'scheduleType.deposit',
    downpayment: 'scheduleType.downpayment',
    installment: 'scheduleType.installment'
  };
  const key = map[s];
  return key ? pick(t, key, s) : s;
}

/** Prefer daysPerMonth ICU message; fall back to API plan name. */
export function sharePlanName(
  plan: { name?: string | null; daysPerMonth?: number | null },
  t: Translate
) {
  const days = Number(plan?.daysPerMonth);
  if (Number.isFinite(days) && days > 0) {
    try {
      return t('sharePlan.daysPerMonth', { count: days });
    } catch {
      /* fall through */
    }
  }
  return String(plan?.name || '').trim();
}
