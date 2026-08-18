/**
 * End-to-end tests for frontend/lib/pv.ts
 *
 * Tests three things:
 *   1. Core math parity — frontend pv.ts must give the same numbers as backend pv.ts
 *   2. Rate sensitivity — FAIR / OFFERED values change when discountRateAnnualPct changes
 *   3. resolveTiers() contract — the function the admin page depends on for live preview
 *
 * The locked fixtures used below are computed from the backend pv.spec.ts so any
 * drift between the two implementations is caught immediately.
 */

import {
  monthlyDiscountFactor,
  nominalCashflows,
  presentValue,
  fairDiscountPct,
  offeredDiscountPct,
  resolveTiers,
  type PaymentPolicy,
} from '../pv';
import { CUSTOM_INSTALLMENT_MONTHS } from '../schedule';

// ─── shared fixtures (match backend PV_FIXTURES at 8% annual discrete) ────────

const RATE_8 = 8;
const RATE_10 = 10;
const RATE_12 = 12;

const STANDARD_24 = {
  upfrontPct: 10,
  downpaymentPct: 20,
  downpaymentAfterMonths: 3,
  installmentMonths: 24,
  cadence: 'monthly' as const,
};

/** Minimal policy shape used to drive resolveTiers() */
function makePolicy(overrides: Partial<PaymentPolicy> = {}): PaymentPolicy {
  return {
    enabled: true,
    discountRateAnnualPct: 8,
    compoundingPerYear: 1,
    downpaymentPct: 20,
    downpaymentAfterMonths: 3,
    tenors: [24],
    tenorPricing: 'neutral',
    quoteTtlMinutes: 30,
    tiers: [
      { id: 'standard',          label: 'Booking only',          upfrontPct: 10,  discountPct: 0,    passThroughPct: 100, maxDiscountPct: 12 },
      { id: 'booking_plus_down', label: 'Booking + downpayment', upfrontPct: 30,  discountPct: null, passThroughPct: 100, maxDiscountPct: 12 },
      { id: 'half',              label: 'Half advance',          upfrontPct: 50,  discountPct: null, passThroughPct: 100, maxDiscountPct: 12 },
      { id: 'full',              label: 'Full payment',          upfrontPct: 100, discountPct: null, passThroughPct: 100, maxDiscountPct: 15 },
    ],
    ...overrides,
  };
}

// ─── 1. Core math parity with backend ─────────────────────────────────────────

describe('monthlyDiscountFactor', () => {
  it('matches backend locked fixture at 8% annual discrete', () => {
    const v = monthlyDiscountFactor(RATE_8);
    // backend PV_FIXTURES.monthlyFactor = 0.993607101988294 (at 8% annual discrete)
    expect(v).toBeCloseTo(0.993607101988294, 12);
  });

  it('effective annual rate round-trips back to 8%', () => {
    const v = monthlyDiscountFactor(RATE_8);
    expect(Math.pow(1 / v, 12) - 1).toBeCloseTo(0.08, 10);
  });

  it('higher rate → smaller monthly factor (steeper discounting)', () => {
    expect(monthlyDiscountFactor(RATE_12)).toBeLessThan(monthlyDiscountFactor(RATE_8));
  });

  it('zero rate → factor = 1 (no discounting)', () => {
    expect(monthlyDiscountFactor(0)).toBeCloseTo(1, 12);
  });
});

// ─── 2. presentValue & nominalCashflows ───────────────────────────────────────

describe('presentValue + nominalCashflows', () => {
  it('baseline PV at 8% matches backend locked fixture (0.9306)', () => {
    const v = monthlyDiscountFactor(RATE_8);
    const pv = presentValue(nominalCashflows(STANDARD_24), v);
    // backend PV_FIXTURES.baselinePv = 0.9305747176823721
    expect(pv).toBeCloseTo(0.9305747176823721, 9);
  });

  it('full upfront PV = 1.0 (all paid at month 0, no discounting)', () => {
    const v = monthlyDiscountFactor(RATE_8);
    const pv = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 100 }), v);
    expect(pv).toBeCloseTo(1.0, 12);
  });

  it('PV increases monotonically as more is paid upfront', () => {
    const v = monthlyDiscountFactor(RATE_8);
    const pv10  = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 10  }), v);
    const pv30  = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 30  }), v);
    const pv50  = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 50  }), v);
    const pv100 = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 100 }), v);
    expect(pv10).toBeLessThan(pv30);
    expect(pv30).toBeLessThan(pv50);
    expect(pv50).toBeLessThan(pv100);
  });

  it('cashflows for 30% upfront: only deposit + installments (no separate downpayment row)', () => {
    const flows = nominalCashflows({ ...STANDARD_24, upfrontPct: 30 });
    const atMonth3 = flows.filter((f) => f.dueMonth === 3);
    // merged: the 20% downpayment is absorbed into the month-0 deposit
    expect(atMonth3).toHaveLength(0);
    expect(flows.find((f) => f.dueMonth === 0)?.amount).toBeCloseTo(0.30, 10);
  });

  it('cashflows for 10% standard: has a distinct downpayment row at month 3', () => {
    const flows = nominalCashflows(STANDARD_24);
    const atMonth3 = flows.filter((f) => f.dueMonth === 3);
    expect(atMonth3).toHaveLength(1);
    expect(atMonth3[0].amount).toBeCloseTo(0.20, 10);
  });

  it('all cashflows sum to 1.0 for every tier (no rounding leakage)', () => {
    for (const upfrontPct of [10, 30, 50, 100]) {
      const flows = nominalCashflows({ ...STANDARD_24, upfrontPct });
      const total = flows.reduce((s, f) => s + f.amount, 0);
      expect(total).toBeCloseTo(1.0, 10);
    }
  });
});

