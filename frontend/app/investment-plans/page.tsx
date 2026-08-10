'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { annualReturnRange, normalizeReturnAssumptions, type ReturnAssumptions } from '@/lib/returns';
import Button from '@/components/Button';

export default function InvestmentPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [suites, setSuites] = useState<Record<string, any>>({});
  const [assumptions, setAssumptions] = useState<ReturnAssumptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [plansJson, suitesJson, returnsJson] = await Promise.all([
          api('/timeshares'),
          api('/suites'),
          api('/settings/return-assumptions').catch(() => null)
        ]);
        const items = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
        const suitesArr = Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [];
        setSuites(Object.fromEntries(suitesArr.map((s: any) => [s.id, s])));
        setPlans(
          items
            .filter((p: any) => (p.planStatus ?? 'Unsold').toLowerCase() === 'unsold')
            .sort((a: any, b: any) => {
              const priceCmp = Number(a.price || 0) - Number(b.price || 0);
              if (priceCmp !== 0) return priceCmp;
              return String(a.id).localeCompare(String(b.id), undefined, {
                numeric: true,
                sensitivity: 'base'
              });
            })
        );
        if (returnsJson) setAssumptions(normalizeReturnAssumptions(returnsJson));
      } catch {
        setError('Failed to load investment plans');
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ocean">Investment Plans</h1>
          <p className="mt-2 text-ocean/75">Unsold share plans ready for purchase.</p>
        </div>
        <Link href="/invest">
          <Button variant="outline">Full catalog</Button>
        </Link>
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {loading && <p className="mt-6 text-ocean/70">Loading plans...</p>}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const suite = suites[p.suiteId] || {};
          const returns = annualReturnRange(p.daysPerMonth, assumptions, suite);
          return (
            <article key={p.id} className="flex flex-col border border-ocean/15 bg-white p-6">
              <h2 className="font-display text-2xl text-ocean">{p.name}</h2>
              <p className="mt-2 text-sm text-ocean/75">
                {p.daysPerMonth} days/month · {p.planType || 'DPM'} · Lock-in {p.lockIn || 36} mo
              </p>
              <p className="mt-2 text-sm text-ocean/70">
                {p.suiteId || '—'} · {suite.type || '—'} · {suite.view || '—'}
              </p>
              {(() => {
                const total = typeof p.discountedPrice === 'number' ? Number(p.discountedPrice) : Number(p.price || 0);
                const bookingAmount = Math.round(total * 0.1);
                return (
                  <div className="mt-5 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">Total price</p>
                      {typeof p.discountedPrice === 'number' && (
                        <p className="text-sm text-ocean/50 line-through">{formatMoney(p.price)}</p>
                      )}
                      <p className="font-display text-2xl font-semibold text-ocean">{formatMoney(total)}</p>
                    </div>
                    <div className="border border-gold/50 bg-gold/10 px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-ocean/70">Booking amount</p>
                      <p className="font-display mt-0.5 text-3xl font-bold text-ocean">
                        {formatMoney(bookingAmount)}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-ocean/65">
                        Pay only 10% today to reserve this plan
                      </p>
                    </div>
                  </div>
                );
              })()}
              {returns && (
                <div className="mt-4 border border-gold/40 bg-gold/5 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">
                    Expected return / year
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ocean">
                    {formatMoney(returns.low, 0)} – {formatMoney(returns.high, 0)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ocean/55">
                    Projected rental income · varies with occupancy & rates
                  </p>
                </div>
              )}
              <div className="mt-6">
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button>Buy this plan</Button>
                </Link>
              </div>
            </article>
          );
        })}
        {!loading && plans.length === 0 && (
          <div className="border border-ocean/10 p-6 text-ocean/70 md:col-span-3">
            No unsold plans available. Check back soon or contact sales.
          </div>
        )}
      </div>
    </main>
  );
}
