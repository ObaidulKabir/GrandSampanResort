type PriceRule = { planId: string; start?: string; end?: string; price: number };

export class PricingRepository {
  private rules: PriceRule[] = [];
  async add(rule: PriceRule) {
    this.rules.push(rule);
    return rule;
  }
  async list(planId: string) {
    return this.rules.filter((r) => r.planId === planId);
  }
}

