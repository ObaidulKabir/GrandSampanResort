'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { normalizeCategory, stripHtml, type FaqEntry } from '@/lib/faqContent';

type FaqCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  function exec(command: string) {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML || '');
  }

  return (
    <div className="rounded-xl border border-gold/25 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-ocean/10 p-3">
        <button type="button" onClick={() => exec('bold')} className="rounded border px-3 py-1 text-sm text-ocean">
          Bold
        </button>
        <button type="button" onClick={() => exec('italic')} className="rounded border px-3 py-1 text-sm text-ocean">
          Italic
        </button>
        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="rounded border px-3 py-1 text-sm text-ocean"
        >
          Bullet List
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          className="rounded border px-3 py-1 text-sm text-ocean"
        >
          Numbered List
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        className="min-h-44 w-full p-4 text-ocean outline-none"
      />
    </div>
  );
}

async function revalidateFaqPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  await fetch('/api/revalidate/faq', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  }).catch(() => null);
}

export default function AdminFaqPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<FaqEntry[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [categoryDraft, setCategoryDraft] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState('General');
  const [question, setQuestion] = useState('');
  const [answerHtml, setAnswerHtml] = useState('<p></p>');

  const plainAnswerLen = useMemo(() => stripHtml(answerHtml).length, [answerHtml]);

  const categoryOptions = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => normalizeCategory(c.name));
    const unique: string[] = [];
    const seen = new Set<string>();
    const push = (name: string) => {
      const n = normalizeCategory(name);
      const key = n.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(n);
    };
    push('General');
    sorted.forEach(push);
    return unique;
  }, [categories]);

  function messageFromResponse(res: any, fallback: string) {
    const raw = res?.message ?? res?.error;
    if (!raw) return fallback;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') return raw[0];
    return fallback;
  }

  function handleAuthIfNeeded(res: any) {
    if (res?.__httpStatus === 401 || res?.__httpStatus === 403) {
      router.replace('/admin/login');
      return true;
    }
    return false;
  }

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  async function load() {
    setLoading(true);
    setError('');
    const [res, resCategories] = await Promise.all([api('/faq'), api('/faq/categories')]);
    if (!res?.ok) {
      setItems([]);
      setCategories([]);
      setError('Failed to load FAQ content');
      setLoading(false);
      return;
    }
    setItems(Array.isArray(res.items) ? res.items : []);
    if (handleAuthIfNeeded(resCategories)) {
      setLoading(false);
      return;
    }
    if (resCategories?.ok && Array.isArray(resCategories.categories)) setCategories(resCategories.categories);
    else {
      const names = Array.isArray(res.categories) ? res.categories : [];
      setCategories(names.map((name: string, index: number) => ({ id: `name-${name}`, name, sortOrder: index })));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authChecked) return;
    load();
  }, [authChecked]);

  function resetForm() {
    setEditingId(null);
    setCategory('General');
    setQuestion('');
    setAnswerHtml('<p></p>');
    setError('');
    setSuccess('');
  }

  function startEdit(entry: FaqEntry) {
    setEditingId(entry.id);
    setCategory(normalizeCategory(entry.category));
    setQuestion(entry.question);
    setAnswerHtml(entry.answerHtml);
    setError('');
    setSuccess('');
  }

  function validate() {
    const q = question.trim();
    if (q.length < 5 || q.length > 200) return 'Question must be between 5 and 200 characters.';
    if (plainAnswerLen < 20 || plainAnswerLen > 3000) return 'Answer must be between 20 and 3000 characters.';
    if (category.trim().length > 50) return 'Category must be 50 characters or fewer.';
    return '';
  }

  const grouped = useMemo(() => {
    const map = new Map<string, FaqEntry[]>();
    for (const item of items) {
      const cat = normalizeCategory(item.category);
      const list = map.get(cat) || [];
      list.push(item);
      map.set(cat, list);
    }
    return Array.from(map.entries())
      .map(([cat, entries]) => [cat, entries.sort((a, b) => a.sortOrder - b.sortOrder)] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  async function createCategory() {
    const name = categoryDraft.trim();
    if (name.length < 2) {
      setError('Category name must be at least 2 characters.');
      setSuccess('');
      return;
    }
    if (name.length > 50) {
      setError('Category name must be 50 characters or fewer.');
      setSuccess('');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/faq/categories', { method: 'POST', body: JSON.stringify({ name }) });
      if (handleAuthIfNeeded(res)) return;
      if (!res?.__httpOk) throw new Error(messageFromResponse(res, 'Failed to create category'));
      await revalidateFaqPage();
      setSuccess('Category created successfully.');
      setCategoryDraft('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  function startEditCategory(cat: FaqCategory) {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setError('');
    setSuccess('');
  }

  async function saveCategory() {
    if (!editingCategoryId) return;
    const name = editingCategoryName.trim();
    if (name.length < 2) {
      setError('Category name must be at least 2 characters.');
      setSuccess('');
      return;
    }
    if (name.length > 50) {
      setError('Category name must be 50 characters or fewer.');
      setSuccess('');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api(`/faq/categories/${editingCategoryId}`, { method: 'PUT', body: JSON.stringify({ name }) });
      if (handleAuthIfNeeded(res)) return;
      if (!res?.__httpOk) throw new Error(messageFromResponse(res, 'Failed to update category'));
      await revalidateFaqPage();
      setSuccess('Category updated successfully.');
      setEditingCategoryId(null);
      setEditingCategoryName('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(cat: FaqCategory) {
    if (cat.name.toLowerCase() === 'general') {
      setError('General category cannot be deleted.');
      setSuccess('');
      return;
    }
    if (!window.confirm(`Delete category "${cat.name}"? All entries will be moved to General.`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api(`/faq/categories/${cat.id}`, { method: 'DELETE' });
      if (handleAuthIfNeeded(res)) return;
      if (!res?.__httpOk) throw new Error(messageFromResponse(res, 'Failed to delete category'));
      await revalidateFaqPage();
      setSuccess('Category deleted. Entries moved to General.');
      if (category.trim().toLowerCase() === cat.name.toLowerCase()) setCategory('General');
      if (editingCategoryId === cat.id) {
        setEditingCategoryId(null);
        setEditingCategoryName('');
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category');
    } finally {
      setSaving(false);
    }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/faq/categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) })
      });
      if (handleAuthIfNeeded(res)) return;
      if (!res?.__httpOk) throw new Error(messageFromResponse(res, 'Failed to reorder categories'));
      await revalidateFaqPage();
      setSuccess('Category order updated.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder categories');
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    const message = validate();
    if (message) {
      setError(message);
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        category: normalizeCategory(category),
        question: question.trim(),
        answerHtml
      };
      const res = editingId
        ? await api(`/faq/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/faq', { method: 'POST', body: JSON.stringify(payload) });

      if (!res?.__httpOk) {
        if (res?.__httpStatus === 401 || res?.__httpStatus === 403) {
          router.replace('/admin/login');
          return;
        }
        throw new Error(typeof res?.message === 'string' ? res.message : 'Failed to save FAQ entry');
      }

      await revalidateFaqPage();
      setSuccess(editingId ? 'FAQ entry updated successfully.' : 'FAQ entry created successfully.');
      resetForm();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save FAQ entry');
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: FaqEntry) {
    if (!window.confirm(`Delete "${entry.question}"?`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api(`/faq/${entry.id}`, { method: 'DELETE' });
      if (!res?.__httpOk) throw new Error('Failed to delete FAQ entry');
      await revalidateFaqPage();
      if (editingId === entry.id) resetForm();
      setSuccess('FAQ entry deleted successfully.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete FAQ entry');
    } finally {
      setSaving(false);
    }
  }

  async function move(cat: string, index: number, direction: -1 | 1) {
    const entries = grouped.find(([c]) => c === cat)?.[1] || [];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return;
    const reordered = [...entries];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/faq/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          category: normalizeCategory(cat),
          orderedIds: reordered.map((e) => e.id)
        })
      });
      if (!res?.__httpOk) throw new Error('Failed to reorder FAQ entries');
      await revalidateFaqPage();
      setSuccess('FAQ order updated.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder FAQ entries');
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) {
    return <main className="mx-auto max-w-6xl px-6 py-16 text-ocean">Checking admin access...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-['Playfair Display'] text-4xl text-ocean">FAQ CMS</h1>
          <p className="mt-2 text-ocean/80">Create, edit, reorder, and publish FAQ question-answer pairs by category.</p>
        </div>
        <button onClick={() => load()} className="rounded border border-ocean px-4 py-2 text-ocean">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="mt-6 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {success && <div className="mt-6 rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</div>}

      <section className="mt-10 rounded-2xl border border-gold/25 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl text-ocean">Categories</h2>
            <p className="mt-1 text-sm text-ocean/70">Manage FAQ categories (entries move to General when a category is deleted).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              maxLength={50}
              className="w-56 rounded border border-ocean/20 bg-white p-2 text-ocean"
              placeholder="New category name"
            />
            <button
              onClick={createCategory}
              disabled={saving}
              className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
            >
              Add Category
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((cat, index) => (
            <div key={cat.id} className="rounded-xl border border-gold/20 bg-pearl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingCategoryId === cat.id ? (
                    <input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      maxLength={50}
                      className="w-full rounded border border-ocean/20 bg-white p-2 text-ocean"
                    />
                  ) : (
                    <div className="truncate text-lg font-semibold text-ocean">{cat.name}</div>
                  )}
                </div>
                <span className="rounded bg-white px-2 py-1 text-xs text-ocean/70">#{index + 1}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {editingCategoryId === cat.id ? (
                  <>
                    <button
                      onClick={saveCategory}
                      disabled={saving}
                      className="rounded bg-ocean px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditingCategoryName('');
                      }}
                      disabled={saving}
                      className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditCategory(cat)}
                      className="rounded bg-ocean px-3 py-2 text-sm text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(cat)}
                      disabled={saving || cat.name.toLowerCase() === 'general'}
                      className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => moveCategory(index, -1)}
                  disabled={saving || index === 0}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                >
                  Move Up
                </button>
                <button
                  onClick={() => moveCategory(index, 1)}
                  disabled={saving || index === categories.length - 1}
                  className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                >
                  Move Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gold/25 bg-pearl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl text-ocean">{editingId ? 'Edit FAQ' : 'Create FAQ'}</h2>
              <p className="mt-1 text-sm text-ocean/70">Answer supports basic formatting for a clean accordion display.</p>
            </div>
            <button onClick={resetForm} className="rounded border border-ocean px-3 py-2 text-sm text-ocean">
              New Entry
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-ocean">Category</span>
              <select
                value={normalizeCategory(category)}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
              >
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-ocean">Question</span>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={200}
                className="w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
                placeholder="Enter the question"
              />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-ocean">Answer</span>
                <span className="text-xs text-ocean/60">{plainAnswerLen}/3000 chars</span>
              </div>
              <RichTextEditor value={answerHtml} onChange={setAnswerHtml} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update FAQ' : 'Create FAQ'}
              </button>
              <button
                onClick={resetForm}
                disabled={saving}
                className="rounded border border-ocean px-4 py-2 text-ocean disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-gold/25 bg-white p-6">
          <h2 className="text-2xl text-ocean">Preview</h2>
          <p className="mt-1 text-sm text-ocean/70">This preview shows how the accordion entry will appear.</p>
          <div className="mt-6 rounded-2xl border border-gold/25 bg-pearl p-5">
            <div className="text-sm text-ocean/60">{category.trim() || 'General'}</div>
            <div className="mt-2 text-xl font-semibold text-ocean">{question || 'Question preview'}</div>
            <div
              className="prose prose-sm mt-3 max-w-none text-ocean/80 prose-p:text-ocean/80 prose-li:text-ocean/80"
              dangerouslySetInnerHTML={{
                __html:
                  answerHtml && stripHtml(answerHtml)
                    ? answerHtml
                    : '<p>Add the answer here to preview formatted content.</p>'
              }}
            />
          </div>
        </aside>
      </section>

      <section className="mt-10 space-y-8">
        {grouped.map(([cat, entries]) => (
          <div key={cat} className="rounded-2xl border border-gold/25 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl text-ocean">{cat}</h2>
                <p className="mt-1 text-sm text-ocean/70">{entries.length} questions</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {entries.map((entry, index) => (
                <article key={entry.id} className="rounded-2xl border border-gold/20 bg-pearl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-ocean">{entry.question}</h3>
                      <div
                        className="prose prose-sm mt-2 max-w-none text-ocean/80 prose-p:text-ocean/80 prose-li:text-ocean/80"
                        dangerouslySetInnerHTML={{ __html: entry.answerHtml }}
                      />
                    </div>
                    <span className="rounded bg-white px-2 py-1 text-xs text-ocean/70">#{index + 1}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => startEdit(entry)} className="rounded bg-ocean px-3 py-2 text-sm text-white">
                      Edit
                    </button>
                    <button
                      onClick={() => remove(entry)}
                      disabled={saving}
                      className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => move(cat, index, -1)}
                      disabled={saving || index === 0}
                      className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                    >
                      Move Up
                    </button>
                    <button
                      onClick={() => move(cat, index, 1)}
                      disabled={saving || index === entries.length - 1}
                      className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                    >
                      Move Down
                    </button>
                  </div>
                </article>
              ))}
              {entries.length === 0 && (
                <div className="rounded-xl border border-dashed border-ocean/20 p-6 text-ocean/70">
                  No FAQ entries in this category yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
