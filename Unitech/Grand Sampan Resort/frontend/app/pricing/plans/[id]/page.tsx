'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';

type Plan = { id: string; name: string; daysPerMonth: number; lockIn?: number; price: number; suiteId?: string; planType?: string; timeFraction?: number; planStatus?: string };
type Suite = { id: string; type: string; view: string; floor: number; size: number; planImage?: string; layoutImage?: string; viewImages?: string[] };
type Rule = { start: string; end: string; price: number };

export default function PlanDetailsPage({ params }: { params: { id: string } }) {
  const planId = params.id;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenImage && galleryImages.length === 0) return;
      
      if (e.key === 'Escape') {
        setFullscreenImage(null);
        setGalleryImages([]);
      }
      if (e.key === 'ArrowRight' && galleryImages.length > 1) {
        setGalleryIndex((prev) => (prev + 1) % galleryImages.length);
      }
      if (e.key === 'ArrowLeft' && galleryImages.length > 1) {
        setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, galleryImages]);

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
        const p = pRes?.plan ?? pRes ?? null;
        if (p) {
          setPlan(p);
          if (p.suiteId) {
            const sRes = await api(`/suites/${p.suiteId}`);
            setSuite(sRes?.suite ?? sRes ?? null);
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
          {/* Basic Suite Info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative h-10 w-10">
              <Image src="/images/icons/balcony.svg" alt="Suite" fill sizes="40px" />
            </div>
            <div>
              <div className="text-ocean font-medium">{suite?.type} • {suite?.view} View</div>
              <div className="text-ocean/70 text-sm">Floor {suite?.floor} • {suite?.size} sq ft</div>
            </div>
          </div>

          {/* Architectural Suite Plan & Layout Plan Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-ocean/10 pt-6 mb-8">
            
            {/* Architectural Suite Plan (Portrait) */}
            {suite?.planImage && (
              <div className="flex flex-col">
                <h3 className="font-['Playfair Display'] text-xl text-ocean mb-4">Architectural Suite Plan</h3>
                <div 
                  className="relative w-full aspect-[3/4] max-h-[800px] rounded-lg overflow-hidden bg-ocean/5 border border-ocean/10 cursor-pointer group"
                  onClick={() => setFullscreenImage(suite.planImage!)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={suite.planImage} alt={`Architectural Plan for ${suite.id}`} className="object-contain w-full h-full p-2 transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-ocean/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <svg className="w-10 h-10 text-ocean drop-shadow-sm bg-white/80 rounded-full p-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Plan (Landscape) */}
            {suite?.layoutImage && (
              <div className="flex flex-col">
                <h3 className="font-['Playfair Display'] text-xl text-ocean mb-4">Floor Location (Layout Plan)</h3>
                <div 
                  className="relative w-full aspect-video rounded-lg overflow-hidden bg-ocean/5 border border-ocean/10 cursor-pointer group"
                  onClick={() => setFullscreenImage(suite.layoutImage!)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={suite.layoutImage} alt={`Layout for ${suite.id}`} className="object-contain w-full h-full p-2 transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-ocean/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <svg className="w-10 h-10 text-ocean drop-shadow-sm bg-white/80 rounded-full p-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unit Views Gallery */}
          {suite?.viewImages && suite.viewImages.length > 0 && (
            <div className="mb-8 border-t border-ocean/10 pt-6">
              <h3 className="font-['Playfair Display'] text-xl text-ocean mb-4">Suite Views</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {suite.viewImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="relative w-full h-48 bg-ocean/5 border border-ocean/10 rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => {
                      setGalleryImages(suite.viewImages!);
                      setGalleryIndex(idx);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`View ${idx + 1} for ${suite.id}`} className="object-cover w-full h-full hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-ocean/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-8 h-8 text-ocean drop-shadow-sm bg-white/80 rounded-full p-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Fullscreen Image Modal */}
      {(fullscreenImage || galleryImages.length > 0) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8 transition-opacity"
          onClick={() => { setFullscreenImage(null); setGalleryImages([]); }}
        >
          {/* Close Button */}
          <button 
            className="absolute top-4 right-4 text-white hover:text-gold p-2 bg-black/50 rounded-full transition-colors z-50"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); setGalleryImages([]); }}
            aria-label="Close fullscreen view"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Navigation Buttons (for Gallery) */}
          {galleryImages.length > 1 && (
            <>
              <button 
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 text-white hover:text-gold p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button 
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 text-white hover:text-gold p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIndex((prev) => (prev + 1) % galleryImages.length);
                }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Gallery Counter */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 bg-black/50 px-4 py-1.5 rounded-full text-sm z-50">
                {galleryIndex + 1} / {galleryImages.length}
              </div>
            </>
          )}

          <div 
            className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={fullscreenImage || galleryImages[galleryIndex]} 
              alt="Fullscreen View" 
              className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl transition-all duration-300" 
            />
          </div>
        </div>
      )}
    </main>
  );
}
