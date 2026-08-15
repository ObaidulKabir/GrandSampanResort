'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { suitePhoto } from '@/lib/photos';
import { fetchMedia, resolveMediaUrl } from '@/lib/media';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

type Suite = { id: string; floor: number; type: string; size: number; view: string };

const SHOWCASE_TYPES = ['Standard', 'Delux', 'Premium'] as const;

function normalizeType(type: string) {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'deluxe') return 'delux';
  return t;
}

function pickShowcaseSuites(list: Suite[]): Suite[] {
  const used = new Set<string>();
  const picked: Suite[] = [];
  for (const wanted of SHOWCASE_TYPES) {
    const candidates = list.filter(
      (s) => normalizeType(s.type) === normalizeType(wanted) && !used.has(s.id)
    );
    const match =
      candidates.find((s) => String(s.view).toLowerCase().includes('sea')) || candidates[0];
    if (match) {
      used.add(match.id);
      picked.push(match);
    }
  }
  return picked;
}

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
    const key = normalizeType(type);
    const uploaded = suitePhotos[key] || suitePhotos[type.toLowerCase().trim()];
    return uploaded ? { src: uploaded, unoptimized: true } : { src: suitePhoto(type), unoptimized: false };
  }

  useEffect(() => {
    async function loadSuites() {
      setLoading(true);
      try {
        const json = await api('/suites');
        const list: Suite[] = Array.isArray(json) ? json : json?.suites ?? [];
        const pick = pickShowcaseSuites(list);
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="overflow-hidden rounded-xl border border-ocean/10 bg-white p-4 shadow-sm">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
      {suites.map((s) => {
        const ok = availability[s.id];
        return (
          <article
            key={s.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-xl"
          >
            <div className="relative h-48 w-full overflow-hidden bg-ocean/10">
              <Image
                src={photoFor(s.type).src}
                alt={`${s.type} suite`}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                unoptimized={photoFor(s.type).unoptimized}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ocean/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
              <div className="absolute right-3 top-3">
                <Badge variant={ok ? 'gold' : 'ocean'} size="sm" dot pulse={ok}>
                  {ok ? 'Share Available' : 'Reserved'}
                </Badge>
              </div>
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-xs uppercase tracking-wider text-gold font-semibold">
                  Suite {s.id}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <h3 className="font-display text-xl font-bold text-ocean">
                  {s.type} Suite &middot; <span className="capitalize">{s.view}</span> View
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-ocean/65">
                  <span>Floor {s.floor}</span>
                  <span>&bull;</span>
                  <span>{s.size} sq ft</span>
                  <span>&bull;</span>
                  <span className="text-emerald-700 font-semibold">8% Est. ROI</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ocean/75">
                  Exclusive deeded fraction with 30 days annual stay allowance and semiannual dividend distributions.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-ocean/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-ocean/60">Reserve from 10%</span>
                <Link
                  href="/invest"
                  className="inline-flex items-center gap-1 text-xs font-bold text-ocean transition hover:text-gold"
                >
                  View Share Plans &rarr;
                </Link>
              </div>
            </div>
          </article>
        );
      })}
      {suites.length === 0 && !loading && (
        <div className="rounded-xl border border-ocean/10 bg-white p-8 text-center text-ocean/70 sm:col-span-2 md:col-span-3">
          No units currently available for preview.
        </div>
      )}
    </div>
  );
}
