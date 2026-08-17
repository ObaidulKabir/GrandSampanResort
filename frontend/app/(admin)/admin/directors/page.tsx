'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiUpload } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { prepareImageForUpload } from '@/lib/uploadImage';
import Button from '@/components/Button';

type Director = {
  id: string;
  name: string;
  nameBn?: string | null;
  title: string;
  titleBn?: string | null;
  bio: string;
  bioBn?: string | null;
  photoUrl?: string | null;
  order: number;
};

const emptyForm = {
  name: '',
  nameBn: '',
  title: '',
  titleBn: '',
  bio: '',
  bioBn: '',
  photoUrl: ''
};

export default function AdminDirectorsPage() {
  const [items, setItems] = useState<Director[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const json = await api('/directors');
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setItems([]);
      setError('Failed to load directors');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
  }

  function startEdit(item: Director) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      nameBn: item.nameBn || '',
      title: item.title,
      titleBn: item.titleBn || '',
      bio: item.bio,
      bioBn: item.bioBn || '',
      photoUrl: item.photoUrl || ''
    });
    setError('');
    setNotice('');
  }

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const prepared = await prepareImageForUpload(file);
      const data = new FormData();
      data.append('file', prepared);
      const json = await apiUpload('/media/kyc-upload', data);
      if (json?.ok && json.url) {
        setForm((prev) => ({ ...prev, photoUrl: json.url }));
      } else {
        setError(json?.error || json?.message || 'Photo upload failed');
      }
    } catch {
      setError('Photo upload failed');
    }
    setUploading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const title = form.title.trim();
    const bio = form.bio.trim();
    if (name.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (title.length < 2) {
      setError('Title must be at least 2 characters.');
      return;
    }
    if (bio.length < 10) {
      setError('Profile text must be at least 10 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        name,
        title,
        bio,
        nameBn: form.nameBn.trim() || null,
        titleBn: form.titleBn.trim() || null,
        bioBn: form.bioBn.trim() || null,
        photoUrl: form.photoUrl.trim() || null
      };
      const res = editingId
        ? await api(`/directors/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/directors', { method: 'POST', body: JSON.stringify(payload) });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to save director');
      } else {
        setNotice(editingId ? 'Director updated.' : 'Director added.');
        setEditingId(null);
        setForm(emptyForm);
        await load();
      }
    } catch {
      setError('Failed to save director');
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this director profile?')) return;
    setError('');
    setNotice('');
    try {
      const res = await api(`/directors/${id}`, { method: 'DELETE' });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to delete director');
        return;
      }
      setNotice('Director deleted.');
      if (editingId === id) startCreate();
      await load();
    } catch {
      setError('Failed to delete director');
    }
  }

  async function move(id: string, direction: 'up' | 'down') {
    setError('');
    try {
      const res = await api(`/directors/${id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ direction })
      });
      if (res?.ok && Array.isArray(res.items)) setItems(res.items);
      else setError('Failed to reorder');
    } catch {
      setError('Failed to reorder');
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Site content</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Directors</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Add and edit director profiles shown on the public Directors page. Linked from About → About
            Company. Use ↑ / ↓ to change display order.
          </p>
        </div>
        <Link href="/directors">
          <Button variant="outline">View public page</Button>
        </Link>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{notice}</div>}

      <form onSubmit={save} className="mt-8 space-y-4 border border-ocean/10 bg-white p-6">
        <h2 className="font-display text-2xl text-ocean">{editingId ? 'Edit director' : 'Add director'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ocean">
            Name (EN)
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field mt-1"
              placeholder="Full name"
              maxLength={120}
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Name (BN)
            <input
              value={form.nameBn}
              onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
              className="field mt-1"
              placeholder="পূর্ণ নাম"
              maxLength={120}
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Title (EN)
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field mt-1"
              placeholder="Managing Director"
              maxLength={160}
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Title (BN)
            <input
              value={form.titleBn}
              onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
              className="field mt-1"
              placeholder="ম্যানেজিং ডিরেক্টর"
              maxLength={160}
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-ocean">
          Profile (EN)
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="field mt-1 min-h-[7rem]"
            placeholder="Brief background, role, and experience."
            maxLength={4000}
          />
        </label>
        <label className="block text-sm font-medium text-ocean">
          Profile (BN)
          <textarea
            value={form.bioBn}
            onChange={(e) => setForm({ ...form, bioBn: e.target.value })}
            className="field mt-1 min-h-[7rem]"
            placeholder="সংক্ষিপ্ত পরিচিতি।"
            maxLength={4000}
          />
        </label>
        <div>
          <div className="text-sm font-medium text-ocean">Photo</div>
          <div className="mt-2 flex flex-wrap items-start gap-4">
            {form.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(form.photoUrl)}
                alt=""
                className="h-24 w-24 border border-ocean/15 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center border border-dashed border-ocean/25 bg-pearl text-xs text-ocean/50">
                No photo
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  void uploadPhoto(file);
                  e.target.value = '';
                }}
                className="block text-sm text-ocean/80"
              />
              {uploading && <p className="mt-1 text-xs text-ocean/60">Uploading…</p>}
              {form.photoUrl && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-ocean underline"
                  onClick={() => setForm({ ...form, photoUrl: '' })}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? 'Saving...' : editingId ? 'Update director' : 'Add director'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={startCreate}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ocean">Published profiles</h2>
        {loading && <p className="mt-4 text-sm text-ocean/60">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="mt-4 border border-dashed border-ocean/20 p-4 text-sm text-ocean/60">
            No directors yet. Add the first profile above.
          </p>
        )}
        <div className="mt-4 space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (idx > 0) void move(item.id, 'up');
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (idx < items.length - 1) void move(item.id, 'down');
                }
              }}
              className="border border-ocean/10 bg-white p-5 outline-none focus-visible:border-ocean"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-4">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(item.photoUrl)}
                      alt=""
                      className="h-16 w-16 shrink-0 border border-ocean/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-ocean/15 bg-pearl text-sm font-semibold text-ocean/50">
                      {item.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ocean/50">
                      Display order {idx + 1}
                    </div>
                    <div className="font-display mt-1 text-xl text-ocean">{item.name}</div>
                    <div className="text-sm text-ocean/70">{item.title}</div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1" aria-label="Reorder director">
                  <button
                    type="button"
                    title="Move up"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => move(item.id, 'up')}
                    className="flex h-9 w-9 items-center justify-center border border-ocean/20 bg-pearl text-lg font-bold text-ocean hover:bg-ocean/5 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    aria-label="Move down"
                    disabled={idx === items.length - 1}
                    onClick={() => move(item.id, 'down')}
                    className="flex h-9 w-9 items-center justify-center border border-ocean/20 bg-pearl text-lg font-bold text-ocean hover:bg-ocean/5 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ocean/80">{item.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => startEdit(item)}>
                  Edit
                </Button>
                <Button type="button" variant="ghost" onClick={() => remove(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