// ─── 3. fairDiscountPct ───────────────────────────────────────────────────────

describe('fairDiscountPct', () => {
  const v8  = monthlyDiscountFactor(RATE_8);
  const stdPv8 = presentValue(nominalCashflows(STANDARD_24), v8);

  it('matches backend locked fixture for 30% (0.4079%)', () => {
    const pv30 = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 30 }), v8);
    const d = fairDiscountPct(pv30, stdPv8) * 100;
    // backend PV_FIXTURES.fairDiscount30 = 0.004078902751607938 → 0.4079%
    expect(d).toBeCloseTo(0.4079, 3);
  });

  it('matches backend locked fixture for 50% (2.3667%)', () => {
    const pv50 = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 50 }), v8);
    const d = fairDiscountPct(pv50, stdPv8) * 100;
    // backend PV_FIXTURES.fairDiscount50 = 0.0236673517281607 → 2.3667%
    expect(d).toBeCloseTo(2.3667, 3);
  });

  it('matches backend locked fixture for 100% (6.9425%)', () => {
    const pv100 = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 100 }), v8);
    const d = fairDiscountPct(pv100, stdPv8) * 100;
    // backend PV_FIXTURES.fairDiscount100 = 0.0694252823176279 → 6.9425%
    expect(d).toBeCloseTo(6.9425, 3);
  });

  it('standard tier vs itself = 0% discount', () => {
    expect(fairDiscountPct(stdPv8, stdPv8)).toBeCloseTo(0, 12);
  });

  /**
   * USER QUESTION: "if 20% paid 3 months earlier at 12%, discount should be ~0.6%"
   *
   * Simple-interest estimate: 3/12 × 20% × 12% = 0.60%
   * PV formula (compound):                      ≈ 0.62%
   *
   * PV is slightly MORE generous than simple interest because compound discounting
   * values near-term cash more steeply. Both are consistent; PV is the correct model.
   */
  it('USER VERIFICATION: booking+down at 12% gives ~0.62%, above the 0.60% simple-interest floor', () => {
    const v12 = monthlyDiscountFactor(RATE_12);
    const stdPv12 = presentValue(nominalCashflows(STANDARD_24), v12);
    const pv30    = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 30 }), v12);
    const d = fairDiscountPct(pv30, stdPv12) * 100;

    const simpleInterestFloor = (3 / 12) * 20 * (RATE_12 / 100); // = 0.60%

    expect(d).toBeGreaterThan(simpleInterestFloor);   // PV ≥ simple interest
    expect(d).toBeCloseTo(0.62, 1);                    // ≈ 0.62% at 12%
  });

  it('discount scales up as rate increases: 8% < 10% < 12%', () => {
    function d30(rate: number) {
      const v = monthlyDiscountFactor(rate);
      const stdPv = presentValue(nominalCashflows(STANDARD_24), v);
      const pv30  = presentValue(nominalCashflows({ ...STANDARD_24, upfrontPct: 30 }), v);
      return fairDiscountPct(pv30, stdPv) * 100;
    }
    expect(d30(RATE_8)).toBeLessThan(d30(RATE_10));
    expect(d30(RATE_10)).toBeLessThan(d30(RATE_12));
  });
});

// ─── 4. offeredDiscountPct ────────────────────────────────────────────────────

