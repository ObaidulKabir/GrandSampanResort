import { Injectable } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';

@Injectable()
export class PricingService {
  private repo = new PricingRepository();
  add(planId: string, start: string | undefined, end: string | undefined, price: number) {
    return this.repo.add({ planId, start, end, price });
  }
  list(planId: string) {
    return this.repo.list(planId);
  }
}

