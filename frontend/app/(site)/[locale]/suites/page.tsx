'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import ImageLightbox from '@/components/ImageLightbox';
import PlanOwner from '@/components/PlanOwner';
import { fetchMedia, resolveMediaUrl, type MediaItem } from '@/lib/media';

type Suite = {
  id: string;
  floor?: number;
  type?: string;
  size?: number;
  view?: string;
  totalPrice?: number;
};

type SharePlan = {
  id: string;
  name?: string;
  suiteId?: string;
  planStatus?: string;
  daysPerMonth?: number;
  price?: number;
  discountedPrice?: number;
  owner?: { name: string; city?: string; profession?: string; picUrl?: string | null } | null;
};

function planStatusKey(p: SharePlan) {
  return String(p?.planStatus || 'Unsold').toLowerCase().trim();
}

function isUnsoldPlan(p: SharePlan) {
  return planStatusKey(p) === 'unsold';
}

function isSoldPlan(p: SharePlan) {
  const s = planStatusKey(p);
  return s === 'booked' || s === 'sold';
}

function isReservedPlan(p: SharePlan) {
  return planStatusKey(p) === 'reserved';
}

function planTotal(p: SharePlan) {
  return typeof p.discountedPrice === 'number' ? Number(p.discountedPrice) : Number(p.price || 0);
}

function planStatusMeta(p: SharePlan) {
  if (isSoldPlan(p)) {
    return {
      labelKey: 'booked',
      chip: 'border-ocean bg-ocean text-white'
    };
  }
  if (isReservedPlan(p)) {
    return {
      labelKey: 'reserved',
      chip: 'border-gold/40 bg-gold/20 text-ocean'
    };
  }
  return {
    labelKey: 'available',
    chip: 'border-gold/60 bg-gold/15 text-ocean'
  };
}

function daysLabel(days: number | undefined, t: (key: string, values?: any) => string) {
  if (days == null || !Number.isFinite(Number(days))) return '—';
  const n = Number(days);
  if (n >= 30) return t('fullMonth');
  return t('daysMo', { n });
}

function firstBySuite(items: MediaItem[]) {
  const map: Record<string, { src: string; alt: string }> = {};
  for (const item of items) {
    const suiteId = item.suiteId;
    if (!suiteId || map[suiteId] || !item.url) continue;
    map[suiteId] = {
      src: resolveMediaUrl(item.url),
      alt: item.alt || item.label || suiteId
    };
  }
  return map;
}

function DrawingSlot({
  title,
  image,
  onOpen
}: {
  title: string;
  image?: { src: string; alt: string };
  onOpen: (img: { src: string; alt: string }) => void;
}) {
  const t = useTranslations('suites');
  if (!image) {
    return (
      <div className="flex h-32 items-center justify-center border border-dashed border-ocean/20 bg-pearl/40 px-3 text-center sm:h-40">
        <p className="text-xs text-ocean/50">{t('notUploaded', { title })}</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen({ src: image.src, alt: image.alt || title })}
      className="group w-full text-left"
      title={t('enlargeTitle', { title })}
    >
      <div className="relative h-32 w-full overflow-hidden border border-ocean/10 bg-pearl/40 p-2 transition group-hover:border-gold/50 sm:h-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt || title} className="h-full w-full object-contain" />
        <span className="pointer-events-none absolute bottom-2 right-2 border border-ocean/15 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-ocean sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          {t('enlarge')}
        </span>
      </div>
      <div className="mt-1.5 text-xs font-semibold text-ocean">{title}</div>
    </button>
  );
}

