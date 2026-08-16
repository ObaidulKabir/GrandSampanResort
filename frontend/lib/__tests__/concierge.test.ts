import { CONCIERGE_QUICK, conciergeMatch, conciergeReply, matchConciergeIntent } from '../concierge';

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

  it('points a returns question at the calculator', () => {
    expect(matchConciergeIntent('What rental income can I expect?')).toBe('returns');
    const r = conciergeReply('Show me the returns calculator');
    expect(r.links?.some((l) => l.href === '/returns-income' && l.label === 'Returns calculator')).toBe(true);
  });

  it('matches Bangla and Banglish keywords', () => {
    expect(matchConciergeIntent('কক্সবাজার কোথায়', 'bn')).toBe('location');
    expect(matchConciergeIntent('kisti dam koto', 'bn')).toBe('payment');
    expect(conciergeMatch('kothay', 'bn').intent).toBe('location');
  });

  it('quick replies cover choose / browse / reserve', () => {
    const keys = CONCIERGE_QUICK.map((q) => q.labelKey);
    expect(keys).toEqual(['quickHelpChoose', 'quickBrowse', 'quickReserve']);
    for (const q of CONCIERGE_QUICK) {
      const r = conciergeReply(q.promptEn);
      expect(r.text.length).toBeGreaterThan(20);
    }
  });
});
