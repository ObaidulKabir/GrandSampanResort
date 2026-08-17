'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

type Director = {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl?: string | null;
};

export default function DirectorsPage() {
  const t = useTranslations('directors');
  const locale = useLocale();
  const [items, setItems] = useState<Director[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/directors?locale=' + encodeURIComponent(locale))
      .then((json) => setItems(Array.isArray(json?.items) ? json.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">{t('intro')}</p>

      <div className="mt-10 space-y-8">
        {loading && <div className="text-sm text-ocean/60">{t('loading')}</div>}
        {!loading && items.length === 0 && (
          <div className="border border-dashed border-ocean/20 p-6 text-sm text-ocean/60">{t('empty')}</div>
        )}
        {items.map((item) => (
          <article key={item.id} className="border border-gold/30 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(item.photoUrl)}
                  alt={t('photoAlt', { name: item.name })}
                  className="h-36 w-36 shrink-0 border border-ocean/10 object-cover"
                />
              ) : (
                <div
                  className="flex h-36 w-36 shrink-0 items-center justify-center border border-ocean/10 bg-pearl font-display text-3xl text-ocean/40"
                  aria-hidden
                >
                  {item.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-2xl text-ocean">{item.name}</h2>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-gold">{item.title}</p>
                <p className="mt-3 whitespace-pre-wrap text-ocean/80">{item.bio}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
