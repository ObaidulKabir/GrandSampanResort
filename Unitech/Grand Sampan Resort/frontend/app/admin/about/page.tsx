'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ABOUT_SECTION_META,
  ABOUT_SECTIONS,
  EMPTY_ABOUT_SECTIONS,
  type AboutCard,
  type AboutSectionKey,
  stripHtml
} from '@/lib/aboutContent';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

function RichTextEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
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
        <button type="button" onClick={() => exec('insertUnorderedList')} className="rounded border px-3 py-1 text-sm text-ocean">
          Bullet List
        </button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="rounded border px-3 py-1 text-sm text-ocean">
          Numbered List
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        className="min-h-40 w-full p-4 text-ocean outline-none"
      />
    </div>
  );
}

async function uploadAboutImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'about');
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.url) {
    throw new Error(json?.error || 'Image upload failed');
  }
  return json.url as string;
}

async function revalidateAboutPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  await fetch('/api/revalidate/about', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  }).catch(() => null);
}

export default function AdminAboutPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [sections, setSections] = useState(EMPTY_ABOUT_SECTIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState<AboutSectionKey>('ABOUT_PROJECT');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p></p>');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  async function load() {
    setLoading(true);
    setError('');
    const res = await api('/about-content');
    if (!res?.ok) {
      setSections(EMPTY_ABOUT_SECTIONS);
      setError('Failed to load About page content');
      setLoading(false);
      return;
    }
    setSections({
      ABOUT_PROJECT: Array.isArray(res.sections?.ABOUT_PROJECT) ? res.sections.ABOUT_PROJECT : [],
      ABOUT_COMPOUND: Array.isArray(res.sections?.ABOUT_COMPOUND) ? res.sections.ABOUT_COMPOUND : [],
      ABOUT_COMPANY: Array.isArray(res.sections?.ABOUT_COMPANY) ? res.sections.ABOUT_COMPANY : []
    });
    setLoading(false);
  }

  useEffect(() => {
    if (!authChecked) return;
    load();
  }, [authChecked]);

  const previewImage = imagePreviewUrl || imageUrl || '/images/logo.svg';
  const plainTextLength = useMemo(() => stripHtml(bodyHtml).length, [bodyHtml]);

  function resetForm(section: AboutSectionKey = activeSection) {
    setEditingId(null);
    setActiveSection(section);
    setTitle('');
    setBodyHtml('<p></p>');
    setImageUrl('');
    setImageAlt('');
    setImageFile(null);
    if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl('');
  }

  function startEdit(card: AboutCard) {
    setActiveSection(card.section);
    setEditingId(card.id);
    setTitle(card.title);
    setBodyHtml(card.bodyHtml);
    setImageUrl(card.imageUrl || '');
    setImageAlt(card.imageAlt || '');
    setImageFile(null);
    if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl('');
    setError('');
    setSuccess('');
  }

  function validateForm() {
    if (title.trim().length < 3 || title.trim().length > 120) return 'Title must be between 3 and 120 characters.';
    if (plainTextLength < 20 || plainTextLength > 2000) return 'Description must be between 20 and 2000 characters.';
    if (imageAlt.trim().length > 140) return 'Image alt text must be 140 characters or fewer.';
    return '';
  }

  async function saveCard() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let nextImageUrl = imageUrl.trim() || undefined;
      if (imageFile) {
        nextImageUrl = await uploadAboutImage(imageFile);
      }

      const payload = {
        section: activeSection,
        title: title.trim(),
        bodyHtml,
        imageUrl: nextImageUrl || null,
        imageAlt: imageAlt.trim() || null
      };

      const res = editingId
        ? await api(`/about-content/cards/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/about-content/cards', { method: 'POST', body: JSON.stringify(payload) });

      if (!res?.__httpOk) {
        if (res?.__httpStatus === 401 || res?.__httpStatus === 403) {
          router.replace('/admin/login');
          return;
        }
        throw new Error(typeof res?.message === 'string' ? res.message : 'Failed to save card');
      }

      await revalidateAboutPage();
      setSuccess(editingId ? 'Card updated successfully.' : 'Card created successfully.');
      resetForm(activeSection);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard(card: AboutCard) {
    if (!window.confirm(`Delete "${card.title}"?`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api(`/about-content/cards/${card.id}`, { method: 'DELETE' });
      if (!res?.__httpOk) throw new Error('Failed to delete card');
      await revalidateAboutPage();
      if (editingId === card.id) resetForm(card.section);
      setSuccess('Card deleted successfully.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete card');
    } finally {
      setSaving(false);
    }
  }

  async function moveCard(section: AboutSectionKey, index: number, direction: -1 | 1) {
    const cards = [...sections[section]];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= cards.length) return;
    [cards[index], cards[nextIndex]] = [cards[nextIndex], cards[index]];
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api(`/about-content/reorder/${section}`, {
        method: 'PUT',
        body: JSON.stringify({ orderedIds: cards.map((card) => card.id) })
      });
      if (!res?.__httpOk) throw new Error('Failed to reorder cards');
      await revalidateAboutPage();
      setSuccess('Card order updated.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder cards');
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
          <h1 className="font-['Playfair Display'] text-4xl text-ocean">About Page CMS</h1>
          <p className="mt-2 text-ocean/80">
            Create, edit, reorder, preview, and publish card content for About Project, About Compound, and About Company.
          </p>
        </div>
        <button onClick={() => load()} className="rounded border border-ocean px-4 py-2 text-ocean">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="mt-6 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {success && <div className="mt-6 rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</div>}

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gold/25 bg-pearl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl text-ocean">{editingId ? 'Edit Card' : 'Create Card'}</h2>
              <p className="mt-1 text-sm text-ocean/70">Preview changes before publishing them to the live About page.</p>
            </div>
            <button onClick={() => resetForm(activeSection)} className="rounded border border-ocean px-3 py-2 text-sm text-ocean">
              New Card
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-ocean">Section</span>
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as AboutSectionKey)}
                className="w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
              >
                {ABOUT_SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {ABOUT_SECTION_META[section].title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-ocean">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
                placeholder="Enter card title"
              />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-ocean">Description</span>
                <span className="text-xs text-ocean/60">{plainTextLength}/2000 chars</span>
              </div>
              <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-ocean">Image Alt Text</span>
              <input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                maxLength={140}
                className="w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
                placeholder="Describe the image for accessibility"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-ocean">Image Upload</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
                onChange={(e) => {
                  const file = (e.target.files && e.target.files[0]) || null;
                  if (!file) return;
                  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                    setError('Only PNG, JPG, WEBP, and SVG images are supported.');
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Image size must be 5MB or less.');
                    return;
                  }
                  setError('');
                  setImageFile(file);
                  if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(URL.createObjectURL(file));
                }}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => saveCard()}
                disabled={saving}
                className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Card' : 'Create Card'}
              </button>
              <button
                onClick={() => resetForm(activeSection)}
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
          <p className="mt-1 text-sm text-ocean/70">This preview updates instantly before changes are published.</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm">
            <div className="relative h-56 w-full bg-pearl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt={imageAlt || title || 'About card preview'} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <div className="text-sm text-ocean/60">{ABOUT_SECTION_META[activeSection].title}</div>
              <h3 className="mt-2 text-2xl text-ocean">{title || 'Card Title Preview'}</h3>
              <div
                className="prose prose-sm mt-3 max-w-none text-ocean/80 prose-p:text-ocean/80 prose-li:text-ocean/80"
                dangerouslySetInnerHTML={{
                  __html:
                    bodyHtml && stripHtml(bodyHtml)
                      ? bodyHtml
                      : '<p>Add descriptive rich text here to preview how the card will appear.</p>'
                }}
              />
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-10 space-y-8">
        {ABOUT_SECTIONS.map((section) => (
          <div key={section} className="rounded-2xl border border-gold/25 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl text-ocean">{ABOUT_SECTION_META[section].title}</h2>
                <p className="mt-1 text-sm text-ocean/70">{ABOUT_SECTION_META[section].description}</p>
              </div>
              <button
                onClick={() => resetForm(section)}
                className="rounded border border-ocean px-3 py-2 text-sm text-ocean"
              >
                Add Card Here
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sections[section].map((card, index) => (
                <article key={card.id} className="overflow-hidden rounded-2xl border border-gold/20 bg-pearl">
                  <div className="relative h-48 w-full bg-white">
                    <Image
                      src={card.imageUrl || '/images/logo.svg'}
                      alt={card.imageAlt || card.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl text-ocean">{card.title}</h3>
                      <span className="rounded bg-white px-2 py-1 text-xs text-ocean/70">#{index + 1}</span>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-ocean/80 prose-p:text-ocean/80 prose-li:text-ocean/80"
                      dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => startEdit(card)} className="rounded bg-ocean px-3 py-2 text-sm text-white">
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCard(card)}
                        disabled={saving}
                        className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => moveCard(section, index, -1)}
                        disabled={saving || index === 0}
                        className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                      >
                        Move Up
                      </button>
                      <button
                        onClick={() => moveCard(section, index, 1)}
                        disabled={saving || index === sections[section].length - 1}
                        className="rounded border border-ocean px-3 py-2 text-sm text-ocean disabled:opacity-50"
                      >
                        Move Down
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {sections[section].length === 0 && !loading && (
                <div className="rounded-xl border border-dashed border-ocean/20 p-6 text-ocean/70">
                  No cards yet. Create the first card for this section.
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
