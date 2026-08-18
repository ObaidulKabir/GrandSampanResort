import { Injectable } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import {
  NominalScheduleOpts,
  ScheduleCadence,
  fairDiscountPct,
  monthlyDiscountFactor,
  nominalCashflows,
  offeredDiscountPct,
  presentValue
} from './pv';

export type PaymentTier = {
  id: string;
  label: string;
  upfrontPct: number;
  /** If set, forces the tier onto this tenor instead of the picked one. Must be >= MIN_TENOR_MONTHS. */
  installmentMonthsOverride?: number;
  /** null = use PV-fair value. A number is a fixed advertised override. */
  discountPct: number | null;
  passThroughPct: number;
  maxDiscountPct: number;
};

export type PaymentPlanPolicy = {
  enabled: boolean;
  discountRateAnnualPct: number;
  compoundingPerYear: number;
  downpaymentPct: number;
  downpaymentAfterMonths: number;
  tenors: number[];
  tenorPricing: 'neutral' | 'pv';
  quoteTtlMinutes: number;
  tiers: PaymentTier[];
};

export type ResolvedTier = PaymentTier & {
  fairDiscountPct: number;
  offeredDiscountPct: number;
  source: 'override' | 'pv' | 'standard';
  mergedDownpayment: boolean;
  /** Tenor the PV discount was priced on. The billed schedule must use this exact value. */
  installmentMonths: number;
};

const POLICY_KEY = 'payment-plan-policy';

/** Shortest installment calendar the resort sells. Anything below is retired. */
export const MIN_TENOR_MONTHS = 24;

/** Tiers withdrawn from the offering. Stripped out of older saved policies. */
export const RETIRED_TIER_IDS = ['fast_track'];

export const DEFAULT_PAYMENT_PLAN_POLICY: PaymentPlanPolicy = {
  enabled: true,
  discountRateAnnualPct: 8,
  compoundingPerYear: 1, // Matches our discrete annual switch
  downpaymentPct: 20,
  downpaymentAfterMonths: 3,
  tenors: [24, 30, 36],
  tenorPricing: 'neutral',
  quoteTtlMinutes: 30,
  tiers: [
    {
      id: 'standard',
      label: 'Booking only',
      upfrontPct: 10,
      discountPct: 0,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'booking_plus_down',
      label: 'Booking + downpayment',
      upfrontPct: 30,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'advance_40',
      label: '40% Advance',
      upfrontPct: 40,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'half',
      label: 'Half advance',
      upfrontPct: 50,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'advance_60',
      label: '60% Advance',
      upfrontPct: 60,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'advance_70',
      label: '70% Advance',
      upfrontPct: 70,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'advance_80',
      label: '80% Advance',
      upfrontPct: 80,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'max_advance',
      label: 'Max Advance',
      upfrontPct: 90,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 12
    },
    {
      id: 'full',
      label: 'Full payment',
      upfrontPct: 100,
      discountPct: null,
      passThroughPct: 100,
      maxDiscountPct: 15
    }
  ]
};

function num(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, n));
}

/** A tier may pin its own calendar, but never one shorter than we sell. */
function tierTenorOverride(raw: unknown): number | undefined {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < MIN_TENOR_MONTHS || n > 120) return undefined;
  return n;
}

function slug(raw: string, fallback: string) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return s || fallback;
}

@Injectable()
export class PaymentPlansService {
  private memory: PaymentPlanPolicy | null = null;

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  async getPolicy(): Promise<PaymentPlanPolicy> {
    const stored = await this.readRaw();
    return this.normalize(stored);
  }

  async setPolicy(patch: Partial<PaymentPlanPolicy> & { tiers?: Partial<PaymentTier>[] }) {
    const current = await this.getPolicy();
    const next = this.normalize({
      ...current,
      ...patch,
      tiers: patch.tiers != null ? patch.tiers : current.tiers
    });
    await this.persistRaw(next);
    return next;
  }

