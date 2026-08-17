import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateDirectorDto, MoveDirectorDto, UpdateDirectorDto } from './dto/director.dto';
import { DirectorsService } from './directors.service';

@Controller('directors')
export class DirectorsController {
  constructor(private readonly service: DirectorsService) {}

  @Get()
  async list(@Query('locale') locale?: string) {
    const items = await this.service.listLocalized(locale);
    return { ok: true, items };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateDirectorDto) {
    const item = await this.service.create(body);
    return { ok: true, item };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateDirectorDto
  ) {
    const item = await this.service.update(id, body);
    return { ok: true, item };
  }

  @Patch(':id/move')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async move(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: MoveDirectorDto
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
