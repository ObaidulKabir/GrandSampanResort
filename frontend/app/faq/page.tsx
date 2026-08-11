'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import RichTextContent from '@/components/RichTextContent';

type FaqItem = { id: string; question: string; answer: string };

export default function FAQPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/faq')
      .then((json) => setItems(Array.isArray(json?.items) ? json.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Support</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Frequently Asked Questions</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">
        Answers to common questions about ownership, payments, and the resort.
      </p>

      <div className="mt-8 space-y-6">
        {loading && <div className="text-sm text-ocean/60">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="border border-dashed border-ocean/20 p-6 text-sm text-ocean/60">
            No FAQ entries published yet.
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="border border-gold/30 bg-white p-5">
            <div className="font-display text-xl text-ocean">{item.question}</div>
            <RichTextContent html={item.answer} className="mt-2 text-ocean/80" />
          </div>
        ))}
      </div>
    </main>
  );
}
