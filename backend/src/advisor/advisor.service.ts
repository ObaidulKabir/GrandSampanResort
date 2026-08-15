import { Injectable } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';
import { PaymentPlansService } from '../payment-plans/payment-plans.service';
import { ReferralService } from '../referral/referral.service';
import { SettingsService } from '../settings/settings.service';
import { SuitesService } from '../suites/suites.service';
import { TimesharesService } from '../timeshares/timeshares.service';
import { annualReturnRange } from './returns';
import {
  AdvisorInput,
  Reason,
  ScoredOption,
  explain,
  explainSentences,
  projectReferralInflows,
  simulateCash
} from './score';

@Injectable()
export class AdvisorService {
  private booking = new BookingService();
  private paymentPlans = new PaymentPlansService();
  private referral = new ReferralService();
  private settings = new SettingsService();
  private timeshares = new TimesharesService();
  private suites = new SuitesService();

  async suggest(raw: AdvisorInput, referrerId?: string | null) {
    const availableNow = Math.max(0, Math.round(Number(raw.availableNow) || 0));
    const monthlyCapacity = Math.max(0, Math.round(Number(raw.monthlyCapacity) || 0));
    const horizonMonths = Math.max(1, Math.min(60, Math.round(Number(raw.horizonMonths) || 36)));
    const policy = await this.paymentPlans.getPolicy();
    const refPolicy = await this.referral.getPolicy();
    const ratePct = await this.referral.effectiveIncentivePct(referrerId);
    const assumptions = await this.settings.getReturnAssumptions();
    const plans = await this.timeshares.list();
    const unsold = plans.filter((p) => String((p as any).planStatus || 'Unsold').toLowerCase() === 'unsold');
    const cadences: Array<'monthly' | 'quarterly'> = ['monthly'];
    const start = new Date();
    const startIso = start.toISOString();
    const scored: ScoredOption[] = [];

    for (const plan of unsold) {
      const suite = plan.suiteId ? await this.suites.get(plan.suiteId) : null;
      const returns = annualReturnRange(plan.daysPerMonth, assumptions, {
        type: (suite as any)?.type,
        size: (suite as any)?.size
      });
      const annualMid = returns ? Math.round((returns.low + returns.high) / 2) : 0;
      const resolved = this.paymentPlans.resolveTiers(policy, {
        installmentMonths: this.paymentPlans.pickTenor(policy),
        cadence: 'monthly'
      });

      for (const tenor of policy.tenors) {
        for (const cadence of cadences) {
          for (const tier of resolved) {
            const quoted = await this.booking.quote({
              planId: plan.id,
              paymentTierId: tier.id,
              installmentMonths: tenor,
              cadence,
              start: startIso
            });
            if (!quoted.ok) continue;
            const q = quoted.quote;
            const referralIn = projectReferralInflows({
              target: raw.referralTarget,
              ratePct,
              tranche1Pct: refPolicy.tranche1Pct,
              tranche2Pct: refPolicy.tranche2Pct,
              planPrice: q.netPrice,
              horizonMonths
            });
            const withRef = simulateCash({
              availableNow,
              monthlyCapacity,
              horizonMonths,
              schedule: q.schedule,
              start,
              referralIn
            });
            const withoutRef = simulateCash({
              availableNow,
              monthlyCapacity,
              horizonMonths,
              schedule: q.schedule,
              start,
              referralIn: referralIn.map(() => 0)
            });
            const pvCost = Math.max(1, q.presentValue || q.netPrice);
            const yieldPct = (annualMid / pvCost) * 100;
            const reasons: Reason[] = [];
            if (q.savings > 0) {
              reasons.push({ code: 'SAVES_VS_STANDARD', amountBdt: q.savings, tierId: tier.id });
            }
            if (tier.upfrontPct >= 100) reasons.push({ code: 'FULL_PAYMENT', tierId: tier.id });
            else if (tier.upfrontPct >= 50) reasons.push({ code: 'HALF_ADVANCE', tierId: tier.id });
            else if (tier.mergedDownpayment) reasons.push({ code: 'MERGED_DOWNPAYMENT', tierId: tier.id });
            if (tenor > Math.min(...policy.tenors)) reasons.push({ code: 'LONGER_TENOR' });
            if (annualMid > 0) reasons.push({ code: 'HIGHER_YIELD', amountBdt: annualMid });
            if (withRef.referralCovers > 0) {
              reasons.push({
                code: 'REFERRAL_COVERS_INSTALLMENTS',
                amountBdt: withRef.referralCovers,
                fromMonth: 1
              });
            }
            if (!withoutRef.neverNegative && withRef.neverNegative) {
              reasons.push({ code: 'INFEASIBLE_WITHOUT_REFERRAL' });
            }
            if (!withRef.neverNegative) reasons.push({ code: 'INFEASIBLE' });

            scored.push({
              planId: plan.id,
              planName: plan.name,
              suiteId: plan.suiteId || null,
              paymentTierId: q.paymentTierId,
              tierLabel: q.tierLabel,
              installmentMonths: q.installmentMonths,
              cadence: q.cadence === 'quarterly' ? 'quarterly' : 'monthly',
              netPrice: q.netPrice,
              listPrice: q.listPrice,
              savings: q.savings,
              depositAmount: q.depositAmount,
              annualReturnMid: annualMid,
              yieldPct: Math.round(yieldPct * 100) / 100,
              presentValue: q.presentValue,
              feasibleWithoutReferral: withoutRef.neverNegative,
              feasibleIfTargetHit: withRef.neverNegative,
              referralCovers: withRef.referralCovers,
              reasons,
              cashflow: withRef.points.filter((_, i) => i === 0 || i % 3 === 0 || i === withRef.points.length - 1)
            });
          }
        }
      }
    }

    const feasible = scored.filter((s) => s.feasibleIfTargetHit);
    const pool = feasible.length ? feasible : scored;
    pool.sort((a, b) => {
      if (a.feasibleWithoutReferral !== b.feasibleWithoutReferral) {
        return a.feasibleWithoutReferral ? -1 : 1;
      }
      return b.yieldPct - a.yieldPct;
    });
    const top = pool.slice(0, 8).map((s) => ({
      ...s,
      summary: explain(s.reasons),
      points: explainSentences(s.reasons)
    }));
    return {
      ok: true as const,
      input: { availableNow, monthlyCapacity, horizonMonths, referralTarget: raw.referralTarget || null },
      assumptions: {
        discountRateAnnualPct: policy.discountRateAnnualPct,
        compoundingPerYear: policy.compoundingPerYear,
        referralRatePct: ratePct,
        occupancyLowPct: assumptions.occupancyLowPct,
        occupancyHighPct: assumptions.occupancyHighPct
      },
      generatedAt: new Date().toISOString(),
      suggestions: top,
      considered: scored.length
    };
  }
}
