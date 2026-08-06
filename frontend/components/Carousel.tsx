'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Slide = {
  src: string;
  alt: string;
  unoptimized?: boolean;
};

export default function Carousel({
  slides,
  height = 320,
  auto = true,
  intervalMs = 5000
}: {
  slides: Slide[];
  height?: number | string;
  auto?: boolean;
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);

  function next() {
    setIdx((i) => (i + 1) % slides.length);
  }
  function prev() {
    setIdx((i) => (i - 1 + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!auto || slides.length <= 1) return;
    const t = setInterval(next, intervalMs);
    return () => clearInterval(t);
  }, [auto, intervalMs, slides.length]);

  if (!slides.length) {
    return <div className="border border-ocean/10 p-4 text-ocean/70">No images available</div>;
  }

  return (
    <div className="relative w-full overflow-hidden border border-gold/30" style={{ height }}>
      {slides.map((s, i) => (
        <div
          key={s.src}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
          aria-hidden={i !== idx}
        >
          <Image
            src={s.src}
            alt={s.alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority={i === 0}
            unoptimized={s.unoptimized}
          />
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean/30 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-gold' : 'w-3 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute inset-y-0 left-0 flex items-center px-2 text-white/80 transition hover:text-gold"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        aria-label="Next"
        onClick={next}
        className="absolute inset-y-0 right-0 flex items-center px-2 text-white/80 transition hover:text-gold"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
