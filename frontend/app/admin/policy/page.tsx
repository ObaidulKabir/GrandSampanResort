'use client';
import { useEffect, useState } from 'react';

type RevenuePolicy = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

export default function AdminPolicyPage() {
  const [policy, setPolicy] = useState<RevenuePolicy>({ taxRate: 0.1, serviceChargeRate: 0.05, maintenanceReserveRate: 0.05 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    setOk('');
    try {
      const res = await fetch('http://localhost:4000/settings/revenue-policy');
      const json = await res.json();
      setPolicy(json);
    } catch {
      setError('Failed to load policy');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    try {
      const res = await fetch('http://localhost:4000/settings/revenue-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin' },
        body: JSON.stringify(policy)
      });
      const json = await res.json();
      if (json?.ok) setOk('Saved');
      else setError('Failed to save');
    } catch {
      setError('Failed to save');
    }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Revenue Policy</h1>
      <p className="mt-2 text-ocean/80">Configure global rates used to compute distributable revenue.</p>
      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {ok && <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">{ok}</div>}
      <form onSubmit={save} className="mt-6 space-y-4 rounded border border-gold/30 bg-white p-6">
        <div>
          <label className="block text-sm text-ocean">Tax Rate</label>
          <input
            type="number"
            step="0.01"
            value={policy.taxRate}
            onChange={(e) => setPolicy({ ...policy, taxRate: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm text-ocean">Service Charge Rate</label>
          <input
            type="number"
            step="0.01"
            value={policy.serviceChargeRate}
            onChange={(e) => setPolicy({ ...policy, serviceChargeRate: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm text-ocean">Maintenance Reserve Rate</label>
          <input
            type="number"
            step="0.01"
            value={policy.maintenanceReserveRate}
            onChange={(e) => setPolicy({ ...policy, maintenanceReserveRate: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
          />
        </div>
        <div className="pt-2">
          <button type="submit" disabled={saving} className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
          <button type="button" onClick={load} className="ml-2 rounded border border-ocean px-4 py-2 text-ocean">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </form>
    </main>
  );
}

