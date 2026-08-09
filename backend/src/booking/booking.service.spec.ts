import * as bcrypt from 'bcryptjs';
import { BookingService } from './booking.service';
import { SuitesService } from '../suites/suites.service';
import { TimesharesService } from '../timeshares/timeshares.service';
import { prisma } from '../../prisma/client';

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

const sampleDeposit = {
  depositMethod: 'cheque' as const,
  depositReference: 'CHQ-12345',
  depositNote: 'Test cheque'
};

describe('BookingService', () => {
  it('reserves plan awaiting payment and confirms/rejects deposit', async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/grand_sampan';
    const suites = new SuitesService();
    const plans = new TimesharesService();
    const suiteId = 'T-JEST-S';
    const planId = 'T-JEST-P';
    const investorId = 'I-1';
    const unverifiedId = 'I-UNVERIFIED';
    try {
      await suites.remove(suiteId);
    } catch {}
    try {
      await plans.remove(planId);
    } catch {}
    const passwordHash = await bcrypt.hash('testpass123', 10);
    await prisma.user.upsert({
      where: { id: investorId },
      update: { emailVerified: true, role: 'investor' },
      create: {
        id: investorId,
        name: 'Jest Investor',
        email: 'jest-investor@example.com',
        passwordHash,
        kyc: false,
        role: 'investor',
        emailVerified: true
      }
    });
    await prisma.user.upsert({
      where: { id: unverifiedId },
      update: { emailVerified: false, role: 'investor' },
      create: {
        id: unverifiedId,
        name: 'Unverified Investor',
        email: 'jest-unverified@example.com',
        passwordHash,
        kyc: false,
        role: 'investor',
        emailVerified: false
      }
    });
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

    const missingKyc = await svc.book(
      suiteId,
      planId,
      now.toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      investorId
    );
    expect(missingKyc.ok).toBe(false);
    if (!missingKyc.ok) expect(missingKyc.error).toBe('kyc_required');

    const missingDeposit = await svc.book(
      suiteId,
      planId,
      now.toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      investorId,
      'monthly',
      sampleKyc
    );
    expect(missingDeposit.ok).toBe(false);
    if (!missingDeposit.ok) expect(missingDeposit.error).toBe('deposit_payment_required');

    const blockedUnverified = await svc.book(
      suiteId,
      planId,
      now.toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      unverifiedId,
      'monthly',
      sampleKyc,
      sampleDeposit
    );
    expect(blockedUnverified.ok).toBe(false);
    if (!blockedUnverified.ok) expect(blockedUnverified.error).toBe('email_not_verified');

    let res = await svc.book(
      suiteId,
      planId,
      now.toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      investorId,
      'monthly',
      sampleKyc,
      sampleDeposit
    );
    if (!res.ok) {
      await plans.update(planId, { planStatus: 'Unsold' } as any);
      res = await svc.book(
        suiteId,
        planId,
        new Date(now.getTime() + 2 * 86400000).toISOString(),
        new Date(now.getTime() + 3 * 86400000).toISOString(),
        investorId,
        'monthly',
        sampleKyc,
        sampleDeposit
      );
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.booking.status).toBe('awaiting_payment');
    expect(res.booking.depositMethod).toBe('cheque');
    expect(res.booking.clientId).toBeTruthy();
    expect(res.booking.schedule!.filter((s) => s.type === 'installment')).toHaveLength(24);
    const reserved = await plans.get(planId);
    expect(String((reserved as any)?.planStatus)).toBe('Reserved');

    const depositOnly = await svc.confirmDeposit(res.booking.id);
    expect(depositOnly.ok).toBe(true);
    if (depositOnly.ok) {
      expect(depositOnly.completed).toBe(false);
      expect(depositOnly.status).toBe('awaiting_kyc');
    }
    let reservedStill = await plans.get(planId);
    expect(String((reservedStill as any)?.planStatus)).toBe('Reserved');
    const schedule = await svc.schedule(res.booking.id);
    const deposit = (schedule || []).find((s: any) => s.type === 'deposit');
    expect(deposit?.status).toBe('paid');

    const kycOk = await svc.verifyKyc(res.booking.id);
    expect(kycOk.ok).toBe(true);
    if (kycOk.ok) expect(kycOk.completed).toBe(true);
    const booked = await plans.get(planId);
    expect(String((booked as any)?.planStatus)).toBe('Booked');
    const summary = await svc.summary(res.booking.id);
    expect(summary?.booking?.status).toBe('confirmed');
    expect(summary?.booking?.kycVerified).toBe(true);

    await plans.update(planId, { planStatus: 'Unsold' } as any);
    const quarterly = await svc.book(
      suiteId,
      planId,
      new Date(now.getTime() + 4 * 86400000).toISOString(),
      new Date(now.getTime() + 5 * 86400000).toISOString(),
      investorId,
      'quarterly',
      sampleKyc,
      { depositMethod: 'online_transfer', depositReference: 'TRX-99' }
    );
    expect(quarterly.ok).toBe(true);
    if (!quarterly.ok) return;
    expect(quarterly.booking.schedule!.filter((s) => s.type === 'installment')).toHaveLength(8);

    const rejected = await svc.rejectDeposit(quarterly.booking.id);
    expect(rejected.ok).toBe(true);
    const released = await plans.get(planId);
    expect(String((released as any)?.planStatus)).toBe('Unsold');
    const rejectedSummary = await svc.summary(quarterly.booking.id);
    expect(rejectedSummary?.booking?.status).toBe('cancelled');
  });
});
