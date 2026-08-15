import { generatePaymentSchedule } from './schedule';

describe('generatePaymentSchedule', () => {
  const anchor = new Date('2026-01-15T00:00:00.000Z');
  const standard = {
    upfrontPct: 10,
    downpaymentPct: 20,
    downpaymentAfterMonths: 3,
    installmentMonths: 24,
    cadence: 'monthly' as const,
  };

  it('matches today: 10 / 20 / 24 monthly and rows sum to total', () => {
    const items = generatePaymentSchedule(100000, anchor, standard);
    const deposit = items.find((i) => i.type === 'deposit')!;
    const down = items.find((i) => i.type === 'downpayment')!;
    const inst = items.filter((i) => i.type === 'installment');
    expect(deposit.amount).toBe(10000);
    expect(down.amount).toBe(20000);
    expect(inst).toHaveLength(24);
    expect(items.reduce((s, i) => s + i.amount, 0)).toBe(100000);
    expect(new Date(down.dueDate).getUTCMonth()).toBe(3); // April from Jan
  });

  it('merges downpayment into deposit at 30% and keeps 24 installments', () => {
    const items = generatePaymentSchedule(100000, anchor, { ...standard, upfrontPct: 30 });
    expect(items.filter((i) => i.type === 'downpayment')).toHaveLength(0);
    expect(items.find((i) => i.type === 'deposit')!.amount).toBe(30000);
    expect(items.filter((i) => i.type === 'installment')).toHaveLength(24);
    expect(items.reduce((s, i) => s + i.amount, 0)).toBe(100000);
  });

  it('emits a single deposit row for full payment', () => {
    const items = generatePaymentSchedule(100000, anchor, { ...standard, upfrontPct: 100 });
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('deposit');
    expect(items[0].amount).toBe(100000);
  });
});
