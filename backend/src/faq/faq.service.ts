import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { FaqEntry } from '../domain/models';

function genId() {
  return 'FAQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function plainTextLength(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

function assertFaqContent(question: string, answer: string) {
  if (question.trim().length < 5) {
    throw new BadRequestException('question_too_short');
  }
  if (plainTextLength(answer) < 5) {
    throw new BadRequestException('answer_too_short');
  }
}

/** Trim optional Bangla field; empty string → null. Undefined stays undefined (no change on update). */
function normalizeBn(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

const DEFAULT_FAQS: Omit<FaqEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    question: 'How does fractional ownership work?',
    answer:
      'You purchase a share plan that entitles you to usage days per month and potential revenue share per policy.',
    questionBn: 'ভগ্নাংশ মালিকানা কীভাবে কাজ করে?',
    answerBn:
      'আপনি একটি শেয়ার প্ল্যান কিনেন যা নীতি অনুযায়ী প্রতি মাসে ব্যবহারের দিন এবং সম্ভাব্য রাজস্ব শেয়ারের অধিকার দেয়।',
    order: 0
  },
  {
    question: 'Can I transfer or resell my plan?',
    answer:
      'Transfers and resales are subject to company review and compliance; please contact support for procedures.',
    questionBn: 'আমি কি আমার প্ল্যান হস্তান্তর বা পুনঃবিক্রি করতে পারি?',
    answerBn:
      'হস্তান্তর ও পুনঃবিক্রি কোম্পানির পর্যালোচনা ও কমপ্লায়েন্সের অধীন; পদ্ধতির জন্য সাপোর্টে যোগাযোগ করুন।',
    order: 1
  },
  {
    question: 'What payment schedule applies?',
    answer:
      'Typical schedules include deposit, downpayment and monthly installments. Due dates appear in your investor dashboard.',
    questionBn: 'কোন পেমেন্ট সময়সূচি প্রযোজ্য?',
    answerBn:
      'সাধারণত ডিপোজিট, ডাউনপেমেন্ট ও মাসিক কিস্তি থাকে। নির্ধারিত তারিখ ইনভেস্টর ড্যাশবোর্ডে দেখা যায়।',
    order: 2
  },
  {
    question: 'Where is the resort located?',
    answer: "Marine Drive Road, Rupayan Beach View Innani, Cox's Bazar.",
    questionBn: 'রিসোর্ট কোথায় অবস্থিত?',
    answerBn: 'মেরিন ড্রাইভ রোড, রূপায়ন বিচ ভিউ ইনানী, কক্সবাজার।',
    order: 3
  },
  {
    question: 'What amenities are available in the compound?',
    answer:
      'As part of Rupayan Beach View: secured boundary, CC surveillance, amusement and water parks, mall, mosque, children play area, boat club, beach security, restaurant, pickup/drop-off and hospital.',
    questionBn: 'কম্পাউন্ডে কোন সুবিধা আছে?',
    answerBn:
      'রূপায়ন বিচ ভিউয়ের অংশ হিসেবে: সুরক্ষিত সীমানা, সিসি নজরদারি, বিনোদন ও ওয়াটার পার্ক, মল, মসজিদ, শিশু খেলার মাঠ, বোট ক্লাব, সৈকত নিরাপত্তা, রেস্তোরাঁ, পিকআপ/ড্রপ ও হাসপাতাল।',
    order: 4
  },
  {
    question: 'How many days can I stay each month?',
    answer:
      'Your share plan sets a fixed entitlement of days per month. Check the plan details before purchase; unused days follow the resort’s usage and rental policy.',
    questionBn: 'প্রতি মাসে কত দিন থাকতে পারি?',
    answerBn:
      'আপনার শেয়ার প্ল্যানে প্রতি মাসে নির্দিষ্ট দিনের অধিকার থাকে। কেনার আগে প্ল্যান বিবরণ দেখুন; অব্যবহৃত দিন রিসোর্টের ব্যবহার ও ভাড়া নীতি অনুসরণ করে।',
    order: 5
  },
  {
    question: 'Do I earn rental income when I am not staying?',
    answer:
      'When your suite is rented during unused entitlement periods, eligible owners may receive a revenue share according to the published revenue policy.',
    questionBn: 'আমি না থাকলে কি ভাড়া আয় পাই?',
    answerBn:
      'অব্যবহৃত অধিকারকালে স্যুট ভাড়া হলে, প্রকাশিত রাজস্ব নীতি অনুযায়ী যোগ্য মালিকরা রাজস্ব শেয়ার পেতে পারেন।',
    order: 6
  },
  {
    question: 'What documents are required to purchase?',
    answer:
      'You’ll need a valid NID or passport, contact details, and nominee information. Our team completes KYC verification before ownership paperwork is finalized.',
    questionBn: 'কেনার জন্য কী কাগজপত্র লাগে?',
    answerBn:
      'বৈধ এনআইডি বা পাসপোর্ট, যোগাযোগের তথ্য ও নমিনি তথ্য প্রয়োজন। মালিকানা কাগজ চূড়ান্ত হওয়ার আগে আমাদের দল কেওয়াইসি যাচাই সম্পন্ন করে।',
    order: 7
  },
  {
    question: 'Can family or friends use my suite?',
    answer:
      'Yes. Guests you authorize may stay during your entitlement days, subject to resort check-in rules and house policies.',
    questionBn: 'পরিবার বা বন্ধুরা কি আমার স্যুট ব্যবহার করতে পারে?',
    answerBn:
      'হ্যাঁ। আপনার অনুমোদিত অতিথিরা আপনার অধিকারের দিনে থাকতে পারেন, চেক-ইন নিয়ম ও হাউস পলিসির অধীন।',
    order: 8
  },
  {
    question: 'How do I book my stay dates?',
    answer:
      'After purchase, open your investor dashboard to request dates within your monthly entitlement. Availability is confirmed by the resort operations team.',
    questionBn: 'থাকার তারিখ কীভাবে বুক করব?',
    answerBn:
      'কেনার পর ইনভেস্টর ড্যাশবোর্ডে মাসিক অধিকারের মধ্যে তারিখ অনুরোধ করুন। উপলব্ধতা রিসোর্ট অপারেশনস টিম নিশ্চিত করে।',
    order: 9
  },
  {
    question: 'Who do I contact for sales or support?',
    answer:
      'Email info@grandsampan.com or use the on-site concierge once the resort is operational. Sales inquiries are handled by the Grand Sampan ownership team.',
    questionBn: 'বিক্রয় বা সাপোর্টের জন্য কার সাথে যোগাযোগ করব?',
    answerBn:
      'info@grandsampan.com ইমেইল করুন অথবা রিসোর্ট চালু হলে অন-সাইট কনসিয়ার্জ ব্যবহার করুন। বিক্রয় অনুসন্ধান গ্র্যান্ড সম্পান মালিকানা দল পরিচালনা করে।',
    order: 10
  }
];

