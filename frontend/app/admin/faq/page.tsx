'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';
import RichTextEditor from '@/components/RichTextEditor';
import RichTextContent from '@/components/RichTextContent';
import { plainTextFromHtml } from '@/lib/richText';

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Site content</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">FAQ</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Add, edit, or remove question-and-answer cards shown on the public FAQ page. Use the
            rich text toolbar for bold, lists, and links in answers.
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
          {items.map((item) => (
            <div key={item.id} className="border border-ocean/10 bg-white p-5">
              <div className="font-display text-xl text-ocean">{item.question}</div>
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
