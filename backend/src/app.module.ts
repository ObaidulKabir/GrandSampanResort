import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SuitesModule } from './suites/suites.module';
import { PaymentsModule } from './payments/payments.module';
import { LoggerMiddleware } from './common/logger.middleware';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { TimesharesModule } from './timeshares/timeshares.module';
import { AvailabilityModule } from './availability/availability.module';
import { PricingModule } from './pricing/pricing.module';
import { ClientsModule } from './clients/clients.module';
import { SeedModule } from './seed/seed.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { FaqModule } from './faq/faq.module';
import { TermsModule } from './terms/terms.module';
import { PromotionsModule } from './promotions/promotions.module';
import { MailModule } from './mail/mail.module';
import { ReferralModule } from './referral/referral.module';

@Module({
  imports: [
    SuitesModule,
    PaymentsModule,
    AuthModule,
    BookingModule,
    TimesharesModule,
    AvailabilityModule,
    PricingModule,
    ClientsModule,
    SeedModule,
    SettingsModule,
    MediaModule,
    FaqModule,
    TermsModule,
    PromotionsModule,
    MailModule,
    ReferralModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

