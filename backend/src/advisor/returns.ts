/**
 * Buyer-facing expected-return math. Keep in lockstep with frontend/lib/returns.ts.
 */

export type CategoryAdrRates = {
  adrLow: number;
  adrHigh: number;
};

export type ReturnAssumptions = {
  referenceSqFt: number;
  occupancyLowPct: number;
  occupancyHighPct: number;
  operatingCostPct: number;
  categories: Record<string, CategoryAdrRates>;
  adrLow?: number;
  adrHigh?: number;
};

export type SuiteReturnContext = {
  type?: string | null;
  size?: number | null;
};

export const DEFAULT_RETURN_ASSUMPTIONS: ReturnAssumptions = {
  referenceSqFt: 300,
  occupancyLowPct: 50,
  occupancyHighPct: 75,
  operatingCostPct: 15,
  categories: {
    Standard: { adrLow: 6000, adrHigh: 9000 },
    Delux: { adrLow: 8000, adrHigh: 12000 },
    Premium: { adrLow: 11000, adrHigh: 16000 }
  }
};

export function normalizeCategoryKey(raw?: string | null) {
  const s = (raw || '').trim();
  if (!s) return 'Standard';
  const lower = s.toLowerCase();
  if (lower.startsWith('prem')) return 'Premium';
  if (lower.startsWith('delux') || lower.startsWith('deluxe')) return 'Delux';
  if (lower.startsWith('stand')) return 'Standard';
  return s;
}

export function normalizeReturnAssumptions(raw: unknown): ReturnAssumptions {
  const stored = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const categories: Record<string, CategoryAdrRates> = {
    Standard: { ...DEFAULT_RETURN_ASSUMPTIONS.categories.Standard },
    Delux: { ...DEFAULT_RETURN_ASSUMPTIONS.categories.Delux },
    Premium: { ...DEFAULT_RETURN_ASSUMPTIONS.categories.Premium }
  };

  if (stored.categories && typeof stored.categories === 'object') {
    for (const [rawKey, rates] of Object.entries(stored.categories as Record<string, any>)) {
      const key = normalizeCategoryKey(rawKey);
      const fallback = categories[key] || categories.Standard;
      categories[key] = {
        adrLow: Math.max(0, Number(rates?.adrLow ?? fallback.adrLow) || 0),
        adrHigh: Math.max(0, Number(rates?.adrHigh ?? fallback.adrHigh) || 0)
      };
    }
  } else if (stored.adrLow != null || stored.adrHigh != null) {
    const low = Math.max(0, Number(stored.adrLow) || categories.Standard.adrLow);
    const high = Math.max(0, Number(stored.adrHigh) || categories.Standard.adrHigh);
    categories.Standard = { adrLow: low, adrHigh: high };
    categories.Delux = { adrLow: Math.round(low * 1.25), adrHigh: Math.round(high * 1.25) };
    categories.Premium = { adrLow: Math.round(low * 1.7), adrHigh: Math.round(high * 1.7) };
  }

  for (const key of Object.keys(categories)) {
    const c = categories[key];
    if (c.adrLow > c.adrHigh) [c.adrLow, c.adrHigh] = [c.adrHigh, c.adrLow];
  }

  const occupancyLowPct = Math.min(
    100,
    Math.max(0, Number(stored.occupancyLowPct ?? DEFAULT_RETURN_ASSUMPTIONS.occupancyLowPct) || 0)
  );
  let occupancyHighPct = Math.min(
    100,
    Math.max(0, Number(stored.occupancyHighPct ?? DEFAULT_RETURN_ASSUMPTIONS.occupancyHighPct) || 0)
  );
  if (occupancyLowPct > occupancyHighPct) occupancyHighPct = occupancyLowPct;

  return {
    referenceSqFt: Math.max(1, Number(stored.referenceSqFt) || DEFAULT_RETURN_ASSUMPTIONS.referenceSqFt),
    occupancyLowPct,
    occupancyHighPct,
    operatingCostPct: Math.min(
      100,
      Math.max(0, Number(stored.operatingCostPct ?? DEFAULT_RETURN_ASSUMPTIONS.operatingCostPct) || 0)
    ),
    categories
  };
}

export function effectiveAdrBand(
  assumptions: ReturnAssumptions | null | undefined,
  suite?: SuiteReturnContext | null
) {
  if (!assumptions) return null;
  const a = normalizeReturnAssumptions(assumptions);
  const key = normalizeCategoryKey(suite?.type);
  const rates = a.categories[key] || a.categories.Standard || DEFAULT_RETURN_ASSUMPTIONS.categories.Standard;
  const size = Math.max(1, Number(suite?.size) || a.referenceSqFt);
  const scale = size / a.referenceSqFt;
  return {
    adrLow: Math.round(rates.adrLow * scale),
    adrHigh: Math.round(rates.adrHigh * scale),
    category: key,
    size,
    scale
  };
}

export function annualReturnRange(
  daysPerMonth: number,
  assumptions: ReturnAssumptions | null | undefined,
  suite?: SuiteReturnContext | null
) {
  if (!assumptions) return null;
  const a = normalizeReturnAssumptions(assumptions);
  const days = Math.max(0, Math.min(30, Number(daysPerMonth) || 0));
  if (days <= 0) return null;
  const band = effectiveAdrBand(a, suite);
  if (!band) return null;
  const costFactor = 1 - a.operatingCostPct / 100;
  const annual = (adr: number, occPct: number) =>
    Math.round(adr * days * (occPct / 100) * costFactor * 12);
  const low = annual(band.adrLow, a.occupancyLowPct);
  const high = annual(band.adrHigh, a.occupancyHighPct);
  if (high <= 0) return null;
  return {
    low: Math.min(low, high),
    high: Math.max(low, high),
    adrLow: band.adrLow,
    adrHigh: band.adrHigh,
    category: band.category
  };
}
