'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Button from '@/components/Button';
import MediaManager from '@/components/admin/MediaManager';

export default function AdminEditUnitPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const unitId = params.id;
  const [form, setForm] = useState({ id: unitId, floor: '', type: 'Standard', size: '', view: 'Sea', totalPrice: '' } as any);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const json = await api(`/suites/${unitId}`);
      const s = json?.suite ?? json;
      if (s && s.id) {
        setForm({ id: s.id, floor: s.floor, type: s.type, size: s.size, view: s.view, totalPrice: s.totalPrice });
      } else {
        setError('Unit not found');
      }
    } catch {
      setError('Failed to load unit');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function unitErrorMessage(code?: string) {
    if (code === 'conflict') return 'Another unit already uses this ID';
    if (code === 'not_found') return 'Unit not found';
    if (code === 'has_bookings') {
      return 'This unit has sales/bookings and cannot be deleted. Remove those bookings first, or keep the unit.';
    }
    if (code === 'missing_id') return 'Unit ID is required';
    return code || 'Request failed';
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const nextId = String(form.id || '').trim();
    if (!nextId) {
      setError('Unit ID is required');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const json = await api(`/suites/${unitId}`, {
        method: 'PUT',
        body: JSON.stringify({
          id: nextId,
          floor: Number(form.floor),
          type: form.type,
          size: Number(form.size),
          view: form.view,
          totalPrice: Number(form.totalPrice)
        })
      });
      if (json?.ok) {
        if (json.renamedFrom || nextId !== unitId) {
          setNotice(`Unit renamed to ${nextId}. Redirecting…`);
          router.replace(`/admin/units/${encodeURIComponent(nextId)}/edit`);
        } else {
          setNotice('Changes saved.');
        }
      } else {
        setError(unitErrorMessage(json?.error));
      }
    } catch {
      setError('Failed to save changes');
    }
    setSaving(false);
  }

  async function deleteUnit() {
    const ok = window.confirm(
      `Delete unit ${unitId}? This also removes its share plans and architectural images. Units with existing bookings cannot be deleted.`
    );
    if (!ok) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      const json = await api(`/suites/${unitId}`, { method: 'DELETE' });
      if (json?.ok) {
        router.replace('/admin/units');
        return;
      }
      setError(unitErrorMessage(json?.error));
    } catch {
      setError('Failed to delete unit');
    }
    setDeleting(false);
  }

  const idChanged = String(form.id || '').trim() !== unitId;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Inventory</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Edit unit · {unitId}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/units/${unitId}/plans`}>
            <Button variant="outline">Share plans</Button>
          </Link>
          <Link href="/admin/units">
            <Button variant="ghost">All units</Button>
          </Link>
        </div>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{notice}</div>}

      <form onSubmit={save} className="mt-6 space-y-5 border border-ocean/10 bg-white p-6">
        <label className="block text-sm font-medium text-ocean">
          Unit ID
          <input
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
            className="field mt-1"
            required
          />
          <span className="mt-1 block text-xs font-normal text-ocean/60">
            {idChanged
              ? `Saving will rename this unit from ${unitId} to ${String(form.id).trim()} and update linked plans, media, and bookings.`
              : 'You can rename this unit. Linked plans and media stay attached to the new ID.'}
          </span>
        </label>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-ocean">
            Floor
            <input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Category
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="field mt-1">
              <option>Standard</option>
              <option>Delux</option>
              <option>Premium</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Size (sq ft)
            <input
              type="number"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value === '' ? '' : Number(e.target.value) })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            View
            <select value={form.view} onChange={(e) => setForm({ ...form, view: e.target.value })} className="field mt-1">
              <option>Sea</option>
              <option>Hill</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-ocean">
          Total price (BDT)
          <input
            type="number"
            value={form.totalPrice}
            onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
            className="field mt-1"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ocean/10 pt-5">
          <Button type="submit" disabled={saving || loading || deleting}>
            {saving ? 'Saving...' : idChanged ? 'Save & rename' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" disabled={saving || deleting} onClick={deleteUnit}>
            {deleting ? 'Deleting...' : 'Delete unit'}
          </Button>
        </div>
      </form>

      <div className="mt-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold">Architectural plans</p>
        <h2 className="font-display mt-1 text-2xl text-ocean">Plans buyers see for this unit</h2>
        <p className="mt-2 text-sm text-ocean/75">
          Shown on the buyer&apos;s plan page so they can review the unit layout and its position on the floor before
          purchasing.
        </p>
        <div className="mt-5 space-y-6">
          <MediaManager
            category="suite_plan"
            suiteId={unitId}
            singleImage
            title="Unit floor plan"
            help="Architectural drawing of this suite's interior layout. A clear, high-resolution image or scan works best."
            emptyHint="No unit plan uploaded yet — buyers won't see a floor plan for this unit until you add one."
          />
          <MediaManager
            category="suite_keymap"
            suiteId={unitId}
            singleImage
            title="Key map — location on floor"
            help="Floor key map highlighting where this suite sits within the building floor."
            emptyHint="No key map uploaded yet — buyers won't see the suite's floor location until you add one."
          />
        </div>
      </div>
    </main>
  );
}
