'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/Button';

type Job = {
  id: string;
  status: 'queued' | 'running' | 'ready' | 'error';
  progress: number;
  step: string;
  error?: string;
};

const STEPS = ['gather', 'cover', 'resort', 'design', 'suites', 'returns', 'terms', 'faq', 'back', 'done'] as const;

export default function BrochurePage() {
  const t = useTranslations('brochure');
  const locale = useLocale() === 'bn' ? 'bn' : 'en';
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function start() {
      setError('');
      setJob(null);
      try {
        const res = await fetch(`/api/brochure/jobs?locale=${locale}`, { method: 'POST' });
        const json = await res.json();
        if (!json?.ok || !json.job?.id) throw new Error('start_failed');
        if (cancelled) return;
        setJob(json.job);
        poll(json.job.id);
      } catch {
        if (!cancelled) setError(t('error'));
      }
    }

    async function poll(id: string) {
      try {
        const res = await fetch(`/api/brochure/jobs/${id}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json?.ok || !json.job) throw new Error('missing');
        setJob(json.job);
        if (json.job.status === 'queued' || json.job.status === 'running') {
          timer = window.setTimeout(() => poll(id), 400);
        }
      } catch {
        if (!cancelled) setError(t('error'));
      }
    }

    start();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [locale, t, attempt]);

  const pct = Math.max(0, Math.min(100, job?.progress ?? 0));
  const ready = job?.status === 'ready';
  const failed = job?.status === 'error' || !!error;
  const currentStep = job?.step || 'queued';

  const stepLabel = useMemo(() => {
    const key = `step.${currentStep}`;
    const value = t(key);
    return value === key ? t('step.layout') : value;
  }, [currentStep, t]);

  const normalizedStep =
    currentStep === 'queued' || currentStep === 'layout'
      ? 'gather'
      : currentStep === 'finish'
        ? 'done'
        : currentStep;
  const currentIdx = STEPS.indexOf(normalizedStep as (typeof STEPS)[number]);

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 text-ocean/75">{ready ? t('readyIntro') : t('buildingIntro')}</p>

      <div className="mt-8 border border-ocean/10 bg-white p-5 sm:p-6">
        {!failed && (
          <>
            <div className="flex items-center justify-between text-sm text-ocean">
              <span className="font-semibold">{ready ? t('complete') : stepLabel}</span>
              <span className="tabular-nums text-ocean/60">{pct}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden bg-pearl">
              <div
                className="h-full bg-gold transition-[width] duration-300"
                style={{ width: `${ready ? 100 : pct}%` }}
              />
            </div>
            <ol className="mt-5 space-y-1.5 text-sm">
              {STEPS.map((step, idx) => {
                const done = ready || (currentIdx >= 0 && idx < currentIdx);
                const active = !ready && idx === currentIdx;
                return (
                  <li
                    key={step}
                    className={
                      done ? 'text-ocean' : active ? 'font-semibold text-ocean' : 'text-ocean/40'
                    }
                  >
                    {done ? '✓ ' : active ? '● ' : '○ '}
                    {t(`step.${step}`)}
                  </li>
                );
              })}
            </ol>
            {ready && job && (
              <a
                href={`/api/brochure/jobs/${job.id}/file`}
                download
                className="mt-6 inline-flex"
              >
                <Button type="button">{t('download')}</Button>
              </a>
            )}
          </>
        )}

        {failed && (
          <div>
            <p className="text-sm text-red-700">{error || t('error')}</p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => {
                setError('');
                setJob(null);
                setAttempt((n) => n + 1);
              }}
            >
              {t('tryAgain')}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
