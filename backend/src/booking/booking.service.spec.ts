import { BookingService } from './booking.service';

describe('BookingService', () => {
  it('generates schedule with deposit, downpayment and installments', async () => {
    const svc = new BookingService();
    const res = await svc.book('S-101', 'P-3D', new Date().toISOString(), new Date().toISOString(), 'I-1');
    expect(res?.schedule?.length).toBeGreaterThan(2);
    const types = (res?.schedule ?? []).map((s) => s.type);
    expect(types).toContain('deposit');
    expect(types).toContain('downpayment');
    expect(types).toContain('installment');
  });
});

