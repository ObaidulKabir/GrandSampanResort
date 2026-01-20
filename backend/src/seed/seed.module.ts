import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { SuitesModule } from '../suites/suites.module';
import { TimesharesModule } from '../timeshares/timeshares.module';
import { AvailabilityModule } from '../availability/availability.module';
import { PricingModule } from '../pricing/pricing.module';
import { ClientsModule } from '../clients/clients.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [SuitesModule, TimesharesModule, AvailabilityModule, PricingModule, ClientsModule, BookingModule],
  controllers: [SeedController],
  providers: [SeedService]
})
export class SeedModule {}

