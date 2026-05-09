'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Plan = {
  id: string;
  name: string;
  daysPerMonth: number;
  price: number;
  currency?: 'BDT';
  suiteId?: string;
  planStatus?: 'Unsold' | 'Reserved' | 'Booked' | 'Resale' | 'Transferred';
  planType?: 'FULL' | 'DPM';
  timeFraction?: number;
};

export default function AdminSuitePlansPage({ params }: { params: { id: string } }) {
  const suiteId = params.id;
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Plan>({
    id: '',
    name: '',
    daysPerMonth: 0,
    price: 0,
    currency: 'BDT',
    suiteId,
    planType: 'DPM',
    planStatus: 'Unsold',
    timeFraction: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:4000/suites/${suiteId}/plans`);
      const json = await res.json();
      setItems(json?.plans ?? []);
    } catch {
      setError('Failed to load plans');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canSubmit = (createForm.id ?? '').trim().length > 0;

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError('Plan ID is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/timeshares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin' },
        body: JSON.stringify({
          ...createForm,
          suiteId,
          currency: 'BDT'
        })
      });
      const json = await res.json();
      if (json?.ok) {
        setCreateForm({
          id: '',
          name: '',
          daysPerMonth: 0,
          price: 0,
          currency: 'BDT',
          suiteId,
          planType: 'DPM',
          planStatus: 'Unsold'
        });
        await load();
      } else {
        setError(json?.error || 'Failed to create plan');
      }
    } catch {
      setError('Failed to create plan');
    }
    setCreating(false);
  }

  async function deletePlan(id: string) {
    setError('');
    try {
      const res = await fetch(`http://localhost:4000/timeshares/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin' }
      });
      const json = await res.json();
      if (json?.ok) {
        await load();
      } else {
        setError('Failed to delete plan');
      }
    } catch {
      setError('Failed to delete plan');
    }
  }

  async function saveEdit(id: string) {
    setError('');
    try {
      const res = await fetch(`http://localhost:4000/timeshares/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin' },
        body: JSON.stringify(editForm)
      });
      const json = await res.json();
      if (json?.ok) {
        setEditingId(null);
        setEditForm({});
        await load();
      } else {
        setError(json?.error || 'Failed to update plan');
      }
    } catch {
      setError('Failed to update plan');
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">Share Plans for {suiteId}</h1>
        <div className="flex gap-2">
          <button onClick={load} className="rounded bg-ocean px-4 py-2 text-white">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/admin/units" className="rounded border border-ocean px-4 py-2 text-ocean">
            View Units
          </Link>
        </div>
      </div>

      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="mt-6 rounded border border-gold/30 bg-white p-6">
        <h2 className="text-xl text-ocean">Create Plan</h2>
        <form onSubmit={createPlan} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-ocean">Plan ID</label>
            <input
              required
              value={createForm.id}
              onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
              placeholder="P-7D"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Name</label>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
              placeholder="7 days/month"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Days/Month</label>
            <input
              type="number"
              value={createForm.daysPerMonth}
              onChange={(e) => setCreateForm({ ...createForm, daysPerMonth: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Price (BDT)</label>
            <input
              type="number"
              value={createForm.price}
              onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Time Fraction (0–1)</label>
            <input
              type="number"
              step="0.001"
              value={createForm.timeFraction ?? 0}
              onChange={(e) => setCreateForm({ ...createForm, timeFraction: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
              placeholder="0.1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">
              Revenue Share (%) — derived from timeFraction
              <span
                className="ml-2 inline-block rounded border border-ocean/20 px-1 text-xs text-ocean/70"
                title="Share = (daysPerMonth ÷ 30) × 100; taxes/fees handled in policy settings"
              >
                ?
              </span>
            </label>
            <div className="mt-1 rounded border border-ocean/20 bg-ocean/5 px-2 py-1 text-ocean/70">
              {(((createForm.timeFraction ?? (createForm.daysPerMonth ? createForm.daysPerMonth / 30 : 0)) * 100)).toFixed(1)}%
            </div>
          </div>
          <div>
            <label className="block text-sm text-ocean">Type</label>
            <select
              value={createForm.planType}
              onChange={(e) => setCreateForm({ ...createForm, planType: e.target.value as any })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option value="DPM">DPM</option>
              <option value="FULL">FULL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-ocean">Status</label>
            <select
              value={createForm.planStatus}
              onChange={(e) => setCreateForm({ ...createForm, planStatus: e.target.value as any })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Unsold</option>
              <option>Reserved</option>
              <option>Booked</option>
              <option>Resale</option>
              <option>Transferred</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={creating || !canSubmit} className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-auto rounded border border-gold/30 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ocean">
              <th className="text-left p-3">Plan ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Days/Month</th>
              <th className="text-left p-3">Price (BDT)</th>
              <th className="text-left p-3">Revenue Share (%)</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Time Fraction</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-ocean/10">
                <td className="p-3">{p.id}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.planType}</td>
                <td className="p-3">{p.daysPerMonth}</td>
                <td className="p-3">৳ {p.price}</td>
                <td className="p-3">{((p.timeFraction ?? 0) * 100).toFixed(1)}%</td>
                <td className="p-3">{p.planStatus}</td>
                <td className="p-3">{p.timeFraction}</td>
                <td className="p-3">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Price"
                        className="w-24 rounded border border-ocean/20 px-2 py-1"
                        onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      />
                      <select
                        className="rounded border border-ocean/20 px-2 py-1"
                        onChange={(e) => setEditForm({ ...editForm, planStatus: e.target.value as any })}
                        defaultValue={p.planStatus}
                      >
                        <option>Unsold</option>
                        <option>Reserved</option>
                        <option>Booked</option>
                        <option>Resale</option>
                        <option>Transferred</option>
                      </select>
                      <button onClick={() => saveEdit(p.id)} className="rounded bg-ocean px-3 py-1 text-white">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded border border-ocean px-3 py-1 text-ocean">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingId(p.id)} className="text-ocean underline">
                        Edit
                      </button>
                      <button onClick={() => deletePlan(p.id)} className="text-red-700 underline">
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="p-3 text-ocean/70" colSpan={10}>
                  No share plans found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

