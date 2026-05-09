import { SuitesService } from './suites.service';

describe('SuitesService (DB)', () => {
  const TEST_ID = 'T-UNIT';
  let svc: SuitesService;

  beforeAll(() => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/grand_sampan';
    svc = new SuitesService();
  });

  afterAll(async () => {
    try {
      await svc.remove(TEST_ID);
    } catch {}
  });

  it('creates and reads a suite from the database', async () => {
    try {
      await svc.remove(TEST_ID);
    } catch {}
    const created = await svc.create({
      id: TEST_ID,
      floor: 9,
      type: 'Test',
      size: 123,
      view: 'Sea',
      totalPrice: 99999,
      currency: 'BDT'
    } as any);
    expect(created).toBeTruthy();
    const fetched = await svc.get(TEST_ID);
    expect(fetched).toBeTruthy();
    expect(fetched?.id).toBe(TEST_ID);
    expect((fetched as any)?.size).toBe(123);
  });
});

