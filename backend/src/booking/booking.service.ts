import { Injectable } from "@nestjs/common";
import { Booking, PaymentScheduleItem } from "../domain/models";
import { BookingRepository } from "./booking.repository";
import { TimesharesService } from "../timeshares/timeshares.service";
import { SuitesService } from "../suites/suites.service";
import { PromotionsService } from "../promotions/promotions.service";
import { prisma } from "../../prisma/client";

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
  private promotions = new PromotionsService();
  private locks = new Set<string>();
  private prisma = process.env.DATABASE_URL ? prisma : null;

  async listByInvestor(investorId: string) {
    if (this.prisma) {
      const bookings = await this.prisma.booking.findMany({
        where: { investorId },
        orderBy: { start: "desc" },
      });
      return this.enrich(bookings);
    }
    const bookings = await this.repo.listByInvestor(investorId);
    return this.enrich(bookings);
  }

  async listAll() {
    if (this.prisma) {
      const bookings = await this.prisma.booking.findMany({
        orderBy: { start: "desc" },
      });
      return this.enrich(bookings);
    }
    return this.enrich(await this.repo.listAll());
  }

  private async enrich(bookings: any[]) {
    const suiteIds = Array.from(new Set(bookings.map((b) => b.suiteId)));
    const planIds = Array.from(
      new Set(bookings.map((b) => b.planId).filter(Boolean)),
    );
    const suites = await Promise.all(suiteIds.map((id) => this.suites.get(id)));
    const plans = await Promise.all(
      planIds.map((id) => (id ? this.timeshares.get(id as string) : null)),
    );
    const suiteById = Object.fromEntries(
      (suites || []).filter(Boolean).map((s: any) => [s.id, s]),
    );
    const planById = Object.fromEntries(
      (plans || []).filter(Boolean).map((p: any) => [p.id, p]),
    );
    return bookings.map((b) => ({
      booking: b,
      suite: suiteById[b.suiteId] || null,
      plan: b.planId ? planById[b.planId] || null : null,
    }));
  }

  async summary(id: string) {
    if (this.prisma) {
      const booking = await this.prisma.booking.findUnique({ where: { id } });
      if (!booking) return null;
      const items = await this.prisma.paymentScheduleItem.findMany({
        where: { bookingId: id },
      });
      const paidTotal = items
        .filter((i: any) => i.status === "paid")
        .reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const outstanding = (booking.amountTotal || 0) - paidTotal;
      const dueItems = items
        .filter((i: any) => i.status === "due")
        .sort(
          (a: any, b: any) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );
      const nextDue = dueItems[0] || null;
      const handoverDate = new Date(booking.end).toISOString();
      return { booking, paidTotal, outstanding, nextDue, handoverDate };
    }
    const booking = await this.repo.findById(id);
    if (!booking) return null;
    const items = booking.schedule || [];
    const paidTotal = items
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + (i.amount || 0), 0);
    const outstanding = (booking.amountTotal || 0) - paidTotal;
    const dueItems = items
      .filter((i) => i.status === "due")
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
    const nextDue = dueItems[0] || null;
    const handoverDate = new Date(booking.end).toISOString();
    return { booking, paidTotal, outstanding, nextDue, handoverDate };
  }

  async availability(suiteId: string, start: string, end: string) {
    // Stay availability ignores share-plan investment bookings.
    let conflict = false;
    if (this.prisma) {
      const list = await this.prisma.booking.findMany({
        where: {
          suiteId,
          planId: null,
          start: { lte: new Date(end) },
          end: { gte: new Date(start) },
        },
      });
      conflict = list.length > 0;
    } else {
      const existing = await this.repo.listBySuite(suiteId);
      conflict = existing
        .filter((b) => !b.planId)
        .some((b) => overlaps(start, end, b.start, b.end));
    }
    return { available: !conflict };
  }

  /**
   * Create a booking. Investment purchases MUST pass planId (FK to SharePlan).
   * Guest stay bookings omit planId.
   */
  /** Remaining balance after booking + downpayment is always paid over 24 months. */
  static readonly INSTALLMENT_MONTHS = 24;
  static readonly DEPOSIT_PCT = 0.1;
  static readonly DOWNPAYMENT_PCT = 0.2;

  async book(
    suiteId: string,
    planId: string | undefined,
    start: string,
    end: string,
    investorId?: string,
    cadence: 'monthly' | 'quarterly' = 'monthly',
  ) {
    const normalizedPlanId = planId?.trim() || undefined;
    const payCadence = cadence === 'quarterly' ? 'quarterly' : 'monthly';
    const lockKey = normalizedPlanId
      ? `plan:${normalizedPlanId}`
      : `stay:${suiteId}`;
    if (this.locks.has(lockKey)) {
      return { ok: false as const, error: 'busy' };
    }
    this.locks.add(lockKey);
    try {
      const suite = await this.suites.get(suiteId);
      if (!suite) return { ok: false as const, error: 'suite_not_found' };

      if (normalizedPlanId) {
        const plan = await this.timeshares.get(normalizedPlanId);
        if (!plan) return { ok: false as const, error: 'plan_not_found' };
        if (plan.suiteId && plan.suiteId !== suiteId) {
          return { ok: false as const, error: 'plan_suite_mismatch' };
        }
        const planStatus = String(
          (plan as any).planStatus || 'Unsold',
        ).toLowerCase();
        if (planStatus !== 'unsold') {
          return { ok: false as const, error: 'plan_not_available' };
        }
        // Re-validate any live promotion server-side; never trust client-sent prices.
        const discount = await this.promotions.discountForPlan(
          plan,
          (suite as any)?.type ?? null,
        );
        const total = discount ? discount.discountedPrice : plan.price;
        const schedule = this.generateSchedule(
          total,
          new Date(start),
          BookingService.INSTALLMENT_MONTHS,
          payCadence,
        );
        const b: Booking = {
          id: 'B-' + Math.random().toString(36).slice(2, 8),
          suiteId,
          planId: normalizedPlanId,
          investorId,
          start,
          end,
          status: 'pending',
          amountTotal: total,
          schedule,
          currency: 'BDT',
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
                amountTotal: b.amountTotal || null,
              },
            }),
            this.prisma.paymentScheduleItem.createMany({
              data: schedule.map((s) => ({
                id: s.id,
                bookingId: b.id,
                type: s.type,
                dueDate: new Date(s.dueDate),
                amount: s.amount,
                status: s.status,
                gatewayRef: s.gatewayRef || null,
              })),
            }),
            this.prisma.sharePlan.update({
              where: { id: normalizedPlanId },
              data: { planStatus: 'Booked' },
            }),
          ]);
          return { ok: true as const, booking: b };
        }
        const created = await this.repo.create(b);
        await this.timeshares.update(normalizedPlanId, {
          planStatus: 'Booked',
        } as any);
        return { ok: true as const, booking: created };
      }

      const av = await this.availability(suiteId, start, end);
      if (!av.available) return { ok: false as const, error: 'conflict' };
      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(end).getTime() - new Date(start).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const nightly = Math.max(
        5000,
        Math.round((suite.totalPrice || 100000) / 365),
      );
      const total = nights * nightly;
      const schedule: PaymentScheduleItem[] = [
        {
          id: 'PS-' + Math.random().toString(36).slice(2, 8),
          bookingId: 'tmp',
          type: 'deposit',
          dueDate: new Date(start).toISOString(),
          amount: total,
          status: 'due',
          currency: 'BDT',
        },
      ];
      const b: Booking = {
        id: 'B-' + Math.random().toString(36).slice(2, 8),
        suiteId,
        planId: undefined,
        investorId,
        start,
        end,
        status: 'pending',
        amountTotal: total,
        schedule,
        currency: 'BDT',
      };
      if (this.prisma) {
        await this.prisma.$transaction([
          this.prisma.booking.create({
            data: {
              id: b.id,
              suiteId: b.suiteId,
              planId: null,
              investorId: b.investorId,
              start: new Date(b.start),
              end: new Date(b.end),
              status: b.status,
              amountTotal: b.amountTotal || null,
            },
          }),
          this.prisma.paymentScheduleItem.createMany({
            data: schedule.map((s) => ({
              id: s.id,
              bookingId: b.id,
              type: s.type,
              dueDate: new Date(s.dueDate),
              amount: s.amount,
              status: s.status,
              gatewayRef: null,
            })),
          }),
        ]);
        return { ok: true as const, booking: b };
      }
      return { ok: true as const, booking: await this.repo.create(b) };
    } finally {
      this.locks.delete(lockKey);
    }
  }

  /**
   * Schedule: booking (10%) today → downpayment (20%) in 3 months →
   * remaining 70% as monthly (24) or quarterly (8) installments over 24 months.
   */
  private generateSchedule(
    total: number,
    anchor: Date,
    durationMonths: number,
    cadence: 'monthly' | 'quarterly',
  ) {
    const months = Math.max(1, durationMonths || BookingService.INSTALLMENT_MONTHS);
    const deposit = Math.round(total * BookingService.DEPOSIT_PCT * 100) / 100;
    const down = Math.round(total * BookingService.DOWNPAYMENT_PCT * 100) / 100;
    const remainder = Math.round((total - deposit - down) * 100) / 100;
    const items: PaymentScheduleItem[] = [];
    items.push({
      id: 'PS-' + Math.random().toString(36).slice(2, 8),
      bookingId: 'tmp',
      type: 'deposit',
      dueDate: new Date(anchor).toISOString(),
      amount: deposit,
      status: 'due',
      currency: 'BDT',
    });
    const downDate = new Date(anchor);
    downDate.setMonth(downDate.getMonth() + 3);
    items.push({
      id: 'PS-' + Math.random().toString(36).slice(2, 8),
      bookingId: 'tmp',
      type: 'downpayment',
      dueDate: downDate.toISOString(),
      amount: down,
      status: 'due',
      currency: 'BDT',
    });
    const stepMonths = cadence === 'monthly' ? 1 : 3;
    const installments =
      cadence === 'monthly' ? months : Math.ceil(months / 3);
    const baseAmount = Math.floor((remainder / installments) * 100) / 100;
    let sum = 0;
    for (let i = 1; i <= installments; i++) {
      const due = new Date(anchor);
      due.setMonth(due.getMonth() + 3 + i * stepMonths);
      const amt =
        i === installments
          ? Math.round((remainder - sum) * 100) / 100
          : baseAmount;
      sum += amt;
      items.push({
        id: 'PS-' + Math.random().toString(36).slice(2, 8),
        bookingId: 'tmp',
        type: 'installment',
        dueDate: due.toISOString(),
        amount: amt,
        status: 'due',
        currency: 'BDT',
      });
    }
    return items;
  }

  async schedule(id: string) {
    if (this.prisma) {
      const items = await this.prisma.paymentScheduleItem.findMany({
        where: { bookingId: id },
      });
      return items || [];
    }
    const b = await this.repo.findById(id);
    if (!b) return null;
    return b.schedule || [];
  }

  async markPaid(bookingId: string, itemId: string, gatewayRef?: string) {
    if (this.prisma) {
      await this.prisma.paymentScheduleItem.update({
        where: { id: itemId },
        data: { status: "paid", gatewayRef },
      });
      return true;
    }
    const b = await this.repo.findById(bookingId);
    if (!b || !b.schedule) return false;
    const idx = b.schedule.findIndex((s) => s.id === itemId);
    if (idx === -1) return false;
    b.schedule[idx] = { ...b.schedule[idx], status: "paid", gatewayRef };
    return true;
  }
}
