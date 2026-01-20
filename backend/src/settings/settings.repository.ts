export type RevenueSettings = {
  taxRate: number;
  serviceChargeRate: number;
  maintenanceReserveRate: number;
};

export class SettingsRepository {
  private revenue: RevenueSettings = {
    taxRate: 0.1,
    serviceChargeRate: 0.05,
    maintenanceReserveRate: 0.05
  };
  async getRevenueSettings() {
    return this.revenue;
  }
  async updateRevenueSettings(patch: Partial<RevenueSettings>) {
    this.revenue = { ...this.revenue, ...patch };
    return this.revenue;
  }
}

