'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminCreateUnitPage() {
  const [id, setId] = useState('');
  const [floor, setFloor] = useState<number | ''>('');
  const [type, setType] = useState('Standard');
  const [size, setSize] = useState<number | ''>('');
  const [view, setView] = useState('Sea');
  const [totalPrice, setTotalPrice] = useState<number | ''>('');
  const [planImageFile, setPlanImageFile] = useState<File | null>(null);
  const [layoutImageFile, setLayoutImageFile] = useState<File | null>(null);
  const [viewImageFiles, setViewImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const canSubmit = id && floor !== '' && type && size && view && totalPrice !== '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);

    try {
      let uploadedImageUrl = '';
      let uploadedLayoutUrl = '';
      let uploadedViewUrls: string[] = [];

      // Helper to upload a single file
      const uploadFile = async (file: File, label: string) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const { url } = await res.json();
          return url;
        } else {
          const errText = await res.text();
          throw new Error(`Failed to upload ${label}: ${errText}`);
        }
      };

      if (planImageFile) {
        const url = await uploadFile(planImageFile, 'Architectural Plan');
        if (url) uploadedImageUrl = url;
      }

      if (layoutImageFile) {
        const url = await uploadFile(layoutImageFile, 'Layout Plan');
        if (url) uploadedLayoutUrl = url;
      }

      if (viewImageFiles.length > 0) {
        for (let i = 0; i < viewImageFiles.length; i++) {
          const url = await uploadFile(viewImageFiles[i], `View Image ${i + 1}`);
          if (url) uploadedViewUrls.push(url);
        }
      }

      const payload: any = {
        id,
        floor: Number(floor),
        type,
        size: Number(size),
        view,
        totalPrice: Number(totalPrice)
      };
      if (uploadedImageUrl) payload.planImage = uploadedImageUrl;
      if (uploadedLayoutUrl) payload.layoutImage = uploadedLayoutUrl;
      if (uploadedViewUrls.length > 0) payload.viewImages = uploadedViewUrls;

      const json = await api('/suites', { method: 'POST', body: JSON.stringify(payload) });
      if (!json?.ok) throw new Error(json?.error || json?.message || `Failed to create unit (${json?.__httpStatus ?? 'unknown'})`);
      setResult(json);
      // Optional: Clear form on success
      setId('');
      setFloor('');
      setSize('');
      setTotalPrice('');
      setPlanImageFile(null);
      setLayoutImageFile(null);
      setViewImageFiles([]);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred while creating the unit.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Create Unit</h1>
      <p className="mt-3 text-ocean/80">Add a new suite unit to inventory.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-lg border border-gold/30 bg-white p-6">
        <div>
          <label className="block text-sm text-ocean">Unit ID</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            placeholder="S-505"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Floor</label>
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Standard</option>
              <option>Delux</option>
              <option>Premium</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Size (sq ft)</label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
              placeholder="350 sq ft"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">View</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Sea</option>
              <option>Hill</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Price (BDT)</label>
            <input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
              placeholder="200000"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Architectural Plan Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPlanImageFile(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1 bg-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Layout Plan Image (Location in floor)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLayoutImageFile(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">View Images (Select multiple)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setViewImageFiles(Array.from(e.target.files || []))}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Unit'}
          </button>
          <Link href="/admin" className="text-ocean underline">
            Back to Admin
          </Link>
        </div>
      </form>

      {result && (
        <div className="mt-6 rounded border border-ocean/20 bg-white p-4 text-sm text-ocean">
          <div>Response:</div>
          <pre className="mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          <div className="mt-3">
            <Link href="/admin/units" className="text-ocean underline">
              View Units
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

