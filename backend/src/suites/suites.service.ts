import { Injectable } from '@nestjs/common';
import { SuitesRepository } from './suites.repository';
import { Suite } from '../domain/models';
import { prisma } from '../../prisma/client';

@Injectable()
export class SuitesService {
  private repo = new SuitesRepository();
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

  /**
   * Update suite fields. When `id` in the patch differs from the current PK,
   * rename the suite and re-point plans / media / bookings to the new ID.
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
        const suite = await this.prisma.suite.update({ where: { id }, data: data as any });
        return { ok: true as const, suite };
      } catch {
        return { ok: false as const, error: 'not_found' };
      }
    }
    const suite = await this.repo.update(id, data);
    return suite ? { ok: true as const, suite } : { ok: false as const, error: 'not_found' };
  }

  private async rename(fromId: string, toId: string, item: Partial<Suite>) {
    if (this.prisma) {
      const current = await this.prisma.suite.findUnique({ where: { id: fromId } });
      if (!current) return { ok: false as const, error: 'not_found' };
      const clash = await this.prisma.suite.findUnique({ where: { id: toId } });
      if (clash) return { ok: false as const, error: 'conflict' };

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
      return { ok: true as const, suite, renamedFrom: fromId };
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
    return suite
      ? { ok: true as const, suite, renamedFrom: fromId }
      : { ok: false as const, error: 'not_found' };
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
