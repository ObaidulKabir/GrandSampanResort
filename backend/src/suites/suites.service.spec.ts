import { SuitesService } from './suites.service';

describe('SuitesService', () => {
  it('lists suites', async () => {
    const svc = new SuitesService();
    const list = await svc.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });
});

