import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { TermsParagraph } from '../domain/models';

function genId() {
  return 'TRM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const DEFAULT_TERMS: Omit<TermsParagraph, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '1. Definitions',
    body:
      '• “Guest” means a person staying at the resort.\n• “Investor” means a person who purchases a share plan or unit.\n• “Services” include accommodation, amenities, and related offerings.',
    order: 0
  },
  {
    title: '2. Bookings and Payments',
    body:
      '• All bookings are subject to availability and confirmation.\n• Deposits, downpayment, and installment schedules must be paid by due dates.\n• Failure to pay on time may result in suspension of entitlements until rectified.',
    order: 1
  },
  {
    title: '3. Investor Entitlements',
    body:
      '• Investors receive usage days per month consistent with the selected plan.\n• Revenue share, if applicable, is calculated per policy and may be adjusted.\n• Transfer or resale is subject to company review and compliance.',
    order: 2
  },
  {
    title: '4. Conduct and Safety',
    body:
      '• Guests and investors must follow resort rules and local regulations.\n• Damage to property may incur repair costs payable by the responsible party.\n• Safety guidelines for beach access and common areas must be respected.',
    order: 3
  },
  {
    title: '5. Cancellation and Refunds',
    body:
      '• Cancellations are processed per booking policy and plan terms.\n• Refund eligibility depends on notice period and service usage.',
    order: 4
  },
  {
    title: '6. Privacy',
    body:
      '• Personal data is handled per privacy policy and applicable law.\n• Security measures are maintained to protect user information.',
    order: 5
  },
  {
    title: '7. Changes to Terms',
    body:
      'The company may update these terms periodically. Continued use of services indicates acceptance of changes.',
    order: 6
  },
  {
    title: '8. Contact',
    body: 'For questions or support: info@grandsampan.com • +880 17 0000 0000',
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

  async create(data: { title: string; body: string }): Promise<TermsParagraph> {
    await this.ensureSeeded();
    const items = await this.list();
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const now = new Date();
    const record: TermsParagraph = {
      id: genId(),
      title: data.title.trim(),
      body: data.body.trim(),
      order,
      createdAt: now,
      updatedAt: now
    };
    if (this.db) return this.db.termsParagraph.create({ data: record });
    this.memory.push(record);
    return record;
  }

  async update(id: string, data: { title?: string; body?: string }): Promise<TermsParagraph> {
    await this.ensureSeeded();
    if (this.db) {
      const current = await this.db.termsParagraph.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('terms_not_found');
      return this.db.termsParagraph.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title.trim() } : {}),
          ...(data.body !== undefined ? { body: data.body.trim() } : {})
        }
      });
    }
    const idx = this.memory.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('terms_not_found');
    this.memory[idx] = {
      ...this.memory[idx],
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.body !== undefined ? { body: data.body.trim() } : {}),
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

    const a = items[idx];
    const b = items[swapWith];
    const aOrder = a.order;
    const bOrder = b.order;

    if (this.db) {
      await this.db.termsParagraph.update({ where: { id: a.id }, data: { order: bOrder } });
      await this.db.termsParagraph.update({ where: { id: b.id }, data: { order: aOrder } });
      return this.list();
    }
    this.memory = this.memory.map((item) => {
      if (item.id === a.id) return { ...item, order: bOrder, updatedAt: new Date() };
      if (item.id === b.id) return { ...item, order: aOrder, updatedAt: new Date() };
      return item;
    });
    return this.list();
  }
}
