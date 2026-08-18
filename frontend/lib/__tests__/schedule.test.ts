import { generatePaymentSchedule, planOfferPrice, scheduleTotals } from '../schedule';

const OPTS = {
  upfrontPct: 10,
  downpaymentPct: 20,
  downpaymentAfterMonths: 3,
  installmentMonths: 24,
  cadence: 'monthly' as const
};

describe('planOfferPrice', () => {
  it('uses the promotional price when present', () => {
    expect(planOfferPrice({ price: 1_000_000, discountedPrice: 900_000 })).toBe(900_000);
  });

  it('falls back to list price without an offer', () => {
    expect(planOfferPrice({ price: 1_000_000 })).toBe(1_000_000);
  });
});

describe('generatePaymentSchedule', () => {
  it('scales booking, downpayment, and installments from the promotional offer price', () => {
    const list = 1_000_000;
    const afterPromo = 900_000; // 10% offer
    const items = generatePaymentSchedule(afterPromo, new Date('2026-03-01T00:00:00.000Z'), OPTS);
    const t = scheduleTotals(items);

    expect(t.deposit).toBe(90_000);
    expect(t.downpayment).toBe(180_000);
    expect(t.installmentCount).toBe(24);
    expect(t.scheduledTotal).toBe(afterPromo);
    expect(t.deposit).not.toBe(Math.round(list * 0.1));
    expect(t.downpayment).not.toBe(Math.round(list * 0.2));
  });

  it('applies discount to deposit, downpayment, and installments (not list price leftovers)', () => {
    const list = 1_000_000;
    const net = 900_000; // 10% PV discount
    const items = generatePaymentSchedule(net, new Date('2026-03-01T00:00:00.000Z'), OPTS);
    const t = scheduleTotals(items);

    expect(t.deposit).toBe(90_000);
    expect(t.downpayment).toBe(180_000);
    expect(t.installmentCount).toBe(24);
    expect(t.scheduledTotal).toBe(net);
    expect(t.downpayment).not.toBe(Math.round(list * 0.2));
  });

  it('merges downpayment into deposit at 30% upfront', () => {
    const items = generatePaymentSchedule(900_000, new Date('2026-03-01T00:00:00.000Z'), {
      ...OPTS,
      upfrontPct: 30
    });
    const t = scheduleTotals(items);
    expect(t.deposit).toBe(270_000);
    expect(t.downpayment).toBe(0);
    expect(t.scheduledTotal).toBe(900_000);
  });

  it.each([24, 30, 36])('splits remaining balance across %s monthly installments', (months) => {
    const items = generatePaymentSchedule(1_000_000, new Date('2026-03-01T00:00:00.000Z'), {
      ...OPTS,
      installmentMonths: months
    });
    const t = scheduleTotals(items);
    expect(t.installmentCount).toBe(months);
    expect(t.scheduledTotal).toBe(1_000_000);
  });
});
