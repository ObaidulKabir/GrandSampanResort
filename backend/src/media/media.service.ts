import { Injectable } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { MediaAsset } from '../domain/models';

function genId() {
  return 'IMG-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export type MediaFilter = { category?: string; suiteId?: string };

@Injectable()
export class MediaService {
  private memory: MediaAsset[] = [];
  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  async list(filter: MediaFilter = {}): Promise<MediaAsset[]> {
    const { category, suiteId } = filter;
    if (this.db) {
      return this.db.mediaAsset.findMany({
        where: {
          ...(category ? { category } : {}),
          ...(suiteId ? { suiteId } : {})
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });
    }
    let items = this.memory.slice();
    if (category) items = items.filter((m) => m.category === category);
    if (suiteId) items = items.filter((m) => m.suiteId === suiteId);
    return items.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async create(data: {
    category: string;
    label?: string;
    alt?: string;
    suiteId?: string;
    url: string;
  }): Promise<MediaAsset> {
    const siblings = await this.list({ category: data.category, suiteId: data.suiteId });
    const order = siblings.length ? Math.max(...siblings.map((s) => s.order)) + 1 : 0;
    const record: MediaAsset = {
      id: genId(),
      category: data.category,
      label: data.label || null,
      suiteId: data.suiteId || null,
      alt: data.alt || null,
      url: data.url,
      order,
      createdAt: new Date()
    };
    if (this.db) return this.db.mediaAsset.create({ data: record });
    this.memory.push(record);
    return record;
  }

  async remove(id: string): Promise<MediaAsset | null> {
    if (this.db) {
      const item = await this.db.mediaAsset.findUnique({ where: { id } });
      if (!item) return null;
      await this.db.mediaAsset.delete({ where: { id } });
      return item;
    }
    const idx = this.memory.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const [item] = this.memory.splice(idx, 1);
    return item;
  }

  async move(id: string, direction: 'up' | 'down'): Promise<MediaAsset[] | null> {
    const item = this.db
      ? await this.db.mediaAsset.findUnique({ where: { id } })
      : this.memory.find((m) => m.id === id) || null;
    if (!item) return null;
    const siblings = await this.list({ category: item.category, suiteId: item.suiteId || undefined });
    const idx = siblings.findIndex((s) => s.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return siblings;
    const other = siblings[swapIdx];
    if (this.db) {
      await this.db.$transaction([
        this.db.mediaAsset.update({ where: { id: item.id }, data: { order: other.order } }),
        this.db.mediaAsset.update({ where: { id: other.id }, data: { order: item.order } })
      ]);
    } else {
      const tmp = item.order;
      item.order = other.order;
      other.order = tmp;
    }
    return this.list({ category: item.category, suiteId: item.suiteId || undefined });
  }
}
