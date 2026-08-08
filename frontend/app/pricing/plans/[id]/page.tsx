'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';
import SuitePlans from '@/components/SuitePlans';

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
};
type Suite = { id: string; type: string; view: string; floor: number; size: number };
type Rule = { start: string; end: string; price: number };

export default function PlanDetailsPage({ params }: { params: { id: string } }) {
  const planId = params.id;
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrate = useAppStore((s) => s.hydrate);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showTools, setShowTools] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    bookingId: string;
    depositPaid: number;
    nextDue?: { type: string; dueDate: string; amount: number };
  } | null>(null);

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [depositPct, setDepositPct] = useState<number>(10);
  const [downPct, setDownPct] = useState<number>(20);
  const [cadence, setCadence] = useState<'monthly' | 'quarterly'>('monthly');
  const [tab, setTab] = useState<'payment' | 'returns'>('payment');
  const [adr, setAdr] = useState<number>(8000);
  const [occupancy, setOccupancy] = useState<number>(0.6);
  const [costPct, setCostPct] = useState<number>(0.15);
  const [rentUpliftPct, setRentUpliftPct] = useState<number>(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const pRes = await api(`/timeshares/${planId}`);
        const p = pRes?.id ? pRes : pRes?.plan || null;
        if (p) {
          setPlan(p);
          if (p.suiteId) {
            const sRes = await api(`/suites/${p.suiteId}`);
            setSuite(sRes?.suite || sRes || null);
          }
          const rRes = await api(`/pricing/plans/${planId}`);
          setRules(Array.isArray(rRes?.rules) ? rRes.rules : []);
        }
      } catch {
        setError('Failed to load plan details');
      }
      setLoading(false);
    }
    load();
  }, [planId]);

  async function confirmInvestment() {
    if (!plan?.suiteId) {
      setStatus('This plan is not linked to a suite');
      return;
    }
    if (!token || !user?.id) {
      router.push(`/auth/login?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
      return;
    }
    const sold = (plan.planStatus || '').toLowerCase() !== 'unsold';
    if (sold) {
      setStatus('This plan is no longer available');
      return;
    }
    setBuying(true);
    setStatus('Creating your investment...');
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      const res = await api('/booking', {
        method: 'POST',
        body: JSON.stringify({
          suiteId: plan.suiteId,
          planId: plan.id,
          start: start.toISOString(),
          end: end.toISOString(),
          investorId: user.id
        })
      });
      if (!res?.ok || !res.booking?.id) {
        setStatus(res?.error === 'conflict' ? 'Plan already sold or unavailable' : 'Purchase failed');
        setBuying(false);
        return;
      }
      const scheduleRes = await api(`/booking/${res.booking.id}/schedule`);
      const deposit = (scheduleRes?.schedule || []).find((i: any) => i.type === 'deposit');
      if (deposit) {
        await api('/payments/pay', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: res.booking.id,
            itemId: deposit.id,
            amount: deposit.amount,
            method: 'card'
          })
        });
      }
      const afterRes = await api(`/booking/${res.booking.id}/schedule`);
      const nextDue = (afterRes?.schedule || []).find((i: any) => i.status === 'due');
      setStatus('');
      setConfirmation({
        bookingId: res.booking.id,
        depositPaid: deposit?.amount || 0,
        nextDue: nextDue
          ? { type: nextDue.type, dueDate: nextDue.dueDate, amount: nextDue.amount }
          : undefined
      });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus('Purchase failed');
    }
    setBuying(false);
  }

  const discounted = typeof plan?.discountedPrice === 'number';
  const effectivePrice = discounted ? (plan!.discountedPrice as number) : plan?.price || 0;

  const depositPreview = useMemo(() => {
    return Math.round(effectivePrice * 0.1);
  }, [effectivePrice]);

  const schedule = useMemo(() => {
    if (!plan) return [];
    const total = effectivePrice;
    const deposit = Math.round(total * (depositPct / 100) * 100) / 100;
    const down = Math.round(total * (downPct / 100) * 100) / 100;
    const remainder = Math.round((total - deposit - down) * 100) / 100;
    const durationMonths = plan.lockIn ?? 36;
    const stepMonths = cadence === 'monthly' ? 1 : 3;
    const installments = cadence === 'monthly' ? durationMonths : Math.ceil(durationMonths / 3);
    const baseAmount = Math.floor((remainder / installments) * 100) / 100;
    const start = new Date(startDate);
    const items: { id: string; type: string; dueDate: string; amount: number }[] = [];
    items.push({ id: 'S1', type: 'deposit', dueDate: start.toISOString(), amount: deposit });
    const downDate = new Date(start);
    downDate.setMonth(downDate.getMonth() + 3);
    items.push({ id: 'S2', type: 'downpayment', dueDate: downDate.toISOString(), amount: down });
    let sum = 0;
    for (let i = 1; i <= installments; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + 3 + i * stepMonths);
      const amt = i === installments ? Math.round((remainder - sum) * 100) / 100 : baseAmount;
      sum += amt;
      items.push({ id: 'S-' + i, type: 'installment', dueDate: due.toISOString(), amount: amt });
    }
    return items;
  }, [plan, startDate, depositPct, downPct, cadence]);

  const available = (plan?.planStatus || 'Unsold').toLowerCase() === 'unsold';

  if (confirmation) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="border border-gold/40 bg-white p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Purchase confirmed</p>
          <h1 className="font-display mt-2 text-4xl text-ocean">Welcome to ownership</h1>
          <p className="mt-3 text-ocean/75">
            {plan?.name ? `Your ${plan.name} plan` : 'Your plan'}
            {suite?.id ? ` on suite ${suite.id}` : ''} is reserved and the deposit has been received.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Booking reference</div>
              <div className="mt-1 font-mono text-sm text-ocean">{confirmation.bookingId}</div>
            </div>
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Deposit paid</div>
              <div className="font-display mt-1 text-2xl text-ocean">
                ৳ {confirmation.depositPaid.toLocaleString()}
              </div>
            </div>
            {confirmation.nextDue && (
              <div className="border border-gold/40 bg-gold/10 p-4 sm:col-span-2">
                <div className="text-xs uppercase tracking-wide text-ocean/60">Next payment</div>
                <div className="mt-1 text-ocean">
                  <span className="capitalize">{confirmation.nextDue.type}</span> · ৳{' '}
                  {confirmation.nextDue.amount.toLocaleString()} due{' '}
                  {new Date(confirmation.nextDue.dueDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/investor">
              <Button>Open owner portal</Button>
            </Link>
            <Link href="/invest">
              <Button variant="outline">Browse more plans</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-ocean/60">
            Our sales team will contact you for KYC verification and paperwork. Questions?{' '}
            <a href="mailto:info@grandsampan.com" className="underline">
              info@grandsampan.com
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Share plan</p>
          <h1 className="font-display mt-2 text-4xl text-ocean">{plan?.name || 'Plan Details'}</h1>
          <p className="mt-2 text-ocean/75">
            {plan
              ? `${plan.daysPerMonth} days/month · ${plan.planType || 'DPM'} · Lock-in ${plan.lockIn ?? 36} months`
              : 'Loading...'}
          </p>
          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
          {status && <div className="mt-4 rounded-md border border-ocean/15 bg-ocean/5 p-3 text-ocean">{status}</div>}

          {discounted && (
            <div className="mt-4 border border-gold bg-gold/10 px-4 py-3 text-ocean">
              <span className="font-semibold">✦ {plan?.promoName}</span> — {plan?.discountPct}% off until{' '}
              {plan?.promoEndsAt ? new Date(plan.promoEndsAt).toLocaleDateString() : ''}
            </div>
          )}

          <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border border-ocean/10 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Price</div>
              {discounted ? (
                <>
                  <div className="text-sm text-ocean/50 line-through">৳ {(plan?.price || 0).toLocaleString()}</div>
                  <div className="font-display text-xl text-ocean">৳ {effectivePrice.toLocaleString()}</div>
                </>
              ) : (
                <div className="mt-1 font-display text-xl text-ocean">৳ {(plan?.price || 0).toLocaleString()}</div>
              )}
            </div>
            {[
              ['Deposit due', `৳ ${depositPreview.toLocaleString()}`],
              ['Entitlement', `${plan?.daysPerMonth || 0} days/mo`],
              ['Suite', suite?.id || plan?.suiteId || '—']
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
                  {suite?.type || 'Suite'} · {suite?.view || '—'}
                </div>
                <div className="text-sm text-ocean/70">
                  Floor {suite?.floor ?? '—'} · {suite?.size ?? '—'} sq ft
                </div>
              </div>
            </div>
          </section>

          {plan?.suiteId && <SuitePlans suiteId={plan.suiteId} />}
        </div>

        <aside className="border border-gold/40 bg-white p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-2xl text-ocean">Complete purchase</h2>
          <p className="mt-2 text-sm text-ocean/75">
            Reserves this plan, creates your schedule, and captures the 10% deposit.
          </p>
          <label className="mt-5 block text-sm text-ocean">
            Contract start
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field mt-1"
            />
          </label>
          <div className="mt-4 border-t border-ocean/10 pt-4 text-sm text-ocean/80">
            <div className="flex justify-between">
              <span>Plan price</span>
              <span className={discounted ? 'line-through text-ocean/50' : ''}>
                ৳ {(plan?.price || 0).toLocaleString()}
              </span>
            </div>
            {discounted && (
              <div className="mt-1 flex justify-between">
                <span className="text-ocean/70">
                  {plan?.promoName} ({plan?.discountPct}%)
                </span>
                <span className="font-semibold text-gold">
                  − ৳ {((plan?.price || 0) - effectivePrice).toLocaleString()}
                </span>
              </div>
            )}
            {discounted && (
              <div className="mt-2 flex justify-between border-t border-ocean/10 pt-2 font-semibold text-ocean">
                <span>Offer price</span>
                <span>৳ {effectivePrice.toLocaleString()}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between font-semibold text-ocean">
              <span>Deposit today</span>
              <span>৳ {depositPreview.toLocaleString()}</span>
            </div>
          </div>
          <Button
            className="mt-6 w-full bg-gold text-ocean hover:bg-gold/90"
            onClick={confirmInvestment}
            disabled={buying || loading || !available}
          >
            {buying ? 'Processing...' : available ? 'Confirm & pay deposit' : 'No longer available'}
          </Button>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/investor" className="text-ocean underline">
              Dashboard
            </Link>
            <a href="mailto:info@grandsampan.com" className="text-ocean underline">
              Contact sales
            </a>
          </div>
        </aside>
      </div>

      <section className="mt-14 border-t border-ocean/10 pt-10">
        <button
          type="button"
          onClick={() => setShowTools((v) => !v)}
          className="text-sm font-semibold text-ocean underline"
        >
          {showTools ? 'Hide' : 'Show'} payment tools & returns calculator
        </button>

        {showTools && (
          <div className="mt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setTab('payment')}
                className={`rounded-md border px-4 py-2 text-sm ${
                  tab === 'payment' ? 'border-ocean bg-ocean text-white' : 'border-ocean/20 text-ocean'
                }`}
              >
                Payment schedule
              </button>
              <button
                onClick={() => setTab('returns')}
                className={`rounded-md border px-4 py-2 text-sm ${
                  tab === 'returns' ? 'border-ocean bg-ocean text-white' : 'border-ocean/20 text-ocean'
                }`}
              >
                Returns calculator
              </button>
            </div>

            {tab === 'payment' && (
              <div className="mt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label className="text-sm text-ocean">
                    Deposit (%)
                    <input
                      type="number"
                      value={depositPct}
                      onChange={(e) => setDepositPct(Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="text-sm text-ocean">
                    Downpayment (%)
                    <input
                      type="number"
                      value={downPct}
                      onChange={(e) => setDownPct(Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="text-sm text-ocean">
                    Cadence
                    <select
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value as 'monthly' | 'quarterly')}
                      className="field mt-1"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 overflow-auto border border-ocean/10 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ocean">
                        <th className="p-3">Type</th>
                        <th className="p-3">Due</th>
                        <th className="p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.slice(0, 8).map((i) => (
                        <tr key={i.id} className="border-t border-ocean/10">
                          <td className="p-3 capitalize">{i.type}</td>
                          <td className="p-3">{new Date(i.dueDate).toLocaleDateString()}</td>
                          <td className="p-3">৳ {i.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-ocean/60">Preview only. Checkout uses the standard 10% deposit schedule.</p>
              </div>
            )}

            {tab === 'returns' && (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-sm text-ocean">
                  ADR (BDT)
                  <input type="number" value={adr} onChange={(e) => setAdr(Number(e.target.value))} className="field mt-1" />
                </label>
                <label className="text-sm text-ocean">
                  Occupancy (0–1)
                  <input
                    type="number"
                    step="0.01"
                    value={occupancy}
                    onChange={(e) => setOccupancy(Number(e.target.value))}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm text-ocean">
                  Operating cost (%)
                  <input
                    type="number"
                    step="0.01"
                    value={costPct}
                    onChange={(e) => setCostPct(Number(e.target.value))}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm text-ocean">
                  Rental uplift (%)
                  <input
                    type="number"
                    step="0.01"
                    value={rentUpliftPct}
                    onChange={(e) => setRentUpliftPct(Number(e.target.value))}
                    className="field mt-1"
                  />
                </label>
                <div className="border border-ocean/10 bg-white p-4 md:col-span-2">
                  <div className="text-xs text-ocean/60">Illustrative annual net</div>
                  <div className="font-display mt-1 text-2xl text-ocean">
                    ৳{' '}
                    {(() => {
                      const gross = adr * (1 + rentUpliftPct / 100) * (plan?.daysPerMonth || 0) * occupancy;
                      const net = gross * (1 - costPct / 100);
                      return Math.round(net * 12).toLocaleString();
                    })()}
                  </div>
                </div>
              </div>
            )}

            {rules.length > 0 && (
              <p className="mt-4 text-sm text-ocean/70">{rules.length} pricing rule(s) on file for this plan.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
