'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';

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

  function themeForDays(days: number) {
    if (days >= 30) return { card: 'border-gold/50 bg-gold/10', badge: 'bg-gold text-ocean' };
    if (days >= 5) return { card: 'border-indigo-300 bg-indigo-50', badge: 'bg-indigo-600 text-white' };
    return { card: 'border-teal-300 bg-teal-50', badge: 'bg-teal-600 text-white' };
  }
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">Invest in a Suite</h1>
        <button onClick={load} className="rounded bg-ocean px-4 py-2 text-white">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      <p className="mt-2 text-ocean/80">Browse all unsold share plans and proceed to investment.</p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {plans.map((p: any) => (
          (() => {
            const suite = suites[p.suiteId] || {};
            const theme = themeForDays(p.daysPerMonth ?? 0);
            return (
              <div key={p.id} className={`rounded-lg border ${theme.card} p-6`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-['Playfair Display'] text-ocean">{p.name}</h2>
                  <span className={`rounded px-3 py-1 text-sm ${theme.badge}`}>{p.daysPerMonth} days/month</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative h-8 w-8">
                    <Image src={suiteTypeIcon(suite.type)} alt={suite.type ?? 'Type'} fill sizes="32px" />
                  </div>
                  <span className="text-ocean/80">{suite.type ?? '—'}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-ocean/70">Suite: <span className="text-ocean">{p.suiteId ?? '—'}</span></div>
                  <div className="text-ocean/70">View: <span className="text-ocean">{humanView(suite.view)}</span></div>
                  <div className="text-ocean/70">Size: <span className="text-ocean">{suite.size ?? '—'} sq ft</span></div>
                  <div className="text-ocean/70">Floor: <span className="text-ocean">{suite.floor ?? '—'}</span></div>
                </div>
                <p className="mt-3 text-ocean/70">Lock-in {p.lockIn} months • Price: <span className="text-ocean">৳ {p.price}</span></p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/pricing/plans/${p.id}`} className="rounded bg-ocean px-4 py-2 text-white">
                    View Details
                  </Link>
                  <Link href={`/investment-plans`} className="rounded border border-ocean px-4 py-2 text-ocean">
                    Proceed
                  </Link>
                </div>
              </div>
            );
          })()
        ))}
        {plans.length === 0 && !loading && <div className="rounded border border-ocean/10 p-4 text-ocean/70">No unsold plans available</div>}
      </div>
    </main>
  );
}
