import { formatSavePct, tierHeadline, tierHelp } from '../paymentCopy';

describe('buyer-facing payment copy', () => {
  it('uses everyday headlines instead of finance labels', () => {
    expect(tierHeadline({ id: 'standard', upfrontPct: 10 })).toBe('Reserve with 10%');
    expect(tierHeadline({ id: 'booking_plus_down' })).toBe('Pay booking + downpayment now');
    expect(tierHeadline({ id: 'half' })).toBe('Pay half now');
    expect(tierHeadline({ id: 'full' })).toBe('Pay in full now');
  });

  it('explains the 10% option as the smallest amount today', () => {
    expect(tierHelp({ id: 'standard' })).toMatch(/smallest amount today/i);
  });

  it('hides tiny or zero savings', () => {
    expect(formatSavePct(0)).toBe('');
    expect(formatSavePct(7.0686)).toBe('7.1%');
    expect(formatSavePct(0.4162)).toBe('0.42%');
  });
});
