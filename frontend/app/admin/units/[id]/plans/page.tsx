'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';

type Plan = {
  id: string;
  name: string;
  daysPerMonth: number;
  lockIn?: number;
  price: number;
  currency?: 'BDT';
  suiteId?: string;
  planStatus?: 'Unsold' | 'Reserved' | 'Booked' | 'Resale' | 'Transferred';
  planType?: 'FULL' | 'DPM';
  timeFraction?: number;
};

const STATUSES = ['Unsold', 'Reserved', 'Booked', 'Resale', 'Transferred'] as const;

const emptyForm = (suiteId: string): Plan => ({
  id: '',
  name: '',
  daysPerMonth: 7,
  price: 0,
  currency: 'BDT',
  suiteId,
  planType: 'DPM',
  planStatus: 'Unsold'
});

type PresetKey = '3D' | '5D' | 'FULL';

const PRESETS: {
  key: PresetKey;
  label: string;
  days: number;
  planType: 'DPM' | 'FULL';
  name: string;
  idSuffix: string;
  description: string;
}[] = [
  {
    key: '3D',
    label: '3 days / month',
    days: 3,
    planType: 'DPM',
    name: '3 days/month',
    idSuffix: '-3D',
    description: 'Entry share · 10% of the unit'
  },
  {
    key: '5D',
    label: '5 days / month',
    days: 5,
    planType: 'DPM',
    name: '5 days/month',
    idSuffix: '-5D',
    description: 'Popular share · 16.7% of the unit'
  },
  {
    key: 'FULL',
    label: 'Full month',
    days: 30,
    planType: 'FULL',
    name: 'Full ownership',
    idSuffix: '',
    description: '30 days · locks this unit to a single owner'
  }
];

/** S-101 → 101; used to derive plan IDs like P-101-3D / P-101. */
function suiteNumber(suiteId: string) {
  const m = suiteId.match(/(\d+.*)$/);
  return m ? m[1] : suiteId;
}

