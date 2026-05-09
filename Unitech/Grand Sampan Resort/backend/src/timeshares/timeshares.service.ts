import { Injectable } from '@nestjs/common';
import { TimesharesRepository } from './timeshares.repository';
import { SharePlan } from '../domain/models';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TimesharesService {
  private repo = new TimesharesRepository();
  private prisma: PrismaClient | null = (() => {
    try {
      return process.env.DATABASE_URL ? new PrismaClient() : null;
    } catch {
      return null;
    }
  })();
  async list() {
    if (this.prisma) {
      const items = await this.prisma.sharePlan.findMany();
      return items.map((p) => this.withFraction(p as any));
    }
    return this.repo.findAll().then((items) => items.map((p) => this.withFraction(p)));
  }
  async listBySuite(suiteId: string) {
    if (this.prisma) {
      const items = await this.prisma.sharePlan.findMany({ where: { suiteId } });
      return items.map((p) => this.withFraction(p as any));
    }
    return this.repo.findBySuiteId(suiteId).then((items) => items.map((p) => this.withFraction(p)));
  }
  async get(id: string) {
    if (this.prisma) {
      const p = await this.prisma.sharePlan.findUnique({ where: { id } });
      return p ? this.withFraction(p as any) : null;
    }
    return this.repo.findById(id).then((p) => (p ? this.withFraction(p) : null));
  }
  async create(item: SharePlan) {
    if (item.lockIn === undefined || item.lockIn === null) {
      item.lockIn = 36;
    }
    if (this.prisma) return this.prisma.sharePlan.create({ data: item as any });
    return this.repo.create(item);
  }
  async update(id: string, item: Partial<SharePlan>) {
    if (this.prisma) return this.prisma.sharePlan.update({ where: { id }, data: item as any });
    return this.repo.update(id, item);
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
    const type = p.planType ?? 'DPM';
    const frac = p.timeFraction ?? (type === 'FULL' ? 1 : Math.round(((p.daysPerMonth ?? 0) / 30) * 1000) / 1000);
    return { ...p, timeFraction: frac };
  }
}

