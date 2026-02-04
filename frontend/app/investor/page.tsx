'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';

type Me = { id: string; name: string; email: string };
type Holding = { booking: any; suite: any; plan: any };
type Summary = { booking: any; paidTotal: number; outstanding: number; nextDue: any; handoverDate: string };
type ScheduleItem = { id: string; bookingId: string; type: string; dueDate: string; amount: number; status: string };

export default function InvestorPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const meRes = await api('/auth/me', { headers: { Authorization: 'Bearer admin' } });
      const user = meRes?.user || null;
      setMe(user);
      if (user?.id) {
        const hRes = await api(`/booking/investor/${user.id}`);
        const hs = hRes?.holdings || [];
        setHoldings(hs);
        const sumPairs = await Promise.all(
          hs.map(async (h: Holding) => {
            const sRes = await api(`/booking/${h.booking.id}/summary`);
            const scRes = await api(`/booking/${h.booking.id}/schedule`);
            return {
              id: h.booking.id,
              summary: sRes?.summary,
              schedule: scRes?.schedule || []
            };
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
      }
    } catch {
      setError('Failed to load investor data');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const upcoming = useMemo(() => {
    const items = Object.values(schedules).flat().filter((i) => i.status === 'due');
    return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 10);
  }, [schedules]);

  async function pay(item: ScheduleItem) {
    try {
      await api('/payments/pay', {
        method: 'POST',
        body: JSON.stringify({ bookingId: item.bookingId, itemId: item.id, amount: item.amount, method: 'cash' })
      });
      await refreshBooking(item.bookingId);
    } catch {}
  }
  async function refreshBooking(bookingId: string) {
    const sRes = await api(`/booking/${bookingId}/summary`);
    const scRes = await api(`/booking/${bookingId}/schedule`);
    setSummaries((prev) => ({ ...prev, [bookingId]: sRes?.summary }));
    setSchedules((prev) => ({ ...prev, [bookingId]: scRes?.schedule || [] }));
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-16 mt-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair Display'] text-4xl text-ocean">Investor Dashboard</h1>
          <p className="mt-2 text-ocean/80">{me ? `${me.name} • ${me.email}` : 'Loading profile...'}</p>
        </div>
        <button onClick={loadAll} className="rounded bg-ocean px-4 py-2 text-white">{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Portfolio value</div>
          <div className="mt-1 text-2xl text-ocean">
            ৳ {holdings.reduce((s, h) => s + (h.booking.amountTotal || 0), 0)}
          </div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Paid to date</div>
          <div className="mt-1 text-2xl text-ocean">
            ৳ {Object.values(summaries).reduce((s, x) => s + (x?.paidTotal || 0), 0)}
          </div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Outstanding</div>
          <div className="mt-1 text-2xl text-ocean">
            ৳ {Object.values(summaries).reduce((s, x) => s + (x?.outstanding || 0), 0)}
          </div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Next due</div>
          <div className="mt-1 text-2xl text-ocean">
            ৳ {Object.values(summaries).map((x) => x?.nextDue?.amount || 0).reduce((a, b) => a + b, 0)}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Holdings</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {holdings.map((h) => {
            const sum = summaries[h.booking.id];
            return (
              <div key={h.booking.id} className="rounded-lg border border-gold/30 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8">
                      <Image src="/images/icons/balcony.svg" alt="Suite" fill sizes="32px" />
                    </div>
                    <div>
                      <div className="text-ocean">{h.suite?.type} • {h.suite?.view}</div>
                      <div className="text-ocean/70 text-sm">Suite {h.suite?.id} • {h.plan?.name} • {h.plan?.daysPerMonth} days/month</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-ocean">Handover: {sum ? new Date(sum.handoverDate).toLocaleDateString() : '—'}</div>
                    <div className="text-ocean/70 text-sm">Status: {h.booking.status}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded border border-ocean/10 bg-ocean/5 p-3">
                    <div className="text-ocean/70">Total</div>
                    <div className="text-ocean">৳ {h.booking.amountTotal || 0}</div>
                  </div>
                  <div className="rounded border border-ocean/10 bg-ocean/5 p-3">
                    <div className="text-ocean/70">Paid</div>
                    <div className="text-ocean">৳ {sum?.paidTotal || 0}</div>
                  </div>
                  <div className="rounded border border-ocean/10 bg-ocean/5 p-3">
                    <div className="text-ocean/70">Outstanding</div>
                    <div className="text-ocean">৳ {sum?.outstanding || 0}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-ocean">Payment Schedule</h3>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(schedules[h.booking.id] || []).map((i) => (
                      <div key={i.id} className="flex items-center justify-between rounded border border-ocean/10 bg-white p-2">
                        <div>
                          <div className="text-ocean">{i.type}</div>
                          <div className="text-ocean/70 text-sm">{new Date(i.dueDate).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ocean">৳ {i.amount}</span>
                          {i.status === 'due' ? (
                            <button onClick={() => pay(i)} className="rounded bg-ocean px-3 py-1 text-white">Pay</button>
                          ) : (
                            <span className="rounded border border-ocean/20 px-2 py-1 text-xs text-ocean/70">Paid</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {holdings.length === 0 && !loading && (
            <div className="rounded border border-ocean/10 p-4 text-ocean/70">No holdings found</div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Upcoming Payments</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {upcoming.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded border border-gold/30 bg-white p-3">
              <div>
                <div className="text-ocean">{i.type}</div>
                <div className="text-ocean/70 text-sm">{new Date(i.dueDate).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ocean">৳ {i.amount}</span>
                <button onClick={() => pay(i)} className="rounded bg-ocean px-3 py-1 text-white">Pay</button>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <div className="rounded border border-ocean/10 p-4 text-ocean/70">No upcoming payments</div>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Documents & Support</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a className="rounded border border-gold/30 bg-white p-4 text-ocean" href="#">Investment Agreement (sample)</a>
          <a className="rounded border border-gold/30 bg-white p-4 text-ocean" href="#">Payment Receipts</a>
          <a className="rounded border border-gold/30 bg-white p-4 text-ocean" href="#">KYC Documents</a>
          <a className="rounded border border-gold/30 bg-white p-4 text-ocean" href="#">Support: +880 17 0000 0000</a>
        </div>
      </section>
    </main>
  );
}