  resolveTiers(
    policy: PaymentPlanPolicy,
    opts?: {
      installmentMonths?: number;
      cadence?: ScheduleCadence;
      /**
       * False when the buyer built their own calendar: the tier's own tenor is
       * dropped so the discount is priced on the calendar that will be billed.
       */
      honorTierTenorOverride?: boolean;
    }
  ): ResolvedTier[] {
    const cadence: ScheduleCadence = opts?.cadence === 'quarterly' ? 'quarterly' : 'monthly';
    const tenor = this.pickTenor(policy, opts?.installmentMonths);
    const honorOverride = opts?.honorTierTenorOverride !== false;
    const v = monthlyDiscountFactor(policy.discountRateAnnualPct, policy.compoundingPerYear);
    // 'neutral': price every tier against the same tenor, so choosing a longer
    // calendar is neither rewarded nor penalised.
    // 'pv': price against the shortest tenor, so a longer calendar costs the buyer.
    const shortestTenor = policy.tenors.length ? Math.min(...policy.tenors) : tenor;
    const baselineMonths = policy.tenorPricing === 'pv' ? shortestTenor : tenor;
    const standardTier = this.standardTier(policy);
    const standardPv = presentValue(
      nominalCashflows({
        upfrontPct: standardTier.upfrontPct,
        downpaymentPct: policy.downpaymentPct,
        downpaymentAfterMonths: policy.downpaymentAfterMonths,
        installmentMonths: baselineMonths,
        cadence
      }),
      v
    );

    return policy.tiers.map((tier) => {
      const tierTenor = (honorOverride ? tier.installmentMonthsOverride : undefined) ?? tenor;
      const tierOpts: NominalScheduleOpts = {
        upfrontPct: tier.upfrontPct,
        downpaymentPct: policy.downpaymentPct,
        downpaymentAfterMonths: policy.downpaymentAfterMonths,
        installmentMonths: tierTenor,
        cadence
      };
      const tierPv = presentValue(nominalCashflows(tierOpts), v);
      const fair = Math.max(0, fairDiscountPct(tierPv, standardPv) * 100);
      const base = {
        ...tier,
        installmentMonths: tierTenor,
        fairDiscountPct: round4(fair),
        mergedDownpayment: tier.upfrontPct >= policy.downpaymentPct && tier.upfrontPct < 100
      };
      const isStandard =
        tier.id === standardTier.id ||
        (tier.upfrontPct <= standardTier.upfrontPct && tierTenor >= tenor);
      if (isStandard && (tier.discountPct === 0 || tier.discountPct == null)) {
        return { ...base, offeredDiscountPct: 0, source: 'standard' as const };
      }
      const offered = offeredDiscountPct({
        fairPct: fair,
        passThroughPct: tier.passThroughPct,
        maxDiscountPct: tier.maxDiscountPct,
        overridePct: tier.discountPct
      });
      return {
        ...base,
        offeredDiscountPct: round4(offered.offeredPct),
        source: offered.source
      };
    });
  }

  pickTier(policy: PaymentPlanPolicy, tierId?: string | null): PaymentTier {
    const id = String(tierId || '').trim();
    return policy.tiers.find((t) => t.id === id) || this.standardTier(policy);
  }

  pickTenor(policy: PaymentPlanPolicy, months?: number | null): number {
    const allowed = [
      // The admin tenor list is authoritative — a buyer cannot invent a calendar length.
      ...new Set(policy.tenors.length ? policy.tenors : [24])
    ];
    const n = Number(months);
    if (Number.isFinite(n) && allowed.includes(n)) return n;
    // Prefer classic 24-month default even when shorter tenors exist (sorted ascending).
    if (allowed.includes(24)) return 24;
    return allowed[0];
  }

  standardTier(policy: PaymentPlanPolicy): PaymentTier {
    return (
      policy.tiers.find((t) => t.id === 'standard') ||
      policy.tiers.reduce((min, t) => (t.upfrontPct < min.upfrontPct ? t : min), policy.tiers[0]) ||
      DEFAULT_PAYMENT_PLAN_POLICY.tiers[0]
    );
  }

