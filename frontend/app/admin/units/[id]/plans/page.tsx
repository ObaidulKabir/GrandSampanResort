'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
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

  const derivedFraction = useMemo(() => {
    const dpm = createForm.daysPerMonth || 0;
    return dpm > 0 ? dpm / 30 : 0;
  }, [createForm.daysPerMonth]);

  const canSubmit = createForm.id.trim().length > 0 && createForm.price > 0;

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError('Plan ID and a price above zero are required');
      return;
    }
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const json = await api('/timeshares', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          id: createForm.id.trim(),
          suiteId,
          currency: 'BDT',
          timeFraction: derivedFraction
        })
      });
      if (json?.ok) {
        setNotice(
          createForm.planStatus === 'Unsold'
            ? `Plan ${createForm.id.trim()} is live in the buyer catalog.`
            : `Plan ${createForm.id.trim()} created (status: ${createForm.planStatus}).`
        );
        setCreateForm(emptyForm(suiteId));
        await load();
      } else {
        setError(json?.error === 'conflict' ? 'A plan with this ID already exists' : json?.error || 'Failed to create plan');
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
      } else {
        setError('Failed to delete plan');
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
        setError(json?.error || 'Failed to update plan');
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
              ? `${suite.type || 'Suite'} · ${suite.view || ''} view · Floor ${suite.floor ?? '—'} · ৳ ${(suite.totalPrice || 0).toLocaleString()}`
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
        </p>
        <form onSubmit={createPlan} className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <label className="block text-sm font-medium text-ocean">
            Plan ID
            <input
              required
              value={createForm.id}
              onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
              className="field mt-1"
              placeholder="P-7D"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Name
            <input
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
              max={30}
              value={createForm.daysPerMonth}
              onChange={(e) => setCreateForm({ ...createForm, daysPerMonth: Number(e.target.value) })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Price (BDT)
            <input
              type="number"
              min={0}
              value={createForm.price}
              onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Type
            <select
              value={createForm.planType}
              onChange={(e) => setCreateForm({ ...createForm, planType: e.target.value as Plan['planType'] })}
              className="field mt-1"
            >
              <option value="DPM">Days per month (DPM)</option>
              <option value="FULL">Full ownership</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Status
            <select
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
              Revenue share: <span className="font-semibold text-ocean">{(derivedFraction * 100).toFixed(1)}%</span>
            </div>
            <Button type="submit" disabled={creating || !canSubmit}>
              {creating ? 'Creating...' : 'Create plan'}
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
                      <td className="p-3">৳ {(p.price || 0).toLocaleString()}</td>
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
