'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';

export default function InvestmentPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [suites, setSuites] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [plansJson, suitesJson] = await Promise.all([api('/timeshares'), api('/suites')]);
        const items = Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? [];
        const suitesArr = Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [];
        setSuites(Object.fromEntries(suitesArr.map((s: any) => [s.id, s])));
        setPlans(items.filter((p: any) => (p.planStatus ?? 'Unsold').toLowerCase() === 'unsold'));
      } catch {
        setError('Failed to load investment plans');
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ocean">Investment Plans</h1>
          <p className="mt-2 text-ocean/75">Unsold share plans ready for purchase.</p>
        </div>
        <Link href="/invest">
          <Button variant="outline">Full catalog</Button>
        </Link>
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {loading && <p className="mt-6 text-ocean/70">Loading plans...</p>}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const suite = suites[p.suiteId] || {};
          return (
            <article key={p.id} className="flex flex-col border border-ocean/15 bg-white p-6">
              <h2 className="font-display text-2xl text-ocean">{p.name}</h2>
              <p className="mt-2 text-sm text-ocean/75">
                {p.daysPerMonth} days/month · {p.planType || 'DPM'} · Lock-in {p.lockIn || 36} mo
              </p>
              <p className="mt-2 text-sm text-ocean/70">
                {p.suiteId || '—'} · {suite.type || '—'} · {suite.view || '—'}
              </p>
              <p className="mt-5 font-display text-3xl text-ocean">৳ {p.price?.toLocaleString?.() ?? p.price}</p>
              <div className="mt-6">
                <Link href={`/pricing/plans/${p.id}`}>
                  <Button>Buy this plan</Button>
                </Link>
              </div>
            </article>
          );
        })}
        {!loading && plans.length === 0 && (
          <div className="border border-ocean/10 p-6 text-ocean/70 md:col-span-3">
            No unsold plans available. Check back soon or contact sales.
          </div>
        )}
      </div>
    </main>
  );
}
