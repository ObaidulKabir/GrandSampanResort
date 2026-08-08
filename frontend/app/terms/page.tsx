'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type TermsItem = { id: string; title: string; body: string };

export default function TermsPage() {
  const [items, setItems] = useState<TermsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/terms')
      .then((json) => setItems(Array.isArray(json?.items) ? json.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Legal</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Terms &amp; Conditions</h1>
      <p className="mt-4 text-ocean/80">
        These terms govern the use of Unitech Grand Sampan Resort services, bookings, and investor participation.
      </p>

      {loading && <p className="mt-8 text-sm text-ocean/60">Loading...</p>}
      {!loading && items.length === 0 && (
        <p className="mt-8 border border-dashed border-ocean/20 p-6 text-sm text-ocean/60">
          Terms content is not published yet.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {items.map((item) => (
          <section key={item.id}>
            <h2 className="font-display text-2xl text-ocean">{item.title}</h2>
            <div className="mt-2 whitespace-pre-line text-ocean/80">{item.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
