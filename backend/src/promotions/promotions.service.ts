import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { Promotion, SharePlan } from '../domain/models';

function genId() {
  return 'PRM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export type PlanDiscount = {
  promoId: string;
  promoName: string;
  discountPct: number;
  discountedPrice: number;
  promoEndsAt: string;
};

@Injectable()
export class PromotionsService {
  private memory: Promotion[] = [];

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  async list(): Promise<Promotion[]> {
    if (this.db) {
      return this.db.promotion.findMany({ orderBy: [{ startsAt: 'desc' }] }) as Promise<Promotion[]>;
    }
    return this.memory
      .slice()
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  }

  async listActive(now = new Date()): Promise<Promotion[]> {
    const all = await this.list();
    return all.filter((p) => p.active && p.startsAt <= now && now <= p.endsAt);
  }

  async create(data: {
    name: string;
    discountPct: number;
    scope: string;
    suiteTypes?: string[];
    planIds?: string[];
    startsAt: string;
    endsAt: string;
    active?: boolean;
  }): Promise<Promotion> {
    const now = new Date();
    const record: Promotion = {
      id: genId(),
      name: data.name.trim(),
      discountPct: data.discountPct,
      scope: data.scope as Promotion['scope'],
      suiteTypes: data.suiteTypes || [],
      planIds: data.planIds || [],
      startsAt: new Date(data.startsAt),
      endsAt: endOfDay(new Date(data.endsAt)),
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now
    };
    if (this.db) return this.db.promotion.create({ data: record }) as Promise<Promotion>;
    this.memory.push(record);
    return record;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      discountPct: number;
      scope: string;
      suiteTypes: string[];
      planIds: string[];
      startsAt: string;
      endsAt: string;
      active: boolean;
    }>
  ): Promise<Promotion> {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.discountPct !== undefined) patch.discountPct = data.discountPct;
    if (data.scope !== undefined) patch.scope = data.scope;
    if (data.suiteTypes !== undefined) patch.suiteTypes = data.suiteTypes;
    if (data.planIds !== undefined) patch.planIds = data.planIds;
    if (data.startsAt !== undefined) patch.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) patch.endsAt = endOfDay(new Date(data.endsAt));
    if (data.active !== undefined) patch.active = data.active;

    if (this.db) {
      const current = await this.db.promotion.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('promotion_not_found');
      return this.db.promotion.update({ where: { id }, data: patch }) as Promise<Promotion>;
    }
    const idx = this.memory.findIndex((p) => p.id === id);
    if (idx < 0) throw new NotFoundException('promotion_not_found');
    this.memory[idx] = { ...this.memory[idx], ...patch, updatedAt: new Date() };
    return this.memory[idx];
  }

  async remove(id: string): Promise<void> {
    if (this.db) {
      const current = await this.db.promotion.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('promotion_not_found');
      await this.db.promotion.delete({ where: { id } });
      return;
    }
    const before = this.memory.length;
    this.memory = this.memory.filter((p) => p.id !== id);
    if (this.memory.length === before) throw new NotFoundException('promotion_not_found');
  }

  /**
   * Best active discount for a plan (highest pct wins).
   * suiteType is needed only for category-scoped promotions.
   */
  async discountForPlan(
    plan: Pick<SharePlan, 'id' | 'price' | 'suiteId'>,
    suiteType?: string | null
  ): Promise<PlanDiscount | null> {
    const active = await this.listActive();
    if (!active.length) return null;
    const type = (suiteType || '').toLowerCase().trim();
    let best: Promotion | null = null;
    for (const promo of active) {
      const matches =
        promo.scope === 'all' ||
        (promo.scope === 'category' &&
          promo.suiteTypes.some((t) => t.toLowerCase().trim() === type)) ||
        (promo.scope === 'plans' && promo.planIds.includes(plan.id));
      if (!matches) continue;
      if (!best || promo.discountPct > best.discountPct) best = promo;
    }
    if (!best) return null;
    const discountedPrice = Math.round(plan.price * (1 - best.discountPct / 100));
    return {
      promoId: best.id,
      promoName: best.name,
      discountPct: best.discountPct,
      discountedPrice,
      promoEndsAt: best.endsAt instanceof Date ? best.endsAt.toISOString() : String(best.endsAt)
    };
  }
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  // If a bare date (midnight) was provided, extend through the end of that day.
  if (copy.getUTCHours() === 0 && copy.getUTCMinutes() === 0 && copy.getUTCSeconds() === 0) {
    copy.setUTCHours(23, 59, 59, 999);
  }
  return copy;
}
