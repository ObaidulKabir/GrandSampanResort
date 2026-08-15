import {
  PV_FIXTURES,
  applyDiscount,
  fairDiscountPct,
  monthlyDiscountFactor,
  nominalCashflows,
  offeredDiscountPct,
  presentValue
} from './pv';

const v = monthlyDiscountFactor(PV_FIXTURES.annualNominalPct, PV_FIXTURES.compoundingPerYear);
const standard24 = {
  upfrontPct: 10,
  downpaymentPct: 20,
  downpaymentAfterMonths: 3,
  installmentMonths: 24,
  cadence: 'monthly' as const
};

describe('payment-plans PV engine', () => {
  it('matches the locked 8% continuous rate conversion', () => {
    expect(v).toBeCloseTo(PV_FIXTURES.monthlyFactor, 12);
    expect(1 / v - 1).toBeCloseTo(PV_FIXTURES.effectiveMonthlyRate, 12);
    expect(Math.exp(0.08) - 1).toBeCloseTo(PV_FIXTURES.effectiveAnnualRate, 12);
  });

  it('matches baseline PV and fair discounts for 30 / 50 / 100', () => {
    const stdPv = presentValue(nominalCashflows(standard24), v);
    expect(stdPv).toBeCloseTo(PV_FIXTURES.baselinePv, 9);

    const pv30 = presentValue(nominalCashflows({ ...standard24, upfrontPct: 30 }), v);
    const pv50 = presentValue(nominalCashflows({ ...standard24, upfrontPct: 50 }), v);
    const pv100 = presentValue(nominalCashflows({ ...standard24, upfrontPct: 100 }), v);

    expect(fairDiscountPct(pv30, stdPv)).toBeCloseTo(PV_FIXTURES.fairDiscount30, 9);
    expect(fairDiscountPct(pv50, stdPv)).toBeCloseTo(PV_FIXTURES.fairDiscount50, 9);
    expect(fairDiscountPct(pv100, stdPv)).toBeCloseTo(PV_FIXTURES.fairDiscount100, 9);
  });

  it('prices the 36-month tenor gap against the 24-month standard', () => {
    const std24 = presentValue(nominalCashflows(standard24), v);
    const std36 = presentValue(nominalCashflows({ ...standard24, installmentMonths: 36 }), v);
    expect(1 - std36 / std24).toBeCloseTo(PV_FIXTURES.tenorGap36, 9);
  });

  it('keeps fair discount vs the same tenor when tenorPricing is neutral', () => {
    const std36 = presentValue(nominalCashflows({ ...standard24, installmentMonths: 36 }), v);
    const full36 = presentValue(
      nominalCashflows({ ...standard24, installmentMonths: 36, upfrontPct: 100 }),
      v
    );
    const d = fairDiscountPct(full36, std36);
    expect(d).toBeGreaterThan(0.07);
    expect(d).toBeLessThan(0.1);
  });

  it('applies pass-through, cap, and override in that order', () => {
    const fair = 7.0686;
    expect(offeredDiscountPct({ fairPct: fair }).offeredPct).toBeCloseTo(fair, 4);
    expect(offeredDiscountPct({ fairPct: fair, passThroughPct: 50 }).offeredPct).toBeCloseTo(
      fair / 2,
      4
    );
    expect(offeredDiscountPct({ fairPct: fair, maxDiscountPct: 5 }).offeredPct).toBe(5);
    expect(offeredDiscountPct({ fairPct: fair, overridePct: 10 }).source).toBe('override');
    expect(offeredDiscountPct({ fairPct: fair, overridePct: 10 }).offeredPct).toBe(10);
  });

  it('rounds discounted prices to whole taka', () => {
    expect(applyDiscount(100000, 7.0686)).toBe(92931);
  });
});
