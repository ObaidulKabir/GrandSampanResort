import { Injectable } from '@nestjs/common';
import { SuitesRepository } from './suites.repository';
import { Suite } from '../domain/models';
import { prisma } from '../../prisma/client';
import { TimesharesRepository } from '../timeshares/timeshares.repository';

type PlanLike = {
  id: string;
  price?: number | null;
  planStatus?: string | null;
  planType?: string | null;
  daysPerMonth?: number | null;
  timeFraction?: number | null;
};

@Injectable()
export class SuitesService {
  private repo = new SuitesRepository();
  private plansRepo = new TimesharesRepository();
  private prisma = process.env.DATABASE_URL ? prisma : null;

  async list() {
    if (this.prisma) return this.prisma.suite.findMany();
    return this.repo.findAll();
  }

  async get(id: string) {
    if (this.prisma) return this.prisma.suite.findUnique({ where: { id } });
    return this.repo.findById(id);
  }

  async create(item: Suite) {
    if (this.prisma) {
      try {
        return { ok: true as const, suite: await this.prisma.suite.create({ data: item }) };
      } catch {
        return { ok: false as const, error: 'conflict' };
      }
    }
    const existing = await this.repo.findById(item.id);
    if (existing) return { ok: false as const, error: 'conflict' };
    return { ok: true as const, suite: await this.repo.create(item) };
  }

  private isUnsold(status?: string | null) {
    return String(status || 'Unsold').toLowerCase() === 'unsold';
  }

  private planFraction(plan: PlanLike) {
    if (plan.timeFraction != null && Number.isFinite(Number(plan.timeFraction))) {
      return Math.max(0, Number(plan.timeFraction));
    }
    const type = String(plan.planType || 'DPM').toUpperCase();
    const days = Number(plan.daysPerMonth || 0);
    if (type === 'FULL' || days >= 30) return 1;
    return Math.max(0, days / 30);
  }

  /** Scale unsold plan prices when unit totalPrice changes. Sold/reserved plans stay fixed. */
  private nextPlanPrice(plan: PlanLike, oldTotal: number, newTotal: number) {
    if (oldTotal > 0) {
      return Math.round(Number(plan.price || 0) * (newTotal / oldTotal));
    }
    return Math.round(newTotal * this.planFraction(plan));
  }

  private async rescaleUnsoldPlanPrices(suiteId: string, oldTotal: number, newTotal: number) {
    if (!suiteId) return 0;
    if (!Number.isFinite(newTotal) || newTotal < 0) return 0;
    if (Number(oldTotal) === Number(newTotal)) return 0;

    if (this.prisma) {
      const plans = await this.prisma.sharePlan.findMany({ where: { suiteId } });
      let updated = 0;
      for (const plan of plans) {
        if (!this.isUnsold(plan.planStatus)) continue;
        const price = this.nextPlanPrice(plan, Number(oldTotal) || 0, newTotal);
        if (price === plan.price) continue;
        await this.prisma.sharePlan.update({ where: { id: plan.id }, data: { price } });
        updated += 1;
      }
      return updated;
    }

    const plans = await this.plansRepo.findBySuiteId(suiteId);
    let updated = 0;
    for (const plan of plans) {
      if (!this.isUnsold(plan.planStatus)) continue;
      const price = this.nextPlanPrice(plan, Number(oldTotal) || 0, newTotal);
      if (price === plan.price) continue;
      await this.plansRepo.update(plan.id, { price });
      updated += 1;
    }
    return updated;
  }

  /**
   * Update suite fields. When `id` in the patch differs from the current PK,
   * rename the suite and re-point plans / media / bookings to the new ID.
   * When totalPrice changes, unsold plan prices are rescaled proportionally.
   */
  async update(id: string, item: Partial<Suite> & { id?: string }) {
    const nextId = (item.id !== undefined ? String(item.id).trim() : id) || id;
    if (!nextId) return { ok: false as const, error: 'missing_id' };

    if (nextId !== id) {
      return this.rename(id, nextId, item);
    }

    const data: Partial<Suite> = {};
    for (const key of ['floor', 'type', 'size', 'view', 'totalPrice', 'currency'] as const) {
      if ((item as any)[key] !== undefined) (data as any)[key] = (item as any)[key];
    }

    if (this.prisma) {
      try {
        const current = await this.prisma.suite.findUnique({ where: { id } });
        if (!current) return { ok: false as const, error: 'not_found' };
        const suite = await this.prisma.suite.update({ where: { id }, data: data as any });
        let plansPriceUpdated = 0;
        if (data.totalPrice !== undefined && Number(data.totalPrice) !== Number(current.totalPrice)) {
          plansPriceUpdated = await this.rescaleUnsoldPlanPrices(
            id,
            Number(current.totalPrice) || 0,
            Number(data.totalPrice) || 0
          );
        }
        return { ok: true as const, suite, plansPriceUpdated };
      } catch {
        return { ok: false as const, error: 'not_found' };
      }
    }

    const current = await this.repo.findById(id);
    if (!current) return { ok: false as const, error: 'not_found' };
    const suite = await this.repo.update(id, data);
    if (!suite) return { ok: false as const, error: 'not_found' };
    let plansPriceUpdated = 0;
    if (data.totalPrice !== undefined && Number(data.totalPrice) !== Number(current.totalPrice)) {
      plansPriceUpdated = await this.rescaleUnsoldPlanPrices(
        id,
        Number(current.totalPrice) || 0,
        Number(data.totalPrice) || 0
      );
    }
    return { ok: true as const, suite, plansPriceUpdated };
  }

