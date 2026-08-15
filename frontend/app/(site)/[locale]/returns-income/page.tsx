'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/format';

export default function ReturnsIncomePage() {
  const t = useTranslations('returnsIncome');
  const [planDays, setPlanDays] = useState(3);
  const [occupancy, setOccupancy] = useState(0.6);
  const [adr, setAdr] = useState(120);

  const result = useMemo(() => {
    const totalDays = 30;
    const rentableDays = Math.max(totalDays - planDays, 0);
    const grossRevenue = adr * rentableDays * occupancy;
    const investorShare = grossRevenue * 0.6;
    return { rentableDays, grossRevenue, investorShare };
  }, [planDays, occupancy, adr]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">{t('title')}</h1>
      <p className="mt-3 text-ocean/80">{t('intro')}</p>

      <div className="mt-8 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <label className="block">
            <span className="text-ocean">{t('planUsage', { days: planDays })}</span>
            <input
              type="range"
              min={0}
              max={30}
              value={planDays}
              onChange={(e) => setPlanDays(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="text-ocean">{t('occupancy', { pct: (occupancy * 100).toFixed(0) })}</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={occupancy}
              onChange={(e) => setOccupancy(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="text-ocean">{t('adr', { amount: formatMoney(adr) })}</span>
            <input
              type="range"
              min={60}
              max={300}
              step={5}
              value={adr}
              onChange={(e) => setAdr(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-6">
          <h2 className="font-['Playfair Display'] text-2xl text-ocean">{t('expectedTitle')}</h2>
          <ul className="mt-4 space-y-2 text-ocean/80">
            <li>{t('rentableDays', { days: result.rentableDays })}</li>
            <li>{t('grossRevenue', { amount: formatMoney(result.grossRevenue) })}</li>
            <li>{t('investorShare', { amount: formatMoney(result.investorShare) })}</li>
          </ul>
          <p className="mt-4 text-xs text-ocean/60">{t('disclaimer')}</p>
        </div>
      </div>
    </main>
  );
}
