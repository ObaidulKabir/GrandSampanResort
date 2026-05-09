import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TimesharesService } from '../timeshares/timeshares.service';
import { ValidationPipe } from '@nestjs/common';
import { CreateSuiteDto, UpdateSuiteDto } from './dto/suite.dto';

@Controller('suites')
export class SuitesController {
  constructor(private readonly service: SuitesService, private readonly timeshares: TimesharesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateSuiteDto) {
    const created = await this.service.create(body as any);
    return { ok: true, suite: created };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const suite = await this.service.get(id);
    if (!suite) return { ok: false, error: 'not_found' };
    return { ok: true, suite };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateSuiteDto) {
    const updated = await this.service.update(id, body as any);
    if (!updated) return { ok: false, error: 'not_found' };
    return { ok: true, suite: updated };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const ok = await this.service.remove(id);
    return { ok };
  }

  @Get(':id/plans')
  async plans(@Param('id') id: string) {
    const plans = await this.timeshares.listBySuite(id);
    return { ok: true, plans };
  }
}

