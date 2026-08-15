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
};

const POLICY_KEY = 'payment-plan-policy';

export const DEFAULT_PAYMENT_PLAN_POLICY: PaymentPlanPolicy = {
  enabled: true,
  discountRateAnnualPct: 8,
  compoundingPerYear: 2,
  downpaymentPct: 20,
  downpaymentAfterMonths: 3,
  tenors: [24, 36],
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
      id: 'half',
      label: 'Half advance',
      upfrontPct: 50,
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
      maxDiscountPct: 12
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
    opts?: { installmentMonths?: number; cadence?: ScheduleCadence }
  ): ResolvedTier[] {
    const cadence: ScheduleCadence = opts?.cadence === 'quarterly' ? 'quarterly' : 'monthly';
    const tenor = this.pickTenor(policy, opts?.installmentMonths);
    const v = monthlyDiscountFactor(policy.discountRateAnnualPct, policy.compoundingPerYear);
    const baselineMonths = policy.tenorPricing === 'pv' ? Math.min(...policy.tenors) : tenor;
    const standardTier = this.standardTier(policy);
    const standardOpts: NominalScheduleOpts = {
      upfrontPct: standardTier.upfrontPct,
      downpaymentPct: policy.downpaymentPct,
      downpaymentAfterMonths: policy.downpaymentAfterMonths,
      installmentMonths: baselineMonths,
      cadence
    };
    const standardPv = presentValue(nominalCashflows(standardOpts), v);

    return policy.tiers.map((tier) => {
      const sameTenorOpts: NominalScheduleOpts = {
        upfrontPct: tier.upfrontPct,
        downpaymentPct: policy.downpaymentPct,
        downpaymentAfterMonths: policy.downpaymentAfterMonths,
        installmentMonths: tenor,
        cadence
      };
      const compareOpts: NominalScheduleOpts =
        policy.tenorPricing === 'pv'
          ? sameTenorOpts
          : {
              ...sameTenorOpts,
              installmentMonths: tenor
            };
      // Neutral: compare against same tenor's standard (no-advance) schedule.
      const baselineForTier =
        policy.tenorPricing === 'pv'
          ? standardPv
          : presentValue(
              nominalCashflows({
                ...standardOpts,
                installmentMonths: tenor
              }),
              v
            );
      const tierPv = presentValue(nominalCashflows(compareOpts), v);
      const fair = Math.max(0, fairDiscountPct(tierPv, baselineForTier) * 100);
      const isStandard = tier.id === standardTier.id || tier.upfrontPct <= standardTier.upfrontPct;
      if (isStandard && (tier.discountPct === 0 || tier.discountPct == null)) {
        return {
          ...tier,
          fairDiscountPct: round4(fair),
          offeredDiscountPct: 0,
          source: 'standard' as const,
          mergedDownpayment: tier.upfrontPct >= policy.downpaymentPct && tier.upfrontPct < 100
        };
      }
      const offered = offeredDiscountPct({
        fairPct: fair,
        passThroughPct: tier.passThroughPct,
        maxDiscountPct: tier.maxDiscountPct,
        overridePct: tier.discountPct
      });
      return {
        ...tier,
        fairDiscountPct: round4(fair),
        offeredDiscountPct: round4(offered.offeredPct),
        source: offered.source,
        mergedDownpayment: tier.upfrontPct >= policy.downpaymentPct && tier.upfrontPct < 100
      };
    });
  }

  pickTier(policy: PaymentPlanPolicy, tierId?: string | null): PaymentTier {
    const id = String(tierId || '').trim();
    return policy.tiers.find((t) => t.id === id) || this.standardTier(policy);
  }

  pickTenor(policy: PaymentPlanPolicy, months?: number | null): number {
    const allowed = policy.tenors.length ? policy.tenors : [24];
    const n = Number(months);
    if (Number.isFinite(n) && allowed.includes(n)) return n;
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
    const tenors = Array.isArray(s.tenors)
      ? [...new Set(s.tenors.map((n: unknown) => Math.round(num(n, 0))).filter((n: number) => n >= 1 && n <= 120))]
      : [...d.tenors];
    if (!tenors.length) tenors.push(24);
    tenors.sort((a, b) => a - b);

    const tiersIn = Array.isArray(s.tiers) && s.tiers.length ? s.tiers : d.tiers;
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
        maxDiscountPct: clampPct(num(t?.maxDiscountPct, 12))
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
