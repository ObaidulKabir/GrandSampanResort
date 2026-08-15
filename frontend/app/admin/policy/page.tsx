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
import Badge from '@/components/ui/Badge';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/ToastContext';

type RevenuePolicy = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

const fields: { key: keyof RevenuePolicy; label: string; hint: string }[] = [
  { key: 'taxRate', label: 'Statutory Tax Rate', hint: 'Deducted directly before dividend distribution' },
  { key: 'serviceChargeRate', label: 'Hotel Operator Service Charge', hint: 'Property management & hospitality service share' },
  { key: 'maintenanceReserveRate', label: 'Maintenance & FF&E Reserve Rate', hint: 'Held in escrow for asset maintenance and furniture replacement' }
];

const CATEGORY_ORDER = ['Standard', 'Delux', 'Premium'];
const PREVIEW_DAYS = [3, 5, 30];
const PREVIEW_SIZES = [250, 300, 400];

export default function AdminPolicyPage() {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState('discounts');
  const [policy, setPolicy] = useState<RevenuePolicy>({ taxRate: 0.1, serviceChargeRate: 0.05, maintenanceReserveRate: 0.05 });
  const [assumptions, setAssumptions] = useState<ReturnAssumptions>(DEFAULT_RETURN_ASSUMPTIONS);
  const [previewCategory, setPreviewCategory] = useState('Standard');
  const [previewSize, setPreviewSize] = useState(300);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingReturns, setSavingReturns] = useState(false);

  async function load() {
    setLoading(true);
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
      toastError('Failed to load settings');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const json = await api('/settings/revenue-policy', {
        method: 'PUT',
        body: JSON.stringify(policy)
      });
      if (json?.ok) success('Revenue policy saved! New rates apply to future distribution schedules.');
      else toastError('Failed to save revenue policy');
    } catch {
      toastError('Failed to save revenue policy');
    }
    setSaving(false);
  }

  async function saveReturns(e: React.FormEvent) {
    e.preventDefault();
    setSavingReturns(true);
    try {
      const json = await api('/settings/return-assumptions', {
        method: 'PUT',
        body: JSON.stringify(assumptions)
      });
      if (json?.ok) {
        if (json.returnAssumptions) setAssumptions(normalizeReturnAssumptions(json.returnAssumptions));
        success('Return assumptions saved. Live pricing chips updated.');
      } else {
        toastError('Failed to save return assumptions');
      }
    } catch {
      toastError('Failed to save return assumptions');
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
  const previewSuite = useMemo(() => ({ type: previewCategory, size: previewSize }), [previewCategory, previewSize]);

  const tabs: TabItem[] = [
    { id: 'discounts', label: 'Advance Payment Discounts', icon: <span>⚖️</span> },
    { id: 'returns', label: 'Expected Return Assumptions', icon: <span>📈</span> },
    { id: 'revenue', label: 'Revenue Share Policy', icon: <span>💰</span> }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Badge variant="gold" size="sm" dot>Actuarial &amp; Financial Governance</Badge>
        <h1 className="font-display mt-1 text-2xl font-bold text-ocean sm:text-3xl">
          Yield &amp; Discount Policy Engine
        </h1>
        <p className="mt-1 text-xs text-ocean/65">
          Configure present-value compounding formulas, ADR return assumptions, and operator revenue share splits.
        </p>
      </div>

      <div className="mt-4">
        <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} variant="underline" />
      </div>

      {/* TAB 1: ADVANCE PAYMENT DISCOUNTS */}
      {activeTab === 'discounts' && (
        <PaymentPlanPolicyBlock />
      )}

      {/* TAB 2: RETURN ASSUMPTIONS */}
      {activeTab === 'returns' && (
        <form onSubmit={saveReturns} className="space-y-6 rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-ocean/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ocean">Expected Return Assumptions</h2>
              <p className="text-xs text-ocean/65">
                Effective ADR = category ADR &times; (suite sq ft &divide; reference sq ft).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-semibold text-ocean">
              Reference Suite Size (sq ft)
              <input
                type="number"
                min={1}
                step={1}
                value={assumptions.referenceSqFt}
                onChange={(e) => setAssumptions({ ...assumptions, referenceSqFt: Number(e.target.value) || 1 })}
                className="field mt-1 text-xs"
              />
            </label>
            <label className="block text-xs font-semibold text-ocean">
              Operating Cost (%)
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={assumptions.operatingCostPct}
                onChange={(e) => setAssumptions({ ...assumptions, operatingCostPct: Number(e.target.value) })}
                className="field mt-1 text-xs"
              />
            </label>
            <label className="block text-xs font-semibold text-ocean">
              Occupancy Low Bound (%)
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={assumptions.occupancyLowPct}
                onChange={(e) => setAssumptions({ ...assumptions, occupancyLowPct: Number(e.target.value) })}
                className="field mt-1 text-xs"
              />
            </label>
            <label className="block text-xs font-semibold text-ocean">
              Occupancy High Bound (%)
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={assumptions.occupancyHighPct}
                onChange={(e) => setAssumptions({ ...assumptions, occupancyHighPct: Number(e.target.value) })}
                className="field mt-1 text-xs"
              />
            </label>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ocean/70 mb-3">
              Average Daily Rate (ADR) Band by Suite Tier
            </h3>
            <div className="space-y-3">
              {CATEGORY_ORDER.map((cat) => {
                const rates = assumptions.categories[cat] || { adrLow: 0, adrHigh: 0 };
                return (
                  <div key={cat} className="grid grid-cols-1 gap-3 rounded-lg border border-ocean/10 bg-pearl p-4 sm:grid-cols-3">
                    <div className="flex items-center font-bold text-ocean text-sm">{cat} Suite</div>
                    <label className="block text-xs text-ocean">
                      ADR Low (BDT)
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={rates.adrLow}
                        onChange={(e) => setCategoryAdr(cat, 'adrLow', Number(e.target.value))}
                        className="field mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs text-ocean">
                      ADR High (BDT)
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={rates.adrHigh}
                        onChange={(e) => setCategoryAdr(cat, 'adrHigh', Number(e.target.value))}
                        className="field mt-1 text-xs"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-ocean/70 block">
              Live Buyer Catalog Preview
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PREVIEW_DAYS.map((days) => {
                const r = annualReturnRange(days, assumptions, previewSuite);
                return (
                  <div key={days} className="rounded-lg border border-ocean/10 bg-white p-3.5 shadow-sm">
                    <p className="text-xs text-ocean/60 font-semibold">{days} Days Stay / Month</p>
                    <p className="font-display text-base font-bold text-ocean mt-0.5">
                      {r ? `${formatMoney(r.low, 0)} – ${formatMoney(r.high, 0)}` : '—'}
                    </p>
                    <p className="text-[11px] text-ocean/55">Annual Payout</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={savingReturns} className="text-xs">
              {savingReturns ? 'Saving...' : 'Save Return Assumptions'}
            </Button>
            <Button type="button" variant="outline" onClick={load} className="text-xs">
              Reset
            </Button>
          </div>
        </form>
      )}

      {/* TAB 3: REVENUE POLICY */}
      {activeTab === 'revenue' && (
        <form onSubmit={save} className="space-y-6 rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
          <div className="border-b border-ocean/10 pb-4">
            <h2 className="font-display text-lg font-bold text-ocean">Global Revenue Share Distribution</h2>
            <p className="text-xs text-ocean/65">
              Deductions applied to gross hospitality revenues before investor dividends are credited.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {fields.map((f) => (
              <label key={f.key} className="block text-xs font-semibold text-ocean">
                {f.label}
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={policy[f.key]}
                  onChange={(e) => setPolicy({ ...policy, [f.key]: Number(e.target.value) })}
                  className="field mt-1 text-xs"
                />
                <span className="mt-1 block text-[11px] text-ocean/55 font-normal">{f.hint}</span>
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-900">Net Distributable Share to Investors</p>
                <p className="text-[11px] text-emerald-700">Remainder credited semiannually to share owners</p>
              </div>
              <span className="font-display text-2xl font-bold text-emerald-900">
                {(investorShare * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving} className="text-xs">
              {saving ? 'Saving...' : 'Save Revenue Policy'}
            </Button>
            <Button type="button" variant="outline" onClick={load} className="text-xs">
              Reset
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function PaymentPlanPolicyBlock() {
  const { success, error: toastError } = useToast();
  const [policy, setPolicy] = useState<any>(null);
  const [resolved, setResolved] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

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
    const res = await api('/payment-plans/policy', { method: 'PUT', body: JSON.stringify(policy) });
    if (res?.ok) {
      setPolicy(res.policy);
      setResolved(res.resolved || []);
      success('Payment plan discount policy saved! Live quotes repriced.');
    } else {
      toastError(res?.error || 'Save failed');
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
    <section className="space-y-6 rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-ocean/10 pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ocean">Present Value Compounding &amp; Discount Tiers</h2>
          <p className="text-xs text-ocean/65">
            Fair discount is derived from the resort cost-of-capital rate. Manual overrides take precedence when configured.
          </p>
        </div>
        <Badge variant="gold" size="sm">Actuarial PV Model</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <label className="text-xs font-semibold text-ocean">
          Nominal Discount Rate (% / yr)
          <input
            className="field mt-1 text-xs"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={policy.discountRateAnnualPct}
            onChange={(e) => setPolicy({ ...policy, discountRateAnnualPct: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-semibold text-ocean">
          Compounding Frequency / yr
          <input
            className="field mt-1 text-xs"
            type="number"
            min={1}
            max={12}
            value={policy.compoundingPerYear}
            onChange={(e) => setPolicy({ ...policy, compoundingPerYear: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-semibold text-ocean">
          Downpayment (%)
          <input
            className="field mt-1 text-xs"
            type="number"
            min={0}
            max={100}
            value={policy.downpaymentPct}
            onChange={(e) => setPolicy({ ...policy, downpaymentPct: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-semibold text-ocean">
          Quote Lock TTL (Minutes)
          <input
            className="field mt-1 text-xs"
            type="number"
            min={5}
            max={1440}
            value={policy.quoteTtlMinutes}
            onChange={(e) => setPolicy({ ...policy, quoteTtlMinutes: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Discount Tiers Table */}
      <div className="overflow-hidden rounded-xl border border-ocean/10">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-ocean/10 bg-pearl text-ocean/60 uppercase font-semibold">
            <tr>
              <th className="px-4 py-2.5">Tier Label</th>
              <th className="px-4 py-2.5">Upfront %</th>
              <th className="px-4 py-2.5">Manual Override %</th>
              <th className="px-4 py-2.5">PV Fair Discount</th>
              <th className="px-4 py-2.5">Live Offered %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean/10">
            {(policy.tiers || []).map((t: any, i: number) => {
              const r = resolved.find((x) => x.id === t.id);
              return (
                <tr key={t.id || i} className="hover:bg-pearl/30">
                  <td className="px-4 py-2">
                    <input
                      className="field text-xs py-1"
                      value={t.label}
                      onChange={(e) => updateTier(i, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2 w-28">
                    <input
                      className="field text-xs py-1"
                      type="number"
                      min={0}
                      max={100}
                      value={t.upfrontPct}
                      onChange={(e) => updateTier(i, { upfrontPct: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2 w-32">
                    <input
                      className="field text-xs py-1"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="PV Fair"
                      value={t.discountPct ?? ''}
                      onChange={(e) =>
                        updateTier(i, { discountPct: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-ocean/70">
                    {r ? `${Number(r.fairDiscountPct).toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-4 py-2 font-bold text-ocean font-mono">
                    {r ? `${Number(r.offeredDiscountPct).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" onClick={save} disabled={saving} className="text-xs">
          {saving ? 'Saving…' : 'Save Payment Policy'}
        </Button>
      </div>
    </section>
  );
}
