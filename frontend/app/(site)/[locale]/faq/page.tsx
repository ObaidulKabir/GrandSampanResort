'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import RichTextContent from '@/components/RichTextContent';

type FaqItem = { id: string; question: string; answer: string };

export default function FAQPage() {
  const t = useTranslations('faq');
  const locale = useLocale();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/faq?locale=' + encodeURIComponent(locale))
      .then((json) => setItems(Array.isArray(json?.items) ? json.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">{t('intro')}</p>

      <div className="mt-8 space-y-6">
        {loading && <div className="text-sm text-ocean/60">{t('loading')}</div>}
        {!loading && items.length === 0 && (
          <div className="border border-dashed border-ocean/20 p-6 text-sm text-ocean/60">{t('empty')}</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="border border-gold/30 bg-white p-5">
            <div className="font-display text-xl text-ocean">{item.question}</div>
            <RichTextContent html={item.answer} className="mt-2 text-ocean/80" />
          </div>
        ))}
      </div>
    </main>
  );
}
