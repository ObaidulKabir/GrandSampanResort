'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api, apiUpload } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

type MediaItem = {
  id: string;
  category: string;
  label?: string | null;
  suiteId?: string | null;
  url: string;
  alt?: string | null;
  order: number;
};

const adminHeaders = { Authorization: 'Bearer admin' };

export default function MediaManager({
  category,
  title,
  help,
  labelOptions,
  suiteId,
  singleImage,
  maxImages,
  emptyHint
}: {
  category: string;
  title: string;
  help: string;
  labelOptions?: string[];
  suiteId?: string;
  /** When true, a newly uploaded image replaces any existing one instead of adding to a gallery. */
  singleImage?: boolean;
  /** Cap gallery size; uploading past the limit replaces the oldest image. */
  maxImages?: number;
  emptyHint?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [altText, setAltText] = useState('');
  const [label, setLabel] = useState(labelOptions?.[0] || '');
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category });
      if (suiteId) params.set('suiteId', suiteId);
      const json = await api(`/media?${params.toString()}`);
      setItems(Array.isArray(json?.media) ? json.media : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, suiteId]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose an image file first');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const limit = singleImage ? 1 : maxImages;
      const previous = limit && items.length >= limit ? items.slice(0, items.length - limit + 1) : [];
      const form = new FormData();
      form.append('file', file);
      form.append('category', category);
      if (suiteId) form.append('suiteId', suiteId);
      if (altText.trim()) form.append('alt', altText.trim());
      if (labelOptions && label) form.append('label', label);
      const json = await apiUpload('/media/upload', form, adminHeaders);
      if (json?.ok) {
        setAltText('');
        if (fileRef.current) fileRef.current.value = '';
        await Promise.all(previous.map((p) => api(`/media/${p.id}`, { method: 'DELETE', headers: adminHeaders })));
        await load();
      } else {
        setError(json?.error || json?.message || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    }
    setUploading(false);
  }

  const atLimit = singleImage ? items.length >= 1 : typeof maxImages === 'number' && items.length >= maxImages;

  async function onDelete(id: string) {
    try {
      const json = await api(`/media/${id}`, { method: 'DELETE', headers: adminHeaders });
      if (json?.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('Failed to delete image');
    }
  }

  async function onMove(id: string, direction: 'up' | 'down') {
    try {
      const json = await api(`/media/${id}/move`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ direction })
      });
      if (json?.ok && Array.isArray(json.media)) setItems(json.media);
    } catch {
      setError('Failed to reorder');
    }
  }

  return (
    <section className="border border-ocean/10 bg-white p-6">
      <h2 className="font-display text-xl text-ocean">{title}</h2>
      <p className="mt-1 text-sm text-ocean/70">{help}</p>

      <form onSubmit={onUpload} className="mt-5 flex flex-wrap items-end gap-3 border-t border-ocean/10 pt-5">
        <label className="text-sm font-medium text-ocean">
          Image file
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="field mt-1" />
        </label>
        {labelOptions && (
          <label className="text-sm font-medium text-ocean">
            Suite type
            <select value={label} onChange={(e) => setLabel(e.target.value)} className="field mt-1">
              {labelOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm font-medium text-ocean">
          Caption (optional)
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className="field mt-1"
            placeholder="Sunset view from the rooftop"
          />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="h-[42px] bg-ocean px-5 text-sm font-semibold text-white hover:bg-ocean/90 disabled:opacity-60"
        >
          {uploading
            ? 'Uploading...'
            : atLimit
              ? singleImage || maxImages === 1
                ? 'Replace image'
                : 'Upload (replaces oldest)'
              : 'Upload image'}
        </button>
      </form>
      {typeof maxImages === 'number' && !singleImage && (
        <p className="mt-2 text-xs text-ocean/60">
          {items.length}/{maxImages} images used for this section.
        </p>
      )}
      {error && <div className="mt-3 border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item, idx) => (
          <div key={item.id} className="group relative border border-ocean/10">
            <div className="relative h-28 w-full overflow-hidden bg-pearl">
              <Image
                src={resolveMediaUrl(item.url)}
                alt={item.alt || item.label || ''}
                fill
                sizes="200px"
                unoptimized
                className="object-cover"
              />
            </div>
            {item.label && (
              <span className="absolute left-1 top-1 border border-gold/60 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ocean">
                {item.label}
              </span>
            )}
            <div className="flex items-center justify-between gap-1 bg-white p-1.5">
              {!singleImage && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    onClick={() => onMove(item.id, 'up')}
                    disabled={idx === 0}
                    className="px-1.5 text-ocean/70 hover:text-ocean disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    onClick={() => onMove(item.id, 'down')}
                    disabled={idx === items.length - 1}
                    className="px-1.5 text-ocean/70 hover:text-ocean disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="col-span-full border border-dashed border-ocean/20 p-4 text-sm text-ocean/60">
            {emptyHint || 'No images uploaded yet.'}
          </div>
        )}
        {loading && <div className="col-span-full text-sm text-ocean/60">Loading...</div>}
      </div>
    </section>
  );
}
