import { Module } from '@nestjs/common';
import { FaqModule } from '../faq/faq.module';
import { MediaModule } from '../media/media.module';
import { PaymentPlansModule } from '../payment-plans/payment-plans.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SettingsModule } from '../settings/settings.module';
import { SuitesModule } from '../suites/suites.module';
import { TermsModule } from '../terms/terms.module';
import { TimesharesModule } from '../timeshares/timeshares.module';
import { BrochureController } from './brochure.controller';
import { BrochureService } from './brochure.service';

@Module({
  imports: [
    SuitesModule,
    TimesharesModule,
    PromotionsModule,
    MediaModule,
    SettingsModule,
    PaymentPlansModule,
    FaqModule,
    TermsModule
  ],
  controllers: [BrochureController],
  providers: [BrochureService]
})
export class BrochureModule {}
