import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('pricing')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Post('admin/plans/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async add(@Param('id') id: string, @Body() body: any) {
    const { start, end, price } = body || {};
    const rule = await this.service.add(id, start, end, price);
    return { ok: true, rule };
  }

  @Get('plans/:id')
  async list(@Param('id') id: string) {
    const rules = await this.service.list(id);
    return { ok: true, rules };
  }
}

