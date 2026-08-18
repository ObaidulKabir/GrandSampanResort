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
  it('matches the locked 8% annual discrete rate conversion', () => {
    expect(v).toBeCloseTo(PV_FIXTURES.monthlyFactor, 12);
    expect(1 / v - 1).toBeCloseTo(PV_FIXTURES.effectiveMonthlyRate, 12);
    expect(Math.pow(1 / v, 12) - 1).toBeCloseTo(PV_FIXTURES.effectiveAnnualRate, 12);
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

  it('converts the admin compounding setting into the monthly factor', () => {
    // Nominal 8% compounded monthly: periodic 8/12%, so v = 1 / (1 + 0.08/12).
    const monthly = monthlyDiscountFactor(8, 12);
    expect(monthly).toBeCloseTo(1 / (1 + 0.08 / 12), 12);
    expect(Math.pow(1 / monthly, 12) - 1).toBeCloseTo(Math.pow(1 + 0.08 / 12, 12) - 1, 12);

    // More frequent compounding discounts future cash harder.
    expect(monthly).toBeLessThan(monthlyDiscountFactor(8, 1));
    expect(monthlyDiscountFactor(8, 2)).toBeLessThan(monthlyDiscountFactor(8, 1));
  });

  it('clamps compounding to the 1-12 range the policy allows', () => {
    expect(monthlyDiscountFactor(8, 0)).toBeCloseTo(monthlyDiscountFactor(8, 1), 12);
    expect(monthlyDiscountFactor(8, 99)).toBeCloseTo(monthlyDiscountFactor(8, 12), 12);
  });

  it('pays a bigger advance discount as the admin rate rises', () => {
    const fairAt = (ratePct: number) => {
      const factor = monthlyDiscountFactor(ratePct, 1);
      const stdPv = presentValue(nominalCashflows(standard24), factor);
      const fullPv = presentValue(nominalCashflows({ ...standard24, upfrontPct: 100 }), factor);
      return fairDiscountPct(fullPv, stdPv);
    };
    expect(fairAt(12)).toBeGreaterThan(fairAt(8));
    expect(fairAt(0)).toBeCloseTo(0, 12);
  });
});
