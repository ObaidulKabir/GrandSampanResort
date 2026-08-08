import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateTermsDto, MoveTermsDto, UpdateTermsDto } from './dto/terms.dto';
import { TermsService } from './terms.service';

@Controller('terms')
export class TermsController {
  constructor(private readonly service: TermsService) {}

  @Get()
  async list() {
    const items = await this.service.list();
    return { ok: true, items };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateTermsDto) {
    const item = await this.service.create(body);
    return { ok: true, item };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateTermsDto
  ) {
    const item = await this.service.update(id, body);
    return { ok: true, item };
  }

  @Patch(':id/move')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async move(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: MoveTermsDto
  ) {
    const items = await this.service.move(id, body.direction);
    return { ok: true, items };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
