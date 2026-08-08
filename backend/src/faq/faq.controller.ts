import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  async list() {
    const items = await this.service.list();
    return { ok: true, items };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateFaqDto) {
    const item = await this.service.create(body);
    return { ok: true, item };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateFaqDto
  ) {
    const item = await this.service.update(id, body);
    return { ok: true, item };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
