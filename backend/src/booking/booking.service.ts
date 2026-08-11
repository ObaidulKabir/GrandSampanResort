import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import {
  Booking,
  BookingDepositPayment,
  BookingKyc,
  DepositMethod,
  PaymentScheduleItem,
} from "../domain/models";
import { BookingRepository } from "./booking.repository";
import { TimesharesService } from "../timeshares/timeshares.service";
import { SuitesService } from "../suites/suites.service";
import { PromotionsService } from "../promotions/promotions.service";
import { MailService, BookingMailContext } from "../mail/mail.service";
import { prisma } from "../../prisma/client";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = new Date(aStart).getTime();
  const aE = new Date(aEnd).getTime();
  const bS = new Date(bStart).getTime();
  const bE = new Date(bEnd).getTime();
  return aS <= bE && bS <= aE;
}

const KYC_FIELDS: (keyof BookingKyc)[] = [
  "name",
  "fatherName",
  "nid",
  "dob",
  "address",
  "permanentAddress",
  "contact",
  "email",
  "picUrl",
  "nomineeName",
  "nomineeNid",
  "nomineePicUrl",
];

function normalizeKyc(kyc?: Partial<BookingKyc> | null): BookingKyc | null {
  if (!kyc) return null;
  const out: any = {};
  for (const key of KYC_FIELDS) {
    const value = String((kyc as any)[key] ?? "").trim();
    if (!value) return null;
    out[key] = value;
  }
  return out as BookingKyc;
}

const DEPOSIT_METHODS: DepositMethod[] = [
  "cheque",
  "cash_payorder",
  "online_transfer",
];

