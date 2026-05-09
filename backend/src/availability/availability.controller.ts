import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller()
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Post('admin/suites/:id/availability')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async set(@Param('id') id: string, @Body() body: any) {
    const { dates, status } = body || {};
    const res = await this.service.setBulk(id, Array.isArray(dates) ? dates : [], status);
    return { ok: true, availability: res };
  }

  @Get('suites/:id/availability')
  async list(@Param('id') id: string, @Query('start') start: string, @Query('end') end: string) {
    const res = await this.service.listRange(id, start, end);
    return { ok: true, availability: res };
  }
}

