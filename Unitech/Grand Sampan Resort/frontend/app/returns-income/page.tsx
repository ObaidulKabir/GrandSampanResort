'use client';
import { useMemo, useState } from 'react';

export default function ReturnsIncomePage() {
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
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Returns & Income</h1>
      <p className="mt-3 text-ocean/80">Illustrative calculator with a 60% investor share and occupancy model.</p>

      <div className="mt-8 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <label className="block">
            <span className="text-ocean">Plan personal usage (days/month): {planDays}</span>
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
            <span className="text-ocean">Occupancy: {(occupancy * 100).toFixed(0)}%</span>
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
            <span className="text-ocean">Average Daily Rate (BDT): {adr}</span>
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
          <h2 className="font-['Playfair Display'] text-2xl text-ocean">Expected Monthly Income</h2>
          <ul className="mt-4 space-y-2 text-ocean/80">
            <li>Rentable days: {result.rentableDays}</li>
            <li>Gross revenue: BDT {result.grossRevenue.toFixed(2)}</li>
            <li>Investor share (60%): BDT {result.investorShare.toFixed(2)}</li>
          </ul>
          <p className="mt-4 text-xs text-ocean/60">Actual earnings depend on ADR, seasonality, fees, and taxes.</p>
        </div>
      </div>
    </main>
  );
}

