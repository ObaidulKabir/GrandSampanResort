import { Injectable } from "@nestjs/common";
import { TimesharesRepository } from "./timeshares.repository";
import { SharePlan } from "../domain/models";
import { prisma } from "../../prisma/client";

@Injectable()
export class TimesharesService {
  private repo = new TimesharesRepository();
  private prisma = process.env.DATABASE_URL ? prisma : null;
  async list() {
    if (this.prisma) {
      const items = await this.prisma.sharePlan.findMany();
      return items.map((p) => this.withFraction(p as any));
    }
    return this.repo
      .findAll()
      .then((items) => items.map((p) => this.withFraction(p)));
  }
  async listBySuite(suiteId: string) {
    if (this.prisma) {
      const items = await this.prisma.sharePlan.findMany({
        where: { suiteId },
      });
      return items.map((p) => this.withFraction(p as any));
    }
    return this.repo
      .findBySuiteId(suiteId)
      .then((items) => items.map((p) => this.withFraction(p)));
  }
  async get(id: string) {
    if (this.prisma) {
      const p = await this.prisma.sharePlan.findUnique({ where: { id } });
      return p ? this.withFraction(p as any) : null;
    }
    return this.repo
      .findById(id)
      .then((p) => (p ? this.withFraction(p) : null));
  }
  /** Full-bleed ownership: planType FULL or 30 entitlement days/month. */
  isFullBleed(plan: Pick<SharePlan, 'planType' | 'daysPerMonth'> | null | undefined): boolean {
    if (!plan) return false;
    if (String(plan.planType || '').toUpperCase() === 'FULL') return true;
    return Number(plan.daysPerMonth || 0) >= 30;
  }

  private normalizeFullBleedFields(item: Partial<SharePlan>) {
    const full =
      String(item.planType || '').toUpperCase() === 'FULL' || Number(item.daysPerMonth || 0) >= 30;
    if (!full) return item;
    return {
      ...item,
      planType: 'FULL' as const,
      daysPerMonth: 30,
      timeFraction: item.timeFraction ?? 1
    };
  }

  /**
   * A suite with a full-bleed plan cannot accept additional plans.
   * A suite that already has any plan cannot accept a new full-bleed plan.
   */
  private async assertSuitePlanRules(
    suiteId: string | null | undefined,
    next: Pick<SharePlan, 'planType' | 'daysPerMonth'>,
    excludePlanId?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!suiteId) return { ok: true };
    const existing = await this.listBySuite(suiteId);
    const others = existing.filter((p) => p.id !== excludePlanId);
    const hasFull = others.some((p) => this.isFullBleed(p));
    if (hasFull) {
      return { ok: false, error: 'full_ownership_locked' };
    }
    if (this.isFullBleed(next) && others.length > 0) {
      return { ok: false, error: 'full_requires_empty_suite' };
    }
    return { ok: true };
  }

  async create(item: SharePlan) {
    if (item.lockIn === undefined || item.lockIn === null) {
      item.lockIn = 36;
    }
    const normalized = this.normalizeFullBleedFields(item) as SharePlan;
    const gate = await this.assertSuitePlanRules(normalized.suiteId, normalized);
    if (!gate.ok) return { ok: false as const, error: gate.error };

    if (this.prisma) {
      const data = {
        id: normalized.id,
        name: normalized.name,
        daysPerMonth: normalized.daysPerMonth,
        lockIn: normalized.lockIn,
        price: normalized.price,
        currency: normalized.currency ?? null,
        suiteId: normalized.suiteId ?? null,
        planStatus: normalized.planStatus ?? 'Unsold',
        planType: normalized.planType ?? null,
        timeFraction: normalized.timeFraction ?? null
      };
      try {
        const created = await this.prisma.sharePlan.create({ data });
        return { ok: true as const, plan: this.withFraction(created as any) };
      } catch {
        return { ok: false as const, error: 'conflict' };
      }
    }
    const created = await this.repo.create(normalized);
    return { ok: true as const, plan: this.withFraction(created) };
  }
  async update(id: string, item: Partial<SharePlan>) {
    const current = await this.get(id);
    if (!current) return { ok: false as const, error: 'not_found' };

    const merged = this.normalizeFullBleedFields({
      ...current,
      ...item,
      planType: item.planType !== undefined ? item.planType : current.planType,
      daysPerMonth: item.daysPerMonth !== undefined ? item.daysPerMonth : current.daysPerMonth
    });
    const suiteId = (item.suiteId !== undefined ? item.suiteId : current.suiteId) ?? null;
    const gate = await this.assertSuitePlanRules(suiteId, merged as SharePlan, id);
    if (!gate.ok) return { ok: false as const, error: gate.error };

    if (this.prisma) {
      const data: any = {};
      for (const key of [
        'name',
        'daysPerMonth',
        'lockIn',
        'price',
        'currency',
        'suiteId',
        'planStatus',
        'planType',
        'timeFraction'
      ] as const) {
        if (item[key] !== undefined) data[key] = (merged as any)[key];
      }
      // Keep normalized FULL fields even if only one of planType/days was sent.
      if (this.isFullBleed(merged as SharePlan)) {
        data.planType = 'FULL';
        data.daysPerMonth = 30;
        if (data.timeFraction === undefined) data.timeFraction = 1;
      }
      const updated = await this.prisma.sharePlan.update({ where: { id }, data });
      return { ok: true as const, plan: this.withFraction(updated as any) };
    }
    const updated = await this.repo.update(id, merged);
    return updated
      ? { ok: true as const, plan: this.withFraction(updated) }
      : { ok: false as const, error: 'not_found' };
  }
  async remove(id: string) {
    if (this.prisma) {
      await this.prisma.sharePlan.delete({ where: { id } });
      return true;
    }
    return this.repo.delete(id);
  }
  cleanupBlank() {
    return this.repo.deleteBlankId();
  }
  private withFraction(p: SharePlan): SharePlan {
    const type = p.planType ?? "DPM";
    const frac =
      p.timeFraction ??
      (type === "FULL"
        ? 1
        : Math.round(((p.daysPerMonth ?? 0) / 30) * 1000) / 1000);
    return { ...p, timeFraction: frac };
  }
}
