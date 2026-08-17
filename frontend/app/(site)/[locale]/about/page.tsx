import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import AboutProject from '@/components/AboutProject';
import BrochureDownload from '@/components/BrochureDownload';

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      <div className="mx-auto mb-6 flex max-w-4xl justify-end">
        <BrochureDownload />
      </div>
      <AboutProject />

      <section className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">{t('suitesTitle')}</h2>
        <p className="mt-4 text-ocean/80">{t('suitesIntro')}</p>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-gold/30 bg-white p-5">
            <h3 className="text-xl text-ocean">{t('standardTitle')}</h3>
            <ul className="mt-2 space-y-1 text-ocean/80">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n}>{t(`standard${n}`)}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-5">
            <h3 className="text-xl text-ocean">{t('deluxeTitle')}</h3>
            <ul className="mt-2 space-y-1 text-ocean/80">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n}>{t(`deluxe${n}`)}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-5">
            <h3 className="text-xl text-ocean">{t('premiumTitle')}</h3>
            <ul className="mt-2 space-y-1 text-ocean/80">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n}>{t(`premium${n}`)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">{t('compoundTitle')}</h2>
        <p className="mt-4 text-ocean/80">{t('compoundIntro')}</p>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <ul className="space-y-2 text-ocean/80">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <li key={n}>{t(`c${n}`)}</li>
            ))}
          </ul>
          <ul className="space-y-2 text-ocean/80">
            {[7, 8, 9, 10, 11, 12].map((n) => (
              <li key={n}>{t(`c${n}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">{t('companyTitle')}</h2>
        <p className="mt-4 text-ocean/80">{t('companyIntro')}</p>
        <ul className="mt-6 space-y-2 text-ocean/80">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>{t(`co${n}`)}</li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/directors" className="font-semibold text-ocean underline underline-offset-4 hover:text-gold">
            {t('directorsLink')}
          </Link>
        </p>
        <p className="mt-2 text-sm text-ocean/65">{t('directorsHint')}</p>
      </section>
    </main>
  );
}
