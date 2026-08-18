import { JwtService } from '@nestjs/jwt';

export const QUOTE_TOKEN_PURPOSE = 'booking-quote';

export type QuoteTokenPayload = {
  purpose: typeof QUOTE_TOKEN_PURPOSE;
  planId: string;
  paymentTierId: string;
  installmentMonths: number;
  cadence: 'monthly' | 'quarterly';
  listPrice: number;
  promoDiscountPct: number;
  advanceDiscountPct: number;
  discountRateAnnualPct: number;
  netPrice: number;
  upfrontPct: number;
  /** Locked with the quote so a policy edit mid-quote cannot reshape the calendar.
   *  Optional: tokens issued before this field existed fall back to live policy. */
  downpaymentPct?: number;
  downpaymentAfterMonths?: number;
};

export function signQuoteToken(
  jwt: JwtService,
  payload: Omit<QuoteTokenPayload, 'purpose'>,
  ttlMinutes: number
) {
  const minutes = Math.max(5, Math.min(24 * 60, Math.round(Number(ttlMinutes) || 30)));
  return jwt.signAsync(
    { ...payload, purpose: QUOTE_TOKEN_PURPOSE },
    { expiresIn: `${minutes}m` }
  );
}

export async function verifyQuoteToken(
  jwt: JwtService,
  token?: string | null
): Promise<{ ok: true; payload: QuoteTokenPayload } | { ok: false; error: 'quote_expired' | 'quote_invalid' }> {
  const raw = String(token || '').trim();
  if (!raw) return { ok: false, error: 'quote_invalid' };
  try {
    const payload = await jwt.verifyAsync<QuoteTokenPayload>(raw);
    if (payload?.purpose !== QUOTE_TOKEN_PURPOSE) return { ok: false, error: 'quote_invalid' };
    if (!payload.planId || !Number.isFinite(Number(payload.netPrice))) {
      return { ok: false, error: 'quote_invalid' };
    }
    return { ok: true, payload };
  } catch (err: any) {
    const name = String(err?.name || '');
    if (name === 'TokenExpiredError') return { ok: false, error: 'quote_expired' };
    return { ok: false, error: 'quote_expired' };
  }
}
