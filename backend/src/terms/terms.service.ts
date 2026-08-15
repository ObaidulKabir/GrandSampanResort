import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { TermsParagraph } from '../domain/models';

function genId() {
  return 'TRM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function plainTextLength(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

function assertTermsContent(title: string, body: string) {
  if (title.trim().length < 2) {
    throw new BadRequestException('title_too_short');
  }
  if (plainTextLength(body) < 5) {
    throw new BadRequestException('body_too_short');
  }
}

/** Trim optional Bangla field; empty string → null. Undefined stays undefined (no change on update). */
function normalizeBn(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

const DEFAULT_TERMS: Omit<TermsParagraph, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '1. Definitions',
    body:
      '• “Guest” means a person staying at the resort.\n• “Investor” means a person who purchases a share plan or unit.\n• “Services” include accommodation, amenities, and related offerings.',
    titleBn: '১. সংজ্ঞা',
    bodyBn:
      '• “অতিথি” বলতে রিসোর্টে অবস্থানকারী ব্যক্তিকে বোঝায়।\n• “বিনিয়োগকারী” বলতে শেয়ার প্ল্যান বা ইউনিট ক্রেতাকে বোঝায়।\n• “সেবা” অন্তর্ভুক্ত করে আবাসন, সুবিধা ও সংশ্লিষ্ট অফার।',
    order: 0
  },
  {
    title: '2. Bookings and Payments',
    body:
      '• All bookings are subject to availability and confirmation.\n• Deposits, downpayment, and installment schedules must be paid by due dates.\n• Failure to pay on time may result in suspension of entitlements until rectified.',
    titleBn: '২. বুকিং ও পেমেন্ট',
    bodyBn:
      '• সব বুকিং উপলব্ধতা ও নিশ্চিতকরণের অধীন।\n• ডিপোজিট, ডাউনপেমেন্ট ও কিস্তি নির্ধারিত তারিখে পরিশোধ করতে হবে।\n• সময়মতো না দিলে অধিকার স্থগিত হতে পারে যতক্ষণ না সংশোধন হয়।',
    order: 1
  },
  {
    title: '3. Investor Entitlements',
    body:
      '• Investors receive usage days per month consistent with the selected plan.\n• Revenue share, if applicable, is calculated per policy and may be adjusted.\n• Transfer or resale is subject to company review and compliance.',
    titleBn: '৩. বিনিয়োগকারীর অধিকার',
    bodyBn:
      '• নির্বাচিত প্ল্যান অনুযায়ী বিনিয়োগকারীরা প্রতি মাসে ব্যবহারের দিন পান।\n• প্রযোজ্য হলে রাজস্ব শেয়ার নীতি অনুযায়ী হিসাব হয় এবং সমন্বয়যোগ্য।\n• হস্তান্তর বা পুনঃবিক্রি কোম্পানির পর্যালোচনা ও কমপ্লায়েন্সের অধীন।',
    order: 2
  },
  {
    title: '4. Conduct and Safety',
    body:
      '• Guests and investors must follow resort rules and local regulations.\n• Damage to property may incur repair costs payable by the responsible party.\n• Safety guidelines for beach access and common areas must be respected.',
    titleBn: '৪. আচরণ ও নিরাপত্তা',
    bodyBn:
      '• অতিথি ও বিনিয়োগকারীদের রিসোর্ট নিয়ম ও স্থানীয় আইন মানতে হবে।\n• সম্পত্তির ক্ষতি হলে দায়ী পক্ষ মেরামত খরচ বহন করতে পারে।\n• সৈকত ও সাধারণ এলাকার নিরাপত্তা নির্দেশিকা মেনে চলতে হবে।',
    order: 3
  },
  {
    title: '5. Cancellation and Refunds',
    body:
      '• Cancellations are processed per booking policy and plan terms.\n• Refund eligibility depends on notice period and service usage.',
    titleBn: '৫. বাতিল ও ফেরত',
    bodyBn:
      '• বাতিল বুকিং নীতি ও প্ল্যান শর্ত অনুযায়ী প্রক্রিয়া হয়।\n• ফেরতের যোগ্যতা নোটিশ সময় ও সেবা ব্যবহারের ওপর নির্ভর করে।',
    order: 4
  },
  {
    title: '6. Privacy',
    body:
      '• Personal data is handled per privacy policy and applicable law.\n• Security measures are maintained to protect user information.',
    titleBn: '৬. গোপনীয়তা',
    bodyBn:
      '• ব্যক্তিগত তথ্য গোপনীয়তা নীতি ও প্রযোজ্য আইন অনুযায়ী পরিচালিত হয়।\n• ব্যবহারকারীর তথ্য রক্ষায় নিরাপত্তা ব্যবস্থা বজায় রাখা হয়।',
    order: 5
  },
  {
    title: '7. Changes to Terms',
    body:
      'The company may update these terms periodically. Continued use of services indicates acceptance of changes.',
    titleBn: '৭. শর্তাবলীর পরিবর্তন',
    bodyBn:
      'কোম্পানি সময়ে সময়ে এই শর্তাবলী হালনাগাদ করতে পারে। সেবা অব্যাহত ব্যবহার পরিবর্তন গ্রহণের ইঙ্গিত দেয়।',
    order: 6
  },
  {
    title: '8. Contact',
    body: 'For questions or support: info@grandsampan.com • +880 17 0000 0000',
    titleBn: '৮. যোগাযোগ',
    bodyBn: 'প্রশ্ন বা সাপোর্টের জন্য: info@grandsampan.com • +880 17 0000 0000',
    order: 7
  }
];

