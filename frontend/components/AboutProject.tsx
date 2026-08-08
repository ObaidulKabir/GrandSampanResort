'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchMedia, toResortPhotos } from '@/lib/media';
import type { ResortPhoto } from '@/lib/photos';

const fallbackPhotos: ResortPhoto[] = [
  { src: '/images/resort-rooms.svg', alt: 'Resort rooms overview' },
  { src: '/images/rooftop-cafe.svg', alt: 'Rooftop café' }
];

const highlights = [
  'Prime location with direct beach access',
  '64 suites, each with private balcony and sea breeze ventilation',
  'Rooftop café designed for sunset dining',
  'Concierge and modern amenities in a cozy, luxury format'
];

export default function AboutProject() {
  const [photos, setPhotos] = useState<ResortPhoto[]>(fallbackPhotos);

  useEffect(() => {
    fetchMedia('about_project').then((items) => {
      if (items.length) setPhotos(toResortPhotos(items.slice(0, 2)));
    });
  }, []);

  return (
    <section className="mx-auto max-w-4xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">About</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">About Project</h1>
      <p className="mt-4 text-ocean/80">
        Unitech Grand Sampan Resort is a boutique beachfront development located along Marine Drive, Innani,
        situated in the secured area of &apos;Rupayan Beach View Project&apos;. Designed for serene oceanfront
        living, the project blends hospitality and fractional ownership to provide premium stays and sustainable
        returns.
      </p>
      <ul className="mt-6 space-y-2 text-ocean/80">
        {highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {photos.map((photo) => (
          <div key={photo.src} className="relative h-56 w-full overflow-hidden border border-gold/30">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              unoptimized={photo.unoptimized}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
