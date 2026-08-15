'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from './Button';
import HeroCarousel from './HeroCarousel';
import { heroPhotos, type ResortPhoto } from '@/lib/photos';
import { fetchMedia, toResortPhotos } from '@/lib/media';

export default function Hero() {
  const [slides, setSlides] = useState<ResortPhoto[]>(heroPhotos);
  useEffect(() => {
    fetchMedia('hero').then((items) => {
      if (items.length) setSlides(toResortPhotos(items));
    });
  }, []);

  return (
    <section className="relative isolate min-h-[calc(100vh-4.5rem)] w-full overflow-hidden bg-ocean">
      <HeroCarousel slides={slides} />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-7xl flex-col justify-end px-6 pb-16 pt-24 md:justify-center md:pb-24 md:pt-20">
        <p className="font-display animate-fade-up text-2xl font-semibold tracking-tight text-gold sm:text-3xl md:text-4xl">
          Unitech Grand Sampan Resort
        </p>
        <h1 className="font-display animate-fade-up-delay-1 mt-4 max-w-3xl text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl">
          Own the beach. <span className="text-gold">Earn from it.</span>
        </h1>
        <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Fractional ownership and premium stays on Cox&apos;s Bazar&apos;s oceanfront.
        </p>
        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
          <Link href="/invest">
            <Button className="bg-gold text-ocean hover:bg-gold/90">Invest in a Suite</Button>
          </Link>
          <Link href="/invest/advisor">
            <Button
              variant="outline"
              className="border-white/70 text-white hover:bg-white/10 hover:text-white"
            >
              Help me choose
            </Button>
          </Link>
          <Link href="/booking">
            <Button
              variant="outline"
              className="border-white/70 text-white hover:bg-white/10 hover:text-white"
            >
              Book a Stay
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
