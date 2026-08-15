export type ReasonCode =
  | 'SAVES_VS_STANDARD'
  | 'HIGHER_YIELD'
  | 'FULL_PAYMENT'
  | 'HALF_ADVANCE'
  | 'MERGED_DOWNPAYMENT'
  | 'LONGER_TENOR'
  | 'REFERRAL_COVERS_INSTALLMENTS'
  | 'INFEASIBLE_WITHOUT_REFERRAL'
  | 'INFEASIBLE';

export type Reason = {
  code: ReasonCode;
  amountBdt?: number;
  fromMonth?: number;
  yieldPct?: number;
  tierId?: string;
};

export type AdvisorInput = {
  availableNow: number;
  monthlyCapacity: number;
  horizonMonths: number;
  referralTarget?: {
    mode: 'volume' | 'count';
    value: number;
    overMonths: number;
  } | null;
};

export type CashPoint = { month: number; outflow: number; referralIn: number; cash: number };

export type ScoredOption = {
  planId: string;
  planName: string;
  suiteId: string | null;
  paymentTierId: string;
  tierLabel: string;
  installmentMonths: number;
  cadence: 'monthly' | 'quarterly';
  netPrice: number;
  listPrice: number;
  savings: number;
  depositAmount: number;
  annualReturnMid: number;
  yieldPct: number;
  presentValue: number;
  feasibleWithoutReferral: boolean;
  feasibleIfTargetHit: boolean;
  referralCovers: number;
  reasons: Reason[];
  cashflow: CashPoint[];
};

function monthOfIso(anchor: Date, due: string) {
  const d = new Date(due);
  return (d.getFullYear() - anchor.getFullYear()) * 12 + (d.getMonth() - anchor.getMonth());
}

export function projectReferralInflows(opts: {
  target: AdvisorInput['referralTarget'];
  ratePct: number;
  tranche1Pct: number;
  tranche2Pct: number;
  planPrice: number;
  horizonMonths: number;
}): number[] {
  const horizon = Math.max(1, opts.horizonMonths);
  const inflow = Array(horizon + 1).fill(0);
  const t = opts.target;
  if (!t || !Number.isFinite(Number(t.value)) || Number(t.value) <= 0) return inflow;
  const over = Math.max(1, Math.round(Number(t.overMonths) || horizon));
  const saleEach =
    t.mode === 'count' ? Math.max(0, opts.planPrice) : Math.max(0, Number(t.value) || 0) / over;
  const countEach = t.mode === 'count' ? Math.max(0, Number(t.value) || 0) / over : 1;
  const incentiveEach = Math.round((saleEach * countEach * opts.ratePct) / 100);
  const t1 = Math.round((incentiveEach * opts.tranche1Pct) / 100);
  const t2 = Math.max(0, incentiveEach - t1);
  for (let m = 1; m <= Math.min(over, horizon); m++) {
    inflow[m] += t1;
    const m2 = m + 3;
    if (m2 <= horizon) inflow[m2] += t2;
  }
  return inflow;
}

export function simulateCash(opts: {
  availableNow: number;
  monthlyCapacity: number;
  horizonMonths: number;
  schedule: { dueDate: string; amount: number }[];
  start: Date;
  referralIn: number[];
}): { points: CashPoint[]; neverNegative: boolean; referralCovers: number } {
  const horizon = Math.max(1, opts.horizonMonths);
  const byMonth: Record<number, number> = {};
  for (const item of opts.schedule) {
    const m = Math.max(0, monthOfIso(opts.start, item.dueDate));
    byMonth[m] = (byMonth[m] || 0) + (Number(item.amount) || 0);
  }
  let cash = Math.max(0, opts.availableNow);
  let neverNegative = true;
  let referralCovers = 0;
  const points: CashPoint[] = [];
  for (let m = 0; m <= horizon; m++) {
    const salary = m === 0 ? 0 : Math.max(0, opts.monthlyCapacity);
    const referralIn = opts.referralIn[m] || 0;
    const outflow = byMonth[m] || 0;
    cash += salary + referralIn - outflow;
    if (cash < -1) neverNegative = false;
    referralCovers += Math.min(outflow, referralIn);
    points.push({ month: m, outflow, referralIn, cash: Math.round(cash) });
  }
  return { points, neverNegative, referralCovers };
}

export function explain(reasons: Reason[]): string {
  return reasons
    .map((r) => {
      switch (r.code) {
        case 'SAVES_VS_STANDARD':
          return `Saves ৳${(r.amountBdt || 0).toLocaleString()} versus the standard installment route.`;
        case 'HIGHER_YIELD':
          return `Expected yield about ${(r.yieldPct || 0).toFixed(1)}% a year on present-value cost.`;
        case 'FULL_PAYMENT':
          return 'Pays in full at booking — no remaining installments.';
        case 'HALF_ADVANCE':
          return 'Pays half now and the rest on the installment calendar.';
        case 'MERGED_DOWNPAYMENT':
          return 'Booking and downpayment are paid together.';
        case 'LONGER_TENOR':
          return 'Spreads the remainder over 36 months for a smaller monthly amount.';
        case 'REFERRAL_COVERS_INSTALLMENTS':
          return `Your referral target covers about ৳${(r.amountBdt || 0).toLocaleString()} of later payments.`;
        case 'INFEASIBLE_WITHOUT_REFERRAL':
          return 'This only fits if you hit the referral target you entered.';
        case 'INFEASIBLE':
          return 'Does not fit the cash and monthly capacity you entered.';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}
