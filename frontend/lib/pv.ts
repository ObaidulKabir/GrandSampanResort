/**
 * Present-value engine for advance-payment discounts.
 * Ported from backend/src/payment-plans/pv.ts — pure functions, no I/O.
 * Used on the admin policy page for live FAIR / OFFERED preview as the
 * admin edits the discount rate or tier settings, before saving.
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

/** Monthly discount factor from a nominal annual rate (discrete compounding). */
export function monthlyDiscountFactor(annualNominalPct: number): number {
  const annual = Math.max(0, Number(annualNominalPct) || 0) / 100;
  return Math.pow(1 + annual, -1 / 12);
}

/** PV of a stream of cashflows given a monthly discount factor v. */
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
 * Fair discount that makes the resort indifferent between paying now vs later:
 *   d = 1 − PV_standard / PV_tier
 */
export function fairDiscountPct(tierPv: number, standardPv: number): number {
  if (!Number.isFinite(tierPv) || tierPv <= 0) return 0;
  if (!Number.isFinite(standardPv) || standardPv < 0) return 0;
  return 1 - standardPv / tierPv;
}

/**
 * Fractional cashflows for a nominal price of 1.
 * Mirrors the backend nominalCashflows() exactly so discount math is identical.
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

/** Resolve the offered discount % from PV-fair, pass-through, cap, and optional override. */
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

export type PaymentTier = {
  id: string;
  label: string;
  upfrontPct: number;
  installmentMonthsOverride?: number;
  discountPct: number | null;
  passThroughPct: number;
  maxDiscountPct: number;
};

export type PaymentPolicy = {
  enabled: boolean;
  discountRateAnnualPct: number;
  compoundingPerYear: number;
  downpaymentPct: number;
  downpaymentAfterMonths: number;
  tenors: number[];
  tenorPricing: 'neutral' | 'pv';
  quoteTtlMinutes: number;
  tiers: PaymentTier[];
};

export type ResolvedTier = PaymentTier & {
  fairDiscountPct: number;
  offeredDiscountPct: number;
  source: 'override' | 'pv' | 'standard';
};

/**
 * Mirrors backend PaymentPlansService.resolveTiers() exactly.
 * Call this inside a useMemo to get live FAIR / OFFERED values as the admin edits.
 */
export function resolveTiers(
  policy: PaymentPolicy,
  opts?: { installmentMonths?: number; cadence?: ScheduleCadence }
): ResolvedTier[] {
  const cadence: ScheduleCadence = opts?.cadence === 'quarterly' ? 'quarterly' : 'monthly';
  const tenor = pickTenor(policy, opts?.installmentMonths);
  const v = monthlyDiscountFactor(policy.discountRateAnnualPct);

  const standardTier = findStandardTier(policy);
  const baselineMonths = policy.tenorPricing === 'pv' ? Math.min(...policy.tenors) : tenor;

  const standardOpts: NominalScheduleOpts = {
    upfrontPct: standardTier.upfrontPct,
    downpaymentPct: policy.downpaymentPct,
    downpaymentAfterMonths: policy.downpaymentAfterMonths,
    installmentMonths: baselineMonths,
    cadence,
  };
  const standardPv = presentValue(nominalCashflows(standardOpts), v);

  return policy.tiers.map((tier) => {
    const tierTenor = tier.installmentMonthsOverride ?? tenor;
    const tierOpts: NominalScheduleOpts = {
      upfrontPct: tier.upfrontPct,
      downpaymentPct: policy.downpaymentPct,
      downpaymentAfterMonths: policy.downpaymentAfterMonths,
      installmentMonths: tierTenor,
      cadence,
    };

    const baselineForTier =
      policy.tenorPricing === 'pv'
        ? standardPv
        : presentValue(nominalCashflows({ ...standardOpts, installmentMonths: tenor }), v);

    const tierPv = presentValue(nominalCashflows(tierOpts), v);
    const fair = Math.max(0, fairDiscountPct(tierPv, baselineForTier) * 100);

    const isStandard =
      tier.id === standardTier.id ||
      (tier.upfrontPct <= standardTier.upfrontPct && !tier.installmentMonthsOverride);

    if (isStandard && (tier.discountPct === 0 || tier.discountPct == null)) {
      return {
        ...tier,
        fairDiscountPct: round4(fair),
        offeredDiscountPct: 0,
        source: 'standard' as const,
      };
    }

    const offered = offeredDiscountPct({
      fairPct: fair,
      passThroughPct: tier.passThroughPct,
      maxDiscountPct: tier.maxDiscountPct,
      overridePct: tier.discountPct,
    });

    return {
      ...tier,
      fairDiscountPct: round4(fair),
      offeredDiscountPct: round4(offered.offeredPct),
      source: offered.source,
    };
  });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function pickTenor(policy: PaymentPolicy, months?: number | null): number {
  const allowed = policy.tenors.length ? policy.tenors : [24];
  const n = Number(months);
  if (Number.isFinite(n) && allowed.includes(n)) return n;
  if (allowed.includes(24)) return 24;
  return allowed[0];
}

function findStandardTier(policy: PaymentPolicy): PaymentTier {
  return (
    policy.tiers.find((t) => t.id === 'standard') ||
    policy.tiers.reduce(
      (min, t) => (t.upfrontPct < min.upfrontPct ? t : min),
      policy.tiers[0]
    )
  );
}

function clampPct(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
