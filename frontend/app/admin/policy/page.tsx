'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/Button';

type RevenuePolicy = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

const adminHeaders = { Authorization: 'Bearer admin' };

const fields: { key: keyof RevenuePolicy; label: string; hint: string }[] = [
  { key: 'taxRate', label: 'Tax rate', hint: 'e.g. 0.10 = 10% deducted before distribution' },
  { key: 'serviceChargeRate', label: 'Service charge rate', hint: 'Operator service charge share' },
  { key: 'maintenanceReserveRate', label: 'Maintenance reserve rate', hint: 'Held back for upkeep' }
];

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
      const json = await api('/settings/revenue-policy');
      if (json) setPolicy(json);
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
      const json = await api('/settings/revenue-policy', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify(policy)
      });
      if (json?.ok) setOk('Policy saved. New rates apply to future revenue calculations.');
      else setError('Failed to save');
    } catch {
      setError('Failed to save');
    }
    setSaving(false);
  }

  const investorShare = 1 - (policy.taxRate + policy.serviceChargeRate + policy.maintenanceReserveRate);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Settings</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Revenue policy</h1>
      <p className="mt-2 text-ocean/75">Global rates used to compute distributable revenue for share holders.</p>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {ok && <div className="mt-4 border border-gold/40 bg-gold/10 p-3 text-ocean">{ok}</div>}

      <form onSubmit={save} className="mt-6 space-y-5 border border-ocean/10 bg-white p-6">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm font-medium text-ocean">
            {f.label}
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={policy[f.key]}
              onChange={(e) => setPolicy({ ...policy, [f.key]: Number(e.target.value) })}
              className="field mt-1"
            />
            <span className="mt-1 block text-xs font-normal text-ocean/60">{f.hint}</span>
          </label>
        ))}
        <div className="border border-ocean/10 bg-pearl px-4 py-3 text-sm text-ocean/80">
          Distributable to investors after deductions:{' '}
          <span className="font-semibold text-ocean">{(investorShare * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-3 border-t border-ocean/10 pt-5">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save policy'}
          </Button>
          <Button type="button" variant="outline" onClick={load}>
            {loading ? 'Refreshing...' : 'Reset'}
          </Button>
        </div>
      </form>
    </main>
  );
}
