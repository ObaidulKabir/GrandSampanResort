'use client';
import { useEffect, useState } from 'react';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';
import ImageLightbox from './ImageLightbox';

type PlanImage = { src: string; alt: string; title: string };

function firstImage(items: MediaItem[], title: string): PlanImage | null {
  const item = items[0];
  if (!item) return null;
  return { src: resolveMediaUrl(item.url), alt: item.alt || title, title };
}

export default function SuitePlans({ suiteId }: { suiteId: string }) {
  const [images, setImages] = useState<PlanImage[]>([]);
  const [open, setOpen] = useState<PlanImage | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMedia('suite_plan', suiteId), fetchMedia('suite_keymap', suiteId)]).then(
      ([plans, keymaps]) => {
        if (cancelled) return;
        const next = [
          firstImage(plans, 'Unit floor plan'),
          firstImage(keymaps, 'Key map — location on floor')
        ].filter(Boolean) as PlanImage[];
        setImages(next);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [suiteId]);

  if (images.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl text-ocean">Floor plan &amp; location</h2>
      <p className="mt-1 text-sm text-ocean/70">
        Review the suite layout and where it sits on the floor. Click an image to enlarge.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {images.map((img) => (
          <button
            key={img.title}
            type="button"
            onClick={() => setOpen(img)}
            className="group border border-ocean/10 bg-white text-left transition hover:border-gold/50"
          >
            <div className="relative h-64 w-full overflow-hidden bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt} className="h-full w-full object-contain" />
              <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 border border-ocean/15 bg-white/95 px-2 py-1 text-xs font-semibold text-ocean opacity-0 transition group-hover:opacity-100">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                </svg>
                Enlarge
              </span>
            </div>
            <div className="border-t border-ocean/10 px-4 py-3">
              <div className="text-sm font-semibold text-ocean">{img.title}</div>
            </div>
          </button>
        ))}
      </div>
      {open && <ImageLightbox src={open.src} alt={open.alt} onClose={() => setOpen(null)} />}
    </section>
  );
}
