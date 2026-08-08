'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';

export default function InvestPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [suites, setSuites] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [plansJson, suitesJson] = await Promise.all([api('/timeshares'), api('/suites')]);
      const items = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
      const suitesArr = Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [];
      const byId = Object.fromEntries((suitesArr as any[]).map((s: any) => [s.id, s]));
      setSuites(byId);
      setPlans(items.filter((p: any) => (p.planStatus ?? '').toLowerCase() === 'unsold'));
    } catch {
      setError('Failed to load plans');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function suiteTypeIcon(type: string) {
    const t = (type || '').toLowerCase();
    if (t.includes('premium')) return '/images/icons/security.svg';
    if (t.includes('delux')) return '/images/icons/concierge.svg';
    return '/images/icons/balcony.svg';
  }

  function humanView(v?: string) {
    const s = (v || '').toLowerCase();
    if (s.includes('sea')) return 'Sea View';
    if (s.includes('hill')) return 'Hill View';
    return v || '—';
  }

  function formatPromoEnd(iso?: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ocean">Invest in a Suite</h1>
          <p className="mt-2 max-w-2xl text-ocean/75">
            Live unsold share plans. Choose a plan to review payment terms and complete your purchase.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p: any) => {
          const suite = suites[p.suiteId] || {};
          const isFull = (p.daysPerMonth ?? 0) >= 30;
          const discounted = typeof p.discountedPrice === 'number';
          return (
            <article
              key={p.id}
              className={`flex flex-col border bg-white p-6 ${
                discounted ? 'border-gold/60' : isFull ? 'border-gold/50' : 'border-ocean/15'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-ocean">{p.name}</h2>
                <span className="shrink-0 border border-ocean/15 bg-pearl px-2.5 py-1 text-xs font-semibold text-ocean">
                  {p.daysPerMonth} days/mo
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-8 w-8">
                  <Image src={suiteTypeIcon(suite.type)} alt="" fill sizes="32px" />
                </div>
                <span className="text-sm text-ocean/80">{suite.type ?? 'Suite'} · {humanView(suite.view)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ocean/70">
                <div>
                  Suite <span className="text-ocean">{p.suiteId ?? '—'}</span>
                </div>
                <div>
                  Floor <span className="text-ocean">{suite.floor ?? '—'}</span>
                </div>
                <div>
                  Size <span className="text-ocean">{suite.size ?? '—'} sq ft</span>
                </div>
                <div>
                  Lock-in <span className="text-ocean">{p.lockIn ?? 36} mo</span>
                </div>
              </dl>
              {discounted && (
                <span className="mt-5 inline-flex w-fit items-center border border-gold bg-gold/90 px-2.5 py-1 text-xs font-semibold text-ocean">
                  {p.discountPct}% OFF · Ends {formatPromoEnd(p.promoEndsAt)}
                </span>
              )}
              {discounted ? (
                <div className="mt-2">
                  <p className="text-sm text-ocean/50 line-through">৳ {p.price?.toLocaleString?.() ?? p.price}</p>
                  <p className="font-display text-3xl text-ocean">৳ {p.discountedPrice.toLocaleString()}</p>
                </div>
              ) : (
                <p className="mt-5 font-display text-3xl text-ocean">৳ {p.price?.toLocaleString?.() ?? p.price}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button>Buy this plan</Button>
                </Link>
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button variant="outline">Details</Button>
                </Link>
              </div>
            </article>
          );
        })}
        {plans.length === 0 && !loading && (
          <div className="border border-ocean/10 p-6 text-ocean/70 sm:col-span-2 lg:col-span-3">
            No unsold plans available right now. Check back soon or contact sales.
          </div>
        )}
      </div>
    </main>
  );
}
