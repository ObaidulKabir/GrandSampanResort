'use client';

import { useTranslations } from 'next-intl';
import ReturnsCalculator from '@/components/ReturnsCalculator';

export default function ReturnsIncomePage() {
  const t = useTranslations('returnsIncome');

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">{t('intro')}</p>
      <ReturnsCalculator className="mt-8" />
    </main>
  );
}
