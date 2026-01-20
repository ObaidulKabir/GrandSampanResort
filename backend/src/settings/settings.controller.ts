import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('revenue-policy')
  getRevenue() {
    return this.service.getRevenueSettings();
  }

  @Put('revenue-policy')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateRevenue(@Body() body: any) {
    const updated = await this.service.updateRevenueSettings(body || {});
    return { ok: true, revenuePolicy: updated };
  }
}

