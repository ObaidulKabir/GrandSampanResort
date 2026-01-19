import { Injectable } from '@nestjs/common';
import { AvailabilityRepository } from './availability.repository';

@Injectable()
export class AvailabilityService {
  private repo = new AvailabilityRepository();
  setBulk(suiteId: string, dates: string[], status?: 'available' | 'hold' | 'booked') {
    return this.repo.setBulk(suiteId, dates, status);
  }
  listRange(suiteId: string, start: string, end: string) {
    return this.repo.listRange(suiteId, start, end);
  }
}

