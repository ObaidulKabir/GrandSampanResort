import {
  DEFAULT_PAYMENT_PLAN_POLICY,
  MIN_TENOR_MONTHS,
  PaymentPlanPolicy,
  PaymentPlansService
} from './payment-plans.service';

const service = new PaymentPlansService();

function policyWith(overrides: Partial<PaymentPlanPolicy> = {}): PaymentPlanPolicy {
  return service.normalize({ ...DEFAULT_PAYMENT_PLAN_POLICY, ...overrides });
}

/** A tier that pins its own (longer) calendar, the mechanism fast_track used to use. */
function policyWithPinnedTenorTier(): PaymentPlanPolicy {
  return service.normalize({
    ...DEFAULT_PAYMENT_PLAN_POLICY,
    tenors: [24, 30, 36],
    tiers: [
      ...DEFAULT_PAYMENT_PLAN_POLICY.tiers,
      {
        id: 'pinned_24',
        label: 'Pinned 24 mo',
        upfrontPct: 10,
        installmentMonthsOverride: 24,
        discountPct: null,
        passThroughPct: 100,
        maxDiscountPct: 15
      }
    ]
  });
}

function tier(resolved: ReturnType<PaymentPlansService['resolveTiers']>, id: string) {
  const found = resolved.find((t) => t.id === id);
  if (!found) throw new Error(`missing tier ${id}`);
  return found;
}

describe('resolveTiers pricing', () => {
  it('prices every tier on the tenor it reports, so the billed schedule cannot drift', () => {
    const resolved = service.resolveTiers(policyWith(), { installmentMonths: 24 });
    for (const t of resolved) {
      expect(t.installmentMonths).toBe(t.installmentMonthsOverride ?? 24);
    }
  });

  it('keeps a pinned-tenor discount tied to that tier own calendar', () => {
    const pinned = tier(
      service.resolveTiers(policyWithPinnedTenorTier(), { installmentMonths: 36 }),
      'pinned_24'
    );
    expect(pinned.installmentMonths).toBe(24);
    expect(pinned.offeredDiscountPct).toBeGreaterThan(0);
  });

  it('drops the tier tenor override when the buyer builds their own calendar', () => {
    const resolved = service.resolveTiers(policyWithPinnedTenorTier(), {
      installmentMonths: 36,
      honorTierTenorOverride: false
    });
    const pinned = tier(resolved, 'pinned_24');
    // Same 10% upfront and same 36-month calendar as standard, so no discount is earned.
    expect(pinned.installmentMonths).toBe(36);
    expect(pinned.offeredDiscountPct).toBe(0);
    expect(tier(resolved, 'full').installmentMonths).toBe(36);
  });

  it('never discounts the standard booking-only tier', () => {
    const standard = tier(service.resolveTiers(policyWith(), { installmentMonths: 24 }), 'standard');
    expect(standard.offeredDiscountPct).toBe(0);
    expect(standard.source).toBe('standard');
  });

  it('raises the advance discount when admin raises the discount rate', () => {
    const at8 = tier(service.resolveTiers(policyWith({ discountRateAnnualPct: 8 })), 'full');
    const at14 = tier(service.resolveTiers(policyWith({ discountRateAnnualPct: 14 })), 'full');
    expect(at14.fairDiscountPct).toBeGreaterThan(at8.fairDiscountPct);
  });

  it('honours the admin compounding setting, not just the annual rate', () => {
    const annual = tier(service.resolveTiers(policyWith({ compoundingPerYear: 1 })), 'full');
    const monthly = tier(service.resolveTiers(policyWith({ compoundingPerYear: 12 })), 'full');
    // 8% nominal compounded monthly is a steeper curve than 8% compounded once.
    expect(monthly.fairDiscountPct).toBeGreaterThan(annual.fairDiscountPct);
  });

  it('charges for a longer calendar only when tenorPricing is pv', () => {
    const neutral = tier(
      service.resolveTiers(policyWith({ tenorPricing: 'neutral' }), { installmentMonths: 36 }),
      'half'
    );
    const priced = tier(
      service.resolveTiers(policyWith({ tenorPricing: 'pv' }), { installmentMonths: 36 }),
      'half'
    );
    expect(priced.fairDiscountPct).toBeLessThan(neutral.fairDiscountPct);
  });
});

describe('retired short tenures', () => {
  it('sells only 24, 30 and 36 month calendars', () => {
    expect(policyWith().tenors).toEqual([24, 30, 36]);
    expect(MIN_TENOR_MONTHS).toBe(24);
  });

  it('strips sub-24-month tenors saved by an older policy row', () => {
    const migrated = service.normalize({
      ...DEFAULT_PAYMENT_PLAN_POLICY,
      tenors: [12, 18, 24, 30, 36]
    });
    expect(migrated.tenors).toEqual([24, 30, 36]);
  });

  it('falls back to the default calendars when a row only had retired ones', () => {
    const migrated = service.normalize({ ...DEFAULT_PAYMENT_PLAN_POLICY, tenors: [12, 18] });
    expect(migrated.tenors).toEqual([24, 30, 36]);
  });

  it('removes a fast_track tier saved by an older policy row', () => {
    const migrated = service.normalize({
      ...DEFAULT_PAYMENT_PLAN_POLICY,
      tiers: [
        {
          id: 'fast_track',
          label: 'Fast Track (12 mo)',
          upfrontPct: 10,
          installmentMonthsOverride: 12,
          discountPct: null,
          passThroughPct: 100,
          maxDiscountPct: 15
        },
        ...DEFAULT_PAYMENT_PLAN_POLICY.tiers
      ]
    });
    expect(migrated.tiers.find((t) => t.id === 'fast_track')).toBeUndefined();
    expect(service.resolveTiers(migrated).some((t) => t.installmentMonths < 24)).toBe(false);
  });

  it('ignores a tier that pins a calendar shorter than we sell', () => {
    const migrated = service.normalize({
      ...DEFAULT_PAYMENT_PLAN_POLICY,
      tiers: [
        {
          id: 'sneaky',
          label: 'Sneaky 12',
          upfrontPct: 10,
          installmentMonthsOverride: 12,
          discountPct: null,
          passThroughPct: 100,
          maxDiscountPct: 15
        }
      ]
    });
    expect(migrated.tiers.find((t) => t.id === 'sneaky')?.installmentMonthsOverride).toBeUndefined();
  });

  it('refuses a 12-month calendar requested by a buyer', () => {
    const policy = policyWith();
    expect(service.pickTenor(policy, 12)).toBe(24);
    expect(service.pickTenor(policy, 18)).toBe(24);
    expect(service.pickTenor(policy, 30)).toBe(30);
    expect(service.pickTenor(policy, 36)).toBe(36);
  });
});
