'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { annualReturnRange, normalizeReturnAssumptions, type ReturnAssumptions } from '@/lib/returns';
import Button from '@/components/Button';

export default function InvestmentPlansPage() {
  const t = useTranslations('investmentPlans');
  const [plans, setPlans] = useState<any[]>([]);
  const [suites, setSuites] = useState<Record<string, any>>({});
  const [assumptions, setAssumptions] = useState<ReturnAssumptions | null>(null);
  const [payPolicy, setPayPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [plansJson, suitesJson, returnsJson, policyJson] = await Promise.all([
          api('/timeshares'),
          api('/suites'),
          api('/settings/return-assumptions').catch(() => null),
          api('/payment-plans/policy').catch(() => null)
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
        if (policyJson?.ok) setPayPolicy(policyJson);
      } catch {
        setError(t('loadFailed'));
      }
      setLoading(false);
    }
    load();
  }, [t]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ocean">{t('title')}</h1>
          <p className="mt-2 text-ocean/75">{t('subtitle')}</p>
          <div className="mt-3">
            <Link href="/invest/advisor">
              <Button>{t('helpChoose')}</Button>
            </Link>
            <Link href="/returns-income" className="ml-3 inline-block">
              <Button variant="outline">{t('returnsCalculator')}</Button>
            </Link>
          </div>
        </div>
        <Link href="/invest">
          <Button variant="outline">{t('fullCatalog')}</Button>
        </Link>
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {loading && <p className="mt-6 text-ocean/70">{t('loading')}</p>}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const suite = suites[p.suiteId] || {};
          const returns = annualReturnRange(p.daysPerMonth, assumptions, suite);
          const total = typeof p.discountedPrice === 'number' ? Number(p.discountedPrice) : Number(p.price || 0);
          const standardPct = Number(payPolicy?.resolved?.find((tier: any) => tier.id === 'standard')?.upfrontPct) || 10;
          const bookingAmount = Math.round(total * (standardPct / 100));
          const full = payPolicy?.resolved?.find((tier: any) => tier.upfrontPct >= 100);
          return (
            <article key={p.id} className="flex flex-col border border-ocean/15 bg-white p-6">
              <h2 className="font-display text-2xl text-ocean">{p.name}</h2>
              <p className="mt-2 text-sm text-ocean/75">
                {t('meta', { days: p.daysPerMonth, planType: p.planType || 'DPM', lockIn: p.lockIn || 36 })}
              </p>
              <p className="mt-2 text-sm text-ocean/70">
                {p.suiteId || '—'} · {suite.type || '—'} · {suite.view || '—'}
              </p>
              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">{t('totalPrice')}</p>
                  {typeof p.discountedPrice === 'number' && (
                    <p className="text-sm text-ocean/50 line-through">{formatMoney(p.price)}</p>
                  )}
                  <p className="font-display text-2xl font-semibold text-ocean">{formatMoney(total)}</p>
                </div>
                {full?.offeredDiscountPct > 0 && (
                  <span className="inline-flex w-fit items-center border border-gold bg-gold/90 px-2.5 py-1 text-xs font-semibold text-ocean">
                    {t('payFullSave', { pct: Number(full.offeredDiscountPct).toFixed(1) })}
                  </span>
                )}
                <div className="border border-gold/50 bg-gold/10 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean/70">{t('toReserve')}</p>
                  <p className="font-display mt-0.5 text-3xl font-bold text-ocean">{formatMoney(bookingAmount)}</p>
                  <p className="mt-1 text-[11px] font-medium text-ocean/65">{t('reserveHint', { pct: standardPct })}</p>
                </div>
              </div>
              {returns && (
                <div className="mt-4 border border-gold/40 bg-gold/5 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">{t('expectedReturn')}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ocean">
                    {formatMoney(returns.low, 0)} – {formatMoney(returns.high, 0)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ocean/55">{t('projected')}</p>
                </div>
              )}
              <div className="mt-6">
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button>{t('reserveFrom', { amount: formatMoney(bookingAmount) })}</Button>
                </Link>
              </div>
            </article>
          );
        })}
        {!loading && plans.length === 0 && (
          <div className="border border-ocean/10 p-6 text-ocean/70 md:col-span-3">{t('empty')}</div>
        )}
      </div>
    </main>
  );
}
