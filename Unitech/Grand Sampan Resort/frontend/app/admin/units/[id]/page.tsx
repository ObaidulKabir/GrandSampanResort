'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminUnitDashboardPage({ params }: { params: { id: string } }) {
  const unitId = params.id;
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaBusy, setMediaBusy] = useState<'plan' | 'layout' | 'views-add' | `views-del-${number}` | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [planImageFile, setPlanImageFile] = useState<File | null>(null);
  const [layoutImageFile, setLayoutImageFile] = useState<File | null>(null);
  const [viewImageFiles, setViewImageFiles] = useState<File[]>([]);

  const uploadFile = async (file: File, label: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/cms/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Failed to upload ${label}`);
    const json = await res.json().catch(() => null);
    const url = json?.url;
    if (!url) throw new Error(`Upload returned no URL for ${label}`);
    return url as string;
  };

  async function load() {
    setLoading(true);
    setError('');
    try {
      const json = await api(`/suites/${unitId}`, { method: 'GET' });
      setUnit(json?.suite ?? json);
    } catch (err: any) {
      setError('Failed to load unit dashboard');
    }
    setLoading(false);
  }

  async function replacePlan() {
    if (!planImageFile) return;
    setMediaError('');
    setMediaBusy('plan');
    try {
      const url = await uploadFile(planImageFile, 'Architectural Plan');
      const json = await api(`/suites/${unitId}`, { method: 'PUT', body: JSON.stringify({ planImage: url }) });
      if (!json?.ok) throw new Error(json?.error || json?.message || 'Failed to update plan image');
      setUnit((prev: any) => ({ ...(prev || {}), planImage: url }));
      setPlanImageFile(null);
    } catch (e: any) {
      setMediaError(e?.message || 'Failed to update plan image');
    } finally {
      setMediaBusy(null);
    }
  }

  async function replaceLayout() {
    if (!layoutImageFile) return;
    setMediaError('');
    setMediaBusy('layout');
    try {
      const url = await uploadFile(layoutImageFile, 'Layout Plan');
      const json = await api(`/suites/${unitId}`, { method: 'PUT', body: JSON.stringify({ layoutImage: url }) });
      if (!json?.ok) throw new Error(json?.error || json?.message || 'Failed to update layout image');
      setUnit((prev: any) => ({ ...(prev || {}), layoutImage: url }));
      setLayoutImageFile(null);
    } catch (e: any) {
      setMediaError(e?.message || 'Failed to update layout image');
    } finally {
      setMediaBusy(null);
    }
  }

  async function addViewImages() {
    if (!viewImageFiles.length) return;
    setMediaError('');
    setMediaBusy('views-add');
    try {
      const uploaded = await Promise.all(viewImageFiles.map((f, i) => uploadFile(f, `View Image ${i + 1}`)));
      const existing = Array.isArray(unit?.viewImages) ? unit.viewImages : [];
      const next = [...existing, ...uploaded];
      const json = await api(`/suites/${unitId}`, { method: 'PUT', body: JSON.stringify({ viewImages: next }) });
      if (!json?.ok) throw new Error(json?.error || json?.message || 'Failed to update view images');
      setUnit((prev: any) => ({ ...(prev || {}), viewImages: next }));
      setViewImageFiles([]);
    } catch (e: any) {
      setMediaError(e?.message || 'Failed to add view images');
    } finally {
      setMediaBusy(null);
    }
  }

  async function deleteViewImage(index: number) {
    const existing = Array.isArray(unit?.viewImages) ? unit.viewImages : [];
    if (!existing[index]) return;
    setMediaError('');
    setMediaBusy(`views-del-${index}`);
    try {
      const next = existing.filter((_: any, i: number) => i !== index);
      const json = await api(`/suites/${unitId}`, { method: 'PUT', body: JSON.stringify({ viewImages: next }) });
      if (!json?.ok) throw new Error(json?.error || json?.message || 'Failed to delete view image');
      setUnit((prev: any) => ({ ...(prev || {}), viewImages: next }));
    } catch (e: any) {
      setMediaError(e?.message || 'Failed to delete view image');
    } finally {
      setMediaBusy(null);
    }
  }

  useEffect(() => {
    load();
  }, [unitId]);

  if (loading) {
    return <div className="p-16 text-center text-ocean">Loading unit dashboard...</div>;
  }

  if (error || !unit) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          {error || 'Unit not found'}
        </div>
        <div className="mt-4">
          <Link href="/admin/units" className="text-ocean underline">← Back to Units</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/units" className="text-sm text-ocean/60 hover:text-ocean mb-2 inline-block">
            ← Back to Units List
          </Link>
          <h1 className="font-['Playfair Display'] text-4xl text-ocean">Unit Dashboard: {unit.id}</h1>
          <p className="mt-1 text-ocean/80">Manage all data, media, and plans related to this unit.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/units/${unit.id}/edit`} className="rounded bg-ocean px-5 py-2 text-white shadow-sm hover:bg-ocean/90 transition">
            Edit Data & Media
          </Link>
          <Link href={`/admin/units/${unit.id}/plans`} className="rounded border border-ocean bg-white px-5 py-2 text-ocean shadow-sm hover:bg-ocean/5 transition">
            Manage Plans
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Data Overview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Details Card */}
          <div className="rounded-xl border border-gold/30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-['Playfair Display'] text-ocean font-semibold">Unit Data</h2>
              <Link href={`/admin/units/${unit.id}/edit`} className="text-sm text-gold hover:underline">Edit</Link>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-ocean/5 pb-2">
                <span className="text-ocean/60">Unit ID</span>
                <span className="font-medium text-ocean">{unit.id}</span>
              </div>
              <div className="flex justify-between border-b border-ocean/5 pb-2">
                <span className="text-ocean/60">Category Type</span>
                <span className="font-medium text-ocean">{unit.type}</span>
              </div>
              <div className="flex justify-between border-b border-ocean/5 pb-2">
                <span className="text-ocean/60">Floor Number</span>
                <span className="font-medium text-ocean">{unit.floor}</span>
              </div>
              <div className="flex justify-between border-b border-ocean/5 pb-2">
                <span className="text-ocean/60">Size</span>
                <span className="font-medium text-ocean">{unit.size} sq ft</span>
              </div>
              <div className="flex justify-between border-b border-ocean/5 pb-2">
                <span className="text-ocean/60">View</span>
                <span className="font-medium text-ocean">{unit.view}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-ocean/60">Total Price</span>
                <span className="font-semibold text-ocean">৳ {unit.totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Card */}
          <div className="rounded-xl border border-gold/30 bg-white p-6 shadow-sm bg-ocean/5">
            <h2 className="text-lg font-['Playfair Display'] text-ocean font-semibold mb-3">Media Status</h2>
            <ul className="space-y-2 text-sm text-ocean/80">
              <li className="flex items-center gap-2">
                <span className={unit.planImage ? "text-green-600" : "text-red-500"}>{unit.planImage ? '✓' : '✗'}</span>
                Architectural Plan
              </li>
              <li className="flex items-center gap-2">
                <span className={unit.layoutImage ? "text-green-600" : "text-red-500"}>{unit.layoutImage ? '✓' : '✗'}</span>
                Layout Image
              </li>
              <li className="flex items-center gap-2">
                <span className={unit.viewImages?.length > 0 ? "text-green-600" : "text-amber-500"}>
                  {unit.viewImages?.length > 0 ? `✓ ${unit.viewImages.length} uploaded` : '✗ None'}
                </span>
                View Images
              </li>
            </ul>
          </div>

          {mediaError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {mediaError}
            </div>
          )}
        </div>

        {/* Right Column: Media Previews */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Primary Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gold/30 bg-white p-6 shadow-sm flex flex-col">
              <h3 className="text-lg font-['Playfair Display'] text-ocean font-semibold mb-4">Architectural Plan</h3>
              {unit.planImage ? (
                <div className="relative w-full aspect-[3/4] bg-ocean/5 rounded overflow-hidden border border-ocean/10 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unit.planImage} alt="Architectural Plan" className="object-contain w-full h-full p-2" />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-ocean/5 rounded border border-dashed border-ocean/20 text-ocean/50 text-sm p-6 text-center min-h-[300px]">
                  No Architectural Plan uploaded yet.
                </div>
              )}
              <div className="mt-4 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPlanImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded border border-ocean/20 px-2 py-1 bg-white"
                />
                <button
                  type="button"
                  onClick={replacePlan}
                  disabled={!planImageFile || mediaBusy !== null}
                  className="w-full rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
                >
                  {mediaBusy === 'plan' ? 'Uploading...' : unit.planImage ? 'Replace Architectural Plan' : 'Upload Architectural Plan'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gold/30 bg-white p-6 shadow-sm flex flex-col">
              <h3 className="text-lg font-['Playfair Display'] text-ocean font-semibold mb-4">Layout Plan (Floor)</h3>
              {unit.layoutImage ? (
                <div className="relative w-full flex-1 flex items-center justify-center bg-ocean/5 rounded overflow-hidden border border-ocean/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unit.layoutImage} alt="Layout Plan" className="w-full h-auto object-contain p-2" />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-ocean/5 rounded border border-dashed border-ocean/20 text-ocean/50 text-sm p-6 text-center min-h-[300px]">
                  No Layout Image uploaded yet.
                </div>
              )}
              <div className="mt-4 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLayoutImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded border border-ocean/20 px-2 py-1 bg-white"
                />
                <button
                  type="button"
                  onClick={replaceLayout}
                  disabled={!layoutImageFile || mediaBusy !== null}
                  className="w-full rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
                >
                  {mediaBusy === 'layout' ? 'Uploading...' : unit.layoutImage ? 'Replace Layout Plan' : 'Upload Layout Plan'}
                </button>
              </div>
            </div>
          </div>

          {/* Views Gallery */}
          <div className="rounded-xl border border-gold/30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-['Playfair Display'] text-ocean font-semibold">Unit View Gallery</h3>
              <span className="text-xs bg-ocean/10 text-ocean px-2 py-1 rounded-full">
                {unit.viewImages?.length || 0} Images
              </span>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setViewImageFiles(Array.from(e.target.files || []))}
                  className="w-full rounded border border-ocean/20 px-2 py-1 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={addViewImages}
                disabled={viewImageFiles.length === 0 || mediaBusy !== null}
                className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
              >
                {mediaBusy === 'views-add' ? 'Uploading...' : 'Add View Images'}
              </button>
            </div>
            
            {unit.viewImages && unit.viewImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {unit.viewImages.map((img: string, idx: number) => (
                  <div key={idx} className="relative w-full h-32 bg-ocean/5 rounded overflow-hidden border border-ocean/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`View ${idx + 1}`} className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => deleteViewImage(idx)}
                      disabled={mediaBusy !== null}
                      className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs text-red-700 border border-red-200 disabled:opacity-50"
                    >
                      {mediaBusy === `views-del-${idx}` ? '...' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center bg-ocean/5 rounded border border-dashed border-ocean/20 text-ocean/50 text-sm p-10 text-center">
                No view images uploaded for this unit yet.
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
