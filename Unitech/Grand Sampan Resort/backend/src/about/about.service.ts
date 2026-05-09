import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AboutCard } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { AboutRepository, DEFAULT_ABOUT_CARDS } from './about.repository';
import { CreateAboutCardDto, UpdateAboutCardDto } from './dto/about-card.dto';
import { ABOUT_SECTIONS, type AboutSectionValue } from './about.types';

type GroupedCards = Record<AboutSectionValue, AboutCard[]>;

@Injectable()
export class AboutService {
  private prisma: PrismaClient | null;
  private readonly repo: AboutRepository;

  constructor() {
    this.repo = new AboutRepository();
    this.prisma =
      (() => {
        try {
          return process.env.DATABASE_URL ? new PrismaClient() : null;
        } catch {
          return null;
        }
      })();
  }

  private sanitizeImageUrl(value?: string | null) {
    const url = (value || '').trim();
    if (!url) return null;
    if (!/^\/(images|uploads)\/.+\.(png|jpe?g|webp|svg)$/i.test(url)) {
      throw new BadRequestException('image_url_invalid');
    }
    return url;
  }

  private sanitizeImageAlt(value?: string | null) {
    const alt = (value || '').trim();
    if (!alt) return null;
    if (alt.length > 140) throw new BadRequestException('image_alt_too_long');
    return alt;
  }

  private validateRichText(value?: string | null) {
    const html = String(value || '').trim();
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length < 20) throw new BadRequestException('body_too_short');
    if (plain.length > 2000) throw new BadRequestException('body_too_long');
    return html;
  }

  private async ensureDefaults() {
    if (this.prisma) {
      const count = await this.prisma.aboutCard.count();
      if (count === 0) {
        await this.prisma.aboutCard.createMany({ data: DEFAULT_ABOUT_CARDS });
      }
      return;
    }
    await this.repo.ensureDefaults();
  }

  private groupCards(cards: AboutCard[]): GroupedCards {
    return {
      [ABOUT_SECTIONS.ABOUT_PROJECT]: cards.filter((card) => card.section === ABOUT_SECTIONS.ABOUT_PROJECT),
      [ABOUT_SECTIONS.ABOUT_COMPOUND]: cards.filter((card) => card.section === ABOUT_SECTIONS.ABOUT_COMPOUND),
      [ABOUT_SECTIONS.ABOUT_COMPANY]: cards.filter((card) => card.section === ABOUT_SECTIONS.ABOUT_COMPANY)
    };
  }

  async listAll() {
    await this.ensureDefaults();
    if (this.prisma) {
      return this.prisma.aboutCard.findMany({ orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }] });
    }
    return this.repo.findAll();
  }

  async listGrouped() {
    const cards = await this.listAll();
    return this.groupCards(cards);
  }

  async create(input: CreateAboutCardDto) {
    await this.ensureDefaults();
    const sectionCards = (await this.listAll()).filter((card) => card.section === input.section);
    const data = {
      section: input.section,
      title: input.title.trim(),
      bodyHtml: this.validateRichText(input.bodyHtml),
      imageUrl: this.sanitizeImageUrl(input.imageUrl),
      imageAlt: this.sanitizeImageAlt(input.imageAlt),
      sortOrder: sectionCards.length
    };
    if (this.prisma) return this.prisma.aboutCard.create({ data });
    return this.repo.create(data as any);
  }

  async update(id: string, patch: UpdateAboutCardDto) {
    await this.ensureDefaults();
    const current = this.prisma
      ? await this.prisma.aboutCard.findUnique({ where: { id } })
      : await this.repo.findById(id);
    if (!current) throw new NotFoundException('about_card_not_found');

    const nextSection = patch.section ?? current.section;
    let nextSortOrder = current.sortOrder;
    if (nextSection !== current.section) {
      const siblings = (await this.listAll()).filter((card) => card.section === nextSection && card.id !== id);
      nextSortOrder = siblings.length;
    }

    const data: Partial<AboutCard> = {
      section: nextSection,
      sortOrder: nextSortOrder
    };
    if (patch.title !== undefined) data.title = patch.title.trim();
    if (patch.bodyHtml !== undefined) data.bodyHtml = this.validateRichText(patch.bodyHtml);
    if (patch.imageUrl !== undefined) data.imageUrl = this.sanitizeImageUrl(patch.imageUrl);
    if (patch.imageAlt !== undefined) data.imageAlt = this.sanitizeImageAlt(patch.imageAlt);

    if (this.prisma) {
      const updated = await this.prisma.aboutCard.update({ where: { id }, data });
      if (nextSection !== current.section) {
        const oldSiblings = await this.prisma.aboutCard.findMany({
          where: { section: current.section },
          orderBy: { sortOrder: 'asc' }
        });
        await Promise.all(
          oldSiblings.map((card, index) =>
            this.prisma!.aboutCard.update({ where: { id: card.id }, data: { sortOrder: index } })
          )
        );
      }
      return updated;
    }
    const updated = await this.repo.update(id, data);
    if (nextSection !== current.section) {
      const oldSiblings = (await this.repo.findAll()).filter((card) => card.section === current.section);
      await this.repo.replaceSection(
        current.section,
        oldSiblings.sort((a, b) => a.sortOrder - b.sortOrder).map((card) => card.id)
      );
    }
    return updated;
  }

  async remove(id: string) {
    await this.ensureDefaults();
    const current = this.prisma
      ? await this.prisma.aboutCard.findUnique({ where: { id } })
      : await this.repo.findById(id);
    if (!current) throw new NotFoundException('about_card_not_found');

    if (this.prisma) {
      await this.prisma.aboutCard.delete({ where: { id } });
      const siblings = await this.prisma.aboutCard.findMany({
        where: { section: current.section },
        orderBy: { sortOrder: 'asc' }
      });
      await Promise.all(
        siblings.map((card, index) =>
          this.prisma!.aboutCard.update({ where: { id: card.id }, data: { sortOrder: index } })
        )
      );
      return true;
    }

    const ok = await this.repo.delete(id);
    const siblings = (await this.repo.findAll()).filter((card) => card.section === current.section);
    await this.repo.replaceSection(
      current.section,
      siblings.sort((a, b) => a.sortOrder - b.sortOrder).map((card) => card.id)
    );
    return ok;
  }

  async reorder(section: AboutSectionValue, orderedIds: string[]) {
    await this.ensureDefaults();
    const cards = (await this.listAll()).filter((card) => card.section === section);
    const currentIds = cards.map((card) => card.id).sort();
    const nextIds = [...orderedIds].sort();
    if (currentIds.length !== nextIds.length || currentIds.some((id, index) => id !== nextIds[index])) {
      throw new BadRequestException('reorder_ids_mismatch');
    }

    if (this.prisma) {
      await Promise.all(
        orderedIds.map((id, index) =>
          this.prisma!.aboutCard.update({ where: { id }, data: { sortOrder: index } })
        )
      );
      return this.prisma.aboutCard.findMany({ where: { section }, orderBy: { sortOrder: 'asc' } });
    }

    return this.repo.replaceSection(section, orderedIds);
  }
}
