import Image from 'next/image';

const features = [
  { name: 'Rooftop sunset restaurant', icon: '/images/icons/concierge.svg' },
  { name: 'Direct beach access', icon: '/images/icons/beach-access.svg' },
  { name: 'Private balconies', icon: '/images/icons/balcony.svg' },
  { name: 'High-speed Wi‑Fi', icon: '/images/icons/wifi.svg' },
  { name: 'Power backup', icon: '/images/icons/power.svg' },
  { name: 'Concierge', icon: '/images/icons/concierge.svg' },
  { name: 'Housekeeping', icon: '/images/icons/housekeeping.svg' },
  { name: 'Security', icon: '/images/icons/security.svg' },
  { name: 'Parking', icon: '/images/icons/parking.svg' }
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Resort Features</h1>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.name} className="rounded-lg border border-gold/30 bg-white p-4">
            <div className="relative h-24 w-full mb-3">
              <Image src={f.icon} alt={f.name} fill sizes="40vw" />
            </div>
            <span className="text-ocean">{f.name}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
