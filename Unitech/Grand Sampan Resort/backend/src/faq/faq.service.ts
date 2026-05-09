import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { FaqCategory, FaqEntry } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { CreateFaqEntryDto, UpdateFaqEntryDto } from './dto/faq.dto';
import { FaqRepository, DEFAULT_FAQ_ENTRIES } from './faq.repository';

@Injectable()
export class FaqService {
  private prisma: PrismaClient | null;
  private readonly repo: FaqRepository;

  constructor() {
    this.repo = new FaqRepository();
    this.prisma =
      (() => {
        try {
          return process.env.DATABASE_URL ? new PrismaClient() : null;
        } catch {
          return null;
        }
      })();
  }

  private normalizeCategory(value?: string | null) {
    const trimmed = String(value || '').trim();
    return trimmed ? trimmed : 'General';
  }

  private validateCategoryName(value?: string | null) {
    const name = this.normalizeCategory(value);
    if (name.length < 2) throw new BadRequestException('category_too_short');
    if (name.length > 50) throw new BadRequestException('category_too_long');
    return name;
  }

  private validateAnswerHtml(value?: string | null) {
    const html = String(value || '').trim();
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length < 20) throw new BadRequestException('answer_too_short');
    if (plain.length > 3000) throw new BadRequestException('answer_too_long');
    return html;
  }

  private validateQuestion(value?: string | null) {
    const text = String(value || '').trim();
    if (text.length < 5) throw new BadRequestException('question_too_short');
    if (text.length > 200) throw new BadRequestException('question_too_long');
    return text;
  }

  private async ensureDefaults() {
    if (this.prisma) {
      await this.prisma.faqEntry.updateMany({ where: { category: null as any }, data: { category: 'General' } }).catch(() => null);
      const count = await this.prisma.faqEntry.count();
      if (count === 0) {
        await this.prisma.faqEntry.createMany({ data: DEFAULT_FAQ_ENTRIES });
      }
      const catCount = await this.prisma.faqCategory.count().catch(() => 0);
      if (catCount === 0) {
        const unique = Array.from(new Set(DEFAULT_FAQ_ENTRIES.map((item) => this.normalizeCategory(item.category))));
        const categories = unique
          .sort((a, b) => a.localeCompare(b))
          .map((name, index) => ({ name, sortOrder: index }));
        if (categories.length > 0) {
          await this.prisma.faqCategory.createMany({ data: categories }).catch(() => null);
        }
      }
      return;
    }
    await this.repo.ensureDefaults();
  }

  async list(params?: { q?: string; category?: string | null }) {
    await this.ensureDefaults();
    const q = (params?.q || '').trim();
    const category = params?.category === undefined ? undefined : this.normalizeCategory(params?.category);

    if (this.prisma) {
      const where: any = {};
      if (category !== undefined) where.category = category;
      if (q) where.question = { contains: q, mode: 'insensitive' };
      return this.prisma.faqEntry.findMany({ where, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
    }

    const all = await this.repo.findAll();
    return all.filter((item) => {
      const matchesCategory = category === undefined ? true : this.normalizeCategory(item.category) === category;
      const matchesQuery = q ? item.question.toLowerCase().includes(q.toLowerCase()) : true;
      return matchesCategory && matchesQuery;
    });
  }

  async categories() {
    await this.ensureDefaults();
    if (this.prisma) {
      const categories = await this.prisma.faqCategory.findMany({ orderBy: { sortOrder: 'asc' } });
      return categories.map((c) => c.name);
    }
    const categories = await this.repo.listCategories();
    return categories.map((c) => c.name);
  }

  async listCategoryEntities() {
    await this.ensureDefaults();
    if (this.prisma) return this.prisma.faqCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return this.repo.listCategories();
  }

  private async ensureCategoryExists(name: string) {
    const normalized = this.normalizeCategory(name);
    if (this.prisma) {
      const existing = await this.prisma.faqCategory.findFirst({ where: { name: { equals: normalized, mode: 'insensitive' } } });
      if (existing) return existing;
      const sortOrder = await this.prisma.faqCategory.count();
      return this.prisma.faqCategory.create({ data: { name: normalized, sortOrder } });
    }
    const created = await this.repo.createCategory(normalized);
    if (created) return created;
    const list = await this.repo.listCategories();
    return list.find((c) => c.name.toLowerCase() === normalized.toLowerCase())!;
  }

  async createCategory(input: { name: string }) {
    await this.ensureDefaults();
    const name = this.validateCategoryName(input.name);
    if (this.prisma) {
      const exists = await this.prisma.faqCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      if (exists) throw new BadRequestException('category_exists');
      const sortOrder = await this.prisma.faqCategory.count();
      return this.prisma.faqCategory.create({ data: { name, sortOrder } });
    }
    const created = await this.repo.createCategory(name);
    if (!created) throw new BadRequestException('category_exists');
    return created;
  }

  async updateCategory(id: string, input: { name: string }) {
    await this.ensureDefaults();
    const name = this.validateCategoryName(input.name);
    if (this.prisma) {
      const current = await this.prisma.faqCategory.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('category_not_found');
      const exists = await this.prisma.faqCategory.findFirst({
        where: { id: { not: id }, name: { equals: name, mode: 'insensitive' } }
      });
      if (exists) throw new BadRequestException('category_exists');
      const updated = await this.prisma.faqCategory.update({ where: { id }, data: { name } });
      if (current.name !== name) {
        await this.prisma.faqEntry.updateMany({ where: { category: current.name }, data: { category: name } });
      }
      return updated;
    }
    const res = await this.repo.updateCategory(id, name);
    if (!res) throw new NotFoundException('category_not_found');
    if (res.prevName !== name) return res.category;
    return res.category;
  }

  async deleteCategory(id: string) {
    await this.ensureDefaults();
    if (this.prisma) {
      const current = await this.prisma.faqCategory.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('category_not_found');
      await this.prisma.faqEntry.updateMany({ where: { category: current.name }, data: { category: 'General' } });
      await this.prisma.faqCategory.delete({ where: { id } });
      const remaining = await this.prisma.faqCategory.findMany({ orderBy: { sortOrder: 'asc' } });
      await Promise.all(
        remaining.map((c, index) => this.prisma!.faqCategory.update({ where: { id: c.id }, data: { sortOrder: index } }))
      );
      return true;
    }
    const deleted = await this.repo.deleteCategory(id);
    if (!deleted) throw new NotFoundException('category_not_found');
    return true;
  }

  async reorderCategories(orderedIds: string[]) {
    await this.ensureDefaults();
    if (this.prisma) {
      const current = await this.prisma.faqCategory.findMany({ orderBy: { sortOrder: 'asc' } });
      const currentIds = current.map((c) => c.id).sort();
      const nextIds = [...orderedIds].sort();
      if (currentIds.length !== nextIds.length || currentIds.some((id, idx) => id !== nextIds[idx])) {
        throw new BadRequestException('reorder_ids_mismatch');
      }
      await Promise.all(orderedIds.map((id, index) => this.prisma!.faqCategory.update({ where: { id }, data: { sortOrder: index } })));
      return this.prisma.faqCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    }
    return this.repo.reorderCategories(orderedIds);
  }

  async create(input: CreateFaqEntryDto) {
    await this.ensureDefaults();
    const category = this.normalizeCategory(input.category);
    await this.ensureCategoryExists(category);
    const siblings = (await this.list({ category })).filter((item) => this.normalizeCategory(item.category) === category);
    const data = {
      category,
      question: this.validateQuestion(input.question),
      answerHtml: this.validateAnswerHtml(input.answerHtml),
      sortOrder: siblings.length
    };
    if (this.prisma) return this.prisma.faqEntry.create({ data });
    return this.repo.create(data as any);
  }

  async update(id: string, patch: UpdateFaqEntryDto) {
    await this.ensureDefaults();
    const current = this.prisma ? await this.prisma.faqEntry.findUnique({ where: { id } }) : await this.repo.findById(id);
    if (!current) throw new NotFoundException('faq_not_found');

    const nextCategory = patch.category !== undefined ? this.normalizeCategory(patch.category) : this.normalizeCategory(current.category);
    let nextSortOrder = current.sortOrder;

    if (nextCategory !== this.normalizeCategory(current.category)) {
      await this.ensureCategoryExists(nextCategory);
      const siblings = (await this.list({ category: nextCategory })).filter(
        (item) => this.normalizeCategory(item.category) === nextCategory && item.id !== id
      );
      nextSortOrder = siblings.length;
    }

    const data: Partial<FaqEntry> = {
      category: nextCategory,
      sortOrder: nextSortOrder
    };
    if (patch.question !== undefined) data.question = this.validateQuestion(patch.question);
    if (patch.answerHtml !== undefined) data.answerHtml = this.validateAnswerHtml(patch.answerHtml);

    if (this.prisma) {
      const updated = await this.prisma.faqEntry.update({ where: { id }, data });
      if (nextCategory !== this.normalizeCategory(current.category)) {
        const oldCategory = this.normalizeCategory(current.category);
        const oldSiblings = await this.prisma.faqEntry.findMany({
          where: { category: oldCategory },
          orderBy: { sortOrder: 'asc' }
        });
        await Promise.all(
          oldSiblings.map((item, index) => this.prisma!.faqEntry.update({ where: { id: item.id }, data: { sortOrder: index } }))
        );
      }
      return updated;
    }

    const updated = await this.repo.update(id, data);
    if (nextCategory !== this.normalizeCategory(current.category)) {
      const oldCategory = this.normalizeCategory(current.category);
      const oldSiblings = (await this.repo.findAll()).filter((item) => this.normalizeCategory(item.category) === oldCategory);
      await this.repo.replaceCategory(
        oldCategory,
        oldSiblings.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id)
      );
    }
    return updated;
  }

  async remove(id: string) {
    await this.ensureDefaults();
    const current = this.prisma ? await this.prisma.faqEntry.findUnique({ where: { id } }) : await this.repo.findById(id);
    if (!current) throw new NotFoundException('faq_not_found');

    const category = this.normalizeCategory(current.category);

    if (this.prisma) {
      await this.prisma.faqEntry.delete({ where: { id } });
      const siblings = await this.prisma.faqEntry.findMany({ where: { category }, orderBy: { sortOrder: 'asc' } });
      await Promise.all(
        siblings.map((item, index) => this.prisma!.faqEntry.update({ where: { id: item.id }, data: { sortOrder: index } }))
      );
      return true;
    }

    const ok = await this.repo.delete(id);
    const siblings = (await this.repo.findAll()).filter((item) => this.normalizeCategory(item.category) === category);
    await this.repo.replaceCategory(
      category,
      siblings.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id)
    );
    return ok;
  }

  async reorder(category: string, orderedIds: string[]) {
    await this.ensureDefaults();
    const normalized = this.normalizeCategory(category);
    const cards = (await this.list({ category: normalized })).filter((item) => this.normalizeCategory(item.category) === normalized);
    const currentIds = cards.map((item) => item.id).sort();
    const nextIds = [...orderedIds].sort();
    if (currentIds.length !== nextIds.length || currentIds.some((id, index) => id !== nextIds[index])) {
      throw new BadRequestException('reorder_ids_mismatch');
    }

    if (this.prisma) {
      await Promise.all(
        orderedIds.map((id, index) => this.prisma!.faqEntry.update({ where: { id }, data: { sortOrder: index } }))
      );
      return this.prisma.faqEntry.findMany({ where: { category: normalized }, orderBy: { sortOrder: 'asc' } });
    }

    return this.repo.replaceCategory(normalized, orderedIds);
  }
}
