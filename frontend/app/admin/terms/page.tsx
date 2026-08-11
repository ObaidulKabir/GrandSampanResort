'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';
import RichTextEditor from '@/components/RichTextEditor';
import RichTextContent from '@/components/RichTextContent';
import { plainTextFromHtml } from '@/lib/richText';

type TermsItem = { id: string; title: string; body: string; order: number };

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
    if (plainTextFromHtml(body).length < 5) {
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
            body: JSON.stringify({ title, body })
          })
        : await api('/terms', {
            method: 'POST',
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
      const res = await api(`/terms/${id}`, { method: 'DELETE' });
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
            Add, edit, reorder, or remove paragraphs shown on the public Terms page. Use ↑ / ↓ (or
            Arrow Up / Arrow Down on a focused card) to change display order. Rich text supports
            bold, bullets, numbered lists, and links.
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
        <div>
          <div className="text-sm font-medium text-ocean">Body</div>
          <RichTextEditor
            key={editingId || 'new-terms'}
            value={form.body}
            onChange={(body) => setForm({ ...form, body })}
            placeholder="Write the paragraph body. Use bullets for lists."
            minHeightClass="min-h-[180px]"
          />
        </div>
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
              className="border border-ocean/10 bg-white p-5 outline-none focus-visible:border-ocean focus-visible:shadow-[0_0_0_2px_rgba(14,58,90,0.12)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ocean/50">
                    Display order {idx + 1}
                  </div>
                  <h3 className="font-display mt-1 text-xl text-ocean">{item.title}</h3>
                </div>
                <div className="flex shrink-0 flex-col gap-1" aria-label="Reorder paragraph">
                  <button
                    type="button"
                    title="Move up (↑)"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => move(item.id, 'up')}
                    className="flex h-9 w-9 items-center justify-center border border-ocean/20 bg-pearl text-lg font-bold text-ocean hover:bg-ocean/5 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down (↓)"
                    aria-label="Move down"
                    disabled={idx === items.length - 1}
                    onClick={() => move(item.id, 'down')}
                    className="flex h-9 w-9 items-center justify-center border border-ocean/20 bg-pearl text-lg font-bold text-ocean hover:bg-ocean/5 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <RichTextContent html={item.body} className="mt-2 text-ocean/80" />
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
