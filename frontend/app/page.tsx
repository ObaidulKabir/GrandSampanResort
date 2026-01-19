import Hero from '@/components/Hero';
import Image from 'next/image';
import Link from 'next/link';

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
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">Features</h2>
        <p className="mt-2 text-ocean/80">Handpicked amenities for a premium oceanfront experience.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { name: 'Rooftop sunset restaurant', icon: '/images/icons/concierge.svg' },
            { name: 'Direct beach access', icon: '/images/icons/beach-access.svg' },
            { name: 'Private balconies', icon: '/images/icons/balcony.svg' },
            { name: 'High-speed Wi‑Fi', icon: '/images/icons/wifi.svg' },
            { name: 'Power backup', icon: '/images/icons/power.svg' },
            { name: 'Concierge', icon: '/images/icons/concierge.svg' },
            { name: 'Housekeeping', icon: '/images/icons/housekeeping.svg' },
            { name: 'Security', icon: '/images/icons/security.svg' },
            { name: 'Parking', icon: '/images/icons/parking.svg' }
          ].map((f) => (
            <div key={f.name} className="rounded-lg border border-gold/30 bg-white p-4 hover:shadow-md transition-shadow">
              <div className="relative h-24 w-full mb-3">
                <Image src={f.icon} alt={f.name} fill sizes="40vw" />
              </div>
              <span className="text-ocean">{f.name}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
