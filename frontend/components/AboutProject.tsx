'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { fetchMedia, toResortPhotos } from '@/lib/media';
import type { ResortPhoto } from '@/lib/photos';

export default function AboutProject() {
  const t = useTranslations('aboutProject');
  const fallbackPhotos: ResortPhoto[] = [
    { src: '/images/resort-rooms.svg', alt: t('photoRooms') },
    { src: '/images/rooftop-cafe.svg', alt: t('photoCafe') }
  ];
  const highlights = [t('h1'), t('h2'), t('h3'), t('h4')];
  const [photos, setPhotos] = useState<ResortPhoto[]>(fallbackPhotos);

  useEffect(() => {
    fetchMedia('about_project').then((items) => {
      if (items.length) setPhotos(toResortPhotos(items.slice(0, 2)));
    });
  }, []);

  return (
    <section className="mx-auto max-w-4xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-4 text-ocean/80">{t('body')}</p>
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
