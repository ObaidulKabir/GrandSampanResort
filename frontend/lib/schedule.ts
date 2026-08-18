/** Integer-taka payment calendar. Mirrors backend generatePaymentSchedule. */

/** List price after a live promotional offer; otherwise the published list price. */
export function planOfferPrice(plan?: { price?: number; discountedPrice?: number | null } | null) {
  const list = Math.max(0, Math.round(Number(plan?.price) || 0));
  const discounted = plan?.discountedPrice;
  if (typeof discounted === 'number' && Number.isFinite(discounted)) {
    return Math.max(0, Math.round(discounted));
  }
  return list;
}

export type ScheduleCadence = 'monthly' | 'quarterly';

/** Buyer-selectable installment lengths on the checkout payment calendar. */
export const CUSTOM_INSTALLMENT_MONTHS = [24, 30, 36] as const;

export type ScheduleLine = {
  type: 'deposit' | 'downpayment' | 'installment';
  dueDate: string;
  amount: number;
};

export type GenerateScheduleOpts = {
  upfrontPct: number;
  downpaymentPct: number;
  downpaymentAfterMonths: number;
  installmentMonths: number;
  cadence: ScheduleCadence;
};

export function generatePaymentSchedule(
  total: number,
  anchor: Date,
  opts: GenerateScheduleOpts
): ScheduleLine[] {
  const totalInt = Math.max(0, Math.round(Number(total) || 0));
  const upfrontPct = clampPct(opts.upfrontPct);
  const downPct = clampPct(opts.downpaymentPct);
  const after = Math.max(0, Math.round(Number(opts.downpaymentAfterMonths) || 0));
  const months = Math.max(1, Math.round(Number(opts.installmentMonths) || 24));
  const cadence: ScheduleCadence = opts.cadence === 'quarterly' ? 'quarterly' : 'monthly';
  const stepMonths = cadence === 'monthly' ? 1 : 3;
  const installments = cadence === 'monthly' ? months : Math.ceil(months / 3);
  const merged = upfrontPct >= downPct;
  const items: ScheduleLine[] = [];

  if (upfrontPct >= 100) {
    items.push(row('deposit', new Date(anchor), totalInt));
    return items;
  }

  const deposit = Math.round(totalInt * (upfrontPct / 100));
  items.push(row('deposit', new Date(anchor), deposit));

  let remainder = Math.max(0, totalInt - deposit);
  if (!merged && downPct > 0) {
    const down = Math.min(remainder, Math.round(totalInt * (downPct / 100)));
    items.push(row('downpayment', addMonths(anchor, after), down));
    remainder -= down;
  }

  if (remainder > 0 && installments > 0) {
    const baseAmount = Math.floor(remainder / installments);
    let sum = 0;
    for (let i = 1; i <= installments; i++) {
      const amt = i === installments ? remainder - sum : baseAmount;
      sum += amt;
      items.push(row('installment', addMonths(anchor, after + i * stepMonths), amt));
    }
  }

  return items;
}

export function scheduleTotals(items: Array<{ type: string; amount: number }>) {
  const deposit = items.find((s) => s.type === 'deposit')?.amount ?? 0;
  const downpayment = items.find((s) => s.type === 'downpayment')?.amount ?? 0;
  const installments = items.filter((s) => s.type === 'installment');
  return {
    deposit,
    downpayment,
    installmentCount: installments.length,
    installmentAmount: installments[0]?.amount ?? 0,
    scheduledTotal: items.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  };
}

function row(type: ScheduleLine['type'], due: Date, amount: number): ScheduleLine {
  return { type, dueDate: due.toISOString(), amount };
}

function addMonths(anchor: Date, months: number) {
  const due = new Date(anchor);
  due.setMonth(due.getMonth() + months);
  return due;
}

function clampPct(n: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}
