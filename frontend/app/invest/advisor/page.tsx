'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import { tierHeadline } from '@/lib/paymentCopy';
import { badgesFor, monthlyOutlay } from '@/lib/advisorUi';

export default function InvestAdvisorPage() {
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
        setError(res?.error || 'We could not match a plan right now. Try again, or browse available suites.');
        setResult(null);
      } else {
        setResult(res);
      }
    } catch {
      setError('We could not match a plan right now. Try again, or browse available suites.');
    }
    setLoading(false);
  }

  const suggestions = result?.suggestions || [];
  const badges = badgesFor(suggestions);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Invest</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">Help me choose</h1>
      <p className="mt-3 max-w-2xl text-ocean/70">
        Answer two questions. We’ll suggest a suite and how much to pay today — from live prices, not a sales pitch.
      </p>

      <form onSubmit={run} className="mt-8 space-y-5 border border-ocean/10 bg-white p-5 sm:p-6">
        <label className="block text-sm font-medium text-ocean">
          How much can you pay today?
          <input
            className="field mt-1"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 500000"
            value={availableNow}
            onChange={(e) => setAvailableNow(e.target.value)}
            required
          />
          <span className="mt-1 block text-xs font-normal text-ocean/55">The amount you can transfer now to reserve.</span>
        </label>
        <label className="block text-sm font-medium text-ocean">
          How much can you put aside each month?
          <input
            className="field mt-1"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 25000"
            value={monthlyCapacity}
            onChange={(e) => setMonthlyCapacity(e.target.value)}
            required
          />
          <span className="mt-1 block text-xs font-normal text-ocean/55">What you can comfortably pay after the first payment.</span>
        </label>
        <div>
          <p className="text-sm font-medium text-ocean">How long can you keep paying?</p>
          <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
            {['24', '36'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setHorizonMonths(n)}
                className={`border px-3 py-2 text-sm font-semibold ${
                  horizonMonths === n ? 'border-gold bg-gold/10 text-ocean' : 'border-ocean/15 text-ocean/80'
                }`}
              >
                {n} months
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-ocean">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={useReferral}
            onChange={(e) => setUseReferral(e.target.checked)}
          />
          <span>
            I also earn from referring buyers
            <span className="mt-0.5 block text-xs text-ocean/55">Optional. We’ll treat this as extra cash, not as a reason to pick a plan.</span>
          </span>
        </label>
        {useReferral && (
          <div className="grid gap-4 border border-ocean/10 bg-pearl/60 p-4 sm:grid-cols-2">
            <label className="text-sm text-ocean">
              How you measure it
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
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Finding a match…' : 'Show my options'}
        </Button>
      </form>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {result && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/65">
            {suggestions.length
              ? 'Plans that fit what you can pay, with the trade-offs in plain terms.'
              : 'No unsold plans to compare right now.'}
          </p>
          {suggestions.map((s: any, i: number) => (
            <article key={`${s.planId}-${s.paymentTierId}-${s.installmentMonths}-${i}`} className="border border-ocean/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {badges[i] && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold">{badges[i]}</p>
                  )}
                  <h2 className="font-display mt-1 text-2xl text-ocean">{s.planName}</h2>
                  <p className="mt-1 text-sm text-ocean/70">
                    {tierHeadline({ id: s.paymentTierId, label: s.tierLabel })}
                    {s.paymentTierId !== 'full'
                      ? ` · finish in ${s.installmentMonths} months${s.cadence === 'quarterly' ? ', every 3 months' : ''}`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-ocean/55">You pay</p>
                  <p className="font-display text-2xl text-ocean">{formatMoney(s.netPrice)}</p>
                  {s.savings > 0 && <p className="text-xs text-gold">Save {formatMoney(s.savings)}</p>}
                </div>
              </div>
              {(s.points?.length ? s.points : s.summary ? [s.summary] : []).map((line: string) => (
                <p key={line} className="mt-2 text-sm text-ocean/80 first:mt-3">
                  {line}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="border border-ocean/15 px-2 py-1">Today {formatMoney(s.depositAmount)}</span>
                {s.paymentTierId !== 'full' && (
                  <span className="border border-ocean/15 px-2 py-1">
                    Then about {formatMoney(Math.round(monthlyOutlay(s)))}
                    {s.cadence === 'quarterly' ? ' / quarter' : ' / month'}
                  </span>
                )}
                {s.feasibleWithoutReferral ? (
                  <span className="border border-ocean/15 px-2 py-1">Fits the budget you entered</span>
                ) : s.feasibleIfTargetHit ? (
                  <span className="border border-gold/40 bg-gold/10 px-2 py-1">Needs your referral target</span>
                ) : (
                  <span className="border border-red-200 bg-red-50 px-2 py-1">Tight against this budget</span>
                )}
              </div>
              <div className="mt-4">
                <Link
                  href={`/pricing/plans/${s.planId}?tier=${encodeURIComponent(s.paymentTierId)}&months=${s.installmentMonths}`}
                  className="block sm:inline-flex"
                >
                  <Button className="w-full sm:w-auto">Continue with this plan</Button>
                </Link>
              </div>
            </article>
          ))}
          {!suggestions.length && (
            <Link href="/invest">
              <Button variant="outline">Browse available suites</Button>
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
