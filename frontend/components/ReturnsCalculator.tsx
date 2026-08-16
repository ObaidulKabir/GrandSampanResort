'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { suiteTypeLabel } from '@/lib/domainLabels';
import {
  annualReturnRange,
  DEFAULT_RETURN_ASSUMPTIONS,
  effectiveAdrBand,
  normalizeCategoryKey,
  normalizeReturnAssumptions,
  projectReturn,
  type ReturnAssumptions
} from '@/lib/returns';

const CATEGORIES = ['Standard', 'Delux', 'Premium'] as const;

type Props = {
  defaultDays?: number;
  defaultSuiteType?: string | null;
  defaultSize?: number | null;
  lockSuite?: boolean;
  showHeading?: boolean;
  className?: string;
};

export default function ReturnsCalculator({
  defaultDays = 5,
  defaultSuiteType,
  defaultSize,
  lockSuite = false,
  showHeading = false,
  className = ''
}: Props) {
  const t = useTranslations('returnsIncome');
  const tDomain = useTranslations('domain');
  const [assumptions, setAssumptions] = useState<ReturnAssumptions>(DEFAULT_RETURN_ASSUMPTIONS);
  const [suiteType, setSuiteType] = useState(() => normalizeCategoryKey(defaultSuiteType));
  const [size, setSize] = useState(() => Math.max(1, Number(defaultSize) || DEFAULT_RETURN_ASSUMPTIONS.referenceSqFt));
  const [days, setDays] = useState(() => Math.max(1, Math.min(30, Number(defaultDays) || 5)));
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
    setDays(Math.max(1, Math.min(30, Number(defaultDays) || 5)));
  }, [defaultDays]);

  useEffect(() => {
    setSuiteType(normalizeCategoryKey(defaultSuiteType));
  }, [defaultSuiteType]);

  useEffect(() => {
    if (Number(defaultSize) > 0) setSize(Math.max(1, Number(defaultSize)));
    else setSize(assumptions.referenceSqFt);
  }, [defaultSize, assumptions.referenceSqFt]);

  const band = useMemo(
    () => effectiveAdrBand(assumptions, { type: suiteType, size }),
    [assumptions, suiteType, size]
  );

  useEffect(() => {
    if (!band) return;
    setAdr(Math.round((band.adrLow + band.adrHigh) / 2));
  }, [band]);

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
    () => annualReturnRange(days, assumptions, { type: suiteType, size }),
    [days, assumptions, suiteType, size]
  );

  const adrMin = band ? Math.max(0, band.adrLow) : 0;
  const adrMax = band ? Math.max(adrMin + 1, band.adrHigh) : 1;
  const occLow = Math.min(assumptions.occupancyLowPct, assumptions.occupancyHighPct);
  const occHigh = Math.max(assumptions.occupancyLowPct, assumptions.occupancyHighPct);

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
          {lockSuite ? (
            <p className="text-sm text-ocean/75">
              {suiteTypeLabel(suiteType, tDomain)}
              {' · '}
              {t('sizeLocked', { size })}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-ocean">
                {t('suiteType')}
                <select
                  value={suiteType}
                  onChange={(e) => setSuiteType(normalizeCategoryKey(e.target.value))}
                  className="field mt-1"
                >
                  {CATEGORIES.map((key) => (
                    <option key={key} value={key}>
                      {suiteTypeLabel(key, tDomain)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-ocean">
                {t('size')}
                <input
                  type="number"
                  min={1}
                  value={size}
                  onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))}
                  className="field mt-1"
                />
              </label>
            </div>
          )}

          <label className="block text-sm text-ocean">
            {t('daysPerMonth', { days })}
            <input
              type="range"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-2 w-full accent-ocean"
            />
          </label>
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
              type="range"
              min={adrMin}
              max={adrMax}
              step={100}
              value={Math.min(adrMax, Math.max(adrMin, adr))}
              onChange={(e) => setAdr(Number(e.target.value))}
              className="mt-2 w-full accent-ocean"
            />
          </label>
        </div>

        <div className="border border-gold/30 bg-pearl p-5">
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
          <p className="mt-4 text-xs text-ocean/55">{t('disclaimer')}</p>
        </div>
      </div>
    </section>
  );
}
