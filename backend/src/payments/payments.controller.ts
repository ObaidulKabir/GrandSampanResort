import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { BookingService } from '../booking/booking.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService, private readonly bookings: BookingService) {}

  @Post('mock')
  mock(@Body() payload: any) {
    return this.service.mockPayment(payload);
  }

  @Post('pay')
  async pay(@Body() body: any) {
    const { bookingId, itemId, amount, method } = body || {};
    const capture = await this.service.mockPayment({ amount, method, currency: 'BDT' });
    const ok = await this.bookings.markPaid(bookingId, itemId, capture?.gatewayRef);
    return { ok, capture };
  }
}

