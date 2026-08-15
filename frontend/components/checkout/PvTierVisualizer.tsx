'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/format';

export type PaymentTierInfo = {
  id: string;
  label: string;
  dueTodayPct: number;
  discountPct: number;
  description: string;
  badge?: string;
};

/** Fallback display metadata — discount values here are ONLY used if the backend policy is unavailable. */
const TIER_DISPLAY: Record<string, { description: string; badge?: string }> = {
  fast_track: { description: 'Max discount by shortening schedule to 12 months (Early Payoff).', badge: 'Fast Track' },
  standard: { description: '10% deposit today + downpayment in 3 months + monthly installments.' },
  booking_plus_down: { description: 'Merged deposit & downpayment today. First installment at Month 4.', badge: 'Popular' },
  advance_40: { description: 'Pay 40% upfront. Balance split across remaining monthly installments.' },
  half: { description: 'Pay 50% upfront. Balance split across remaining monthly installments.', badge: 'Best Value' },
  advance_60: { description: 'Pay 60% upfront. Balance split across remaining monthly installments.' },
  advance_70: { description: 'Pay 70% upfront. Balance split across remaining monthly installments.' },
  advance_80: { description: 'Pay 80% upfront. Balance split across remaining monthly installments.' },
  max_advance: { description: 'Maximum advance payment (90%) while retaining standard installments.', badge: 'Max Advance' },
  full: { description: 'Pay 100% today for maximum actuarial present-value discount.', badge: 'Max Discount' },
};

/** Build tier display info from resolved backend policy data. */
export function buildTiersFromPolicy(resolved: any[]): PaymentTierInfo[] {
  if (!resolved?.length) return [];
  return resolved.map((t: any) => ({
    id: t.id,
    label: t.label || t.id,
    dueTodayPct: Number(t.upfrontPct) || 10,
    discountPct: Number(t.offeredDiscountPct) || 0,
    description: TIER_DISPLAY[t.id]?.description || `Pay ${t.upfrontPct}% upfront.`,
    badge: TIER_DISPLAY[t.id]?.badge,
  }));
}

type ScheduleItem = {
  type: string;
  dueDate: string;
  amount: number;
  status: string;
};

type QuoteData = {
  listPrice: number;
  promoDiscountPct?: number;
  promoName?: string;
  afterPromo?: number;
  advanceDiscountPct?: number;
  amountTotal: number;
  tierId: string;
  quoteToken?: string;
  expiresAt?: string;
  schedule?: ScheduleItem[];
};

type Props = {
  listPrice: number;
  selectedTierId: string;
  onSelectTier: (tierId: string) => void;
  quoteData?: QuoteData | null;
  loadingQuote?: boolean;
  onRefreshQuote?: () => void;
  /** Resolved tiers from GET /api/payment-plans/policy — uses admin-configured discount rate. */
  resolvedTiers?: PaymentTierInfo[];
  /** Admin-configured discount rate (for display). */
  discountRateAnnualPct?: number;
};

