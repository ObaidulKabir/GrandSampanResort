import { Booking } from '../domain/models';

export class BookingRepository {
  private items: Booking[] = [];

  async listBySuite(suiteId: string) {
    return this.items.filter((b) => b.suiteId === suiteId);
  }

  async create(item: Booking) {
    this.items.push(item);
    return item;
  }
  async findById(id: string) {
    return this.items.find((b) => b.id === id) || null;
  }
}

