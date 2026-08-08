'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';

type SaleRow = {
  booking: any;
  suite: any;
  plan: any;
  client?: any;
  investor?: { id: string; name?: string | null; email?: string | null } | null;
};

type Tab = 'pipeline' | 'inventory' | 'investors';

export default function AdminSalesPage() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'investment' | 'stay'>('investment');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pipelineQuery, setPipelineQuery] = useState('');
  const [investorQuery, setInvestorQuery] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'pending'>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [salesJson, usersJson, plansJson] = await Promise.all([
        api('/booking/admin/all'),
        api('/auth/users'),
        api('/timeshares')
      ]);
      setSales(Array.isArray(salesJson?.sales) ? salesJson.sales : []);
      setUsers(Array.isArray(usersJson?.users) ? usersJson.users : []);
      const planList = Array.isArray(plansJson) ? plansJson : plansJson?.plans || plansJson?.items || [];
      setPlans(planList);
    } catch {
      setError('Failed to load sales data');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const investments = sales.filter((s) => s.booking?.planId);
    const stays = sales.filter((s) => !s.booking?.planId);
    const gmv = sales.reduce((n, s) => n + (s.booking?.amountTotal || 0), 0);
    const unsold = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'unsold').length;
    const booked = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'booked').length;
    const pendingKyc = users.filter((u) => !u.kyc).length;
    return {
      total: sales.length,
      investments: investments.length,
      stays: stays.length,
      gmv,
      investors: users.length,
      unsold,
      booked,
      pendingKyc
    };
  }, [sales, users, plans]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.booking?.status) set.add(String(s.booking.status));
    });
    return Array.from(set);
  }, [sales]);

  const filteredSales = useMemo(() => {
    const q = pipelineQuery.trim().toLowerCase();
    return sales.filter((s) => {
      const isInv = !!s.booking?.planId;
      if (typeFilter === 'investment' && !isInv) return false;
      if (typeFilter === 'stay' && isInv) return false;
      if (statusFilter !== 'all' && String(s.booking?.status) !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        s.booking?.id,
        s.booking?.investorId,
        s.suite?.id,
        s.booking?.suiteId,
        s.plan?.name,
        s.booking?.planId,
        s.booking?.status,
        s.client?.name,
        s.client?.nid,
        s.client?.contact,
        s.client?.email,
        s.investor?.name,
        s.investor?.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sales, typeFilter, statusFilter, pipelineQuery]);

  const inventoryByStatus = useMemo(() => {
    const unsold = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'unsold');
    const booked = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'booked');
    const other = plans.filter((p) => {
      const st = (p.planStatus || '').toLowerCase();
      return st !== 'unsold' && st !== 'booked';
    });
    return { unsold, booked, other };
  }, [plans]);

  const filteredUsers = useMemo(() => {
    const q = investorQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (kycFilter === 'verified' && !u.kyc) return false;
      if (kycFilter === 'pending' && u.kyc) return false;
      if (!q) return true;
      const hay = [u.id, u.name, u.email].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [users, investorQuery, kycFilter]);

  async function toggleKyc(userId: string, kyc: boolean) {
    await api('/auth/kyc', {
      method: 'PUT',
      body: JSON.stringify({ userId, kyc: !kyc })
    });
    await load();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pipeline', label: 'Bookings' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'investors', label: 'Investors' }
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Company sales</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Sales Desk</h1>
          <p className="mt-2 text-ocean/75">Investment bookings, inventory, and investors in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={load}>{loading ? 'Refreshing...' : 'Refresh'}</Button>
          <Link href="/admin/units">
            <Button variant="outline">Manage units</Button>
          </Link>
        </div>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Bookings', value: String(stats.total) },
          { label: 'Investments', value: String(stats.investments) },
          { label: 'Stays', value: String(stats.stays) },
          { label: 'GMV', value: formatMoney(stats.gmv) },
          { label: 'Unsold plans', value: String(stats.unsold) },
          { label: 'Booked plans', value: String(stats.booked) },
          { label: 'KYC pending', value: String(stats.pendingKyc) }
        ].map((s) => (
          <div key={s.label} className="border border-ocean/10 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-ocean/60">{s.label}</div>
            <div className="font-display mt-1 text-xl text-ocean">{s.value}</div>
          </div>
        ))}
      </section>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-ocean/10 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-ocean text-ocean'
                : 'border-transparent text-ocean/60 hover:text-ocean'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <section className="mt-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-ocean/80">
              Type
              <select
                className="field mt-1"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              >
                <option value="all">All</option>
                <option value="investment">Investments</option>
                <option value="stay">Stays</option>
              </select>
            </label>
            <label className="text-sm text-ocean/80">
              Status
              <select
                className="field mt-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[220px] flex-1 text-sm text-ocean/80">
              Search
              <input
                className="field mt-1"
                placeholder="Booking, suite, plan, investor…"
                value={pipelineQuery}
                onChange={(e) => setPipelineQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 overflow-auto border border-ocean/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-ocean/70">
                  <th className="p-3 font-medium">Booking</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Unit</th>
                  <th className="p-3 font-medium">Buyer</th>
                  <th className="p-3 font-medium">Contact</th>
                  <th className="p-3 font-medium">NID</th>
                  <th className="p-3 font-medium">Deposit</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s) => {
                  const buyerName =
                    s.client?.name || s.investor?.name || s.booking.investorId || '—';
                  const contact = s.client?.contact || s.investor?.email || '—';
                  const email = s.client?.email || s.investor?.email || '';
                  return (
                    <tr key={s.booking.id} className="border-t border-ocean/10">
                      <td className="p-3">
                        <div className="font-mono text-xs text-ocean">{s.booking.id}</div>
                        {!s.booking.planId && (
                          <span className="mt-1 inline-block border border-ocean/20 bg-pearl px-2 py-0.5 text-[10px] text-ocean/80">
                            Stay
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.booking.planId ? (
                          <div>
                            <div className="font-medium text-ocean">{s.plan?.name || s.booking.planId}</div>
                            <div className="font-mono text-xs text-ocean/60">{s.booking.planId}</div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3">
                        {s.suite?.id || s.booking.suiteId ? (
                          <Link
                            href={`/admin/units/${s.suite?.id || s.booking.suiteId}/plans`}
                            className="text-ocean underline"
                          >
                            {s.suite?.id || s.booking.suiteId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-ocean">{buyerName}</div>
                        {s.investor?.email && s.client?.name && (
                          <div className="text-xs text-ocean/55">Account: {s.investor.email}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div>{contact}</div>
                        {email && email !== contact && (
                          <div className="text-xs text-ocean/55">{email}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">{s.client?.nid || '—'}</td>
                      <td className="p-3 text-xs">
                        {s.booking.depositMethod ? (
                          <div>
                            <div className="capitalize text-ocean">
                              {String(s.booking.depositMethod).replace(/_/g, ' ')}
                            </div>
                            {s.booking.depositReference && (
                              <div className="font-mono text-ocean/55">{s.booking.depositReference}</div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3">{formatMoney(s.booking.amountTotal || 0)}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block border px-2 py-0.5 text-xs capitalize ${
                            s.booking.status === 'awaiting_payment' ||
                            s.booking.status === 'awaiting_kyc'
                              ? 'border-gold/50 bg-gold/10 text-ocean'
                              : s.booking.status === 'confirmed'
                                ? 'border-ocean/30 bg-ocean/5 text-ocean'
                                : s.booking.status === 'cancelled'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : 'border-ocean/20 bg-pearl text-ocean/80'
                          }`}
                        >
                          {String(s.booking.status || '—').replace(/_/g, ' ')}
                          {s.booking.status !== 'confirmed' && s.booking.planId
                            ? s.booking.kycVerified
                              ? ' · KYC ok'
                              : ' · KYC pending'
                            : ''}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/admin/sales/${encodeURIComponent(s.booking.id)}`}
                          className="text-sm font-semibold text-ocean underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && !loading && (
                  <tr>
                    <td className="p-4 text-ocean/70" colSpan={10}>
                      No bookings match these filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'inventory' && (
        <section className="mt-6 space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-gold/40 bg-gold/10 p-5">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Ready to sell</div>
              <div className="font-display mt-1 text-3xl text-ocean">{inventoryByStatus.unsold.length}</div>
              <p className="mt-2 text-sm text-ocean/70">Unsold share plans</p>
            </div>
            <div className="border border-ocean/10 bg-white p-5">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Sold / held</div>
              <div className="font-display mt-1 text-3xl text-ocean">{inventoryByStatus.booked.length}</div>
              <p className="mt-2 text-sm text-ocean/70">Booked plans</p>
            </div>
            <div className="border border-ocean/10 bg-white p-5">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/admin/units" className="text-sm font-semibold text-ocean underline">
                  Open units list
                </Link>
                <Link href="/admin/units/new" className="text-sm font-semibold text-ocean underline">
                  Create a unit
                </Link>
                <Link href="/invest" className="text-sm font-semibold text-ocean underline">
                  Preview buyer catalog
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ocean">Unsold plans</h2>
            <PlanTable plans={inventoryByStatus.unsold} empty="No unsold plans — create plans on a unit." />
          </div>
          <div>
            <h2 className="font-display text-2xl text-ocean">Booked plans</h2>
            <PlanTable plans={inventoryByStatus.booked} empty="No booked plans yet." />
          </div>
          {inventoryByStatus.other.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-ocean">Other status</h2>
              <PlanTable plans={inventoryByStatus.other} empty="" />
            </div>
          )}
        </section>
      )}

      {tab === 'investors' && (
        <section className="mt-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-ocean/80">
              KYC
              <select
                className="field mt-1"
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value as typeof kycFilter)}
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <label className="min-w-[220px] flex-1 text-sm text-ocean/80">
              Search
              <input
                className="field mt-1"
                placeholder="Name, email, or ID…"
                value={investorQuery}
                onChange={(e) => setInvestorQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 overflow-auto border border-ocean/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-ocean/70">
                  <th className="p-3 font-medium">Investor</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Holdings</th>
                  <th className="p-3 font-medium">KYC</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const holdings = sales.filter((s) => s.booking?.investorId === u.id).length;
                  return (
                    <tr key={u.id} className="border-t border-ocean/10">
                      <td className="p-3">
                        <div className="font-medium text-ocean">{u.name || '—'}</div>
                        <div className="font-mono text-xs text-ocean/50">{u.id}</div>
                      </td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{holdings}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block border px-2 py-0.5 text-xs ${
                            u.kyc
                              ? 'border-ocean/30 bg-ocean/5 text-ocean'
                              : 'border-gold/50 bg-gold/10 text-ocean'
                          }`}
                        >
                          {u.kyc ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => toggleKyc(u.id, !!u.kyc)}
                          className="rounded-md border border-ocean/25 px-3 py-1.5 text-xs font-semibold text-ocean hover:bg-ocean/5"
                        >
                          {u.kyc ? 'Revoke KYC' : 'Mark KYC'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && !loading && (
                  <tr>
                    <td className="p-4 text-ocean/70" colSpan={5}>
                      No investors match these filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function PlanTable({ plans, empty }: { plans: any[]; empty: string }) {
  return (
    <div className="mt-3 overflow-auto border border-ocean/10 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ocean/10 text-left text-ocean/70">
            <th className="p-3 font-medium">Plan</th>
            <th className="p-3 font-medium">Suite</th>
            <th className="p-3 font-medium">Days/mo</th>
            <th className="p-3 font-medium">Price</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Manage</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t border-ocean/10">
              <td className="p-3">
                <div className="font-medium text-ocean">{p.name || p.id}</div>
                <div className="font-mono text-xs text-ocean/50">{p.id}</div>
              </td>
              <td className="p-3">{p.suiteId || '—'}</td>
              <td className="p-3">{p.daysPerMonth ?? '—'}</td>
              <td className="p-3">{formatMoney(p.price || 0)}</td>
              <td className="p-3 capitalize">{p.planStatus || '—'}</td>
              <td className="p-3">
                {p.suiteId ? (
                  <Link href={`/admin/units/${p.suiteId}/plans`} className="text-ocean underline">
                    Unit plans
                  </Link>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
          {plans.length === 0 && (
            <tr>
              <td className="p-4 text-ocean/70" colSpan={6}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
