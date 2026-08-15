import { CONCIERGE_QUICK, conciergeReply } from '../concierge';

describe('client concierge scenarios', () => {
  it('points a budget question at Help me choose, not a raw path', () => {
    const r = conciergeReply('How much do I need to pay today?');
    expect(r.text).not.toMatch(/\/invest/);
    expect(r.links?.some((l) => l.href === '/invest/advisor' && l.label === 'Help me choose')).toBe(true);
  });

  it('explains reserving without KYC jargon', () => {
    const r = conciergeReply('How do I reserve a suite?');
    expect(r.text.toLowerCase()).not.toContain('kyc');
    expect(r.links?.[0].href).toBe('/invest');
  });

  it('quick replies cover choose / browse / reserve', () => {
    const labels = CONCIERGE_QUICK.map((q) => q.label);
    expect(labels).toEqual(['Help me choose', 'Browse suites', 'How to reserve']);
    for (const q of CONCIERGE_QUICK) {
      const r = conciergeReply(q.prompt);
      expect(r.text.length).toBeGreaterThan(20);
    }
  });
});
