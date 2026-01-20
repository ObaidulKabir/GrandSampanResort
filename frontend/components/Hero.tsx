'use client';
import Button from './Button';
import Carousel from './Carousel';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [slides, setSlides] = useState<{ src: string; alt: string }[]>([
    { src: '/views/ocean.svg', alt: 'Oceanfront luxury resort' },
    { src: '/views/rooms.svg', alt: 'Rooms with ocean views' },
    { src: '/views/rooftop.svg', alt: 'Rooftop café ambiance' }
  ]);
  useEffect(() => {
    fetch('/api/views')
      .then((r) => r.json())
      .then((names: string[]) => {
        if (Array.isArray(names) && names.length) {
          setSlides(
            names.map((n) => ({
              src: `/views/${n}`,
              alt: n.replace(/[-_]/g, ' ')
            }))
          );
        }
      })
      .catch(() => {});
  }, []);
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="relative mb-10">
          <Carousel height={384} slides={slides} />
        </div>
        <h1 className="font-['Playfair Display'] text-5xl md:text-7xl leading-tight text-ocean">
          Own the Beach. <span className="text-gold">Earn from It.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ocean/80">
          A luxury beachfront resort offering fractional ownership and premium stays.
        </p>
        <div className="mt-10 flex gap-4">
          <Button>Book a Site Visit</Button>
          <a href="/invest">
            <Button variant="outline">Invest in a Suite</Button>
          </a>
        </div>
      </div>
    </section>
  );
}
