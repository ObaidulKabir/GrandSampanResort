'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import {
  annualReturnRange,
  DEFAULT_RETURN_ASSUMPTIONS,
  normalizeReturnAssumptions,
  type ReturnAssumptions
} from '@/lib/returns';
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

const CATEGORY_ORDER = ['Standard', 'Delux', 'Premium'];
const PREVIEW_DAYS = [3, 5, 30];
const PREVIEW_SIZES = [250, 300, 400];

export default function AdminPolicyPage() {
  const [policy, setPolicy] = useState<RevenuePolicy>({ taxRate: 0.1, serviceChargeRate: 0.05, maintenanceReserveRate: 0.05 });
  const [assumptions, setAssumptions] = useState<ReturnAssumptions>(DEFAULT_RETURN_ASSUMPTIONS);
  const [previewCategory, setPreviewCategory] = useState('Standard');
  const [previewSize, setPreviewSize] = useState(300);
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
      if (returnsJson) {
        const normalized = normalizeReturnAssumptions(returnsJson);
        setAssumptions(normalized);
        setPreviewSize(normalized.referenceSqFt);
      }
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
        if (json.returnAssumptions) setAssumptions(normalizeReturnAssumptions(json.returnAssumptions));
        setOk('Return assumptions saved. Plan cards now use category + sq ft for expected returns.');
      } else {
        setError('Failed to save return assumptions');
      }
    } catch {
      setError('Failed to save return assumptions');
    }
    setSavingReturns(false);
  }

  function setCategoryAdr(category: string, field: 'adrLow' | 'adrHigh', value: number) {
    setAssumptions((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          adrLow: prev.categories[category]?.adrLow ?? 0,
          adrHigh: prev.categories[category]?.adrHigh ?? 0,
          [field]: value
        }
      }
    }));
  }

  const investorShare = 1 - (policy.taxRate + policy.serviceChargeRate + policy.maintenanceReserveRate);

  const previewSuite = useMemo(
    () => ({ type: previewCategory, size: previewSize }),
    [previewCategory, previewSize]
  );

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
        ADR varies by category and scales with suite size. Effective ADR = category ADR × (suite sq ft ÷
        reference sq ft). Annual return = ADR × days/month × occupancy × (1 − operating cost) × 12.
      </p>

      <form onSubmit={saveReturns} className="mt-6 space-y-5 border border-ocean/10 bg-white p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ocean">
            Reference size (sq ft)
            <input
              type="number"
              min={1}
              step={1}
              value={assumptions.referenceSqFt}
              onChange={(e) => setAssumptions({ ...assumptions, referenceSqFt: Number(e.target.value) || 1 })}
              className="field mt-1"
            />
            <span className="mt-1 block text-xs font-normal text-ocean/60">
              Category ADR values below are for a suite of this size; larger/smaller units scale proportionally.
            </span>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Operating cost (%)
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={assumptions.operatingCostPct}
              onChange={(e) => setAssumptions({ ...assumptions, operatingCostPct: Number(e.target.value) })}
              className="field mt-1"
            />
            <span className="mt-1 block text-xs font-normal text-ocean/60">Deducted from gross rental revenue</span>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Occupancy — lower bound (%)
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={assumptions.occupancyLowPct}
              onChange={(e) => setAssumptions({ ...assumptions, occupancyLowPct: Number(e.target.value) })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Occupancy — upper bound (%)
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={assumptions.occupancyHighPct}
              onChange={(e) => setAssumptions({ ...assumptions, occupancyHighPct: Number(e.target.value) })}
              className="field mt-1"
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-semibold text-ocean">ADR by category (at reference size)</p>
          <p className="mt-1 text-xs text-ocean/60">Average daily rate band in BDT for each suite category.</p>
          <div className="mt-3 space-y-3">
            {CATEGORY_ORDER.map((cat) => {
              const rates = assumptions.categories[cat] || { adrLow: 0, adrHigh: 0 };
              return (
                <div key={cat} className="grid grid-cols-1 gap-3 border border-ocean/10 bg-pearl p-4 sm:grid-cols-3">
                  <div className="flex items-center font-semibold text-ocean">{cat}</div>
                  <label className="block text-sm text-ocean">
                    ADR low
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={rates.adrLow}
                      onChange={(e) => setCategoryAdr(cat, 'adrLow', Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="block text-sm text-ocean">
                    ADR high
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={rates.adrHigh}
                      onChange={(e) => setCategoryAdr(cat, 'adrHigh', Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-ocean/10 bg-pearl p-4">
          <p className="text-sm font-semibold text-ocean">Live preview — what buyers will see</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-ocean">
              Preview category
              <select
                value={previewCategory}
                onChange={(e) => setPreviewCategory(e.target.value)}
                className="field mt-1"
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-ocean">
              Preview size (sq ft)
              <select
                value={String(previewSize)}
                onChange={(e) => setPreviewSize(Number(e.target.value))}
                className="field mt-1"
              >
                {[assumptions.referenceSqFt, ...PREVIEW_SIZES]
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .sort((a, b) => a - b)
                  .map((s) => (
                    <option key={s} value={s}>
                      {s} sq ft
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PREVIEW_DAYS.map((days) => {
              const r = annualReturnRange(days, assumptions, previewSuite);
              return (
                <div key={days} className="border border-ocean/10 bg-white px-3 py-2">
                  <p className="text-xs text-ocean/60">
                    {days === 30 ? 'Full month (30 days)' : `${days} days/month`}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ocean">
                    {r ? `${formatMoney(r.low, 0)} – ${formatMoney(r.high, 0)}` : '—'}
                  </p>
                  <p className="text-[11px] text-ocean/55">
                    per year · ADR {r ? `${formatMoney(r.adrLow, 0)}–${formatMoney(r.adrHigh, 0)}` : '—'}
                  </p>
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

      <PaymentPlanPolicyBlock />
    </main>
  );
}

function PaymentPlanPolicyBlock() {
  const [policy, setPolicy] = useState<any>(null);
  const [resolved, setResolved] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await api('/payment-plans/policy');
      if (res?.ok) {
        setPolicy(res.policy);
        setResolved(res.resolved || []);
      }
    })();
  }, []);

  async function save() {
    if (!policy) return;
    setSaving(true);
    setMsg('');
    const res = await api('/payment-plans/policy', { method: 'PUT', body: JSON.stringify(policy) });
    if (res?.ok) {
      setPolicy(res.policy);
      setResolved(res.resolved || []);
      setMsg('Payment plan policy saved. New quotes use these rates.');
    } else {
      setMsg(res?.error || 'Save failed');
    }
    setSaving(false);
  }

  function updateTier(i: number, patch: Record<string, unknown>) {
    setPolicy((p: any) => {
      const tiers = [...(p.tiers || [])];
      tiers[i] = { ...tiers[i], ...patch };
      return { ...p, tiers };
    });
  }

  if (!policy) return null;

  return (
    <section className="mt-10 border border-ocean/10 bg-white p-6">
      <h2 className="font-display text-2xl text-ocean">Advance payment discounts</h2>
      <p className="mt-1 text-sm text-ocean/65">
        Fair discount is the present value of paying earlier at the rate below. Offered can differ if you set an override.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-ocean">
          Discount rate (nominal % / year)
          <input
            className="field mt-1"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={policy.discountRateAnnualPct}
            onChange={(e) => setPolicy({ ...policy, discountRateAnnualPct: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm text-ocean">
          Compounding / year
          <input
            className="field mt-1"
            type="number"
            min={1}
            max={12}
            value={policy.compoundingPerYear}
            onChange={(e) => setPolicy({ ...policy, compoundingPerYear: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-end gap-2 text-sm text-ocean pb-2">
          <input
            type="checkbox"
            checked={policy.enabled !== false}
            onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="text-sm text-ocean">
          Downpayment %
          <input
            className="field mt-1"
            type="number"
            min={0}
            max={100}
            value={policy.downpaymentPct}
            onChange={(e) => setPolicy({ ...policy, downpaymentPct: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm text-ocean">
          Downpayment after (months)
          <input
            className="field mt-1"
            type="number"
            min={0}
            max={24}
            value={policy.downpaymentAfterMonths}
            onChange={(e) => setPolicy({ ...policy, downpaymentAfterMonths: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm text-ocean">
          Tenors (comma-separated)
          <input
            className="field mt-1"
            value={(policy.tenors || []).join(', ')}
            onChange={(e) =>
              setPolicy({
                ...policy,
                tenors: e.target.value
                  .split(',')
                  .map((n) => Number(n.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0)
              })
            }
          />
        </label>
        <label className="text-sm text-ocean">
          Quote lifetime (minutes)
          <input
            className="field mt-1"
            type="number"
            min={5}
            max={1440}
            value={policy.quoteTtlMinutes}
            onChange={(e) => setPolicy({ ...policy, quoteTtlMinutes: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ocean">
        <input
          type="checkbox"
          checked={policy.tenorPricing === 'pv'}
          onChange={(e) => setPolicy({ ...policy, tenorPricing: e.target.checked ? 'pv' : 'neutral' })}
        />
        Price 36-month tenor by present value (off = same total as 24 months)
      </label>
      <div className="mt-4 overflow-x-auto border border-ocean/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ocean/10 bg-pearl text-xs uppercase tracking-wide text-ocean/60">
            <tr>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Upfront %</th>
              <th className="px-3 py-2">Override %</th>
              <th className="px-3 py-2">Fair</th>
              <th className="px-3 py-2">Offered</th>
            </tr>
          </thead>
          <tbody>
            {(policy.tiers || []).map((t: any, i: number) => {
              const r = resolved.find((x) => x.id === t.id);
              return (
                <tr key={t.id || i} className="border-b border-ocean/10">
                  <td className="px-3 py-2">
                    <input
                      className="field"
                      value={t.label}
                      onChange={(e) => updateTier(i, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 w-24">
                    <input
                      className="field"
                      type="number"
                      min={0}
                      max={100}
                      value={t.upfrontPct}
                      onChange={(e) => updateTier(i, { upfrontPct: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2 w-28">
                    <input
                      className="field"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="PV"
                      value={t.discountPct ?? ''}
                      onChange={(e) =>
                        updateTier(i, { discountPct: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-ocean/70">{r ? `${Number(r.fairDiscountPct).toFixed(2)}%` : '—'}</td>
                  <td className="px-3 py-2 font-semibold text-ocean">
                    {r ? `${Number(r.offeredDiscountPct).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save payment policy'}
        </Button>
        {msg && <span className="text-sm text-ocean/65">{msg}</span>}
      </div>
    </section>
  );
}
