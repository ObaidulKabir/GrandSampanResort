import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TimesharesService } from './timeshares.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

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
  async create(@Body() body: any) {
    const id = (body?.id ?? '').trim();
    if (!id) return { ok: false, error: 'missing_id' };
    const created = await this.service.create({ ...body, id });
    return { ok: true, plan: created };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: any) {
    const updated = await this.service.update(id, body || {});
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

