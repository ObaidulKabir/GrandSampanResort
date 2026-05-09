import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { ValidationPipe } from '@nestjs/common';

@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

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
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateClientDto) {
    const created = await this.service.create(body);
    return { ok: true, client: created };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateClientDto) {
    const updated = await this.service.update(id, body);
    if (!updated) return { ok: false, error: 'not_found' };
    return { ok: true, client: updated };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const ok = await this.service.remove(id);
    return { ok };
  }
}

