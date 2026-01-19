'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const tabs = [
  { key: 'invest', label: 'Invest', href: '/investment-plans', icon: '/images/icons/balcony.svg', blurb: 'Browse fractional plans and invest securely.' },
  { key: 'returns', label: 'Returns', href: '/returns-income', icon: '/images/icons/security.svg', blurb: 'View projected income and revenue share.' },
  { key: 'book', label: 'Book Stay', href: '/booking', icon: '/images/icons/concierge.svg', blurb: 'Reserve your entitled days and manage stays.' }
];

export default function InvestorPage() {
  const [active, setActive] = useState('invest');
  const current = tabs.find((t) => t.key === active)!;
  const [plans, setPlans] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loadingPlans, setLoadingPlans] = useState(false);

  async function loadPlans() {
    setLoadingPlans(true);
    try {
      const json = await api('/timeshares');
      setPlans(Array.isArray(json) ? json : json?.plans ?? []);
    } catch {
      setPlans([]);
    }
    setLoadingPlans(false);
  }

  useEffect(() => {
    if (active === 'invest') loadPlans();
  }, [active]);
  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Investor Profile</h1>
      <p className="mt-2 text-ocean/80">Manage investments, review returns, and book stays in one place.</p>

      <div className="mt-8 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`rounded px-4 py-2 border ${active === t.key ? 'bg-ocean text-white border-ocean' : 'border-ocean/20 text-ocean'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {tabs.filter((t) => t.key === 'returns').map((t) => (
          <div key={t.key} className={`rounded-lg border ${active === t.key ? 'border-gold' : 'border-gold/30'} bg-white p-5`}>
            <div className="relative h-20 w-full mb-3">
              <Image src={t.icon} alt={t.label} fill sizes="40vw" />
            </div>
            <h3 className="text-lg text-ocean">{t.label}</h3>
            <p className="mt-1 text-sm text-ocean/70">{t.blurb}</p>
            <div className="mt-4">
              <Link href={t.href} className="rounded bg-ocean px-3 py-2 text-white">Open</Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-ocean/10 bg-white p-6">
        <h2 className="text-xl text-ocean">{current.label}</h2>
        <p className="mt-2 text-ocean/70">{current.blurb}</p>
        {active !== 'invest' && (
          <div className="mt-4">
            <Link href={current.href} className="rounded border border-ocean px-4 py-2 text-ocean">Go to {current.label}</Link>
          </div>
        )}
        {active === 'invest' && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-ocean/70">{loadingPlans ? 'Loading plans...' : `${plans.length} plans available`}</span>
              <button onClick={loadPlans} className="rounded border border-ocean px-3 py-1 text-ocean">Refresh</button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.id} className={`rounded-lg border ${selected === p.id ? 'border-gold' : 'border-gold/30'} bg-white p-5`}>
                  <h3 className="text-lg font-['Playfair Display'] text-ocean">{p.name}</h3>
                  <p className="mt-1 text-ocean/70">{p.daysPerMonth} days/month • Lock-in {p.lockIn} months</p>
                  <p className="mt-1 text-ocean/70">Price: ৳ {p.price} • Suite: {p.suiteId ?? '—'}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setSelected(p.id)}
                      className={`rounded px-3 py-2 ${selected === p.id ? 'bg-gold text-white' : 'bg-ocean text-white'}`}
                    >
                      {selected === p.id ? 'Selected' : 'Select'}
                    </button>
                    <Link href="/investment-plans" className="rounded border border-ocean px-3 py-2 text-ocean">Details</Link>
                  </div>
                </div>
              ))}
              {plans.length === 0 && !loadingPlans && (
                <div className="rounded border border-ocean/10 p-4 text-ocean/70">No plans found</div>
              )}
            </div>
            {selected && (
              <div className="mt-6 flex items-center justify-between rounded border border-gold/30 bg-white p-4">
                <span className="text-ocean">Selected Plan: {selected}</span>
                <div className="flex gap-2">
                  <Link href="/investment-plans" className="rounded bg-ocean px-4 py-2 text-white">Proceed</Link>
                  <button onClick={() => setSelected('')} className="rounded border border-ocean px-4 py-2 text-ocean">Clear</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

