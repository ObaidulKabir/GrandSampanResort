'use client';

import { useMemo, useState } from 'react';
import { normalizeCategory, stripHtml, type FaqEntry } from '@/lib/faqContent';

function matches(entry: FaqEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${entry.question} ${stripHtml(entry.answerHtml)} ${normalizeCategory(entry.category)}`.toLowerCase();
  return haystack.includes(q);
}

export default function FaqClient({ items }: { items: FaqEntry[] }) {
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      const normalized = normalizeCategory(item.category);
      map.set(normalized.toLowerCase(), normalized);
    }
    return ['All', ...Array.from(map.values()).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'All');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items
      .filter((item) => matches(item, query))
      .filter((item) => (activeCategory === 'All' ? true : normalizeCategory(item.category) === activeCategory))
      .sort((a, b) => normalizeCategory(a.category).localeCompare(normalizeCategory(b.category)) || a.sortOrder - b.sortOrder);
  }, [items, query, activeCategory]);

  const grouped = useMemo(() => {
    const groups = new Map<string, FaqEntry[]>();
    for (const item of filtered) {
      const cat = normalizeCategory(item.category);
      const list = groups.get(cat) || [];
      list.push(item);
      groups.set(cat, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <div className="rounded-2xl border border-gold/25 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label htmlFor="faq-search" className="block text-sm text-ocean">
              Search questions
            </label>
            <input
              id="faq-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-2 w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
              placeholder="Type keywords (e.g., booking, investment, payment)"
            />
          </div>
          <div>
            <label htmlFor="faq-category" className="block text-sm text-ocean">
              Category
            </label>
            <select
              id="faq-category"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="mt-2 w-full rounded border border-ocean/20 bg-white p-3 text-ocean"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {grouped.map(([category, entries]) => (
          <section key={category} aria-label={category}>
            <h2 className="font-['Playfair Display'] text-3xl text-ocean">{category}</h2>
            <div className="mt-4 divide-y divide-ocean/10 overflow-hidden rounded-2xl border border-gold/25 bg-white">
              {entries.map((entry) => {
                const isOpen = openId === entry.id;
                const buttonId = `faq-q-${entry.id}`;
                const panelId = `faq-a-${entry.id}`;
                return (
                  <div key={entry.id} className="p-0">
                    <button
                      id={buttonId}
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-ocean focus:outline-none focus:ring-2 focus:ring-ocean/40"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenId(isOpen ? null : entry.id)}
                    >
                      <span className="text-lg font-semibold">{entry.question}</span>
                      <span className="text-ocean/60">{isOpen ? '−' : '+'}</span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={isOpen ? 'px-6 pb-6' : 'hidden'}
                    >
                      <div
                        className="prose prose-sm max-w-none text-ocean/80 prose-p:text-ocean/80 prose-li:text-ocean/80"
                        dangerouslySetInnerHTML={{ __html: entry.answerHtml }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ocean/20 bg-white p-10 text-center text-ocean/70">
            No matching questions found.
          </div>
        )}
      </div>
    </div>
  );
}

