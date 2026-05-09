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
              <div key={p.id} className={`rounded-lg border overflow-hidden flex flex-col ${theme.card}`}>
                {(suite.planImage || suite.layoutImage) && (
                  <div className="relative w-full bg-ocean/5 border-b border-ocean/10 flex items-center justify-center h-48 sm:h-56 p-2 gap-2">
                    {suite.planImage && (
                      <div 
                        className={`relative flex items-center justify-center h-full ${suite.layoutImage ? 'w-1/2' : 'w-full'} cursor-pointer group`}
                        onClick={() => setFullscreenImage(suite.planImage)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={suite.planImage} alt={`Architectural Plan for ${suite.id}`} className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-ocean/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <svg className="w-8 h-8 text-ocean drop-shadow-sm bg-white/80 rounded-full p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                        </div>
                      </div>
                    )}
                    {suite.layoutImage && (
                      <div 
                        className={`relative flex items-center justify-center h-full ${suite.planImage ? 'w-1/2' : 'w-full'} cursor-pointer group`}
                        onClick={() => setFullscreenImage(suite.layoutImage)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={suite.layoutImage} alt={`Layout Plan for ${suite.id}`} className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-ocean/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <svg className="w-8 h-8 text-ocean drop-shadow-sm bg-white/80 rounded-full p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                        </div>
                      </div>
                    )}
                    {suite.viewImages && suite.viewImages.length > 0 && (
                      <button
                        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-ocean text-sm px-3 py-1.5 rounded-full shadow-md hover:bg-ocean hover:text-white transition-colors flex items-center gap-1.5 font-medium z-10 border border-ocean/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryImages(suite.viewImages);
                          setGalleryIndex(0);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {suite.viewImages.length} Views
                      </button>
                    )}
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
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
                  <div className="mt-auto pt-4">
                    <p className="text-ocean/70 mb-3">Price: <span className="text-ocean">৳ {p.price}</span></p>
                    <div className="flex gap-2">
                      <Link href={`/pricing/plans/${p.id}`} className="rounded bg-ocean px-4 py-2 text-white">
                        View Details
                      </Link>
                      <Link href={`/investment-plans`} className="rounded border border-ocean px-4 py-2 text-ocean">
                        Proceed
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ))}
        {plans.length === 0 && !loading && <div className="rounded border border-ocean/10 p-4 text-ocean/70">No unsold plans available</div>}
      </div>

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
