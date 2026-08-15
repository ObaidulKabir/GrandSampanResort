'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';
import KycEditor from '@/components/KycEditor';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContext';

type Me = { id: string; name?: string; email: string; kyc?: boolean };
type Holding = { booking: any; suite: any; plan: any; client?: any };
type Summary = { booking: any; paidTotal: number; outstanding: number; nextDue: any; handoverDate: string };
type ScheduleItem = { id: string; bookingId: string; type: string; dueDate: string; amount: number; status: string };

const CONSTRUCTION_MILESTONES = [
  { id: 1, title: 'Land Deed & Environmental Clearance', date: 'Completed Q4 2025', progress: 100, status: 'completed' },
  { id: 2, title: 'Deep Piling & Substructure Foundation', date: 'Completed Q1 2026', progress: 100, status: 'completed' },
  { id: 3, title: '12-Storey Superstructure Casting', date: 'In Progress (85%)', progress: 85, status: 'active' },
  { id: 4, title: 'Façade, Balconies & Weatherproofing', date: 'Target Q4 2026', progress: 30, status: 'pending' },
  { id: 5, title: 'Luxury Interior Fitout & FF&E', date: 'Target Q2 2027', progress: 0, status: 'pending' },
  { id: 6, title: 'Soft Opening & Investor Handover', date: 'Target Q4 2027', progress: 0, status: 'pending' }
];

