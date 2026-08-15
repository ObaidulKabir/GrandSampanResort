'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';

export default function InvestAdvisorPage() {
  const [availableNow, setAvailableNow] = useState('500000');
  const [monthlyCapacity, setMonthlyCapacity] = useState('25000');
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
        setError(res?.error || 'Could not score plans');
        setResult(null);
      } else {
        setResult(res);
      }
    } catch {
      setError('Could not score plans');
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Invest</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Find the best plan for your funds</h1>
      <p className="mt-3 max-w-2xl text-ocean/70">
        Ranked from live prices, advance-payment discounts, and projected rental return. Referral income is
        treated as extra cash flow — it does not change which plan yields more. These figures are illustrative.
      </p>

      <form onSubmit={run} className="mt-8 grid gap-4 border border-ocean/10 bg-white p-5 sm:grid-cols-2">
        <label className="text-sm text-ocean">
          Cash available now (৳)
          <input className="field mt-1" type="number" min={0} value={availableNow} onChange={(e) => setAvailableNow(e.target.value)} />
        </label>
        <label className="text-sm text-ocean">
          Monthly capacity (৳)
          <input className="field mt-1" type="number" min={0} value={monthlyCapacity} onChange={(e) => setMonthlyCapacity(e.target.value)} />
        </label>
        <label className="text-sm text-ocean">
          Horizon (months)
          <input className="field mt-1" type="number" min={1} max={60} value={horizonMonths} onChange={(e) => setHorizonMonths(e.target.value)} />
        </label>
        <label className="flex items-end gap-2 text-sm text-ocean pb-2">
          <input type="checkbox" checked={useReferral} onChange={(e) => setUseReferral(e.target.checked)} />
          Include my referral target
        </label>
        {useReferral && (
          <>
            <label className="text-sm text-ocean">
              Target type
              <select className="field mt-1" value={refMode} onChange={(e) => setRefMode(e.target.value as any)}>
                <option value="count">Number of referred sales</option>
                <option value="volume">Taka volume of referred sales</option>
              </select>
            </label>
            <label className="text-sm text-ocean">
              {refMode === 'count' ? 'How many referrals' : 'Sales volume (৳)'}
              <input className="field mt-1" type="number" min={0} value={refValue} onChange={(e) => setRefValue(e.target.value)} />
            </label>
            <label className="text-sm text-ocean sm:col-span-2">
              Over how many months
              <input className="field mt-1" type="number" min={1} max={36} value={refMonths} onChange={(e) => setRefMonths(e.target.value)} />
            </label>
          </>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Scoring…' : 'Show recommendations'}
          </Button>
        </div>
      </form>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {result && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/65">
            Compared {result.considered} combinations. Discount rate {result.assumptions?.discountRateAnnualPct}%
            semiannual. Referral rate {result.assumptions?.referralRatePct}%.
          </p>
          {(result.suggestions || []).map((s: any, i: number) => (
            <article key={`${s.planId}-${s.paymentTierId}-${s.installmentMonths}-${i}`} className="border border-ocean/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">#{i + 1}</p>
                  <h2 className="font-display mt-1 text-2xl text-ocean">{s.planName}</h2>
                  <p className="mt-1 text-sm text-ocean/70">
                    {s.tierLabel} · {s.installmentMonths} months · {s.cadence}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-ocean/55">You pay</p>
                  <p className="font-display text-2xl text-ocean">{formatMoney(s.netPrice)}</p>
                  {s.savings > 0 && <p className="text-xs text-gold">Save {formatMoney(s.savings)}</p>}
                </div>
              </div>
              <p className="mt-3 text-sm text-ocean/80">{s.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="border border-ocean/15 px-2 py-1">Yield {s.yieldPct}%</span>
                <span className="border border-ocean/15 px-2 py-1">Due today {formatMoney(s.depositAmount)}</span>
                {s.feasibleWithoutReferral ? (
                  <span className="border border-ocean/15 px-2 py-1">Fits salary alone</span>
                ) : s.feasibleIfTargetHit ? (
                  <span className="border border-gold/40 bg-gold/10 px-2 py-1">Needs referral target</span>
                ) : (
                  <span className="border border-red-200 bg-red-50 px-2 py-1">Tight cash flow</span>
                )}
              </div>
              <div className="mt-4">
                <Link href={`/pricing/plans/${s.planId}?tier=${encodeURIComponent(s.paymentTierId)}&months=${s.installmentMonths}`}>
                  <Button>Open this plan</Button>
                </Link>
              </div>
            </article>
          ))}
          {!result.suggestions?.length && <p className="text-ocean/65">No unsold plans to score.</p>}
        </div>
      )}
    </main>
  );
}
