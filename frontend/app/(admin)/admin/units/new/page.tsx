'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';

export default function AdminCreateUnitPage() {
  const [id, setId] = useState('');
  const [floor, setFloor] = useState<number | ''>('');
  const [type, setType] = useState('Standard');
  const [size, setSize] = useState<number | ''>('');
  const [view, setView] = useState('Sea');
  const [totalPrice, setTotalPrice] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const canSubmit = id.trim() && floor !== '' && type && size !== '' && view && totalPrice !== '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setCreatedId('');
    try {
      const json = await api('/suites', {
        method: 'POST',
        body: JSON.stringify({
          id: id.trim(),
          floor: Number(floor),
          type,
          size: Number(size),
          view,
          totalPrice: Number(totalPrice)
        })
      });
      if (json?.ok || json?.suite || json?.id) {
        setCreatedId(id.trim());
        setId('');
        setFloor('');
        setSize('');
        setTotalPrice('');
      } else {
        setError(json?.error === 'conflict' ? 'A unit with this ID already exists' : json?.error || 'Failed to create unit');
      }
    } catch {
      setError('Failed to create unit');
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Inventory · Step 1 of 2</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Create Unit</h1>
      <p className="mt-3 text-ocean/75">
        Add a suite to inventory, then attach share plans to put it on sale.
      </p>

      {error && <div className="mt-5 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {createdId && (
        <div className="mt-5 border border-gold/40 bg-gold/10 p-5">
          <div className="font-display text-xl text-ocean">Unit {createdId} created</div>
          <p className="mt-1 text-sm text-ocean/75">
            Next: add share plans so buyers can see it in the catalog.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/admin/units/${createdId}/plans`}>
              <Button>Add share plans</Button>
            </Link>
            <Link href="/admin/units">
              <Button variant="outline">View all units</Button>
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5 border border-ocean/10 bg-white p-6">
        <label className="block text-sm font-medium text-ocean">
          Unit ID
          <input value={id} onChange={(e) => setId(e.target.value)} className="field mt-1" placeholder="S-505" />
          <span className="mt-1 block text-xs font-normal text-ocean/60">
            Shown to buyers and used across bookings — pick a stable code.
          </span>
        </label>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-ocean">
            Floor
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value === '' ? '' : Number(e.target.value))}
              className="field mt-1"
              placeholder="5"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Category
            <select value={type} onChange={(e) => setType(e.target.value)} className="field mt-1">
              <option>Standard</option>
              <option>Delux</option>
              <option>Premium</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Size (sq ft)
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value === '' ? '' : Number(e.target.value))}
              className="field mt-1"
              placeholder="350"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            View
            <select value={view} onChange={(e) => setView(e.target.value)} className="field mt-1">
              <option>Sea</option>
              <option>Hill</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-ocean">
          Total price (BDT)
          <input
            type="number"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="field mt-1"
            placeholder="8500000"
          />
        </label>

        <div className="flex items-center gap-3 border-t border-ocean/10 pt-5">
          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? 'Creating...' : 'Create unit'}
          </Button>
          <Link href="/admin/units" className="text-sm font-semibold text-ocean underline">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
