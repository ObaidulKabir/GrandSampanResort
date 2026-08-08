'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';

type TermsItem = { id: string; title: string; body: string; order: number };

const adminHeaders = { Authorization: 'Bearer admin' };
const emptyForm = { title: '', body: '' };

export default function AdminTermsPage() {
  const [items, setItems] = useState<TermsItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const json = await api('/terms');
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setItems([]);
      setError('Failed to load terms paragraphs');
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

  function startEdit(item: TermsItem) {
    setEditingId(item.id);
    setForm({ title: item.title, body: item.body });
    setError('');
    setNotice('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    const body = form.body.trim();
    if (title.length < 2) {
      setError('Title must be at least 2 characters.');
      return;
    }
    if (body.length < 5) {
      setError('Paragraph body must be at least 5 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = editingId
        ? await api(`/terms/${editingId}`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({ title, body })
          })
        : await api('/terms', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ title, body })
          });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to save paragraph');
      } else {
        setNotice(editingId ? 'Paragraph updated.' : 'Paragraph added.');
        setEditingId(null);
        setForm(emptyForm);
        await load();
      }
    } catch {
      setError('Failed to save paragraph');
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this paragraph?')) return;
    setError('');
    setNotice('');
    try {
      const res = await api(`/terms/${id}`, { method: 'DELETE', headers: adminHeaders });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to delete paragraph');
        return;
      }
      setNotice('Paragraph deleted.');
      if (editingId === id) startCreate();
      await load();
    } catch {
      setError('Failed to delete paragraph');
    }
  }

  async function move(id: string, direction: 'up' | 'down') {
    setError('');
    try {
      const res = await api(`/terms/${id}/move`, {
        method: 'PATCH',
        headers: adminHeaders,
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
          <h1 className="font-display mt-1 text-4xl text-ocean">Terms &amp; Conditions</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Add, edit, reorder, or remove paragraphs shown on the public Terms page. Use a new line for each bullet.
          </p>
        </div>
        <Link href="/terms">
          <Button variant="outline">View public Terms</Button>
        </Link>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{notice}</div>}

      <form onSubmit={save} className="mt-8 space-y-4 border border-ocean/10 bg-white p-6">
        <h2 className="font-display text-2xl text-ocean">
          {editingId ? 'Edit paragraph' : 'Add paragraph'}
        </h2>
        <label className="block text-sm font-medium text-ocean">
          Heading
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="field mt-1"
            placeholder="9. Governing Law"
            maxLength={200}
          />
        </label>
        <label className="block text-sm font-medium text-ocean">
          Body
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="field mt-1 min-h-[160px]"
            placeholder={'• First point\n• Second point\nOr a regular paragraph.'}
            maxLength={8000}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update paragraph' : 'Add paragraph'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={startCreate}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ocean">Published paragraphs</h2>
        {loading && <p className="mt-4 text-sm text-ocean/60">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="mt-4 border border-dashed border-ocean/20 p-4 text-sm text-ocean/60">
            No paragraphs yet. Add the first one above.
          </p>
        )}
        <div className="mt-4 space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="border border-ocean/10 bg-white p-5">
              <h3 className="font-display text-xl text-ocean">{item.title}</h3>
              <div className="mt-2 whitespace-pre-line text-ocean/80">{item.body}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => startEdit(item)}>
                  Edit
                </Button>
                <Button type="button" variant="ghost" onClick={() => move(item.id, 'up')} disabled={idx === 0}>
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => move(item.id, 'down')}
                  disabled={idx === items.length - 1}
                >
                  Move down
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
