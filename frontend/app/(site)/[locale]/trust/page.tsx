import { getTranslations } from 'next-intl/server';

export default async function TrustPage() {
  const t = await getTranslations('trust');

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">{t('title')}</h1>
      <ul className="mt-6 space-y-2 text-ocean/80">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <li key={n}>{t(`i${n}`)}</li>
        ))}
      </ul>
    </main>
  );
}
