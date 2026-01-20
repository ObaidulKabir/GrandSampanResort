import { Injectable } from '@nestjs/common';
import { SuitesRepository } from './suites.repository';
import { Suite } from '../domain/models';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SuitesService {
  private repo = new SuitesRepository();
  private prisma: PrismaClient | null = process.env.DATABASE_URL ? new PrismaClient() : null;
  async list() {
    if (this.prisma) return this.prisma.suite.findMany();
    return this.repo.findAll();
  }
  async get(id: string) {
    if (this.prisma) return this.prisma.suite.findUnique({ where: { id } });
    return this.repo.findById(id);
  }
  async create(item: Suite) {
    if (this.prisma) return this.prisma.suite.create({ data: item });
    return this.repo.create(item);
  }
  async update(id: string, item: Partial<Suite>) {
    if (this.prisma) return this.prisma.suite.update({ where: { id }, data: item as any });
    return this.repo.update(id, item);
  }
  async remove(id: string) {
    if (this.prisma) {
      await this.prisma.suite.delete({ where: { id } });
      return true;
    }
    return this.repo.delete(id);
  }
}

