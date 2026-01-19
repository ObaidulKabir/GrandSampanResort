import { Module } from '@nestjs/common';
import { SuitesController } from './suites.controller';
import { SuitesService } from './suites.service';
import { TimesharesModule } from '../timeshares/timeshares.module';

@Module({
  imports: [TimesharesModule],
  controllers: [SuitesController],
  providers: [SuitesService],
  exports: [SuitesService]
})
export class SuitesModule {}

