import Image from 'next/image';

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">About the Project</h1>
      <ul className="mt-6 space-y-2 text-ocean/80">
        <li>Land size: Prime beachfront parcel</li>
        <li>Beachfront: Direct access</li>
        <li>32 rooms with private balconies</li>
        <li>Rooftop café with sunset views</li>
        <li>Boutique luxury concept</li>
      </ul>
      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
          <Image src="/images/resort-rooms.svg" alt="Resort rooms overview" fill sizes="100vw" />
        </div>
        <div className="relative h-56 w-full rounded-lg overflow-hidden border border-gold/30">
          <Image src="/images/rooftop-cafe.svg" alt="Rooftop café" fill sizes="100vw" />
        </div>
      </div>
    </main>
  );
}