@Injectable()
export class TermsService {
  private memory: TermsParagraph[] = [];
  private seeded = false;
  private seedPromise: Promise<void> | null = null;

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private async ensureSeeded() {
    if (!this.seedPromise) {
      this.seedPromise = this.seedOnce().finally(() => {
        this.seedPromise = null;
      });
    }
    await this.seedPromise;
  }

  private async seedOnce() {
    if (this.db) {
      const count = await this.db.termsParagraph.count();
      if (count === 0) {
        const now = new Date();
        await this.db.termsParagraph.createMany({
          data: DEFAULT_TERMS.map((item) => ({
            id: genId(),
            title: item.title,
            body: item.body,
            titleBn: item.titleBn ?? null,
            bodyBn: item.bodyBn ?? null,
            order: item.order,
            createdAt: now,
            updatedAt: now
          }))
        });
      }
      return;
    }
    if (!this.seeded) {
      const now = new Date();
      this.memory = DEFAULT_TERMS.map((item) => ({
        id: genId(),
        title: item.title,
        body: item.body,
        titleBn: item.titleBn ?? null,
        bodyBn: item.bodyBn ?? null,
        order: item.order,
        createdAt: now,
        updatedAt: now
      }));
      this.seeded = true;
    }
  }

  async list(): Promise<TermsParagraph[]> {
    await this.ensureSeeded();
    if (this.db) {
      return this.db.termsParagraph.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    }
    return this.memory.slice().sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
  }

  /** Public list: when locale is bn and Bn fields exist, surface them as title/body. */
  async listLocalized(locale?: string): Promise<TermsParagraph[]> {
    const items = await this.list();
    const useBn = Boolean(locale && locale.toLowerCase().startsWith('bn'));
    if (!useBn) return items;
    return items.map((item) => ({
      ...item,
      title: item.titleBn?.trim() ? item.titleBn : item.title,
      body: item.bodyBn?.trim() ? item.bodyBn : item.body
    }));
  }

  async create(data: {
    title: string;
    body: string;
    titleBn?: string | null;
    bodyBn?: string | null;
  }): Promise<TermsParagraph> {
    await this.ensureSeeded();
    assertTermsContent(data.title, data.body);
    const items = await this.list();
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const now = new Date();
    const titleBn = normalizeBn(data.titleBn) ?? null;
    const bodyBn = normalizeBn(data.bodyBn) ?? null;
    const record: TermsParagraph = {
      id: genId(),
      title: data.title.trim(),
      body: data.body.trim(),
      titleBn,
      bodyBn,
      order,
      createdAt: now,
      updatedAt: now
    };
    if (this.db) return this.db.termsParagraph.create({ data: record });
    this.memory.push(record);
    return record;
  }

  async update(
    id: string,
    data: {
      title?: string;
      body?: string;
      titleBn?: string | null;
      bodyBn?: string | null;
    }
  ): Promise<TermsParagraph> {
    await this.ensureSeeded();
    const nextTitleBn = normalizeBn(data.titleBn);
    const nextBodyBn = normalizeBn(data.bodyBn);

    if (this.db) {
      const current = await this.db.termsParagraph.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('terms_not_found');
      const nextTitle = data.title !== undefined ? data.title.trim() : current.title;
      const nextBody = data.body !== undefined ? data.body.trim() : current.body;
      assertTermsContent(nextTitle, nextBody);
      return this.db.termsParagraph.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: nextTitle } : {}),
          ...(data.body !== undefined ? { body: nextBody } : {}),
          ...(nextTitleBn !== undefined ? { titleBn: nextTitleBn } : {}),
          ...(nextBodyBn !== undefined ? { bodyBn: nextBodyBn } : {})
        }
      });
    }
    const idx = this.memory.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('terms_not_found');
    const nextTitle = data.title !== undefined ? data.title.trim() : this.memory[idx].title;
    const nextBody = data.body !== undefined ? data.body.trim() : this.memory[idx].body;
    assertTermsContent(nextTitle, nextBody);
    this.memory[idx] = {
      ...this.memory[idx],
      ...(data.title !== undefined ? { title: nextTitle } : {}),
      ...(data.body !== undefined ? { body: nextBody } : {}),
      ...(nextTitleBn !== undefined ? { titleBn: nextTitleBn } : {}),
      ...(nextBodyBn !== undefined ? { bodyBn: nextBodyBn } : {}),
      updatedAt: new Date()
    };
    return this.memory[idx];
  }

  async remove(id: string): Promise<void> {
    await this.ensureSeeded();
    if (this.db) {
      const current = await this.db.termsParagraph.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('terms_not_found');
      await this.db.termsParagraph.delete({ where: { id } });
      return;
    }
    const before = this.memory.length;
    this.memory = this.memory.filter((i) => i.id !== id);
    if (this.memory.length === before) throw new NotFoundException('terms_not_found');
  }

  async move(id: string, direction: 'up' | 'down'): Promise<TermsParagraph[]> {
    const items = await this.list();
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('terms_not_found');
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= items.length) return items;

    const next = items.slice();
    const tmp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = tmp;
    const now = new Date();

    // Always reindex 0..n so swaps work even when order values were duplicated.
    if (this.db) {
      await this.db.$transaction(
        next.map((item, order) =>
          this.db!.termsParagraph.update({ where: { id: item.id }, data: { order } })
        )
      );
      return this.list();
    }
    const byId = new Map(next.map((item, order) => [item.id, order]));
    this.memory = this.memory.map((item) => {
      const order = byId.get(item.id);
      if (order === undefined) return item;
      return { ...item, order, updatedAt: now };
    });
    return this.list();
  }
}
