import Hero from '@/components/Hero';
import Image from 'next/image';

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
        </div>
        <div>
          <h2 className="font-['Playfair Display'] text-3xl text-ocean">Investment Plans</h2>
          <p className="mt-3 text-ocean/80">
            Choose Plan A (3 days), Plan B (5 days), or Full Suite ownership.
          </p>
          <div className="mt-6 relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
            <Image src="/images/rooftop-cafe.svg" alt="Rooftop café ambiance" fill sizes="100vw" />
          </div>
        </div>
      </section>
    </main>
  );
}
