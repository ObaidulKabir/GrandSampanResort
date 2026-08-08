import { Injectable } from '@nestjs/common';
import { prisma } from '../../prisma/client';

export type RevenueSettings = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

export type CategoryAdrRates = {
  /** ADR (BDT/night) at the reference square footage for this category. */
  adrLow: number;
  adrHigh: number;
};

/**
 * Assumptions behind buyer-facing expected returns.
 * ADR scales with suite category and size:
 *   effectiveAdr = categoryAdr × (suiteSqFt / referenceSqFt)
 * Annual = ADR × days/month × occupancy × (1 − cost) × 12
 */
export type ReturnAssumptions = {
  referenceSqFt: number;
  occupancyLowPct: number;
  occupancyHighPct: number;
  operatingCostPct: number;
  categories: Record<string, CategoryAdrRates>;
};

const REVENUE_KEY = 'revenue-policy';
const RETURNS_KEY = 'return-assumptions';

export const DEFAULT_CATEGORIES = ['Standard', 'Delux', 'Premium'] as const;

const DEFAULT_REVENUE: RevenueSettings = {
  taxRate: 0.1,
  serviceChargeRate: 0.05,
  maintenanceReserveRate: 0.05
};

const DEFAULT_RETURNS: ReturnAssumptions = {
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

function num(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCategoryKey(raw: string) {
  const s = (raw || '').trim();
  if (!s) return 'Standard';
  const lower = s.toLowerCase();
  if (lower.startsWith('prem')) return 'Premium';
  if (lower.startsWith('delux') || lower.startsWith('deluxe')) return 'Delux';
  if (lower.startsWith('stand')) return 'Standard';
  return s;
}

@Injectable()
export class SettingsService {
  private memory = new Map<string, unknown>();

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private async readRaw(key: string): Promise<unknown> {
    if (this.db) {
      const row = await this.db.appSetting.findUnique({ where: { key } });
      return row?.value ?? null;
    }
    return this.memory.get(key) ?? null;
  }

  private async persistRaw(key: string, value: unknown) {
    if (this.db) {
      await this.db.appSetting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any }
      });
    } else {
      this.memory.set(key, value);
    }
    return value;
  }

  private async readRevenue(): Promise<RevenueSettings> {
    const stored = ((await this.readRaw(REVENUE_KEY)) as Record<string, unknown>) || {};
    return {
      taxRate: num(stored.taxRate, DEFAULT_REVENUE.taxRate),
      serviceChargeRate: num(stored.serviceChargeRate, DEFAULT_REVENUE.serviceChargeRate),
      maintenanceReserveRate: num(stored.maintenanceReserveRate, DEFAULT_REVENUE.maintenanceReserveRate)
    };
  }

  /**
   * Accepts the new nested shape or migrates the legacy flat ADR fields.
   */
  normalizeReturnAssumptions(raw: unknown): ReturnAssumptions {
    const stored = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    const categories: Record<string, CategoryAdrRates> = {};

    for (const name of DEFAULT_CATEGORIES) {
      categories[name] = { ...DEFAULT_RETURNS.categories[name] };
    }

    if (stored.categories && typeof stored.categories === 'object') {
      for (const [rawKey, rates] of Object.entries(stored.categories as Record<string, any>)) {
        const key = normalizeCategoryKey(rawKey);
        categories[key] = {
          adrLow: Math.max(0, num(rates?.adrLow, categories[key]?.adrLow ?? DEFAULT_RETURNS.categories.Standard.adrLow)),
          adrHigh: Math.max(0, num(rates?.adrHigh, categories[key]?.adrHigh ?? DEFAULT_RETURNS.categories.Standard.adrHigh))
        };
      }
    } else if (stored.adrLow != null || stored.adrHigh != null) {
      // Legacy flat ADR → apply as Standard baseline; scale others slightly.
      const low = Math.max(0, num(stored.adrLow, DEFAULT_RETURNS.categories.Standard.adrLow));
      const high = Math.max(0, num(stored.adrHigh, DEFAULT_RETURNS.categories.Standard.adrHigh));
      categories.Standard = { adrLow: low, adrHigh: high };
      categories.Delux = { adrLow: Math.round(low * 1.25), adrHigh: Math.round(high * 1.25) };
      categories.Premium = { adrLow: Math.round(low * 1.7), adrHigh: Math.round(high * 1.7) };
    }

    for (const key of Object.keys(categories)) {
      const c = categories[key];
      if (c.adrLow > c.adrHigh) [c.adrLow, c.adrHigh] = [c.adrHigh, c.adrLow];
    }

    const occupancyLowPct = Math.min(100, Math.max(0, num(stored.occupancyLowPct, DEFAULT_RETURNS.occupancyLowPct)));
    let occupancyHighPct = Math.min(100, Math.max(0, num(stored.occupancyHighPct, DEFAULT_RETURNS.occupancyHighPct)));
    if (occupancyLowPct > occupancyHighPct) {
      occupancyHighPct = occupancyLowPct;
    }

    return {
      referenceSqFt: Math.max(1, num(stored.referenceSqFt, DEFAULT_RETURNS.referenceSqFt)),
      occupancyLowPct,
      occupancyHighPct,
      operatingCostPct: Math.min(100, Math.max(0, num(stored.operatingCostPct, DEFAULT_RETURNS.operatingCostPct))),
      categories
    };
  }

  getRevenueSettings() {
    return this.readRevenue();
  }

  async updateRevenueSettings(patch: Partial<RevenueSettings>) {
    const current = await this.readRevenue();
    const next: RevenueSettings = {
      taxRate: num(patch.taxRate, current.taxRate),
      serviceChargeRate: num(patch.serviceChargeRate, current.serviceChargeRate),
      maintenanceReserveRate: num(patch.maintenanceReserveRate, current.maintenanceReserveRate)
    };
    await this.persistRaw(REVENUE_KEY, next);
    return next;
  }

  async getReturnAssumptions() {
    return this.normalizeReturnAssumptions(await this.readRaw(RETURNS_KEY));
  }

  async updateReturnAssumptions(patch: Partial<ReturnAssumptions> & Record<string, any>) {
    const current = await this.getReturnAssumptions();
    const merged = this.normalizeReturnAssumptions({
      ...current,
      ...patch,
      categories: {
        ...current.categories,
        ...(patch.categories || {})
      }
    });
    await this.persistRaw(RETURNS_KEY, merged);
    return merged;
  }
}
