import { Injectable } from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { Client } from '../domain/models';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ClientsService {
  private repo = new ClientsRepository();
  private prisma: PrismaClient | null = process.env.DATABASE_URL ? new PrismaClient() : null;
  async list() {
    if (this.prisma) return this.prisma.client.findMany();
    return this.repo.findAll();
  }
  async get(id: string) {
    if (this.prisma) return this.prisma.client.findUnique({ where: { id } });
    return this.repo.findById(id);
  }
  async create(item: Client) {
    if (this.prisma) return this.prisma.client.create({ data: item as any });
    return this.repo.create(item);
  }
  async update(id: string, item: Partial<Client>) {
    if (this.prisma) return this.prisma.client.update({ where: { id }, data: item as any });
    return this.repo.update(id, item);
  }
  async remove(id: string) {
    if (this.prisma) {
      await this.prisma.client.delete({ where: { id } });
      return true;
    }
    return this.repo.delete(id);
  }
}

