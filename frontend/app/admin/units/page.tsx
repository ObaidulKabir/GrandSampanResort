'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminUnitsListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/suites');
      const json = await res.json();
      setItems(Array.isArray(json) ? json : json?.suites ?? []);
    } catch {
      setError('Failed to load units');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">Units</h1>
        <div className="flex gap-2">
          <button onClick={load} className="rounded bg-ocean px-4 py-2 text-white">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/admin/units/new" className="rounded border border-ocean px-4 py-2 text-ocean">
            Create Unit
          </Link>
        </div>
      </div>

      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-6 overflow-auto rounded border border-gold/30 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ocean">
              <th className="text-left p-3">Unit ID</th>
              <th className="text-left p-3">Floor</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Size (sq ft)</th>
              <th className="text-left p-3">View</th>
              <th className="text-left p-3">Price (BDT)</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-ocean/10">
                <td className="p-3">{i.id}</td>
                <td className="p-3">{i.floor}</td>
                <td className="p-3">{i.type}</td>
                <td className="p-3">{i.size}</td>
                <td className="p-3">{i.view}</td>
                <td className="p-3">৳ {i.totalPrice}</td>
                <td className="p-3">
                  <Link href={`/admin/units/${i.id}/edit`} className="text-ocean underline">
                    Edit
                  </Link>
                  <span className="mx-2 text-ocean/30">|</span>
                  <Link href={`/admin/units/${i.id}/plans`} className="text-ocean underline">
                    Plans
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="p-3 text-ocean/70" colSpan={6}>
                  No units found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

