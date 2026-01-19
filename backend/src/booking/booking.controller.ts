import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ValidationPipe } from '@nestjs/common';
import { AvailabilityQueryDto, CreateBookingDto } from './dto/booking.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  @Get('availability')
  async availability(@Query(new ValidationPipe({ whitelist: true })) q: AvailabilityQueryDto) {
    return this.service.availability(q.suiteId, q.start, q.end);
  }

  @Post()
  async book(@Body(new ValidationPipe({ whitelist: true })) body: CreateBookingDto) {
    const res = await this.service.book(body.suiteId, body.planId, body.start, body.end, body.investorId);
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

