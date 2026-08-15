import { Module, forwardRef } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { MailModule } from '../mail/mail.module';
import { ReferralModule } from '../referral/referral.module';
import { PaymentPlansModule } from '../payment-plans/payment-plans.module';

@Module({
  imports: [MailModule, forwardRef(() => ReferralModule), PaymentPlansModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService]
})
export class BookingModule {}

