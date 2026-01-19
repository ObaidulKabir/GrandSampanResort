import Hero from '@/components/Hero';
import Image from 'next/image';
import Link from 'next/link';
import ViewsCarousel from '@/components/ViewsCarousel';
import FeaturesGrid from '@/components/FeaturesGrid';

export default function HomePage() {
  return (
    <main>
      <Hero />

      <section className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-['Playfair Display'] text-3xl text-ocean">About the Resort</h2>
          <p className="mt-3 text-ocean/80">
            Boutique 32-room beachfront property with rooftop café and private balconies.
          </p>
          <div className="mt-6 relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
            <Image src="/images/resort-rooms.svg" alt="Boutique rooms with ocean views" fill sizes="100vw" />
          </div>
          <div className="mt-4 relative h-40 w-full rounded-lg overflow-hidden border border-gold/30">
            <Image src="/images/beach-access.svg" alt="Direct access to the beach" fill sizes="100vw" />
          </div>
        </div>
        <div>
          <h2 className="font-['Playfair Display'] text-3xl text-ocean">Investment Plans</h2>
          <p className="mt-3 text-ocean/80">
            Choose Plan A (3 days), Plan B (5 days), or Full Suite ownership.
          </p>
          <div className="mt-6 relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
            <Image src="/images/rooftop-cafe.svg" alt="Rooftop café ambiance" fill sizes="100vw" />
          </div>
          <div className="mt-4">
            <Link href="/investment-plans" className="text-gold underline">Explore investment plans</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">Views</h2>
        <p className="mt-2 text-ocean/80">A glimpse of the resort ambiance and oceanfront lifestyle.</p>
        <div className="mt-6">
          <ViewsCarousel height={320} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">Features</h2>
        <p className="mt-2 text-ocean/80">Handpicked amenities from your features image set.</p>
        <FeaturesGrid />
      </section>
    </main>
  );
}