export default function InvestorPage() {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const logout = useAppStore((s) => s.logout);
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('holdings');
  const [me, setMe] = useState<Me | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referral, setReferral] = useState<any>(null);
  const [copyMsg, setCopyMsg] = useState('');

  // Payment modal state
  const [payModalItem, setPayModalItem] = useState<ScheduleItem | null>(null);
  const [payMethod, setPayMethod] = useState<'card' | 'bkash' | 'nagad' | 'bank'>('bkash');
  const [paying, setPaying] = useState(false);

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
        setError('Please sign in to view your portfolio');
        setLoading(false);
        return;
      }
      const [hRes, refRes] = await Promise.all([
        api(`/booking/investor/${investorId}`),
        api('/referral/me')
      ]);
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
  const paidPercentage = portfolio > 0 ? Math.min(100, Math.round((paid / portfolio) * 100)) : 0;

  const upcoming = useMemo(() => {
    const items = Object.values(schedules).flat().filter((i) => i.status === 'due');
    return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 8);
  }, [schedules]);

  async function executePayment() {
    if (!payModalItem) return;
    setPaying(true);
    try {
      const res = await api('/payments/pay', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: payModalItem.bookingId,
          itemId: payModalItem.id,
          amount: payModalItem.amount,
          method: payMethod
        })
      });
      if (res?.ok) {
        success(`Payment of ${formatMoney(payModalItem.amount)} completed successfully!`);
        setPayModalItem(null);
        const sRes = await api(`/booking/${payModalItem.bookingId}/summary`);
        const scRes = await api(`/booking/${payModalItem.bookingId}/schedule`);
        setSummaries((prev) => ({ ...prev, [payModalItem.bookingId]: sRes?.summary }));
        setSchedules((prev) => ({ ...prev, [payModalItem.bookingId]: scRes?.schedule || [] }));
      } else {
        toastError(res?.error || 'Payment failed. Please try again.');
      }
    } catch {
      toastError('Payment processing error');
    }
    setPaying(false);
  }

  async function copyReferralLink() {
    const link = referral?.link;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyMsg('Link copied');
      success('Referral link copied to clipboard!');
      setTimeout(() => setCopyMsg(''), 2500);
    } catch {
      setCopyMsg(link);
    }
  }

  const tabItems: TabItem[] = [
    { id: 'holdings', label: 'My Suite Holdings', icon: <span>🏢</span>, badge: <Badge size="sm">{holdings.length}</Badge> },
    { id: 'schedule', label: 'Payment Schedules', icon: <span>🗓️</span>, badge: upcoming.length > 0 ? <Badge variant="warning" size="sm">{upcoming.length} Due</Badge> : undefined },
    { id: 'progress', label: 'Construction Milestones', icon: <span>🏗️</span> },
    { id: 'referrals', label: 'Broker & Referral Hub', icon: <span>🤝</span> }
  ];

  if (hydrated && !token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
        <div className="rounded-2xl border border-gold/30 bg-white p-8 text-center shadow-xl">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-2xl">
            🏛️
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold text-ocean md:text-4xl">Owner &amp; Investor Portal</h1>
          <p className="mt-3 text-sm text-ocean/75 sm:text-base leading-relaxed">
            Sign in to access your registered suite fractional deeds, live amortization schedules, milestone tracking, and dividend payout statements.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/login?next=/investor">
              <Button className="w-full sm:w-auto">Sign In to Portfolio</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="w-full sm:w-auto">Create Account</Button>
            </Link>
            <Link href="/invest">
              <Button variant="ghost" className="w-full sm:w-auto">Explore Available Plans</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      {/* Header Profile Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ocean/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold" size="sm" dot>Verified Ownership Portal</Badge>
            {me?.kyc && <Badge variant="success" size="sm">KYC Approved</Badge>}
          </div>
          <h1 className="font-display mt-2 text-3xl font-bold text-ocean sm:text-4xl">
            Welcome back{me?.name ? `, ${me.name}` : ''}
          </h1>
          <p className="mt-1 text-xs text-ocean/65">{me?.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invest">
            <Button className="text-xs">Browse New Plans</Button>
          </Link>
          <Button variant="outline" className="text-xs" onClick={loadAll}>
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </Button>
          <Button variant="ghost" className="text-xs text-rose-600 hover:bg-rose-50" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* High-Impact Portfolio Metric Cards */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Portfolio Asset Value"
          isMoney
          moneyAmount={portfolio}
          variant="ocean"
          icon={<span className="text-lg">🏛️</span>}
          subtext={`${holdings.length} Fractional suite shares`}
        />
        <StatCard
          label="Paid Capital (Deposits & Dues)"
          isMoney
          moneyAmount={paid}
          variant="gold"
          icon={<span className="text-lg">💳</span>}
          subtext={`${paidPercentage}% of total committed`}
        />
        <StatCard
          label="Remaining Balance Due"
          isMoney
          moneyAmount={outstanding}
          variant="default"
          icon={<span className="text-lg">⏳</span>}
          subtext="Spread across installment tenors"
        />
        <StatCard
          label="Total Referral Rewards"
          isMoney
          moneyAmount={referral?.totals?.totalIncentive || 0}
          variant="pearl"
          icon={<span className="text-lg">🎁</span>}
          subtext={`${formatMoney(referral?.totals?.paid || 0)} Paid Out`}
        />
      </section>

      {/* Overall Payment Progress Bar */}
      {portfolio > 0 && (
        <div className="mt-6 rounded-xl border border-ocean/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-ocean">Overall Equity Amortization Progress</span>
            <span className="text-[#997D25] font-bold">{paidPercentage}% Equity Paid</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-pearl">
            <div
              className="h-full bg-gradient-to-r from-ocean via-ocean-light to-gold transition-all duration-700"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mt-10">
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} variant="underline" />
      </div>

      {/* TAB 1: HOLDINGS */}
      {activeTab === 'holdings' && (
        <div className="mt-6 space-y-6">
          {loading && holdings.length === 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : holdings.length === 0 ? (
            <div className="rounded-xl border border-ocean/10 bg-white p-10 text-center text-ocean/70">
              <p className="text-base font-semibold text-ocean">You do not hold any registered shares yet.</p>
              <p className="mt-1 text-xs">Reserve a suite share from 10% downpayment to begin earning quarterly dividends.</p>
              <div className="mt-5">
                <Link href="/invest">
                  <Button>Explore Available Share Plans</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {holdings.map((h) => {
                const sum = summaries[h.booking.id];
                return (
                  <article
                    key={h.booking.id}
                    className="relative overflow-hidden rounded-xl border border-ocean/10 bg-white p-6 shadow-sm transition hover:border-gold/40 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xl font-bold text-ocean">
                            Suite {h.suite?.id || h.booking.suiteId} &middot; {h.plan?.name || 'Timeshare Plan'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-ocean/65">
                          {h.suite?.type} &middot; <span className="capitalize">{h.suite?.view}</span> View &middot; Floor {h.suite?.floor || 1} &middot; {h.plan?.daysPerMonth ? `${h.plan.daysPerMonth} days stay/mo` : '30 days/yr'}
                        </p>
                      </div>
                      <Badge
                        variant={h.booking.status === 'confirmed' ? 'success' : h.booking.status === 'reserved' ? 'gold' : 'neutral'}
                        size="sm"
                        dot
                      >
                        {h.booking.status}
                      </Badge>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-pearl p-3.5 text-center text-xs">
                      <div>
                        <span className="text-ocean/55 block">Total Price</span>
                        <span className="font-bold text-ocean text-sm mt-0.5 block">
                          {formatMoney(h.booking.amountTotal || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-ocean/55 block">Paid To Date</span>
                        <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                          {formatMoney(sum?.paidTotal || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-ocean/55 block">Remaining</span>
                        <span className="font-bold text-[#997D25] text-sm mt-0.5 block">
                          {formatMoney(sum?.outstanding || 0)}
                        </span>
                      </div>
                    </div>

                    {/* KYC & Nominee Details Form */}
                    {h.client && h.booking.status !== 'cancelled' && (
                      <div className="mt-6 border-t border-ocean/10 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-ocean">
                            Deed &amp; Nominee Information
                          </h4>
                          <span className="text-[11px] text-ocean/60">Visible in Public Catalog</span>
                        </div>
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
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULE & DUES */}
      {activeTab === 'schedule' && (
        <div className="mt-6 space-y-6">
          {upcoming.length > 0 && (
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-ocean">Immediate Action Required</h3>
                  <p className="text-xs text-ocean/75">You have {upcoming.length} installment payments due.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-ocean/10 bg-white p-3.5 shadow-sm"
                  >
                    <div>
                      <div className="capitalize font-bold text-ocean text-xs">{item.type}</div>
                      <div className="text-[11px] text-ocean/60">Due: {formatDate(item.dueDate)}</div>
                      <div className="text-xs font-bold text-ocean mt-0.5">{formatMoney(item.amount)}</div>
                    </div>
                    <Button
                      onClick={() => setPayModalItem(item)}
                      className="px-3 py-1.5 text-xs bg-ocean text-white"
                    >
                      Pay Now
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Schedule List across all holdings */}
          <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
            <div className="border-b border-ocean/10 bg-pearl px-5 py-3">
              <h3 className="font-display text-base font-bold text-ocean">Complete Installment Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ocean/10 bg-pearl/50 text-ocean/60 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3">Suite / Holding</th>
                    <th className="px-5 py-3">Milestone Type</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ocean/10">
                  {Object.entries(schedules).flatMap(([bId, items]) =>
                    items.map((it) => (
                      <tr key={it.id} className="hover:bg-pearl/30 transition">
                        <td className="px-5 py-3.5 font-medium text-ocean">Booking #{bId.slice(0, 8)}</td>
                        <td className="px-5 py-3.5 capitalize font-semibold text-ocean">{it.type}</td>
                        <td className="px-5 py-3.5 text-ocean/70">{formatDate(it.dueDate)}</td>
                        <td className="px-5 py-3.5 font-bold text-ocean">{formatMoney(it.amount)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={it.status === 'due' ? 'warning' : 'success'} size="sm" dot>
                            {it.status === 'due' ? 'Payment Due' : 'Paid & Settled'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {it.status === 'due' ? (
                            <button
                              type="button"
                              onClick={() => setPayModalItem(it)}
                              className="rounded-md bg-ocean px-3 py-1 text-xs font-semibold text-white transition hover:bg-ocean/90"
                            >
                              Pay
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => success(`Receipt downloaded for ${formatMoney(it.amount)} (${it.type})`)}
                              className="text-xs font-semibold text-ocean/70 hover:text-gold underline"
                            >
                              Download Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONSTRUCTION PROGRESS TRACKER */}
      {activeTab === 'progress' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ocean/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-ocean">Resort Construction &amp; Development Roadmap</h3>
                <p className="mt-1 text-xs text-ocean/70">
                  Live updates from the Marine Drive site in Cox&apos;s Bazar. Audited monthly by project structural engineers.
                </p>
              </div>
              <Badge variant="gold" size="md">Phase 3 in Active Construction</Badge>
            </div>

            <div className="mt-6 space-y-6">
              {CONSTRUCTION_MILESTONES.map((m, idx) => (
                <div key={m.id} className="relative flex items-start gap-4">
                  {/* Timeline connector line */}
                  {idx < CONSTRUCTION_MILESTONES.length - 1 && (
                    <span
                      className={`absolute left-4 top-8 -bottom-6 w-0.5 ${
                        m.status === 'completed' ? 'bg-emerald-500' : m.status === 'active' ? 'bg-gold' : 'bg-ocean/15'
                      }`}
                    />
                  )}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                      m.status === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : m.status === 'active'
                        ? 'border-2 border-gold bg-ocean text-gold'
                        : 'border border-ocean/20 bg-pearl text-ocean/40'
                    }`}
                  >
                    {m.status === 'completed' ? '✓' : idx + 1}
                  </span>
                  <div className="flex-1 rounded-lg border border-ocean/10 bg-pearl/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-ocean">{m.title}</h4>
                      <span className="text-xs font-semibold text-ocean/60">{m.date}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${
                          m.status === 'completed' ? 'bg-emerald-500' : 'bg-gold'
                        }`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REFERRAL & BROKER HUB */}
      {activeTab === 'referrals' && (
        <div className="mt-6 space-y-6">
          {referral?.code ? (
            <div className="rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ocean/10 pb-5">
                <div>
                  <Badge variant="gold" size="sm" dot>Broker &amp; Owner Referral Program</Badge>
                  <h3 className="font-display mt-2 text-2xl font-bold text-ocean">Your Referral Commission Ledger</h3>
                  <p className="mt-1 text-xs text-ocean/70 leading-relaxed max-w-xl">
                    Earn <strong>{referral.policy?.incentivePct ?? 2}%</strong> on every referred suite share sale. 
                    Payout is automated: {referral.policy?.tranche1Pct ?? 40}% upon booking deposit clearance, and {referral.policy?.tranche2Pct ?? 60}% upon downpayment completion.
                  </p>
                </div>
                <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ocean/60">Your Exclusive Code</span>
                  <div className="font-display text-2xl font-bold tracking-widest text-ocean">{referral.code}</div>
                </div>
              </div>

              {/* Link Copy Box */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={referral.link}
                  className="flex-1 rounded-lg border border-ocean/20 bg-pearl px-4 py-2.5 text-xs font-mono text-ocean select-all"
                />
                <Button onClick={copyReferralLink} className="text-xs">
                  {copyMsg || 'Copy Link'}
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Invest in luxury oceanfront suite ownership at Grand Sampan Resort Cox's Bazar: ${referral.link}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <span>💬</span> Share on WhatsApp
                </a>
              </div>

              {/* Commission Stats */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-pearl p-4">
                  <span className="text-xs text-ocean/60 block">Total Accrued</span>
                  <span className="font-display text-lg font-bold text-ocean mt-1 block">
                    {formatMoney(referral.totals?.totalIncentive || 0)}
                  </span>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <span className="text-xs text-emerald-800 block">Unlocked &amp; Ready</span>
                  <span className="font-display text-lg font-bold text-emerald-900 mt-1 block">
                    {formatMoney(referral.totals?.unlocked || 0)}
                  </span>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <span className="text-xs text-amber-800 block">Waiting Tranche 2</span>
                  <span className="font-display text-lg font-bold text-amber-900 mt-1 block">
                    {formatMoney(referral.totals?.waiting || 0)}
                  </span>
                </div>
                <div className="rounded-lg bg-gold/15 border border-gold/40 p-4">
                  <span className="text-xs text-[#886915] block">Disbursed to Bank</span>
                  <span className="font-display text-lg font-bold text-ocean mt-1 block">
                    {formatMoney(referral.totals?.paid || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-ocean/10 bg-white p-8 text-center text-ocean/70">
              No referral account active. Please contact the Grand Sampan desk to generate your partner link.
            </div>
          )}
        </div>
      )}

      {/* Payment Processing Modal */}
      <Modal
        isOpen={!!payModalItem}
        onClose={() => setPayModalItem(null)}
        title="Settle Installment Payment"
        description={`Paying for Booking #${payModalItem?.bookingId.slice(0, 8)} · ${payModalItem?.type}`}
        maxWidth="md"
      >
        {payModalItem && (
          <div className="space-y-4">
            <div className="rounded-lg bg-pearl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-ocean/60 block">Amount Payable</span>
                <span className="font-display text-2xl font-bold text-ocean">
                  {formatMoney(payModalItem.amount)}
                </span>
              </div>
              <Badge variant="gold" size="sm">Instant Confirmation</Badge>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ocean/70 block mb-2">
                Select Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bkash', label: 'bKash Online', icon: '📱' },
                  { id: 'nagad', label: 'Nagad Pay', icon: '📲' },
                  { id: 'card', label: 'Visa / Mastercard', icon: '💳' },
                  { id: 'bank', label: 'BEFTN / Wire Transfer', icon: '🏦' }
                ].map((meth) => (
                  <button
                    key={meth.id}
                    type="button"
                    onClick={() => setPayMethod(meth.id as any)}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-left text-xs font-semibold transition ${
                      payMethod === meth.id
                        ? 'border-gold bg-ocean text-white shadow-sm'
                        : 'border-ocean/15 bg-white text-ocean hover:border-ocean/30'
                    }`}
                  >
                    <span>{meth.icon}</span>
                    <span>{meth.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3 pt-2">
              <Button
                onClick={executePayment}
                disabled={paying}
                className="w-full"
              >
                {paying ? 'Processing...' : `Confirm & Pay ${formatMoney(payModalItem.amount)}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPayModalItem(null)}
                className="w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
