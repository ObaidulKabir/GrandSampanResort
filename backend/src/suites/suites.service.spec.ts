import { SuitesService } from './suites.service';

describe('SuitesService', () => {
  it('lists suites', async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/grand_sampan';
    const svc = new SuitesService();
    const id = 'T-JEST-UNIT';
    try {
      await svc.remove(id);
    } catch {}
    await svc.create({ id, floor: 1, type: 'Test', size: 100, view: 'Sea', totalPrice: 1, currency: 'BDT' } as any);
    const list = await svc.list();
    expect(Array.isArray(list)).toBe(true);
    expect(!!list.find((s: any) => s.id === id)).toBe(true);
  });
});

