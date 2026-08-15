'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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

export default function AdminEditPlanPage({ params }: { params: { id: string; planId: string } }) {
  const suiteId = params.id;
  const planId = params.planId;
  const router = useRouter();
  const [form, setForm] = useState<Partial<Plan>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const json = await api(`/timeshares/${planId}`);
      const p = json?.plan ?? json;
      if (p && p.id) {
        setForm({
          id: p.id,
          name: p.name,
          daysPerMonth: p.daysPerMonth,
          price: p.price,
          currency: p.currency,
          suiteId: p.suiteId ?? suiteId,
          planStatus: p.planStatus,
          planType: p.planType,
          timeFraction: p.timeFraction
        });
      } else {
        setError('Plan not found');
      }
    } catch {
      setError('Failed to load plan');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const targetId = (form.id ?? planId) as string;
      if ((targetId ?? '').trim().length === 0) {
        setError('Plan ID is required');
        setSaving(false);
        return;
      }
      const json = await api(`/timeshares/${planId}`, {
        method: 'PUT',
        body: JSON.stringify({
          id: targetId,
          name: form.name,
          daysPerMonth: Number(form.daysPerMonth),
          price: Number(form.price),
          planType: form.planType,
          planStatus: form.planStatus,
          timeFraction: typeof form.timeFraction === 'number' ? form.timeFraction : undefined
        })
      });
      if (!json?.ok) {
        const code = json?.error;
        const left = json?.remainingDays;
        setError(
          code === 'conflict'
            ? 'Plan ID already exists'
            : code === 'unit_capacity_full' || code === 'full_ownership_locked'
              ? 'This unit already uses the full 30 days/month.'
              : code === 'exceeds_month_capacity' || code === 'full_requires_empty_suite'
                ? `Updated days would exceed the unit’s 30 days/month${typeof left === 'number' ? ` (only ${left} left for other plans)` : ''}.`
                : code || 'Failed to save plan'
        );
        setSaving(false);
        return;
      }
      setResult(json);
      if (targetId !== planId) {
        router.replace(`/admin/units/${suiteId}/plans/${targetId}/edit`);
      }
    } catch {
      setError('Failed to save plan');
    }
    setSaving(false);
  }

  const derivedShare = ((form.timeFraction ?? ((form.daysPerMonth ?? 0) / 30)) * 100).toFixed(1);

  async function deleteCurrent() {
    setError('');
    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Delete this plan? Plans with existing investment bookings cannot be deleted.')
        : true;
    if (!ok) return;
    try {
      const json = await api(`/timeshares/${planId}`, {
        method: 'DELETE'
      });
      if (!json?.ok) {
        setError(
          json?.error === 'has_bookings'
            ? `Cannot delete — ${json.bookingCount || 'one or more'} booking(s) are linked to this planId.`
            : json?.error || 'Failed to delete plan'
        );
        return;
      }
      router.replace(`/admin/units/${suiteId}/plans`);
    } catch {
      setError('Failed to delete plan');
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">Edit Plan</h1>
        <div className="flex gap-2">
          <Link href={`/admin/units/${suiteId}/plans`} className="rounded border border-ocean px-4 py-2 text-ocean">
            Back to Plans
          </Link>
          <button onClick={deleteCurrent} className="rounded border border-red-600 px-4 py-2 text-red-700">
            Delete Plan
          </button>
        </div>
      </div>
      <p className="mt-3 text-ocean/80">Update plan details.</p>

      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <form onSubmit={save} className="mt-8 space-y-4 rounded-lg border border-gold/30 bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Plan ID</label>
            <input
              value={form.id ?? planId}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Suite ID</label>
            <input value={suiteId} disabled className="mt-1 w-full rounded border border-ocean/20 bg-ocean/5 px-2 py-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Name</label>
            <input
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Days/Month</label>
            <input
              type="number"
              min={0}
              max={30}
              value={form.daysPerMonth ?? 0}
              onChange={(e) => {
                const days = Math.max(0, Math.min(30, Number(e.target.value) || 0));
                setForm({
                  ...form,
                  daysPerMonth: days,
                  planType: days >= 30 ? 'FULL' : form.planType === 'FULL' ? 'DPM' : form.planType,
                  timeFraction: days >= 30 ? 1 : form.timeFraction
                });
              }}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Time Fraction (0–1)</label>
            <input
              type="number"
              step="0.001"
              value={form.timeFraction ?? 0}
              onChange={(e) => setForm({ ...form, timeFraction: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Price (BDT)</label>
            <input
              type="number"
              value={form.price ?? 0}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Type</label>
            <select
              value={form.planType ?? 'DPM'}
              onChange={(e) => {
                const planType = e.target.value as 'FULL' | 'DPM';
                setForm(
                  planType === 'FULL'
                    ? { ...form, planType: 'FULL', daysPerMonth: 30, timeFraction: 1 }
                    : { ...form, planType: 'DPM', daysPerMonth: (form.daysPerMonth ?? 0) >= 30 ? 7 : form.daysPerMonth }
                );
              }}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option value="DPM">DPM</option>
              <option value="FULL">FULL (30 days — locks unit)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-ocean">Status</label>
            <select
              value={form.planStatus ?? 'Unsold'}
              onChange={(e) => setForm({ ...form, planStatus: e.target.value as any })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Unsold</option>
              <option>Reserved</option>
              <option>Booked</option>
              <option>Resale</option>
              <option>Transferred</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-ocean">Revenue Share (%)</label>
          <div className="mt-1 rounded border border-ocean/20 bg-ocean/5 px-2 py-1 text-ocean/70">{derivedShare}%</div>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={saving} className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 rounded border border-ocean/20 bg-white p-4 text-sm text-ocean">
          <div>Response:</div>
          <pre className="mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}

