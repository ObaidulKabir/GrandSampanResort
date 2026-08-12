import { Module, forwardRef } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { MailModule } from '../mail/mail.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [MailModule, forwardRef(() => ReferralModule)],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService]
})
export class BookingModule {}

