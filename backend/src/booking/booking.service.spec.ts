import { BookingService } from './booking.service';
import { SuitesService } from '../suites/suites.service';
import { TimesharesService } from '../timeshares/timeshares.service';

describe('BookingService', () => {
  it('generates schedule with deposit, downpayment and installments', async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/grand_sampan';
    const suites = new SuitesService();
    const plans = new TimesharesService();
    const suiteId = 'T-JEST-S';
    const planId = 'T-JEST-P';
    try {
      await suites.remove(suiteId);
    } catch {}
    try {
      await plans.remove(planId);
    } catch {}
    await suites.create({ id: suiteId, floor: 3, type: 'Test', size: 200, view: 'Sea', totalPrice: 200000, currency: 'BDT' } as any);
    await plans.create({
      id: planId,
      name: 'Test Plan',
      daysPerMonth: 5,
      lockIn: 12,
      price: 50000,
      currency: 'BDT',
      suiteId,
      planType: 'DPM',
      planStatus: 'Unsold',
      timeFraction: 0.167
    } as any);
    const svc = new BookingService();
    const now = new Date();
    let res = await svc.book(suiteId, planId, now.toISOString(), new Date(now.getTime() + 86400000).toISOString(), 'I-1');
    if (!res) {
      res = await svc.book(suiteId, planId, new Date(now.getTime() + 2 * 86400000).toISOString(), new Date(now.getTime() + 3 * 86400000).toISOString(), 'I-1');
    }
    expect(res).toBeTruthy();
    expect(Array.isArray(res?.schedule)).toBe(true);
    expect((res as any).schedule.length).toBeGreaterThan(2);
    const types = (res!.schedule ?? []).map((s) => s.type);
    expect(types).toContain('deposit');
    expect(types).toContain('downpayment');
    expect(types).toContain('installment');
  });
});

