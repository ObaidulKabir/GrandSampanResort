import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { TimesharesService } from './timeshares.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSharePlanDto, UpdateSharePlanDto } from './dto/shareplan.dto';

@Controller('timeshares')
export class TimesharesController {
  constructor(private readonly service: TimesharesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateSharePlanDto) {
    const id = (body?.id ?? '').trim();
    if (!id) return { ok: false, error: 'missing_id' };
    const created = await this.service.create({ ...(body as any), id });
    return { ok: true, plan: created };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateSharePlanDto) {
    const updated = await this.service.update(id, body as any);
    if (!updated) return { ok: false, error: 'not_found' };
    return { ok: true, plan: updated };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const ok = await this.service.remove(id);
    return { ok };
  }

  @Delete('admin/blank')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async removeBlank() {
    const removed = await this.service.cleanupBlank();
    return { ok: true, removed };
  }
}

