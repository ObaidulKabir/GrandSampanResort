'use client';
import { useEffect, useState } from 'react';
import Carousel from './Carousel';

export default function ViewsCarousel({ height = '20vh' }: { height?: number | string }) {
  const [slides, setSlides] = useState<{ src: string; alt: string }[]>([]);
  useEffect(() => {
    fetch('/api/views', { cache: 'no-store' })
      .then((r) => r.json())
      .then((urls: string[]) => {
        if (Array.isArray(urls) && urls.length) {
          setSlides(
            urls.map((u) => {
              const name = (u.split('/').pop() || u).replace(/\.[^.]+$/, '');
              return {
                src: u.startsWith('/') ? u : `/views/${u}`,
                alt: name.replace(/[-_]/g, ' ')
              };
            })
          );
        }
      })
      .catch(() => {});
  }, []);
  return <Carousel height={height} slides={slides} />;
}
