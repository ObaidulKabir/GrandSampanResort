import { Module } from '@nestjs/common';
import { TimesharesController } from './timeshares.controller';
import { TimesharesService } from './timeshares.service';

@Module({
  controllers: [TimesharesController],
  providers: [TimesharesService],
  exports: [TimesharesService]
})
export class TimesharesModule {}

