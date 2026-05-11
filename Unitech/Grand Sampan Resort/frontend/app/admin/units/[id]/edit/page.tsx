'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiBaseUrl } from '@/lib/apiBase';

export default function AdminEditUnitPage({ params }: { params: { id: string } }) {
  const unitId = params.id;
  const [form, setForm] = useState({ id: unitId, floor: '', type: 'Standard', size: '', view: 'Sea', totalPrice: '', planImage: '', layoutImage: '', viewImages: [] } as any);
  const [planImageFile, setPlanImageFile] = useState<File | null>(null);
  const [layoutImageFile, setLayoutImageFile] = useState<File | null>(null);
  const [viewImageFiles, setViewImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBaseUrl()}/suites/${unitId}`);
      const json = await res.json();
      const s = json?.suite ?? json;
      if (s && s.id) {
        setForm({
          id: s.id,
          floor: s.floor,
          type: s.type,
          size: s.size,
          view: s.view,
          totalPrice: s.totalPrice,
          planImage: s.planImage || '',
          layoutImage: s.layoutImage || '',
          viewImages: s.viewImages || []
        });
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    setError('');

    try {
      let uploadedImageUrl = form.planImage;
      let uploadedLayoutUrl = form.layoutImage;
      let uploadedViewUrls: string[] = [...(form.viewImages || [])];

      const uploadFile = async (file: File, label: string) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/cms/upload', { method: 'POST', body: formData });
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

      const payload = {
        floor: Number(form.floor),
        type: form.type,
        size: Number(form.size),
        view: form.view,
        totalPrice: Number(form.totalPrice),
        ...(uploadedImageUrl && { planImage: uploadedImageUrl }),
        ...(uploadedLayoutUrl && { layoutImage: uploadedLayoutUrl }),
        ...(uploadedViewUrls.length > 0 && { viewImages: uploadedViewUrls })
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${apiBaseUrl()}/suites/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Failed to save unit: ${await res.text()}`);
      }
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">Edit Unit</h1>
        <Link href="/admin/units" className="rounded border border-ocean px-4 py-2 text-ocean">
          View Units
        </Link>
      </div>
      <p className="mt-3 text-ocean/80">Update suite details.</p>

      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <form onSubmit={save} className="mt-8 space-y-4 rounded-lg border border-gold/30 bg-white p-6">
        <div>
          <label className="block text-sm text-ocean">Unit ID</label>
          <input value={form.id} disabled className="mt-1 w-full rounded border border-ocean/20 bg-ocean/5 px-2 py-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Floor</label>
            <input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Category</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
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
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value === '' ? '' : Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">View</label>
            <select
              value={form.view}
              onChange={(e) => setForm({ ...form, view: e.target.value })}
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
              value={form.totalPrice}
              onChange={(e) => setForm({ ...form, totalPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
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
            {form.planImage && !planImageFile && (
              <p className="mt-1 text-xs text-ocean/60">Current: {form.planImage}</p>
            )}
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
            {form.layoutImage && !layoutImageFile && (
              <p className="mt-1 text-xs text-ocean/60">Current: {form.layoutImage}</p>
            )}
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
            {form.viewImages && form.viewImages.length > 0 && viewImageFiles.length === 0 && (
              <p className="mt-1 text-xs text-ocean/60">Current: {form.viewImages.length} images</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
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

