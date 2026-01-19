import { Repository } from '../common/repository';
import { Suite } from '../domain/models';

export class SuitesRepository implements Repository<Suite> {
  private items: Suite[] = [
    { id: 'S-101', floor: 1, type: 'Standard', size: 300, view: 'Sea', totalPrice: 120000, currency: 'BDT' },
    { id: 'S-202', floor: 2, type: 'Delux', size: 345, view: 'Sea', totalPrice: 160000, currency: 'BDT' }
  ];

  async findAll() {
    return this.items;
  }
  async findById(id: string) {
    return this.items.find((i) => i.id === id) || null;
  }
  async create(item: Suite) {
    this.items.push(item);
    return item;
  }
  async update(id: string, item: Partial<Suite>) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.items[idx] = { ...this.items[idx], ...item };
    return this.items[idx];
  }
  async delete(id: string) {
    const prev = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return this.items.length < prev;
  }
}

