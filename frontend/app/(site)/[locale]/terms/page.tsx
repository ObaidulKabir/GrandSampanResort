'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import RichTextContent from '@/components/RichTextContent';

type TermsItem = { id: string; title: string; body: string };

export default function TermsPage() {
  const t = useTranslations('terms');
  const locale = useLocale();
  const [items, setItems] = useState<TermsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/terms?locale=' + encodeURIComponent(locale))
      .then((json) => setItems(Array.isArray(json?.items) ? json.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">{t('title')}</h1>
      <p className="mt-4 text-ocean/80">{t('intro')}</p>

      {loading && <p className="mt-8 text-sm text-ocean/60">{t('loading')}</p>}
      {!loading && items.length === 0 && (
        <p className="mt-8 border border-dashed border-ocean/20 p-6 text-sm text-ocean/60">{t('empty')}</p>
      )}

      <div className="mt-8 space-y-8">
        {items.map((item) => (
          <section key={item.id}>
            <h2 className="font-display text-2xl text-ocean">{item.title}</h2>
            <RichTextContent html={item.body} className="mt-2 text-ocean/80" />
          </section>
        ))}
      </div>
    </main>
  );
}
