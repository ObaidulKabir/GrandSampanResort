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

function taka(n: number) {
  const v = Math.round(n);
  const body = `Tk${Math.abs(v).toLocaleString('en-IN')}/-`;
  return v < 0 ? `-${body}` : body;
}

/** One plain sentence per reason — for buyers, not a finance memo. */
export function explainSentences(reasons: Reason[]): string[] {
  return reasons
    .map((r) => {
      switch (r.code) {
        case 'SAVES_VS_STANDARD':
          return `You save about ${taka(r.amountBdt || 0)} compared with paying 10% today and the rest in installments.`;
        case 'HIGHER_YIELD':
          return r.amountBdt
            ? `This share is projected to earn about ${taka(r.amountBdt)} a year in rent. Occupancy and room rates can change.`
            : 'This option is stronger for rental income versus what you pay.';
        case 'FULL_PAYMENT':
          return 'You pay everything today. No more bills after that.';
        case 'HALF_ADVANCE':
          return 'You pay half today. The rest is split into later payments.';
        case 'MERGED_DOWNPAYMENT':
          return 'You pay the booking amount and the usual 3-month downpayment together today, so you skip that later lump sum.';
        case 'LONGER_TENOR':
          return 'You finish paying over 36 months, so each monthly bill is smaller.';
        case 'REFERRAL_COVERS_INSTALLMENTS':
          return `If you hit the referral target you entered, that income could cover about ${taka(r.amountBdt || 0)} of later bills.`;
        case 'INFEASIBLE_WITHOUT_REFERRAL':
          return 'This only works if you actually earn that referral income. What you can pay from salary alone is not enough.';
        case 'INFEASIBLE':
          return 'This asks for more cash than you said you can pay.';
        default:
          return '';
      }
    })
    .filter(Boolean);
}

export function explain(reasons: Reason[]): string {
  return explainSentences(reasons).join(' ');
}
