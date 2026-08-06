'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResortPhoto } from '@/lib/photos';

export default function HeroCarousel({
  slides,
  intervalMs = 6500
}: {
  slides: ResortPhoto[];
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((n: number) => setIdx(((n % count) + count) % count), [count]);
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);

  useEffect(() => {
    if (paused || count <= 1) return;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % count), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, count, intervalMs]);

  if (count === 0) return null;

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.src}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}
          aria-hidden={i !== idx}
        >
          <div className="absolute inset-0 overflow-hidden">
            <Image
              key={`${s.src}-${i === idx}`}
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              unoptimized={s.unoptimized}
              className={`object-cover ${i === idx ? 'hero-slide-img' : ''}`}
            />
          </div>
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(10,39,64,0.92) 0%, rgba(10,39,64,0.72) 42%, rgba(10,39,64,0.32) 100%)'
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(10,39,64,0.55) 100%)' }}
        />
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-2 md:bottom-8">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Show slide ${i + 1}: ${s.alt}`}
              aria-current={i === idx}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-8 bg-gold' : 'w-4 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={prev}
            className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-black/40 md:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={next}
            className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-black/40 md:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
