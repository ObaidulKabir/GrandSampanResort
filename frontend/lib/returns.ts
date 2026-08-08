/**
 * Expected-return projections shown to buyers, driven by admin-managed
 * assumptions (GET /settings/return-assumptions). Mirrors the plan-detail
 * return calculator: annual = ADR × days/month × occupancy × (1 − cost) × 12.
 */

export type ReturnAssumptions = {
  adrLow: number;
  adrHigh: number;
  occupancyLowPct: number;
  occupancyHighPct: number;
  operatingCostPct: number;
};

export function annualReturnRange(daysPerMonth: number, a: ReturnAssumptions | null | undefined) {
  if (!a) return null;
  const days = Math.max(0, Math.min(30, Number(daysPerMonth) || 0));
  if (days <= 0) return null;
  const costFactor = 1 - Math.min(100, Math.max(0, a.operatingCostPct || 0)) / 100;
  const annual = (adr: number, occPct: number) =>
    Math.round((adr || 0) * days * (Math.min(100, Math.max(0, occPct || 0)) / 100) * costFactor * 12);
  const low = annual(a.adrLow, a.occupancyLowPct);
  const high = annual(a.adrHigh, a.occupancyHighPct);
  if (high <= 0) return null;
  return { low: Math.min(low, high), high: Math.max(low, high) };
}
