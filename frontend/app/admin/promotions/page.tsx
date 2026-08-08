'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';

type Promotion = {
  id: string;
  name: string;
  discountPct: number;
  scope: 'all' | 'category' | 'plans';
  suiteTypes: string[];
  planIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
};

type Plan = {
  id: string;
  name: string;
  daysPerMonth: number;
  price: number;
  suiteId?: string;
  planStatus?: string;
};

const adminHeaders = { Authorization: 'Bearer admin' };
const SUITE_TYPES = ['Standard', 'Delux', 'Premium'];

function toDateInput(iso: string) {
  return iso ? iso.slice(0, 10) : '';
}

const emptyForm = {
  name: '',
  discountPct: 5,
  scope: 'all' as Promotion['scope'],
  suiteTypes: [] as string[],
  planIds: [] as string[],
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: '',
  active: true
};

function promoStatus(p: Promotion): 'live' | 'scheduled' | 'expired' | 'disabled' {
  if (!p.active) return 'disabled';
  const now = new Date();
  if (new Date(p.startsAt) > now) return 'scheduled';
  if (new Date(p.endsAt) < now) return 'expired';
  return 'live';
}

const statusChip: Record<string, string> = {
  live: 'border-gold bg-gold/90 text-ocean',
  scheduled: 'border-ocean/40 bg-white text-ocean',
  expired: 'border-ocean/15 bg-pearl text-ocean/50',
  disabled: 'border-ocean/15 bg-pearl text-ocean/50'
};

