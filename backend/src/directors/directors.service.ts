import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../../prisma/client';
import { Director } from '../domain/models';

function genId() {
  return 'DIR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeOptional(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function assertProfile(name: string, title: string, bio: string) {
  if (name.trim().length < 2) throw new BadRequestException('name_too_short');
  if (title.trim().length < 2) throw new BadRequestException('title_too_short');
  if (bio.trim().length < 10) throw new BadRequestException('bio_too_short');
}

@Injectable()
export class DirectorsService {
  private memory: Director[] = [];

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private table() {
    return this.db ? (this.db as any).director : null;
  }

  async list(): Promise<Director[]> {
    const table = this.table();
    if (table) {
      return table.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }) as Promise<Director[]>;
    }
    return this.memory.slice().sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listLocalized(locale?: string): Promise<Director[]> {
    const items = await this.list();
    const useBn = Boolean(locale && locale.toLowerCase().startsWith('bn'));
    if (!useBn) return items;
    return items.map((item) => ({
      ...item,
      name: item.nameBn?.trim() ? item.nameBn : item.name,
      title: item.titleBn?.trim() ? item.titleBn : item.title,
      bio: item.bioBn?.trim() ? item.bioBn : item.bio
    }));
  }

  async create(data: {
    name: string;
    title: string;
    bio: string;
    nameBn?: string | null;
    titleBn?: string | null;
    bioBn?: string | null;
    photoUrl?: string | null;
  }): Promise<Director> {
    assertProfile(data.name, data.title, data.bio);
    const items = await this.list();
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const now = new Date();
    const record: Director = {
      id: genId(),
      name: data.name.trim(),
      title: data.title.trim(),
      bio: data.bio.trim(),
      nameBn: normalizeOptional(data.nameBn) ?? null,
      titleBn: normalizeOptional(data.titleBn) ?? null,
      bioBn: normalizeOptional(data.bioBn) ?? null,
      photoUrl: normalizeOptional(data.photoUrl) ?? null,
      order,
      createdAt: now,
      updatedAt: now
    };
    const table = this.table();
    if (table) return table.create({ data: record }) as Promise<Director>;
    this.memory.push(record);
    return record;
  }

  async update(
    id: string,
    data: {
      name?: string;
      title?: string;
      bio?: string;
      nameBn?: string | null;
      titleBn?: string | null;
      bioBn?: string | null;
      photoUrl?: string | null;
    }
  ): Promise<Director> {
    const nextNameBn = normalizeOptional(data.nameBn);
    const nextTitleBn = normalizeOptional(data.titleBn);
    const nextBioBn = normalizeOptional(data.bioBn);
    const nextPhoto = normalizeOptional(data.photoUrl);

    const table = this.table();
    if (table) {
      const current = await table.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('director_not_found');
      const nextName = data.name !== undefined ? data.name.trim() : current.name;
      const nextTitle = data.title !== undefined ? data.title.trim() : current.title;
      const nextBio = data.bio !== undefined ? data.bio.trim() : current.bio;
      assertProfile(nextName, nextTitle, nextBio);
      return table.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: nextName } : {}),
          ...(data.title !== undefined ? { title: nextTitle } : {}),
          ...(data.bio !== undefined ? { bio: nextBio } : {}),
          ...(nextNameBn !== undefined ? { nameBn: nextNameBn } : {}),
          ...(nextTitleBn !== undefined ? { titleBn: nextTitleBn } : {}),
          ...(nextBioBn !== undefined ? { bioBn: nextBioBn } : {}),
          ...(nextPhoto !== undefined ? { photoUrl: nextPhoto } : {})
        }
      }) as Promise<Director>;
    }

    const idx = this.memory.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('director_not_found');
    const nextName = data.name !== undefined ? data.name.trim() : this.memory[idx].name;
    const nextTitle = data.title !== undefined ? data.title.trim() : this.memory[idx].title;
    const nextBio = data.bio !== undefined ? data.bio.trim() : this.memory[idx].bio;
    assertProfile(nextName, nextTitle, nextBio);
    this.memory[idx] = {
      ...this.memory[idx],
      ...(data.name !== undefined ? { name: nextName } : {}),
      ...(data.title !== undefined ? { title: nextTitle } : {}),
      ...(data.bio !== undefined ? { bio: nextBio } : {}),
      ...(nextNameBn !== undefined ? { nameBn: nextNameBn } : {}),
      ...(nextTitleBn !== undefined ? { titleBn: nextTitleBn } : {}),
      ...(nextBioBn !== undefined ? { bioBn: nextBioBn } : {}),
      ...(nextPhoto !== undefined ? { photoUrl: nextPhoto } : {}),
      updatedAt: new Date()
    };
    return this.memory[idx];
  }

  async remove(id: string): Promise<void> {
    const table = this.table();
    if (table) {
      const current = await table.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('director_not_found');
      await table.delete({ where: { id } });
      return;
    }
    const before = this.memory.length;
    this.memory = this.memory.filter((i) => i.id !== id);
    if (this.memory.length === before) throw new NotFoundException('director_not_found');
  }

  async move(id: string, direction: 'up' | 'down'): Promise<Director[]> {
    const items = await this.list();
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) throw new NotFoundException('director_not_found');
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= items.length) return items;

    const next = items.slice();
    const tmp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = tmp;
    const now = new Date();

    const table = this.table();
    if (table && this.db) {
      await this.db.$transaction(next.map((item, order) => table.update({ where: { id: item.id }, data: { order } })));
      return this.list();
    }
    const byId = new Map(next.map((item, order) => [item.id, order]));
    this.memory = this.memory.map((item) => {
      const order = byId.get(item.id);
      if (order === undefined) return item;
      return { ...item, order, updatedAt: now };
    });
    return this.list();
  }
}