  private async readRaw(): Promise<unknown> {
    if (this.db) {
      const row = await this.db.appSetting.findUnique({ where: { key: POLICY_KEY } });
      return row?.value ?? null;
    }
    return this.memory;
  }

  private async persistRaw(value: PaymentPlanPolicy) {
    if (this.db) {
      await this.db.appSetting.upsert({
        where: { key: POLICY_KEY },
        update: { value: value as any },
        create: { key: POLICY_KEY, value: value as any }
      });
    } else {
      this.memory = value;
    }
  }

  normalize(raw: unknown): PaymentPlanPolicy {
    const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    const d = DEFAULT_PAYMENT_PLAN_POLICY;
    // Retired short calendars are dropped even if an older DB row still lists them.
    const savedTenors = Array.isArray(s.tenors)
      ? [
          ...new Set(
            s.tenors
              .map((n: unknown) => Math.round(num(n, 0)))
              .filter((n: number) => n >= MIN_TENOR_MONTHS && n <= 120)
          )
        ]
      : [];
    const tenors = savedTenors.length ? savedTenors : [...d.tenors];
    // Merge new default tenors that might be missing in older DB rows
    for (const dt of d.tenors) {
      if (!tenors.includes(dt)) tenors.push(dt);
    }
    tenors.sort((a, b) => a - b);

    const savedTiers = Array.isArray(s.tiers)
      ? s.tiers.filter((t: any) => !RETIRED_TIER_IDS.includes(slug(t?.id, '')))
      : [];
    const tiersIn = savedTiers.length ? [...savedTiers] : [...d.tiers];
    // Merge new default tiers that might be missing in older DB rows
    for (const dt of d.tiers) {
      if (!tiersIn.find((t: any) => t.id === dt.id)) {
        tiersIn.push(dt);
      }
    }
    
    tiersIn.sort((a: any, b: any) => (num(a.upfrontPct, 0)) - (num(b.upfrontPct, 0)));

    const used = new Set<string>();
    const tiers: PaymentTier[] = tiersIn.map((t: any, i: number) => {
      let id = slug(t?.id, `tier_${i + 1}`);
      if (used.has(id)) id = `${id}_${i + 1}`;
      used.add(id);
      const overrideRaw = t?.discountPct;
      const override =
        overrideRaw === null || overrideRaw === undefined || overrideRaw === ''
          ? null
          : clampPct(num(overrideRaw, 0));
      return {
        id,
        label: String(t?.label || id).trim().slice(0, 80) || id,
        upfrontPct: clampPct(num(t?.upfrontPct, d.tiers[Math.min(i, d.tiers.length - 1)].upfrontPct)),
        discountPct: override,
        passThroughPct: clampPct(num(t?.passThroughPct, 100)),
        installmentMonthsOverride: tierTenorOverride(t?.installmentMonthsOverride),
        maxDiscountPct: clampPct(num(t?.maxDiscountPct, 15))
      };
    });

    return {
      enabled: s.enabled !== false,
      discountRateAnnualPct: clampPct(num(s.discountRateAnnualPct, d.discountRateAnnualPct)),
      compoundingPerYear: Math.max(1, Math.min(12, Math.round(num(s.compoundingPerYear, d.compoundingPerYear)))),
      downpaymentPct: clampPct(num(s.downpaymentPct, d.downpaymentPct)),
      downpaymentAfterMonths: Math.max(
        0,
        Math.min(24, Math.round(num(s.downpaymentAfterMonths, d.downpaymentAfterMonths)))
      ),
      tenors,
      tenorPricing: s.tenorPricing === 'pv' ? 'pv' : 'neutral',
      quoteTtlMinutes: Math.max(5, Math.min(24 * 60, Math.round(num(s.quoteTtlMinutes, d.quoteTtlMinutes)))),
      tiers
    };
  }
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
