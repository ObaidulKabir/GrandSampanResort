import { Injectable } from '@nestjs/common';
import { Booking, PaymentScheduleItem } from '../domain/models';
import { BookingRepository } from './booking.repository';
import { TimesharesService } from '../timeshares/timeshares.service';
import { SuitesService } from '../suites/suites.service';
import { PrismaClient } from '@prisma/client';

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = new Date(aStart).getTime();
  const aE = new Date(aEnd).getTime();
  const bS = new Date(bStart).getTime();
  const bE = new Date(bEnd).getTime();
  return aS <= bE && bS <= aE;
}

@Injectable()
export class BookingService {
  private repo = new BookingRepository();
  private timeshares = new TimesharesService();
  private suites = new SuitesService();
  private locks = new Set<string>();
  private prisma: PrismaClient | null = process.env.DATABASE_URL ? new PrismaClient() : null;

  async availability(suiteId: string, start: string, end: string) {
    let conflict = false;
    if (this.prisma) {
      const list = await this.prisma.booking.findMany({
        where: {
          suiteId,
          start: { lte: new Date(end) },
          end: { gte: new Date(start) }
        }
      });
      conflict = list.length > 0;
    } else {
      const existing = await this.repo.listBySuite(suiteId);
      conflict = existing.some((b) => overlaps(start, end, b.start, b.end));
    }
    return { available: !conflict };
  }

  async book(suiteId: string, planId: string, start: string, end: string, investorId?: string) {
    if (this.locks.has(suiteId)) return null;
    this.locks.add(suiteId);
    try {
      const av = await this.availability(suiteId, start, end);
      if (!av.available) return null;
      const plan = await this.timeshares.get(planId);
      if (!plan) return null;
      const suite = await this.suites.get(suiteId);
      if (!suite) return null;
      const total = plan.price;
      const schedule = this.generateSchedule(total, new Date(start), plan.lockIn, 'monthly');
      const b: Booking = {
        id: 'B-' + Math.random().toString(36).slice(2, 8),
        suiteId,
        planId,
        investorId,
        start,
        end,
        status: 'pending',
        amountTotal: total,
        schedule,
        currency: 'BDT'
      };
      if (this.prisma) {
        await this.prisma.$transaction([
          this.prisma.booking.create({
            data: {
              id: b.id,
              suiteId: b.suiteId,
              planId: b.planId,
              investorId: b.investorId,
              start: new Date(b.start),
              end: new Date(b.end),
              status: b.status,
              amountTotal: b.amountTotal || null
            }
          }),
          this.prisma.paymentScheduleItem.createMany({
            data: schedule.map((s) => ({
              id: s.id,
              bookingId: b.id,
              type: s.type,
              dueDate: new Date(s.dueDate),
              amount: s.amount,
              status: s.status,
              gatewayRef: s.gatewayRef || null
            }))
          })
        ]);
        return b;
      }
      const created = await this.repo.create(b);
      return created;
    } finally {
      this.locks.delete(suiteId);
    }
  }

  private generateSchedule(total: number, anchor: Date, durationMonths: number, cadence: 'monthly' | 'quarterly') {
    const deposit = Math.round(total * 0.10 * 100) / 100;
    const down = Math.round(total * 0.20 * 100) / 100;
    const remainder = Math.round((total - deposit - down) * 100) / 100;
    const items: PaymentScheduleItem[] = [];
    const bookingId = 'tmp';
    items.push({
      id: 'PS-' + Math.random().toString(36).slice(2, 8),
      bookingId,
      type: 'deposit',
      dueDate: new Date(anchor).toISOString(),
      amount: deposit,
      status: 'due',
      currency: 'BDT'
    });
    const downDate = new Date(anchor);
    downDate.setMonth(downDate.getMonth() + 3);
    items.push({
      id: 'PS-' + Math.random().toString(36).slice(2, 8),
      bookingId,
      type: 'downpayment',
      dueDate: downDate.toISOString(),
      amount: down,
      status: 'due',
      currency: 'BDT'
    });
    const stepMonths = cadence === 'monthly' ? 1 : 3;
    const installments = cadence === 'monthly' ? durationMonths : Math.ceil(durationMonths / 3);
    const baseAmount = Math.floor((remainder / installments) * 100) / 100;
    let sum = 0;
    for (let i = 1; i <= installments; i++) {
      const due = new Date(anchor);
      due.setMonth(due.getMonth() + 3 + i * stepMonths);
      const amt = i === installments ? Math.round((remainder - sum) * 100) / 100 : baseAmount;
      sum += amt;
      items.push({
        id: 'PS-' + Math.random().toString(36).slice(2, 8),
        bookingId,
        type: 'installment',
        dueDate: due.toISOString(),
        amount: amt,
        status: 'due',
        currency: 'BDT'
      });
    }
    return items;
  }

  async schedule(id: string) {
    if (this.prisma) {
      const items = await this.prisma.paymentScheduleItem.findMany({ where: { bookingId: id } });
      return items || [];
    }
    const b = await this.repo.findById(id);
    if (!b) return null;
    return b.schedule || [];
  }

  async markPaid(bookingId: string, itemId: string, gatewayRef?: string) {
    if (this.prisma) {
      await this.prisma.paymentScheduleItem.update({ where: { id: itemId }, data: { status: 'paid', gatewayRef } });
      return true;
    }
    const b = await this.repo.findById(bookingId);
    if (!b || !b.schedule) return false;
    const idx = b.schedule.findIndex((s) => s.id === itemId);
    if (idx === -1) return false;
    b.schedule[idx] = { ...b.schedule[idx], status: 'paid', gatewayRef };
    return true;
  }
}