describe('offeredDiscountPct', () => {
  const fair = 7.0686;

  it('no opts: offered = fair', () => {
    expect(offeredDiscountPct({ fairPct: fair }).offeredPct).toBeCloseTo(fair, 4);
    expect(offeredDiscountPct({ fairPct: fair }).source).toBe('pv');
  });

  it('passThroughPct 50: offered = fair / 2', () => {
    const r = offeredDiscountPct({ fairPct: fair, passThroughPct: 50 });
    expect(r.offeredPct).toBeCloseTo(fair / 2, 4);
  });

  it('maxDiscountPct clamps offered', () => {
    expect(offeredDiscountPct({ fairPct: fair, maxDiscountPct: 5 }).offeredPct).toBe(5);
  });

  it('override wins over PV, marks source = override', () => {
    const r = offeredDiscountPct({ fairPct: fair, overridePct: 3 });
    expect(r.source).toBe('override');
    expect(r.offeredPct).toBe(3);
  });

  it('override = 0 is honoured (not treated as falsy)', () => {
    const r = offeredDiscountPct({ fairPct: fair, overridePct: 0 });
    expect(r.source).toBe('override');
    expect(r.offeredPct).toBe(0);
  });
});

// ─── 5. resolveTiers() — the live-preview function ───────────────────────────

describe('resolveTiers — live admin preview', () => {
  it('standard tier always has offeredDiscountPct = 0 regardless of rate', () => {
    for (const rate of [8, 10, 12, 20]) {
      const policy = makePolicy({ discountRateAnnualPct: rate });
      const resolved = resolveTiers(policy);
      const std = resolved.find((t) => t.id === 'standard')!;
      expect(std.offeredDiscountPct).toBe(0);
      expect(std.source).toBe('standard');
    }
  });

  it('fair discounts are strictly ordered: standard < booking_plus_down < half < full', () => {
    const resolved = resolveTiers(makePolicy());
    const get = (id: string) => resolved.find((t) => t.id === id)!.fairDiscountPct;
    expect(get('standard')).toBeLessThan(get('booking_plus_down'));
    expect(get('booking_plus_down')).toBeLessThan(get('half'));
    expect(get('half')).toBeLessThan(get('full'));
  });

  it('LIVE PREVIEW: changing rate from 8% → 12% updates FAIR column immediately', () => {
    const at8  = resolveTiers(makePolicy({ discountRateAnnualPct: 8  }));
    const at12 = resolveTiers(makePolicy({ discountRateAnnualPct: 12 }));

    const fair8  = at8.find((t)  => t.id === 'booking_plus_down')!.fairDiscountPct;
    const fair12 = at12.find((t) => t.id === 'booking_plus_down')!.fairDiscountPct;

    // 8%  → ~0.41%
    expect(fair8).toBeCloseTo(0.4079, 2);
    // 12% → ~0.62%
    expect(fair12).toBeCloseTo(0.62, 1);
    // Rate change must move the column
    expect(fair12).toBeGreaterThan(fair8);
  });

  it('LIVE PREVIEW: changing rate from 8% → 12% updates OFFERED column for non-standard tiers', () => {
    const at8  = resolveTiers(makePolicy({ discountRateAnnualPct: 8  }));
    const at12 = resolveTiers(makePolicy({ discountRateAnnualPct: 12 }));

    const offered8  = at8.find((t)  => t.id === 'full')!.offeredDiscountPct;
    const offered12 = at12.find((t) => t.id === 'full')!.offeredDiscountPct;

    expect(offered12).toBeGreaterThan(offered8);
  });

  it('override tier: OFFERED stays fixed regardless of rate change', () => {
    const withOverride = makePolicy({
      tiers: [
        { id: 'standard',          label: 'Booking only', upfrontPct: 10, discountPct: 0,   passThroughPct: 100, maxDiscountPct: 12 },
        { id: 'booking_plus_down', label: 'B+D override', upfrontPct: 30, discountPct: 3.5, passThroughPct: 100, maxDiscountPct: 12 },
        { id: 'full',              label: 'Full',         upfrontPct: 100,discountPct: null, passThroughPct: 100, maxDiscountPct: 15 },
      ],
    });

    for (const rate of [8, 12, 20]) {
      const resolved = resolveTiers({ ...withOverride, discountRateAnnualPct: rate });
      const tier = resolved.find((t) => t.id === 'booking_plus_down')!;
      expect(tier.source).toBe('override');
      expect(tier.offeredDiscountPct).toBe(3.5);      // pinned
      // but FAIR still recomputes with the new rate
      expect(tier.fairDiscountPct).toBeGreaterThan(0);
    }
  });

  it('maxDiscountPct cap is enforced after rate change', () => {
    // At very high rate the PV fair value would exceed the cap
    const policy = makePolicy({
      discountRateAnnualPct: 50,
      tiers: [
        { id: 'standard', label: 'S', upfrontPct: 10, discountPct: 0,    passThroughPct: 100, maxDiscountPct: 12 },
        { id: 'full',     label: 'F', upfrontPct: 100, discountPct: null, passThroughPct: 100, maxDiscountPct: 5 },
      ],
    });
    const resolved = resolveTiers(policy);
    const full = resolved.find((t) => t.id === 'full')!;
    expect(full.offeredDiscountPct).toBeLessThanOrEqual(5);
    // but FAIR shows the real uncapped value
    expect(full.fairDiscountPct).toBeGreaterThan(5);
  });

  it('policy.enabled = false: resolveTiers still returns rows (caller disables, not the resolver)', () => {
    const policy = makePolicy({ enabled: false });
    const resolved = resolveTiers(policy);
    expect(resolved.length).toBe(4);
  });

  it('parity: resolveTiers result matches manual fairDiscountPct calls at same rate', () => {
    const rate = 10;
    const policy = makePolicy({ discountRateAnnualPct: rate });
    const resolved = resolveTiers(policy);

    const v = monthlyDiscountFactor(rate);
    const stdPv = presentValue(nominalCashflows(STANDARD_24), v);

    for (const tier of resolved) {
      if (tier.id === 'standard') continue;
      const pv = presentValue(
        nominalCashflows({ ...STANDARD_24, upfrontPct: tier.upfrontPct }),
        v
      );
      const expected = fairDiscountPct(pv, stdPv) * 100;
      expect(tier.fairDiscountPct).toBeCloseTo(expected, 3);
    }
  });
});

