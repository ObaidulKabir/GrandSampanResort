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

@Injectable()
export class BrochureService {
  private cache = new Map<string, { at: number; buf: Buffer }>();

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

  async pdf(localeRaw?: string): Promise<{ buf: Buffer; locale: BrochureLocale }> {
    const locale: BrochureLocale = String(localeRaw || 'en').toLowerCase().startsWith('bn') ? 'bn' : 'en';
    const hit = this.cache.get(locale);
    if (hit && Date.now() - hit.at < CACHE_MS) return { buf: hit.buf, locale };

    const data = await this.gather(locale);
    const buf = await buildBrochurePdf(data);
    this.cache.set(locale, { at: Date.now(), buf });
    return { buf, locale };
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
