'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { planStatusLabel, suiteTypeLabel, suiteViewLabel } from '@/lib/domainLabels';
import {
  annualReturnRange,
  DEFAULT_RETURN_ASSUMPTIONS,
  effectiveAdrBand,
  normalizeReturnAssumptions,
  projectReturn,
  type ReturnAssumptions
} from '@/lib/returns';
import Button from '@/components/Button';

export type CalcSuite = {
  id: string;
  type?: string;
  size?: number;
  view?: string;
  floor?: number;
};

export type CalcPlan = {
  id: string;
  name?: string;
  suiteId?: string;
  daysPerMonth?: number;
  planStatus?: string;
};

type Props = {
  suite?: CalcSuite | null;
  plan?: CalcPlan | null;
  /** Plan-details page: suite and share days are fixed. */
  locked?: boolean;
  showHeading?: boolean;
  className?: string;
};

const ADR_STEP = 100;

function statusKey(p: CalcPlan) {
  return String(p.planStatus || 'Unsold').toLowerCase().trim();
}

function isUnsold(p: CalcPlan) {
  return statusKey(p) === 'unsold';
}

function sortPlans(list: CalcPlan[]) {
  return [...list].sort((a, b) => {
    const days = Number(a.daysPerMonth || 0) - Number(b.daysPerMonth || 0);
    if (days !== 0) return days;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' });
  });
}

function plansOnSuite(list: CalcPlan[], suiteId: string) {
  return sortPlans(list.filter((p) => p.suiteId === suiteId));
}

function pickPlan(list: CalcPlan[], suiteId: string, preferredId?: string | null) {
  const onSuite = plansOnSuite(list, suiteId);
  if (preferredId) {
    const hit = onSuite.find((p) => p.id === preferredId);
    if (hit) return hit;
  }
  const unsold = onSuite.filter(isUnsold);
  return unsold[0] || onSuite[0] || null;
}

function pickDefaultSuite(suites: CalcSuite[], list: CalcPlan[]) {
  return suites.find((s) => plansOnSuite(list, s.id).some(isUnsold)) || suites[0] || null;
}

function readQuery() {
  if (typeof window === 'undefined') return { suiteId: '', planId: '' };
  const q = new URLSearchParams(window.location.search);
  return { suiteId: (q.get('suite') || '').trim(), planId: (q.get('plan') || '').trim() };
}

function writeQuery(suiteId: string, planId: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (suiteId) url.searchParams.set('suite', suiteId);
  else url.searchParams.delete('suite');
  if (planId) url.searchParams.set('plan', planId);
  else url.searchParams.delete('plan');
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== next) window.history.replaceState(null, '', next);
}

