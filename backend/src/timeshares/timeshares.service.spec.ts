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
    expect(removed).toBe(true);
  });

  it('blocks further plans after a full-bleed plan exists on the suite', async () => {
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
    expect((blocked as any).error).toBe('full_ownership_locked');
    await svc.remove(fullId);
  });
});

