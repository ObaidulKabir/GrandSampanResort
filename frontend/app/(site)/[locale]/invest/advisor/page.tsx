'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import { tierHeadline } from '@/lib/paymentCopy';
import { badgesFor, monthlyOutlay } from '@/lib/advisorUi';
import { formatAdvisorReasons } from '@/lib/advisorReasons';
import { apiErrorMessage } from '@/lib/errors';
import { useAppStore } from '@/store/appStore';
import InvestmentCheckoutModal from '@/components/checkout/InvestmentCheckoutModal';

export default function InvestAdvisorPage() {
  const t = useTranslations('investAdvisor');
  const tPayment = useTranslations('payment');
  const tReasons = useTranslations('advisorReasons');
  const tErrors = useTranslations('errors');
  const user = useAppStore((s) => s.user);
  const hydrate = useAppStore((s) => s.hydrate);
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
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const resumedCheckout = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (resumedCheckout.current) return;
    const resumeId = new URLSearchParams(window.location.search).get('resume');
    if (!resumeId) return;
    resumedCheckout.current = true;
    api(`/timeshares/${encodeURIComponent(resumeId)}`).then((json: any) => {
      const p = json?.id ? json : json?.plan;
      if (!p?.id) return;
      setCheckoutPlan({
        id: p.id,
        name: p.name,
        daysPerMonth: p.daysPerMonth || 1,
        lockIn: p.lockIn || 12,
        price: p.price,
        discountedPrice: p.discountedPrice,
        discountPct: p.discountPct,
        promoName: p.promoName,
        suiteId: p.suiteId,
        suite: p.suite
      });
      setIsCheckoutOpen(true);
    });
  }, []);

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
        setError(apiErrorMessage(res?.error, tErrors, 'generic'));
        setResult(null);
      } else {
        setResult(res);
      }
    } catch {
      setError(t('errorGeneric'));
    }
    setLoading(false);
  }

  const suggestions = result?.suggestions || [];
  const badges = badgesFor(suggestions).map((b) => {
    if (b === 'bestFit') return t('badgeBestFit');
    if (b === 'payLess') return t('badgePayLess');
    if (b === 'smallerMonthly') return t('badgeSmallerMonthly');
    return '';
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ocean/70">{t('intro')}</p>

      <form onSubmit={run} className="mt-8 space-y-5 border border-ocean/10 bg-white p-5 sm:p-6">
        <label className="block text-sm font-medium text-ocean">
          {t('payToday')}
          <input
            className="field mt-1"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder={t('payTodayPlaceholder')}
            value={availableNow}
            onChange={(e) => setAvailableNow(e.target.value)}
            required
          />
          <span className="mt-1 block text-xs font-normal text-ocean/55">{t('payTodayHint')}</span>
        </label>
        <label className="block text-sm font-medium text-ocean">
          {t('monthly')}
          <input
            className="field mt-1"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder={t('monthlyPlaceholder')}
            value={monthlyCapacity}
            onChange={(e) => setMonthlyCapacity(e.target.value)}
            required
          />
          <span className="mt-1 block text-xs font-normal text-ocean/55">{t('monthlyHint')}</span>
        </label>
        <div>
          <p className="text-sm font-medium text-ocean">{t('horizon')}</p>
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
                {t('months', { n })}
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
            {t('referralToggle')}
            <span className="mt-0.5 block text-xs text-ocean/55">{t('referralHint')}</span>
          </span>
        </label>
        {useReferral && (
          <div className="grid gap-4 border border-ocean/10 bg-pearl/60 p-4 sm:grid-cols-2">
            <label className="text-sm text-ocean">
              {t('measure')}
              <select className="field mt-1" value={refMode} onChange={(e) => setRefMode(e.target.value as any)}>
                <option value="count">{t('measureCount')}</option>
                <option value="volume">{t('measureVolume')}</option>
              </select>
            </label>
            <label className="text-sm text-ocean">
              {refMode === 'count' ? t('referralCount') : t('referralVolume')}
              <input className="field mt-1" type="number" min={0} value={refValue} onChange={(e) => setRefValue(e.target.value)} />
            </label>
            <label className="text-sm text-ocean sm:col-span-2">
              {t('overMonths')}
              <input className="field mt-1" type="number" min={1} max={36} value={refMonths} onChange={(e) => setRefMonths(e.target.value)} />
            </label>
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? t('finding') : t('showOptions')}
        </Button>
      </form>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {result && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/65">{suggestions.length ? t('resultsIntro') : t('noPlans')}</p>
          {suggestions.map((s: any, i: number) => (
            <article key={`${s.planId}-${s.paymentTierId}-${s.installmentMonths}-${i}`} className="border border-ocean/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {badges[i] && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold">{badges[i]}</p>
                  )}
                  <h2 className="font-display mt-1 text-2xl text-ocean">{s.planName}</h2>
                  <p className="mt-1 text-sm text-ocean/70">
                    {tierHeadline({ id: s.paymentTierId, label: s.tierLabel }, tPayment)}
                    {s.paymentTierId !== 'full'
                      ? `${t('finishIn', { months: s.installmentMonths })}${s.cadence === 'quarterly' ? t('every3') : ''}`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-ocean/55">{t('youPay')}</p>
                  <p className="font-display text-2xl text-ocean">{formatMoney(s.netPrice)}</p>
                  {s.savings > 0 && <p className="text-xs text-gold">{t('save', { amount: formatMoney(s.savings) })}</p>}
                </div>
              </div>
              {formatAdvisorReasons(s.reasons, tReasons).map((line: string) => (
                <p key={line} className="mt-2 text-sm text-ocean/80 first:mt-3">
                  {line}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="border border-ocean/15 px-2 py-1">{t('today', { amount: formatMoney(s.depositAmount) })}</span>
                {s.paymentTierId !== 'full' && (
                  <span className="border border-ocean/15 px-2 py-1">
                    {s.cadence === 'quarterly'
                      ? t('thenQuarter', { amount: formatMoney(Math.round(monthlyOutlay(s))) })
                      : t('thenMonth', { amount: formatMoney(Math.round(monthlyOutlay(s))) })}
                  </span>
                )}
                {s.feasibleWithoutReferral ? (
                  <span className="border border-ocean/15 px-2 py-1">{t('fitsBudget')}</span>
                ) : s.feasibleIfTargetHit ? (
                  <span className="border border-gold/40 bg-gold/10 px-2 py-1">{t('needsReferral')}</span>
                ) : (
                  <span className="border border-red-200 bg-red-50 px-2 py-1">{t('tightBudget')}</span>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => {
                    setCheckoutPlan({
                      id: s.planId,
                      name: s.planName,
                      daysPerMonth: s.daysPerMonth || 1,
                      lockIn: s.lockInMonths || 12,
                      price: s.listPrice || s.netPrice,
                      suiteId: s.suiteId,
                    });
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full sm:w-auto bg-gold text-ocean font-bold hover:bg-gold/90"
                >
                  Instant Stepper Checkout →
                </Button>
                <Link
                  href={`/pricing/plans/${s.planId}?tier=${encodeURIComponent(s.paymentTierId)}&months=${s.installmentMonths}`}
                  className="block sm:inline-flex"
                >
                  <Button variant="outline" className="w-full sm:w-auto">{t('continue')}</Button>
                </Link>
              </div>
            </article>
          ))}
          {!suggestions.length && (
            <Link href="/invest">
              <Button variant="outline">{t('browse')}</Button>
            </Link>
          )}
        </div>
      )}

      {/* Stepper Checkout Modal */}
      <InvestmentCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        plan={checkoutPlan}
        user={user}
        returnTo="advisor"
      />
    </main>
  );
}
