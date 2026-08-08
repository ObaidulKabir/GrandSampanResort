import { BookingService } from './booking.service';
import { SuitesService } from '../suites/suites.service';
import { TimesharesService } from '../timeshares/timeshares.service';

const sampleKyc = {
  name: 'Test Buyer',
  fatherName: 'Test Father',
  nid: '1234567890',
  dob: '1990-01-01',
  address: 'Present address',
  permanentAddress: 'Permanent address',
  contact: '01700000000',
  email: 'buyer@example.com',
  picUrl: '/uploads/media/pic.jpg',
  nomineeName: 'Nominee',
  nomineeNid: '0987654321',
  nomineePicUrl: '/uploads/media/nominee.jpg'
};

describe('BookingService', () => {
  it('requires KYC for investment bookings and links clientId when provided', async () => {
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

    const missing = await svc.book(
      suiteId,
      planId,
      now.toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      'I-1'
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toBe('kyc_required');

    let res = await svc.book(
      suiteId,
      planId,
      now.toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      'I-1',
      'monthly',
      sampleKyc
    );
    if (!res.ok) {
      // Reset plan if a prior run left it booked, then retry once.
      await plans.update(planId, { planStatus: 'Unsold' } as any);
      res = await svc.book(
        suiteId,
        planId,
        new Date(now.getTime() + 2 * 86400000).toISOString(),
        new Date(now.getTime() + 3 * 86400000).toISOString(),
        'I-1',
        'monthly',
        sampleKyc
      );
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.booking.planId).toBe(planId);
    expect(res.booking.clientId).toBeTruthy();
    expect((res as any).client?.nid).toBe(sampleKyc.nid);
    expect(Array.isArray(res.booking.schedule)).toBe(true);
    const types = res.booking.schedule!.map((s) => s.type);
    expect(types).toContain('deposit');
    expect(types).toContain('downpayment');
    expect(types).toContain('installment');
    // 1 deposit + 1 downpayment + 24 monthly installments
    expect(res.booking.schedule!.filter((s) => s.type === 'installment')).toHaveLength(24);

    await plans.update(planId, { planStatus: 'Unsold' } as any);
    const quarterly = await svc.book(
      suiteId,
      planId,
      new Date(now.getTime() + 4 * 86400000).toISOString(),
      new Date(now.getTime() + 5 * 86400000).toISOString(),
      'I-1',
      'quarterly',
      sampleKyc
    );
    expect(quarterly.ok).toBe(true);
    if (!quarterly.ok) return;
    expect(quarterly.booking.schedule!.filter((s) => s.type === 'installment')).toHaveLength(8);
    expect(quarterly.booking.clientId).toBeTruthy();
  });
});
