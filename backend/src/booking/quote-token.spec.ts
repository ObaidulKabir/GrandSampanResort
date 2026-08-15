import { JwtService } from '@nestjs/jwt';
import { signQuoteToken, verifyQuoteToken } from './quote-token';

describe('quote token', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const payload = {
    planId: 'P-3D',
    paymentTierId: 'full',
    installmentMonths: 24,
    cadence: 'monthly' as const,
    listPrice: 100000,
    promoDiscountPct: 0,
    advanceDiscountPct: 7.07,
    discountRateAnnualPct: 8,
    netPrice: 92930,
    upfrontPct: 100
  };

  it('round-trips a signed quote', async () => {
    const token = await signQuoteToken(jwt, payload, 30);
    const verified = await verifyQuoteToken(jwt, token);
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.payload.netPrice).toBe(92930);
  });

  it('rejects an expired token as quote_expired', async () => {
    const token = await jwt.signAsync(
      { ...payload, purpose: 'booking-quote' },
      { expiresIn: '0s' }
    );
    await new Promise((r) => setTimeout(r, 20));
    const verified = await verifyQuoteToken(jwt, token);
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.error).toBe('quote_expired');
  });
});
