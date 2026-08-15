'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';
import KycEditor from '@/components/KycEditor';

type Me = { id: string; name?: string; email: string; kyc?: boolean };
type Holding = { booking: any; suite: any; plan: any; client?: any };
type Summary = { booking: any; paidTotal: number; outstanding: number; nextDue: any; handoverDate: string };
type ScheduleItem = { id: string; bookingId: string; type: string; dueDate: string; amount: number; status: string };

export default function InvestorPage() {
  const t = useTranslations('investor');
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const logout = useAppStore((s) => s.logout);

  const [me, setMe] = useState<Me | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referral, setReferral] = useState<any>(null);
  const [copyMsg, setCopyMsg] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function loadAll() {
    if (!token) {
      setMe(null);
      setHoldings([]);
      setReferral(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const meRes = await api('/auth/me');
      const profile = meRes?.ok ? meRes.user : user;
      setMe(profile || null);
      const investorId = profile?.id || user?.id;
      if (!investorId) {
        setHoldings([]);
        setError(t('pleaseSignIn'));
        setLoading(false);
        return;
      }
      const [hRes, refRes] = await Promise.all([api(`/booking/investor/${investorId}`), api('/referral/me')]);
      const hs = hRes?.holdings || [];
      setHoldings(hs);
      setReferral(refRes?.ok ? refRes : null);
      const sumPairs = await Promise.all(
        hs.map(async (h: Holding) => {
          const sRes = await api(`/booking/${h.booking.id}/summary`);
          const scRes = await api(`/booking/${h.booking.id}/schedule`);
          return { id: h.booking.id, summary: sRes?.summary, schedule: scRes?.schedule || [] };
        })
      );
      const sumById: Record<string, Summary> = {};
      const schById: Record<string, ScheduleItem[]> = {};
      sumPairs.forEach((row) => {
        if (row.summary) sumById[row.id] = row.summary;
        schById[row.id] = row.schedule;
      });
      setSummaries(sumById);
      setSchedules(schById);
    } catch {
      setError(t('loadFailed'));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!hydrated) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token]);

  const portfolio = useMemo(
    () => holdings.reduce((sum, h) => sum + (h.booking.amountTotal || 0), 0),
    [holdings]
  );
  const paid = useMemo(
    () => Object.values(summaries).reduce((sum, x) => sum + (x?.paidTotal || 0), 0),
    [summaries]
  );
  const outstanding = useMemo(
    () => Object.values(summaries).reduce((sum, x) => sum + (x?.outstanding || 0), 0),
    [summaries]
  );
  const upcoming = useMemo(() => {
    const items = Object.values(schedules).flat().filter((i) => i.status === 'due');
    return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 6);
  }, [schedules]);

  async function pay(item: ScheduleItem) {
    try {
      await api('/payments/pay', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: item.bookingId,
          itemId: item.id,
          amount: item.amount,
          method: 'card'
        })
      });
      const sRes = await api(`/booking/${item.bookingId}/summary`);
      const scRes = await api(`/booking/${item.bookingId}/schedule`);
      setSummaries((prev) => ({ ...prev, [item.bookingId]: sRes?.summary }));
      setSchedules((prev) => ({ ...prev, [item.bookingId]: scRes?.schedule || [] }));
    } catch {}
  }

  async function copyReferralLink() {
    const link = referral?.link;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyMsg(t('linkCopied'));
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg(link);
    }
  }

  if (hydrated && !token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="font-display text-3xl text-ocean md:text-4xl">{t('signInTitle')}</h1>
        <p className="mt-3 text-ocean/75">{t('signInIntro')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/auth/login?next=/investor" className="sm:inline-flex">
            <Button className="w-full sm:w-auto">{t('signIn')}</Button>
          </Link>
          <Link href="/auth/register" className="sm:inline-flex">
            <Button variant="outline" className="w-full sm:w-auto">
              {t('createAccount')}
            </Button>
          </Link>
          <Link href="/invest" className="sm:inline-flex">
            <Button variant="ghost" className="w-full sm:w-auto">
              {t('browsePlans')}
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
          <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">
            {me?.name ? t('welcomeName', { name: me.name }) : t('welcome')}
          </h1>
          <p className="mt-2 text-ocean/75">{me?.email}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/invest" className="sm:inline-flex">
            <Button className="w-full sm:w-auto">{t('buyAnother')}</Button>
          </Link>
          <Link href="/auth/change-password" className="sm:inline-flex">
            <Button variant="outline" className="w-full sm:w-auto">
              {t('changePassword')}
            </Button>
          </Link>
          <Button variant="outline" className="w-full sm:w-auto" onClick={loadAll}>
            {loading ? t('refreshing') : t('refresh')}
          </Button>
          <Button variant="ghost" className="w-full sm:w-auto" onClick={logout}>
            {t('signOut')}
          </Button>
        </div>
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-ocean/10 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-ocean/60">{t('portfolio')}</div>
          <div className="font-display mt-1 text-3xl text-ocean">{formatMoney(portfolio)}</div>
        </div>
        <div className="border border-ocean/10 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-ocean/60">{t('paid')}</div>
          <div className="font-display mt-1 text-3xl text-ocean">{formatMoney(paid)}</div>
        </div>
        <div className="border border-gold/40 bg-gold/10 p-5">
          <div className="text-xs uppercase tracking-wide text-ocean/60">{t('outstanding')}</div>
          <div className="font-display mt-1 text-3xl text-ocean">{formatMoney(outstanding)}</div>
        </div>
      </section>

      {referral?.code && (
        <section className="mt-10 border border-ocean/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-ocean">{t('referralTitle')}</h2>
              <p className="mt-1 text-sm text-ocean/70">
                {t('referralIntro', {
                  incentivePct: referral.policy?.incentivePct ?? 2,
                  t1: referral.policy?.tranche1Pct ?? 40,
                  t2: referral.policy?.tranche2Pct ?? 60
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-ocean/55">{t('yourCode')}</div>
              <div className="font-display text-2xl tracking-wide text-ocean">{referral.code}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate border border-ocean/10 bg-pearl px-3 py-2 text-sm text-ocean">
              {referral.link}
            </code>
            <Button variant="outline" onClick={copyReferralLink}>
              {t('copyLink')}
            </Button>
            {copyMsg && <span className="text-sm text-ocean/65">{copyMsg}</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-pearl p-3">
              <div className="text-xs text-ocean/60">{t('totalIncentive')}</div>
              <div className="font-semibold text-ocean">{formatMoney(referral.totals?.totalIncentive || 0)}</div>
            </div>
            <div className="bg-pearl p-3">
              <div className="text-xs text-ocean/60">{t('unlocked')}</div>
              <div className="font-semibold text-ocean">{formatMoney(referral.totals?.unlocked || 0)}</div>
            </div>
            <div className="bg-pearl p-3">
              <div className="text-xs text-ocean/60">{t('waiting')}</div>
              <div className="font-semibold text-ocean">{formatMoney(referral.totals?.waiting || 0)}</div>
            </div>
            <div className="border border-gold/40 bg-gold/10 p-3">
              <div className="text-xs text-ocean/60">{t('paidOut')}</div>
              <div className="font-semibold text-ocean">{formatMoney(referral.totals?.paid || 0)}</div>
            </div>
          </div>
          {(referral.rewards || []).length > 0 && (
            <div className="mt-5 space-y-2">
              {(referral.rewards as any[]).slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-ocean/10 pt-2 text-sm"
                >
                  <div>
                    <span className="text-ocean">{t('sale', { amount: formatMoney(r.saleAmount) })}</span>
                    <span className="ml-2 capitalize text-ocean/60">{r.status}</span>
                  </div>
                  <div className="text-ocean/80">
                    {t('tranche', {
                      t1: formatMoney(r.tranche1Amount),
                      s1: r.tranche1Status,
                      t2: formatMoney(r.tranche2Amount),
                      s2: r.tranche2Status
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-ocean">{t('payNext')}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {upcoming.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 border border-ocean/10 bg-white p-4"
              >
                <div>
                  <div className="capitalize text-ocean">{i.type}</div>
                  <div className="text-sm text-ocean/70">{formatDate(i.dueDate)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ocean">{formatMoney(i.amount)}</span>
                  <Button onClick={() => pay(i)}>{t('pay')}</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl text-ocean">{t('holdings')}</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {holdings.map((h) => {
            const sum = summaries[h.booking.id];
            return (
              <article key={h.booking.id} className="border border-ocean/10 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9">
                      <Image src="/images/icons/balcony.svg" alt="" fill sizes="36px" />
                    </div>
                    <div>
                      <div className="font-medium text-ocean">
                        {h.plan?.name || t('stayBooking')} · {h.suite?.id || h.booking.suiteId}
                      </div>
                      <div className="text-sm text-ocean/70">
                        {h.suite?.type} · {h.suite?.view}
                        {h.plan?.daysPerMonth ? t('daysMo', { days: h.plan.daysPerMonth }) : ''}
                        {h.booking.planId ? t('planId', { id: h.booking.planId }) : ''}
                      </div>
                    </div>
                  </div>
                  <span className="border border-ocean/15 px-2 py-1 text-xs capitalize text-ocean/80">
                    {h.booking.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-pearl p-3">
                    <div className="text-ocean/60">{t('total')}</div>
                    <div className="text-ocean">{formatMoney(h.booking.amountTotal || 0)}</div>
                  </div>
                  <div className="bg-pearl p-3">
                    <div className="text-ocean/60">{t('paid')}</div>
                    <div className="text-ocean">{formatMoney(sum?.paidTotal || 0)}</div>
                  </div>
                  <div className="bg-pearl p-3">
                    <div className="text-ocean/60">{t('due')}</div>
                    <div className="text-ocean">{formatMoney(sum?.outstanding || 0)}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(schedules[h.booking.id] || []).slice(0, 4).map((i) => (
                    <div key={i.id} className="flex items-center justify-between border-t border-ocean/10 pt-2 text-sm">
                      <div>
                        <span className="capitalize text-ocean">{i.type}</span>
                        <span className="ml-2 text-ocean/60">{formatDate(i.dueDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{formatMoney(i.amount)}</span>
                        {i.status === 'due' ? (
                          <button
                            onClick={() => pay(i)}
                            className="rounded-md bg-ocean px-3 py-1 text-xs font-semibold text-white"
                          >
                            {t('pay')}
                          </button>
                        ) : (
                          <span className="text-xs text-ocean/50">{t('paid')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {h.client && h.booking.status !== 'cancelled' && (
                  <div className="mt-5 border-t border-ocean/10 pt-4">
                    <h3 className="text-sm font-semibold text-ocean">{t('detailsTitle')}</h3>
                    <p className="mt-1 text-xs text-ocean/65">{t('detailsHint')}</p>
                    <div className="mt-3">
                      <KycEditor
                        bookingId={h.booking.id}
                        client={h.client}
                        variant="owner"
                        onSaved={(next) =>
                          setHoldings((prev) =>
                            prev.map((row) =>
                              row.booking.id === h.booking.id ? { ...row, client: next } : row
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {holdings.length === 0 && !loading && (
            <div className="border border-ocean/10 p-6 text-ocean/70 lg:col-span-2">
              {t('noHoldings')}{' '}
              <Link href="/invest" className="font-semibold text-ocean underline">
                {t('browseAvailable')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
