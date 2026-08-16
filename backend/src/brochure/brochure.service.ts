import { Injectable } from '@nestjs/common';
import { FaqService } from '../faq/faq.service';
import { MediaService } from '../media/media.service';
import { PaymentPlansService } from '../payment-plans/payment-plans.service';
import { PromotionsService } from '../promotions/promotions.service';
import { SettingsService } from '../settings/settings.service';
import { SuitesService } from '../suites/suites.service';
import { TermsService } from '../terms/terms.service';
import { TimesharesService } from '../timeshares/timeshares.service';
import { buildBrochurePdf, type BrochureData } from './brochure.pdf';
import type { BrochureLocale } from './copy';

const CACHE_MS = 15 * 60 * 1000;
const JOB_TTL_MS = 30 * 60 * 1000;

export type BrochureJobStatus = 'queued' | 'running' | 'ready' | 'error';

export type BrochureJobPublic = {
  id: string;
  locale: BrochureLocale;
  status: BrochureJobStatus;
  progress: number;
  step: string;
  error?: string;
};

type BrochureJob = BrochureJobPublic & {
  buf?: Buffer;
  createdAt: number;
};

@Injectable()
export class BrochureService {
  private cache = new Map<string, { at: number; buf: Buffer }>();
  private jobs = new Map<string, BrochureJob>();
  private inflight = new Map<BrochureLocale, Promise<Buffer>>();

  constructor(
    private readonly suites: SuitesService,
    private readonly timeshares: TimesharesService,
    private readonly promotions: PromotionsService,
    private readonly media: MediaService,
    private readonly settings: SettingsService,
    private readonly paymentPlans: PaymentPlansService,
    private readonly faq: FaqService,
    private readonly terms: TermsService
  ) {}

  startJob(localeRaw?: string): BrochureJobPublic {
    this.pruneJobs();
    const locale = this.normalizeLocale(localeRaw);
    const id = 'BRC-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const job: BrochureJob = {
      id,
      locale,
      status: 'queued',
      progress: 2,
      step: 'queued',
      createdAt: Date.now()
    };
    this.jobs.set(id, job);
    void this.runJob(job);
    return this.publicJob(job);
  }

  getJob(id: string): BrochureJobPublic | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    return this.publicJob(job);
  }

  getJobFile(id: string): { buf: Buffer; locale: BrochureLocale } | null {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'ready' || !job.buf) return null;
    return { buf: job.buf, locale: job.locale };
  }

  async pdf(localeRaw?: string): Promise<{ buf: Buffer; locale: BrochureLocale }> {
    const locale = this.normalizeLocale(localeRaw);
    const buf = await this.buildForLocale(locale);
    return { buf, locale };
  }

  private publicJob(job: BrochureJob): BrochureJobPublic {
    return {
      id: job.id,
      locale: job.locale,
      status: job.status,
      progress: job.progress,
      step: job.step,
      error: job.error
    };
  }

  private normalizeLocale(localeRaw?: string): BrochureLocale {
    return String(localeRaw || 'en').toLowerCase().startsWith('bn') ? 'bn' : 'en';
  }

  private pruneJobs() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (now - job.createdAt > JOB_TTL_MS) this.jobs.delete(id);
    }
  }

  private setJob(job: BrochureJob, patch: Partial<BrochureJob>) {
    Object.assign(job, patch);
  }

  private async runJob(job: BrochureJob) {
    try {
      this.setJob(job, { status: 'running', progress: 6, step: 'gather' });
      const buf = await this.buildForLocale(job.locale, (pct, step) => {
        if (job.status !== 'running') return;
        this.setJob(job, { progress: Math.max(job.progress, Math.min(99, pct)), step });
      });
      this.setJob(job, { status: 'ready', progress: 100, step: 'done', buf });
    } catch (err: any) {
      this.setJob(job, {
        status: 'error',
        progress: job.progress,
        step: 'error',
        error: String(err?.message || 'build_failed')
      });
    }
  }

  private async buildForLocale(
    locale: BrochureLocale,
    onProgress?: (pct: number, step: string) => void
  ): Promise<Buffer> {
    const hit = this.cache.get(locale);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      onProgress?.(100, 'done');
      return hit.buf;
    }

    const pending = this.inflight.get(locale);
    if (pending) return pending;

    const work = (async () => {
      onProgress?.(8, 'gather');
      const data = await this.gather(locale);
      onProgress?.(18, 'layout');
      const buf = await buildBrochurePdf(data, onProgress);
      this.cache.set(locale, { at: Date.now(), buf });
      return buf;
    })();

    this.inflight.set(locale, work);
    try {
      return await work;
    } finally {
      this.inflight.delete(locale);
    }
  }

  private async gather(locale: BrochureLocale): Promise<BrochureData> {
    const [suites, plans, promos, hero, resort, design, assumptions, policy, faqs, terms] = await Promise.all([
      this.suites.list() as Promise<any[]>,
      this.timeshares.list() as Promise<any[]>,
      this.promotions.listActive(),
      this.media.list({ category: 'hero' }),
      this.media.list({ category: 'resort' }),
      this.media.list({ category: 'design_layout' }),
      this.settings.getReturnAssumptions(),
      this.paymentPlans.getPolicy(),
      this.faq.listLocalized(locale),
      this.terms.listLocalized(locale)
    ]);

    const suiteById = Object.fromEntries((suites || []).map((s) => [s.id, s]));
    const standardPct =
      this.paymentPlans.standardTier(policy)?.upfrontPct ||
      policy.tiers?.find((t) => t.id === 'standard')?.upfrontPct ||
      10;

    const unsold = (plans || []).filter((p) => String(p.planStatus || 'Unsold').toLowerCase() === 'unsold');
    const rows = unsold
      .map((p) => {
        const suite = suiteById[p.suiteId] || {};
        const price = typeof p.discountedPrice === 'number' ? Number(p.discountedPrice) : Number(p.price || 0);
        return {
          suiteId: String(p.suiteId || suite.id || p.id || '—'),
          type: String(suite.type || '—'),
          view: String(suite.view || '—'),
          floor: suite.floor ?? '—',
          size: suite.size ?? '—',
          daysPerMonth: Number(p.daysPerMonth || 0),
          price,
          reserveFrom: Math.round(price * (standardPct / 100))
        };
      })
      .sort((a, b) => a.suiteId.localeCompare(b.suiteId, undefined, { numeric: true }) || a.daysPerMonth - b.daysPerMonth);

    const imageUrls = (items: { url?: string }[]) =>
      (items || []).map((m) => m.url || '').filter((u) => u && !/\.pdf($|\?)/i.test(u));

    const resortUrls = imageUrls(resort);
    const about = await this.media.list({ category: 'about_project' });
    const resortPaths = [...imageUrls(about), ...resortUrls].slice(0, 4);

    return {
      locale,
      promotions: (promos || []).map((p) => ({
        name: p.name,
        discountPct: p.discountPct,
        endsAt: p.endsAt
      })),
      heroPath: imageUrls(hero)[0] || resortPaths[0] || null,
      resortPaths,
      designPaths: imageUrls(design).slice(0, 2),
      suites: rows,
      assumptions,
      reservePct: standardPct,
      faqs: (faqs || []).map((f) => ({ question: f.question, answer: f.answer })),
      terms: (terms || []).map((t) => ({ title: t.title, body: t.body }))
    };
  }
}
