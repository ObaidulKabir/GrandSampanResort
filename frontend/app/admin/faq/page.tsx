'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';
import RichTextContent from '@/components/RichTextContent';
import { plainTextFromHtml } from '@/lib/richText';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="field mt-1 min-h-[140px] animate-pulse bg-pearl/60" />
});

type FaqItem = { id: string; question: string; answer: string; order: number };

const emptyForm = { question: '', answer: '' };

export default function AdminFaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
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
      const json = await api('/faq');
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setItems([]);
      setError('Failed to load FAQ entries');
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

  function startEdit(item: FaqItem) {
    setEditingId(item.id);
    setForm({ question: item.question, answer: item.answer });
    setError('');
    setNotice('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const question = form.question.trim();
    const answer = form.answer.trim();
    if (question.length < 5) {
      setError('Question must be at least 5 characters.');
      return;
    }
    if (plainTextFromHtml(answer).length < 5) {
      setError('Answer must be at least 5 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = editingId
        ? await api(`/faq/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify({ question, answer })
          })
        : await api('/faq', {
            method: 'POST',
            body: JSON.stringify({ question, answer })
          });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to save FAQ');
      } else {
        setNotice(editingId ? 'FAQ updated.' : 'FAQ created.');
        setEditingId(null);
        setForm(emptyForm);
        await load();
      }
    } catch {
      setError('Failed to save FAQ');
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this FAQ card?')) return;
    setError('');
    setNotice('');
    try {
      const res = await api(`/faq/${id}`, { method: 'DELETE' });
      if (!res?.ok) {
        setError(res?.message || res?.error || 'Failed to delete FAQ');
        return;
      }
      setNotice('FAQ deleted.');
      if (editingId === id) startCreate();
      await load();
    } catch {
      setError('Failed to delete FAQ');
    }
  }

  async function move(id: string, direction: 'up' | 'down') {
    setError('');
    try {
      const res = await api(`/faq/${id}/move`, {
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
          <h1 className="font-display mt-1 text-4xl text-ocean">FAQ</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Add, edit, reorder, or remove question-and-answer cards shown on the public FAQ page.
            Use ↑ / ↓ (or Arrow Up / Arrow Down on a focused card) to change display order. Rich
            text supports bold, lists, and links in answers.
          </p>
        </div>
        <Link href="/faq">
          <Button variant="outline">View public FAQ</Button>
        </Link>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{notice}</div>}

      <form onSubmit={save} className="mt-8 space-y-4 border border-ocean/10 bg-white p-6">
        <h2 className="font-display text-2xl text-ocean">{editingId ? 'Edit FAQ card' : 'Add FAQ card'}</h2>
        <label className="block text-sm font-medium text-ocean">
          Question
          <input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            className="field mt-1"
            placeholder="How does fractional ownership work?"
            maxLength={300}
          />
        </label>
        <div>
          <div className="text-sm font-medium text-ocean">Answer</div>
          <RichTextEditor
            key={editingId || 'new-faq'}
            value={form.answer}
            onChange={(answer) => setForm({ ...form, answer })}
            placeholder="Write a clear answer for buyers and investors."
            minHeightClass="min-h-[140px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update card' : 'Add card'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={startCreate}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ocean">Published cards</h2>
        {loading && <p className="mt-4 text-sm text-ocean/60">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="mt-4 border border-dashed border-ocean/20 p-4 text-sm text-ocean/60">
            No FAQ cards yet. Add the first one above.
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
                  <div className="font-display mt-1 text-xl text-ocean">{item.question}</div>
                </div>
                <div className="flex shrink-0 flex-col gap-1" aria-label="Reorder FAQ card">
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
              <RichTextContent html={item.answer} className="mt-2 text-ocean/80" />
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
