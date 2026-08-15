/**
 * Present-value engine for advance-payment discounts.
 * Pure functions — no I/O. The model must never do this arithmetic.
 *
 * Rate convention: nominal annual %, compounded `periodsPerYear` times
 * (default 8%). Monthly factor is
 *   v = e^(-r/12)
 */

export type Cashflow = { dueMonth: number; amount: number };

export type ScheduleCadence = 'monthly' | 'quarterly';

export type NominalScheduleOpts = {
  upfrontPct: number;
  downpaymentPct: number;
  downpaymentAfterMonths: number;
  installmentMonths: number;
  cadence: ScheduleCadence;
};

/** Locked fixtures from the 8% semiannual confirmation (nominal price = 1). */
export const PV_FIXTURES = {
  annualNominalPct: 8,
  compoundingPerYear: 0, // Continuous
  monthlyFactor: 0.9933555062550344,
  effectiveMonthlyRate: 0.0066889383540194025,
  effectiveAnnualRate: 0.08328706767495864,
  /** 10% now, 20% at m3, 70% over m4..m27. */
  baselinePv: 0.9279905637608965,
  fairDiscount30: 0.0042494359305150775,
  fairDiscount50: 0.024598535560385604,
  fairDiscount100: 0.0720094362391035,
  /** 36-month standard vs 24-month standard. */
  tenorGap36: 0.025829579139239334
} as const;

export function monthlyDiscountFactor(annualNominalPct: number, _periodsPerYear = 0): number {
  const annual = Math.max(0, Number(annualNominalPct) || 0) / 100;
  // Continuous compounding: e^(-r / 12)
  return Math.exp(-annual / 12);
}

export function presentValue(items: Cashflow[], monthlyFactor: number): number {
  const v = Number(monthlyFactor);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return items.reduce((sum, item) => {
    const amount = Number(item.amount) || 0;
    const month = Math.max(0, Number(item.dueMonth) || 0);
    return sum + amount * Math.pow(v, month);
  }, 0);
}

/**
 * Fair discount that makes the resort indifferent:
 *   d = 1 − PV_standard / PV_tier
 * Both PVs are computed on the same nominal price. Negative d is a surcharge.
 */
export function fairDiscountPct(tierPv: number, standardPv: number): number {
  if (!Number.isFinite(tierPv) || tierPv <= 0) return 0;
  if (!Number.isFinite(standardPv) || standardPv < 0) return 0;
  return 1 - standardPv / tierPv;
}

/**
 * Fractional cashflows for a nominal price of 1. Used for fair-discount
 * calculation (amounts scale with total, so the percentage is invariant).
 *
 * Calendar matches generateSchedule:
 *   deposit at month 0
 *   downpayment at +downpaymentAfterMonths (omitted when absorbed into deposit)
 *   installments start at downpaymentAfterMonths + step, not immediately
 */
export function nominalCashflows(opts: NominalScheduleOpts): Cashflow[] {
  const upfrontPct = clampPct(opts.upfrontPct);
  const downPct = clampPct(opts.downpaymentPct);
  const after = Math.max(0, Math.round(Number(opts.downpaymentAfterMonths) || 0));
  const months = Math.max(1, Math.round(Number(opts.installmentMonths) || 24));
  const cadence: ScheduleCadence = opts.cadence === 'quarterly' ? 'quarterly' : 'monthly';
  const step = cadence === 'monthly' ? 1 : 3;
  const installments = cadence === 'monthly' ? months : Math.ceil(months / 3);

  const items: Cashflow[] = [];
  const upfront = upfrontPct / 100;

  if (upfrontPct >= 100 - 1e-9) {
    items.push({ dueMonth: 0, amount: 1 });
    return items;
  }

  items.push({ dueMonth: 0, amount: upfront });

  // Merged when the buyer pays at least the combined booking+downpayment in one go.
  const merged = upfrontPct >= downPct;

  let remainder = 1 - upfront;
  if (!merged && downPct > 0) {
    const down = Math.min(remainder, downPct / 100);
    items.push({ dueMonth: after, amount: down });
    remainder -= down;
  }

  if (remainder > 0 && installments > 0) {
    const each = remainder / installments;
    for (let i = 1; i <= installments; i++) {
      items.push({ dueMonth: after + i * step, amount: each });
    }
  }

  return items;
}

export function offeredDiscountPct(opts: {
  fairPct: number;
  passThroughPct?: number | null;
  maxDiscountPct?: number | null;
  overridePct?: number | null;
}): { offeredPct: number; source: 'override' | 'pv' } {
  if (opts.overridePct != null && Number.isFinite(Number(opts.overridePct))) {
    return { offeredPct: clampPct(Number(opts.overridePct)), source: 'override' };
  }
  const pass = opts.passThroughPct == null ? 100 : clampPct(Number(opts.passThroughPct));
  const cappedMax = opts.maxDiscountPct == null ? 100 : clampPct(Number(opts.maxDiscountPct));
  const raw = Math.max(0, Number(opts.fairPct) || 0) * (pass / 100);
  return { offeredPct: Math.min(cappedMax, raw), source: 'pv' };
}

export function applyDiscount(listPrice: number, discountPct: number): number {
  const price = Math.max(0, Math.round(Number(listPrice) || 0));
  const pct = clampPct(discountPct);
  return Math.round(price * (1 - pct / 100));
}

function clampPct(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}
