import Button from './Button';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="relative h-64 md:h-96 w-full mb-10 rounded-xl overflow-hidden border border-gold/30">
          <Image src="/images/hero-ocean.svg" alt="Oceanfront luxury resort" fill priority sizes="100vw" />
        </div>
        <h1 className="font-['Playfair Display'] text-5xl md:text-7xl leading-tight text-ocean">
          Own the Beach. <span className="text-gold">Earn from It.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ocean/80">
          A luxury beachfront resort offering fractional ownership and premium stays.
        </p>
        <div className="mt-10 flex gap-4">
          <Button>Book a Stay</Button>
          <Button variant="outline">Invest in a Suite</Button>
        </div>
      </div>
    </section>
  );
}
