import { money, sampleAnnualRange, stripHtml } from './util';

describe('brochure helpers', () => {
  it('strips tags and keeps list markers', () => {
    expect(stripHtml('<p>Hello</p><br/><li>Item</li>')).toMatch(/Hello/);
    expect(stripHtml('<li>Stay</li>')).toContain('• Stay');
  });

  it('formats taka with Indian grouping', () => {
    expect(money(1234567)).toBe('ট12,34,567/-');
  });

  it('projects a 5-day sample range from assumptions', () => {
    const r = sampleAnnualRange(5, {
      referenceSqFt: 300,
      occupancyLowPct: 50,
      occupancyHighPct: 75,
      operatingCostPct: 15,
      categories: { Standard: { adrLow: 6000, adrHigh: 9000 } }
    }, 'Standard');
    expect(r).not.toBeNull();
    expect(r!.high).toBeGreaterThan(r!.low);
    expect(r!.low).toBe(Math.round(6000 * 5 * 0.5 * 0.85 * 12));
  });
});
