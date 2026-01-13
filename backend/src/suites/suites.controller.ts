import { Controller, Get } from '@nestjs/common';
import { SuitesService } from './suites.service';

@Controller('suites')
export class SuitesController {
  constructor(private readonly service: SuitesService) {}

  @Get()
  list() {
    return this.service.list();
  }
}

