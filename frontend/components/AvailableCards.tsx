'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { suitePhoto } from '@/lib/photos';
import { fetchMedia, resolveMediaUrl } from '@/lib/media';

type Suite = { id: string; floor: number; type: string; size: number; view: string };

export default function AvailableCards() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [suitePhotos, setSuitePhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedia('suites').then((items) => {
      const byLabel: Record<string, string> = {};
      items.forEach((item) => {
        const key = (item.label || '').toLowerCase().trim();
        if (key && !byLabel[key]) byLabel[key] = resolveMediaUrl(item.url);
      });
      setSuitePhotos(byLabel);
    });
  }, []);

  function photoFor(type: string) {
    const uploaded = suitePhotos[type.toLowerCase().trim()];
    return uploaded ? { src: uploaded, unoptimized: true } : { src: suitePhoto(type), unoptimized: false };
  }

  useEffect(() => {
    async function loadSuites() {
      setLoading(true);
      try {
        const json = await api('/suites');
        const list: Suite[] = Array.isArray(json) ? json : json?.suites ?? [];
        const pick = list.slice(0, 3);
        setSuites(pick);
        if (!pick.length) return;
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 30);
        try {
          const avPairs = await Promise.all(
            pick.map(async (s) => {
              const aJson = await api(
                `/booking/availability?suiteId=${encodeURIComponent(s.id)}&start=${start.toISOString()}&end=${end.toISOString()}`
              );
              return [s.id, !!aJson?.available] as const;
            })
          );
          setAvailability(Object.fromEntries(avPairs));
        } catch {
          /* keep suite cards even if availability checks fail */
        }
      } catch {
        setSuites([]);
      } finally {
        setLoading(false);
      }
    }
    loadSuites();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
      {suites.map((s) => {
        const ok = availability[s.id];
        return (
          <article key={s.id} className="group border border-ocean/10 bg-white transition hover:border-gold/50">
            <div className="relative h-44 w-full overflow-hidden">
              <Image
                src={photoFor(s.type).src}
                alt={`${s.type} suite`}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                unoptimized={photoFor(s.type).unoptimized}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span
                className={`absolute right-3 top-3 border px-2 py-0.5 text-xs font-semibold ${
                  ok ? 'border-gold bg-gold/90 text-ocean' : 'border-white/40 bg-ocean/80 text-white'
                }`}
              >
                {ok ? 'Available' : 'Fully booked'}
              </span>
            </div>
            <div className="p-5">
              <div className="font-display text-lg text-ocean">
                {s.type} &middot; {s.view} view
              </div>
              <div className="mt-1 text-sm text-ocean/70">
                Floor {s.floor} &middot; {s.size} sq ft
              </div>
              <p className="mt-3 text-sm text-ocean/70">
                {ok ? 'Open dates in the next 30 days.' : 'No open dates in the next 30 days.'}
              </p>
              <Link
                href="/invest"
                className="mt-4 inline-flex text-sm font-semibold text-ocean underline decoration-gold underline-offset-4 hover:text-gold"
              >
                View investment plans
              </Link>
            </div>
          </article>
        );
      })}
      {suites.length === 0 && !loading && (
        <div className="border border-ocean/10 p-4 text-ocean/70 sm:col-span-2 md:col-span-3">
          No units to display
        </div>
      )}
      {loading && (
        <div className="border border-ocean/10 p-4 text-ocean/70 sm:col-span-2 md:col-span-3">
          Loading availability...
        </div>
      )}
    </div>
  );
}
