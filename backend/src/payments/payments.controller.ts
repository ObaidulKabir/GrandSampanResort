import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('mock')
  mock(@Body() payload: any) {
    return this.service.mockPayment(payload);
  }
}

