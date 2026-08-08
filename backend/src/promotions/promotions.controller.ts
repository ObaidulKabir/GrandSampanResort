import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  async list() {
    const items = await this.service.list();
    return { ok: true, items };
  }

  @Post()
  @UseGuards(RolesGuard)
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreatePromotionDto) {
    if (new Date(body.endsAt) < new Date(body.startsAt)) {
      return { ok: false, error: 'end_before_start' };
    }
    const item = await this.service.create(body);
    return { ok: true, item };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdatePromotionDto
  ) {
    if (body.startsAt && body.endsAt && new Date(body.endsAt) < new Date(body.startsAt)) {
      return { ok: false, error: 'end_before_start' };
    }
    const item = await this.service.update(id, body);
    return { ok: true, item };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
