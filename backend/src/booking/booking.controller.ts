import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { BookingService } from './booking.service';

@Controller('booking')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  @Get('availability')
  async availability(@Query('suiteId') suiteId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.service.availability(suiteId, start, end);
  }

  @Post()
  async book(@Body() body: any) {
    const { suiteId, planId, start, end, investorId } = body || {};
    const res = await this.service.book(suiteId, planId, start, end, investorId);
    if (!res) return { ok: false, error: 'conflict' };
    return { ok: true, booking: res };
  }

  @Get(':id/schedule')
  async schedule(@Param('id') id: string) {
    const res = await this.service.schedule(id);
    if (!res) return { ok: false, error: 'not_found' };
    return { ok: true, schedule: res };
  }
}

