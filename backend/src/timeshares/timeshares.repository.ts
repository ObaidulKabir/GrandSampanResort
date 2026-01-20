import { SharePlan } from '../domain/models';

export class TimesharesRepository {
  private items: SharePlan[] = [
    { id: 'P-3D', name: '3 days/month', daysPerMonth: 3, lockIn: 36, price: 30000, revenueEntitlement: 0.05, currency: 'BDT', suiteId: 'S-101', planType: 'DPM', planStatus: 'Unsold' },
    { id: 'P-5D', name: '5 days/month', daysPerMonth: 5, lockIn: 48, price: 48000, revenueEntitlement: 0.07, currency: 'BDT', suiteId: 'S-202', planType: 'DPM', planStatus: 'Unsold' }
  ];
  async findAll() {
    return this.items;
  }
  async findById(id: string) {
    return this.items.find((i) => i.id === id) || null;
  }
  async findBySuiteId(suiteId: string) {
    return this.items.filter((i) => i.suiteId === suiteId);
  }
  async create(item: SharePlan) {
    this.items.push(item);
    return item;
  }
  async update(id: string, item: Partial<SharePlan>) {
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
  async deleteBlankId() {
    const prev = this.items.length;
    this.items = this.items.filter((i) => (i.id ?? '').trim() !== '');
    return prev - this.items.length;
  }
}

