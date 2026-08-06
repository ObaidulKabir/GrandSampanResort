'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';

type Me = { id: string; name?: string; email: string; kyc?: boolean };
type Holding = { booking: any; suite: any; plan: any };
type Summary = { booking: any; paidTotal: number; outstanding: number; nextDue: any; handoverDate: string };
type ScheduleItem = { id: string; bookingId: string; type: string; dueDate: string; amount: number; status: string };

export default function InvestorPage() {
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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function loadAll() {
    if (!token) {
      setMe(null);
      setHoldings([]);
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
        setError('Please sign in to view your portfolio');
        setLoading(false);
        return;
      }
      const hRes = await api(`/booking/investor/${investorId}`);
      const hs = hRes?.holdings || [];
      setHoldings(hs);
      const sumPairs = await Promise.all(
        hs.map(async (h: Holding) => {
          const sRes = await api(`/booking/${h.booking.id}/summary`);
          const scRes = await api(`/booking/${h.booking.id}/schedule`);
          return { id: h.booking.id, summary: sRes?.summary, schedule: scRes?.schedule || [] };
        })
      );
      const sumById: Record<string, Summary> = {};
      const schById: Record<string, ScheduleItem[]> = {};
      sumPairs.forEach((p) => {
        if (p.summary) sumById[p.id] = p.summary;
        schById[p.id] = p.schedule;
      });
      setSummaries(sumById);
      setSchedules(schById);
    } catch {
      setError('Failed to load investor data');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!hydrated) return;
    loadAll();
  }, [hydrated, token]);

  const portfolio = useMemo(
    () => holdings.reduce((s, h) => s + (h.booking.amountTotal || 0), 0),
    [holdings]
  );
  const paid = useMemo(
    () => Object.values(summaries).reduce((s, x) => s + (x?.paidTotal || 0), 0),
    [summaries]
  );
  const outstanding = useMemo(
    () => Object.values(summaries).reduce((s, x) => s + (x?.outstanding || 0), 0),
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

  if (hydrated && !token) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl text-ocean">Your ownership portal</h1>
        <p className="mt-3 text-ocean/75">
          Sign in to view holdings, payment schedules, and make installment payments.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/auth/login?next=/investor">
            <Button>Sign in</Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="outline">Create account</Button>
          </Link>
          <Link href="/invest">
            <Button variant="ghost">Browse plans</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Owner portal</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Welcome{me?.name ? `, ${me.name}` : ''}</h1>
          <p className="mt-2 text-ocean/75">{me?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/invest">
            <Button>Buy another plan</Button>
          </Link>
          <Button variant="outline" onClick={loadAll}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-ocean/10 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-ocean/60">Portfolio</div>
          <div className="font-display mt-1 text-3xl text-ocean">৳ {portfolio.toLocaleString()}</div>
        </div>
        <div className="border border-ocean/10 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-ocean/60">Paid</div>
          <div className="font-display mt-1 text-3xl text-ocean">৳ {paid.toLocaleString()}</div>
        </div>
        <div className="border border-gold/40 bg-gold/10 p-5">
          <div className="text-xs uppercase tracking-wide text-ocean/60">Outstanding</div>
          <div className="font-display mt-1 text-3xl text-ocean">৳ {outstanding.toLocaleString()}</div>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-ocean">Pay next</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {upcoming.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 border border-ocean/10 bg-white p-4"
              >
                <div>
                  <div className="capitalize text-ocean">{i.type}</div>
                  <div className="text-sm text-ocean/70">{new Date(i.dueDate).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ocean">৳ {i.amount.toLocaleString()}</span>
                  <Button onClick={() => pay(i)}>Pay</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl text-ocean">Your holdings</h2>
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
                        {h.plan?.name || 'Stay booking'} · {h.suite?.id || h.booking.suiteId}
                      </div>
                      <div className="text-sm text-ocean/70">
                        {h.suite?.type} · {h.suite?.view}
                        {h.plan?.daysPerMonth ? ` · ${h.plan.daysPerMonth} days/mo` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="border border-ocean/15 px-2 py-1 text-xs capitalize text-ocean/80">
                    {h.booking.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-pearl p-3">
                    <div className="text-ocean/60">Total</div>
                    <div className="text-ocean">৳ {(h.booking.amountTotal || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-pearl p-3">
                    <div className="text-ocean/60">Paid</div>
                    <div className="text-ocean">৳ {(sum?.paidTotal || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-pearl p-3">
                    <div className="text-ocean/60">Due</div>
                    <div className="text-ocean">৳ {(sum?.outstanding || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(schedules[h.booking.id] || []).slice(0, 4).map((i) => (
                    <div key={i.id} className="flex items-center justify-between border-t border-ocean/10 pt-2 text-sm">
                      <div>
                        <span className="capitalize text-ocean">{i.type}</span>
                        <span className="ml-2 text-ocean/60">{new Date(i.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>৳ {i.amount.toLocaleString()}</span>
                        {i.status === 'due' ? (
                          <button
                            onClick={() => pay(i)}
                            className="rounded-md bg-ocean px-3 py-1 text-xs font-semibold text-white"
                          >
                            Pay
                          </button>
                        ) : (
                          <span className="text-xs text-ocean/50">Paid</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
          {holdings.length === 0 && !loading && (
            <div className="border border-ocean/10 p-6 text-ocean/70 lg:col-span-2">
              No holdings yet.{' '}
              <Link href="/invest" className="font-semibold text-ocean underline">
                Browse available plans
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
