import {
  annualReturnRange,
  clampAdr,
  clampOccupancyPct,
  DEFAULT_RETURN_ASSUMPTIONS,
  effectiveAdrBand,
  normalizeReturnAssumptions,
  occupancyBounds,
  projectReturn
} from '../returns';

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

describe('admin min/max bounds are enforced', () => {
  const ADMIN = normalizeReturnAssumptions({
    referenceSqFt: 300,
    occupancyLowPct: 50,
    occupancyHighPct: 75,
    operatingCostPct: 15,
    categories: { Standard: { adrLow: 6000, adrHigh: 9000 } }
  });
  const SUITE = { type: 'Standard', size: 345 };
  const band = effectiveAdrBand(ADMIN, SUITE)!;

  it('scales the admin band by suite size', () => {
    expect(band.adrLow).toBe(6900);
    expect(band.adrHigh).toBe(10350);
  });

  it('caps a daily rate typed above the admin maximum', () => {
    expect(clampAdr(999999, band)).toBe(band.adrHigh);
    expect(clampAdr(0, band)).toBe(band.adrLow);
    expect(clampAdr(8000, band)).toBe(8000);
  });

  it('caps occupancy outside the admin bounds', () => {
    expect(clampOccupancyPct(100, ADMIN)).toBe(75);
    expect(clampOccupancyPct(5, ADMIN)).toBe(50);
    expect(clampOccupancyPct(60, ADMIN)).toBe(60);
  });

  it('never projects income outside the published catalog range', () => {
    const days = 5;
    const range = annualReturnRange(days, ADMIN, SUITE)!;
    const wildInputs = [
      { adr: 999999, occupancyPct: 100 },
      { adr: 0, occupancyPct: 0 },
      { adr: -500, occupancyPct: 10 }
    ];
    for (const raw of wildInputs) {
      const projected = projectReturn({
        daysPerMonth: days,
        adr: clampAdr(raw.adr, band),
        occupancyPct: clampOccupancyPct(raw.occupancyPct, ADMIN),
        operatingCostPct: ADMIN.operatingCostPct
      });
      expect(projected.annualNet).toBeGreaterThanOrEqual(range.low);
      expect(projected.annualNet).toBeLessThanOrEqual(range.high);
    }
  });

  it('orders inverted occupancy bounds instead of inverting the range', () => {
    const flipped = normalizeReturnAssumptions({
      ...ADMIN,
      occupancyLowPct: 80,
      occupancyHighPct: 40
    });
    expect(flipped.occupancyHighPct).toBeGreaterThanOrEqual(flipped.occupancyLowPct);
    expect(occupancyBounds(flipped).low).toBeLessThanOrEqual(occupancyBounds(flipped).high);
  });

  it('keeps an edited admin band in the buyer calculation', () => {
    const raised = normalizeReturnAssumptions({
      ...ADMIN,
      categories: { Standard: { adrLow: 12000, adrHigh: 18000 } }
    });
    const raisedBand = effectiveAdrBand(raised, SUITE)!;
    expect(raisedBand.adrLow).toBe(13800);
    expect(clampAdr(8000, raisedBand)).toBe(13800);
    expect(annualReturnRange(5, raised, SUITE)!.low).toBeGreaterThan(
      annualReturnRange(5, ADMIN, SUITE)!.low
    );
  });
});
