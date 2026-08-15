import Hero from '@/components/Hero';
import ViewsCarousel from '@/components/ViewsCarousel';
import FeaturesGrid from '@/components/FeaturesGrid';
import LocationSection from '@/components/LocationSection';
import AvailableCards from '@/components/AvailableCards';
import Reveal from '@/components/Reveal';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <Hero />

      <section className="border-b border-gold/15 bg-[linear-gradient(180deg,#f8f8f6_0%,#eef2f4_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
          <Reveal>
            <h2 className="font-display text-3xl text-ocean md:text-4xl">Invest in oceanfront ownership</h2>
            <p className="mt-3 max-w-2xl text-ocean/75">
              Browse live share plans, reserve a suite from 10% today, and follow payments from your dashboard.
            </p>
          </Reveal>
          <div className="mt-8">
            <AvailableCards />
          </div>
          <div className="mt-8">
            <Link
              href="/invest"
              className="inline-flex w-full items-center justify-center rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean/90 sm:w-auto"
            >
              View all investment plans
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="font-display text-3xl text-ocean">The resort</h2>
          <p className="mt-2 max-w-2xl text-ocean/75">Ambiance, amenities, and the Cox&apos;s Bazar shoreline.</p>
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
