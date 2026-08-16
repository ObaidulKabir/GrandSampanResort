import { annualReturnRange, DEFAULT_RETURN_ASSUMPTIONS, projectReturn } from '../returns';

describe('projectReturn', () => {
  it('matches the catalog annual formula at the same ADR and occupancy', () => {
    const assumptions = DEFAULT_RETURN_ASSUMPTIONS;
    const days = 5;
    const range = annualReturnRange(days, assumptions, { type: 'Standard', size: 300 });
    expect(range).not.toBeNull();

    const low = projectReturn({
      daysPerMonth: days,
      adr: range!.adrLow,
      occupancyPct: assumptions.occupancyLowPct,
      operatingCostPct: assumptions.operatingCostPct
    });
    const high = projectReturn({
      daysPerMonth: days,
      adr: range!.adrHigh,
      occupancyPct: assumptions.occupancyHighPct,
      operatingCostPct: assumptions.operatingCostPct
    });

    expect(low.annualNet).toBe(range!.low);
    expect(high.annualNet).toBe(range!.high);
  });

  it('returns zero when days or ADR are missing', () => {
    expect(
      projectReturn({
        daysPerMonth: 0,
        adr: 8000,
        occupancyPct: 60,
        operatingCostPct: 15
      }).annualNet
    ).toBe(0);
    expect(
      projectReturn({
        daysPerMonth: 5,
        adr: 0,
        occupancyPct: 60,
        operatingCostPct: 15
      }).monthlyNet
    ).toBe(0);
  });
});
