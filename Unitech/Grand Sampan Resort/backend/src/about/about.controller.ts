import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AboutService } from './about.service';
import { CreateAboutCardDto, ReorderAboutCardsDto, UpdateAboutCardDto } from './dto/about-card.dto';
import type { AboutSectionValue } from './about.types';

@Controller('about-content')
export class AboutController {
  constructor(private readonly service: AboutService) {}

  @Get()
  async list() {
    const sections = await this.service.listGrouped();
    return { ok: true, sections };
  }

  @Post('cards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateAboutCardDto) {
    const card = await this.service.create(body);
    return { ok: true, card };
  }

  @Put('reorder/:section')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reorder(
    @Param('section') section: AboutSectionValue,
    @Body(new ValidationPipe({ whitelist: true })) body: ReorderAboutCardsDto
  ) {
    const cards = await this.service.reorder(section, body.orderedIds);
    return { ok: true, cards };
  }

  @Put('cards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateAboutCardDto) {
    const card = await this.service.update(id, body);
    return { ok: true, card };
  }

  @Delete('cards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