export default function PvTierVisualizer({
  listPrice,
  selectedTierId,
  onSelectTier,
  quoteData,
  loadingQuote,
  onRefreshQuote,
  resolvedTiers,
  discountRateAnnualPct,
}: Props) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const tiers: PaymentTierInfo[] = resolvedTiers?.length
    ? resolvedTiers
    : []; // No fallback — tiers must come from the backend policy

  // Quote lock countdown timer
  useEffect(() => {
    if (!quoteData?.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.floor((new Date(quoteData.expiresAt!).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [quoteData?.expiresAt]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentTier = tiers.find((t) => t.id === selectedTierId) || tiers[0];
  const discountPct = quoteData?.advanceDiscountPct ?? currentTier?.discountPct ?? 0;
  const netPrice = quoteData?.amountTotal ?? Math.round(listPrice * (1 - discountPct / 100));
  const savings = Math.max(0, listPrice - netPrice);

  if (!tiers.length) {
    return (
      <div className="rounded-lg border border-ocean/10 bg-pearl p-6 text-center text-sm text-ocean/60">
        Loading payment tiers from admin policy...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discount Rate Banner */}
      {discountRateAnnualPct != null && (
        <div className="text-[11px] text-ocean/50 text-right">
          Discount rate: <span className="font-semibold text-ocean/70">{discountRateAnnualPct}% p.a.</span> (admin-configured)
        </div>
      )}

      {/* Quote Lock Countdown Header */}
      {quoteData?.quoteToken && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold/10 p-3.5 text-ocean">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-gold"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-ocean/80">
              Signed Present-Value Price Guarantee
            </span>
          </div>

          <div className="flex items-center gap-3">
            {timeLeft !== null && (
              <span className="font-mono text-sm font-bold text-ocean">
                {timeLeft > 0 ? (
                  <>
                    Price locked for: <span className="text-gold">{formatTimer(timeLeft)}</span>
                  </>
                ) : (
                  <span className="text-red-600">Quote Expired</span>
                )}
              </span>
            )}
            {onRefreshQuote && (
              <button
                type="button"
                onClick={onRefreshQuote}
                disabled={loadingQuote}
                className="text-xs font-semibold text-ocean underline hover:text-gold"
              >
                {loadingQuote ? 'Refreshing...' : 'Refresh Quote'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment Tiers Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {tiers.map((tier) => {
          const isSelected = selectedTierId === tier.id;
          const tierNetPrice = Math.round(listPrice * (1 - tier.discountPct / 100));
          const tierSavings = listPrice - tierNetPrice;
          const dueTodayAmount = Math.round(tierNetPrice * (tier.dueTodayPct / 100));

          return (
            <div
              key={tier.id}
              onClick={() => onSelectTier(tier.id)}
              className={`relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-gold bg-ocean text-white shadow-lg ring-2 ring-gold/50'
                  : 'border-ocean/15 bg-white text-ocean hover:border-gold/50 hover:bg-pearl/50'
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? 'bg-gold text-ocean' : 'bg-gold/20 text-ocean'
                  }`}
                >
                  {tier.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className={`font-semibold text-base ${isSelected ? 'text-gold' : 'text-ocean'}`}>
                    {tier.label}
                  </h4>
                  <p className={`mt-0.5 text-xs ${isSelected ? 'text-white/80' : 'text-ocean/70'}`}>
                    {tier.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${isSelected ? 'text-white/70' : 'text-ocean/60'}`}>
                    Due Today ({tier.dueTodayPct}%)
                  </div>
                  <div className={`font-display text-lg font-bold ${isSelected ? 'text-white' : 'text-ocean'}`}>
                    {formatMoney(dueTodayAmount)}
                  </div>
                </div>
              </div>

              <div className={`mt-3 flex items-center justify-between border-t pt-2 text-xs ${
                isSelected ? 'border-white/15' : 'border-ocean/10'
              }`}>
                <div>
                  Net Total: <span className="font-semibold">{formatMoney(tierNetPrice)}</span>
                </div>
                {tier.discountPct > 0 ? (
                  <div className={`font-semibold ${isSelected ? 'text-gold' : 'text-emerald-700'}`}>
                    Save {formatMoney(tierSavings)} ({Number(tier.discountPct.toFixed(2))}%)
                  </div>
                ) : (
                  <div className={`${isSelected ? 'text-white/60' : 'text-ocean/50'}`}>No discount</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Tier Financial Summary Card */}
      <div className="rounded-xl border border-ocean/10 bg-pearl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean/10 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ocean/50">Selected Plan Summary</span>
            <h3 className="font-display text-xl text-ocean">{currentTier?.label}</h3>
          </div>
          <div className="text-right">
            <span className="text-xs text-ocean/60">Final Net Price</span>
            <div className="font-display text-2xl font-bold text-ocean">{formatMoney(netPrice)}</div>
            {savings > 0 && (
              <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                You Save {formatMoney(savings)} with PV Discount
              </span>
            )}
          </div>
        </div>

        {/* Schedule Preview Toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-ocean/70">
            {quoteData?.schedule?.length ? `${quoteData.schedule.length} payment installments scheduled` : 'Installment breakdown available'}
          </span>
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="text-xs font-semibold text-gold hover:underline"
          >
            {showSchedule ? 'Hide Payment Calendar ▲' : 'View Payment Calendar ▼'}
          </button>
        </div>

        {/* Expandable Installments Table */}
        {showSchedule && quoteData?.schedule && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-ocean/10 bg-white p-3 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ocean/10 text-ocean/60">
                  <th className="pb-2 font-semibold">Installment</th>
                  <th className="pb-2 font-semibold">Due Date</th>
                  <th className="pb-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean/5">
                {quoteData.schedule.map((item, idx) => (
                  <tr key={idx} className="hover:bg-pearl/50">
                    <td className="py-2 capitalize font-medium text-ocean">{item.type.replace('_', ' ')}</td>
                    <td className="py-2 text-ocean/70">
                      {new Date(item.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2 text-right font-semibold text-ocean">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
