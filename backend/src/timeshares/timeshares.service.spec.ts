import { TimesharesService } from './timeshares.service';
import { SuitesService } from '../suites/suites.service';

describe('TimesharesService', () => {
  const suiteId = 'T-SP-SUITE';
  const planId = 'T-SP-5D';
  let svc: TimesharesService;
  let suites: SuitesService;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/grand_sampan';
    svc = new TimesharesService();
    suites = new SuitesService();
    try {
      await svc.remove(planId);
    } catch {}
    try {
      await suites.remove(suiteId);
    } catch {}
    await suites.create({ id: suiteId, floor: 4, type: 'Test', size: 250, view: 'Sea', totalPrice: 250000, currency: 'BDT' } as any);
  });

  afterAll(async () => {
    try {
      await svc.remove(planId);
    } catch {}
    try {
      await suites.remove(suiteId);
    } catch {}
  });

  it('creates, reads, updates and deletes a share plan', async () => {
    const created = await svc.create({
      id: planId,
      name: '5 days/month',
      daysPerMonth: 5,
      lockIn: 12,
      price: 50000,
      currency: 'BDT',
      suiteId,
      planType: 'DPM',
      planStatus: 'Unsold'
    } as any);
    expect(created.ok).toBe(true);
    const fetched = await svc.get(planId);
    expect(fetched).toBeTruthy();
    expect(fetched?.id).toBe(planId);
    expect((fetched as any).timeFraction).toBeCloseTo(0.167, 3);
    const bySuite = await svc.listBySuite(suiteId);
    expect(Array.isArray(bySuite)).toBe(true);
    expect(!!bySuite.find((p: any) => p.id === planId)).toBe(true);
    const updated = await svc.update(planId, { price: 51000 });
    expect(updated.ok).toBe(true);
    expect((updated as any)?.plan?.price).toBe(51000);
    const removed = await svc.remove(planId);
    expect(removed.ok).toBe(true);
  });

  it('allows multiple DPM plans until combined days reach 30', async () => {
    const a = 'T-SP-3D';
    const b = 'T-SP-5D-B';
    const over = 'T-SP-OVER';
    for (const id of [a, b, over, planId]) {
      try {
        await svc.remove(id);
      } catch {}
    }
    const first = await svc.create({
      id: a,
      name: '3 days/month',
      daysPerMonth: 3,
      lockIn: 36,
      price: 30000,
      currency: 'BDT',
      suiteId,
      planType: 'DPM',
      planStatus: 'Unsold'
    } as any);
    expect(first.ok).toBe(true);
    const second = await svc.create({
      id: b,
      name: '5 days/month',
      daysPerMonth: 5,
      lockIn: 36,
      price: 50000,
      currency: 'BDT',
      suiteId,
      planType: 'DPM',
      planStatus: 'Unsold'
    } as any);
    expect(second.ok).toBe(true);
    // 3 + 5 = 8 used → 22 left; a 25-day plan must be rejected
    const blocked = await svc.create({
      id: over,
      name: 'Too many days',
      daysPerMonth: 25,
      lockIn: 36,
      price: 100000,
      currency: 'BDT',
      suiteId,
      planType: 'DPM',
      planStatus: 'Unsold'
    } as any);
    expect(blocked.ok).toBe(false);
    expect((blocked as any).error).toBe('exceeds_month_capacity');
    expect((blocked as any).remainingDays).toBe(22);
    await svc.remove(a);
    await svc.remove(b);
  });

  it('locks the unit only after a full 30 days/month plan exists', async () => {
    const fullId = 'T-SP-FULL';
    const extraId = 'T-SP-EXTRA';
    try {
      await svc.remove(fullId);
    } catch {}
    try {
      await svc.remove(extraId);
    } catch {}
    const full = await svc.create({
      id: fullId,
      name: 'Full ownership',
      daysPerMonth: 30,
      lockIn: 36,
      price: 250000,
      currency: 'BDT',
      suiteId,
      planType: 'FULL',
      planStatus: 'Unsold'
    } as any);
    expect(full.ok).toBe(true);
    expect((full as any).plan?.planType).toBe('FULL');
    const blocked = await svc.create({
      id: extraId,
      name: 'Extra DPM',
      daysPerMonth: 5,
      lockIn: 12,
      price: 50000,
      currency: 'BDT',
      suiteId,
      planType: 'DPM',
      planStatus: 'Unsold'
    } as any);
    expect(blocked.ok).toBe(false);
    expect((blocked as any).error).toBe('unit_capacity_full');
    await svc.remove(fullId);
  });
});

