'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { annualReturnRange, type ReturnAssumptions } from '@/lib/returns';
import Button from '@/components/Button';

type RevenuePolicy = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

const fields: { key: keyof RevenuePolicy; label: string; hint: string }[] = [
  { key: 'taxRate', label: 'Tax rate', hint: 'e.g. 0.10 = 10% deducted before distribution' },
  { key: 'serviceChargeRate', label: 'Service charge rate', hint: 'Operator service charge share' },
  { key: 'maintenanceReserveRate', label: 'Maintenance reserve rate', hint: 'Held back for upkeep' }
];

const returnFields: { key: keyof ReturnAssumptions; label: string; hint: string }[] = [
  { key: 'adrLow', label: 'ADR — lower bound (BDT)', hint: 'Conservative average daily room rate' },
  { key: 'adrHigh', label: 'ADR — upper bound (BDT)', hint: 'Optimistic average daily room rate' },
  { key: 'occupancyLowPct', label: 'Occupancy — lower bound (%)', hint: 'Conservative occupancy, 0–100' },
  { key: 'occupancyHighPct', label: 'Occupancy — upper bound (%)', hint: 'Optimistic occupancy, 0–100' },
  { key: 'operatingCostPct', label: 'Operating cost (%)', hint: 'Deducted from gross rental revenue' }
];

const PREVIEW_DAYS = [3, 5, 30];

export default function AdminPolicyPage() {
  const [policy, setPolicy] = useState<RevenuePolicy>({ taxRate: 0.1, serviceChargeRate: 0.05, maintenanceReserveRate: 0.05 });
  const [assumptions, setAssumptions] = useState<ReturnAssumptions>({
    adrLow: 6000,
    adrHigh: 10000,
    occupancyLowPct: 50,
    occupancyHighPct: 75,
    operatingCostPct: 15
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingReturns, setSavingReturns] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    setOk('');
    try {
      const [policyJson, returnsJson] = await Promise.all([
        api('/settings/revenue-policy'),
        api('/settings/return-assumptions')
      ]);
      if (policyJson) setPolicy(policyJson);
      if (returnsJson) setAssumptions(returnsJson);
    } catch {
      setError('Failed to load settings');
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
        body: JSON.stringify(policy)
      });
      if (json?.ok) setOk('Policy saved. New rates apply to future revenue calculations.');
      else setError('Failed to save');
    } catch {
      setError('Failed to save');
    }
    setSaving(false);
  }

  async function saveReturns(e: React.FormEvent) {
    e.preventDefault();
    setSavingReturns(true);
    setError('');
    setOk('');
    try {
      const json = await api('/settings/return-assumptions', {
        method: 'PUT',
        body: JSON.stringify(assumptions)
      });
      if (json?.ok) {
        if (json.returnAssumptions) setAssumptions(json.returnAssumptions);
        setOk('Return assumptions saved. Plan cards now show the updated expected-return range.');
      } else {
        setError('Failed to save return assumptions');
      }
    } catch {
      setError('Failed to save return assumptions');
    }
    setSavingReturns(false);
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

      <h2 className="font-display mt-10 text-3xl text-ocean">Expected return assumptions</h2>
      <p className="mt-2 text-ocean/75">
        These bounds drive the “Expected return / year” range buyers see on every plan card. Annual return =
        ADR × days/month × occupancy × (1 − operating cost) × 12.
      </p>

      <form onSubmit={saveReturns} className="mt-6 space-y-5 border border-ocean/10 bg-white p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {returnFields.map((f) => (
            <label key={f.key} className="block text-sm font-medium text-ocean">
              {f.label}
              <input
                type="number"
                min={0}
                step={f.key.startsWith('adr') ? 100 : 1}
                max={f.key.startsWith('adr') ? undefined : 100}
                value={assumptions[f.key]}
                onChange={(e) => setAssumptions({ ...assumptions, [f.key]: Number(e.target.value) })}
                className="field mt-1"
              />
              <span className="mt-1 block text-xs font-normal text-ocean/60">{f.hint}</span>
            </label>
          ))}
        </div>

        <div className="border border-ocean/10 bg-pearl p-4">
          <p className="text-sm font-semibold text-ocean">Live preview — what buyers will see</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PREVIEW_DAYS.map((days) => {
              const r = annualReturnRange(days, assumptions);
              return (
                <div key={days} className="border border-ocean/10 bg-white px-3 py-2">
                  <p className="text-xs text-ocean/60">{days === 30 ? 'Full month (30 days)' : `${days} days/month`}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ocean">
                    {r ? `${formatMoney(r.low, 0)} – ${formatMoney(r.high, 0)}` : '—'}
                  </p>
                  <p className="text-[11px] text-ocean/55">per year</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-ocean/10 pt-5">
          <Button type="submit" disabled={savingReturns}>
            {savingReturns ? 'Saving...' : 'Save return assumptions'}
          </Button>
          <Button type="button" variant="outline" onClick={load}>
            {loading ? 'Refreshing...' : 'Reset'}
          </Button>
        </div>
      </form>
    </main>
  );
}
