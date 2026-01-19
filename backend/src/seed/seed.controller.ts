import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/seed')
export class SeedController {
  constructor(private readonly service: SeedService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  run() {
    return this.service.run();
  }
}

