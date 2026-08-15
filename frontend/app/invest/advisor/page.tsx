'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import Badge from '@/components/ui/Badge';
import { tierHeadline } from '@/lib/paymentCopy';
import { badgesFor, monthlyOutlay } from '@/lib/advisorUi';
import { useToast } from '@/components/ui/ToastContext';

export default function InvestAdvisorPage() {
  const { error: toastError } = useToast();
  const [availableNow, setAvailableNow] = useState('');
  const [monthlyCapacity, setMonthlyCapacity] = useState('');
  const [horizonMonths, setHorizonMonths] = useState('36');
  const [useReferral, setUseReferral] = useState(false);
  const [refMode, setRefMode] = useState<'count' | 'volume'>('count');
  const [refValue, setRefValue] = useState('5');
  const [refMonths, setRefMonths] = useState('12');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api('/advisor/suggest', {
        method: 'POST',
        body: JSON.stringify({
          availableNow: Number(availableNow) || 0,
          monthlyCapacity: Number(monthlyCapacity) || 0,
          horizonMonths: Number(horizonMonths) || 36,
          referralTarget: useReferral
            ? {
                mode: refMode,
                value: Number(refValue) || 0,
                overMonths: Number(refMonths) || 12
              }
            : null
        })
      });
      if (!res?.ok) {
        const safeMessage =
          !res?.error || res.error === 'bad_response' || res.error === 'request_failed'
            ? 'We could not match a plan right now. Try again, or browse available suites.'
            : res.error;
        setError(safeMessage);
        toastError(safeMessage);
        setResult(null);
      } else {
        setResult(res);
      }
    } catch {
      const safeMessage = 'We could not match a plan right now. Try again, or browse available suites.';
      setError(safeMessage);
      toastError(safeMessage);
    }
    setLoading(false);
  }

  const suggestions = result?.suggestions || [];
  const badges = badgesFor(suggestions);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
      <div className="max-w-2xl">
        <Badge variant="gold" size="sm" dot>Financial Planning Assistant</Badge>
        <h1 className="font-display mt-2 text-3xl font-bold text-ocean md:text-4xl">
          AI Investment Advisor
        </h1>
        <p className="mt-2 text-sm text-ocean/75 leading-relaxed">
          Input your available capital and monthly liquidity. We’ll match optimal suite share options and present-value discount schedules from real-time resort inventory.
        </p>
      </div>

      <form onSubmit={run} className="mt-8 space-y-6 rounded-2xl border border-ocean/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-ocean">
            Available Upfront Capital (BDT)
            <input
              className="field mt-1.5 text-sm"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 500000"
              value={availableNow}
              onChange={(e) => setAvailableNow(e.target.value)}
              required
            />
            <span className="mt-1 block text-[11px] font-normal text-ocean/55">
              Cash ready to transfer today for reservation &amp; downpayment.
            </span>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wider text-ocean">
            Comfortable Monthly Outlay (BDT)
            <input
              className="field mt-1.5 text-sm"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 35000"
              value={monthlyCapacity}
              onChange={(e) => setMonthlyCapacity(e.target.value)}
              required
            />
            <span className="mt-1 block text-[11px] font-normal text-ocean/55">
              Monthly cashflow capacity for ongoing installments.
            </span>
          </label>
        </div>

        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-ocean mb-2">
            Target Payment Horizon
          </span>
          <div className="grid max-w-sm grid-cols-2 gap-3">
            {['24', '36'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setHorizonMonths(n)}
                className={`rounded-xl border p-3 text-xs font-bold transition-all ${
                  horizonMonths === n
                    ? 'border-gold bg-ocean text-white shadow-md ring-2 ring-gold/40'
                    : 'border-ocean/15 bg-pearl text-ocean/70 hover:border-ocean/30'
                }`}
              >
                {n} Months Tenor
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ocean/10 bg-pearl/40 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded accent-ocean"
              checked={useReferral}
              onChange={(e) => setUseReferral(e.target.checked)}
            />
            <div>
              <span className="text-xs font-bold text-ocean block">
                Factor in Referral / Broker Incentive Inflow
              </span>
              <span className="text-[11px] text-ocean/60 block">
                If you plan to refer colleagues or family, we can simulate commission cash offsetting your installment costs.
              </span>
            </div>
          </label>

          {useReferral && (
            <div className="mt-4 grid gap-4 border-t border-ocean/10 pt-4 sm:grid-cols-3">
              <label className="text-xs text-ocean font-semibold">
                Referral Mode
                <select className="field mt-1 text-xs" value={refMode} onChange={(e) => setRefMode(e.target.value as any)}>
                  <option value="count">Number of referred buyers</option>
                  <option value="volume">Total sales volume (৳)</option>
                </select>
              </label>
              <label className="text-xs text-ocean font-semibold">
                {refMode === 'count' ? 'Referred Sales Count' : 'Sales Volume (৳)'}
                <input className="field mt-1 text-xs" type="number" min={0} value={refValue} onChange={(e) => setRefValue(e.target.value)} />
              </label>
              <label className="text-xs text-ocean font-semibold">
                Over Timeline (Months)
                <input className="field mt-1 text-xs" type="number" min={1} max={36} value={refMonths} onChange={(e) => setRefMonths(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Analyzing Inventory...' : 'Generate Personalized Recommendations →'}
        </Button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-10 space-y-6">
          <div className="flex items-center justify-between border-b border-ocean/10 pb-4">
            <h2 className="font-display text-xl font-bold text-ocean">Recommended Plan Matches</h2>
            <Badge variant="gold" size="sm">{suggestions.length} Optimal Matches</Badge>
          </div>

          <div className="grid gap-6">
            {suggestions.map((s: any, i: number) => (
              <article
                key={`${s.planId}-${s.paymentTierId}-${s.installmentMonths}-${i}`}
                className="relative overflow-hidden rounded-2xl border border-ocean/10 bg-white p-6 shadow-sm transition hover:border-gold/50 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    {badges[i] && (
                      <Badge variant="gold" size="sm" dot>{badges[i]}</Badge>
                    )}
                    <h3 className="font-display mt-2 text-2xl font-bold text-ocean">{s.planName}</h3>
                    <p className="mt-1 text-xs text-ocean/70">
                      {tierHeadline({ id: s.paymentTierId, label: s.tierLabel })}
                      {s.paymentTierId !== 'full'
                        ? ` · ${s.installmentMonths} Months Amortization (${s.cadence === 'quarterly' ? 'Quarterly' : 'Monthly'})`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider text-ocean/55 block">Net Committed Price</span>
                    <span className="font-display text-2xl font-bold text-ocean block">{formatMoney(s.netPrice)}</span>
                    {s.savings > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 block">
                        PV Discount: Save {formatMoney(s.savings)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-pearl px-3 py-1 font-semibold text-ocean">
                    Due Today: {formatMoney(s.depositAmount)}
                  </span>
                  {s.paymentTierId !== 'full' && (
                    <span className="rounded-lg bg-pearl px-3 py-1 font-semibold text-ocean">
                      Then ~{formatMoney(Math.round(monthlyOutlay(s)))} {s.cadence === 'quarterly' ? '/ quarter' : '/ month'}
                    </span>
                  )}
                  {s.feasibleWithoutReferral ? (
                    <Badge variant="success" size="sm">✓ Fully Fits Monthly Budget</Badge>
                  ) : s.feasibleIfTargetHit ? (
                    <Badge variant="warning" size="sm">Offset by Target Referrals</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">High Budget Stretch</Badge>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-ocean/10 flex items-center justify-between">
                  <span className="text-xs text-ocean/65">Lock quote for 30 minutes</span>
                  <Link
                    href={`/pricing/plans/${s.planId}?tier=${encodeURIComponent(s.paymentTierId)}&months=${s.installmentMonths}`}
                  >
                    <Button className="text-xs">Proceed with this Match &rarr;</Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
