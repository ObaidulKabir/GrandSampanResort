'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

type Suite = { id: string; floor: number; type: string; size: number; view: string };

export default function AvailableCards() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSuites() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:4000/suites');
        const json = await res.json();
        const list: Suite[] = Array.isArray(json) ? json : json?.suites ?? [];
        const pick = list.slice(0, 3);
        setSuites(pick);
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 30);
        const avPairs = await Promise.all(
          pick.map(async (s) => {
            const aRes = await fetch(
              `http://localhost:4000/booking/availability?suiteId=${encodeURIComponent(s.id)}&start=${start.toISOString()}&end=${end.toISOString()}`
            );
            const aJson = await aRes.json();
            return [s.id, !!aJson?.available] as const;
          })
        );
        setAvailability(Object.fromEntries(avPairs));
      } catch {
        setSuites([]);
      }
      setLoading(false);
    }
    loadSuites();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {suites.map((s) => {
        const ok = availability[s.id];
        return (
          <div key={s.id} className="rounded-lg border border-gold/30 bg-white p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <Image src="/images/icons/balcony.svg" alt={s.type} fill sizes="40px" />
                </div>
                <div>
                  <div className="text-ocean">{s.type} • {s.view}</div>
                  <div className="text-ocean/70 text-sm">Floor {s.floor} • {s.size} sq ft</div>
                </div>
              </div>
              <span className={`rounded px-2 py-1 text-xs ${ok ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'}`}>
                {ok ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="mt-3 text-sm text-ocean/70">
              {ok ? 'This unit has open dates in the next 30 days.' : 'No open dates found for the next 30 days.'}
            </div>
            <div className="mt-4">
              <a href="/investor" className="rounded bg-ocean px-3 py-2 text-white">View Details</a>
            </div>
          </div>
        );
      })}
      {suites.length === 0 && !loading && (
        <div className="rounded border border-ocean/10 p-4 text-ocean/70">No units to display</div>
      )}
      {loading && <div className="rounded border border-ocean/10 p-4 text-ocean/70">Loading availability...</div>}
    </div>
  );
}