export default function SuitesPage() {
  const t = useTranslations('suites');
  const [suites, setSuites] = useState<Suite[]>([]);
  const [plans, setPlans] = useState<SharePlan[]>([]);
  const [archBySuite, setArchBySuite] = useState<Record<string, { src: string; alt: string }>>({});
  const [keyMapBySuite, setKeyMapBySuite] = useState<Record<string, { src: string; alt: string }>>({});
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [suitesJson, plansJson, archMedia, keyMedia] = await Promise.all([
          api('/suites'),
          api('/timeshares'),
          fetchMedia('suite_plan'),
          fetchMedia('suite_keymap')
        ]);
        if (cancelled) return;
        const list = Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [];
        const planList = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
        setSuites(list);
        setPlans(planList);
        setArchBySuite(firstBySuite(archMedia));
        setKeyMapBySuite(firstBySuite(keyMedia));
      } catch {
        if (!cancelled) {
          setSuites([]);
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planStatsBySuite = useMemo(() => {
    const map: Record<string, { total: number; sold: number }> = {};
    for (const p of plans) {
      const suiteId = p?.suiteId;
      if (!suiteId) continue;
      if (!map[suiteId]) map[suiteId] = { total: 0, sold: 0 };
      map[suiteId].total += 1;
      if (planStatusKey(p) !== 'unsold') {
        map[suiteId].sold += 1;
      }
    }
    return map;
  }, [plans]);

  const plansBySuite = useMemo(() => {
    const map: Record<string, SharePlan[]> = {};
    for (const p of plans) {
      const suiteId = p?.suiteId;
      if (!suiteId) continue;
      if (!map[suiteId]) map[suiteId] = [];
      map[suiteId].push(p);
    }
    for (const suiteId of Object.keys(map)) {
      map[suiteId].sort((a, b) => {
        const priceCmp = planTotal(a) - planTotal(b);
        if (priceCmp !== 0) return priceCmp;
        return String(a.id).localeCompare(String(b.id), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
    }
    return map;
  }, [plans]);

  const sorted = useMemo(
    () =>
      [...suites].sort((a, b) => {
        const priceCmp = Number(a.totalPrice || 0) - Number(b.totalPrice || 0);
        if (priceCmp !== 0) return priceCmp;
        return String(a.id).localeCompare(String(b.id), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      }),
    [suites]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-2 max-w-2xl text-ocean/75">
        Browse each unit with its share plans, architectural plan, and key map. Click a drawing to
        enlarge.
      </p>

      {loading && <p className="mt-8 text-ocean/70">{t('loading')}</p>}
      {!loading && suites.length === 0 && (
        <p className="mt-8 text-ocean/70">{t('empty')}</p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {sorted.map((s) => {
          const stats = planStatsBySuite[s.id] || { total: 0, sold: 0 };
          const childPlans = plansBySuite[s.id] || [];
          return (
            <article key={s.id} className="border border-ocean/10 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl text-ocean">{s.id}</h2>
                  <p className="mt-1 text-ocean/80">
                    {s.type} • {s.size} sq ft • {s.view}
                    {s.floor != null ? ` • Floor ${s.floor}` : ''}
                  </p>
                  <p className="mt-1 text-ocean/70">{formatMoney(s.totalPrice || 0)}</p>
                  <p className="mt-2">
                    {stats.total === 0 ? (
                      <span className="inline-block border border-ocean/15 bg-pearl px-2 py-0.5 text-xs text-ocean/70">
                        {t('noSharePlans')}
                      </span>
                    ) : (
                      <span
                        className={`inline-block border px-2 py-0.5 text-xs font-semibold ${
                          stats.sold >= stats.total
                            ? 'border-ocean/20 bg-pearl text-ocean/80'
                            : 'border-gold/50 bg-gold/10 text-ocean'
                        }`}
                      >
                        {t('soldPlans', { sold: stats.sold, total: stats.total })}
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  href={`/invest?q=${encodeURIComponent(s.id)}`}
                  className="text-sm font-semibold text-ocean underline decoration-gold underline-offset-4"
                >
                  {t('viewPlans')}
                </Link>
              </div>

              {childPlans.length > 0 && (
                <div className="mt-4 border-t border-ocean/10 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean/55">{t('plans')}</p>
                  <ul className="mt-2 divide-y divide-ocean/10">
                    {childPlans.map((p) => {
                      const available = isUnsoldPlan(p);
                      const status = planStatusMeta(p);
                      return (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-ocean">{p.name || p.id}</span>
                            <span className="text-ocean/60">
                              {' '}
                              · {daysLabel(p.daysPerMonth, t)} · {formatMoney(planTotal(p))}
                            </span>
                            {!available && p.owner && (
                              <p className="mt-0.5 text-xs">
                                <PlanOwner owner={p.owner} compact />
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-block border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.chip}`}
                            >
                              {t(status.labelKey as any)}
                            </span>
                            {available ? (
                              <Link
                                href={`/pricing/plans/${encodeURIComponent(p.id)}`}
                                className="inline-flex min-h-9 items-center text-sm font-semibold text-ocean underline decoration-gold underline-offset-4"
                              >
                                {t('buy')}
                              </Link>
                            ) : isSoldPlan(p) ? (
                              <Link
                                href={`/pricing/plans/${encodeURIComponent(p.id)}`}
                                className="inline-flex min-h-9 items-center text-sm font-semibold text-ocean underline decoration-gold underline-offset-4"
                              >
                                {t('seeWho')}
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <DrawingSlot
                  title={t('archPlan')}
                  image={archBySuite[s.id]}
                  onOpen={setLightbox}
                />
                <DrawingSlot title={t('keyMap')} image={keyMapBySuite[s.id]} onOpen={setLightbox} />
              </div>
            </article>
          );
        })}
      </div>

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </main>
  );
}
