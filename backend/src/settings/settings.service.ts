import { Injectable } from '@nestjs/common';
import { prisma } from '../../prisma/client';

export type RevenueSettings = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

/**
 * Assumptions behind the "expected return per year" range shown on plan
 * cards. Same variables as the plan-detail return calculator:
 * annual = ADR × days/month × occupancy × (1 − operating cost) × 12.
 */
export type ReturnAssumptions = {
  adrLow: number;
  adrHigh: number;
  occupancyLowPct: number;
  occupancyHighPct: number;
  operatingCostPct: number;
};

const REVENUE_KEY = 'revenue-policy';
const RETURNS_KEY = 'return-assumptions';

const DEFAULT_REVENUE: RevenueSettings = {
  taxRate: 0.1,
  serviceChargeRate: 0.05,
  maintenanceReserveRate: 0.05
};

const DEFAULT_RETURNS: ReturnAssumptions = {
  adrLow: 6000,
  adrHigh: 10000,
  occupancyLowPct: 50,
  occupancyHighPct: 75,
  operatingCostPct: 15
};

@Injectable()
export class SettingsService {
  private memory = new Map<string, Record<string, number>>();

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private async read<T extends Record<string, number>>(key: string, defaults: T): Promise<T> {
    let stored: Record<string, unknown> = {};
    if (this.db) {
      const row = await this.db.appSetting.findUnique({ where: { key } });
      stored = (row?.value as Record<string, unknown>) || {};
    } else {
      stored = this.memory.get(key) || {};
    }
    const out = { ...defaults };
    for (const k of Object.keys(defaults) as (keyof T)[]) {
      const v = Number(stored[k as string]);
      if (Number.isFinite(v)) out[k] = v as T[keyof T];
    }
    return out;
  }

  private async persist<T extends Record<string, number>>(key: string, value: T): Promise<T> {
    if (this.db) {
      await this.db.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    } else {
      this.memory.set(key, value);
    }
    return value;
  }

  private merge<T extends Record<string, number>>(current: T, patch: Partial<T>): T {
    const next = { ...current };
    for (const k of Object.keys(current) as (keyof T)[]) {
      const v = Number((patch as Record<string, unknown>)[k as string]);
      if ((patch as Record<string, unknown>)[k as string] !== undefined && Number.isFinite(v)) {
        next[k] = v as T[keyof T];
      }
    }
    return next;
  }

  getRevenueSettings() {
    return this.read(REVENUE_KEY, DEFAULT_REVENUE);
  }

  async updateRevenueSettings(patch: Partial<RevenueSettings>) {
    const next = this.merge(await this.getRevenueSettings(), patch);
    return this.persist(REVENUE_KEY, next);
  }

  getReturnAssumptions() {
    return this.read(RETURNS_KEY, DEFAULT_RETURNS);
  }

  async updateReturnAssumptions(patch: Partial<ReturnAssumptions>) {
    const next = this.merge(await this.getReturnAssumptions(), patch);
    next.adrLow = Math.max(0, next.adrLow);
    next.adrHigh = Math.max(0, next.adrHigh);
    next.occupancyLowPct = Math.min(100, Math.max(0, next.occupancyLowPct));
    next.occupancyHighPct = Math.min(100, Math.max(0, next.occupancyHighPct));
    next.operatingCostPct = Math.min(100, Math.max(0, next.operatingCostPct));
    // Keep low ≤ high so client-facing ranges always read sensibly.
    if (next.adrLow > next.adrHigh) [next.adrLow, next.adrHigh] = [next.adrHigh, next.adrLow];
    if (next.occupancyLowPct > next.occupancyHighPct) {
      [next.occupancyLowPct, next.occupancyHighPct] = [next.occupancyHighPct, next.occupancyLowPct];
    }
    return this.persist(RETURNS_KEY, next);
  }
}
