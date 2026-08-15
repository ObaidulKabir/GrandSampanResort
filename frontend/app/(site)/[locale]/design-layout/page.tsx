'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import ImageLightbox from '@/components/ImageLightbox';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';

const FALLBACK_SRC = '/images/design-layout-master-plan.png';

function isPdfUrl(url: string) {
  return /\.pdf($|\?)/i.test(url || '');
}

type DisplayItem = {
  id: string;
  kind: 'image' | 'pdf';
  src: string;
  title: string;
  alt: string;
};

export default function DesignLayoutPage() {
  const t = useTranslations('designLayout');
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const media = await fetchMedia('design_layout');
      if (cancelled) return;
      const mapped = media
        .filter((m) => !!m.url)
        .map((m) => {
          const src = resolveMediaUrl(m.url);
          const title = m.label || m.alt || (isPdfUrl(m.url) ? t('layoutPdf') : t('layoutDrawing'));
          return {
            id: m.id,
            kind: isPdfUrl(m.url) ? ('pdf' as const) : ('image' as const),
            src,
            title,
            alt: m.alt || title
          };
        });
      setItems(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const showFallback = !loading && items.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">{t('intro')}</p>

      {loading && <p className="mt-10 text-ocean/70">{t('loading')}</p>}

      <div className="mt-10 space-y-8">
        {showFallback && (
          <article className="border border-ocean/10 bg-white p-4 md:p-6">
            <h2 className="font-display text-2xl text-ocean">{t('fallbackTitle')}</h2>
            <p className="mt-1 text-sm text-ocean/65">{t('fallbackHint')}</p>
            <button
              type="button"
              className="group mt-4 block w-full text-left"
              onClick={() => setLightbox({ src: FALLBACK_SRC, alt: t('fallbackAlt') })}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden border border-ocean/10 bg-pearl/40">
                <Image
                  src={FALLBACK_SRC}
                  alt={t('fallbackAlt')}
                  fill
                  sizes="(min-width: 1024px) 960px, 100vw"
                  className="object-contain p-2 transition group-hover:scale-[1.01]"
                  priority
                />
              </div>
              <span className="mt-2 inline-block text-sm font-semibold text-ocean underline decoration-gold underline-offset-4">
                {t('enlargeLayout')}
              </span>
            </button>
          </article>
        )}

        {items.map((item) => (
          <article key={item.id} className="border border-ocean/10 bg-white p-4 md:p-6">
            <h2 className="font-display text-2xl text-ocean">{item.title}</h2>
            {item.kind === 'pdf' ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={item.src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center border border-ocean bg-ocean px-4 py-2 text-sm font-semibold text-white hover:bg-ocean/90"
                >
                  {t('openPdf')}
                </a>
                <a
                  href={item.src}
                  download
                  className="text-sm font-semibold text-ocean underline decoration-gold underline-offset-4"
                >
                  {t('download')}
                </a>
              </div>
            ) : (
              <button
                type="button"
                className="group mt-4 block w-full text-left"
                onClick={() => setLightbox({ src: item.src, alt: item.alt })}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden border border-ocean/10 bg-pearl/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="absolute inset-0 box-border h-full w-full object-contain p-2 transition group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                </div>
                <span className="mt-2 inline-block text-sm font-semibold text-ocean underline decoration-gold underline-offset-4">
                  {t('enlarge')}
                </span>
              </button>
            )}
          </article>
        ))}
      </div>

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </main>
  );
}
