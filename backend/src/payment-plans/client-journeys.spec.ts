import { PV_FIXTURES, applyDiscount, monthlyDiscountFactor, presentValue } from './pv';
import { generatePaymentSchedule, monthsFromAnchor } from './schedule';
import { explain, projectReferralInflows, simulateCash } from '../advisor/score';

const LIST = 1_000_000;
const START = new Date('2026-03-01T00:00:00.000Z');
const ANNUAL_MID = 90_000;
const TENORS = [24, 36];
const DOWN_PCT = 20;
const DOWN_AFTER = 3;

const TIERS = [
  { id: 'standard', upfrontPct: 10, offeredDiscountPct: 0 },
  { id: 'booking_plus_down', upfrontPct: 30, offeredDiscountPct: round4(PV_FIXTURES.fairDiscount30 * 100) },
  { id: 'half', upfrontPct: 50, offeredDiscountPct: round4(PV_FIXTURES.fairDiscount50 * 100) },
  { id: 'full', upfrontPct: 100, offeredDiscountPct: round4(PV_FIXTURES.fairDiscount100 * 100) }
] as const;

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function quote(tierId: string, tenor = 24, cadence: 'monthly' | 'quarterly' = 'monthly') {
  const tier = TIERS.find((t) => t.id === tierId);
  if (!tier) throw new Error(`missing tier ${tierId}`);
  const netPrice = applyDiscount(LIST, tier.offeredDiscountPct);
  const schedule = generatePaymentSchedule(netPrice, START, {
    upfrontPct: tier.upfrontPct,
    downpaymentPct: DOWN_PCT,
    downpaymentAfterMonths: DOWN_AFTER,
    installmentMonths: tenor,
    cadence
  });
  const v = monthlyDiscountFactor(PV_FIXTURES.annualNominalPct, PV_FIXTURES.compoundingPerYear);
  const pv = presentValue(
    schedule.map((s) => ({ dueMonth: monthsFromAnchor(START, new Date(s.dueDate)), amount: s.amount })),
    v
  );
  const depositAmount = schedule.find((s) => s.type === 'deposit')?.amount ?? 0;
  const down = schedule.find((s) => s.type === 'downpayment')?.amount ?? 0;
  const installments = schedule.filter((s) => s.type === 'installment');
  return {
    tier,
    netPrice,
    savings: Math.max(0, LIST - netPrice),
    schedule,
    depositAmount,
    down,
    installments,
    presentValue: pv,
    yieldPct: pv > 0 ? (ANNUAL_MID / pv) * 100 : 0,
    installmentMonths: tenor,
    cadence,
    paymentTierId: tier.id
  };
}

function score(availableNow: number, monthlyCapacity: number, horizonMonths = 36, referralTarget: any = null) {
  const referralIn = projectReferralInflows({
    target: referralTarget,
    ratePct: 2,
    tranche1Pct: 40,
    tranche2Pct: 60,
    planPrice: LIST,
    horizonMonths
  });
  const emptyRef = Array(horizonMonths + 1).fill(0);
  const scored: Array<ReturnType<typeof quote> & {
    feasibleWithoutReferral: boolean;
    feasibleIfTargetHit: boolean;
    summary: string;
    yieldPct: number;
  }> = [];
  for (const tenor of TENORS) {
    for (const tier of TIERS) {
      const q = quote(tier.id, tenor, 'monthly');
      const withRef = simulateCash({
        availableNow,
        monthlyCapacity,
        horizonMonths,
        schedule: q.schedule,
        start: START,
        referralIn
      });
      const withoutRef = simulateCash({
        availableNow,
        monthlyCapacity,
        horizonMonths,
        schedule: q.schedule,
        start: START,
        referralIn: emptyRef
      });
      const reasons: { code: 'SAVES_VS_STANDARD'; amountBdt: number }[] = [];
      if (q.savings > 0) reasons.push({ code: 'SAVES_VS_STANDARD' as const, amountBdt: q.savings });
      scored.push({
        ...q,
        feasibleWithoutReferral: withoutRef.neverNegative,
        feasibleIfTargetHit: withRef.neverNegative,
        summary: explain(reasons),
        yieldPct: q.yieldPct
      });
    }
  }
  const feasible = scored.filter((s) => s.feasibleIfTargetHit);
  const pool = feasible.length ? feasible : scored;
  pool.sort((a, b) => {
    if (a.feasibleWithoutReferral !== b.feasibleWithoutReferral) return a.feasibleWithoutReferral ? -1 : 1;
    return b.yieldPct - a.yieldPct;
  });
  return pool;
}

