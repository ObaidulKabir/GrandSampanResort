'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';

export default function AdminUnitsListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [suitesJson, plansJson] = await Promise.all([api('/suites'), api('/timeshares')]);
      setItems(Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? []);
      setPlans(Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? []);
    } catch {
      setError('Failed to load units');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function planStats(suiteId: string) {
    const forUnit = plans.filter((p) => p.suiteId === suiteId);
    const unsold = forUnit.filter((p) => (p.planStatus || '').toLowerCase() === 'unsold').length;
    return { total: forUnit.length, unsold };
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Inventory</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">Units</h1>
          <p className="mt-2 text-ocean/75">Each unit needs at least one Unsold plan to appear in the buyer catalog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/units/new">
            <Button>Create unit</Button>
          </Link>
          <Button variant="outline" onClick={load}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-6 overflow-auto border border-ocean/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ocean/10 text-left text-ocean/70">
              <th className="p-3 font-medium">Unit</th>
              <th className="p-3 font-medium">Floor</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Size</th>
              <th className="p-3 font-medium">View</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Plans</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const stats = planStats(i.id);
              return (
                <tr key={i.id} className="border-t border-ocean/10">
                  <td className="p-3 font-medium text-ocean">{i.id}</td>
                  <td className="p-3">{i.floor}</td>
                  <td className="p-3">{i.type}</td>
                  <td className="p-3">{i.size} sq ft</td>
                  <td className="p-3">{i.view}</td>
                  <td className="p-3">{formatMoney(i.totalPrice || 0)}</td>
                  <td className="p-3">
                    {stats.total === 0 ? (
                      <span className="inline-block border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        No plans
                      </span>
                    ) : (
                      <span
                        className={`inline-block border px-2 py-0.5 text-xs ${
                          stats.unsold > 0
                            ? 'border-gold/50 bg-gold/10 text-ocean'
                            : 'border-ocean/20 bg-pearl text-ocean/80'
                        }`}
                      >
                        {stats.unsold} on sale / {stats.total}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3 text-xs font-semibold">
                      <Link href={`/admin/units/${i.id}/plans`} className="text-ocean underline">
                        Plans
                      </Link>
                      <Link href={`/admin/units/${i.id}/edit`} className="text-ocean underline">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td className="p-4 text-ocean/70" colSpan={8}>
                  No units yet —{' '}
                  <Link href="/admin/units/new" className="font-semibold text-ocean underline">
                    create the first one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
