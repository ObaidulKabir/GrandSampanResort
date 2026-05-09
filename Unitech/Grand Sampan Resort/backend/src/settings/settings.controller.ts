import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('revenue-policy')
  getRevenue() {
    return this.service.getRevenueSettings();
  }

  @Put('revenue-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateRevenue(@Body() body: any) {
    const updated = await this.service.updateRevenueSettings(body || {});
    return { ok: true, revenuePolicy: updated };
  }
}

