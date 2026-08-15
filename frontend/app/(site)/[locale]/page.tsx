import { getTranslations } from 'next-intl/server';
import Hero from '@/components/Hero';
import ViewsCarousel from '@/components/ViewsCarousel';
import FeaturesGrid from '@/components/FeaturesGrid';
import LocationSection from '@/components/LocationSection';
import AvailableCards from '@/components/AvailableCards';
import Reveal from '@/components/Reveal';
import { Link } from '@/i18n/navigation';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <main>
      <Hero />

      <section className="border-b border-gold/15 bg-[linear-gradient(180deg,#f8f8f6_0%,#eef2f4_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
          <Reveal>
            <h2 className="font-display text-3xl text-ocean md:text-4xl">{t('investTitle')}</h2>
            <p className="mt-3 max-w-2xl text-ocean/75">{t('investSub')}</p>
          </Reveal>
          <div className="mt-8">
            <AvailableCards />
          </div>
          <div className="mt-8">
            <Link
              href="/invest"
              className="inline-flex w-full items-center justify-center rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean/90 sm:w-auto"
            >
              {t('viewAllPlans')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="font-display text-3xl text-ocean">{t('resortTitle')}</h2>
          <p className="mt-2 max-w-2xl text-ocean/75">{t('resortSub')}</p>
        </Reveal>
        <div className="mt-8">
          <ViewsCarousel height="clamp(13rem, 52vw, 26.25rem)" />
        </div>
        <Reveal className="mt-12">
          <FeaturesGrid />
        </Reveal>
      </section>

      <LocationSection />
    </main>
  );
}
