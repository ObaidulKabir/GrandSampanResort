'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';
import ImageLightbox from './ImageLightbox';

export type SuiteDrawing = { src: string; alt: string };

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

export default function SuitePlans({
  suiteId,
  variant = 'full',
  planImage,
  keyImage
}: {
  suiteId: string;
  variant?: 'full' | 'compact';
  planImage?: SuiteDrawing | null;
  keyImage?: SuiteDrawing | null;
}) {
  const t = useTranslations('suitePlans');
  const compact = variant === 'compact';
  const preloaded = planImage !== undefined || keyImage !== undefined;
  const [slots, setSlots] = useState<Slot[]>(() => emptySlots(t, planImage, keyImage));
  const [loading, setLoading] = useState(!preloaded);
  const [open, setOpen] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (preloaded) {
      setSlots(emptySlots(t, planImage, keyImage));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMedia('suite_plan', suiteId), fetchMedia('suite_keymap', suiteId)])
      .then(([plans, keymaps]) => {
        if (cancelled) return;
        const planImg = firstUrl(plans);
        const keyImg = firstUrl(keymaps);
        setSlots(emptySlots(t, planImg, keyImg));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [suiteId, t, preloaded, planImage, keyImage]);

  const thumbH = compact ? 'h-28 sm:h-32' : 'h-72';

  return (
    <section className={compact ? '' : 'mt-10'}>
      {compact ? (
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ocean/60">{t('compactTitle')}</p>
          <p className="mt-0.5 text-[11px] text-ocean/55">{t('compactHint')}</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
          <h2 className="font-display mt-1 text-2xl text-ocean">{t('title')}</h2>
          <p className="mt-1 text-sm text-ocean/70">{t('intro')}</p>
        </>
      )}
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'mt-5 gap-4 sm:grid-cols-2'}`}>
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
                  <div className={`relative w-full overflow-hidden bg-pearl/40 p-2 ${thumbH}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.src!} alt={slot.alt || slot.title} className="h-full w-full object-contain" />
                    <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 border border-ocean/15 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-ocean opacity-0 transition group-hover:opacity-100">
                      {t('enlarge')}
                    </span>
                  </div>
                </button>
              ) : (
                <div className={`flex items-center justify-center bg-pearl/50 px-3 text-center ${thumbH}`}>
                  <p className="text-[11px] leading-snug text-ocean/55 sm:text-xs">
                    {loading ? t('loading') : slot.emptyHint}
                  </p>
                </div>
              )}
              <div className={`border-t border-ocean/10 ${compact ? 'px-2 py-1.5' : 'px-4 py-3'}`}>
                <div className={`font-semibold text-ocean ${compact ? 'text-[11px] leading-tight' : 'text-sm'}`}>
                  {slot.title}
                </div>
                {!compact && <div className="mt-0.5 text-xs text-ocean/65">{slot.subtitle}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {open && <ImageLightbox src={open.src} alt={open.alt} onClose={() => setOpen(null)} />}
    </section>
  );
}

function emptySlots(
  t: (key: string) => string,
  planImg?: SuiteDrawing | null,
  keyImg?: SuiteDrawing | null
): Slot[] {
  return [
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
  ];
}
