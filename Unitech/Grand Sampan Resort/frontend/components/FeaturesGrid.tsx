'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function FeaturesGrid() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/features')
      .then((r) => r.json())
      .then((names: string[]) => {
        setItems(Array.isArray(names) ? names : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {items.map((name) => (
        <div key={name} className="rounded-lg border border-gold/30 bg-white p-4 hover:shadow-md transition-shadow">
          <div className="relative h-40 md:h-56 w-full mb-3 bg-pearl">
            <Image
              src={`/features/${name}`}
              alt={name.replace(/[-_]/g, ' ')}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-contain object-center"
              priority={false}
            />
          </div>
          <span className="text-ocean">{name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}</span>
        </div>
      ))}
      {items.length === 0 && !loading && (
        <div className="rounded border border-ocean/10 p-4 text-ocean/70">No features images found</div>
      )}
      {loading && <div className="rounded border border-ocean/10 p-4 text-ocean/70">Loading features...</div>}
    </div>
  );
}

