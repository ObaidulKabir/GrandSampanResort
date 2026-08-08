import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { FaqEntry } from '../domain/models';

function genId() {
  return 'FAQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const DEFAULT_FAQS: Omit<FaqEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    question: 'How does fractional ownership work?',
    answer:
      'You purchase a share plan that entitles you to usage days per month and potential revenue share per policy.',
    order: 0
  },
  {
    question: 'Can I transfer or resell my plan?',
    answer:
      'Transfers and resales are subject to company review and compliance; please contact support for procedures.',
    order: 1
  },
  {
    question: 'What payment schedule applies?',
    answer:
      'Typical schedules include deposit, downpayment and monthly installments. Due dates appear in your investor dashboard.',
    order: 2
  },
  {
    question: 'Where is the resort located?',
    answer: "Marine Drive Road, Rupayan Beach View Innani, Cox's Bazar.",
    order: 3
  },
  {
    question: 'What amenities are available in the compound?',
    answer:
      'As part of Rupayan Beach View: secured boundary, CC surveillance, amusement and water parks, mall, mosque, children play area, boat club, beach security, restaurant, pickup/drop-off and hospital.',
    order: 4
  },
  {
    question: 'How many days can I stay each month?',
    answer:
      'Your share plan sets a fixed entitlement of days per month. Check the plan details before purchase; unused days follow the resort’s usage and rental policy.',
    order: 5
  },
  {
    question: 'Do I earn rental income when I am not staying?',
    answer:
      'When your suite is rented during unused entitlement periods, eligible owners may receive a revenue share according to the published revenue policy.',
    order: 6
  },
  {
    question: 'What documents are required to purchase?',
    answer:
      'You’ll need a valid NID or passport, contact details, and nominee information. Our team completes KYC verification before ownership paperwork is finalized.',
    order: 7
  },
  {
    question: 'Can family or friends use my suite?',
    answer:
      'Yes. Guests you authorize may stay during your entitlement days, subject to resort check-in rules and house policies.',
    order: 8
  },
  {
    question: 'How do I book my stay dates?',
    answer:
      'After purchase, open your investor dashboard to request dates within your monthly entitlement. Availability is confirmed by the resort operations team.',
    order: 9
  },
  {
    question: 'Who do I contact for sales or support?',
    answer:
      'Email info@grandsampan.com or use the on-site concierge once the resort is operational. Sales inquiries are handled by the Grand Sampan ownership team.',
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

  async create(data: { question: string; answer: string }): Promise<FaqEntry> {
    await this.ensureSeeded();
    const items = await this.list();
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const now = new Date();
    const record: FaqEntry = {
      id: genId(),
      question: data.question.trim(),
      answer: data.answer.trim(),
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

  async update(id: string, data: { question?: string; answer?: string }): Promise<FaqEntry> {
    await this.ensureSeeded();
    if (this.db) {
      const current = await this.db.faqEntry.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('faq_not_found');
      return this.db.faqEntry.update({
        where: { id },
        data: {
          ...(data.question !== undefined ? { question: data.question.trim() } : {}),
          ...(data.answer !== undefined ? { answer: data.answer.trim() } : {})
        }
      });
    }
    const idx = this.memory.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('faq_not_found');
    this.memory[idx] = {
      ...this.memory[idx],
      ...(data.question !== undefined ? { question: data.question.trim() } : {}),
      ...(data.answer !== undefined ? { answer: data.answer.trim() } : {}),
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
}
