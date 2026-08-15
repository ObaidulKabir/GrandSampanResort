import { PaymentScheduleItem } from '../domain/models';
import { ScheduleCadence } from './pv';

export type GenerateScheduleOpts = {
  upfrontPct: number;
  downpaymentPct: number;
  downpaymentAfterMonths: number;
  installmentMonths: number;
  cadence: ScheduleCadence;
};

/**
 * Integer-taka schedule. Calendar:
 *   deposit at anchor
 *   downpayment at +downpaymentAfterMonths (omitted when absorbed into deposit)
 *   installments at downpaymentAfterMonths + i×step (first at month 4 today)
 */
export function generatePaymentSchedule(
  total: number,
  anchor: Date,
  opts: GenerateScheduleOpts,
): PaymentScheduleItem[] {
  const totalInt = Math.max(0, Math.round(Number(total) || 0));
  const upfrontPct = clampPct(opts.upfrontPct);
  const downPct = clampPct(opts.downpaymentPct);
  const after = Math.max(0, Math.round(Number(opts.downpaymentAfterMonths) || 0));
  const months = Math.max(1, Math.round(Number(opts.installmentMonths) || 24));
  const cadence: ScheduleCadence = opts.cadence === 'quarterly' ? 'quarterly' : 'monthly';
  const stepMonths = cadence === 'monthly' ? 1 : 3;
  const installments = cadence === 'monthly' ? months : Math.ceil(months / 3);
  const merged = upfrontPct >= downPct;
  const items: PaymentScheduleItem[] = [];

  if (upfrontPct >= 100) {
    items.push(row('deposit', new Date(anchor), totalInt));
    return items;
  }

  const deposit = Math.round(totalInt * (upfrontPct / 100));
  items.push(row('deposit', new Date(anchor), deposit));

  let remainder = Math.max(0, totalInt - deposit);
  if (!merged && downPct > 0) {
    const down = Math.min(remainder, Math.round(totalInt * (downPct / 100)));
    const downDate = addMonths(anchor, after);
    items.push(row('downpayment', downDate, down));
    remainder -= down;
  }

  if (remainder > 0 && installments > 0) {
    const baseAmount = Math.floor(remainder / installments);
    let sum = 0;
    for (let i = 1; i <= installments; i++) {
      const due = addMonths(anchor, after + i * stepMonths);
      const amt = i === installments ? remainder - sum : baseAmount;
      sum += amt;
      items.push(row('installment', due, amt));
    }
  }

  return items;
}

export function monthsFromAnchor(anchor: Date, due: Date): number {
  const a = new Date(anchor);
  const d = new Date(due);
  return (d.getFullYear() - a.getFullYear()) * 12 + (d.getMonth() - a.getMonth());
}

function row(type: PaymentScheduleItem['type'], due: Date, amount: number): PaymentScheduleItem {
  return {
    id: 'PS-' + Math.random().toString(36).slice(2, 8),
    bookingId: 'tmp',
    type,
    dueDate: due.toISOString(),
    amount,
    status: 'due',
    currency: 'BDT',
  };
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
