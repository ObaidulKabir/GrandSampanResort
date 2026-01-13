import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SuitesModule } from './suites/suites.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [SuitesModule, PaymentsModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

