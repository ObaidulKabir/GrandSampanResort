'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/ToastContext';

type Reward = {
  id: string;
  bookingId: string;
  saleAmount: number;
  ratePct: number;
  totalIncentive: number;
  tranche1Amount: number;
  tranche1Status: string;
  tranche2Amount: number;
  tranche2Status: string;
  status: string;
  paidAt?: string | null;
  createdAt?: string;
  referrer?: { id: string; name?: string; email?: string; referralCode?: string };
  booking?: { id: string; planId?: string; amountTotal?: number; status?: string };
};

type ReferrerRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  referralCode?: string | null;
  referralIncentivePct?: number | null;
  effectiveIncentivePct: number;
  usingDefault: boolean;
};

export default function AdminReferralsPage() {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState('rewards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [policyDraft, setPolicyDraft] = useState({ incentivePct: 2, tranche1Pct: 40, tranche2Pct: 60, enabled: true });
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [savingRateId, setSavingRateId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; name?: string; email?: string; role?: string }[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const [addRate, setAddRate] = useState('');
  const [brokerQ, setBrokerQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const [listRes, policyRes, referrersRes, usersRes] = await Promise.all([
        api(`/referral/admin/rewards${q}`),
        api('/referral/policy'),
        api('/referral/admin/referrers'),
        api('/auth/users')
      ]);
      if (!listRes?.ok) {
        setError(listRes?.error || 'Failed to load rewards');
        setRewards([]);
      } else {
        setRewards(listRes.rewards || []);
      }
      if (policyRes?.ok && policyRes.policy) {
        setPolicy(policyRes.policy);
        setPolicyDraft({
          enabled: policyRes.policy.enabled !== false,
          incentivePct: Number(policyRes.policy.incentivePct) || 2,
          tranche1Pct: Number(policyRes.policy.tranche1Pct) || 40,
          tranche2Pct: Number(policyRes.policy.tranche2Pct) || 60
        });
      }
      if (referrersRes?.ok) {
        const rows: ReferrerRow[] = referrersRes.referrers || [];
        setReferrers(rows);
        const drafts: Record<string, string> = {};
        for (const r of rows) {
          drafts[r.id] = r.usingDefault ? '' : String(r.referralIncentivePct ?? '');
        }
        setRateDrafts(drafts);
      }
      if (usersRes?.ok) {
        setAllUsers(usersRes.users || []);
      }
    } catch {
      setError('Failed to load rewards');
      toastError('Failed to load rewards');
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const totalIncentive = rewards.reduce((s, r) => s + (r.totalIncentive || 0), 0);
    const paidTotal = rewards.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.totalIncentive || 0), 0);
    const pendingCount = rewards.filter((r) => r.status !== 'paid' && r.status !== 'void').length;
    return { totalIncentive, paidTotal, pendingCount, brokerCount: referrers.length };
  }, [rewards, referrers]);

  const filteredReferrers = useMemo(() => {
    const q = brokerQ.trim().toLowerCase();
    if (!q) return referrers;
    return referrers.filter((r) =>
      [r.name, r.email, r.referralCode, r.role, r.id]
        .map((x) => String(x || '').toLowerCase())
        .some((s) => s.includes(q))
    );
  }, [referrers, brokerQ]);

  const usersNotInReferrers = useMemo(() => {
    const have = new Set(referrers.map((r) => r.id));
    return allUsers.filter((u) => !have.has(u.id));
  }, [allUsers, referrers]);

  async function markPaid(id: string) {
    setActing(id);
    try {
      const res = await api(`/referral/admin/rewards/${encodeURIComponent(id)}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (res?.ok) {
        success('Reward tranche marked as paid and disbursed!');
        await load();
      } else {
        toastError(res?.error || 'Could not mark paid');
      }
    } catch {
      toastError('Payout status update error');
    } finally {
      setActing(null);
    }
  }

  async function savePolicy() {
    try {
      const res = await api('/referral/policy', {
        method: 'PUT',
        body: JSON.stringify(policyDraft)
      });
      if (res?.ok) {
        setPolicy(res.policy);
        success('Global referral policy saved successfully!');
        await load();
      } else {
        toastError(res?.error || 'Save failed');
      }
    } catch {
      toastError('Policy save error');
    }
  }

  async function saveReferrerRate(userId: string, raw: string) {
    setSavingRateId(userId);
    const trimmed = String(raw ?? '').trim();
    const body = trimmed === '' ? { incentivePct: null } : { incentivePct: Number(trimmed) };
    try {
      const res = await api(`/referral/admin/referrers/${encodeURIComponent(userId)}/rate`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      if (res?.ok) {
        success(trimmed === '' ? 'Reverted to global default rate' : 'Broker custom rate saved!');
        await load();
      } else {
        toastError(res?.error || 'Could not save broker rate');
      }
    } catch {
      toastError('Error saving broker rate');
    }
    setSavingRateId(null);
  }

  async function addBrokerRate() {
    if (!addUserId) {
      toastError('Please select a user');
      return;
    }
    await saveReferrerRate(addUserId, addRate);
    setAddUserId('');
    setAddRate('');
  }

  const tabs: TabItem[] = [
    { id: 'rewards', label: 'Reward Payout Ledger', icon: <span>💰</span>, badge: <Badge size="sm">{rewards.length}</Badge> },
    { id: 'brokers', label: 'Broker Custom Rates', icon: <span>👥</span>, badge: <Badge variant="gold" size="sm">{referrers.length}</Badge> },
    { id: 'policy', label: 'Global Referral Policy', icon: <span>⚖️</span> }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="gold" size="sm" dot>Broker &amp; Client Incentive Ledger</Badge>
          <h1 className="font-display mt-1 text-2xl font-bold text-ocean sm:text-3xl">
            Referrals &amp; Broker Payouts
          </h1>
          <p className="mt-1 text-xs text-ocean/65">
            Approve tranche commissions, override partner incentive rates, and track disbursed volumes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs" onClick={load}>
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
          </Button>
          <Link href="/admin/sales">
            <Button className="text-xs">Sales Desk &rarr;</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Accrued Commissions"
          isMoney
          moneyAmount={stats.totalIncentive}
          variant="ocean"
          icon={<span className="text-lg">💎</span>}
          subtext="Lifetime incentive ledger"
        />
        <StatCard
          label="Disbursed to Bank Accounts"
          isMoney
          moneyAmount={stats.paidTotal}
          variant="gold"
          icon={<span className="text-lg">🏦</span>}
          subtext="Settled broker payments"
        />
        <StatCard
          label="Pending Tranche Approvals"
          value={stats.pendingCount}
          variant={stats.pendingCount > 0 ? 'pearl' : 'default'}
          icon={<span className="text-lg">⏳</span>}
          subtext="Awaiting milestone clearance"
        />
        <StatCard
          label="Active Registered Brokers"
          value={stats.brokerCount}
          variant="pearl"
          icon={<span className="text-lg">🤝</span>}
          subtext="Partners with custom rates"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} variant="underline" />
      </div>

      {/* TAB 1: REWARD PAYOUT LEDGER */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ocean/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {['', 'partial', 'earned', 'paid', 'void', 'pending'].map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    statusFilter === s
                      ? 'bg-ocean text-white shadow-sm'
                      : 'bg-pearl text-ocean/70 hover:bg-ocean/10'
                  }`}
                >
                  {s || 'All Statuses'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ocean/10 bg-pearl/60 text-ocean/60 uppercase font-semibold">
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Sale Total</th>
                  <th className="px-4 py-3">Total Commission</th>
                  <th className="px-4 py-3">Tranche Milestones</th>
                  <th className="px-4 py-3">Payout Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean/10">
                {rewards.map((r) => (
                  <tr key={r.id} className="hover:bg-pearl/30 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ocean block">{r.referrer?.name || '—'}</span>
                      <span className="text-[11px] text-ocean/60 block">{r.referrer?.referralCode || r.referrer?.email}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/sales/${encodeURIComponent(r.bookingId)}`}
                        className="font-mono font-bold text-ocean underline hover:text-gold"
                      >
                        #{r.bookingId.slice(0, 8)}
                      </Link>
                      <span className="text-[11px] text-ocean/50 block">{r.booking?.planId || ''}</span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-ocean">{formatMoney(r.saleAmount)}</td>
                    <td className="px-4 py-3.5 font-bold text-ocean">
                      {formatMoney(r.totalIncentive)}
                      <span className="text-[11px] font-normal text-ocean/60 block">Rate: {r.ratePct}%</span>
                    </td>
                    <td className="px-4 py-3.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-ocean">T1:</span>
                        <span>{formatMoney(r.tranche1Amount)}</span>
                        <Badge variant={r.tranche1Status === 'earned' ? 'success' : 'neutral'} size="sm">
                          {r.tranche1Status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-ocean">T2:</span>
                        <span>{formatMoney(r.tranche2Amount)}</span>
                        <Badge variant={r.tranche2Status === 'earned' ? 'success' : 'neutral'} size="sm">
                          {r.tranche2Status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={r.status === 'paid' ? 'success' : r.status === 'void' ? 'danger' : 'gold'}
                        size="sm"
                        dot
                      >
                        {r.status}
                      </Badge>
                      {r.paidAt && <span className="text-[10px] text-ocean/50 block mt-0.5">{formatDate(r.paidAt)}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {r.status !== 'void' && r.status !== 'paid' && (
                        <button
                          type="button"
                          disabled={acting === r.id || (r.tranche1Status === 'pending' && r.tranche2Status === 'pending')}
                          onClick={() => markPaid(r.id)}
                          className="rounded-lg bg-ocean px-3 py-1.5 text-xs font-semibold text-white hover:bg-ocean/90 disabled:opacity-50"
                        >
                          {acting === r.id ? 'Processing...' : 'Mark Disbursed'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rewards.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ocean/60">
                      No referral commission rewards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BROKER CUSTOM RATES */}
      {activeTab === 'brokers' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-ocean/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-ocean min-w-[14rem] flex-1">
                Select User to Configure
                <select className="field mt-1 text-xs" value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
                  <option value="">Choose partner user…</option>
                  {usersNotInReferrers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.email})
                    </option>
                  ))}
                  {referrers.map((u) => (
                    <option key={`r-${u.id}`} value={u.id}>
                      {u.name || u.email} (Current: {u.effectiveIncentivePct}%)
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-ocean w-36">
                Custom Incentive %
                <input
                  className="field mt-1 text-xs"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="e.g. 3.5"
                  value={addRate}
                  onChange={(e) => setAddRate(e.target.value)}
                />
              </label>
              <Button type="button" onClick={addBrokerRate} disabled={!!savingRateId} className="text-xs">
                Save Partner Rate
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
            <div className="border-b border-ocean/10 bg-pearl px-5 py-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ocean">Partner &amp; Broker Rate Registry</h3>
              <input
                type="text"
                placeholder="Search broker name or code..."
                value={brokerQ}
                onChange={(e) => setBrokerQ(e.target.value)}
                className="rounded-lg border border-ocean/20 bg-white px-3 py-1 text-xs text-ocean outline-none w-48 sm:w-64"
              />
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ocean/10 bg-pearl/60 text-ocean/60 uppercase font-semibold">
                  <th className="px-4 py-3">Partner Name</th>
                  <th className="px-4 py-3">Role / Referral Code</th>
                  <th className="px-4 py-3">Override %</th>
                  <th className="px-4 py-3">Effective Commission</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean/10">
                {filteredReferrers.map((r) => (
                  <tr key={r.id} className="hover:bg-pearl/30">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ocean block">{r.name || '—'}</span>
                      <span className="text-[11px] text-ocean/60 block">{r.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-ocean font-medium block">{r.role || 'Investor'}</span>
                      <span className="font-mono text-[11px] text-gold font-bold block">{r.referralCode || 'No Code'}</span>
                    </td>
                    <td className="px-4 py-3 w-32">
                      <input
                        className="field text-xs py-1"
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="Default"
                        value={rateDrafts[r.id] ?? ''}
                        onChange={(e) =>
                          setRateDrafts((d) => ({
                            ...d,
                            [r.id]: e.target.value
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-ocean">
                      {r.effectiveIncentivePct}%
                      {r.usingDefault ? (
                        <span className="ml-1 text-[11px] text-ocean/50 font-normal">(Default Policy)</span>
                      ) : (
                        <span className="ml-1 text-[11px] text-gold font-bold">(Custom Rate)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={savingRateId === r.id}
                          onClick={() => saveReferrerRate(r.id, rateDrafts[r.id] ?? '')}
                          className="rounded-lg bg-ocean px-3 py-1 text-xs font-semibold text-white hover:bg-ocean/90"
                        >
                          {savingRateId === r.id ? '…' : 'Save'}
                        </button>
                        {!r.usingDefault && (
                          <button
                            type="button"
                            disabled={savingRateId === r.id}
                            onClick={() => saveReferrerRate(r.id, '')}
                            className="rounded-lg border border-ocean/20 px-2.5 py-1 text-xs text-ocean hover:bg-ocean/5"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL REFERRAL POLICY */}
      {activeTab === 'policy' && (
        <section className="space-y-6 rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
          <div className="border-b border-ocean/10 pb-4">
            <h2 className="font-display text-lg font-bold text-ocean">Global Referral &amp; Broker Policy</h2>
            <p className="text-xs text-ocean/65">
              Default commission rates applied to all partner referrals unless a custom rate override is set.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="text-xs font-semibold text-ocean">
              Default Incentive (% of Gross Sale)
              <input
                className="field mt-1 text-xs"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={policyDraft.incentivePct}
                onChange={(e) => setPolicyDraft((d) => ({ ...d, incentivePct: Number(e.target.value) }))}
              />
            </label>
            <label className="text-xs font-semibold text-ocean">
              Tranche 1 Payout (% upon Deposit Confirmed)
              <input
                className="field mt-1 text-xs"
                type="number"
                min={0}
                max={100}
                value={policyDraft.tranche1Pct}
                onChange={(e) => setPolicyDraft((d) => ({ ...d, tranche1Pct: Number(e.target.value) }))}
              />
            </label>
            <label className="text-xs font-semibold text-ocean">
              Tranche 2 Payout (% upon Downpayment Settled)
              <input
                className="field mt-1 text-xs"
                type="number"
                min={0}
                max={100}
                value={policyDraft.tranche2Pct}
                onChange={(e) => setPolicyDraft((d) => ({ ...d, tranche2Pct: Number(e.target.value) }))}
              />
            </label>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-ocean cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-ocean"
                  checked={policyDraft.enabled}
                  onChange={(e) => setPolicyDraft((d) => ({ ...d, enabled: e.target.checked }))}
                />
                Referral Program Enabled
              </label>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={savePolicy} className="text-xs">
              Save Global Policy
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
