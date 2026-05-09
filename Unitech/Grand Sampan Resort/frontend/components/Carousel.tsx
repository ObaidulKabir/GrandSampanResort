'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Slide = {
  src: string;
  alt: string;
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
    return <div className="rounded border border-ocean/10 p-4 text-ocean/70">No images available</div>;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gold/30" style={{ height }}>
      <div className="absolute inset-0">
        <Image key={slides[idx].src} src={slides[idx].src} alt={slides[idx].alt} fill sizes="100vw" className="object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="absolute bottom-2 left-2 flex gap-2">
        {slides.map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === idx ? 'bg-gold' : 'bg-white/50'}`} />
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 flex items-center">
        <button aria-label="Previous" onClick={prev} className="m-2 rounded bg-white/70 px-3 py-2 text-ocean hover:bg-white">
          ‹
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button aria-label="Next" onClick={next} className="m-2 rounded bg-white/70 px-3 py-2 text-ocean hover:bg-white">
          ›
        </button>
      </div>
    </div>
  );
}