export default function AdminSuitePlansPage({ params }: { params: { id: string } }) {
  const suiteId = params.id;
  const [items, setItems] = useState<Plan[]>([]);
  const [suite, setSuite] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Plan>(emptyForm(suiteId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [plansJson, suiteJson] = await Promise.all([api(`/suites/${suiteId}/plans`), api(`/suites/${suiteId}`)]);
      setItems(plansJson?.plans ?? []);
      setSuite(suiteJson?.suite ?? suiteJson ?? null);
    } catch {
      setError('Failed to load plans');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const MONTH_DAYS = 30;

  const isFullBleed = (p: Pick<Plan, 'planType' | 'daysPerMonth'>) =>
    String(p.planType || '').toUpperCase() === 'FULL' || Number(p.daysPerMonth || 0) >= MONTH_DAYS;

  const usedDays = useMemo(
    () => items.reduce((sum, p) => sum + Math.max(0, Number(p.daysPerMonth) || 0), 0),
    [items]
  );
  const remainingDays = Math.max(0, MONTH_DAYS - usedDays);
  /** Unit locks only when the combined days/month already fill the month. */
  const planCreationLocked = remainingDays <= 0;

  /** Suggested price = unit total price × time fraction, rounded to whole taka. */
  function suggestedPrice(days: number) {
    const total = Number(suite?.totalPrice || 0);
    if (!total) return 0;
    return Math.round(total * (Math.min(days, MONTH_DAYS) / MONTH_DAYS));
  }

  function presetPlanId(preset: (typeof PRESETS)[number]) {
    const base = `P-${suiteNumber(suiteId)}${preset.idSuffix}`;
    if (!items.some((p) => p.id === base)) return base;
    // ID already taken — append a counter so admins never hit a conflict.
    for (let n = 2; n < 100; n++) {
      const candidate = `${base}-${n}`;
      if (!items.some((p) => p.id === candidate)) return candidate;
    }
    return base;
  }

  function presetDisabledReason(preset: (typeof PRESETS)[number]): string | null {
    if (planCreationLocked) return 'Unit has no remaining days this month';
    if (preset.days > remainingDays) {
      return `Only ${remainingDays} day${remainingDays === 1 ? '' : 's'}/month left on this unit`;
    }
    return null;
  }

  function presetIsActive(preset: (typeof PRESETS)[number]) {
    return (
      Number(createForm.daysPerMonth) === preset.days &&
      (createForm.planType || 'DPM') === preset.planType
    );
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    if (presetDisabledReason(preset)) return;
    setError('');
    setCreateForm({
      ...createForm,
      id: presetPlanId(preset),
      name: preset.name,
      daysPerMonth: preset.days,
      planType: preset.planType,
      price: suggestedPrice(preset.days) || createForm.price,
      planStatus: 'Unsold'
    });
  }

  const derivedFraction = useMemo(() => {
    if (createForm.planType === 'FULL' || createForm.daysPerMonth >= 30) return 1;
    const dpm = createForm.daysPerMonth || 0;
    return dpm > 0 ? dpm / 30 : 0;
  }, [createForm.daysPerMonth, createForm.planType]);

  const canSubmit =
    !planCreationLocked && createForm.id.trim().length > 0 && createForm.price > 0;

  function planErrorMessage(code?: string, remaining?: number) {
    if (code === 'conflict') return 'A plan with this ID already exists';
    if (code === 'unit_capacity_full' || code === 'full_ownership_locked') {
      return 'This unit already uses the full 30 days/month. Delete or reduce an existing plan before adding another.';
    }
    if (code === 'exceeds_month_capacity' || code === 'full_requires_empty_suite') {
      const left = typeof remaining === 'number' ? remaining : remainingDays;
      return `This plan would exceed the unit’s 30 days/month. Only ${left} day${left === 1 ? '' : 's'} remaining.`;
    }
    return code || 'Failed to create plan';
  }

  function setCreateType(planType: Plan['planType']) {
    if (planType === 'FULL') {
      if (remainingDays < MONTH_DAYS) return;
      setCreateForm({ ...createForm, planType: 'FULL', daysPerMonth: MONTH_DAYS });
      return;
    }
    setCreateForm({
      ...createForm,
      planType: 'DPM',
      daysPerMonth:
        createForm.daysPerMonth >= MONTH_DAYS
          ? Math.min(5, remainingDays || 5)
          : Math.min(createForm.daysPerMonth, remainingDays || createForm.daysPerMonth)
    });
  }

  function setCreateDays(daysPerMonth: number) {
    const cap = planCreationLocked ? 0 : remainingDays || MONTH_DAYS;
    const days = Math.max(0, Math.min(cap, Number(daysPerMonth) || 0));
    if (days >= MONTH_DAYS && remainingDays >= MONTH_DAYS) {
      setCreateForm({ ...createForm, daysPerMonth: MONTH_DAYS, planType: 'FULL' });
      return;
    }
    setCreateForm({
      ...createForm,
      daysPerMonth: days,
      planType: createForm.planType === 'FULL' ? 'DPM' : createForm.planType
    });
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (planCreationLocked) {
      setError(planErrorMessage('unit_capacity_full'));
      return;
    }
    const nextDays = isFullBleed(createForm) ? MONTH_DAYS : Number(createForm.daysPerMonth) || 0;
    if (nextDays > remainingDays) {
      setError(planErrorMessage('exceeds_month_capacity', remainingDays));
      return;
    }
    if (!canSubmit) {
      setError('Plan ID and a price above zero are required');
      return;
    }
    setCreating(true);
    setError('');
    setNotice('');
    const full = isFullBleed(createForm);
    try {
      const json = await api('/timeshares', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          id: createForm.id.trim(),
          suiteId,
          currency: 'BDT',
          planType: full ? 'FULL' : createForm.planType || 'DPM',
          daysPerMonth: full ? MONTH_DAYS : createForm.daysPerMonth,
          timeFraction: derivedFraction
        })
      });
      if (json?.ok) {
        const leftAfter = remainingDays - nextDays;
        setNotice(
          full || leftAfter <= 0
            ? `Plan ${createForm.id.trim()} created. This unit now uses the full 30 days/month — further plans are locked.`
            : createForm.planStatus === 'Unsold'
              ? `Plan ${createForm.id.trim()} is live in the buyer catalog. ${leftAfter} day${leftAfter === 1 ? '' : 's'}/month still available.`
              : `Plan ${createForm.id.trim()} created (status: ${createForm.planStatus}). ${leftAfter} day${leftAfter === 1 ? '' : 's'}/month still available.`
        );
        setCreateForm(emptyForm(suiteId));
        await load();
      } else {
        setError(planErrorMessage(json?.error, json?.remainingDays));
      }
    } catch {
      setError('Failed to create plan');
    }
    setCreating(false);
  }

  async function deletePlan(id: string) {
    setError('');
    setNotice('');
    try {
      const json = await api(`/timeshares/${id}`, { method: 'DELETE' });
      if (json?.ok) {
        setNotice(`Plan ${id} removed.`);
        await load();
      } else if (json?.error === 'has_bookings') {
        setError(
          `Plan ${id} cannot be deleted because it has ${json.bookingCount || 'linked'} booking(s). Each investment booking stays tied to its planId.`
        );
      } else {
        setError(json?.error || 'Failed to delete plan');
      }
    } catch {
      setError('Failed to delete plan');
    }
  }

  function startEdit(p: Plan) {
    setEditingId(p.id);
    setEditForm({ price: p.price, planStatus: p.planStatus, name: p.name, daysPerMonth: p.daysPerMonth });
  }

  async function saveEdit(id: string) {
    setError('');
    setNotice('');
    try {
      const json = await api(`/timeshares/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      if (json?.ok) {
        setEditingId(null);
        setEditForm({});
        setNotice(`Plan ${id} updated.`);
        await load();
      } else {
        setError(planErrorMessage(json?.error).replace('Failed to create plan', 'Failed to update plan'));
      }
    } catch {
      setError('Failed to update plan');
    }
  }

  const unsoldCount = items.filter((p) => (p.planStatus || '').toLowerCase() === 'unsold').length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Inventory · Step 2 of 2</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Share plans · {suiteId}</h1>
          <p className="mt-2 text-ocean/75">
            {suite
              ? `${suite.type || 'Suite'} · ${suite.view || ''} view · Floor ${suite.floor ?? '—'} · ${formatMoney(suite.totalPrice || 0)}`
              : 'Plans marked Unsold appear in the buyer catalog immediately.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={load}>{loading ? 'Refreshing...' : 'Refresh'}</Button>
          <Link href="/invest" target="_blank">
            <Button variant="outline">Preview buyer catalog</Button>
          </Link>
          <Link href="/admin/units">
            <Button variant="ghost">All units</Button>
          </Link>
        </div>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{notice}</div>}

      <section className="mt-6 border border-ocean/10 bg-white p-6">
        <h2 className="font-display text-2xl text-ocean">Create plan</h2>
        <p className="mt-1 text-sm text-ocean/70">
          Revenue share is derived automatically from days per month. Status “Unsold” publishes it for sale.
          Each unit has 30 days/month to allocate across plans — creation locks only when that total is used up.
        </p>
        <div className="mt-4 border border-ocean/10 bg-pearl px-4 py-3 text-sm text-ocean/80">
          Days allocated:{' '}
          <span className="font-semibold text-ocean">
            {usedDays} / {MONTH_DAYS}
          </span>
          {planCreationLocked ? (
            <span className="ml-2 text-gold">· Unit locked (no days left)</span>
          ) : (
            <span className="ml-2">
              · <span className="font-semibold text-ocean">{remainingDays}</span> day
              {remainingDays === 1 ? '' : 's'} remaining
            </span>
          )}
        </div>
        {planCreationLocked && (
          <div className="mt-4 border border-gold/50 bg-gold/10 p-4 text-ocean">
            Plan creation is disabled because this unit already uses the full {MONTH_DAYS} days/month. Delete or
            reduce an existing plan to free capacity.
          </div>
        )}
        {!planCreationLocked && (
          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-ocean/70">Quick create</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PRESETS.map((preset) => {
                const reason = presetDisabledReason(preset);
                const active = !reason && presetIsActive(preset);
                const price = suggestedPrice(preset.days);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    disabled={!!reason}
                    title={reason || `Auto-fill the form for a ${preset.label} plan`}
                    className={`border p-4 text-left transition ${
                      reason
                        ? 'cursor-not-allowed border-ocean/10 bg-pearl/60 opacity-60'
                        : active
                          ? 'border-gold bg-gold/10 shadow-sm'
                          : 'border-ocean/15 bg-white hover:border-gold hover:bg-gold/5'
                    }`}
                  >
                    <span className="font-display block text-lg text-ocean">{preset.label}</span>
                    <span className="mt-1 block text-xs text-ocean/70">{preset.description}</span>
                    <span className="mt-2 block text-sm font-semibold text-ocean">
                      {price ? formatMoney(price) : 'Set price below'}
                    </span>
                    {reason && <span className="mt-1 block text-xs text-red-600">{reason}</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ocean/60">
              A preset auto-fills the form below (ID, name, days and a suggested price = unit price × days ÷ 30).
              Every field stays editable before you create the plan.
            </p>
          </div>
        )}
        <form
          onSubmit={createPlan}
          className={`mt-5 grid grid-cols-1 gap-5 md:grid-cols-3 ${planCreationLocked ? 'pointer-events-none opacity-50' : ''}`}
        >
          <label className="block text-sm font-medium text-ocean">
            Plan ID
            <input
              required
              disabled={planCreationLocked}
              value={createForm.id}
              onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
              className="field mt-1"
              placeholder="P-7D"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Name
            <input
              disabled={planCreationLocked}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="field mt-1"
              placeholder="7 days / month"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Days per month
            <input
              type="number"
              min={0}
              max={remainingDays || MONTH_DAYS}
              disabled={planCreationLocked}
              value={createForm.daysPerMonth}
              onChange={(e) => setCreateDays(Number(e.target.value))}
              className="field mt-1"
            />
            {!planCreationLocked && (
              <span className="mt-1 block text-xs font-normal text-ocean/60">
                Max {remainingDays} day{remainingDays === 1 ? '' : 's'} available on this unit
              </span>
            )}
          </label>
          <label className="block text-sm font-medium text-ocean">
            Price (BDT)
            <input
              type="number"
              min={0}
              disabled={planCreationLocked}
              value={createForm.price}
              onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Type
            <select
              disabled={planCreationLocked || remainingDays < MONTH_DAYS}
              value={createForm.planType}
              onChange={(e) => setCreateType(e.target.value as Plan['planType'])}
              className="field mt-1"
              title={
                remainingDays < MONTH_DAYS
                  ? 'Full ownership needs the full 30 days — this unit already has other plans'
                  : undefined
              }
            >
              <option value="DPM">Days per month (DPM)</option>
              <option value="FULL" disabled={remainingDays < MONTH_DAYS}>
                Full ownership (30 days)
              </option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Status
            <select
              disabled={planCreationLocked}
              value={createForm.planStatus}
              onChange={(e) => setCreateForm({ ...createForm, planStatus: e.target.value as Plan['planStatus'] })}
              className="field mt-1"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-4 md:col-span-3">
            <div className="border border-ocean/10 bg-pearl px-4 py-2 text-sm text-ocean/80">
              Revenue share:{' '}
              <span className="font-semibold text-ocean">{(derivedFraction * 100).toFixed(1)}%</span>
              {(createForm.planType === 'FULL' || createForm.daysPerMonth >= 30) && (
                <span className="ml-2 text-gold">· Full ownership</span>
              )}
            </div>
            <Button type="submit" disabled={creating || !canSubmit || planCreationLocked}>
              {creating ? 'Creating...' : planCreationLocked ? 'Locked' : 'Create plan'}
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-ocean">Plans on this unit</h2>
          <span className="text-sm text-ocean/70">
            {unsoldCount} of {items.length} on sale
          </span>
        </div>
        <div className="mt-4 overflow-auto border border-ocean/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean/10 text-left text-ocean/70">
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Days/mo</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Rev. share</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-ocean/10 align-top">
                  {editingId === p.id ? (
                    <>
                      <td className="p-3">
                        <div className="font-mono text-xs text-ocean/50">{p.id}</div>
                        <input
                          className="field mt-1"
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Name"
                        />
                      </td>
                      <td className="p-3">{p.planType}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          className="field w-20"
                          value={editForm.daysPerMonth ?? p.daysPerMonth}
                          onChange={(e) => setEditForm({ ...editForm, daysPerMonth: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          className="field w-28"
                          value={editForm.price ?? p.price}
                          onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-3">{((p.timeFraction ?? 0) * 100).toFixed(1)}%</td>
                      <td className="p-3">
                        <select
                          className="field"
                          value={editForm.planStatus ?? p.planStatus}
                          onChange={(e) => setEditForm({ ...editForm, planStatus: e.target.value as Plan['planStatus'] })}
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(p.id)}
                            className="rounded-md bg-ocean px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                            className="rounded-md border border-ocean/25 px-3 py-1.5 text-xs font-semibold text-ocean"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">
                        <div className="font-medium text-ocean">{p.name || p.id}</div>
                        <div className="font-mono text-xs text-ocean/50">{p.id}</div>
                      </td>
                      <td className="p-3">{p.planType}</td>
                      <td className="p-3">{p.daysPerMonth}</td>
                      <td className="p-3">{formatMoney(p.price || 0)}</td>
                      <td className="p-3">{((p.timeFraction ?? 0) * 100).toFixed(1)}%</td>
                      <td className="p-3">
                        <span
                          className={`inline-block border px-2 py-0.5 text-xs ${
                            (p.planStatus || '').toLowerCase() === 'unsold'
                              ? 'border-gold/50 bg-gold/10 text-ocean'
                              : 'border-ocean/20 bg-pearl text-ocean/80'
                          }`}
                        >
                          {p.planStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-3 text-xs font-semibold">
                          <button onClick={() => startEdit(p)} className="text-ocean underline">
                            Edit
                          </button>
                          <Link href={`/pricing/plans/${p.id}`} target="_blank" className="text-ocean underline">
                            View
                          </Link>
                          <button onClick={() => deletePlan(p.id)} className="text-red-700 underline">
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td className="p-4 text-ocean/70" colSpan={7}>
                    No share plans yet — create the first one above to put this unit on sale.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
