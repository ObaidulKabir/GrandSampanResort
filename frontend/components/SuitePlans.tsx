'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';
import ImageLightbox from './ImageLightbox';

type Slot = {
  key: 'suite_plan' | 'suite_keymap';
  title: string;
  subtitle: string;
  emptyHint: string;
  src: string | null;
  alt: string;
};

function firstUrl(items: MediaItem[]) {
  const item = items[0];
  if (!item?.url) return null;
  return { src: resolveMediaUrl(item.url), alt: item.alt || item.label || '' };
}

export default function SuitePlans({ suiteId }: { suiteId: string }) {
  const t = useTranslations('suitePlans');
  const [slots, setSlots] = useState<Slot[]>([
    {
      key: 'suite_plan',
      title: t('archTitle'),
      subtitle: t('archSubtitle'),
      emptyHint: t('archEmpty'),
      src: null,
      alt: t('archAlt')
    },
    {
      key: 'suite_keymap',
      title: t('keyTitle'),
      subtitle: t('keySubtitle'),
      emptyHint: t('keyEmpty'),
      src: null,
      alt: t('keyAlt')
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMedia('suite_plan', suiteId), fetchMedia('suite_keymap', suiteId)])
      .then(([plans, keymaps]) => {
        if (cancelled) return;
        const planImg = firstUrl(plans);
        const keyImg = firstUrl(keymaps);
        setSlots([
          {
            key: 'suite_plan',
            title: t('archTitle'),
            subtitle: t('archSubtitle'),
            emptyHint: t('archEmpty'),
            src: planImg?.src || null,
            alt: planImg?.alt || t('archAlt')
          },
          {
            key: 'suite_keymap',
            title: t('keyTitle'),
            subtitle: t('keySubtitle'),
            emptyHint: t('keyEmpty'),
            src: keyImg?.src || null,
            alt: keyImg?.alt || t('keyAlt')
          }
        ]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [suiteId, t]);

  return (
    <section className="mt-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h2 className="font-display mt-1 text-2xl text-ocean">{t('title')}</h2>
      <p className="mt-1 text-sm text-ocean/70">{t('intro')}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {slots.map((slot) => {
          const ready = !!slot.src && !loading;
          return (
            <div key={slot.key} className="border border-ocean/10 bg-white">
              {ready ? (
                <button
                  type="button"
                  onClick={() => setOpen({ src: slot.src!, alt: slot.alt || slot.title })}
                  className="group w-full text-left transition hover:border-gold/50"
                >
                  <div className="relative h-72 w-full overflow-hidden bg-pearl/40 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.src!} alt={slot.alt || slot.title} className="h-full w-full object-contain" />
                    <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 border border-ocean/15 bg-white/95 px-2 py-1 text-xs font-semibold text-ocean opacity-0 transition group-hover:opacity-100">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                      </svg>
                      {t('enlarge')}
                    </span>
                  </div>
                </button>
              ) : (
                <div className="flex h-72 items-center justify-center bg-pearl/50 px-6 text-center">
                  <p className="text-sm text-ocean/55">{loading ? t('loading') : slot.emptyHint}</p>
                </div>
              )}
              <div className="border-t border-ocean/10 px-4 py-3">
                <div className="text-sm font-semibold text-ocean">{slot.title}</div>
                <div className="mt-0.5 text-xs text-ocean/65">{slot.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
      {open && <ImageLightbox src={open.src} alt={open.alt} onClose={() => setOpen(null)} />}
    </section>
  );
}
