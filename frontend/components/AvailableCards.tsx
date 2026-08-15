'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { suitePhoto } from '@/lib/photos';
import { fetchMedia, resolveMediaUrl } from '@/lib/media';

type Suite = { id: string; floor: number; type: string; size: number; view: string };

/** Homepage showcase: one card per tier, in this order. */
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
      candidates.find((s) => String(s.view).toLowerCase() === 'sea') || candidates[0];
    if (match) {
      used.add(match.id);
      picked.push(match);
    }
  }
  return picked;
}

export default function AvailableCards() {
  const t = useTranslations('availableCards');
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

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
      {suites.map((s) => {
        const ok = availability[s.id];
        return (
          <article key={s.id} className="group border border-ocean/10 bg-white transition hover:border-gold/50">
            <div className="relative h-44 w-full overflow-hidden">
              <Image
                src={photoFor(s.type).src}
                alt={t('suiteAlt', { type: s.type })}
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
                {ok ? t('available') : t('fullyBooked')}
              </span>
            </div>
            <div className="p-5">
              <div className="font-display text-lg text-ocean">
                {t('typeView', { type: s.type, view: s.view })}
              </div>
              <div className="mt-1 text-sm text-ocean/70">
                {t('floorSize', { floor: s.floor, size: s.size })}
              </div>
              <p className="mt-3 text-sm text-ocean/70">{ok ? t('openDates') : t('noOpenDates')}</p>
              <Link
                href="/invest"
                className="mt-4 inline-flex text-sm font-semibold text-ocean underline decoration-gold underline-offset-4 hover:text-gold"
              >
                {t('viewPlans')}
              </Link>
            </div>
          </article>
        );
      })}
      {suites.length === 0 && !loading && (
        <div className="border border-ocean/10 p-4 text-ocean/70 sm:col-span-2 md:col-span-3">
          {t('empty')}
        </div>
      )}
      {loading && (
        <div className="border border-ocean/10 p-4 text-ocean/70 sm:col-span-2 md:col-span-3">
          {t('loading')}
        </div>
      )}
    </div>
  );
}
