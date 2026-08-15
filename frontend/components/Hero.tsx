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
    <section className="relative isolate min-h-[32rem] w-full overflow-hidden bg-ocean sm:min-h-[calc(100svh-4.5rem)]">
      <HeroCarousel slides={slides} />

      <div className="relative z-10 mx-auto flex min-h-[32rem] max-w-7xl flex-col justify-end px-4 pb-12 pt-20 sm:min-h-[calc(100svh-4.5rem)] sm:px-6 sm:pb-16 sm:pt-24 md:justify-center md:pb-24 md:pt-20">
        <p className="font-display animate-fade-up text-xl font-semibold tracking-tight text-gold sm:text-3xl md:text-4xl">
          Unitech Grand Sampan Resort
        </p>
        <h1 className="font-display animate-fade-up-delay-1 mt-3 max-w-3xl text-3xl font-bold leading-[1.15] text-white sm:mt-4 sm:text-5xl md:text-6xl">
          Own the beach. <span className="text-gold">Earn from it.</span>
        </h1>
        <p className="animate-fade-up-delay-2 mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:mt-5 sm:text-lg">
          Fractional ownership and premium stays on Cox&apos;s Bazar&apos;s oceanfront.
        </p>
        <div className="animate-fade-up-delay-3 mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <Link href="/invest" className="sm:inline-flex">
            <Button className="w-full bg-gold text-ocean hover:bg-gold/90 sm:w-auto">Invest in a Suite</Button>
          </Link>
          <Link href="/invest/advisor" className="sm:inline-flex">
            <Button
              variant="outline"
              className="w-full border-white/70 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Help me choose
            </Button>
          </Link>
          <Link href="/booking" className="sm:inline-flex">
            <Button
              variant="outline"
              className="w-full border-white/70 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Book a Stay
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
