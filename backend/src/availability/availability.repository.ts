type AvailabilitySlot = { date: string; status: 'available' | 'hold' | 'booked' };

export class AvailabilityRepository {
  private map = new Map<string, AvailabilitySlot[]>();
  async setBulk(suiteId: string, dates: string[], status: AvailabilitySlot['status'] = 'available') {
    const list = this.map.get(suiteId) || [];
    const set = new Set(dates);
    const next = list.filter((s) => !set.has(s.date));
    for (const d of dates) next.push({ date: d, status });
    this.map.set(suiteId, next);
    return next;
  }
  async listRange(suiteId: string, start: string, end: string) {
    const list = this.map.get(suiteId) || [];
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return list.filter((slot) => {
      const t = new Date(slot.date).getTime();
      return t >= s && t <= e;
    });
  }
}

