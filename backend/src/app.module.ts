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

@Module({
  imports: [SuitesModule, PaymentsModule, AuthModule, BookingModule, TimesharesModule, AvailabilityModule, PricingModule, ClientsModule, SeedModule, SettingsModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

