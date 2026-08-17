'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import Image from 'next/image';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';
import PlanOwner from '@/components/PlanOwner';
import ReturnsCalculator from '@/components/ReturnsCalculator';
import SuitePlans from '@/components/SuitePlans';
import InvestmentCheckoutModal from '@/components/checkout/InvestmentCheckoutModal';
import { loadBookingDraft, saveBookingDraft } from '@/lib/bookingDraft';
import { planOfferPrice } from '@/lib/schedule';

type Plan = {
  id: string;
  name: string;
  daysPerMonth: number;
  lockIn?: number;
  price: number;
  suiteId?: string;
  planType?: string;
  timeFraction?: number;
  planStatus?: string;
  discountPct?: number;
  discountedPrice?: number;
  promoName?: string;
  promoEndsAt?: string;
  owner?: { name: string; city?: string; profession?: string; picUrl?: string | null } | null;
};
type Suite = { id: string; type: string; view: string; floor: number; size: number };

export default function PlanDetailsPage({ params }: { params: { id: string } }) {
  const t = useTranslations('planDetails');
  const planId = params.id;
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const hydrate = useAppStore((s) => s.hydrate);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [unitPlans, setUnitPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const resumedCheckout = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const tier = q.get('tier');
      if (!tier) return;
      const existing = loadBookingDraft(planId) || {};
      if (!existing.selectedTierId && !existing.paymentTierId) {
        saveBookingDraft(planId, { ...existing, selectedTierId: tier, paymentTierId: tier });
      }
    } catch {
      /* ignore */
    }
  }, [planId]);

  useEffect(() => {
    if (resumedCheckout.current || !plan) return;
    try {
      const resume = new URLSearchParams(window.location.search).get('resume');
      if (!resume) return;
    } catch {
      return;
    }
    if (!loadBookingDraft(planId)) return;
    resumedCheckout.current = true;
    setIsCheckoutOpen(true);
  }, [plan, planId]);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    api('/booking/quote', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentTierId: 'standard' })
    }).then((res) => {
      if (!cancelled && res?.ok) setQuote(res.quote);
    });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [pRes, allPlansRes] = await Promise.all([
        api(`/timeshares/${planId}`),
        api('/timeshares').catch(() => [])
      ]);
      const p = pRes?.id ? pRes : pRes?.plan || null;
      if (p) {
        setPlan(p);
        const allPlans = Array.isArray(allPlansRes) ? allPlansRes : allPlansRes?.plans ?? [];
        if (p.suiteId) {
          const sRes = await api(`/suites/${p.suiteId}`);
          setSuite(sRes?.suite || sRes || null);
          const onSuite = allPlans
            .filter((x: Plan) => x.suiteId === p.suiteId)
            .sort(
              (a: Plan, b: Plan) =>
                Number(a.daysPerMonth || 0) - Number(b.daysPerMonth || 0) ||
                String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
            );
          if (!onSuite.some((x: Plan) => x.id === p.id)) {
            onSuite.unshift(p);
          }
          setUnitPlans(onSuite);
        } else {
          setUnitPlans([p]);
        }
      }
    } catch {
      setError(t('loadFailed'));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  function selectUnitPlan(nextId: string) {
    if (!nextId || nextId === planId) return;
    router.push(`/pricing/plans/${encodeURIComponent(nextId)}`);
  }

  const listPrice = Math.round(Number(plan?.price) || 0);
  const offerPrice = quote?.afterPromo ?? planOfferPrice(plan);
  const discounted = offerPrice < listPrice || typeof plan?.discountedPrice === 'number';
  const depositPreview = quote?.depositAmount ?? Math.round(offerPrice * 0.1);

  const available = (plan?.planStatus || 'Unsold').toLowerCase() === 'unsold';
  const reserved = (plan?.planStatus || '').toLowerCase() === 'reserved';
  const booked = !available && !reserved;
  const otherAvailable = unitPlans.filter(
    (x) => x.id !== planId && String(x.planStatus || 'Unsold').toLowerCase() === 'unsold'
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 md:py-16 lg:pb-16">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:gap-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('sharePlan')}</p>
          <h1 className="font-display mt-2 text-3xl text-ocean md:text-4xl">{plan?.name || t('planDetailsFallback')}</h1>
          <p className="mt-2 text-ocean/75">
            {plan ? t('planMeta', { days: plan.daysPerMonth, months: plan.lockIn ?? 36 }) : t('loading')}
          </p>
          {unitPlans.length > 1 && (
            <label className="mt-4 block max-w-md text-sm font-medium text-ocean">
              {t('otherShares')}
              <select
                value={planId}
                onChange={(e) => selectUnitPlan(e.target.value)}
                className="field mt-1"
              >
                {unitPlans.map((option) => {
                  const st = String(option.planStatus || 'Unsold').toLowerCase();
                  const tag =
                    st === 'unsold' ? t('optionAvailable') : st === 'reserved' ? t('optionReserved') : t('optionBooked');
                  const who = option.owner?.name ? ` · ${option.owner.name}` : '';
                  return (
                    <option key={option.id} value={option.id}>
                      {t('optionLine', { name: option.name || t('shareFallback'), days: option.daysPerMonth, tag })}
                      {who}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

          {booked && (
            <div className="mt-6 border border-ocean/15 bg-pearl px-4 py-4">
              {plan?.owner ? (
                <PlanOwner owner={plan.owner} statusLabel={t('bookedBy')} hidePhoto />
              ) : (
                <p className="text-sm text-ocean/75">{t('alreadyBooked')}</p>
              )}
            </div>
          )}
          {reserved && (
            <div className="mt-6 border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ocean">
              {t('reservedNotice')}
            </div>
          )}

          {discounted && (
            <div className="mt-4 border border-gold bg-gold/10 px-4 py-3 text-ocean">
              <span className="font-semibold">✦ {plan?.promoName}</span> — {plan?.discountPct}% off until{' '}
              {plan?.promoEndsAt ? formatDate(plan.promoEndsAt) : ''}
            </div>
          )}

          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-ocean/15 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ocean/60">
                {available ? t('totalPrice') : t('soldAtLabel')}
              </div>
              {discounted && available ? (
                <>
                  <div className="text-sm text-ocean/50 line-through">{formatMoney(listPrice)}</div>
                  <div className="font-display text-2xl font-semibold text-ocean">{formatMoney(offerPrice)}</div>
                </>
              ) : (
                <div className="mt-1 font-display text-2xl font-semibold text-ocean">
                  {formatMoney(plan?.price || 0)}
                </div>
              )}
            </div>
            {available ? (
              <div className="border border-gold/50 bg-gold/10 p-4 sm:col-span-1">
                <div className="text-xs font-bold uppercase tracking-wide text-ocean/70">{t('dueToday')}</div>
                <div className="font-display mt-1 text-3xl font-bold text-ocean">{formatMoney(depositPreview)}</div>
                <p className="mt-1 text-[11px] font-medium text-ocean/65">
                  {t('dueTodayHint', { pct: quote?.upfrontPct ?? 10 })}
                </p>
              </div>
            ) : (
              <div className="border border-ocean/20 bg-ocean p-4 text-white">
                <div className="text-xs font-bold uppercase tracking-wide text-white/70">{t('status')}</div>
                <div className="font-display mt-1 text-3xl font-bold">{booked ? t('booked') : t('reserved')}</div>
                <p className="mt-1 text-[11px] font-medium text-white/75">
                  {booked ? t('noLongerSale') : t('heldBooking')}
                </p>
              </div>
            )}
            {[
              [t('entitlement'), t('entitlementValue', { days: plan?.daysPerMonth || 0 })],
              [t('suite'), suite?.id || plan?.suiteId || '—']
            ].map(([label, value]) => (
              <div key={label} className="border border-ocean/10 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-ocean/60">{label}</div>
                <div className="mt-1 font-display text-xl text-ocean">{value}</div>
              </div>
            ))}
          </section>

          <section className="mt-8 border border-ocean/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image src="/images/icons/balcony.svg" alt="" fill sizes="40px" />
              </div>
              <div>
                <div className="text-ocean">
                  {t('suiteMeta', { type: suite?.type || t('suite'), view: suite?.view || '—' })}
                </div>
                <div className="text-sm text-ocean/70">
                  {t('suiteFloor', { floor: suite?.floor ?? '—', size: suite?.size ?? '—', unit: suite?.id || plan?.suiteId || '—' })}
                </div>
              </div>
            </div>
          </section>

          <ReturnsCalculator
            className="mt-8"
            showHeading
            locked
            suite={
              suite
                ? {
                    id: suite.id,
                    type: suite.type,
                    size: suite.size,
                    view: suite.view,
                    floor: suite.floor
                  }
                : plan?.suiteId
                  ? { id: plan.suiteId }
                  : null
            }
            plan={
              plan
                ? {
                    id: plan.id,
                    name: plan.name,
                    suiteId: plan.suiteId,
                    daysPerMonth: plan.daysPerMonth,
                    planStatus: plan.planStatus
                  }
                : null
            }
          />

          {(plan?.suiteId || suite?.id) && <SuitePlans suiteId={plan?.suiteId || suite!.id} />}
        </div>

        <aside id="reserve-panel" className="scroll-mt-24 border border-gold/40 bg-white p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start">
          {!available ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">
                {booked ? t('asideBooked') : t('asideReserved')}
              </p>
              <h2 className="font-display mt-1 text-2xl text-ocean">
                {booked ? t('asideTaken') : t('asideInProgress')}
              </h2>
              <div className="mt-4 border border-ocean/10 bg-pearl px-3 py-3">
                {booked && plan?.owner ? (
                  <PlanOwner owner={plan.owner} statusLabel={t('bookedBy')} hidePhoto />
                ) : booked ? (
                  <p className="text-sm text-ocean/75">{t('alreadyBooked')}</p>
                ) : (
                  <p className="text-sm text-ocean/75">{t('heldOtherBuyer')}</p>
                )}
              </div>
              {booked && (
                <p className="mt-3 text-sm text-ocean/65">{t('soldAt', { amount: formatMoney(plan?.price || 0) })}</p>
              )}
              {otherAvailable.length > 0 ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-ocean">{t('otherAvailable')}</p>
                  <ul className="mt-2 space-y-2">
                    {otherAvailable.map((x) => (
                      <li key={x.id}>
                        <Link
                          href={`/pricing/plans/${x.id}`}
                          className="block border border-ocean/15 px-3 py-2 text-sm text-ocean hover:border-gold/50"
                        >
                          <span className="font-semibold">{x.name || t('shareFallback')}</span>
                          <span className="text-ocean/65">
                            {' '}
                            · {t('entitlementValue', { days: x.daysPerMonth })} · {formatMoney(x.price || 0)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Link href="/invest" className="mt-5 inline-block">
                  <Button>{t('browseAvailable')}</Button>
                </Link>
              )}
              <p className="mt-4 text-xs text-ocean/55">{t('privacyNote')}</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl text-ocean">{t('reserveTitle')}</h2>
              <p className="mt-2 text-sm text-ocean/75">{t('reserveIntro')}</p>
              <p className="mt-3 text-xs text-ocean/60">
                {t('notSure')}{' '}
                <Link href="/invest/advisor" className="font-semibold text-ocean underline">
                  {t('helpChoose')}
                </Link>
              </p>

              <div className="mt-5 border-t border-ocean/10 pt-4 text-sm text-ocean/80">
                <div className="flex justify-between">
                  <span>{t('totalPrice')}</span>
                  <span className={discounted ? 'line-through text-ocean/50' : 'font-semibold text-ocean'}>
                    {formatMoney(listPrice)}
                  </span>
                </div>
                {discounted && (
                  <div className="mt-1 flex justify-between">
                    <span className="text-ocean/70">
                      {plan?.promoName} ({plan?.discountPct}%)
                    </span>
                    <span className="font-semibold text-gold">− {formatMoney(listPrice - offerPrice)}</span>
                  </div>
                )}
                {discounted && (
                  <div className="mt-2 flex justify-between border-t border-ocean/10 pt-2">
                    <span className="font-semibold text-ocean">{t('offerPrice')}</span>
                    <span className="font-semibold text-ocean">{formatMoney(offerPrice)}</span>
                  </div>
                )}
                <div className="mt-3 border border-gold/50 bg-gold/10 px-3 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-ocean/70">{t('dueToday')}</span>
                    <span className="font-display text-2xl font-bold text-ocean">{formatMoney(depositPreview)}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-ocean/65">
                    {t('dueTodayHint', { pct: quote?.upfrontPct ?? 10 })}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                className="mt-6 w-full bg-gold text-ocean hover:bg-gold/90"
                onClick={() => setIsCheckoutOpen(true)}
                disabled={loading || !plan}
              >
                {t('btnReserve')}
              </Button>
              {otherAvailable.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-ocean">{t('otherAvailable')}</p>
                  <ul className="mt-2 space-y-2">
                    {otherAvailable.map((x) => (
                      <li key={x.id}>
                        <Link
                          href={`/pricing/plans/${x.id}`}
                          className="block border border-ocean/15 px-3 py-2 text-sm text-ocean hover:border-gold/50"
                        >
                          <span className="font-semibold">{x.name || t('shareFallback')}</span>
                          <span className="text-ocean/65">
                            {' '}
                            · {t('entitlementValue', { days: x.daysPerMonth })} · {formatMoney(x.price || 0)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href="/investor" className="text-ocean underline">
                  {t('dashboard')}
                </Link>
                <a href="mailto:info@grandsampan.com" className="text-ocean underline">
                  {t('contactSales')}
                </a>
              </div>
            </>
          )}
        </aside>
      </div>

      {available && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ocean/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(14,58,90,0.12)] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean/50">{t('dueToday')}</p>
              <p className="font-display truncate text-lg font-bold leading-tight text-ocean">
                {formatMoney(depositPreview)}
              </p>
            </div>
            <Button
              type="button"
              className="ml-auto shrink-0 bg-gold px-4 py-2.5 text-ocean hover:bg-gold/90"
              onClick={() => setIsCheckoutOpen(true)}
              disabled={loading || !plan}
            >
              {t('btnReserve')}
            </Button>
          </div>
        </div>
      )}

      <InvestmentCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        plan={
          plan
            ? {
                ...plan,
                lockIn: plan.lockIn ?? 36,
                suite: suite || undefined
              }
            : null
        }
        user={user}
        returnTo="plan"
        onBookingSuccess={() => {
          setIsCheckoutOpen(false);
          load();
        }}
      />
    </main>
  );
}
