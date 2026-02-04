import Image from 'next/image';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16 mt-10">
      <section className="mx-auto max-w-4xl">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">About Project</h1>
        <p className="mt-4 text-ocean/80">
          Unitech Grand Sampan Resort is a boutique beachfront development located along Marine Drive, Innani. Designed for serene oceanfront living, the project blends hospitality and fractional ownership to provide premium stays and sustainable returns.
        </p>
        <ul className="mt-6 space-y-2 text-ocean/80">
          <li>Prime location with direct beach access</li>
          <li>32 suites, each with private balcony and sea breeze ventilation</li>
          <li>Rooftop café designed for sunset dining</li>
          <li>Concierge and modern amenities in a cozy, luxury format</li>
        </ul>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
            <Image src="/images/resort-rooms.svg" alt="Resort rooms overview" fill sizes="100vw" />
          </div>
          <div className="relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
            <Image src="/images/rooftop-cafe.svg" alt="Rooftop café" fill sizes="100vw" />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">About Suites</h2>
        <p className="mt-4 text-ocean/80">
          Suites are offered in Standard, Deluxe and Premium categories, balancing comfort, space and amenities for different guest needs.
        </p>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-gold/30 bg-white p-5">
            <h3 className="text-xl text-ocean">Standard Suite</h3>
            <ul className="mt-2 space-y-1 text-ocean/80">
              <li>Open-plan with seating and ergonomic workstation</li>
              <li>King bed, premium linens, pillow selection</li>
              <li>43″ Smart TV, international channels, high-speed Wi‑Fi</li>
              <li>Coffee/tea setup and complimentary water</li>
              <li>In-room safe; hairdryer; iron on request</li>
              <li>Rainfall shower; eco toiletries; daily towel service</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-5">
            <h3 className="text-xl text-ocean">Deluxe Suite</h3>
            <ul className="mt-2 space-y-1 text-ocean/80">
              <li>Separate living and bedroom for privacy</li>
              <li>Sofa set with coffee table for lounge or meetings</li>
              <li>50″ Smart TV in living; additional TV in bedroom</li>
              <li>Mini‑fridge; upgraded specialty teas and coffees</li>
              <li>Individual climate control; blackout curtains</li>
              <li>Spacious bath; premium toiletries; slippers and robes</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-5">
            <h3 className="text-xl text-ocean">Premium Suite</h3>
            <ul className="mt-2 space-y-1 text-ocean/80">
              <li>Higher floors with expansive views and quiet</li>
              <li>Grand living area with dining table</li>
              <li>Executive desk with USB‑C; cordless phone</li>
              <li>Nespresso machine; daily snack platter</li>
              <li>Late checkout (subject to availability); turn‑down service</li>
              <li>Bathtub plus separate rainfall shower; luxury toiletries</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">About Compound</h2>
        <p className="mt-4 text-ocean/80">
          We are a member of the Rupayan Beach View project. The compound provides a comprehensive set of amenities and services for guests and owners.
        </p>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <ul className="space-y-2 text-ocean/80">
            <li>Secured boundary and access control</li>
            <li>CC camera surveillance</li>
            <li>Amusement park</li>
            <li>Water park</li>
            <li>Shopping mall</li>
            <li>Mosque</li>
          </ul>
          <ul className="space-y-2 text-ocean/80">
            <li>Children play area</li>
            <li>Boat club</li>
            <li>Beach security</li>
            <li>Beach‑side restaurant</li>
            <li>Pickup and drop‑off facility (airport, train station)</li>
            <li>Hospital</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">About Company</h2>
        <p className="mt-4 text-ocean/80">
          Unitech develops hospitality-led coastal projects with an emphasis on durability, guest experience and long-term stewardship. The Grand Sampan initiative brings a refined, small-scale luxury experience to Cox’s Bazar’s iconic shoreline.
        </p>
        <ul className="mt-6 space-y-2 text-ocean/80 mb-20">
          <li>Experience in coastal developments and boutique hospitality</li>
          <li>Transparent fractional model with investor services</li>
          <li>Local operations team for daily guest excellence</li>
          <li>Commitment to environmental and community standards</li>
        </ul>
      </section>
      <Footer/>
    </main>
  );
}