  private async rename(fromId: string, toId: string, item: Partial<Suite>) {
    if (this.prisma) {
      const current = await this.prisma.suite.findUnique({ where: { id: fromId } });
      if (!current) return { ok: false as const, error: 'not_found' };
      const clash = await this.prisma.suite.findUnique({ where: { id: toId } });
      if (clash) return { ok: false as const, error: 'conflict' };

      const nextTotal =
        item.totalPrice !== undefined ? Number(item.totalPrice) : Number(current.totalPrice);
      const suite = await this.prisma.$transaction(async (tx) => {
        const created = await tx.suite.create({
          data: {
            id: toId,
            floor: item.floor !== undefined ? item.floor : current.floor,
            type: item.type !== undefined ? item.type : current.type,
            size: item.size !== undefined ? item.size : current.size,
            view: item.view !== undefined ? item.view : current.view,
            totalPrice: item.totalPrice !== undefined ? item.totalPrice : current.totalPrice,
            currency: item.currency !== undefined ? item.currency : current.currency
          }
        });
        await tx.sharePlan.updateMany({ where: { suiteId: fromId }, data: { suiteId: toId } });
        await tx.mediaAsset.updateMany({ where: { suiteId: fromId }, data: { suiteId: toId } });
        await tx.booking.updateMany({ where: { suiteId: fromId }, data: { suiteId: toId } });
        await tx.suite.delete({ where: { id: fromId } });
        return created;
      });
      let plansPriceUpdated = 0;
      if (item.totalPrice !== undefined && Number(item.totalPrice) !== Number(current.totalPrice)) {
        plansPriceUpdated = await this.rescaleUnsoldPlanPrices(
          toId,
          Number(current.totalPrice) || 0,
          nextTotal || 0
        );
      }
      return { ok: true as const, suite, renamedFrom: fromId, plansPriceUpdated };
    }

    const current = await this.repo.findById(fromId);
    if (!current) return { ok: false as const, error: 'not_found' };
    if (await this.repo.findById(toId)) return { ok: false as const, error: 'conflict' };
    await this.repo.create({
      ...current,
      ...item,
      id: toId
    } as Suite);
    await this.repo.delete(fromId);
    const suite = await this.repo.findById(toId);
    if (!suite) return { ok: false as const, error: 'not_found' };
    let plansPriceUpdated = 0;
    if (item.totalPrice !== undefined && Number(item.totalPrice) !== Number(current.totalPrice)) {
      // Memory plans still keyed by old suite id until TimesharesService rename — re-point then scale.
      const plans = await this.plansRepo.findBySuiteId(fromId);
      for (const p of plans) {
        await this.plansRepo.update(p.id, { suiteId: toId });
      }
      plansPriceUpdated = await this.rescaleUnsoldPlanPrices(
        toId,
        Number(current.totalPrice) || 0,
        Number(item.totalPrice) || 0
      );
    }
    return { ok: true as const, suite, renamedFrom: fromId, plansPriceUpdated };
  }

  /**
   * Delete a unit and clean up its share plans + suite media.
   * Refuses when the unit still has bookings (sales history).
   */
  async remove(id: string) {
    if (this.prisma) {
      const suite = await this.prisma.suite.findUnique({ where: { id } });
      if (!suite) return { ok: false as const, error: 'not_found' };

      const bookingCount = await this.prisma.booking.count({ where: { suiteId: id } });
      if (bookingCount > 0) {
        return { ok: false as const, error: 'has_bookings', bookingCount };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.sharePlan.deleteMany({ where: { suiteId: id } });
        await tx.mediaAsset.deleteMany({ where: { suiteId: id } });
        await tx.suite.delete({ where: { id } });
      });
      return { ok: true as const };
    }

    const ok = await this.repo.delete(id);
    return ok ? { ok: true as const } : { ok: false as const, error: 'not_found' };
  }
}
