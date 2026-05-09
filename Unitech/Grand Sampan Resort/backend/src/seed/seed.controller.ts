import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/seed')
export class SeedController {
  constructor(private readonly service: SeedService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  run() {
    return this.service.run();
  }
}

