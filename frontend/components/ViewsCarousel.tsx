'use client';
import { useEffect, useState } from 'react';
import Carousel from './Carousel';

export default function ViewsCarousel({ height = '20vh' }: { height?: number | string }) {
  const [slides, setSlides] = useState<{ src: string; alt: string }[]>([
    { src: '/views/ocean.svg', alt: 'Ocean view' },
    { src: '/views/rooms.svg', alt: 'Rooms' },
    { src: '/views/rooftop.svg', alt: 'Rooftop' },
    { src: '/views/beach.svg', alt: 'Beach' }
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
  return <Carousel height={height} slides={slides} />;
}