function normalizeDeposit(
  deposit?: Partial<BookingDepositPayment> | null,
): BookingDepositPayment | null {
  if (!deposit) return null;
  const method = String(deposit.depositMethod || "").trim() as DepositMethod;
  const reference = String(deposit.depositReference || "").trim();
  if (!DEPOSIT_METHODS.includes(method) || !reference) return null;
  const proof = String(deposit.depositProofUrl || "").trim();
  const note = String(deposit.depositNote || "").trim();
  return {
    depositMethod: method,
    depositReference: reference,
    ...(proof ? { depositProofUrl: proof } : {}),
    ...(note ? { depositNote: note } : {}),
  };
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private repo = new BookingRepository();
  private timeshares = new TimesharesService();
  private suites = new SuitesService();
  private promotions = new PromotionsService();
  private mail = new MailService();
  private locks = new Set<string>();
  private prisma = process.env.DATABASE_URL ? prisma : null;

  private depositAmountOf(booking: {
    amountTotal?: number | null;
    schedule?: { type: string; amount: number }[] | null;
  }) {
    const fromSchedule = (booking.schedule || []).find((s) => s.type === "deposit");
    if (fromSchedule) return fromSchedule.amount;
    return Math.round((booking.amountTotal || 0) * BookingService.DEPOSIT_PCT);
  }

  private async buildMailContext(
    booking: any,
    client?: any | null,
    plan?: any | null,
    schedule?: { type: string; amount: number }[] | null,
  ): Promise<BookingMailContext | null> {
    const kyc = client || booking?.client || null;
    const to = String(kyc?.email || "").trim();
    if (!to) return null;
    const planRow = plan || (booking.planId ? await this.timeshares.get(booking.planId) : null);
    const sched =
      schedule ||
      booking.schedule ||
      (await this.schedule(booking.id)) ||
      [];
    return {
      to,
      buyerName: kyc?.name || "Investor",
      bookingId: booking.id,
      planName: planRow?.name || booking.planId || "Share plan",
      planId: booking.planId || "",
      suiteId: booking.suiteId || "",
      totalPrice: booking.amountTotal || planRow?.price || 0,
      depositAmount: this.depositAmountOf({
        amountTotal: booking.amountTotal,
        schedule: sched as any,
      }),
      depositMethod: booking.depositMethod || "",
      depositReference: booking.depositReference || "",
      buyerContact: kyc?.contact || "",
      buyerNid: kyc?.nid || "",
      buyerAddress: kyc?.address || "",
      cancellationReason: booking.cancellationReason || undefined,
      startDate: booking.start || null,
      bookedAt: booking.createdAt || booking.depositSubmittedAt || null,
      schedule: (Array.isArray(sched) ? sched : []).map((s: any) => ({
        type: s.type,
        dueDate: s.dueDate,
        amount: Number(s.amount) || 0,
      })),
    };
  }

  private async safeMail(
    label: string,
    fn: () => Promise<unknown>,
  ) {
    try {
      await fn();
    } catch (err: any) {
      this.logger.warn(`Email ${label} failed: ${err?.message || err}`);
    }
  }

  private async loadClient(clientId?: string | null) {
    if (!clientId) return null;
    if (this.prisma) {
      return this.prisma.client.findUnique({ where: { id: clientId } });
    }
    return null;
  }

  private async notifyAfterAdminAction(
    booking: any,
    result: { completed: boolean; depositConfirmed: boolean; kycVerified: boolean },
    kind: "deposit" | "kyc" | "reject",
  ) {
    await this.safeMail(kind, async () => {
      const client = await this.loadClient(booking.clientId);
      const plan = booking.planId ? await this.timeshares.get(booking.planId) : null;
      const schedule = (await this.schedule(booking.id)) || [];
      const ctx = await this.buildMailContext(
        { ...booking, schedule },
        client,
        plan,
        schedule as any,
      );
      if (!ctx) return;
      if (kind === "reject") {
        await this.mail.notifyBookingRejected(ctx);
        return;
      }
      if (result.completed) {
        await this.mail.notifyBookingCompleted(ctx);
        return;
      }
      if (kind === "deposit" && result.depositConfirmed) {
        await this.mail.notifyDepositConfirmed(ctx);
      }
      if (kind === "kyc" && result.kycVerified) {
        await this.mail.notifyKycVerified(ctx);
      }
    });
  }

  async listByInvestor(investorId: string) {
    if (this.prisma) {
      const bookings = await this.prisma.booking.findMany({
        where: { investorId },
        orderBy: { createdAt: "desc" },
      });
      return this.enrich(bookings);
    }
    const bookings = await this.repo.listByInvestor(investorId);
    return this.enrich(
      [...bookings].sort(
        (a, b) =>
          new Date(b.createdAt || b.depositSubmittedAt || b.start).getTime() -
          new Date(a.createdAt || a.depositSubmittedAt || a.start).getTime(),
      ),
    );
  }

  async listAll() {
    if (this.prisma) {
      const bookings = await this.prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
      });
      return this.enrich(bookings);
    }
    const bookings = await this.repo.listAll();
    return this.enrich(
      [...bookings].sort(
        (a, b) =>
          new Date(b.createdAt || b.depositSubmittedAt || b.start).getTime() -
          new Date(a.createdAt || a.depositSubmittedAt || a.start).getTime(),
      ),
    );
  }

  private async enrich(bookings: any[]) {
    const suiteIds = Array.from(new Set(bookings.map((b) => b.suiteId)));
    const planIds = Array.from(
      new Set(bookings.map((b) => b.planId).filter(Boolean)),
    );
    const clientIds = Array.from(
      new Set(bookings.map((b) => b.clientId).filter(Boolean)),
    );
    const investorIds = Array.from(
      new Set(bookings.map((b) => b.investorId).filter(Boolean)),
    );
    const suites = await Promise.all(suiteIds.map((id) => this.suites.get(id)));
    const plans = await Promise.all(
      planIds.map((id) => (id ? this.timeshares.get(id as string) : null)),
    );
    let clients: any[] = [];
    let investors: any[] = [];
    if (this.prisma) {
      if (clientIds.length) {
        clients = await this.prisma.client.findMany({
          where: { id: { in: clientIds as string[] } },
        });
      }
      if (investorIds.length) {
        investors = await this.prisma.user.findMany({
          where: { id: { in: investorIds as string[] } },
          select: { id: true, name: true, email: true },
        });
      }
    }
    const suiteById = Object.fromEntries(
      (suites || []).filter(Boolean).map((s: any) => [s.id, s]),
    );
    const planById = Object.fromEntries(
      (plans || []).filter(Boolean).map((p: any) => [p.id, p]),
    );
    const clientById = Object.fromEntries(
      (clients || []).filter(Boolean).map((c: any) => [c.id, c]),
    );
    const investorById = Object.fromEntries(
      (investors || []).filter(Boolean).map((u: any) => [u.id, u]),
    );
    return bookings.map((b) => ({
      booking: b,
      suite: suiteById[b.suiteId] || null,
      plan: b.planId ? planById[b.planId] || null : null,
      client: b.clientId ? clientById[b.clientId] || null : null,
      investor: b.investorId
        ? investorById[b.investorId] || {
            id: b.investorId,
            name: null,
            email: null,
          }
        : null,
    }));
  }

  async summary(id: string) {
    if (this.prisma) {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { client: true },
      });
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
      const { client, ...bookingRow } = booking as any;
      const [suite, plan, investor] = await Promise.all([
        this.suites.get(booking.suiteId),
        booking.planId ? this.timeshares.get(booking.planId) : null,
        booking.investorId
          ? this.prisma.user.findUnique({
              where: { id: booking.investorId },
              select: { id: true, name: true, email: true },
            })
          : null,
      ]);
      return {
        booking: bookingRow,
        client: client || null,
        suite: suite || null,
        plan: plan || null,
        investor: investor || (booking.investorId
          ? { id: booking.investorId, name: null, email: null }
          : null),
        paidTotal,
        outstanding,
        nextDue,
        handoverDate,
      };
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
    const suite = await this.suites.get(booking.suiteId);
    const plan = booking.planId ? await this.timeshares.get(booking.planId) : null;
    return {
      booking,
      client: (booking as any).client || null,
      suite: suite || null,
      plan: plan || null,
      investor: booking.investorId
        ? { id: booking.investorId, name: null, email: null }
        : null,
      paidTotal,
      outstanding,
      nextDue,
      handoverDate,
    };
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
    kyc?: BookingKyc | null,
    deposit?: BookingDepositPayment | null,
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
        const normalizedKyc = normalizeKyc(kyc);
        if (!normalizedKyc) {
          return { ok: false as const, error: 'kyc_required' };
        }
        const normalizedDeposit = normalizeDeposit(deposit);
        if (!normalizedDeposit) {
          return { ok: false as const, error: 'deposit_payment_required' };
        }
        if (investorId && this.prisma) {
          const investor = await this.prisma.user.findUnique({
            where: { id: investorId },
            select: { emailVerified: true, role: true },
          });
          if (!investor) {
            return { ok: false as const, error: 'investor_not_found' };
          }
          if (investor.role !== 'admin' && !investor.emailVerified) {
            return { ok: false as const, error: 'email_not_verified' };
          }
        }
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
        const clientId = 'C-' + Math.random().toString(36).slice(2, 10);
        const submittedAt = new Date().toISOString();
        const b: Booking = {
          id: 'B-' + Math.random().toString(36).slice(2, 8),
          suiteId,
          planId: normalizedPlanId,
          investorId,
          clientId,
          start,
          end,
          status: 'awaiting_payment',
          amountTotal: total,
          depositMethod: normalizedDeposit.depositMethod,
          depositReference: normalizedDeposit.depositReference,
          depositProofUrl: normalizedDeposit.depositProofUrl,
          depositNote: normalizedDeposit.depositNote,
          depositSubmittedAt: submittedAt,
          createdAt: submittedAt,
          kycVerified: false,
          schedule,
          currency: 'BDT',
        };
        if (this.prisma) {
          await this.prisma.$transaction([
            this.prisma.client.create({
              data: {
                id: clientId,
                ...normalizedKyc,
              },
            }),
            this.prisma.booking.create({
              data: {
                id: b.id,
                suiteId: b.suiteId,
                planId: b.planId,
                investorId: b.investorId,
                clientId,
                start: new Date(b.start),
                end: new Date(b.end),
                status: b.status,
                amountTotal: b.amountTotal || null,
                depositMethod: b.depositMethod || null,
                depositReference: b.depositReference || null,
                depositProofUrl: b.depositProofUrl || null,
                depositNote: b.depositNote || null,
                depositSubmittedAt: new Date(submittedAt),
                createdAt: new Date(submittedAt),
                kycVerified: false,
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
              data: { planStatus: 'Reserved' },
            }),
          ]);
          const client = { id: clientId, ...normalizedKyc };
          await this.safeMail('booking_submitted', async () => {
            const ctx = await this.buildMailContext(b, client, plan, schedule);
            if (ctx) await this.mail.notifyBookingSubmitted(ctx);
          });
          return { ok: true as const, booking: b, client };
        }
        const created = await this.repo.create({
          ...b,
          client: { id: clientId, ...normalizedKyc },
        } as any);
        await this.timeshares.update(normalizedPlanId, {
          planStatus: 'Reserved',
        } as any);
        const client = { id: clientId, ...normalizedKyc };
        await this.safeMail('booking_submitted', async () => {
          const ctx = await this.buildMailContext(created, client, plan, schedule);
          if (ctx) await this.mail.notifyBookingSubmitted(ctx);
        });
        return {
          ok: true as const,
          booking: created,
          client,
        };
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
      const createdAt = new Date().toISOString();
      const b: Booking = {
        id: 'B-' + Math.random().toString(36).slice(2, 8),
        suiteId,
        planId: undefined,
        investorId,
        start,
        end,
        status: 'pending',
        amountTotal: total,
        createdAt,
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
              createdAt: new Date(createdAt),
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

  private isPendingAdminReview(status: string) {
    return status === "awaiting_payment" || status === "awaiting_kyc";
  }

  /** Complete booking only when deposit is confirmed AND KYC is verified. */
  private async finalizeIfReady(booking: {
    id: string;
    planId?: string | null;
    kycVerified?: boolean | null;
    depositConfirmedAt?: Date | string | null;
  }) {
    const depositOk = !!booking.depositConfirmedAt;
    const kycOk = !!booking.kycVerified;
    if (!depositOk || !kycOk || !booking.planId) {
      return {
        completed: false as const,
        status: depositOk ? ("awaiting_kyc" as const) : ("awaiting_payment" as const),
      };
    }
    if (this.prisma) {
      await this.prisma.$transaction([
        this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: "confirmed" },
        }),
        this.prisma.sharePlan.update({
          where: { id: booking.planId },
          data: { planStatus: "Booked" },
        }),
      ]);
    } else {
      const mem = await this.repo.findById(booking.id);
      if (mem) {
        mem.status = "confirmed";
        await this.timeshares.update(booking.planId, { planStatus: "Booked" } as any);
      }
    }
    return { completed: true as const, status: "confirmed" as const };
  }

  /** Admin confirms offline deposit receipt / bank encashment. */
  async confirmDeposit(bookingId: string) {
    if (this.prisma) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) return { ok: false as const, error: "not_found" };
      if (!this.isPendingAdminReview(booking.status)) {
        return { ok: false as const, error: "not_pending_review" };
      }
      if (!booking.planId) {
        return { ok: false as const, error: "not_investment" };
      }
      if (booking.depositConfirmedAt) {
        const ready = await this.finalizeIfReady(booking);
        const out = {
          ok: true as const,
          completed: ready.completed,
          status: ready.status,
          depositConfirmed: true,
          kycVerified: !!booking.kycVerified,
        };
        await this.notifyAfterAdminAction(booking, out, "deposit");
        return out;
      }
      const deposit = await this.prisma.paymentScheduleItem.findFirst({
        where: { bookingId, type: "deposit" },
        orderBy: { dueDate: "asc" },
      });
      if (!deposit) return { ok: false as const, error: "deposit_not_found" };
      const gatewayRef = `admin-confirmed:${booking.depositMethod || "unknown"}:${booking.depositReference || ""}`;
      const confirmedAt = new Date();
      const nextStatus = booking.kycVerified ? "confirmed" : "awaiting_kyc";
      const ops: any[] = [
        this.prisma.paymentScheduleItem.update({
          where: { id: deposit.id },
          data: { status: "paid", gatewayRef },
        }),
        this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            depositConfirmedAt: confirmedAt,
            status: nextStatus,
          },
        }),
      ];
      if (booking.kycVerified) {
        ops.push(
          this.prisma.sharePlan.update({
            where: { id: booking.planId },
            data: { planStatus: "Booked" },
          }),
        );
      }
      await this.prisma.$transaction(ops);
      const out = {
        ok: true as const,
        completed: !!booking.kycVerified,
        status: nextStatus,
        depositConfirmed: true,
        kycVerified: !!booking.kycVerified,
      };
      await this.notifyAfterAdminAction(
        { ...booking, depositConfirmedAt: confirmedAt, status: nextStatus },
        out,
        "deposit",
      );
      return out;
    }

    const booking = await this.repo.findById(bookingId);
    if (!booking) return { ok: false as const, error: "not_found" };
    if (!this.isPendingAdminReview(booking.status)) {
      return { ok: false as const, error: "not_pending_review" };
    }
    if (!booking.planId) {
      return { ok: false as const, error: "not_investment" };
    }
    const deposit = (booking.schedule || []).find((s) => s.type === "deposit");
    if (!deposit) return { ok: false as const, error: "deposit_not_found" };
    if (!booking.depositConfirmedAt) {
      deposit.status = "paid";
      deposit.gatewayRef = `admin-confirmed:${booking.depositMethod || "unknown"}:${booking.depositReference || ""}`;
      booking.depositConfirmedAt = new Date().toISOString();
    }
    const ready = await this.finalizeIfReady(booking);
    booking.status = ready.status;
    const out = {
      ok: true as const,
      completed: ready.completed,
      status: ready.status,
      depositConfirmed: true,
      kycVerified: !!booking.kycVerified,
    };
    await this.notifyAfterAdminAction(booking, out, "deposit");
    return out;
  }

  /** Admin marks per-booking KYC as valid. Completes booking if deposit already confirmed. */
  async verifyKyc(bookingId: string) {
    if (this.prisma) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) return { ok: false as const, error: "not_found" };
      if (!this.isPendingAdminReview(booking.status)) {
        return { ok: false as const, error: "not_pending_review" };
      }
      if (!booking.planId) {
        return { ok: false as const, error: "not_investment" };
      }
      if (!booking.clientId) {
        return { ok: false as const, error: "kyc_missing" };
      }
      const verifiedAt = new Date();
      const depositOk = !!booking.depositConfirmedAt;
      const nextStatus = depositOk ? "confirmed" : "awaiting_payment";
      const ops: any[] = [
        this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            kycVerified: true,
            kycVerifiedAt: verifiedAt,
            status: nextStatus,
          },
        }),
      ];
      if (depositOk) {
        ops.push(
          this.prisma.sharePlan.update({
            where: { id: booking.planId },
            data: { planStatus: "Booked" },
          }),
        );
      }
      await this.prisma.$transaction(ops);
      const out = {
        ok: true as const,
        completed: depositOk,
        status: nextStatus,
        depositConfirmed: depositOk,
        kycVerified: true,
      };
      await this.notifyAfterAdminAction(
        { ...booking, kycVerified: true, kycVerifiedAt: verifiedAt, status: nextStatus },
        out,
        "kyc",
      );
      return out;
    }

    const booking = await this.repo.findById(bookingId);
    if (!booking) return { ok: false as const, error: "not_found" };
    if (!this.isPendingAdminReview(booking.status)) {
      return { ok: false as const, error: "not_pending_review" };
    }
    if (!booking.planId) {
      return { ok: false as const, error: "not_investment" };
    }
    if (!booking.clientId && !(booking as any).client) {
      return { ok: false as const, error: "kyc_missing" };
    }
    booking.kycVerified = true;
    booking.kycVerifiedAt = new Date().toISOString();
    const ready = await this.finalizeIfReady(booking);
    booking.status = ready.status;
    const out = {
      ok: true as const,
      completed: ready.completed,
      status: ready.status,
      depositConfirmed: !!booking.depositConfirmedAt,
      kycVerified: true,
    };
    await this.notifyAfterAdminAction(booking, out, "kyc");
    return out;
  }

  private canCancelInvestment(status: string) {
    return (
      status === "awaiting_payment" ||
      status === "awaiting_kyc" ||
      status === "confirmed"
    );
  }

  private shouldReleasePlan(planStatus?: string | null) {
    const st = String(planStatus || "").toLowerCase();
    return st === "reserved" || st === "booked";
  }

  /**
   * Admin cancels an investment booking with a required reason.
   * Releases Reserved/Booked plans back to Unsold.
   */
  async cancelBooking(bookingId: string, reason: string) {
    const cleaned = String(reason || "").trim();
    if (!cleaned) return { ok: false as const, error: "reason_required" };
    if (cleaned.length > 1000) return { ok: false as const, error: "reason_too_long" };
    const cancelledAt = new Date();

    if (this.prisma) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) return { ok: false as const, error: "not_found" };
      if (!booking.planId) return { ok: false as const, error: "not_investment_booking" };
      if (booking.status === "cancelled") {
        return { ok: false as const, error: "already_cancelled" };
      }
      if (!this.canCancelInvestment(booking.status)) {
        return { ok: false as const, error: "not_cancellable" };
      }

      const ops: any[] = [
        this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "cancelled",
            cancellationReason: cleaned,
            cancelledAt,
          },
        }),
      ];
      const plan = await this.prisma.sharePlan.findUnique({
        where: { id: booking.planId },
      });
      if (plan && this.shouldReleasePlan(plan.planStatus)) {
        ops.push(
          this.prisma.sharePlan.update({
            where: { id: booking.planId },
            data: { planStatus: "Unsold" },
          }),
        );
      }
      await this.prisma.$transaction(ops);

      const updated = {
        ...booking,
        status: "cancelled",
        cancellationReason: cleaned,
        cancelledAt,
      };
      await this.notifyAfterAdminAction(
        updated,
        {
          completed: false,
          depositConfirmed: !!booking.depositConfirmedAt,
          kycVerified: !!booking.kycVerified,
        },
        "reject",
      );
      return {
        ok: true as const,
        status: "cancelled" as const,
        planReleased: !!(plan && this.shouldReleasePlan(plan.planStatus)),
      };
    }

    const booking = await this.repo.findById(bookingId);
    if (!booking) return { ok: false as const, error: "not_found" };
    if (!booking.planId) return { ok: false as const, error: "not_investment_booking" };
    if (booking.status === "cancelled") {
      return { ok: false as const, error: "already_cancelled" };
    }
    if (!this.canCancelInvestment(booking.status)) {
      return { ok: false as const, error: "not_cancellable" };
    }

    booking.status = "cancelled";
    booking.cancellationReason = cleaned;
    booking.cancelledAt = cancelledAt.toISOString();
    let planReleased = false;
    const plan = await this.timeshares.get(booking.planId);
    if (plan && this.shouldReleasePlan((plan as any).planStatus)) {
      await this.timeshares.update(booking.planId, { planStatus: "Unsold" } as any);
      planReleased = true;
    }
    await this.notifyAfterAdminAction(
      booking,
      {
        completed: false,
        depositConfirmed: !!booking.depositConfirmedAt,
        kycVerified: !!booking.kycVerified,
      },
      "reject",
    );
    return { ok: true as const, status: "cancelled" as const, planReleased };
  }

  /** @deprecated Prefer cancelBooking — kept for older admin clients. */
  async rejectDeposit(bookingId: string, reason?: string) {
    return this.cancelBooking(bookingId, reason || "");
  }
}
