import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ValidationPipe } from '@nestjs/common';
import { AvailabilityQueryDto, CreateBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('booking')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  @Get('availability')
  async availability(@Query(new ValidationPipe({ whitelist: true })) q: AvailabilityQueryDto) {
    return this.service.availability(q.suiteId, q.start, q.end);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async book(@Req() req: any, @Body(new ValidationPipe({ whitelist: true })) body: CreateBookingDto) {
    const investorId = req.user?.role === 'INVESTOR' ? req.user.id : body.investorId;
    const res = await this.service.book(body.suiteId, body.planId, body.start, body.end, investorId);
    if (!res) return { ok: false, error: 'conflict' };
    return { ok: true, booking: res };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Get('me')
  async listMine(@Req() req: any) {
    const res = await this.service.listByInvestor(req.user.id);
    return { ok: true, holdings: res };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('investor/:id')
  async listByInvestor(@Param('id') id: string) {
    const res = await this.service.listByInvestor(id);
    return { ok: true, holdings: res };
  }

  @Get(':id/schedule')
  async schedule(@Param('id') id: string) {
    const res = await this.service.schedule(id);
    if (!res) return { ok: false, error: 'not_found' };
    return { ok: true, schedule: res };
  }

  @Get(':id/summary')
  async summary(@Param('id') id: string) {
    const res = await this.service.summary(id);
    if (!res) return { ok: false, error: 'not_found' };
    return { ok: true, summary: res };
  }
}

