import { Controller, Get, Post, Query, Body, Param, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ValidationPipe } from '@nestjs/common';
import { AvailabilityQueryDto, CreateBookingDto } from './dto/booking.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class QuoteBookingDto {
  @IsString()
  planId!: string;
  @IsOptional()
  @IsString()
  paymentTierId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  installmentMonths?: number;
  @IsOptional()
  @IsIn(['monthly', 'quarterly'])
  cadence?: 'monthly' | 'quarterly';
  @IsOptional()
  @IsString()
  start?: string;
}

@Controller('booking')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  @Get('availability')
  async availability(@Query(new ValidationPipe({ whitelist: true })) q: AvailabilityQueryDto) {
    return this.service.availability(q.suiteId, q.start, q.end);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async listAll() {
    const sales = await this.service.listAll();
    return { ok: true, sales };
  }

  @Post('quote')
  async quote(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: QuoteBookingDto
  ) {
    return this.service.quote(body);
  }

  @Post()
  async book(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: CreateBookingDto
  ) {
    return this.service.book(
      body.suiteId,
      body.planId,
      body.start,
      body.end,
      body.investorId,
      body.cadence,
      body.kyc,
      {
        depositMethod: body.depositMethod as any,
        depositReference: body.depositReference || '',
        depositProofUrl: body.depositProofUrl,
        depositNote: body.depositNote
      },
      body.referralCode,
      body.paymentTierId,
      body.installmentMonths
    );
  }

  @Post(':id/confirm-deposit')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async confirmDeposit(@Param('id') id: string) {
    return this.service.confirmDeposit(id);
  }

  @Post(':id/verify-kyc')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async verifyKyc(@Param('id') id: string) {
    return this.service.verifyKyc(id);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async cancel(@Param('id') id: string, @Body() body: any) {
    return this.service.cancelBooking(id, body?.reason || '');
  }

  @Post(':id/reject-deposit')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async rejectDeposit(@Param('id') id: string, @Body() body: any) {
    return this.service.cancelBooking(id, body?.reason || '');
  }

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
