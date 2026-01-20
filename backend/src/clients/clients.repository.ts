import { Client } from '../domain/models';

export class ClientsRepository {
  private items: Client[] = [];
  async findAll() {
    return this.items;
  }
  async findById(id: string) {
    return this.items.find((c) => c.id === id) || null;
  }
  async create(item: Client) {
    this.items.push(item);
    return item;
  }
  async update(id: string, item: Partial<Client>) {
    const idx = this.items.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.items[idx] = { ...this.items[idx], ...item };
    return this.items[idx];
  }
  async delete(id: string) {
    const prev = this.items.length;
    this.items = this.items.filter((c) => c.id !== id);
    return this.items.length < prev;
  }
}