describe('client journeys — ৳10 lakh share', () => {
  it('Amina reserves with 10%: smallest amount today, rest on the calendar', () => {
    const q = quote('standard');
    expect(q.tier.offeredDiscountPct).toBe(0);
    expect(q.netPrice).toBe(LIST);
    expect(q.depositAmount).toBe(100_000);
    expect(q.down).toBe(200_000);
    expect(q.installments).toHaveLength(24);
    expect(q.schedule.reduce((s, i) => s + i.amount, 0)).toBe(q.netPrice);
  });

  it('Karim pays booking + downpayment together and skips the month-3 bill', () => {
    const q = quote('booking_plus_down');
    expect(q.down).toBe(0);
    expect(q.depositAmount).toBe(Math.round(q.netPrice * 0.3));
    expect(q.installments).toHaveLength(24);
    expect(q.savings).toBeGreaterThan(0);
    expect(q.savings).toBeLessThan(quote('half').savings);
  });

  it('Nadia pays in full and gets the largest saving, with nothing left later', () => {
    const std = quote('standard');
    const half = quote('half');
    const full = quote('full');
    expect(full.depositAmount).toBe(full.netPrice);
    expect(full.installments).toHaveLength(0);
    expect(full.savings).toBeGreaterThan(half.savings);
    expect(half.savings).toBeGreaterThan(std.savings);
    expect(full.savings / LIST).toBeCloseTo(PV_FIXTURES.fairDiscount100, 3);
  });

  it('checkout cards stay internally consistent (today + later = you pay)', () => {
    for (const id of ['standard', 'booking_plus_down', 'half', 'full']) {
      const q = quote(id);
      const later = q.schedule.filter((s) => s.type !== 'deposit').reduce((s, i) => s + i.amount, 0);
      expect(q.depositAmount + later).toBe(q.netPrice);
    }
  });

  it('36-month stretch does not change the total (price-neutral tenor)', () => {
    const m24 = quote('standard', 24);
    const m36 = quote('standard', 36);
    expect(m36.netPrice).toBe(m24.netPrice);
    expect(m36.installments).toHaveLength(36);
    expect(m36.installments[0].amount).toBeLessThan(m24.installments[0].amount);
  });

  it('Amina (৳3.2 lakh now, ৳25k/month) is steered to a plan she can finish from salary', () => {
    const ranked = score(320_000, 25_000, 36);
    const best = ranked[0];
    expect(best.feasibleWithoutReferral).toBe(true);
    expect(best.depositAmount).toBeLessThanOrEqual(320_000);
    expect(best.paymentTierId).not.toBe('full');
  });

  it('Nadia (cash for the whole price) can take the full-pay saving', () => {
    const ranked = score(1_000_000, 0, 36);
    const full = ranked.find((s) => s.paymentTierId === 'full');
    expect(full?.feasibleWithoutReferral).toBe(true);
    expect(full?.savings).toBeGreaterThan(50_000);
    const mostSaved = [...ranked]
      .filter((s) => s.feasibleWithoutReferral)
      .sort((a, b) => b.savings - a.savings)[0];
    expect(mostSaved.paymentTierId).toBe('full');
  });

  it('Farhan (৳20k now, ৳5k/month) cannot cover this share on salary alone', () => {
    const ranked = score(20_000, 5_000, 36);
    expect(ranked.every((s) => !s.feasibleWithoutReferral)).toBe(true);
  });

  it('Rina’s referral target can make an otherwise tight calendar feasible', () => {
    const without = score(250_000, 8_000, 36, null);
    const withRef = score(250_000, 8_000, 36, { mode: 'count', value: 24, overMonths: 12 });
    expect(without.some((s) => s.feasibleWithoutReferral)).toBe(false);
    expect(withRef.some((s) => s.feasibleIfTargetHit)).toBe(true);
  });
});
