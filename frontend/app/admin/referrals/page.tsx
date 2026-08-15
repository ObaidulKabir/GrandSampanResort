'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import Button from '@/components/Button';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [policyDraft, setPolicyDraft] = useState({ incentivePct: 2, tranche1Pct: 40, tranche2Pct: 60, enabled: true });
  const [policyMsg, setPolicyMsg] = useState('');
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [rateMsg, setRateMsg] = useState('');
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
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

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
      if (!res?.ok) setError(res?.error || 'Could not mark paid');
      await load();
    } finally {
      setActing(null);
    }
  }

  async function savePolicy() {
    setPolicyMsg('Saving…');
    const res = await api('/referral/policy', {
      method: 'PUT',
      body: JSON.stringify(policyDraft)
    });
    if (res?.ok) {
      setPolicy(res.policy);
      setPolicyMsg('Policy saved');
      await load();
    } else {
      setPolicyMsg(res?.error || 'Save failed');
    }
  }

  async function saveReferrerRate(userId: string, raw: string) {
    setSavingRateId(userId);
    setRateMsg('');
    const trimmed = String(raw ?? '').trim();
    const body =
      trimmed === ''
        ? { incentivePct: null }
        : { incentivePct: Number(trimmed) };
    const res = await api(`/referral/admin/referrers/${encodeURIComponent(userId)}/rate`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    if (res?.ok) {
      setRateMsg(trimmed === '' ? 'Reverted to default rate' : 'Broker rate saved');
      await load();
    } else {
      setRateMsg(res?.error || 'Could not save broker rate');
    }
    setSavingRateId(null);
  }

  async function addBrokerRate() {
    if (!addUserId) {
      setRateMsg('Select a user');
      return;
    }
    await saveReferrerRate(addUserId, addRate);
    setAddUserId('');
    setAddRate('');
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Ops</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Referral rewards</h1>
          <p className="mt-2 text-ocean/70">
            Set a default commission, override rates per broker, and mark unlocked tranches as paid.
          </p>
        </div>
        <Link href="/admin/sales" className="text-sm font-semibold text-ocean underline">
          Sales desk
        </Link>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-8 border border-ocean/10 bg-white p-5">
        <h2 className="font-display text-xl text-ocean">Default policy</h2>
        <p className="mt-1 text-sm text-ocean/65">
          Applies to every referrer unless a broker override is set. Current:{' '}
          {policy?.incentivePct ?? 2}% of sale · {policy?.tranche1Pct ?? 40}% on confirm ·{' '}
          {policy?.tranche2Pct ?? 60}% on downpayment
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="text-sm text-ocean">
            Default incentive %
            <input
              className="field mt-1"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={policyDraft.incentivePct}
              onChange={(e) => setPolicyDraft((d) => ({ ...d, incentivePct: Number(e.target.value) }))}
            />
          </label>
          <label className="text-sm text-ocean">
            Tranche 1 %
            <input
              className="field mt-1"
              type="number"
              min={0}
              max={100}
              value={policyDraft.tranche1Pct}
              onChange={(e) => setPolicyDraft((d) => ({ ...d, tranche1Pct: Number(e.target.value) }))}
            />
          </label>
          <label className="text-sm text-ocean">
            Tranche 2 %
            <input
              className="field mt-1"
              type="number"
              min={0}
              max={100}
              value={policyDraft.tranche2Pct}
              onChange={(e) => setPolicyDraft((d) => ({ ...d, tranche2Pct: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-end gap-2 text-sm text-ocean pb-2">
            <input
              type="checkbox"
              checked={policyDraft.enabled}
              onChange={(e) => setPolicyDraft((d) => ({ ...d, enabled: e.target.checked }))}
            />
            Enabled
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={savePolicy}>Save policy</Button>
          {policyMsg && <span className="text-sm text-ocean/65">{policyMsg}</span>}
        </div>
      </section>

      <section className="mt-8 border border-ocean/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ocean">Broker / referrer rates</h2>
            <p className="mt-1 text-sm text-ocean/65">
              Leave blank to use the default ({policy?.incentivePct ?? 2}%). Custom % applies to new rewards for that
              person only.
            </p>
          </div>
          <input
            className="field max-w-xs"
            placeholder="Search name, email, code…"
            value={brokerQ}
            onChange={(e) => setBrokerQ(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border border-ocean/10 bg-pearl/40 p-3">
          <label className="text-sm text-ocean min-w-[14rem] flex-1">
            Add / set user rate
            <select className="field mt-1" value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
              <option value="">Select user…</option>
              {usersNotInReferrers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.email}) · {u.role || 'investor'}
                </option>
              ))}
              {referrers.map((u) => (
                <option key={`r-${u.id}`} value={u.id}>
                  {u.name || u.email} ({u.email}) · current {u.effectiveIncentivePct}%
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ocean w-36">
            Incentive %
            <input
              className="field mt-1"
              type="number"
              min={0}
              max={100}
              step={0.1}
              placeholder="e.g. 3"
              value={addRate}
              onChange={(e) => setAddRate(e.target.value)}
            />
          </label>
          <Button type="button" onClick={addBrokerRate} disabled={!!savingRateId}>
            Save rate
          </Button>
        </div>
        {rateMsg && <p className="mt-2 text-sm text-ocean/65">{rateMsg}</p>}

        <div className="mt-4 overflow-x-auto border border-ocean/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean/10 bg-pearl text-xs uppercase tracking-wide text-ocean/60">
              <tr>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Role / code</th>
                <th className="px-4 py-3">Custom %</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrers.map((r) => (
                <tr key={r.id} className="border-b border-ocean/10 align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ocean">{r.name || '—'}</div>
                    <div className="text-xs text-ocean/60">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ocean/80">
                    <div className="capitalize">{r.role || 'investor'}</div>
                    <div className="text-xs text-ocean/55">{r.referralCode || 'no code yet'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="field w-28"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="default"
                      value={rateDrafts[r.id] ?? ''}
                      onChange={(e) =>
                        setRateDrafts((d) => ({
                          ...d,
                          [r.id]: e.target.value
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-ocean">
                    {r.effectiveIncentivePct}%
                    {r.usingDefault ? (
                      <span className="ml-1 text-xs text-ocean/50">(default)</span>
                    ) : (
                      <span className="ml-1 text-xs text-gold">custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={savingRateId === r.id}
                        onClick={() => saveReferrerRate(r.id, rateDrafts[r.id] ?? '')}
                      >
                        {savingRateId === r.id ? '…' : 'Save'}
                      </Button>
                      {!r.usingDefault && (
                        <Button
                          variant="ghost"
                          disabled={savingRateId === r.id}
                          onClick={() => saveReferrerRate(r.id, '')}
                        >
                          Use default
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredReferrers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ocean/60">
                    No referrers yet. Users appear here once they have a referral code, broker role, or a custom rate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {['', 'partial', 'earned', 'paid', 'void', 'pending'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`border px-3 py-1.5 text-sm capitalize ${
              statusFilter === s
                ? 'border-ocean bg-ocean text-white'
                : 'border-ocean/15 bg-white text-ocean hover:border-ocean/40'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
        <Button variant="ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto border border-ocean/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ocean/10 bg-pearl text-xs uppercase tracking-wide text-ocean/60">
            <tr>
              <th className="px-4 py-3">Referrer</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Incentive</th>
              <th className="px-4 py-3">Tranches</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-b border-ocean/10 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-ocean">{r.referrer?.name || '—'}</div>
                  <div className="text-xs text-ocean/60">{r.referrer?.referralCode || r.referrer?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/sales/${encodeURIComponent(r.bookingId)}`}
                    className="font-semibold text-ocean underline"
                  >
                    {r.bookingId}
                  </Link>
                  <div className="text-xs text-ocean/60">{r.booking?.planId || ''}</div>
                </td>
                <td className="px-4 py-3 text-ocean">{formatMoney(r.saleAmount)}</td>
                <td className="px-4 py-3 text-ocean">
                  {formatMoney(r.totalIncentive)}
                  <div className="text-xs text-ocean/55">{r.ratePct}%</div>
                </td>
                <td className="px-4 py-3 text-ocean/80">
                  <div>
                    T1 {formatMoney(r.tranche1Amount)} · {r.tranche1Status}
                  </div>
                  <div>
                    T2 {formatMoney(r.tranche2Amount)} · {r.tranche2Status}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-ocean">{r.status}</td>
                <td className="px-4 py-3">
                  {r.status !== 'void' && r.status !== 'paid' && (
                    <Button
                      variant="outline"
                      disabled={acting === r.id || (r.tranche1Status === 'pending' && r.tranche2Status === 'pending')}
                      onClick={() => markPaid(r.id)}
                    >
                      {acting === r.id ? '…' : 'Mark paid'}
                    </Button>
                  )}
                  {r.paidAt && (
                    <div className="mt-1 text-xs text-ocean/55">Paid {formatDate(r.paidAt)}</div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && rewards.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ocean/60">
                  No referral rewards yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