export default function ReturnsCalculator({
  suite = null,
  plan = null,
  locked = false,
  showHeading = false,
  className = ''
}: Props) {
  const t = useTranslations('returnsIncome');
  const tDomain = useTranslations('domain');
  const [assumptions, setAssumptions] = useState<ReturnAssumptions>(DEFAULT_RETURN_ASSUMPTIONS);
  const [suites, setSuites] = useState<CalcSuite[]>([]);
  const [plans, setPlans] = useState<CalcPlan[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState(suite?.id || '');
  const [selectedPlanId, setSelectedPlanId] = useState(plan?.id || '');
  const [loading, setLoading] = useState(!locked);
  const [occupancy, setOccupancy] = useState(() =>
    Math.round((DEFAULT_RETURN_ASSUMPTIONS.occupancyLowPct + DEFAULT_RETURN_ASSUMPTIONS.occupancyHighPct) / 2)
  );
  const [adr, setAdr] = useState(0);

  useEffect(() => {
    api('/settings/return-assumptions')
      .then((raw) => {
        if (raw) setAssumptions(normalizeReturnAssumptions(raw));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (locked) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [suitesJson, plansJson] = await Promise.all([api('/suites'), api('/timeshares')]);
        if (cancelled) return;
        const suitesArr: CalcSuite[] = (Array.isArray(suitesJson) ? suitesJson : suitesJson?.suites ?? [])
          .filter((s: CalcSuite) => s?.id)
          .sort((a: CalcSuite, b: CalcSuite) =>
            String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
          );
        const plansArr: CalcPlan[] = (Array.isArray(plansJson) ? plansJson : plansJson?.plans ?? []).filter(
          (p: CalcPlan) => p?.id && p?.suiteId
        );
        setSuites(suitesArr);
        setPlans(plansArr);

        const q = readQuery();
        let suiteId = q.suiteId;
        let planId = q.planId;
        if (planId) {
          const fromPlan = plansArr.find((p) => p.id === planId);
          if (fromPlan?.suiteId) suiteId = fromPlan.suiteId;
        }
        if (!suiteId || !suitesArr.some((s) => s.id === suiteId)) {
          suiteId = pickDefaultSuite(suitesArr, plansArr)?.id || '';
        }
        const nextPlan = suiteId ? pickPlan(plansArr, suiteId, planId) : null;
        setSelectedSuiteId(suiteId);
        setSelectedPlanId(nextPlan?.id || '');
        writeQuery(suiteId, nextPlan?.id || '');
      } catch {
        if (!cancelled) {
          setSuites([]);
          setPlans([]);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locked]);

  const activeSuite = locked ? suite : suites.find((s) => s.id === selectedSuiteId) || null;
  const activePlan = locked ? plan : plans.find((p) => p.id === selectedPlanId) || null;
  const suiteShares = locked ? [] : plansOnSuite(plans, selectedSuiteId);
  const days = Math.max(0, Math.min(30, Number(activePlan?.daysPerMonth) || 0));

  const band = useMemo(
    () => effectiveAdrBand(assumptions, { type: activeSuite?.type, size: activeSuite?.size }),
    [assumptions, activeSuite?.type, activeSuite?.size]
  );

  useEffect(() => {
    if (!band) return;
    setAdr(Math.round((band.adrLow + band.adrHigh) / 2));
  }, [band?.adrLow, band?.adrHigh, activeSuite?.id]);

  useEffect(() => {
    setOccupancy(Math.round((assumptions.occupancyLowPct + assumptions.occupancyHighPct) / 2));
  }, [assumptions.occupancyLowPct, assumptions.occupancyHighPct]);

  const result = useMemo(
    () =>
      projectReturn({
        daysPerMonth: days,
        adr,
        occupancyPct: occupancy,
        operatingCostPct: assumptions.operatingCostPct
      }),
    [days, adr, occupancy, assumptions.operatingCostPct]
  );

  const catalogRange = useMemo(
    () => (days > 0 ? annualReturnRange(days, assumptions, { type: activeSuite?.type, size: activeSuite?.size }) : null),
    [days, assumptions, activeSuite?.type, activeSuite?.size]
  );

  const occLow = Math.min(assumptions.occupancyLowPct, assumptions.occupancyHighPct);
  const occHigh = Math.max(assumptions.occupancyLowPct, assumptions.occupancyHighPct);
  const adrMin = band ? Math.max(ADR_STEP, band.adrLow) : 1000;
  const adrMax = band ? Math.max(adrMin + ADR_STEP, band.adrHigh) : 100000;
  const shareAvailable = activePlan ? isUnsold(activePlan) : false;

  function selectSuite(id: string) {
    setSelectedSuiteId(id);
    const next = pickPlan(plans, id);
    setSelectedPlanId(next?.id || '');
    writeQuery(id, next?.id || '');
  }

  function selectShare(id: string) {
    setSelectedPlanId(id);
    writeQuery(selectedSuiteId, id);
  }

  const typeGroups = useMemo(() => {
    const groups: { key: string; label: string; items: CalcSuite[] }[] = [];
    for (const item of suites) {
      const key = item.type || 'Suite';
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, label: suiteTypeLabel(item.type, tDomain) || key, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [suites, tDomain]);

  return (
    <section id="returns-calculator" className={`border border-ocean/10 bg-white p-5 sm:p-6 ${className}`.trim()}>
      {showHeading && (
        <>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
          <h2 className="font-display mt-1 text-2xl text-ocean">{t('expectedTitle')}</h2>
        </>
      )}

      <div className={`${showHeading ? 'mt-6' : ''} grid gap-8 md:grid-cols-2`}>
        <div className="space-y-5">
          {locked ? (
            <div className="border border-ocean/10 bg-pearl/60 px-4 py-3">
              <p className="text-sm font-semibold text-ocean">
                {t('suiteMeta', {
                  id: activeSuite?.id || activePlan?.suiteId || '—',
                  type: suiteTypeLabel(activeSuite?.type, tDomain) || t('suiteFallback'),
                  view: suiteViewLabel(activeSuite?.view, tDomain) || '—'
                })}
              </p>
              <p className="mt-1 text-sm text-ocean/70">
                {t('suiteFacts', { size: activeSuite?.size ?? '—', floor: activeSuite?.floor ?? '—' })}
                {' · '}
                {days >= 30 ? t('daysChipFull') : t('daysLocked', { days })}
              </p>
            </div>
          ) : (
            <>
              <label className="block text-sm text-ocean">
                {t('selectSuite')}
                <select
                  className="field mt-1"
                  value={selectedSuiteId}
                  disabled={loading || suites.length === 0}
                  onChange={(e) => selectSuite(e.target.value)}
                >
                  {loading && <option value="">{t('loadingInventory')}</option>}
                  {!loading && suites.length === 0 && <option value="">{t('noSuites')}</option>}
                  {typeGroups.map((group) => (
                    <optgroup key={group.key} label={group.label}>
                      {group.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id}
                          {item.type ? ` · ${suiteTypeLabel(item.type, tDomain)}` : ''}
                          {item.view ? ` · ${suiteViewLabel(item.view, tDomain)}` : ''}
                          {item.size ? ` · ${item.size} sq ft` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              {activeSuite && (
                <p className="text-sm text-ocean/70">
                  {t('suiteFacts', { size: activeSuite.size ?? '—', floor: activeSuite.floor ?? '—' })}
                </p>
              )}

              <div>
                <p className="text-sm text-ocean">{t('selectShare')}</p>
                {suiteShares.length === 0 ? (
                  <p className="mt-2 text-sm text-ocean/60">{loading ? t('loadingInventory') : t('noShares')}</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suiteShares.map((share) => {
                      const selected = share.id === selectedPlanId;
                      const daysN = Number(share.daysPerMonth) || 0;
                      return (
                        <button
                          key={share.id}
                          type="button"
                          onClick={() => selectShare(share.id)}
                          className={`border px-3 py-2 text-left text-sm transition ${
                            selected
                              ? 'border-gold bg-gold/15 text-ocean'
                              : 'border-ocean/15 bg-white text-ocean hover:border-ocean/40'
                          } ${isUnsold(share) ? '' : 'opacity-70'}`}
                        >
                          <span className="block font-semibold">
                            {daysN >= 30 ? t('daysChipFull') : t('daysChip', { days: daysN })}
                          </span>
                          <span className="block text-[11px] text-ocean/60">
                            {planStatusLabel(share.planStatus, tDomain) || share.planStatus || 'Unsold'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <label className="block text-sm text-ocean">
            {t('occupancy', { pct: occupancy })}
            <input
              type="range"
              min={10}
              max={100}
              step={1}
              value={occupancy}
              onChange={(e) => setOccupancy(Number(e.target.value))}
              className="mt-2 w-full accent-ocean"
            />
          </label>
          <label className="block text-sm text-ocean">
            {t('adr', { amount: formatMoney(adr) })}
            <input
              type="number"
              min={0}
              step={ADR_STEP}
              value={adr || ''}
              onChange={(e) => setAdr(Math.max(0, Number(e.target.value) || 0))}
              className="field mt-1"
            />
            <input
              type="range"
              min={adrMin}
              max={adrMax}
              step={ADR_STEP}
              value={Math.min(adrMax, Math.max(adrMin, adr || adrMin))}
              onChange={(e) => setAdr(Number(e.target.value))}
              className="mt-2 w-full accent-ocean"
            />
            {band && (
              <span className="mt-1 block text-xs text-ocean/55">
                {t('adrBandHint', { low: formatMoney(band.adrLow), high: formatMoney(band.adrHigh) })}
              </span>
            )}
          </label>
        </div>

        <div className="border border-gold/30 bg-pearl p-5">
          {loading && !locked ? (
            <p className="text-sm text-ocean/70">{t('loadingInventory')}</p>
          ) : !activePlan || days <= 0 ? (
            <p className="text-sm text-ocean/70">{t('emptyPick')}</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean/55">{t('annualLabel')}</p>
              <p className="font-display mt-1 text-3xl text-ocean">{formatMoney(result.annualNet)}</p>
              <p className="mt-2 text-sm text-ocean/75">{t('monthlyNet', { amount: formatMoney(result.monthlyNet) })}</p>
              {catalogRange && (
                <p className="mt-4 text-sm text-ocean/70">
                  {t('rangeHint', { low: formatMoney(catalogRange.low), high: formatMoney(catalogRange.high) })}
                </p>
              )}
              <p className="mt-3 text-xs text-ocean/55">
                {t('assumptionsHint', { occLow, occHigh, cost: assumptions.operatingCostPct })}
              </p>
              {!shareAvailable && !locked && (
                <p className="mt-3 text-xs text-ocean/70">{t('shareUnavailable')}</p>
              )}
              <p className="mt-4 text-xs text-ocean/55">{t('disclaimer')}</p>
              {!locked && activePlan?.id && shareAvailable && (
                <Link href={`/pricing/plans/${encodeURIComponent(activePlan.id)}`} className="mt-5 block">
                  <Button className="w-full">{t('viewShare')}</Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
