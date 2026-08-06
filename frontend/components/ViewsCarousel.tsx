'use client';
import { useEffect, useState } from 'react';
import Carousel from './Carousel';
import { resortPhotos, type ResortPhoto } from '@/lib/photos';
import { fetchMedia, toResortPhotos } from '@/lib/media';

export default function ViewsCarousel({ height = '20vh' }: { height?: number | string }) {
  const [slides, setSlides] = useState<ResortPhoto[]>(resortPhotos);
  useEffect(() => {
    fetchMedia('resort').then((items) => {
      if (items.length) setSlides(toResortPhotos(items));
    });
  }, []);
  return <Carousel height={height} slides={slides} />;
}