// ─── 6. admin compounding setting must reach the discount ─────────────────────

describe('admin compounding input', () => {
  it('nominal 8% compounded monthly discounts harder than compounded once', () => {
    expect(monthlyDiscountFactor(8, 12)).toBeCloseTo(1 / (1 + 0.08 / 12), 12);
    expect(monthlyDiscountFactor(8, 12)).toBeLessThan(monthlyDiscountFactor(8, 1));
  });

  it('clamps compounding to the 1-12 range the policy allows', () => {
    expect(monthlyDiscountFactor(8, 0)).toBeCloseTo(monthlyDiscountFactor(8, 1), 12);
    expect(monthlyDiscountFactor(8, 99)).toBeCloseTo(monthlyDiscountFactor(8, 12), 12);
  });

  it('LIVE PREVIEW: changing compounding moves the FAIR column', () => {
    const annual = resolveTiers(makePolicy({ compoundingPerYear: 1 }));
    const monthly = resolveTiers(makePolicy({ compoundingPerYear: 12 }));
    const get = (rows: typeof annual) => rows.find((t) => t.id === 'full')!.fairDiscountPct;
    expect(get(monthly)).toBeGreaterThan(get(annual));
  });
});

// ─── 7. buyer-built calendar must be the calendar that gets priced ────────────

describe('resolveTiers with a buyer-built calendar', () => {
  const withPinnedTenorTier = () =>
    makePolicy({
      tenors: [24, 30, 36],
      tiers: [
        { id: 'pinned_24', label: 'Pinned 24 mo', upfrontPct: 10, installmentMonthsOverride: 24, discountPct: null, passThroughPct: 100, maxDiscountPct: 15 },
        { id: 'standard', label: 'Booking only', upfrontPct: 10, discountPct: 0, passThroughPct: 100, maxDiscountPct: 12 },
        { id: 'full', label: 'Full payment', upfrontPct: 100, discountPct: null, passThroughPct: 100, maxDiscountPct: 15 }
      ]
    });

  it('reports the tenor each tier was priced on', () => {
    const resolved = resolveTiers(withPinnedTenorTier(), { installmentMonths: 36 });
    expect(resolved.find((t) => t.id === 'pinned_24')!.installmentMonths).toBe(24);
    expect(resolved.find((t) => t.id === 'full')!.installmentMonths).toBe(36);
  });

  it('drops a tier tenor override so the discount matches the billed calendar', () => {
    const resolved = resolveTiers(withPinnedTenorTier(), {
      installmentMonths: 36,
      honorTierTenorOverride: false
    });
    const pinned = resolved.find((t) => t.id === 'pinned_24')!;
    expect(pinned.installmentMonths).toBe(36);
    expect(pinned.offeredDiscountPct).toBe(0);
  });

  it('offers only the 24, 30 and 36 month calendars', () => {
    expect(CUSTOM_INSTALLMENT_MONTHS).toEqual([24, 30, 36]);
  });

  it('refuses a retired 12-month calendar and falls back to 24', () => {
    const resolved = resolveTiers(withPinnedTenorTier(), { installmentMonths: 12 });
    expect(resolved.find((t) => t.id === 'full')!.installmentMonths).toBe(24);
  });
});
