'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';

type Plan = { id: string; name: string; daysPerMonth: number; lockIn?: number; price: number; suiteId?: string; planType?: string; timeFraction?: number; planStatus?: string };
type Suite = { id: string; type: string; view: string; floor: number; size: number };
type Rule = { start: string; end: string; price: number };

export default function PlanDetailsPage({ params }: { params: { id: string } }) {
  const planId = params.id;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [depositPct, setDepositPct] = useState<number>(10);
  const [downPct, setDownPct] = useState<number>(20);
  const [cadence, setCadence] = useState<'monthly' | 'quarterly'>('monthly');
  const [tab, setTab] = useState<'payment' | 'returns'>('payment');
  const [adr, setAdr] = useState<number>(8000);
  const [occupancy, setOccupancy] = useState<number>(0.6);
  const [costPct, setCostPct] = useState<number>(0.15);
  const [rentUpliftPct, setRentUpliftPct] = useState<number>(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const pRes = await api(`/timeshares/${planId}`);
        const p = pRes || null;
        if (p) {
          setPlan(p);
          if (p.suiteId) {
            const sRes = await api(`/suites/${p.suiteId}`);
            setSuite(sRes || null);
          }
          const rRes = await api(`/pricing/plans/${planId}`);
          setRules(Array.isArray(rRes?.rules) ? rRes.rules : []);
        }
      } catch {
        setError('Failed to load plan details');
      }
      setLoading(false);
    }
    load();
  }, [planId]);

  const schedule = useMemo(() => {
    if (!plan) return [];
    const total = plan.price || 0;
    const deposit = Math.round(total * (depositPct / 100) * 100) / 100;
    const down = Math.round(total * (downPct / 100) * 100) / 100;
    const remainder = Math.round((total - deposit - down) * 100) / 100;
    const durationMonths = plan.lockIn ?? 36;
    const stepMonths = cadence === 'monthly' ? 1 : 3;
    const installments = cadence === 'monthly' ? durationMonths : Math.ceil(durationMonths / 3);
    const baseAmount = Math.floor((remainder / installments) * 100) / 100;
    const start = new Date(startDate);
    const items: { id: string; type: string; dueDate: string; amount: number }[] = [];
    items.push({ id: 'S1', type: 'deposit', dueDate: start.toISOString(), amount: deposit });
    const downDate = new Date(start);
    downDate.setMonth(downDate.getMonth() + 3);
    items.push({ id: 'S2', type: 'downpayment', dueDate: downDate.toISOString(), amount: down });
    let sum = 0;
    for (let i = 1; i <= installments; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + 3 + i * stepMonths);
      const amt = i === installments ? Math.round((remainder - sum) * 100) / 100 : baseAmount;
      sum += amt;
      items.push({ id: 'S-' + i, type: 'installment', dueDate: due.toISOString(), amount: amt });
    }
    return items;
  }, [plan, startDate, depositPct, downPct, cadence]);

  const totals = useMemo(() => {
    const total = plan?.price || 0;
    const paid = 0;
    const outstanding = total;
    return { total, paid, outstanding };
  }, [plan]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair Display'] text-4xl text-ocean">{plan?.name || 'Plan Details'}</h1>
          <p className="mt-2 text-ocean/80">{plan ? `${plan.daysPerMonth} days/month • ${plan.planType || 'DPM'}` : 'Loading...'}</p>
        </div>
        <a href="/investor" className="rounded bg-ocean px-4 py-2 text-white">Proceed to Invest</a>
      </div>
      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab('payment')} className={`rounded px-4 py-2 border ${tab === 'payment' ? 'bg-ocean text-white border-ocean' : 'border-ocean/20 text-ocean'}`}>Payment Plan</button>
        <button onClick={() => setTab('returns')} className={`rounded px-4 py-2 border ${tab === 'returns' ? 'bg-ocean text-white border-ocean' : 'border-ocean/20 text-ocean'}`}>Returns Calculator</button>
      </div>

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Price</div>
          <div className="mt-1 text-2xl text-ocean">৳ {plan?.price || 0}</div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Entitlement</div>
          <div className="mt-1 text-2xl text-ocean">{plan?.daysPerMonth || 0} days/month</div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Time Fraction</div>
          <div className="mt-1 text-2xl text-ocean">{Math.round(((plan?.timeFraction ?? ((plan?.daysPerMonth || 0) / 30)) * 100)) / 100}%</div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white p-4">
          <div className="text-ocean/70 text-sm">Suite</div>
          <div className="mt-1 text-2xl text-ocean">{suite ? `${suite.id}` : '—'}</div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Unit Details</h2>
        <div className="mt-4 rounded-lg border border-gold/30 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image src="/images/icons/balcony.svg" alt="Suite" fill sizes="40px" />
            </div>
            <div>
              <div className="text-ocean">{suite?.type} • {suite?.view}</div>
              <div className="text-ocean/70 text-sm">Floor {suite?.floor} • {suite?.size} sq ft</div>
            </div>
          </div>
        </div>
      </section>

      {tab === 'payment' && (
      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Interactive Payment Calculation</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-ocean">Start Date</label>
            <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Deposit (%)</label>
            <input value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value))} type="number" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Downpayment (%)</label>
            <input value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} type="number" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Cadence</label>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as any)} className="mt-1 w-full rounded border border-ocean/20 px-2 py-1">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gold/30 bg-white p-5 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ocean">
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Due</th>
                <th className="text-left p-2">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((i) => (
                <tr key={i.id} className="border-t border-ocean/10">
                  <td className="p-2">{i.type}</td>
                  <td className="p-2">{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td className="p-2">৳ {i.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-ocean/10">
                <td className="p-2 text-ocean">Total</td>
                <td className="p-2" />
                <td className="p-2 text-ocean">৳ {plan?.price || 0}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      )}

      {tab === 'returns' && (
      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Returns Calculator</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-ocean">Average Daily Rate (BDT)</label>
            <input value={adr} onChange={(e) => setAdr(Number(e.target.value))} type="number" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Occupancy (0–1)</label>
            <input value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} type="number" step="0.01" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Operating Cost (%)</label>
            <input value={costPct} onChange={(e) => setCostPct(Number(e.target.value))} type="number" step="0.01" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Rental Uplift (%)</label>
            <input value={rentUpliftPct} onChange={(e) => setRentUpliftPct(Number(e.target.value))} type="number" step="0.01" className="mt-1 w-full rounded border border-ocean/20 px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-ocean">Days/Month</label>
            <input value={plan?.daysPerMonth || 0} readOnly className="mt-1 w-full rounded border border-ocean/20 px-2 py-1 bg-ocean/5" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gold/30 bg-white p-4">
            <div className="text-ocean/70 text-sm">Monthly Gross</div>
            <div className="mt-1 text-2xl text-ocean">
              ৳ {Math.round((adr * (1 + rentUpliftPct / 100) * (plan?.daysPerMonth || 0) * occupancy) * 100) / 100}
            </div>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-4">
            <div className="text-ocean/70 text-sm">Monthly Net</div>
            <div className="mt-1 text-2xl text-ocean">
              ৳ {(() => {
                const gross = adr * (1 + rentUpliftPct / 100) * (plan?.daysPerMonth || 0) * occupancy;
                return Math.round((gross * (1 - costPct / 100)) * 100) / 100;
              })()}
            </div>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-4">
            <div className="text-ocean/70 text-sm">Annual Net</div>
            <div className="mt-1 text-2xl text-ocean">
              ৳ {(() => {
                const gross = adr * (1 + rentUpliftPct / 100) * (plan?.daysPerMonth || 0) * occupancy;
                const net = gross * (1 - costPct / 100);
                return Math.round((net * 12) * 100) / 100;
              })()}
            </div>
          </div>
          <div className="rounded-lg border border-gold/30 bg-white p-4">
            <div className="text-ocean/70 text-sm">ROI (%)</div>
            <div className="mt-1 text-2xl text-ocean">
              {(() => {
                const gross = adr * (1 + rentUpliftPct / 100) * (plan?.daysPerMonth || 0) * occupancy;
                const net = gross * (1 - costPct / 100);
                const annual = net * 12;
                const price = plan?.price || 1;
                return Math.round(((annual / price) * 100) * 100) / 100;
              })()}%
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-ocean/70">Figures are illustrative and depend on market dynamics, seasonality and policy. Not financial advice.</p>
      </section>
      )}

      {rules.length > 0 && (
        <section className="mt-10">
          <h2 className="font-['Playfair Display'] text-2xl text-ocean">Pricing Rules</h2>
          <div className="mt-4 rounded-lg border border-gold/30 bg-white p-5 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ocean">
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Price (BDT)</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r, idx) => (
                  <tr key={idx} className="border-t border-ocean/10">
                    <td className="p-2">{new Date(r.start).toLocaleDateString()}</td>
                    <td className="p-2">{new Date(r.end).toLocaleDateString()}</td>
                    <td className="p-2">৳ {r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">Actions</h2>
        <div className="mt-3 flex gap-3">
          <a href="/investor" className="rounded bg-ocean px-4 py-2 text-white">Proceed to Invest</a>
          <a href="mailto:info@grandsampan.com" className="rounded border border-ocean px-4 py-2 text-ocean">Contact Sales</a>
        </div>
        <p className="mt-3 text-sm text-ocean/70">Calculations are illustrative. Final amounts may vary with policy, taxes and fees.</p>
      </section>
    </main>
  );
}