export default function AdminPromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [promoJson, plansJson] = await Promise.all([api('/promotions'), api('/timeshares')]);
      setItems(Array.isArray(promoJson?.items) ? promoJson.items : []);
      const planList = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
      setPlans(planList);
    } catch {
      setError('Failed to load promotions');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const unsoldPlans = useMemo(
    () => plans.filter((p) => (p.planStatus || 'Unsold').toLowerCase() === 'unsold'),
    [plans]
  );

  function eligibleCount(p: Promotion) {
    if (p.scope === 'all') return unsoldPlans.length;
    if (p.scope === 'plans') return p.planIds.filter((id) => unsoldPlans.some((pl) => pl.id === id)).length;
    // category scope needs the suite type; approximate via plan's suite id prefix lookup is unreliable,
    // so count plans whose suite type matches from the suites embedded in plan names isn't possible here.
    return null;
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setNotice('');
  }

  function startEdit(p: Promotion) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      discountPct: p.discountPct,
      scope: p.scope,
      suiteTypes: p.suiteTypes || [],
      planIds: p.planIds || [],
      startsAt: toDateInput(p.startsAt),
      endsAt: toDateInput(p.endsAt),
      active: p.active
    });
    setError('');
    setNotice('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleInList(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) return setError('Package name is required.');
    const pct = Number(form.discountPct);
    if (!Number.isInteger(pct) || pct < 1 || pct > 50) return setError('Discount must be a whole number between 1 and 50.');
    if (!form.startsAt || !form.endsAt) return setError('Start and end dates are required.');
    if (new Date(form.endsAt) < new Date(form.startsAt)) return setError('End date cannot be before start date.');
    if (form.scope === 'category' && form.suiteTypes.length === 0)
      return setError('Choose at least one suite category.');
    if (form.scope === 'plans' && form.planIds.length === 0)
      return setError('Choose at least one plan.');

    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name,
      discountPct: pct,
      scope: form.scope,
      suiteTypes: form.scope === 'category' ? form.suiteTypes : [],
      planIds: form.scope === 'plans' ? form.planIds : [],
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      active: form.active
    };
    try {
      const res = editingId
        ? await api(`/promotions/${editingId}`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify(payload)
          })
        : await api('/promotions', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify(payload)
          });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to save package');
      } else {
        setNotice(editingId ? 'Package updated.' : 'Package created.');
        startCreate();
        await load();
      }
    } catch {
      setError('Failed to save package');
    }
    setSaving(false);
  }

  async function toggleActive(p: Promotion) {
    setError('');
    try {
      const res = await api(`/promotions/${p.id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ active: !p.active })
      });
      if (res?.ok) await load();
      else setError('Failed to update package');
    } catch {
      setError('Failed to update package');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this promotion package?')) return;
    setError('');
    try {
      const res = await api(`/promotions/${id}`, { method: 'DELETE', headers: adminHeaders });
      if (res?.ok) {
        setNotice('Package deleted.');
        if (editingId === id) startCreate();
        await load();
      } else {
        setError('Failed to delete package');
      }
    } catch {
      setError('Failed to delete package');
    }
  }

  function scopeSummary(p: Promotion) {
    if (p.scope === 'all') return 'All plans';
    if (p.scope === 'category') return `Category: ${p.suiteTypes.join(', ') || '—'}`;
    return `${p.planIds.length} selected plan${p.planIds.length === 1 ? '' : 's'}`;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Sales</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Promotions</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Time-bound discount packages to expedite sales. Live packages automatically show discounted
            prices to buyers and apply at checkout.
          </p>
        </div>
        <Link href="/invest">
          <Button variant="outline">View invest page</Button>
        </Link>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{notice}</div>}

      <form onSubmit={save} className="mt-8 space-y-5 border border-ocean/10 bg-white p-6">
        <h2 className="font-display text-2xl text-ocean">
          {editingId ? 'Edit package' : 'Create package'}
        </h2>

        <label className="block text-sm font-medium text-ocean">
          Package name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field mt-1"
            placeholder="Eid Launch Offer"
            maxLength={120}
          />
        </label>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <label className="block text-sm font-medium text-ocean">
            Discount (%)
            <input
              type="number"
              min={1}
              max={50}
              value={form.discountPct}
              onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })}
              className="field mt-1"
            />
            <span className="mt-1 block text-xs font-normal text-ocean/60">
              Typical promotional range is 5–10%.
            </span>
            {Number(form.discountPct) > 20 && (
              <span className="mt-1 block text-xs font-semibold text-amber-700">
                High discount — double-check before saving.
              </span>
            )}
          </label>
          <label className="block text-sm font-medium text-ocean">
            Starts
            <input
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Ends (inclusive)
            <input
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="field mt-1"
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ocean">Applies to</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-ocean">
            {(
              [
                ['all', 'All plans'],
                ['category', 'Suite category'],
                ['plans', 'Specific plans']
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  checked={form.scope === value}
                  onChange={() => setForm({ ...form, scope: value })}
                />
                {label}
              </label>
            ))}
          </div>

          {form.scope === 'category' && (
            <div className="mt-3 flex flex-wrap gap-4 border-l-2 border-gold/40 pl-4 text-sm text-ocean">
              {SUITE_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.suiteTypes.includes(t)}
                    onChange={() => setForm({ ...form, suiteTypes: toggleInList(form.suiteTypes, t) })}
                  />
                  {t}
                </label>
              ))}
            </div>
          )}

          {form.scope === 'plans' && (
            <div className="mt-3 max-h-56 space-y-2 overflow-auto border-l-2 border-gold/40 pl-4 text-sm text-ocean">
              {unsoldPlans.length === 0 && <p className="text-ocean/60">No unsold plans available.</p>}
              {unsoldPlans.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.planIds.includes(p.id)}
                    onChange={() => setForm({ ...form, planIds: toggleInList(form.planIds, p.id) })}
                  />
                  <span>
                    {p.id} — {p.name} · {p.daysPerMonth} days/mo · {p.suiteId || 'no suite'} · ৳{' '}
                    {p.price?.toLocaleString?.() ?? p.price}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm font-medium text-ocean">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>

        <div className="flex flex-wrap gap-2 border-t border-ocean/10 pt-5">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update package' : 'Create package'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={startCreate}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ocean">Packages</h2>
        {loading && <p className="mt-4 text-sm text-ocean/60">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="mt-4 border border-dashed border-ocean/20 p-4 text-sm text-ocean/60">
            No promotion packages yet. Create the first one above.
          </p>
        )}
        <div className="mt-4 space-y-4">
          {items.map((p) => {
            const status = promoStatus(p);
            const count = eligibleCount(p);
            return (
              <div key={p.id} className="border border-ocean/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3
                    className={`font-display text-xl text-ocean ${
                      status === 'disabled' ? 'line-through opacity-60' : ''
                    }`}
                  >
                    {p.name}
                  </h3>
                  <span
                    className={`border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusChip[status]}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="mt-1 text-ocean/80">
                  {p.discountPct}% off · {scopeSummary(p)}
                </p>
                <p className="mt-1 text-sm text-ocean/60">
                  {new Date(p.startsAt).toLocaleDateString()} – {new Date(p.endsAt).toLocaleDateString()}
                  {count !== null && <> · {count} unsold plan{count === 1 ? '' : 's'} eligible</>}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => startEdit(p)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => toggleActive(p)}>
                    {p.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => remove(p.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
