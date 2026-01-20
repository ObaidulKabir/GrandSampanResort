import { Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  private repo = new SettingsRepository();
  getRevenueSettings() {
    return this.repo.getRevenueSettings();
  }
  updateRevenueSettings(patch: any) {
    return this.repo.updateRevenueSettings(patch);
  }
}

