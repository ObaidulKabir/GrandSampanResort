'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import Drawer from '@/components/ui/Drawer';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/ToastContext';

type SaleRow = {
  booking: any;
  suite: any;
  plan: any;
  client?: any;
  investor?: { id: string; name?: string | null; email?: string | null } | null;
};

type Tab = 'pipeline' | 'inventory' | 'investors';

export default function AdminSalesPage() {
  const { success, error: toastError } = useToast();
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
  const [actingId, setActingId] = useState<string | null>(null);

  // Side-by-side KYC review drawer
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);

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
      toastError('Failed to load sales data');
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
    const reserved = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'reserved');
    const booked = plans.filter((p) => (p.planStatus || '').toLowerCase() === 'booked');
    const other = plans.filter((p) => {
      const st = (p.planStatus || '').toLowerCase();
      return st !== 'unsold' && st !== 'booked' && st !== 'reserved';
    });
    return { unsold, reserved, booked, other };
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
  }, [users, kycFilter, investorQuery]);

  async function updateStatus(bookingId: string, nextStatus: string) {
    setActingId(bookingId);
    try {
      const res = await api(`/booking/admin/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res?.ok) {
        success(`Booking status updated to ${nextStatus}`);
        setSales((prev) =>
          prev.map((s) => (s.booking?.id === bookingId ? { ...s, booking: { ...s.booking, status: nextStatus } } : s))
        );
        if (selectedSale?.booking?.id === bookingId) {
          setSelectedSale((prev) => (prev ? { ...prev, booking: { ...prev.booking, status: nextStatus } } : null));
        }
      } else {
        toastError(res?.error || 'Failed to update booking status');
      }
    } catch {
      toastError('Status update failed');
    }
    setActingId(null);
  }

  async function verifyKyc(bookingId: string) {
    setActingId(bookingId);
    try {
      const res = await api(`/booking/admin/${bookingId}/verify-kyc`, { method: 'POST' });
      if (res?.ok) {
        success('KYC verified and confirmed!');
        setSales((prev) =>
          prev.map((s) =>
            s.booking?.id === bookingId
              ? { ...s, booking: { ...s.booking, kycVerified: true, status: 'confirmed' } }
              : s
          )
        );
        if (selectedSale?.booking?.id === bookingId) {
          setSelectedSale((prev) =>
            prev ? { ...prev, booking: { ...prev.booking, kycVerified: true, status: 'confirmed' } } : null
          );
        }
      } else {
        toastError(res?.error || 'Failed to verify KYC');
      }
    } catch {
      toastError('KYC verification error');
    }
    setActingId(null);
  }

  async function toggleUserKyc(userId: string, current: boolean) {
    setActingId(userId);
    try {
      const res = await api(`/auth/users/${userId}/kyc`, {
        method: 'PUT',
        body: JSON.stringify({ kyc: !current })
      });
      if (res?.ok) {
        success(`User KYC status set to ${!current ? 'Verified' : 'Pending'}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, kyc: !current } : u)));
      } else {
        toastError('Failed to update user KYC');
      }
    } catch {
      toastError('User KYC update error');
    }
    setActingId(null);
  }

  const tabList: TabItem[] = [
    { id: 'pipeline', label: 'Sales Pipeline & Bookings', icon: <span>💼</span>, badge: <Badge size="sm">{filteredSales.length}</Badge> },
    { id: 'inventory', label: 'Inventory & Plan Status', icon: <span>🏢</span>, badge: <Badge variant="gold" size="sm">{plans.length}</Badge> },
    { id: 'investors', label: 'Investor Directory & KYC', icon: <span>👥</span>, badge: stats.pendingKyc > 0 ? <Badge variant="warning" size="sm">{stats.pendingKyc} Pending</Badge> : undefined }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="gold" size="sm" dot>Sales &amp; CRM Operations</Badge>
          <h1 className="font-display mt-1 text-2xl font-bold text-ocean sm:text-3xl">
            Sales Desk Command Center
          </h1>
          <p className="mt-1 text-xs text-ocean/65">
            Monitor real-time reservations, inspect buyer NID KYC dossiers, and verify cash flows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs" onClick={load}>
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
          </Button>
          <Link href="/admin/units/new">
            <Button className="text-xs">+ New Unit</Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross Booking GMV"
          isMoney
          moneyAmount={stats.gmv}
          variant="ocean"
          icon={<span className="text-lg">💰</span>}
          subtext={`${stats.investments} share sales`}
        />
        <StatCard
          label="Pending KYC Reviews"
          value={stats.pendingKyc}
          variant={stats.pendingKyc > 0 ? 'gold' : 'pearl'}
          icon={<span className="text-lg">🛡️</span>}
          subtext="Requires admin compliance verification"
        />
        <StatCard
          label="Unsold Share Plans"
          value={stats.unsold}
          variant="default"
          icon={<span className="text-lg">📦</span>}
          subtext={`${stats.booked} shares booked`}
        />
        <StatCard
          label="Registered Investors"
          value={stats.investors}
          variant="pearl"
          icon={<span className="text-lg">👥</span>}
          subtext="Active platform accounts"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs
          items={tabList}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
          variant="underline"
        />
      </div>

      {/* TAB 1: PIPELINE & BOOKINGS */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ocean/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'investment', 'stay'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    typeFilter === t
                      ? 'bg-ocean text-white shadow-sm'
                      : 'bg-pearl text-ocean/70 hover:bg-ocean/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-ocean/20 bg-white px-3 py-1.5 text-xs text-ocean outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="awaiting_payment">Awaiting Payment</option>
                <option value="awaiting_kyc">Awaiting KYC</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <input
                type="text"
                placeholder="Filter by buyer, NID, suite..."
                value={pipelineQuery}
                onChange={(e) => setPipelineQuery(e.target.value)}
                className="w-48 sm:w-64 rounded-lg border border-ocean/20 bg-white px-3 py-1.5 text-xs text-ocean outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ocean/10 bg-pearl/60 uppercase font-semibold text-ocean/60 tracking-wider">
                    <th className="px-4 py-3">Booking ID</th>
                    <th className="px-4 py-3">Suite / Plan</th>
                    <th className="px-4 py-3">Buyer &amp; Contact</th>
                    <th className="px-4 py-3">NID Number</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status &amp; KYC</th>
                    <th className="px-4 py-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ocean/10">
                  {filteredSales.map((s) => {
                    const buyerName = s.client?.name || s.investor?.name || 'Guest / Unassigned';
                    const email = s.client?.email || s.investor?.email || '';
                    const isActing = actingId === s.booking?.id;

                    return (
                      <tr key={s.booking?.id} className="hover:bg-pearl/30 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-ocean font-bold block">
                            #{s.booking?.id.slice(0, 8)}
                          </span>
                          <span className="text-[11px] text-ocean/50 block">
                            {formatDateTime(s.booking?.createdAt || s.booking?.depositSubmittedAt || null)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-ocean">
                            {s.suite?.id || s.booking?.suiteId} &middot; {s.plan?.name || (s.booking?.planId ? 'Share Plan' : 'Stay')}
                          </div>
                          <div className="text-[11px] text-ocean/60">
                            {s.suite?.type} &middot; <span className="capitalize">{s.suite?.view}</span> View
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-ocean">{buyerName}</div>
                          <div className="text-[11px] text-ocean/60">{email || s.client?.contact || '—'}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-medium text-ocean">
                          {s.client?.nid || '—'}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-ocean">
                          {formatMoney(s.booking?.amountTotal || 0)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={
                              s.booking?.status === 'confirmed'
                                ? 'success'
                                : s.booking?.status === 'cancelled'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                            dot
                          >
                            {String(s.booking?.status || '—').replace(/_/g, ' ')}
                            {s.booking?.kycVerified ? ' · KYC OK' : ''}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.client && (
                              <button
                                type="button"
                                onClick={() => setSelectedSale(s)}
                                className="rounded bg-gold/15 px-2.5 py-1 text-xs font-bold text-[#886915] hover:bg-gold/25 transition"
                              >
                                Review KYC
                              </button>
                            )}
                            {s.booking?.status !== 'confirmed' && (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => updateStatus(s.booking.id, 'confirmed')}
                                className="rounded bg-ocean px-2.5 py-1 text-xs font-semibold text-white hover:bg-ocean/90 transition"
                              >
                                Confirm
                              </button>
                            )}
                            <Link
                              href={`/admin/sales/${encodeURIComponent(s.booking.id)}`}
                              className="rounded border border-ocean/20 px-2 py-1 text-xs font-semibold text-ocean hover:bg-ocean/5 transition"
                            >
                              Details &rarr;
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSales.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ocean/60">
                        No bookings match the specified filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & SHARE MATRIX */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Unsold Ready to Market</span>
              <div className="font-display text-3xl font-bold text-emerald-950 mt-1">{inventoryByStatus.unsold.length}</div>
              <p className="mt-1 text-xs text-emerald-800/80">Available immediately on public catalog</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Reserved in Pipeline</span>
              <div className="font-display text-3xl font-bold text-amber-950 mt-1">{inventoryByStatus.reserved.length}</div>
              <p className="mt-1 text-xs text-amber-800/80">Deposit locked, awaiting KYC clearance</p>
            </div>
            <div className="rounded-xl border border-ocean/20 bg-white p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-ocean/70">Completed &amp; Deeded</span>
              <div className="font-display text-3xl font-bold text-ocean mt-1">{inventoryByStatus.booked.length}</div>
              <p className="mt-1 text-xs text-ocean/60">Deed registered to investor</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
            <div className="border-b border-ocean/10 bg-pearl px-5 py-3">
              <h3 className="font-display text-base font-bold text-ocean">Share Plans Inventory</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ocean/10 bg-pearl/60 text-ocean/60 uppercase font-semibold">
                  <th className="p-3">Plan Name / ID</th>
                  <th className="p-3">Suite ID</th>
                  <th className="p-3">Days / Mo</th>
                  <th className="p-3">List Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean/10">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-pearl/30">
                    <td className="p-3 font-semibold text-ocean">{p.name || p.id}</td>
                    <td className="p-3 font-mono text-ocean">{p.suiteId || '—'}</td>
                    <td className="p-3">{p.daysPerMonth ?? '—'} days</td>
                    <td className="p-3 font-bold text-ocean">{formatMoney(p.price || 0)}</td>
                    <td className="p-3 capitalize">
                      <Badge
                        variant={
                          p.planStatus === 'unsold'
                            ? 'success'
                            : p.planStatus === 'reserved'
                            ? 'warning'
                            : 'ocean'
                        }
                        size="sm"
                      >
                        {p.planStatus || 'Unsold'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {p.suiteId && (
                        <Link
                          href={`/admin/units/${p.suiteId}/plans`}
                          className="font-semibold text-ocean underline hover:text-gold"
                        >
                          Manage Unit Plans &rarr;
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVESTOR DIRECTORY */}
      {tab === 'investors' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ocean/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value as any)}
                className="rounded-lg border border-ocean/20 bg-white px-3 py-1.5 text-xs text-ocean outline-none"
              >
                <option value="all">All Investors</option>
                <option value="verified">KYC Verified Only</option>
                <option value="pending">KYC Pending Only</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              value={investorQuery}
              onChange={(e) => setInvestorQuery(e.target.value)}
              className="w-48 sm:w-64 rounded-lg border border-ocean/20 bg-white px-3 py-1.5 text-xs text-ocean outline-none focus:border-gold"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ocean/10 bg-pearl/60 text-ocean/60 uppercase font-semibold">
                  <th className="p-3">Investor Name &amp; ID</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Total Holdings</th>
                  <th className="p-3">KYC Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean/10">
                {filteredUsers.map((u) => {
                  const userHoldings = sales.filter((s) => s.booking?.investorId === u.id).length;
                  return (
                    <tr key={u.id} className="hover:bg-pearl/30">
                      <td className="p-3">
                        <span className="font-semibold text-ocean block">{u.name || 'Unassigned Name'}</span>
                        <span className="font-mono text-[11px] text-ocean/50 block">ID: {u.id}</span>
                      </td>
                      <td className="p-3 text-ocean/80">{u.email}</td>
                      <td className="p-3 font-bold text-ocean">{userHoldings} Shares</td>
                      <td className="p-3">
                        <Badge variant={u.kyc ? 'success' : 'warning'} size="sm" dot>
                          {u.kyc ? 'Verified' : 'Pending Verification'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleUserKyc(u.id, !!u.kyc)}
                          className="rounded-lg border border-ocean/20 px-3 py-1 text-xs font-semibold text-ocean hover:bg-ocean/5"
                        >
                          {u.kyc ? 'Revoke KYC' : 'Verify KYC'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE KYC INSPECTION DRAWER */}
      <Drawer
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title="Buyer & Nominee KYC Dossier"
        description={`Audit verification for Booking #${selectedSale?.booking?.id.slice(0, 8)}`}
        width="half"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              className="rounded-lg border border-ocean/20 px-4 py-2 text-xs font-semibold text-ocean hover:bg-ocean/5"
            >
              Close Dossier
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedSale?.booking?.id) updateStatus(selectedSale.booking.id, 'cancelled');
                }}
                className="text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
              >
                Reject &amp; Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedSale?.booking?.id) verifyKyc(selectedSale.booking.id);
                }}
                className="text-xs bg-emerald-700 text-white hover:bg-emerald-800"
              >
                ✓ Approve &amp; Verify KYC
              </Button>
            </div>
          </div>
        }
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Booking Reference Pill */}
            <div className="flex items-center justify-between rounded-xl bg-pearl p-4">
              <div>
                <span className="text-xs text-ocean/60 block">Selected Asset</span>
                <span className="font-display text-base font-bold text-ocean">
                  Suite {selectedSale.suite?.id || selectedSale.booking?.suiteId} &middot; {selectedSale.plan?.name || 'Share Plan'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-ocean/60 block">Committed GMV</span>
                <span className="font-display text-lg font-bold text-ocean">
                  {formatMoney(selectedSale.booking?.amountTotal || 0)}
                </span>
              </div>
            </div>

            {/* Split Dossier: Buyer on Left, Nominee on Right */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Buyer Profile */}
              <div className="rounded-xl border border-ocean/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-ocean/10 pb-3">
                  <h4 className="font-display text-base font-bold text-ocean">Primary Buyer</h4>
                  <Badge variant="ocean" size="sm">Investor</Badge>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  {selectedSale.client?.picUrl ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-ocean/10 bg-pearl">
                      <Image
                        src={selectedSale.client.picUrl}
                        alt="Buyer Photograph"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-ocean/20 bg-pearl text-ocean/45">
                      No Buyer Photo Uploaded
                    </div>
                  )}

                  <div>
                    <span className="text-ocean/55 block">Full Legal Name</span>
                    <span className="font-bold text-ocean text-sm">{selectedSale.client?.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ocean/55 block">Father / Husband Name</span>
                    <span className="font-semibold text-ocean">{selectedSale.client?.fatherName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ocean/55 block">National ID (NID)</span>
                    <span className="font-mono font-bold text-ocean">{selectedSale.client?.nid || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ocean/55 block">Date of Birth</span>
                    <span className="font-medium text-ocean">{selectedSale.client?.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ocean/55 block">Contact &amp; Email</span>
                    <span className="font-medium text-ocean">{selectedSale.client?.contact} / {selectedSale.client?.email}</span>
                  </div>
                  <div>
                    <span className="text-ocean/55 block">Present &amp; Permanent Address</span>
                    <span className="text-ocean/80">{selectedSale.client?.address || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Nominee Profile */}
              <div className="rounded-xl border border-ocean/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-ocean/10 pb-3">
                  <h4 className="font-display text-base font-bold text-ocean">Registered Nominee</h4>
                  <Badge variant="gold" size="sm">Succession Deed</Badge>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  {selectedSale.client?.nomineePicUrl ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-ocean/10 bg-pearl">
                      <Image
                        src={selectedSale.client.nomineePicUrl}
                        alt="Nominee Photograph"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-ocean/20 bg-pearl text-ocean/45">
                      No Nominee Photo Uploaded
                    </div>
                  )}

                  <div>
                    <span className="text-ocean/55 block">Nominee Legal Name</span>
                    <span className="font-bold text-ocean text-sm">{selectedSale.client?.nomineeName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ocean/55 block">Nominee NID Number</span>
                    <span className="font-mono font-bold text-ocean">{selectedSale.client?.nomineeNid || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
