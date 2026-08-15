import { explain, projectReferralInflows, simulateCash } from './score';

describe('advisor scorer', () => {
  it('spreads count-mode referrals using the scored plan price', () => {
    const inflow = projectReferralInflows({
      target: { mode: 'count', value: 2, overMonths: 2 },
      ratePct: 2,
      tranche1Pct: 40,
      tranche2Pct: 60,
      planPrice: 100000,
      horizonMonths: 12
    });
    // each month: 1 referral * 100000 * 2% = 2000; t1=800, t2=1200 at +3
    expect(inflow[1]).toBe(800);
    expect(inflow[2]).toBe(800);
    expect(inflow[4]).toBe(1200);
    expect(inflow[5]).toBe(1200);
  });

  it('marks salary-only infeasible when deposit exceeds cash on hand', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const without = simulateCash({
      availableNow: 5000,
      monthlyCapacity: 1000,
      horizonMonths: 6,
      schedule: [{ dueDate: start.toISOString(), amount: 30000 }],
      start,
      referralIn: Array(7).fill(0)
    });
    expect(without.neverNegative).toBe(false);
  });

  it('explain() maps reason codes to copy', () => {
    const text = explain([{ code: 'SAVES_VS_STANDARD', amountBdt: 48000 }]);
    expect(text).toContain('48,000');
  });
});
