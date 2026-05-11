'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function FeaturesGrid() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/cms/features', { cache: 'no-store' })
      .then((r) => r.json())
      .then((urls: string[]) => {
        setItems(Array.isArray(urls) ? urls : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {items.map((item) => {
        const src = item.startsWith('/') ? item : `/features/${item}`;
        const fileName = (item.split('/').pop() || item).replace(/\.[^.]+$/, '');
        return (
        <div key={item} className="rounded-lg border border-gold/30 bg-white p-4 hover:shadow-md transition-shadow">
          <div className="relative h-40 md:h-56 w-full mb-3 bg-pearl">
            <Image
              src={src}
              alt={fileName.replace(/[-_]/g, ' ')}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-contain object-center"
              priority={false}
            />
          </div>
          <span className="text-ocean">{fileName.replace(/[-_]/g, ' ')}</span>
        </div>
      );})}
      {items.length === 0 && !loading && (
        <div className="rounded border border-ocean/10 p-4 text-ocean/70">No features images found</div>
      )}
      {loading && <div className="rounded border border-ocean/10 p-4 text-ocean/70">Loading features...</div>}
    </div>
  );
}