@Injectable()
export class FaqService {
  private memory: FaqEntry[] = [];
  private seeded = false;

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private async ensureSeeded() {
    if (this.db) {
      const count = await this.db.faqEntry.count();
      if (count === 0) {
        const now = new Date();
        await this.db.faqEntry.createMany({
          data: DEFAULT_FAQS.map((item) => ({
            id: genId(),
            question: item.question,
            answer: item.answer,
            questionBn: item.questionBn ?? null,
            answerBn: item.answerBn ?? null,
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
      this.memory = DEFAULT_FAQS.map((item) => ({
        id: genId(),
        question: item.question,
        answer: item.answer,
        questionBn: item.questionBn ?? null,
        answerBn: item.answerBn ?? null,
        order: item.order,
        createdAt: now,
        updatedAt: now
      }));
      this.seeded = true;
    }
  }

  async list(): Promise<FaqEntry[]> {
    await this.ensureSeeded();
    if (this.db) {
      return this.db.faqEntry.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    }
    return this.memory.slice().sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
  }

  /** Public list: when locale is bn and Bn fields exist, surface them as question/answer. */
  async listLocalized(locale?: string): Promise<FaqEntry[]> {
    const items = await this.list();
    const useBn = Boolean(locale && locale.toLowerCase().startsWith('bn'));
    if (!useBn) return items;
    return items.map((item) => ({
      ...item,
      question: item.questionBn?.trim() ? item.questionBn : item.question,
      answer: item.answerBn?.trim() ? item.answerBn : item.answer
    }));
  }

  async create(data: {
    question: string;
    answer: string;
    questionBn?: string | null;
    answerBn?: string | null;
  }): Promise<FaqEntry> {
    await this.ensureSeeded();
    assertFaqContent(data.question, data.answer);
    const items = await this.list();
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const now = new Date();
    const questionBn = normalizeBn(data.questionBn) ?? null;
    const answerBn = normalizeBn(data.answerBn) ?? null;
    const record: FaqEntry = {
      id: genId(),
      question: data.question.trim(),
      answer: data.answer.trim(),
      questionBn,
      answerBn,
      order,
      createdAt: now,
      updatedAt: now
    };
    if (this.db) {
      return this.db.faqEntry.create({ data: record });
    }
    this.memory.push(record);
    return record;
  }

  async update(
    id: string,
    data: {
      question?: string;
      answer?: string;
      questionBn?: string | null;
      answerBn?: string | null;
    }
  ): Promise<FaqEntry> {
    await this.ensureSeeded();
    const nextQuestionBn = normalizeBn(data.questionBn);
    const nextAnswerBn = normalizeBn(data.answerBn);

    if (this.db) {
      const current = await this.db.faqEntry.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('faq_not_found');
      const nextQuestion = data.question !== undefined ? data.question.trim() : current.question;
      const nextAnswer = data.answer !== undefined ? data.answer.trim() : current.answer;
      assertFaqContent(nextQuestion, nextAnswer);
      return this.db.faqEntry.update({
        where: { id },
        data: {
          ...(data.question !== undefined ? { question: nextQuestion } : {}),
          ...(data.answer !== undefined ? { answer: nextAnswer } : {}),
          ...(nextQuestionBn !== undefined ? { questionBn: nextQuestionBn } : {}),
          ...(nextAnswerBn !== undefined ? { answerBn: nextAnswerBn } : {})
        }
      });
    }
    const idx = this.memory.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('faq_not_found');
    const nextQuestion = data.question !== undefined ? data.question.trim() : this.memory[idx].question;
    const nextAnswer = data.answer !== undefined ? data.answer.trim() : this.memory[idx].answer;
    assertFaqContent(nextQuestion, nextAnswer);
    this.memory[idx] = {
      ...this.memory[idx],
      ...(data.question !== undefined ? { question: nextQuestion } : {}),
      ...(data.answer !== undefined ? { answer: nextAnswer } : {}),
      ...(nextQuestionBn !== undefined ? { questionBn: nextQuestionBn } : {}),
      ...(nextAnswerBn !== undefined ? { answerBn: nextAnswerBn } : {}),
      updatedAt: new Date()
    };
    return this.memory[idx];
  }

  async remove(id: string): Promise<void> {
    await this.ensureSeeded();
    if (this.db) {
      const current = await this.db.faqEntry.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('faq_not_found');
      await this.db.faqEntry.delete({ where: { id } });
      return;
    }
    const before = this.memory.length;
    this.memory = this.memory.filter((i) => i.id !== id);
    if (this.memory.length === before) throw new NotFoundException('faq_not_found');
  }

  async move(id: string, direction: 'up' | 'down'): Promise<FaqEntry[]> {
    const items = await this.list();
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('faq_not_found');
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
          this.db!.faqEntry.update({ where: { id: item.id }, data: { order } })
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
